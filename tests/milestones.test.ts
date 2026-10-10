import { describe, expect, it } from "vitest";
import { checkFinalGoal, checkMilestone } from "../lib/milestones";

describe("checkMilestone", () => {
  it("is achieved when cumulative profit reaches the target", () => {
    expect(checkMilestone(10_000, 10_000).achieved).toBe(true);
    expect(checkMilestone(12_000, 10_000).achieved).toBe(true);
  });

  it("is not achieved below the target", () => {
    expect(checkMilestone(9_999, 10_000).achieved).toBe(false);
  });
});

describe("checkFinalGoal", () => {
  it("requires both the loan repaid and the profit target met", () => {
    expect(checkFinalGoal(0, 10_000, 10_000)).toBe(true);
    expect(checkFinalGoal(1, 10_000, 10_000)).toBe(false);
    expect(checkFinalGoal(0, 9_999, 10_000)).toBe(false);
  });
});
