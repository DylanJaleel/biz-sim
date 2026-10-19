import { describe, expect, it } from "vitest";
import { forecast, outcomeViews } from "../lib/game/cfo";
import { ACTION_DAYS, DAYS_PER_MONTH, LIVING_COSTS, START_CASH } from "../lib/game/config";
import { TEMPLATES, templateOf } from "../lib/game/content";
import { applyAction, closeMonth, GameRuleError, newGame, openItems, previewMeeting, startupOf } from "../lib/game/engine";
import { judge } from "../lib/game/judge";
import { CURRICULUM, LESSONS } from "../lib/game/lessons";
import { baseStances, stancesAfterArgument } from "../lib/game/meeting";
import { project, valuation } from "../lib/game/sim";
import { offerStartup, STARTUPS } from "../lib/game/startups";
import { fill } from "../lib/game/templates";
import type { GameAction, GameState, Startup } from "../lib/game/types";
import { outcomeFromShares } from "../lib/game/votes";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

function activeStartup(id = "pendelwerk"): Startup {
  const def = STARTUPS.find((d) => d.id === id)!;
  return { ...offerStartup(def, 1), status: "active", stake: def.stake, joined: 1 };
}

/** A game where the player invested in Pendelwerk and the first board item is on the table. */
function gameWithItem(): GameState {
  let state = newGame(7);
  state = act(state, { type: "dd", startupId: "pendelwerk" });
  state = act(state, { type: "invest", startupId: "pendelwerk" });
  state = act(state, { type: "closeMonth" });
  return state;
}

describe("new game", () => {
  it("starts with private capital, two deals in the inbox and an empty calendar", () => {
    const state = newGame(1);
    expect(state.cash).toBe(START_CASH);
    expect(state.month).toBe(1);
    expect(state.startups.filter((s) => s.status === "offered").map((s) => s.id)).toEqual(["pendelwerk", "kantinenkasse"]);
    expect(state.mails.filter((m) => m.kind === "deal")).toHaveLength(2);
    expect(state.daysUsed).toBe(0);
  });
});

describe("actions and the calendar", () => {
  it("due diligence costs three days and invest buys the stake for the ticket", () => {
    let state = newGame(1);
    const ticket = startupOf(state, "pendelwerk").offer!.ticket;
    state = act(state, { type: "dd", startupId: "pendelwerk" });
    expect(state.daysUsed).toBe(ACTION_DAYS.dd);
    state = act(state, { type: "invest", startupId: "pendelwerk" });
    const s = startupOf(state, "pendelwerk");
    expect(s.status).toBe("active");
    expect(s.stake).toBe(12);
    expect(state.cash).toBe(START_CASH - ticket);
    expect(state.calendar.map((c) => c.kind)).toEqual(["dd", "invest"]);
    expect(() => act(state, { type: "invest", startupId: "pendelwerk" })).toThrow(GameRuleError);
  });

  it("refuses actions when the month's days are used up", () => {
    let state = newGame(1);
    state = { ...state, daysUsed: DAYS_PER_MONTH - 1 };
    expect(() => act(state, { type: "dd", startupId: "pendelwerk" })).toThrow(/fehlen dir Tage/);
  });

  it("does not let the player invest more than they have", () => {
    const state = { ...newGame(1), cash: 1_000 };
    expect(() => act(state, { type: "invest", startupId: "pendelwerk" })).toThrow(/Privatkapital/);
  });
});

describe("month close", () => {
  it("moves to the next month, pays the board fee and puts a first item on the agenda", () => {
    let state = newGame(3);
    state = act(state, { type: "invest", startupId: "kantinenkasse" });
    const cash = state.cash;
    const result = applyAction(state, { type: "closeMonth" });
    state = result.state;
    expect(state.month).toBe(2);
    expect(state.daysUsed).toBe(0);
    // Small startups pay a 500 € allowance; living costs go out.
    expect(state.cash).toBe(cash + 500 - LIVING_COSTS);
    expect(openItems(state)).toHaveLength(1);
    expect(state.mails[0]!.subject).toMatch(/Vorlage für den Beirat/);
    expect(result.result.kind).toBe("report");
  });

  it("postpones an item once, then lets the founder decide alone, at a cost of trust and reputation", () => {
    const state = gameWithItem();
    const item = openItems(state)[0]!;
    const trust = startupOf(state, item.startupId).metrics.trust;
    const reputation = state.reputation;
    closeMonth(state);
    const postponed = state.items.find((i) => i.id === item.id)!;
    expect(postponed.status).toBe("open");
    expect(postponed.postponed).toBe(true);
    closeMonth(state);
    const lapsed = state.items.find((i) => i.id === item.id)!;
    expect(lapsed.status).toBe("lapsed");
    expect(lapsed.decision?.lapsed).toBe(true);
    expect(state.reputation).toBeLessThan(reputation);
    expect(startupOf(state, item.startupId).metrics.trust).toBeLessThan(trust + 1);
  });

  it("expires offers the player never answered", () => {
    let state = newGame(5);
    state = act(state, { type: "closeMonth" });
    state = act(state, { type: "closeMonth" });
    expect(state.startups.find((s) => s.id === "pendelwerk")!.status).toBe("offered");
    state = act(state, { type: "closeMonth" });
    expect(state.startups.find((s) => s.id === "pendelwerk")!.status).toBe("declined");
  });
});

describe("board meetings", () => {
  it("records the decision with judgment, unlocks the lesson and plays back deterministically", () => {
    let state = gameWithItem();
    const item = openItems(state)[0]!;
    const t = templateOf(item.templateId);
    state = act(state, { type: "cfo", itemId: item.id });
    state = act(state, { type: "question", itemId: item.id, questionId: t.questions[0]!.id });
    state = act(state, { type: "pretalk", itemId: item.id, seat: "vc" });

    const preview = previewMeeting(state, item.id);
    const { state: after, result } = applyAction(state, { type: "meeting", itemId: item.id, argument: t.arguments[1]!.id, vote: "conditions" });
    expect(result.kind).toBe("meeting");
    if (result.kind !== "meeting") return;
    expect(result.playback.events.slice(0, preview.pauseForArgument)).toEqual(preview.events);
    expect(result.playback.events.some((e) => e.kind === "statement" && e.speaker === "you")).toBe(true);
    expect(result.playback.events.filter((e) => e.kind === "vote")).toHaveLength(6);

    const decided = after.items.find((i) => i.id === item.id)!;
    expect(decided.status).toBe("decided");
    expect(decided.decision?.vote).toBe("conditions");
    expect(["strong", "fair", "weak"]).toContain(decided.decision?.judgment);
    expect(after.lessons).toContain(t.lesson);
    expect(() => act(after, { type: "meeting", itemId: item.id, argument: null, vote: "go" })).toThrow(/bereits entschieden/);
  });

  it("an argument moves members with matching interests, a talk beforehand moves them further", () => {
    const s = activeStartup();
    const t = templateOf("expansion");
    const before = baseStances(t, s, () => 0.5);
    const argument = t.arguments.find((a) => a.id === "pilot")!;
    const item = { id: "x", startupId: s.id, templateId: t.id, month: 1, status: "open" as const, asked: [], pretalks: [], cfo: false };
    const plain = stancesAfterArgument(before, s, item, argument, 20);
    const talked = stancesAfterArgument(before, s, { ...item, pretalks: ["vc"] }, argument, 20);
    const target = 0.1;
    expect(Math.abs(plain.vc - target)).toBeLessThan(Math.abs(before.vc - target));
    expect(Math.abs(talked.vc - target)).toBeLessThan(Math.abs(plain.vc - target));
  });

  it("decides by conviction shares: yes alone, yes plus conditions, or rejection", () => {
    expect(outcomeFromShares({ go: 70, conditions: 30, no: 20, abstain: 0 })).toBe("go");
    expect(outcomeFromShares({ go: 40, conditions: 30, no: 50, abstain: 0 })).toBe("conditions");
    expect(outcomeFromShares({ go: 20, conditions: 20, no: 80, abstain: 0 })).toBe("no");
  });

  it("judges against the best planned value, not against luck", () => {
    expect(judge({ go: 100, conditions: 120, no: 90 }, "conditions")).toBe("strong");
    expect(judge({ go: 112, conditions: 120, no: 90 }, "go")).toBe("fair");
    expect(judge({ go: 100, conditions: 120, no: 90 }, "no")).toBe("weak");
  });
});

describe("content", () => {
  it("every template resolves for every startup and fills all placeholders", () => {
    for (const def of STARTUPS) {
      const s = activeStartup(def.id);
      for (const t of TEMPLATES) {
        expect(t.arguments).toHaveLength(3);
        expect(t.questions.length).toBeGreaterThan(0);
        expect(LESSONS.some((l) => l.id === t.lesson)).toBe(true);
        const texts = [t.title, t.motion, t.pitch, t.context(s), ...t.questions.map((q) => q.q + q.a(s)), ...t.arguments.map((a) => a.text)];
        for (const v of ["go", "conditions", "no"] as const) {
          const o = t.outcomes[v];
          const r = o.resolve(s);
          texts.push(o.label, o.summary, ...r.effects.map((e) => e.text));
          if (r.risk) texts.push(r.risk.goodText, r.risk.badText);
        }
        for (const text of texts) expect(fill(text, s), `${t.id}: ${text}`).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it("the curriculum covers every lesson exactly once", () => {
    expect([...CURRICULUM].sort()).toEqual(LESSONS.map((l) => l.id).sort());
  });
});

describe("CFO forecast", () => {
  it("equity keeps the money longer and dilutes; a loan keeps the stake", () => {
    const s = activeStartup();
    const base = forecast(s, { hires: 0, price: 0, financing: "none", scenario: "base" });
    const equity = forecast(s, { hires: 0, price: 0, financing: "equity", scenario: "base" });
    const debt = forecast(s, { hires: 0, price: 0, financing: "debt", scenario: "base" });
    expect(base.runwayPlan).not.toBeNull();
    expect(equity.runwayPlan ?? 99).toBeGreaterThan(base.runwayPlan!);
    expect(equity.stakeAfter).toBeLessThan(s.stake);
    expect(debt.stakeAfter).toBe(s.stake);
    expect(equity.lines.join(" ")).toMatch(/Verwässer|Anteil sinkt/);
  });

  it("shows runway and value for each outcome of a board item", () => {
    const views = outcomeViews(templateOf("expansion"), activeStartup());
    expect(views.map((v) => v.vote)).toEqual(["go", "conditions", "no"]);
    const go = views[0]!;
    const no = views[2]!;
    expect(go.runwayAfter).toBeLessThan(no.runwayAfter);
    expect(go.outlook.chance).toBeGreaterThan(0);
  });
});

describe("company simulation", () => {
  it("a burning company eventually needs money; valuation follows revenue and growth", () => {
    const s = activeStartup();
    const p = project(s, 12);
    expect(p.months.some((m) => m.cash < 0) || p.stake < s.stake).toBe(true);
    const faster = { ...s, metrics: { ...s.metrics, growth: 0.1 } };
    expect(valuation(faster.metrics)).toBeGreaterThan(valuation(s.metrics));
  });
});
