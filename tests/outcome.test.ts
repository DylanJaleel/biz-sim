import { describe, expect, it } from "vitest";
import { GAME_LENGTH_WEEKS, STARTING_CASH, TARGET_CUMULATIVE_PROFIT } from "../lib/config";
import { countConsecutiveNegativeCash, evaluateRoundOutcome } from "../lib/outcome";
import { advanceStage } from "../lib/stage";
import { buildWeekWarnings } from "../lib/warnings";
import { isOrderOpen, remainingWeeks } from "../lib/orders";
import { createLoan } from "../lib/loan";
import { resolveRound } from "../lib/round";

describe("countConsecutiveNegativeCash", () => {
  it("is zero for a non-negative balance", () => {
    expect(countConsecutiveNegativeCash(0, [-5, -5])).toBe(0);
  });

  it("counts the current week plus the preceding negative run", () => {
    expect(countConsecutiveNegativeCash(-1, [])).toBe(1);
    expect(countConsecutiveNegativeCash(-1, [-2, -3, 10, -4])).toBe(3);
  });
});

describe("evaluateRoundOutcome", () => {
  const base = { weekNumber: 10, loanRemainingAfter: 5_000, previousCashAfterNewestFirst: [] };

  it("keeps the game running while cash is fine", () => {
    expect(evaluateRoundOutcome({ ...base, cashAfter: 3_000 })).toBe("ACTIVE");
  });

  it("tolerates a single negative week", () => {
    expect(evaluateRoundOutcome({ ...base, cashAfter: -100, previousCashAfterNewestFirst: [200] })).toBe("ACTIVE");
  });

  it("ends in insolvency after two negative weeks in a row", () => {
    expect(evaluateRoundOutcome({ ...base, cashAfter: -100, previousCashAfterNewestFirst: [-50] })).toBe("INSOLVENT");
  });

  it("is won after the last week when loan is repaid and profit target met", () => {
    expect(
      evaluateRoundOutcome({
        weekNumber: GAME_LENGTH_WEEKS,
        cashAfter: STARTING_CASH + TARGET_CUMULATIVE_PROFIT,
        loanRemainingAfter: 0,
        previousCashAfterNewestFirst: [],
      }),
    ).toBe("WON");
  });

  it("fails after the last week when the profit target is missed", () => {
    expect(
      evaluateRoundOutcome({
        weekNumber: GAME_LENGTH_WEEKS,
        cashAfter: STARTING_CASH + TARGET_CUMULATIVE_PROFIT - 1,
        loanRemainingAfter: 0,
        previousCashAfterNewestFirst: [],
      }),
    ).toBe("FAILED");
  });
});

describe("advanceStage", () => {
  it("never moves a stage backwards when cash drops", () => {
    expect(advanceStage(2, 0)).toBe(2);
    expect(advanceStage(1, 1_000_000)).toBe(3);
  });
});

describe("order windows", () => {
  const order = { weekOffered: 3, deadlineWeeks: 2 };

  it("is open from the week offered until deadline weeks have passed", () => {
    expect(isOrderOpen(order, 2)).toBe(false);
    expect(isOrderOpen(order, 3)).toBe(true);
    expect(isOrderOpen(order, 4)).toBe(true);
    expect(isOrderOpen(order, 5)).toBe(false);
  });

  it("counts the current week as one remaining week", () => {
    expect(remainingWeeks(order, 3)).toBe(2);
    expect(remainingWeeks(order, 4)).toBe(1);
  });
});

describe("buildWeekWarnings", () => {
  const summary = (accepted: { payout: number; materialNeed: number }[], cashBefore: number) =>
    resolveRound({
      weekNumber: 1,
      cashBefore,
      acceptedOrders: accepted,
      employeeWageTotal: 0,
      warehouseRent: 0,
      loan: createLoan(),
      event: null,
    });

  it("warns critically about negative cash and mildly about zero revenue", () => {
    const warnings = buildWeekWarnings(summary([], 100), "ACTIVE");
    expect(warnings.map((w) => w.level)).toEqual(["critical", "warning"]);
  });

  it("has nothing to say about a healthy week", () => {
    expect(buildWeekWarnings(summary([{ payout: 2_000, materialNeed: 500 }], 5_000), "ACTIVE")).toEqual([]);
  });

  it("does not repeat the negative-cash warning once the game is over", () => {
    const warnings = buildWeekWarnings(summary([{ payout: 100, materialNeed: 50 }], -1_000), "INSOLVENT");
    expect(warnings).toEqual([]);
  });
});
