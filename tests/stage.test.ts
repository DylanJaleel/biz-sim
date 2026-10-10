import { describe, expect, it } from "vitest";
import {
  STAGE_2_CASH_THRESHOLD,
  STAGE_3_CASH_THRESHOLD,
  STARTING_CASH,
} from "../lib/config";
import { getUnlockedStage } from "../lib/stage";

describe("getUnlockedStage", () => {
  it("starts every game at stage 1", () => {
    expect(getUnlockedStage(STARTING_CASH)).toBe(1);
  });

  it("stays at stage 1 below the stage-2 threshold", () => {
    expect(getUnlockedStage(0)).toBe(1);
    expect(getUnlockedStage(STAGE_2_CASH_THRESHOLD - 1)).toBe(1);
  });

  it("unlocks stage 2 at the cash threshold", () => {
    expect(getUnlockedStage(STAGE_2_CASH_THRESHOLD)).toBe(2);
    expect(getUnlockedStage(STAGE_3_CASH_THRESHOLD - 1)).toBe(2);
  });

  it("unlocks stage 3 at the cash threshold", () => {
    expect(getUnlockedStage(STAGE_3_CASH_THRESHOLD)).toBe(3);
    expect(getUnlockedStage(50_000)).toBe(3);
  });
});
