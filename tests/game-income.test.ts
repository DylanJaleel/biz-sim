import { describe, expect, it } from "vitest";
import { LIVING_COSTS, OVERDRAFT_LIMIT } from "../lib/game/config";
import { applyAction, newGame, startupOf } from "../lib/game/engine";
import { boardFee, dayRate } from "../lib/game/gigs";
import { holdingsValue, stepMarket } from "../lib/game/market";
import type { GameAction, GameState } from "../lib/game/types";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

describe("consulting", () => {
  it("costs days now and pays at month end", () => {
    let state = newGame(4);
    const gig = state.gigs[0]!;
    state = act(state, { type: "gig", gigId: gig.id });
    expect(state.daysUsed).toBe(gig.days);
    const cash = state.cash;
    const result = applyAction(state, { type: "closeMonth" });
    expect(result.state.cash).toBe(cash + gig.fee - LIVING_COSTS);
    if (result.result.kind === "report") expect(result.result.report.income!.consulting).toBe(gig.fee);
    expect(result.state.gigs.some((g) => g.month === 2 && g.status === "offered")).toBe(true);
  });

  it("the day rate grows with reputation, the board fee with the company", () => {
    expect(dayRate(80)).toBeGreaterThan(dayRate(20));
    const s = startupOf(newGame(1), "pendelwerk");
    expect(boardFee(s.metrics)).toBe(1_000);
    expect(boardFee({ ...s.metrics, revenue: s.metrics.revenue * 20 })).toBeGreaterThan(1_000);
  });
});

describe("stock market", () => {
  it("buying and selling moves money between account and depot", () => {
    let state = newGame(4);
    state = act(state, { type: "trade", assetId: "anleihen", amount: 20_000 });
    expect(state.cash).toBe(150_000 - 20_000 - 20);
    expect(holdingsValue(state.market)).toBeCloseTo(20_000, 6);
    expect(state.daysUsed).toBe(0);
    state = act(state, { type: "trade", assetId: "anleihen", amount: -5_000 });
    expect(holdingsValue(state.market)).toBeCloseTo(15_000, 6);
    expect(state.lessons).toEqual(expect.arrayContaining(["dividendenrendite", "liquiditaet"]));
    expect(() => act(state, { type: "trade", assetId: "tech", amount: -100 })).toThrow(/nichts/);
  });

  it("prices move with the market climate, interest is paid", () => {
    let market = newGame(9).market;
    market.holdings.tagesgeld = 12_000;
    const step = stepMarket(market, 1, () => 0.3);
    expect(step.payout).toBeCloseTo(20, 6);
    market = step.market;
    expect(market.history).toHaveLength(2);
  });
});

describe("overdraft", () => {
  it("a deep minus first sells the depot, then the smallest stake at a discount", () => {
    let state = newGame(4);
    state = act(state, { type: "invest", startupId: "pendelwerk" });
    state = { ...state, cash: -OVERDRAFT_LIMIT - 40_000 };
    state = act(state, { type: "closeMonth" });
    expect(startupOf(state, "pendelwerk").status).toBe("sold");
    expect(state.cash).toBeGreaterThan(-OVERDRAFT_LIMIT);
    expect(state.lessons).toContain("liquiditaet");
  });
});
