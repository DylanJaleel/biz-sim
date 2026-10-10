import { describe, expect, it } from "vitest";
import { checkGameOver } from "../lib/insolvency";

describe("checkGameOver", () => {
  it("is not triggered when everything is within bounds", () => {
    expect(checkGameOver({ consecutiveNegativeCashWeeks: 1, consecutiveMissedMilestones: 0 })).toBe(false);
  });

  it("triggers after two consecutive weeks of negative cash", () => {
    expect(checkGameOver({ consecutiveNegativeCashWeeks: 2, consecutiveMissedMilestones: 0 })).toBe(true);
  });

  it("triggers after two consecutive missed milestones", () => {
    expect(checkGameOver({ consecutiveNegativeCashWeeks: 0, consecutiveMissedMilestones: 2 })).toBe(true);
  });
});
