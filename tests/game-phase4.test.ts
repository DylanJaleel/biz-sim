import { describe, expect, it } from "vitest";
import { totalPct } from "../lib/game/captable";
import { FAMILY_OFFICE_COST, IPO_LOCKUP, SALARY } from "../lib/game/config";
import { TEMPLATES } from "../lib/game/content";
import { generateDeal, SECTORS, type DealStage } from "../lib/game/dealgen";
import { applyAction, closeMonth, fundBlocker, netWorth, newGame, randomFor, startupOf, upgradeState } from "../lib/game/engine";
import { monthDays } from "../lib/game/office";
import { valuation } from "../lib/game/sim";
import { offerStartup } from "../lib/game/startups";
import type { ExitOffer, GameAction, GameState } from "../lib/game/types";
import { parseAction } from "../lib/game/validate";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

function withDeal(state: GameState, stage: DealStage, seed = 1): { state: GameState; id: string } {
  const def = generateDeal(randomFor(seed, "test-deal"), stage, `d9${seed}`, state.month, new Set());
  const next = structuredClone(state);
  next.deals.push(def);
  next.startups.push(offerStartup(def, next.month));
  return { state: next, id: def.id };
}

/** A late-game player: rich, well known, in the top office. */
function rich(seed = 3): GameState {
  return { ...newGame(seed), cash: 3_000_000, reputation: 85, office: 3 };
}

describe("deal generator", () => {
  it("builds complete companies in every stage", () => {
    for (const stage of ["preseed", "seed", "growth", "buyout"] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const def = generateDeal(randomFor(seed, stage), stage, `x${seed}`, 5, new Set());
        expect(def.board.map((b) => b.seat).sort()).toEqual(["angel", "ceo", "cto", "indep", "vc"]);
        expect(def.capTable.reduce((sum, h) => sum + h.pct, 0) + (stage === "buyout" ? def.stake : 0)).toBeCloseTo(100, 6);
        expect(def.diligence.length).toBeGreaterThanOrEqual(4);
        expect(SECTORS.some((s) => s.sector === def.sector)).toBe(true);
        expect(def.metrics.revenue).toBeGreaterThan(0);
        if (stage === "buyout") expect(def.metrics.revenue * def.metrics.grossMargin).toBeGreaterThan(def.metrics.opex);
        else expect(def.metrics.revenue * def.metrics.grossMargin).toBeLessThan(def.metrics.opex);
      }
    }
  });

  it("keeps the deal flow going and forgets offers nobody took", () => {
    let state = newGame(4);
    const names = new Set<string>();
    for (let m = 0; m < 30; m++) {
      for (const s of state.startups) names.add(s.name);
      state = act(state, { type: "closeMonth" });
    }
    // Six fixed startups plus generated ones.
    expect(names.size).toBeGreaterThan(12);
    expect(state.deals.length).toBeLessThan(8);
    expect(state.startups.filter((s) => s.status === "declined" && state.deals.some((d) => d.id === s.id))).toEqual([]);
  });

  it("has templates only family businesses see", () => {
    const family = TEMPLATES.filter((t) => t.id.startsWith("m_"));
    expect(family.length).toBeGreaterThanOrEqual(5);
    const { state, id } = withDeal(newGame(1), "buyout");
    const s = { ...startupOf(state, id), status: "active" as const, flags: ["mittelstand"] };
    expect(family.some((t) => t.when(s, 6))).toBe(true);
    expect(family.every((t) => !t.when({ ...s, flags: [] }, 6))).toBe(true);
  });
});

describe("buyouts", () => {
  it("buys the majority with a bank loan and pays dividends", () => {
    const { state, id } = withDeal(rich(), "buyout");
    const s0 = startupOf(state, id);
    const price = s0.offer!.ticket;
    expect(() => act({ ...state, reputation: 40 }, { type: "buyout", startupId: id, leverage: true })).toThrow(/Ruf/);
    expect(() => act(state, { type: "invest", startupId: id })).toThrow(/Mehrheit/);
    let after = act(state, { type: "buyout", startupId: id, leverage: true });
    const s = startupOf(after, id);
    expect(s.stake).toBeGreaterThan(50);
    expect(totalPct(s)).toBeCloseTo(100, 6);
    expect(after.loans).toHaveLength(1);
    expect(after.cash).toBeCloseTo(state.cash - (price - after.loans[0]!.balance), 0);
    expect(after.lessons).toContain("lbo");
    // Let the profits pile up, then the quarterly dividend comes.
    after = { ...after, startups: after.startups.map((x) => (x.id === id ? { ...x, metrics: { ...x.metrics, cash: x.metrics.opex * 8 } } : x)) };
    let dividends = 0;
    for (let m = 0; m < 3; m++) {
      const r = applyAction(after, { type: "closeMonth" });
      after = r.state;
      if (r.result.kind === "report") dividends += r.result.report.income?.dividends ?? 0;
    }
    expect(dividends).toBeGreaterThan(0);
  });
});

describe("family office", () => {
  it("needs reputation, money and an office floor, then hires a team", () => {
    const poor = newGame(2);
    expect(() => act(poor, { type: "foundFamilyOffice" })).toThrow();
    let state = rich();
    state = act(state, { type: "foundFamilyOffice" });
    expect(state.familyOffice).toBe(state.month);
    expect(state.cash).toBe(3_000_000 - FAMILY_OFFICE_COST);
    state = act(state, { type: "hire", role: "partner" });
    expect(monthDays(state)).toBe(monthDays({ ...state, team: [] }) + 3);
    expect(() => act(state, { type: "hire", role: "partner" })).toThrow();
    state = act(state, { type: "hire", role: "associate" });
    const report = closeMonth(structuredClone(state));
    expect(report.income?.salaries).toBe(-(SALARY.partner + SALARY.associate));
  });

  it("an associate decides the mandate's open items at month end", () => {
    let state = act(rich(5), { type: "invest", startupId: "pendelwerk" });
    state = act(state, { type: "foundFamilyOffice" });
    state = act(state, { type: "hire", role: "associate" });
    const member = state.team[0]!;
    state = act(state, { type: "assign", memberId: member.id, startupId: "pendelwerk" });
    state = { ...state, items: [{ id: "v900", startupId: "pendelwerk", templateId: "influencer", month: state.month, status: "open", asked: [], pretalks: [], cfo: false }] };
    const next = structuredClone(state);
    closeMonth(next);
    const item = next.items.find((i) => i.id === "v900")!;
    expect(item.status).toBe("decided");
    expect(item.decision?.delegated).toBe(true);
    expect(item.decision?.lapsed).toBeUndefined();
  });
});

describe("own fund", () => {
  it("needs a track record, then co-invests and pays a fee", () => {
    let state = act(rich(6), { type: "foundFamilyOffice" });
    expect(fundBlocker(state)).toMatch(/Verkauf/);
    const exit: ExitOffer = { id: "x1", startupId: "pendelwerk", month: 1, buyer: "Velocity", price: 1, status: "accepted" };
    state = { ...state, exits: [exit] };
    expect(fundBlocker(state)).toBeNull();
    state = act(state, { type: "raiseFund" });
    expect(state.fund!.size).toBeGreaterThanOrEqual(3_000_000);
    expect(state.lessons).toContain("fonds");
    state = act(state, { type: "invest", startupId: "kantinenkasse" });
    const s = startupOf(state, "kantinenkasse");
    const fund = s.capTable.find((h) => h.kind === "fund")!;
    expect(fund.cost).toBeGreaterThan(0);
    expect(totalPct(s)).toBeCloseTo(100, 6);
    expect(state.fund!.invested).toBe(fund.cost);
    const report = closeMonth(structuredClone(state));
    expect(report.income?.fundFee).toBeGreaterThan(0);
  });
});

describe("IPO", () => {
  it("pays half now and the rest after the lockup, at the market's price", () => {
    const state = act(newGame(7), { type: "invest", startupId: "pendelwerk" });
    const s = startupOf(state, "pendelwerk");
    const offer: ExitOffer = { id: "x9", startupId: s.id, month: state.month, buyer: "Börsengang in Frankfurt", price: Math.round(valuation(s.metrics) * 1.6), status: "open", ipo: true };
    let after = act({ ...state, exits: [offer] }, { type: "exit", exitId: "x9", choice: "accept" });
    expect(after.exits[0]!.status).toBe("accepted");
    expect(after.lockups).toHaveLength(1);
    const locked = after.lockups[0]!;
    expect(locked.due).toBe(state.month + IPO_LOCKUP);
    expect(after.lessons).toContain("ipo");
    for (let m = 0; m < IPO_LOCKUP; m++) after = act(after, { type: "closeMonth" });
    expect(after.lockups).toHaveLength(0);
  });
});

describe("saved games", () => {
  it("a version 4 game gets deals, team, loans and lockups", () => {
    const v4: Record<string, unknown> = { ...newGame(2), version: 4 };
    for (const key of ["deals", "team", "lockups", "loans", "yearWorth"]) delete v4[key];
    const up = upgradeState(v4 as unknown as GameState);
    expect(up.version).toBe(6);
    expect(up.deals).toEqual([]);
    expect(up.team).toEqual([]);
    expect(up.yearWorth).toBeCloseTo(netWorth(up), 0);
  });

  it("validates the new actions", () => {
    expect(parseAction({ type: "buyout", startupId: "d1", leverage: true })).toEqual({ type: "buyout", startupId: "d1", leverage: true });
    expect(parseAction({ type: "hire", role: "ceo" })).toBeNull();
    expect(parseAction({ type: "assign", memberId: "t1", startupId: null })).toEqual({ type: "assign", memberId: "t1", startupId: null });
    expect(parseAction({ type: "raiseFund" })).toEqual({ type: "raiseFund" });
  });
});
