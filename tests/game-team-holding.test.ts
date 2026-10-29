import { describe, expect, it } from "vitest";
import { applyAction, newGame, upgradeState } from "../lib/game/engine";
import { addonFit, addonVeto, fitKnown, guaranteeClaim, HOLDCO, holdoutDiscount } from "../lib/game/holdco";
import { currentMandates, fitOf, integrationCapacity, leadOf, OP, teamCarry, teamDays, teamMonth } from "../lib/game/team";
import type { AddonTarget, GameAction, GameState, Startup } from "../lib/game/types";
import { parseAction } from "../lib/game/validate";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

function office(seed = 7): GameState {
  let state = act({ ...newGame(seed), cash: 3_000_000, reputation: 85, office: 3 }, { type: "invest", startupId: "pendelwerk" });
  state = act(state, { type: "foundFamilyOffice" });
  return state;
}

function addon(platformId: string, id: string, over: Partial<AddonTarget> = {}): AddonTarget {
  return {
    id,
    platformId,
    month: 1,
    expires: 99,
    name: `Ziel ${id}`,
    city: "Ulm",
    owner: "Uwe Test",
    text: "",
    revenue: 50_000,
    grossMargin: 0.4,
    opex: 12_000,
    team: 20,
    growth: 0,
    topCustomer: 0.2,
    multiple: 5,
    findings: [],
    dd: [],
    status: "open",
    ...over,
  };
}

describe("operating partners", () => {
  it("maps associates and partners of older games onto operating partners when loading", () => {
    const state = office();
    const old = {
      ...state,
      team: [
        { id: "t1", role: "associate" as const, name: "Jana Alt", salary: 5_000, hired: 2, mandate: "pendelwerk" },
        { id: "t2", role: "partner" as const, name: "Pia Alt", salary: 9_000, hired: 2 },
      ],
    };
    const up = upgradeState(old);
    expect(up.version).toBe(6);
    expect(up.team.every((m) => m.role === "operating" && m.mandate === undefined)).toBe(true);
    expect(up.team[0]!.name).toBe("Jana Alt");
    expect(up.team[0]!.salary).toBe(5_000);
    expect(currentMandates(up.team[0]!).map((x) => x.id)).toEqual(["pendelwerk"]);
    expect(leadOf(up, "pendelwerk")?.member.id).toBe("t1");
    // Loading twice changes nothing.
    expect(upgradeState(up)).toBe(up);
    // The old contract carries no share of the gains.
    const s = up.startups.find((x) => x.id === "pendelwerk")!;
    expect(teamCarry(up, s, 10_000_000, false).amount).toBe(0);
  });

  it("hires with a recruiter fee, takes companies up to the capacity and saves days by fit", () => {
    let state = office();
    const before = state.cash;
    state = act(state, { type: "hire", role: "operating", profile: "reiter" });
    expect(state.cash).toBe(before - 25_500);
    const m = state.team[0]!;
    expect(teamDays(state)).toBe(0);
    state = act(state, { type: "assign", memberId: m.id, startupId: "pendelwerk" });
    const s = state.startups.find((x) => x.id === "pendelwerk")!;
    expect(fitOf(m, s)).toBe("good");
    expect(teamDays(state)).toBe(Math.floor(OP.days.good));
    state = act(state, { type: "assign", memberId: m.id, startupId: null, from: "pendelwerk" });
    expect(leadOf(state, "pendelwerk")).toBeUndefined();
    expect(() => act(state, { type: "hire", role: "operating", profile: "nobody" })).toThrow();
  });

  it("pays a running share on new value each quarter and carry at a sale", () => {
    let state = office();
    state = act(state, { type: "hire", role: "operating", profile: "voss" });
    state = act(state, { type: "assign", memberId: state.team[0]!.id, startupId: "pendelwerk" });
    const s = state.startups.find((x) => x.id === "pendelwerk")!;
    const base = state.team[0]!.mandates![0]!.base;
    const proceeds = (s.playerCost ?? 0) + base + 1_000_000;
    const carry = teamCarry(state, s, proceeds, false);
    expect(carry.amount).toBe(60_000);
    expect(carry.lines[0]!.name).toBe("Marlene Voss");
    // A quarter with value above the high-water mark: the running share is paid.
    const next = structuredClone(state);
    next.team[0]!.mandates![0]!.mark -= 100_000;
    const income = { consulting: 0, boardFees: 0, payouts: 0, living: 0, interest: 0, salaries: 0 };
    const notes: string[] = [];
    const cash = next.cash;
    teamMonth(next, 3, income, notes);
    const paid = next.team[0]!.paid ?? 0;
    expect(paid).toBe(1_000);
    expect(next.cash).toBe(cash - paid);
    expect(notes[0]).toMatch(/Erfolgsbeteiligung/);
    // Same value next quarter: nothing more (high-water mark).
    teamMonth(next, 6, income, notes);
    expect(next.team[0]!.paid).toBe(paid);
  });

  it("parses the new moves", () => {
    expect(parseAction({ type: "hire", role: "operating", profile: "kaya" })).toEqual({ type: "hire", role: "operating", profile: "kaya" });
    expect(parseAction({ type: "hire", role: "associate" })).toBeNull();
    expect(parseAction({ type: "assign", memberId: "t1", startupId: null, from: "pendelwerk" })).toEqual({ type: "assign", memberId: "t1", startupId: null, from: "pendelwerk" });
    expect(parseAction({ type: "holdco" })).toEqual({ type: "holdco" });
  });
});

describe("holding structure", () => {
  function withPlatform(state: GameState): { state: GameState; p: Startup } {
    const next = structuredClone(state);
    const p = next.startups.find((x) => x.id === "pendelwerk")!;
    p.capTable = [...p.capTable.filter((h) => h.kind !== "founder"), { id: "ceo", name: "Familie Test", kind: "founder", pct: 10 }];
    p.lbo = {
      acquired: 1,
      entryEv: 5_000_000,
      entryEbitda: 1_000_000,
      equity: 2_000_000,
      bank: 3_000_000,
      rate: 0.06,
      payment: 40_000,
      vendors: [],
      earnouts: [],
      breach: 0,
      status: "ok",
      handover: [],
    };
    p.platform = { since: 1, addons: [], integrations: [] };
    return { state: next, p };
  }

  it("is a decision of its own: costs money and a day, and removes the personal guarantee", () => {
    let state = office();
    expect(guaranteeClaim(state, 4_000_000, 2_000_000)).toBe(1_000_000);
    const cash = state.cash;
    state = act(state, { type: "holdco" });
    expect(state.holdco?.since).toBe(state.month);
    expect(state.cash).toBe(cash - HOLDCO.cost);
    expect(guaranteeClaim(state, 4_000_000, 2_000_000)).toBe(0);
    expect(() => act(state, { type: "holdco" })).toThrow();
  });

  it("drags co-owners along only with the holding", () => {
    const { state, p } = withPlatform(office());
    expect(holdoutDiscount(state, p)).toBe(HOLDCO.holdout);
    expect(holdoutDiscount({ ...state, holdco: { since: 1, name: "H" } }, p)).toBe(0);
  });

  it("hides the fit until a commercial due diligence, and a co-owner vetoes misfits and big blind buys", () => {
    const { state, p } = withPlatform(office());
    const levels = { good: 0, ok: 0, bad: 0 };
    for (let i = 0; i < 400; i++) levels[addonFit(state, addon(p.id, `z${i}`)).level]++;
    expect(levels.good).toBeGreaterThan(40);
    expect(levels.bad).toBeGreaterThan(40);
    expect(addonFit(state, addon(p.id, "z1"))).toEqual(addonFit(state, addon(p.id, "z1")));
    const bad = Array.from({ length: 50 }, (_, i) => addon(p.id, `b${i}`, { dd: ["commercial"] })).find((a) => addonFit(state, a).level === "bad")!;
    expect(fitKnown(state, bad)).toBe(true);
    expect(addonVeto(state, p, bad)).toMatch(/Veto/);
    expect(fitKnown(state, { ...bad, dd: [] })).toBe(false);
    const big = addon(p.id, "big", { revenue: 400_000, opex: 60_000 });
    expect(addonVeto(state, p, big)).toMatch(/Commercial/);
  });

  it("a partner on the platform prepares add-ons: fit known, one more integration", () => {
    const { state: s0, p } = withPlatform(office());
    let state = act(s0, { type: "hire", role: "operating", profile: "kaya" });
    const cap = integrationCapacity(state, p);
    state = act(state, { type: "assign", memberId: state.team[0]!.id, startupId: p.id });
    const p2 = state.startups.find((x) => x.id === p.id)!;
    expect(integrationCapacity(state, p2)).toBe(cap + 1);
    expect(fitKnown(state, addon(p.id, "z9"))).toBe(true);
  });
});
