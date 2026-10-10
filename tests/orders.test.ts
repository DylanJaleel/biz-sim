import { describe, expect, it } from "vitest";
import {
  ORDER_DEADLINE_WEEKS_MAX,
  ORDER_DEADLINE_WEEKS_MIN,
  ORDER_PAYOUT_MAX,
  ORDER_PAYOUT_MIN,
  ORDER_POOL_MAX,
  ORDER_POOL_MIN,
} from "../lib/config";
import { generateOrderPool } from "../lib/orders";
import { createSeededRandom } from "../lib/rng";

describe("generateOrderPool", () => {
  it("generates a pool within the configured size range", () => {
    for (let seed = 0; seed < 50; seed++) {
      const pool = generateOrderPool(1, createSeededRandom(seed));
      expect(pool.length).toBeGreaterThanOrEqual(ORDER_POOL_MIN);
      expect(pool.length).toBeLessThanOrEqual(ORDER_POOL_MAX);
    }
  });

  it("keeps every generated order within its configured ranges", () => {
    const pool = generateOrderPool(5, createSeededRandom(42));

    for (const order of pool) {
      expect(order.weekOffered).toBe(5);
      expect(order.payout).toBeGreaterThanOrEqual(ORDER_PAYOUT_MIN);
      expect(order.payout).toBeLessThanOrEqual(ORDER_PAYOUT_MAX);
      expect(order.deadlineWeeks).toBeGreaterThanOrEqual(ORDER_DEADLINE_WEEKS_MIN);
      expect(order.deadlineWeeks).toBeLessThanOrEqual(ORDER_DEADLINE_WEEKS_MAX);
      expect(order.materialNeed).toBeGreaterThan(0);
      expect(order.materialNeed).toBeLessThan(order.payout);
    }
  });

  it("is deterministic for a given seed", () => {
    const poolA = generateOrderPool(3, createSeededRandom(7));
    const poolB = generateOrderPool(3, createSeededRandom(7));
    expect(poolA).toEqual(poolB);
  });
});
