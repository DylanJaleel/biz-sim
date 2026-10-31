import { describe, expect, it } from "vitest";
import { TEMPLATES, templateOf } from "../lib/game/content";
import { corporateStartup } from "../lib/game/corporate";
import { COVENANTS, covenantOutlook, covenantSetup, optionValues, RISK_QUESTION, templateTopic, THEMES, themeOf } from "../lib/game/covenants";
import { familyOfferGrowth, familyTrend } from "../lib/game/dealgen";
import { applyAction, covenantsOf, newGame, openItems, randomFor } from "../lib/game/engine";
import { bestOf, isClose, outlook, positionBasis } from "../lib/game/judge";
import { offerStartup, STARTUPS } from "../lib/game/startups";
import { burn } from "../lib/game/templates";
import type { GameAction, GameState, Startup } from "../lib/game/types";
import { meetingView } from "../lib/game/views";

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

const withMetrics = (s: Startup, m: Partial<Startup["metrics"]>, axes: Partial<Startup["metrics"]["axes"]> = {}): Startup => ({
  ...s,
  metrics: { ...s.metrics, ...m, axes: { ...s.metrics.axes, ...axes } },
});

describe("conditions by topic area", () => {
  it("every template belongs to a topic area and is offered exactly its three conditions", () => {
    const s = activeStartup();
    for (const t of TEMPLATES) {
      expect(templateTopic(t.id), t.id).toBeDefined();
      const setup = covenantSetup(t, s, randomFor(5, `covenant|${t.id}`));
      expect([...setup.options].sort()).toEqual([...THEMES[themeOf(t.id)].covenants].sort());
    }
  });

  it("every topic area guards against three different kinds of risk", () => {
    for (const theme of Object.values(THEMES)) expect(new Set(theme.covenants.map((id) => COVENANTS[id].risk)).size).toBe(3);
  });

  it("the fitting condition follows the risk of the situation", () => {
    const base = activeStartup();
    // A bank loan with weak books and running loans: the lender wants a covenant.
    const weakBooks = withMetrics(base, { debt: 100_000 }, { finance: 25 });
    expect(covenantSetup(templateOf("bank_loan"), weakBooks, randomFor(1, "a")).fit).toBe("geldgeberkennzahl");
    // A payout with almost no cash left but clean books: keep a minimum cash reserve.
    const thin = withMetrics(base, { cash: burn(base) * 1.5 }, { finance: 85 });
    expect(covenantSetup(templateOf("dividend"), thin, randomFor(1, "b")).fit).toBe("mindestkasse");
    // A price rise in a weak market: test it on some customers first.
    const weakMarket = withMetrics(base, {}, { market: 20 });
    expect(covenantSetup(templateOf("price"), weakMarket, randomFor(1, "c")).fit).toBe("testkunden");
  });

  it("conditions stored by older games keep working", () => {
    const state = gameWithItem();
    const item = openItems(state)[0]!;
    item.covenants = { options: ["budget", "pilot", "kpi"], fit: "pilot", edge: 0.1, miss: { budget: 0.2, kpi: 0.2 } };
    expect(meetingView(state, item.id).covenants.map((c) => c.name)).toEqual(["Budgetdeckel", "Pilot zuerst", "Kennzahl-Auflage"]);
    const after = act(state, { type: "meeting", itemId: item.id, argument: null, vote: "conditions", covenant: "pilot" });
    const d = after.items.find((i) => i.id === item.id)!.decision!;
    expect(d.covenant).toBe("pilot");
    expect(Object.keys(d.covenantValues ?? {}).sort()).toEqual(["budget", "kpi", "pilot", "standard"]);
  });
});

describe("recommendation in the meeting", () => {
  it("shows nothing without preparation, the fitting condition after the risk question, the best option after the CFO", () => {
    let state = gameWithItem();
    const item = openItems(state)[0]!;
    expect(meetingView(state, item.id).recommendation).toBeUndefined();
    state = act(state, { type: "question", itemId: item.id, questionId: RISK_QUESTION.id });
    const risk = meetingView(state, item.id).recommendation!;
    expect(risk.source).toBe("risk");
    expect(risk.option).toBe(covenantsOf(state, item).fit);
    expect(risk.value).toBeUndefined();
    state = act(state, { type: "cfo", itemId: item.id });
    const cfo = meetingView(state, item.id).recommendation!;
    const s = state.startups.find((x) => x.id === item.startupId)!;
    const values = optionValues(covenantOutlook(templateOf(item.templateId), s, covenantsOf(state, item)));
    expect(cfo.source).toBe("cfo");
    expect(cfo.option).toBe(bestOf(values));
    expect(cfo.value).toBeCloseTo(values[cfo.option]!, 0);
  });
});

describe("close calls", () => {
  it("counts a choice close to the best as a close call, not a mistake", () => {
    // The example from play: all options within 4 % of each other.
    const values = { go: 36_390_000, no: 35_400_000, budget: 36_820_000, pilot: 35_910_000, kpi: 36_330_000 };
    expect(isClose(values, "go")).toBe(true);
    expect(isClose(values, "pilot")).toBe(true);
    expect(isClose(values, "budget")).toBe(false);
    expect(isClose({ go: 100_000, no: 60_000 }, "no")).toBe(false);
    expect(isClose({ go: 10_000, no: 8_500 }, "no")).toBe(true);
  });

  it("a close call moves neither reputation nor much trust", () => {
    for (let seed = 1; seed < 6; seed++) {
      let state = gameWithItem(seed);
      for (let month = 0; month < 24; month++) {
        for (const item of openItems(state)) {
          const s = state.startups.find((x) => x.id === item.startupId)!;
          const values = optionValues(covenantOutlook(templateOf(item.templateId), s, covenantsOf(state, item)));
          const meet = (choice: string): GameAction =>
            choice === "go" || choice === "no"
              ? { type: "meeting", itemId: item.id, argument: null, vote: choice }
              : { type: "meeting", itemId: item.id, argument: null, vote: "conditions", covenant: choice as keyof typeof COVENANTS };
          for (const choice of Object.keys(values).filter((k) => isClose(values, k))) {
            const d = act(state, meet(choice)).items.find((i) => i.id === item.id)!.decision!;
            if (!d.close) continue;
            expect(d.judgment).toBe("fair");
            expect(d.reputationDelta).toBe(0);
            expect(d.trustDelta).toBeGreaterThanOrEqual(-2);
            return;
          }
          try {
            state = act(state, meet(bestOf(values)));
          } catch {
            // no day left: the item waits
          }
        }
        state = act(state, { type: "closeMonth" });
      }
    }
    throw new Error("no close call found");
  });
});

describe("expected value of the position", () => {
  it("is not 0 € for every option when the money runs out within the year", () => {
    const base = activeStartup();
    const short = withMetrics(base, { cash: burn(base) * 2 });
    for (const t of TEMPLATES.filter((x) => !x.corporate).slice(0, 12)) {
      const o = outlook(t, short);
      expect(Math.max(o.go.value, o.conditions.value, o.no.value), t.id).toBeGreaterThan(0);
    }
  });

  it("shows the company value where the player holds no shares", () => {
    expect(positionBasis(corporateStartup(1)).scale).toBe(100);
    expect(positionBasis(corporateStartup(1)).label).toContain("Firmenwert");
    expect(positionBasis(activeStartup()).scale).toBe(1);
  });
});

describe("succession offers", () => {
  it("most family businesses grow slowly, some stand still, few shrink, each with a reason", () => {
    const tones = { good: 0, warn: 0, bad: 0 };
    for (let i = 0; i < 200; i++) {
      const trend = familyTrend(familyOfferGrowth(i / 200));
      tones[trend.tone]++;
      expect(trend.annual).toBeGreaterThan(-0.041);
      expect(trend.annual).toBeLessThan(0.051);
      expect(trend.reason.length).toBeGreaterThan(10);
    }
    expect(tones.good / 200).toBeGreaterThan(0.6);
    expect(tones.bad / 200).toBeLessThan(0.15);
    expect(tones.warn).toBeGreaterThan(0);
  });
});
