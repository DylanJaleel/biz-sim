import { describe, expect, it } from "vitest";
import { getUnlockedStage } from "../lib/stage";

describe("getUnlockedStage", () => {
  it("stays at stage 1 below the stage-2 threshold", () => {
    expect(getUnlockedStage(0)).toBe(1);
    expect(getUnlockedStage(2_999)).toBe(1);
  });

  it("unlocks stage 2 at the cash threshold", () => {
    expect(getUnlockedStage(3_000)).toBe(2);
    expect(getUnlockedStage(7_999)).toBe(2);
  });

  it("unlocks stage 3 at the cash threshold", () => {
    expect(getUnlockedStage(8_000)).toBe(3);
    expect(getUnlockedStage(50_000)).toBe(3);
  });
});
