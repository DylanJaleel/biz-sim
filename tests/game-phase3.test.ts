import { describe, expect, it } from "vitest";
import { roundTerms, waterfall } from "../lib/game/captable";
import { CORPORATE_FEE, CORPORATE_REPUTATION, DAYS_PER_MONTH, LIVING_COSTS, SYNDICATE_REPUTATION } from "../lib/game/config";
import { TEMPLATES } from "../lib/game/content";
import { CORPORATE_ID } from "../lib/game/corporate";
import { applyAction, closeMonth, daysLeft, newGame, startupOf, upgradeState } from "../lib/game/engine";
import { OFFICES } from "../lib/game/office";
import { valuation } from "../lib/game/sim";
import type { ExitOffer, GameAction, GameState, Round, Startup } from "../lib/game/types";
import { parseAction } from "../lib/game/validate";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

function invested(seed = 7): GameState {
  return act(newGame(seed), { type: "invest", startupId: "pendelwerk" });
}

function withExit(state: GameState, factor: number): { state: GameState; offer: ExitOffer } {
  const s = startupOf(state, "pendelwerk");
  const offer: ExitOffer = { id: "x900", startupId: s.id, month: state.month, buyer: "Velocity", price: Math.round(valuation(s.metrics) * factor), status: "open" };
  return { state: { ...state, exits: [...state.exits, offer] }, offer };
}

const company = (capTable: Startup["capTable"], stake: number, playerPref = 0): Startup =>
  ({ ...startupOf(invested(), "pendelwerk"), capTable, stake, playerPref }) as Startup;

describe("liquidation preference", () => {
  const s = company(
    [
      { id: "ceo", name: "Gründerin", kind: "founder", pct: 60 },
      { id: "fund", name: "Fonds", kind: "investor", pct: 20, pref: 1_000_000 },
    ],
    20,
  );

  it("a low price pays the fund back first", () => {
    const { payouts } = waterfall(s, 2_000_000);
    const fund = payouts.find((p) => p.id === "fund")!.amount;
    expect(fund).toBe(1_000_000);
    expect(payouts.find((p) => p.id === "you")!.amount).toBeCloseTo(250_000, 0);
    expect(payouts.reduce((sum, p) => sum + p.amount, 0)).toBeCloseTo(2_000_000, 0);
  });

  it("a high price lets the fund convert into its share", () => {
    const { payouts } = waterfall(s, 10_000_000);
    expect(payouts.find((p) => p.id === "fund")!.amount).toBeCloseTo(2_000_000, 0);
    expect(payouts.find((p) => p.id === "you")!.amount).toBeCloseTo(2_000_000, 0);
  });

  it("the syndicate lead earns carry on the gain", () => {
    const syn = company(
      [
        { id: "ceo", name: "Gründerin", kind: "founder", pct: 70 },
        { id: "syndikat", name: "Dein Syndikat", kind: "syndicate", pct: 10, pref: 100_000, cost: 100_000 },
      ],
      20,
    );
    const { payouts, carry } = waterfall(syn, 5_000_000);
    expect(payouts.find((p) => p.id === "syndikat")!.amount).toBeCloseTo(500_000, 0);
    expect(carry).toBeCloseTo(80_000, 0);
  });
});

describe("exit offers", () => {
  it("a good price sells the company and pays the player through the waterfall", () => {
    const { state, offer } = withExit(invested(), 1.4);
    const cash = state.cash;
    const result = applyAction(state, { type: "exit", exitId: offer.id, choice: "accept" });
    const done = result.state.exits.find((e) => e.id === offer.id)!;
    expect(result.result).toEqual({ kind: "exit", exitId: offer.id });
    expect(done.status).toBe("accepted");
    expect(startupOf(result.state, "pendelwerk").status).toBe("exited");
    const mine = done.payouts!.find((p) => p.id === "you")!.amount;
    expect(result.state.cash).toBeCloseTo(cash + mine, 0);
    expect(result.state.lessons).toContain("liquidationspraeferenz");
  });

  it("a cheap offer is turned down by founders and fund", () => {
    const { state, offer } = withExit(invested(), 0.85);
    const after = act(state, { type: "exit", exitId: offer.id, choice: "accept" });
    expect(after.exits.find((e) => e.id === offer.id)!.status).toBe("rejected");
    expect(startupOf(after, "pendelwerk").status).toBe("active");
  });

  it("negotiating either raises the price or the buyer walks away", () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const { state, offer } = withExit(invested(seed), 1.1);
      const after = act(state, { type: "exit", exitId: offer.id, choice: "negotiate" });
      const next = after.exits.find((e) => e.id === offer.id)!;
      if (next.status === "withdrawn") outcomes.add("walked");
      else {
        expect(next.price).toBeGreaterThan(offer.price);
        expect(() => act(after, { type: "exit", exitId: offer.id, choice: "negotiate" })).toThrow(/nachverhandelt/);
        outcomes.add("raised");
      }
    }
    expect(outcomes.size).toBe(2);
  });

  it("an unanswered offer is decided at month end without the player", () => {
    const { state, offer } = withExit(invested(), 1.5);
    const after = structuredClone(state);
    closeMonth(after);
    expect(after.exits.find((e) => e.id === offer.id)!.status).not.toBe("open");
  });
});

describe("offices", () => {
  it("moving up needs reputation and money and costs rent every month", () => {
    const state = newGame(1);
    expect(() => act(state, { type: "moveOffice", level: 1 })).toThrow(/Ruf/);
    const known = { ...state, reputation: 30 };
    const moved = act(known, { type: "moveOffice", level: 1 });
    expect(moved.office).toBe(1);
    expect(moved.cash).toBe(known.cash - OFFICES[1]!.rent);
    const next = structuredClone(moved);
    const report = closeMonth(next);
    expect(report.income?.rent).toBe(-OFFICES[1]!.rent);
    expect(report.income?.living).toBe(-LIVING_COSTS);
    expect(() => act({ ...known, reputation: 90 }, { type: "moveOffice", level: 4 })).toThrow(/Vermögen/);
  });

  it("an analyst saves days and the top floor adds days", () => {
    let state = invested();
    state = { ...state, office: 3, items: [{ id: "v900", startupId: "pendelwerk", templateId: TEMPLATES[0]!.id, month: state.month, status: "open", asked: [], pretalks: [], cfo: false }] };
    const before = daysLeft(state);
    expect(before).toBe(DAYS_PER_MONTH + 2 - state.daysUsed);
    const after = act(state, { type: "cfo", itemId: "v900" });
    expect(daysLeft(after)).toBe(before);
  });
});

describe("syndicate", () => {
  function roundFor(state: GameState): { state: GameState; round: Round } {
    const s = startupOf(state, "pendelwerk");
    const round: Round = { id: "r900", startupId: s.id, month: state.month, status: "open", ...roundTerms(s, 0, () => 0.1), down: false };
    return { state: { ...state, rounds: [...state.rounds, round] }, round };
  }

  it("needs reputation and a warm angel club", () => {
    const { state, round } = roundFor({ ...invested(), cash: 1_000_000 });
    expect(() => act(state, { type: "round", roundId: round.id, take: "syndicate", vote: "go" })).toThrow(/Ruf/);
    const cold = { ...state, reputation: SYNDICATE_REPUTATION };
    expect(() => act(cold, { type: "round", roundId: round.id, take: "syndicate", vote: "go" })).toThrow(/Angel-Club/);
    const warm = { ...cold, contacts: cold.contacts.map((c) => (c.id === "angels" ? { ...c, met: true, warmth: 60 } : c)) };
    const after = act(warm, { type: "round", roundId: round.id, take: "syndicate", vote: "go" });
    const syn = startupOf(after, "pendelwerk").capTable.find((h) => h.kind === "syndicate")!;
    expect(syn.cost).toBeGreaterThan(0);
    expect(syn.pref).toBe(syn.cost);
    expect(after.ledRounds).toBe(1);
    expect(after.contacts.find((c) => c.id === "angels")!.warmth).toBeLessThan(60);
  });
});

describe("supervisory board", () => {
  it("is offered with a strong record and pays a fixed fee", () => {
    let state = { ...invested(), reputation: CORPORATE_REPUTATION, ledRounds: 1 };
    closeMonth(state);
    expect(state.corporateSeat).toBe("offered");
    expect(state.mails.some((m) => m.action === "corporate")).toBe(true);
    state = act(state, { type: "joinCorporate", accept: true });
    const k = startupOf(state, CORPORATE_ID);
    expect(k.corporate).toBe(true);
    expect(k.stake).toBe(0);
    const next = structuredClone(state);
    const report = closeMonth(next);
    expect(report.income!.boardFees).toBeGreaterThanOrEqual(CORPORATE_FEE);
    // The board meets the month after joining, with corporate topics only.
    const item = next.items.find((i) => i.startupId === CORPORATE_ID);
    expect(item).toBeDefined();
    expect(item!.templateId.startsWith("k_")).toBe(true);
    expect(next.items.filter((i) => i.startupId !== CORPORATE_ID).every((i) => !i.templateId.startsWith("k_"))).toBe(true);
  });
});

describe("news", () => {
  it("starts in month three and hits companies", () => {
    let state = invested(5);
    let seen = 0;
    for (let m = 0; m < 18; m++) {
      const report = applyAction(state, { type: "closeMonth" });
      state = report.state;
      if (report.result.kind === "report") seen += report.result.report.notes.filter((n) => n.startsWith("Nachrichten")).length;
    }
    expect(state.news.length).toBeGreaterThan(0);
    expect(state.news.every((n) => n.month >= 3)).toBe(true);
    expect(seen).toBe(state.news.length);
  });
});

describe("saved games", () => {
  it("a version 3 game gets offices, exits and news", () => {
    const v3: Record<string, unknown> = { ...newGame(2), version: 3 };
    for (const key of ["office", "exits", "news", "corporateSeat"]) delete v3[key];
    const up = upgradeState(v3 as unknown as GameState);
    expect(up.version).toBe(5);
    expect(up.office).toBe(0);
    expect(up.exits).toEqual([]);
    expect(up.corporateSeat).toBe("none");
  });

  it("validates the new actions", () => {
    expect(parseAction({ type: "exit", exitId: "x1", choice: "negotiate" })).toEqual({ type: "exit", exitId: "x1", choice: "negotiate" });
    expect(parseAction({ type: "exit", exitId: "x1", choice: "steal" })).toBeNull();
    expect(parseAction({ type: "moveOffice", level: 9 })).toBeNull();
    expect(parseAction({ type: "joinCorporate", accept: "yes" })).toBeNull();
    expect(parseAction({ type: "round", roundId: "r1", take: "syndicate", vote: "go" })).not.toBeNull();
  });
});
