import { describe, expect, it } from "vitest";
import { OVERDRAFT_LIMIT } from "../lib/config";
import { countConsecutiveNegativeCash, evaluateWeekOutcome } from "../lib/outcome";

describe("countConsecutiveNegativeCash", () => {
  it("is 0 for a non-negative closing balance", () => {
    expect(countConsecutiveNegativeCash(0, [-100, -200])).toBe(0);
  });

  it("counts the current and the directly preceding negative weeks only", () => {
    expect(countConsecutiveNegativeCash(-1, [-5, 20, -9])).toBe(2);
    expect(countConsecutiveNegativeCash(-1, [])).toBe(1);
  });
});

describe("evaluateWeekOutcome", () => {
  it("keeps going with positive cash", () => {
    expect(evaluateWeekOutcome({ cashAfter: 5_000, previousCashAfterNewestFirst: [] })).toBe("ACTIVE");
  });

  it("tolerates up to two negative weeks within the overdraft limit", () => {
    expect(evaluateWeekOutcome({ cashAfter: -500, previousCashAfterNewestFirst: [] })).toBe("ACTIVE");
    expect(evaluateWeekOutcome({ cashAfter: -500, previousCashAfterNewestFirst: [-300] })).toBe("ACTIVE");
  });

  it("is insolvent after the third negative week in a row", () => {
    expect(evaluateWeekOutcome({ cashAfter: -500, previousCashAfterNewestFirst: [-300, -100] })).toBe("INSOLVENT");
  });

  it("a positive week in between resets the streak", () => {
    expect(evaluateWeekOutcome({ cashAfter: -500, previousCashAfterNewestFirst: [-300, 50, -100] })).toBe("ACTIVE");
  });

  it("is insolvent as soon as the overdraft limit is exceeded", () => {
    expect(evaluateWeekOutcome({ cashAfter: -OVERDRAFT_LIMIT - 1, previousCashAfterNewestFirst: [] })).toBe("INSOLVENT");
    expect(evaluateWeekOutcome({ cashAfter: -OVERDRAFT_LIMIT, previousCashAfterNewestFirst: [] })).toBe("ACTIVE");
  });
});
