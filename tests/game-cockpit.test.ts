import { describe, expect, it } from "vitest";
import { assess, cockpitKind, cockpitRow, cockpitRows, COCKPIT_RULES, groupOf, groupRows, isSortKey, sortRows, summarize, whenText } from "../lib/game/cockpit";
import { corporateStartup } from "../lib/game/corporate";
import { newGame } from "../lib/game/engine";
import type { GameState, LboState, Startup } from "../lib/game/types";

function base(over: Partial<Startup> = {}, metrics: Partial<Startup["metrics"]> = {}): Startup {
  const s = newGame(1).startups[0]!;
  return {
    ...s,
    status: "active",
    stake: 10,
    flags: [],
    crisisMonths: 0,
    history: [],
    ...over,
    metrics: { ...s.metrics, revenue: 50_000, grossMargin: 0.8, opex: 30_000, cash: 400_000, debt: 0, growth: 0.03, topCustomer: 0.2, morale: 70, ...metrics },
  };
}

/** A startup burning exactly `burn` per month with cash for `months` months. */
function burning(months: number, burn = 10_000): Startup {
  return base({}, { revenue: 50_000, grossMargin: 0.8, opex: 40_000 + burn, cash: months * burn });
}

const lbo = (over: Partial<LboState> = {}): LboState => ({
  acquired: 1,
  entryEv: 2_000_000,
  entryEbitda: 400_000,
  equity: 500_000,
  bank: 800_000,
  rate: 0.06,
  payment: 15_000,
  vendors: [],
  earnouts: [],
  breach: 0,
  status: "ok",
  handover: [],
  ...over,
});

function buyout(over: Partial<Startup> = {}, metrics: Partial<Startup["metrics"]> = {}): Startup {
  return base({ lbo: lbo(), stake: 100, ...over }, { valuedOn: "ebitda", revenue: 200_000, grossMargin: 0.5, opex: 85_000, cash: 300_000, ...metrics });
}

function game(startups: Startup[], over: Partial<GameState> = {}): GameState {
  return { ...newGame(1), month: 10, startups, items: [], rounds: [], exits: [], shareOffers: [], effects: [], ...over };
}

describe("Ampel für Startups", () => {
  it("ist rot unter 6 Monaten Runway und nennt den Grund", () => {
    const a = assess(burning(5));
    expect(a.light).toBe("red");
    expect(a.reason).toBe("Runway 5 Monate");
  });

  it("ist gelb zwischen 6 und 12 Monaten und grün darüber", () => {
    expect(assess(burning(6)).light).toBe("yellow");
    expect(assess(burning(11)).light).toBe("yellow");
    expect(assess(burning(12)).light).toBe("green");
    expect(assess(burning(30)).light).toBe("green");
  });

  it("ist grün, wenn die Firma Geld verdient", () => {
    const a = assess(base());
    expect(a.light).toBe("green");
    expect(a.reason).toBe("Die Firma verdient Geld");
  });

  it("wird bei Kasse im Minus rot und bei Auffälligkeiten gelb", () => {
    expect(assess(base({ crisisMonths: 2 })).light).toBe("red");
    expect(assess(base({}, { growth: -0.04 })).light).toBe("yellow");
    expect(assess(base({}, { topCustomer: 0.6 })).light).toBe("yellow");
    expect(assess(base({}, { morale: 20 })).light).toBe("yellow");
  });

  it("die schlechteste Prüfung zählt, die Begründung nennt sie zuerst", () => {
    const a = assess({ ...burning(4), crisisMonths: 0, metrics: { ...burning(4).metrics, topCustomer: 0.7 } });
    expect(a.light).toBe("red");
    expect(a.reasons[0]).toBe("Runway 4 Monate");
    expect(a.reasons).toHaveLength(2);
  });
});

describe("Ampel für Familienbetriebe und Plattformen", () => {
  it("erkennt den Typ", () => {
    expect(cockpitKind(base())).toBe("startup");
    expect(cockpitKind(buyout())).toBe("buyout");
    expect(cockpitKind(buyout({ platform: { since: 1, addons: [], integrations: [] } }))).toBe("platform");
    expect(cockpitKind(corporateStartup(1))).toBe("corporate");
  });

  it("bewertet die EBITDA-Marge", () => {
    // 200.000 × 0,5 − opex
    const small = lbo({ bank: 100_000 });
    expect(assess(buyout({ lbo: small }, { opex: 70_000 })).light).toBe("green"); // 15 %
    expect(assess(buyout({ lbo: small }, { opex: 87_000 })).light).toBe("yellow"); // 6,5 %
    expect(assess(buyout({ lbo: small }, { opex: 95_000 })).light).toBe("red"); // 2,5 %
  });

  it("ist rot über der Covenant-Grenze und gelb knapp davor", () => {
    const ok = buyout({ lbo: lbo({ bank: 400_000 }) }, { opex: 70_000, cash: 140_000 });
    expect(assess(ok).light).toBe("green");
    // EBITDA 360.000, Grenze 3,5 → 1,26 Mio. erlaubt.
    expect(assess(buyout({ lbo: lbo({ bank: 1_200_000, rate: 0.01 }) }, { opex: 70_000, cash: 140_000 })).light).toBe("yellow");
    const over = assess(buyout({ lbo: lbo({ bank: 1_400_000, rate: 0.01 }) }, { opex: 70_000, cash: 140_000 }));
    expect(over.light).toBe("red");
    expect(over.reason).toContain("Verschuldung");
  });

  it("achtet auf die Zinsdeckung", () => {
    // EBITDA 360.000; Zinsen 800.000 × 25 % = 200.000 → 1,8×
    const a = assess(buyout({ lbo: lbo({ rate: 0.25 }) }, { opex: 70_000 }));
    expect(a.checks.find((c) => c.id === "cover")?.light).toBe("yellow");
    const b = assess(buyout({ lbo: lbo({ rate: 0.4 }) }, { opex: 70_000 }));
    expect(b.checks.find((c) => c.id === "cover")?.light).toBe("red");
  });

  it("ist rot, wenn die Bank Eigenkapital verlangt, gelb bei gebrochenem Covenant", () => {
    expect(assess(buyout({ lbo: lbo({ status: "cure", cure: { amount: 100_000, due: 11 } }) }, { opex: 70_000 })).light).toBe("red");
    expect(assess(buyout({ lbo: lbo({ status: "watch" }) }, { opex: 70_000 })).light).toBe("yellow");
  });
});

describe("Ampel im Aufsichtsrat", () => {
  it("startet grün, die Marge ist dünn, aber positiv", () => {
    expect(assess(corporateStartup(1)).light).toBe("green");
    const c = corporateStartup(1);
    expect(assess({ ...c, metrics: { ...c.metrics, opex: 7_950_000 } }).light).toBe("yellow");
  });

  it("wird bei negativem EBITDA oder hohen Schulden rot", () => {
    const c = corporateStartup(1);
    expect(assess({ ...c, metrics: { ...c.metrics, opex: 9_000_000 } }).light).toBe("red");
    expect(assess({ ...c, metrics: { ...c.metrics, opex: 6_000_000, debt: 300_000_000 } }).light).toBe("red");
    expect(assess({ ...c, metrics: { ...c.metrics, opex: 6_000_000 } }).light).toBe("green");
  });
});

describe("Gruppen", () => {
  const fund = (s: Startup): Startup => ({ ...s, capTable: [...s.capTable, { id: "fonds", name: "Fonds I", kind: "fund", pct: 12, pref: 0, cost: 0 }] });

  it("Fonds-Firmen stehen unter Fonds, der Rest nach Typ", () => {
    expect(groupOf(base())).toBe("direct");
    expect(groupOf(fund(base()))).toBe("fund");
    expect(groupOf(buyout())).toBe("own");
    expect(groupOf(buyout({ platform: { since: 1, addons: [], integrations: [] } }))).toBe("own");
    expect(groupOf(corporateStartup(1))).toBe("mandate");
  });

  it("gruppiert in fester Reihenfolge und lässt leere Gruppen weg", () => {
    const rows = cockpitRows(game([corporateStartup(1), fund(base({ id: "a", name: "A" })), base({ id: "b", name: "B" })]));
    expect(groupRows(rows, "name").map((g) => g.group)).toEqual(["direct", "fund", "mandate"]);
  });
});

describe("Zeilen, Sortierung und Summe", () => {
  const a = base({ id: "a", name: "Anton", stake: 10 });
  const b = { ...burning(3), id: "b", name: "Berta", stake: 5 };
  const c = base({ id: "c", name: "Carla", stake: 30 });
  const state = game([a, b, c], { items: [{ id: "v1", startupId: "c", templateId: "x", month: 10, status: "open", asked: [], pretalks: [], cfo: false }] });
  const rows = cockpitRows(state);

  it("zählt Handlungsbedarf aus offenen Vorlagen und Ampel", () => {
    const row = (id: string) => rows.find((r) => r.id === id)!;
    expect(row("c").actions).toEqual(["1 Vorlage wartet auf den Beirat"]);
    expect(row("c").needs).toBe(2);
    expect(row("b").needs).toBe(3);
    expect(row("a").needs).toBe(0);
  });

  it("sortiert nach Wahl", () => {
    expect(sortRows(rows, "needs").map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(sortRows(rows, "risk").map((r) => r.id)[0]).toBe("b");
    expect(sortRows(rows, "value").map((r) => r.id)[0]).toBe("c");
    expect(sortRows(rows, "name").map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("fasst Ampeln und Gesamtwert zusammen", () => {
    const sum = summarize(rows);
    expect(sum).toMatchObject({ count: 3, green: 2, red: 1, yellow: 0, needing: 1 });
    expect(sum.value).toBeCloseTo(rows.reduce((s, r) => s + r.value, 0));
  });

  it("rechnet die Veränderung zum Vormonat aus dem Verlauf", () => {
    const s = base({ id: "h", stake: 10 });
    const now = cockpitRow(game([s]), s).value;
    const withHistory = { ...s, history: [{ month: 9, revenue: 1, cash: 1, valuation: (now / 0.1) * 0.8, stake: 10 }] };
    expect(cockpitRow(game([withHistory]), withHistory).change).toBeCloseTo(0.25);
    expect(cockpitRow(game([s]), s).change).toBeNull();
  });

  it("nennt den nächsten Termin", () => {
    const row = cockpitRow(game([a], { month: 10 }), a);
    expect(row.next?.month).toBe(12);
    expect(whenText(row.next!)).toContain("in 2 Monaten");
    const lboRow = cockpitRow(game([buyout()], { month: 10 }), buyout());
    expect(lboRow.next?.text).toBe("Covenant-Prüfung der Bank");
    expect(lboRow.next?.month).toBe(12);
  });

  it("erkennt gültige Sortierschlüssel", () => {
    expect(isSortKey("needs")).toBe(true);
    expect(isSortKey("foo")).toBe(false);
    expect(COCKPIT_RULES.startup.runwayRed).toBeLessThan(COCKPIT_RULES.startup.runwayYellow);
  });
});
