import { describe, expect, it } from "vitest";
import { applyAction, GameRuleError, netWorth, newGame } from "../lib/game/engine";
import { announcedTurn, drawOffers, estateOf, estateRead, KINDS, marketRate, officeRent, propertyValue, RATE_ANNOUNCE, RATE_BASE, RATE_FIRST_TURN } from "../lib/game/estate";
import { FOUNDATION, legacyOf, managedAssets } from "../lib/game/legacy";
import { DYNASTY, dynastyRead, HEIRS } from "../lib/game/dynasty";
import { careerOf } from "../lib/game/career";
import { parseAction } from "../lib/game/validate";
import type { GameState } from "../lib/game/types";

function rich(seed = 3): GameState {
  const s = newGame(seed);
  s.cash = 12_000_000;
  s.reputation = 80;
  s.familyOffice = 1;
  s.office = 3;
  return s;
}

function withOffers(s: GameState): GameState {
  const e = estateOf(s);
  e.offers = drawOffers(s, s.month);
  e.offersMonth = s.month;
  return s;
}

const close = (s: GameState) => applyAction(s, { type: "closeMonth" }).state;

describe("Zinszyklus", () => {
  it("folgt einem festen Ablauf und wird vorher angekündigt", () => {
    expect(marketRate(1)).toBe(RATE_BASE);
    expect(marketRate(RATE_FIRST_TURN - 1)).toBe(RATE_BASE);
    expect(marketRate(RATE_FIRST_TURN)).toBeCloseTo(RATE_BASE + 0.005, 6);
    expect(marketRate(RATE_FIRST_TURN + 12)).toBeCloseTo(RATE_BASE + 0.02, 6);
    expect(marketRate(10, 5)).toBeLessThan(marketRate(10, 15));
    expect(announcedTurn(RATE_FIRST_TURN - RATE_ANNOUNCE - 1)).toBeNull();
    expect(announcedTurn(RATE_FIRST_TURN - RATE_ANNOUNCE)?.up).toBe(true);
  });

  it("schreibt die Ankündigung in die Wirtschaftsnachrichten", () => {
    let s = newGame(1);
    s.month = RATE_FIRST_TURN - RATE_ANNOUNCE - 1;
    s = close(s);
    expect(s.news.some((n) => n.title.includes("Zinswende"))).toBe(true);
  });
});

describe("Immobilien", () => {
  it("lassen alte Spielstände unverändert", () => {
    const s = newGame(2);
    expect(s.wealth).toBeUndefined();
    const worth = netWorth(s);
    expect(estateRead(s).owned).toHaveLength(0);
    expect(netWorth(s)).toBe(worth);
    expect(officeRent(s)).toBe(0);
  });

  it("kaufen mit Hypothek: Nebenkosten sind weg, Miete und Rate laufen", () => {
    const s = withOffers(rich());
    const offer = estateRead(s).offers.find((o) => o.kind === "mfh")!;
    const before = netWorth(s);
    const after = applyAction(s, { type: "estate", move: "buy", offerId: offer.id, ltv: 0.7, binding: 10 }).state;
    const p = estateRead(after).owned[0]!;
    expect(p.loan!.balance).toBe(Math.round((offer.price * 0.7) / 1000) * 1000);
    expect(netWorth(after)).toBeLessThan(before);
    expect(before - netWorth(after)).toBeCloseTo(p.costs, -3);
    const next = applyAction(after, { type: "closeMonth" });
    expect(next.result.kind).toBe("report");
    if (next.result.kind === "report") expect(next.result.report.income?.estate).toBeDefined();
    expect(estateRead(next.state).owned[0]!.loan!.balance).toBeLessThan(p.loan!.balance);
  });

  it("verlangt Eigenkapital und hält die Beleihungsgrenze", () => {
    const s = withOffers(rich());
    const offer = estateRead(s).offers.find((o) => o.kind === "gewerbe")!;
    expect(() => applyAction(s, { type: "estate", move: "buy", offerId: offer.id, ltv: 0.8, binding: 10 })).toThrow(GameRuleError);
    s.market.holdings.tagesgeld = s.cash;
    s.cash = 10_000;
    expect(() => applyAction(s, { type: "estate", move: "buy", offerId: offer.id, ltv: KINDS.gewerbe.maxLtv, binding: 10 })).toThrow(/Eigenkapital/);
  });

  it("finanziert nach der Zinsbindung zum Marktzins an", () => {
    let s = withOffers(rich());
    s.month = 13;
    const e = estateOf(s);
    e.offers = drawOffers(s, s.month);
    const offer = e.offers.find((o) => o.kind === "wohnung")!;
    s = applyAction(s, { type: "estate", move: "buy", offerId: offer.id, ltv: 0.8, binding: 5 }).state;
    const rate0 = estateRead(s).owned[0]!.loan!.rate;
    for (let i = 0; i < 61; i++) s = close(s);
    const loan = estateRead(s).owned[0]!.loan!;
    expect(loan.rate).toBeGreaterThan(rate0 + 0.015);
    expect(estateRead(s).record.refinanced).toBe(1);
  });

  it("Penthouse ersetzt die Büromiete und bringt einmalig Ruf", () => {
    const s = withOffers(rich());
    s.reputation = 70;
    const offer = estateRead(s).offers.find((o) => o.kind === "penthouse")!;
    const after = applyAction(s, { type: "estate", move: "buy", offerId: offer.id, ltv: 0.6, binding: 15 }).state;
    expect(officeRent(after)).toBe(0);
    expect(after.reputation).toBeGreaterThan(s.reputation);
  });

  it("Wert fällt mit dem Zins, Verkauf zahlt Vorfälligkeit in der Bindung", () => {
    const s = withOffers(rich());
    const offer = estateRead(s).offers.find((o) => o.kind === "mfh")!;
    const after = applyAction(s, { type: "estate", move: "buy", offerId: offer.id, ltv: 0.6, binding: 10 }).state;
    const p = estateRead(after).owned[0]!;
    expect(propertyValue(p, RATE_FIRST_TURN + 12)).toBeLessThan(propertyValue(p, RATE_FIRST_TURN - 1));
    const sold = applyAction(after, { type: "estate", move: "sell", propertyId: p.id }).state;
    expect(estateRead(sold).owned).toHaveLength(0);
    expect(sold.cash).toBeLessThan(s.cash);
  });
});

describe("Stiftung und Lebenswerk", () => {
  it("Stiftung: unwiderruflich, Steuererstattung im Folgemonat, Ruf", () => {
    const s = rich();
    const worth = netWorth(s);
    let after = applyAction(s, { type: "foundation", move: "found", amount: 2_000_000, purpose: "bildung" }).state;
    expect(after.wealth?.foundation?.capital).toBe(2_000_000);
    expect(netWorth(after)).toBe(worth - 2_000_000 - FOUNDATION.cost);
    expect(after.reputation).toBeGreaterThan(s.reputation);
    const cash = after.cash;
    after = close(after);
    expect(after.cash - cash).toBeGreaterThan(FOUNDATION.allowance * FOUNDATION.taxRate * 0.9);
    expect(managedAssets(after, netWorth(after)).foundation).toBe(2_000_000);
    expect(careerOf(after).steps.find((x) => x.title === "Stifter/in")!.done).toBe(true);
    // Die Erstattung gilt nur bis zur Grenze in zehn Jahren.
    const again = applyAction(after, { type: "foundation", move: "give", amount: 1_000_000 }).state;
    expect(again.wealth?.foundation?.refundDue ?? 0).toBe(0);
  });

  it("Lebenswerk-Wert bündelt Vermögen, Ruf und Tombstones", () => {
    const s = rich();
    const l = legacyOf(s, netWorth(s));
    expect(l.total).toBe(Math.round(netWorth(s) / 1_000_000 + s.reputation * 0.5 + s.trophies.length * 2));
    expect(l.parts.map((p) => p.id)).toEqual(["worth", "exits", "foundation", "reputation", "trophies"]);
  });
});

describe("Dynastie", () => {
  it("Nachfolge wählen, Mentoring, Übergabe erst unter Bedingungen, danach Generation 2", () => {
    let s = rich();
    s = applyAction(s, { type: "dynasty", move: "choose", heir: "schuetzling" }).state;
    const start = dynastyRead(s).heir!.maturity;
    s = applyAction(s, { type: "dynasty", move: "mentor" }).state;
    s = applyAction(s, { type: "dynasty", move: "mentor" }).state;
    s = close(s);
    expect(dynastyRead(s).heir!.maturity).toBeCloseTo(start + HEIRS.schuetzling.base + 2 * HEIRS.schuetzling.perDay, 6);
    expect(() => applyAction(s, { type: "dynasty", move: "handover" })).toThrow(/Noch nicht bereit/);
    s = applyAction(s, { type: "dynasty", move: "charter", article: "nachfolge" }).state;
    s = applyAction(s, { type: "dynasty", move: "charter", article: "streit" }).state;
    s.wealth!.dynasty!.heir!.maturity = DYNASTY.maturity;
    s = applyAction(s, { type: "dynasty", move: "handover" }).state;
    expect(dynastyRead(s).generation).toBe(2);
    expect(careerOf(s).steps.find((x) => x.title === "Lebenswerk")!.done).toBe(true);
    const offered = s.startups.find((x) => x.status === "offered");
    if (offered) expect(() => applyAction(s, { type: "invest", startupId: offered.id })).toThrow(/Tagesgeschäft/);
    // Wealth management stays with the player.
    s = applyAction(s, { type: "dynasty", move: "strategy", strategy: "bewahren" }).state;
    s = close(s);
    expect(s.market.holdings.tagesgeld).toBeGreaterThan(0);
  });

  it("Kind und Schützling sind bei gleichem Mentoring etwa gleich schnell", () => {
    const months = (k: "kind" | "schuetzling") => Math.max(HEIRS[k].minMonths, (DYNASTY.maturity - HEIRS[k].start) / (HEIRS[k].base + 2 * HEIRS[k].perDay));
    expect(Math.abs(months("kind") - months("schuetzling"))).toBeLessThan(8);
  });
});

describe("Eingaben", () => {
  it("prüft die neuen Züge", () => {
    expect(parseAction({ type: "estate", move: "buy", offerId: "im1-0", ltv: 0.7, binding: 10 })).toEqual({ type: "estate", move: "buy", offerId: "im1-0", ltv: 0.7, binding: 10 });
    expect(parseAction({ type: "estate", move: "buy", offerId: "im1-0", ltv: 0.9, binding: 10 })).toBeNull();
    expect(parseAction({ type: "estate", move: "buy", offerId: "im1-0", ltv: 0.5, binding: 7 })).toBeNull();
    expect(parseAction({ type: "foundation", move: "found", amount: 1_000_000, purpose: "bildung" })).not.toBeNull();
    expect(parseAction({ type: "foundation", move: "found", amount: 1_000_000, purpose: "golf" })).toBeNull();
    expect(parseAction({ type: "dynasty", move: "council", choice: 2 })).toBeNull();
    expect(parseAction({ type: "dynasty", move: "strategy", strategy: "none" })).not.toBeNull();
  });
});
