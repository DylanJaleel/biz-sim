import { describe, expect, it } from "vitest";
import { ACTION_DAYS, FOLLOW_UP_MONTHS } from "../lib/game/config";
import { TEMPLATES, templateOf } from "../lib/game/content";
import { corporateStartup } from "../lib/game/corporate";
import { COVENANTS, COVENANT_IDS, covenantOutlook, covenantSetup, optionValues, RISK_QUESTION } from "../lib/game/covenants";
import { applyAction, covenantsOf, GameRuleError, newGame, openItems, randomFor, startupOf } from "../lib/game/engine";
import { judge, judgmentWeight } from "../lib/game/judge";
import { LESSONS } from "../lib/game/lessons";
import { offerStartup, STARTUPS } from "../lib/game/startups";
import { fill } from "../lib/game/templates";
import type { BoardItem, GameAction, GameState, Startup } from "../lib/game/types";
import { parseAction } from "../lib/game/validate";
import { companyView, deskView, meetingView } from "../lib/game/views";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

function activeStartup(id = "pendelwerk"): Startup {
  const def = STARTUPS.find((d) => d.id === id)!;
  return { ...offerStartup(def, 1), status: "active", stake: def.stake, joined: 1 };
}

function gameWithItem(seed = 7): GameState {
  let state = newGame(seed);
  state = act(state, { type: "dd", startupId: "pendelwerk" });
  state = act(state, { type: "invest", startupId: "pendelwerk" });
  return act(state, { type: "closeMonth" });
}

/** A game where the board followed the player's fitting condition. */
function decidedWithFit(): { state: GameState; item: BoardItem } {
  for (let seed = 1; seed < 60; seed++) {
    const state = gameWithItem(seed);
    const item = openItems(state)[0];
    if (!item) continue;
    const t = templateOf(item.templateId);
    const argument = t.arguments.find((a) => a.toward === "conditions")!;
    const fit = covenantsOf(state, item).fit;
    const after = act(state, { type: "meeting", itemId: item.id, argument: argument.id, vote: "conditions", covenant: fit });
    const decided = after.items.find((i) => i.id === item.id)!;
    if (decided.decision?.outcome === "conditions") return { state: after, item: decided };
  }
  throw new Error("no game where the board followed the conditions");
}

describe("conditions on offer", () => {
  it("offers three different conditions, exactly one of them fitting, the same way every time", () => {
    const s = activeStartup();
    for (const t of TEMPLATES.filter((x) => !x.corporate)) {
      const a = covenantSetup(t, s, randomFor(3, `covenant|${t.id}`));
      const b = covenantSetup(t, s, randomFor(3, `covenant|${t.id}`));
      expect(a).toEqual(b);
      expect(new Set(a.options).size).toBe(3);
      expect(a.options).toContain(a.fit);
      expect(Object.keys(a.miss).sort()).toEqual(a.options.filter((o) => o !== a.fit).sort());
    }
  });

  it("the fitting condition beats the board's standard, the others fall below a clear decision", () => {
    let total = 0;
    let fitAboveStandard = 0;
    let fitBest = 0;
    let missBelow = 0;
    let misses = 0;
    const companies = [...STARTUPS.map((d) => activeStartup(d.id)), corporateStartup(1)];
    for (const s of companies) {
      for (const t of TEMPLATES.filter((x) => !!x.corporate === !!s.corporate)) {
        const setup = covenantSetup(t, s, randomFor(11, `covenant|${s.id}|${t.id}`));
        const planned = covenantOutlook(t, s, setup);
        const values = optionValues(planned);
        const hi = Math.max(planned.go.value, planned.no.value);
        total++;
        if (values[setup.fit]! > planned.standard.value || values[setup.fit] === Math.max(...Object.values(values))) fitAboveStandard++;
        if (Math.max(...Object.values(values)) === values[setup.fit]) fitBest++;
        for (const id of setup.options.filter((o) => o !== setup.fit)) {
          misses++;
          if (values[id]! <= hi) missBelow++;
        }
      }
    }
    expect(fitAboveStandard / total).toBeGreaterThan(0.9);
    expect(fitBest / total).toBeGreaterThan(0.5);
    expect(fitBest / total).toBeLessThan(0.95);
    expect(missBelow / misses).toBeGreaterThan(0.85);
  }, 60_000);

  it("every condition text is complete for every company", () => {
    const companies = [...STARTUPS.map((d) => activeStartup(d.id)), corporateStartup(1)];
    for (const s of companies) {
      for (const id of COVENANT_IDS) {
        const def = COVENANTS[id];
        for (const text of [def.name, def.short, def.diagnosis(s), def.fitWhy, def.missWhy, def.saved]) {
          expect(fill(text, s), `${id}: ${text}`).not.toMatch(/\{(?!amount)\w+\}/);
        }
        expect(LESSONS.some((l) => l.id === def.lesson)).toBe(true);
      }
    }
  });
});

describe("judging by the spread of a decision", () => {
  it("counts the gap relative to the spread, not to the best value", () => {
    expect(judge({ go: 100, no: 95, budget: 101 }, "budget")).toBe("strong");
    // Five percent below the best used to be fair; here it is the whole spread.
    expect(judge({ go: 100, no: 95, budget: 101 }, "no")).toBe("weak");
    expect(judge({ go: 100, no: 0, budget: 120 }, "go", 0)).toBe("fair");
    expect(judge({ go: 100, no: 0, budget: 103 }, "go", 0)).toBe("strong");
    // A condition below the floor of the plain options is worse than the whole spread.
    expect(judge({ go: 100, no: 80, pilot: 70, budget: 110 }, "pilot", 80)).toBe("weak");
  });

  it("decisions where the options barely differ move the reputation little", () => {
    expect(judgmentWeight({ go: 100_000, no: 99_800 })).toBe(0);
    expect(judgmentWeight({ go: 100_000, no: 60_000 })).toBe(1);
    const mid = judgmentWeight({ go: 100_000, no: 90_000 });
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe("voting with a condition", () => {
  it("records the chosen condition and judges it against all options", () => {
    const { item } = decidedWithFit();
    const d = item.decision!;
    expect(d.vote).toBe("conditions");
    expect(d.covenant).toBe(d.fit);
    expect(d.applied).toBe(d.fit);
    expect(Object.keys(d.covenantValues ?? {})).toHaveLength(4);
    expect(["go", "no", ...COVENANT_IDS]).toContain(d.bestOption);
  });

  it("rejects conditions that are not on offer or come without the vote for conditions", () => {
    const state = gameWithItem();
    const item = openItems(state)[0]!;
    const options = covenantsOf(state, item).options;
    const other = COVENANT_IDS.find((id) => !options.includes(id))!;
    expect(() => applyAction(state, { type: "meeting", itemId: item.id, argument: null, vote: "conditions", covenant: other })).toThrow(GameRuleError);
    expect(() => applyAction(state, { type: "meeting", itemId: item.id, argument: null, vote: "go", covenant: options[0]! })).toThrow(GameRuleError);
  });

  it("the risk question tells which risk the fitting condition guards against", () => {
    let state = gameWithItem();
    const item = openItems(state)[0]!;
    expect(companyView(state, "pendelwerk").agenda[0]!.covenants.risk.a).toBeUndefined();
    state = act(state, { type: "question", itemId: item.id, questionId: RISK_QUESTION.id });
    const prep = companyView(state, "pendelwerk").agenda[0]!.covenants;
    expect(prep.risk.a).toBeTruthy();
    expect(prep.options.map((o) => o.id)).toEqual(covenantsOf(state, item).options);
    expect(prep.plans).toBeNull();
    state = act(state, { type: "cfo", itemId: item.id });
    expect(companyView(state, "pendelwerk").agenda[0]!.covenants.plans).toHaveLength(3);
  });

  it("parses conditions and follow-ups from the browser", () => {
    expect(parseAction({ type: "meeting", itemId: "v1", argument: null, vote: "conditions", covenant: "pilot" })).toEqual({
      type: "meeting",
      itemId: "v1",
      argument: null,
      vote: "conditions",
      covenant: "pilot",
    });
    expect(parseAction({ type: "meeting", itemId: "v1", argument: null, vote: "conditions", covenant: "bribe" })).toBeNull();
    expect(parseAction({ type: "followUp", itemId: "v1" })).toEqual({ type: "followUp", itemId: "v1" });
  });
});

describe("follow-up meetings", () => {
  it("a chosen condition needs one follow-up from next month on, at the cost of a day", () => {
    const { state, item } = decidedWithFit();
    expect(item.followUp).toEqual({ until: state.month + FOLLOW_UP_MONTHS, done: false });
    expect(() => applyAction(state, { type: "followUp", itemId: item.id })).toThrow(GameRuleError);
    let next = act(state, { type: "closeMonth" });
    expect(deskView(next, 30).tasks.some((t) => t.text.includes("Folgetermin"))).toBe(true);
    expect(companyView(next, "pendelwerk").followUps.map((f) => f.itemId)).toContain(item.id);
    const days = next.daysUsed;
    next = act(next, { type: "followUp", itemId: item.id });
    expect(next.daysUsed).toBe(days + ACTION_DAYS.followUp);
    expect(next.items.find((i) => i.id === item.id)!.followUp!.done).toBe(true);
    expect(() => applyAction(next, { type: "followUp", itemId: item.id })).toThrow(GameRuleError);
  });

  it("without a follow-up the condition only works in part and costs trust", () => {
    const { state, item } = decidedWithFit();
    const review = state.effects.find((e) => e.itemId === item.id && e.review);
    // The follow-up is possible in the two months after the decision; the third close finds it missing.
    let next = act(act(state, { type: "closeMonth" }), { type: "closeMonth" });
    const trust = startupOf(next, "pendelwerk").metrics.trust;
    next = act(next, { type: "closeMonth" });
    const after = next.items.find((i) => i.id === item.id)!;
    if (startupOf(next, "pendelwerk").status !== "active") return;
    expect(after.followUp!.missed).toBe(true);
    const report = next.reports[0]!;
    expect(report.notes.some((n) => n.includes("nachgeprüft"))).toBe(true);
    if (review) expect(report.lines.flatMap((l) => l.events).some((e) => e.includes("verpufft"))).toBe(true);
    expect(startupOf(next, "pendelwerk").metrics.trust).toBeLessThanOrEqual(trust + 5);
  });

  it("the board's own standard condition needs no follow-up", () => {
    for (let seed = 1; seed < 60; seed++) {
      const state = gameWithItem(seed);
      const item = openItems(state)[0];
      if (!item) continue;
      const after = act(state, { type: "meeting", itemId: item.id, argument: null, vote: "go" });
      const decided = after.items.find((i) => i.id === item.id)!;
      if (decided.decision?.outcome !== "conditions") continue;
      expect(decided.decision.applied).toBe("standard");
      expect(decided.followUp).toBeUndefined();
      return;
    }
  });
});

describe("older games", () => {
  it("an open item without stored conditions gets them derived, and a vote with one works", () => {
    const state = gameWithItem();
    const item = openItems(state)[0]!;
    const stored = item.covenants!;
    const old: GameState = JSON.parse(JSON.stringify(state));
    delete old.items.find((i) => i.id === item.id)!.covenants;
    const derived = covenantsOf(old, old.items.find((i) => i.id === item.id)!);
    expect(derived).toEqual(stored);
    const after = act(old, { type: "meeting", itemId: item.id, argument: null, vote: "conditions", covenant: derived.options[0]! });
    expect(after.items.find((i) => i.id === item.id)!.status).toBe("decided");
    expect(meetingView(old, item.id).covenants).toHaveLength(3);
  });

  it("decisions stored before conditions existed still show", () => {
    const { state, item } = decidedWithFit();
    const old: GameState = JSON.parse(JSON.stringify(state));
    const d = old.items.find((i) => i.id === item.id)!;
    delete d.decision!.covenantValues;
    delete d.decision!.fit;
    delete d.decision!.bestOption;
    delete d.decision!.covenant;
    delete d.decision!.applied;
    delete d.followUp;
    const view = meetingView(old, item.id);
    expect(view.covenantReview).toBeUndefined();
    expect(view.decision?.values.go).toBeTypeOf("number");
    expect(() => act(old, { type: "closeMonth" })).not.toThrow();
  });

  it("a voting without a condition (older clients) counts as the board's standard condition", () => {
    const state = gameWithItem();
    const item = openItems(state)[0]!;
    const after = act(state, { type: "meeting", itemId: item.id, argument: null, vote: "conditions" });
    const d = after.items.find((i) => i.id === item.id)!.decision!;
    expect(d.covenant).toBeUndefined();
    expect(d.values.conditions).toBe(d.covenantValues!.standard);
  });
});

describe("family office associates", () => {
  it("decide with conditions too and do the follow-up themselves", () => {
    let chose = 0;
    for (let seed = 1; seed < 25; seed++) {
      const state = gameWithItem(seed);
      const item = openItems(state)[0];
      if (!item) continue;
      state.team.push({ id: "t1", role: "associate", name: "Jana Test", salary: 5_000, hired: state.month, mandate: "pendelwerk" });
      const next = act(state, { type: "closeMonth" });
      const d = next.items.find((i) => i.id === item.id)!;
      expect(d.decision?.delegated).toBe(true);
      if (d.decision?.covenant) {
        chose++;
        expect(covenantsOf(state, item).options).toContain(d.decision.covenant);
        if (d.decision.applied === d.decision.covenant) expect(d.followUp?.done).toBe(true);
      }
    }
    expect(chose).toBeGreaterThan(0);
  });
});
