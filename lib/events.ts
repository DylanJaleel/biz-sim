import {
  EMPLOYEE_SICK_PRODUCTIVITY_PENALTY,
  MATERIAL_PRICE_SPIKE_MULTIPLIER,
  RANDOM_EVENT_PROBABILITY_PER_WEEK,
} from "./config";
import type { RandomSource } from "./rng";

export type GameEventType = "material_price_spike" | "employee_sick";

export interface GameEventEffect {
  type: GameEventType;
  materialCostMultiplier?: number;
  productivityMultiplier?: number;
  description: string;
}

/**
 * At most one of the two MVP event types per week (section 4.1): a material
 * price spike or a sick employee. Returns null on a quiet week.
 */
export function maybeGenerateRandomEvent(random: RandomSource = Math.random): GameEventEffect | null {
  if (random() >= RANDOM_EVENT_PROBABILITY_PER_WEEK) {
    return null;
  }

  if (random() < 0.5) {
    return {
      type: "material_price_spike",
      materialCostMultiplier: MATERIAL_PRICE_SPIKE_MULTIPLIER,
      description: `Materialpreise sind diese Woche um ${Math.round(
        (MATERIAL_PRICE_SPIKE_MULTIPLIER - 1) * 100,
      )}% gestiegen.`,
    };
  }

  return {
    type: "employee_sick",
    productivityMultiplier: EMPLOYEE_SICK_PRODUCTIVITY_PENALTY,
    description: "Ein Mitarbeiter ist diese Woche krank und arbeitet mit reduzierter Kapazität.",
  };
}
