import { describe, expect, it } from "vitest";
import { applyAction, ctxOf, GameRuleError, newGame, reputationGain } from "../lib/game/engine";
import { targetDeal } from "../lib/game/lbo";
import { leagueTable, recordLeague, yearOf } from "../lib/game/league";
import { BIG_ROUNDS, bigFee, drawBigMandate } from "../lib/game/mandate-big";
import { mnaOf } from "../lib/game/mna-core";
import { planRivalHouses, rivalsOf, RIVAL_REPUTATION } from "../lib/game/rivals";
import { bigMandateView, duelView, leagueView } from "../lib/game/rivals-views";
import { parseAction } from "../lib/game/validate";
import type { GameAction, GameState } from "../lib/game/types";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;
const close = (state: GameState) => act(state, { type: "closeMonth" });

function rich(seed: number, extra: Partial<GameState> = {}): GameState {
  return { ...newGame(seed), reputation: 80, cash: 8_000_000, month: 12, ...extra };
}

/** A family business on the open market with a rival bidding for it. */
function withDuel(seed = 5): { state: GameState; id: string } {
  for (let s = seed; s < seed + 60; s++) {
    const state = rich(s);
    const ctx = ctxOf(state);
    const deal = targetDeal(ctx, () => 0.5, { ev: 3_000_000, source: "market" });
    planRivalHouses(ctx);
    if (deal.offer?.duel) return { state, id: deal.id };
  }
  throw new Error("no duel");
}

describe("reputation grows slower at the top", () => {
  it("weighs gains by level, carries fractions and caps a month", () => {
    const low = { ...newGame(1), reputation: 30 };
    const high = { ...newGame(1), reputation: 88 };
    expect(reputationGain(low, 4)).toBeGreaterThan(reputationGain(high, 4));
    // Fractions are not lost: five gains of one point at 70 % give three points.
    const s = { ...newGame(2), reputation: 30 };
    let sum = 0;
    for (let i = 0; i < 5; i++) sum += reputationGain(s, 1);
    expect(sum).toBe(3);
    // Losses always count in full.
    expect(reputationGain(high, -3)).toBe(-3);
    // The monthly cap: at 80 no more than two points in a month.
    const top = { ...newGame(3), reputation: 80 };
    let won = 0;
    for (let i = 0; i < 10; i++) won += reputationGain(top, 6);
    expect(won).toBe(2);
  });
});

describe("rivals", () => {
  it("show up from reputation 50, drawn by seed, three different houses", () => {
    const quiet = { ...newGame(4), reputation: RIVAL_REPUTATION - 1 };
    planRivalHouses(ctxOf(quiet));
    expect(quiet.rivals).toBeUndefined();
    const known = { ...newGame(4), reputation: RIVAL_REPUTATION };
    planRivalHouses(ctxOf(known));
    expect(known.rivals).toBeDefined();
    const a = rivalsOf(known).map((r) => r.id);
    expect(new Set(a).size).toBe(3);
    expect(rivalsOf({ ...newGame(4) }).map((r) => r.id)).toEqual(a);
    const others = new Set(
      Array.from({ length: 12 }, (_, i) =>
        rivalsOf(newGame(i + 1))
          .map((r) => r.id)
          .join(),
      ),
    );
    expect(others.size).toBeGreaterThan(3);
  });

  it("stand in the league table with the same names", () => {
    const state = rich(6);
    planRivalHouses(ctxOf(state));
    const rows = leagueTable(state, yearOf(state.month));
    for (const r of rivalsOf(state)) expect(rows.find((x) => x.name === r.name)?.rival).toBe(true);
    expect(rows.filter((x) => x.rival)).toHaveLength(3);
    expect(leagueView(state).rivals.map((r) => r.name)).toEqual(rivalsOf(state).map((r) => r.name));
  });
});

describe("bidding war", () => {
  it("blocks the purchase until it is decided, then the last bid is the price", () => {
    const { state, id } = withDuel();
    const start = duelView(state, id)!;
    expect(start.status).toBe("open");
    expect(start.ahead).toBe(false);
    expect(() => act(state, { type: "acquire", targetId: id, bid: "ask", bank: 0.5, vendor: 0, earnout: 0 })).toThrow(GameRuleError);
    let s = act(state, { type: "duel", targetId: id, move: "concept" });
    for (let i = 0; i < 2 && duelView(s, id)!.status === "open"; i++) s = act(s, { type: "duel", targetId: id, move: "raise", size: "big" });
    const end = duelView(s, id)!;
    expect(["won", "lost"]).toContain(end.status);
    expect(end.round).toBeLessThanOrEqual(3);
    if (end.status === "won") {
      expect(s.startups.find((x) => x.id === id)!.offer!.ev).toBe(end.you);
      expect(() => act(s, { type: "acquire", targetId: id, bid: "low", bank: 0.5, vendor: 0, earnout: 0 })).toThrow(GameRuleError);
    } else expect(s.startups.find((x) => x.id === id)!.status).toBe("declined");
  });

  it("walking away gives the company to the rival; an open war is decided at month end", () => {
    const { state, id } = withDuel(9);
    const left = act(state, { type: "duel", targetId: id, move: "leave" });
    expect(left.startups.find((x) => x.id === id)!.status).toBe("declined");
    expect(Object.values(left.rivals!.duels).reduce((a, d) => a + d.lost, 0)).toBe(1);
    const after = close(state);
    expect(Object.values(after.rivals!.duels).reduce((a, d) => a + d.lost, 0)).toBe(1);
    expect(after.mails.some((m) => m.subject.includes("Zuschlag an"))).toBe(true);
  });
});

describe("large mandates", () => {
  it("teaser, bids, three rounds and a large fee", () => {
    let state = rich(11, { reputation: 85, familyOffice: 1 });
    const md = drawBigMandate(ctxOf(state), () => 0.5);
    mnaOf(state).mandates.push(md);
    expect(md.big!.facts.length).toBeGreaterThanOrEqual(6);
    state = act(state, { type: "mandate", mandateId: md.id, move: "accept" });
    expect(() => act(state, { type: "mandate", mandateId: md.id, move: "launch", multiple: 6, process: "auction" })).toThrow(GameRuleError);
    state = act(state, { type: "mandate", mandateId: md.id, move: "comps" });
    const facts = md.big!.facts.filter((f) => f.finding || ["revenue", "ebitda", "plan"].includes(f.id)).map((f) => f.id);
    state = act(state, { type: "mandate", mandateId: md.id, move: "teaser", facts });
    expect(bigMandateView(state, md.id)!.teaser).toEqual(facts);
    const comps = mnaOf(state).mandates.find((m) => m.id === md.id)!.comps!;
    state = act(state, { type: "mandate", mandateId: md.id, move: "launch", multiple: comps[0], buyers: "mixed", process: "auction" });
    state = close(state);
    let view = bigMandateView(state, md.id)!;
    expect(mnaOf(state).mandates.find((m) => m.id === md.id)!.status).toBe("bids");
    expect(view.bids.length).toBeGreaterThan(0);
    for (let i = 0; i < BIG_ROUNDS; i++) {
      const top = bigMandateView(state, md.id)!.bids.find((b) => !b.out)!;
      state = act(state, { type: "mandate", mandateId: md.id, move: "round", bidder: top.buyer, lever: i === 1 ? "bnf" : "batna" });
    }
    view = bigMandateView(state, md.id)!;
    expect(view.rounds).toBe(BIG_ROUNDS);
    expect(() => act(state, { type: "mandate", mandateId: md.id, move: "round", bidder: view.bids[0]!.buyer, lever: "batna" })).toThrow(GameRuleError);
    state = act(state, { type: "mandate", mandateId: md.id, move: "accept_bid" });
    state = close(state);
    const done = mnaOf(state).mandates.find((m) => m.id === md.id)!;
    expect(done.status === "closed" || done.status === "failed").toBe(true);
    if (done.status === "closed") {
      expect(done.outcome!.fee).toBe(bigFee(done.outcome!.ev));
      expect(done.outcome!.fee).toBeGreaterThan(100_000);
      expect(mnaOf(state).league!.find((x) => x.year === yearOf(12))!.count).toBe(1);
    }
  });

  it("records advised volume per calendar year", () => {
    const state = rich(3);
    recordLeague(ctxOf(state), 12, 50_000_000);
    recordLeague(ctxOf(state), 12, 10_000_000);
    const me = leagueTable(state, yearOf(12)).find((x) => x.me)!;
    expect(me.volume).toBe(60);
    expect(me.count).toBe(2);
  });
});

describe("input", () => {
  it("parses the new moves and rejects nonsense", () => {
    expect(parseAction({ type: "duel", targetId: "d12", move: "raise", size: "big" })).toEqual({ type: "duel", targetId: "d12", move: "raise", size: "big" });
    expect(parseAction({ type: "duel", targetId: "d12", move: "steal" })).toBeNull();
    expect(parseAction({ type: "mandate", mandateId: "n1", move: "round", bidder: "Cornerstone Partners", lever: "batna" })).toMatchObject({ lever: "batna" });
    expect(parseAction({ type: "mandate", mandateId: "n1", move: "round", bidder: "X", lever: "bribe" })).toBeNull();
    expect(parseAction({ type: "mandate", mandateId: "n1", move: "teaser", facts: ["revenue", "f-ebitda"] })).toMatchObject({ facts: ["revenue", "f-ebitda"] });
  });
});
