import { describe, expect, it } from "vitest";
import { applyAction, newGame } from "../lib/game/engine";
import { applyRound } from "../lib/game/captable";
import { prepBlocker, roundPrepView, termSheetView } from "../lib/game/round-prep";
import { initialTerms, negotiateTerms, prepBonus } from "../lib/game/rounds";
import { ventureChecks } from "../lib/game/venture";
import { IPO_PREP_REPUTATION, PREP_MIN_GAP, ROUND_PREP_REPUTATION, STAGE_GOALS, VENTURE_STAGES } from "../lib/game/venture-config";
import { parseAction } from "../lib/game/validate";
import { lessonOf } from "../lib/game/lessons";
import { UNLOCKS } from "../lib/game/onboarding";
import type { GameAction, GameState, Round, Startup } from "../lib/game/types";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;
const fixed = (v: number) => () => v;

function onPath(stage: number, paper: number, reputation = 50): { state: GameState; s: Startup } {
  const state: GameState = { ...newGame(3), reputation };
  state.month = 20;
  const s = state.startups.find((x) => x.id === "pendelwerk")!;
  s.status = "active";
  s.stake = 8;
  s.joined = 1;
  s.venture = { stage, paper, since: 18, next: 30, log: [] };
  return { state, s };
}

function growthRound(s: Startup, stage: number, terms = initialTerms(stage, undefined, 1, fixed(0.9))): Round {
  const def = VENTURE_STAGES[stage]!;
  const amount = def.post * def.dilution;
  return {
    id: "r-t",
    startupId: s.id,
    month: 20,
    label: def.label,
    amount,
    preMoney: def.post - amount,
    leadId: "growth-x",
    lead: "Atlas Growth",
    down: false,
    status: "open",
    venture: stage,
    terms,
  };
}

describe("milestones per round", () => {
  it("each round asks for what fits its phase", () => {
    const { state, s } = onPath(0, 6_000_000);
    expect(ventureChecks(state, s).map((c) => c.id)).toEqual(["revenue", "growth", "product", "customers", "board"]);
    expect(ventureChecks(state, s, 2).some((c) => c.id === "margin")).toBe(true);
    expect(ventureChecks(state, s, 4).some((c) => c.id === "burn")).toBe(true);
    expect(ventureChecks(state, s, "ipo").length).toBe(STAGE_GOALS.at(-1)!.goals.length);
    for (const c of ventureChecks(state, s, 3)) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("preparing a round", () => {
  it("opens with reputation, sets the timetable and takes pitches", () => {
    const low = onPath(0, 6_000_000, ROUND_PREP_REPUTATION - 1);
    expect(prepBlocker(low.state, low.s, false)).toMatch(/Ruf/);
    const { state, s } = onPath(0, 6_000_000);
    expect(prepBlocker(state, s, false)).toBeNull();
    expect(prepBlocker(state, s, true)).toMatch(new RegExp(String(IPO_PREP_REPUTATION)));
    let next = act(state, { type: "ventureRound", startupId: s.id, move: "prepare", months: 3, ambition: "cautious" });
    let prep = next.startups.find((x) => x.id === s.id)!.venture!.prep!;
    expect(prep.target).toBe(1);
    // Not sooner than PREP_MIN_GAP months after the last round.
    expect(prep.due).toBe(Math.max(20 + 3, 18 + PREP_MIN_GAP));
    next = act(next, { type: "ventureRound", startupId: s.id, move: "pitch", investor: 1 });
    prep = next.startups.find((x) => x.id === s.id)!.venture!.prep!;
    expect(prep.pitched).toEqual([1]);
    expect(() => applyAction(next, { type: "ventureRound", startupId: s.id, move: "pitch", investor: 1 })).toThrow(/schon/);
    expect(prepBonus(prep).total).toBeCloseTo(0.08 + 0.03, 5);
    const view = roundPrepView(next, next.startups.find((x) => x.id === s.id)!, 5)!;
    expect(view.chance.total).toBeGreaterThan(view.chance.base);
    expect(view.investors.names[1]!.pitched).toBe(true);
    next = act(next, { type: "ventureRound", startupId: s.id, move: "cancel" });
    expect(next.startups.find((x) => x.id === s.id)!.venture!.prep).toBeUndefined();
  });

  it("at the due month the round goes out: term sheet, bridge or down round, never silence", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { state, s } = onPath(0, 6_000_000);
      state.seed = seed;
      s.venture!.prep = { target: 1, started: 19, due: 22, ambition: "market", pitched: [0, 2] };
      let next = act(state, { type: "closeMonth" });
      expect(next.startups.find((x) => x.id === s.id)!.venture!.prep).toBeDefined();
      next = act(next, { type: "closeMonth" });
      const after = next.startups.find((x) => x.id === s.id)!;
      expect(after.venture!.prep).toBeUndefined();
      const round = next.rounds.find((r) => r.startupId === s.id && r.venture === 1);
      const logged = after.venture!.log.at(-1);
      expect(round !== undefined || logged?.bridge === true || logged?.down === true).toBe(true);
      if (round) {
        expect(round.terms!.seat).toBe(true);
        expect(["Isar Capital", "Elbe Growth"]).toContain(round.lead);
        expect(termSheetView(next, round)!.levers.find((l) => l.lever === "price")!.open).toBe(true);
      }
    }
  });

  it("parses only valid moves", () => {
    expect(parseAction({ type: "ventureRound", startupId: "pendelwerk", move: "prepare", months: 6, ambition: "bold" })).toEqual({
      type: "ventureRound",
      startupId: "pendelwerk",
      move: "prepare",
      months: 6,
      ambition: "bold",
    });
    expect(parseAction({ type: "ventureRound", startupId: "pendelwerk", move: "prepare", months: 5 })).toBeNull();
    expect(parseAction({ type: "ventureRound", startupId: "pendelwerk", move: "negotiate", lever: "boardroom" })).toBeNull();
  });
});

describe("term sheet negotiation", () => {
  it("a higher price, or the lead insists on a higher preference", () => {
    const terms = { pref: 1, seat: true, rivals: 1, asked: [] };
    const won = negotiateTerms({ preMoney: 10_000_000, lead: "Atlas" }, terms, "price", fixed(0));
    expect(won.ok).toBe(true);
    expect(won.preMoney).toBe(11_000_000);
    const lost = negotiateTerms({ preMoney: 10_000_000, lead: "Atlas" }, terms, "price", fixed(0.99));
    expect(lost.ok).toBe(false);
    expect(lost.terms.pref).toBe(1.5);
    const seat = negotiateTerms({ preMoney: 10_000_000, lead: "Atlas" }, terms, "seat", fixed(0));
    expect(seat.terms.seat).toBe(false);
    expect(seat.preMoney).toBeLessThan(10_000_000);
  });

  it("a 1,5× preference goes into the cap table; leading is possible up to Serie A", () => {
    const { state, s } = onPath(0, 6_000_000);
    const round = growthRound(s, 1, { pref: 1.5, seat: false, rivals: 0, asked: [] });
    const after = applyRound(s, round, 0);
    const lead = after.capTable.find((h) => h.id === "growth-x")!;
    expect(lead.pref).toBeCloseTo(round.amount * 1.5, 0);
    state.cash = 10_000_000;
    state.rounds.push(round);
    s.flags.push("round_open");
    const next = act(state, { type: "ventureRound", startupId: s.id, move: "negotiate", lever: "pref" });
    expect(next.rounds.find((r) => r.id === "r-t")!.terms!.asked).toContain("pref");
    const led = act(next, { type: "round", roundId: "r-t", take: "lead", vote: "go" });
    expect(led.rounds.find((r) => r.id === "r-t")!.status).toBe("closed");
  });

  it("the lead of a Serie B takes the investor seat in the board", () => {
    const { state, s } = onPath(1, 22_000_000);
    state.rounds.push(growthRound(s, 2));
    s.flags.push("round_open");
    const next = act(state, { type: "round", roundId: "r-t", take: "none", vote: "go" });
    const vc = next.startups.find((x) => x.id === s.id)!.board.find((b) => b.seat === "vc")!;
    expect(vc.title).toBe("Atlas Growth");
    expect(next.startups.find((x) => x.id === s.id)!.venture!.stage).toBe(2);
  });
});

describe("content", () => {
  it("has lessons and unlock steps for the new terms", () => {
    for (const id of ["meilensteine", "term_sheet", "spaete_runden", "bridge", "crossover", "lockup"]) expect(lessonOf(id).title.length).toBeGreaterThan(3);
    expect(UNLOCKS.map((u) => u.id)).toEqual(expect.arrayContaining(["rounds", "lateRounds", "ipoPrep"]));
  });
});
