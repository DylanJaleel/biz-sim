import {
  ORDER_DEADLINE_WEEKS_MAX,
  ORDER_DEADLINE_WEEKS_MIN,
  ORDER_MATERIAL_COST_RATIO_MAX,
  ORDER_MATERIAL_COST_RATIO_MIN,
  ORDER_PAYOUT_MAX,
  ORDER_PAYOUT_MIN,
  ORDER_POOL_MAX,
  ORDER_POOL_MIN,
} from "./config";
import type { RandomSource } from "./rng";

export type OrderType = "repair" | "custom" | "installation";

const ORDER_TYPES: OrderType[] = ["repair", "custom", "installation"];

export interface GeneratedOrder {
  weekOffered: number;
  type: OrderType;
  materialNeed: number;
  deadlineWeeks: number;
  payout: number;
}

function randomInRange(random: RandomSource, min: number, max: number): number {
  return min + random() * (max - min);
}

function randomIntInRange(random: RandomSource, min: number, max: number): number {
  return Math.floor(randomInRange(random, min, max + 1));
}

export function generateOrderPool(
  weekNumber: number,
  random: RandomSource = Math.random,
): GeneratedOrder[] {
  const poolSize = randomIntInRange(random, ORDER_POOL_MIN, ORDER_POOL_MAX);

  return Array.from({ length: poolSize }, (): GeneratedOrder => {
    const payout = Math.round(randomInRange(random, ORDER_PAYOUT_MIN, ORDER_PAYOUT_MAX));
    const materialCostRatio = randomInRange(
      random,
      ORDER_MATERIAL_COST_RATIO_MIN,
      ORDER_MATERIAL_COST_RATIO_MAX,
    );

    return {
      weekOffered: weekNumber,
      type: ORDER_TYPES[randomIntInRange(random, 0, ORDER_TYPES.length - 1)],
      materialNeed: Math.round(payout * materialCostRatio),
      deadlineWeeks: randomIntInRange(random, ORDER_DEADLINE_WEEKS_MIN, ORDER_DEADLINE_WEEKS_MAX),
      payout,
    };
  });
}

type OrderWindow = Pick<GeneratedOrder, "weekOffered" | "deadlineWeeks">;

/** An order offered in week w with deadline d can be accepted during weeks w .. w+d-1. */
export function lastOpenWeek(order: OrderWindow): number {
  return order.weekOffered + order.deadlineWeeks - 1;
}

export function isOrderOpen(order: OrderWindow, weekNumber: number): boolean {
  return order.weekOffered <= weekNumber && weekNumber <= lastOpenWeek(order);
}

/** Weeks left to accept the order, counting the current one (1 = last chance). */
export function remainingWeeks(order: OrderWindow, weekNumber: number): number {
  return lastOpenWeek(order) - weekNumber + 1;
}
