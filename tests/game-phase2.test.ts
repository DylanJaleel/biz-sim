import { describe, expect, it } from "vitest";
import { roundTerms, shareholderVote, stakeAfter, totalPct } from "../lib/game/captable";
import { LEAD_REPUTATION } from "../lib/game/config";
import { applyAction, closeMonth, newGame, startupOf, upgradeState } from "../lib/game/engine";
import { CONTACTS } from "../lib/game/network";
import { applyDelta } from "../lib/game/sim";
import type { GameAction, GameState, Round } from "../lib/game/types";
import { parseAction } from "../lib/game/validate";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

function invested(seed = 7): GameState {
  let state = newGame(seed);
  state = act(state, { type: "invest", startupId: "pendelwerk" });
  return state;
}

/** Puts an open round on the table for Pendelwerk. */
function withRound(state: GameState, down = false): { state: GameState; round: Round } {
  const s = startupOf(state, "pendelwerk");
  const terms = roundTerms(s, 0, () => 0.1);
  const round: Round = { id: "r900", startupId: s.id, month: state.month, status: "open", ...terms, down, preMoney: down ? terms.preMoney * 0.6 : terms.preMoney };
  return { state: { ...state, rounds: [...state.rounds, round] }, round };
}

describe("cap table", () => {
  it("adds up to 100 % after investing and after a dilution", () => {
    const state = invested();
    const s = startupOf(state, "pendelwerk");
    expect(s.stake).toBe(12);
    expect(totalPct(s)).toBeCloseTo(100, 6);
    const diluted = applyDelta(s, { dilution: 0.08, dilutionTo: { id: "esop", name: "Mitarbeiterpool", kind: "esop" } });
    expect(diluted.stake).toBeCloseTo(12 * 0.92, 6);
    expect(totalPct(diluted)).toBeCloseTo(100, 6);
    expect(diluted.capTable.find((h) => h.id === "esop")!.pct).toBeGreaterThan(s.capTable.find((h) => h.id === "esop")!.pct);
  });

  it("a smaller ticket buys half the stake", () => {
    let state = newGame(3);
    const full = startupOf(state, "kantinenkasse").offer!.ticket;
    state = act(state, { type: "invest", startupId: "kantinenkasse", size: "half" });
    expect(startupOf(state, "kantinenkasse").stake).toBe(6);
    expect(state.cash).toBe(150_000 - Math.round(full / 2 / 1000) * 1000);
  });
});

describe("financing rounds", () => {
  it("pro rata keeps the stake, staying out dilutes it", () => {
    const { state, round } = withRound({ ...invested(), cash: 1_000_000 });
    const stake = startupOf(state, "pendelwerk").stake;
    expect(stakeAfter(round, stake, "prorata")).toBeCloseTo(stake, 1);
    expect(stakeAfter(round, stake, "none")).toBeLessThan(stake);
    expect(stakeAfter(round, stake, "half")).toBeGreaterThan(stakeAfter(round, stake, "none"));
    expect(stakeAfter(round, stake, "half")).toBeLessThan(stake);

    const after = act(state, { type: "round", roundId: round.id, take: "prorata", vote: "go" });
    const s = startupOf(after, "pendelwerk");
    expect(after.rounds.find((r) => r.id === round.id)!.status).toBe("closed");
    expect(s.stake).toBeCloseTo(stake, 1);
    expect(totalPct(s)).toBeCloseTo(100, 6);
    expect(s.capTable.some((h) => h.id === round.leadId)).toBe(true);
    expect(after.lessons).toEqual(expect.arrayContaining(["pre_post_money", "pro_rata"]));
  });

  it("leading a round needs reputation and raises the stake", () => {
    const { state, round } = withRound(invested());
    expect(() => act(state, { type: "round", roundId: round.id, take: "lead", vote: "go" })).toThrow(/Ruf/);
    const famous = { ...state, reputation: LEAD_REPUTATION, cash: 2_000_000 };
    const after = act(famous, { type: "round", roundId: round.id, take: "lead", vote: "go" });
    expect(startupOf(after, "pendelwerk").stake).toBeGreaterThan(12);
    expect(after.ledRounds).toBe(1);
  });

  it("in a down round the early angels and the fund vote no; founders still carry it", () => {
    const { state, round } = withRound(invested(), true);
    const s = startupOf(state, "pendelwerk");
    const { ballots, approved } = shareholderVote(round, s, "no");
    expect(ballots.find((b) => b.kind === "angel")!.vote).toBe("no");
    expect(ballots.find((b) => b.kind === "founder")!.vote).toBe("go");
    expect(approved).toBe(true);
  });

  it("a round the player ignores closes at month end without them", () => {
    const { state, round } = withRound(invested());
    const stake = startupOf(state, "pendelwerk").stake;
    const next = structuredClone(state);
    closeMonth(next);
    const closed = next.rounds.find((r) => r.id === round.id)!;
    expect(closed.status).toBe("closed");
    expect(closed.ballots!.find((b) => b.id === "you")!.vote).toBe("abstain");
    expect(startupOf(next, "pendelwerk").stake).toBeLessThan(stake);
  });
});

describe("buying shares", () => {
  it("transfers the seller's shares and announces a majority", () => {
    let state = invested();
    const s = startupOf(state, "pendelwerk");
    const founder = s.capTable.find((h) => h.kind === "founder")!;
    state = {
      ...state,
      cash: 5_000_000,
      shareOffers: [{ id: "a900", startupId: s.id, sellerId: founder.id, sellerName: founder.name, pct: 40, price: 400_000, expires: state.month + 1, status: "open" }],
    };
    const after = act(state, { type: "buyShares", offerId: "a900" });
    const bought = startupOf(after, "pendelwerk");
    expect(bought.stake).toBeCloseTo(52, 6);
    expect(totalPct(bought)).toBeCloseTo(100, 6);
    expect(after.mails[0]!.subject).toMatch(/Mehrheit/);
    expect(after.lessons).toContain("stimmrechte");
  });
});

describe("network", () => {
  it("inner ring is open from the start, outer rings need reputation", () => {
    const state = invested();
    expect(state.contacts.filter((c) => c.met).map((c) => c.id)).toEqual(CONTACTS.filter((c) => c.ring === 1).map((c) => c.id));
    expect(() => act(state, { type: "meetContact", contactId: "vcpartner" })).toThrow(/Ruf/);
  });

  it("an introduction costs warmth and pays off next month", () => {
    let state = invested();
    const revenue = startupOf(state, "pendelwerk").metrics.revenue;
    state = act(state, { type: "introContact", contactId: "vertrieb", startupId: "pendelwerk" });
    expect(state.contacts.find((c) => c.id === "vertrieb")!.warmth).toBe(30);
    expect(() => act(state, { type: "introContact", contactId: "vertrieb", startupId: "pendelwerk" })).toThrow();
    state = act(state, { type: "closeMonth" });
    expect(startupOf(state, "pendelwerk").metrics.revenue).toBeGreaterThan(revenue * 1.04);
  });
});

describe("saved games", () => {
  it("a phase 1 game gets cap tables and the network", () => {
    const old = invested() as unknown as Record<string, unknown>;
    const v1 = { ...old, version: 1, rounds: undefined, shareOffers: undefined, contacts: undefined, ledRounds: undefined, gigs: undefined, market: undefined } as unknown as GameState;
    for (const s of v1.startups) delete (s as Partial<typeof s>).capTable;
    const up = upgradeState(v1);
    expect(up.version).toBe(3);
    expect(up.gigs.length).toBeGreaterThan(0);
    expect(up.market.prices.tech).toBe(100);
    expect(up.contacts.length).toBe(CONTACTS.length);
    expect(totalPct(startupOf(up, "pendelwerk"))).toBeCloseTo(100, 6);
  });

  it("parses the new moves", () => {
    expect(parseAction({ type: "round", roundId: "r5", take: "prorata", vote: "go" })).toEqual({ type: "round", roundId: "r5", take: "prorata", vote: "go" });
    expect(parseAction({ type: "round", roundId: "r5", take: "all", vote: "go" })).toBeNull();
    expect(parseAction({ type: "introContact", contactId: "bank", startupId: "pendelwerk" })).not.toBeNull();
    expect(parseAction({ type: "invest", startupId: "pendelwerk", size: "half" })).toEqual({ type: "invest", startupId: "pendelwerk", size: "half" });
  });
});
