import { STAGE_2_CASH_THRESHOLD, STAGE_3_CASH_THRESHOLD } from "./config";

export type CompanyStage = 1 | 2 | 3;

/**
 * Operative complexity unlocks with available cash (section 3.2): solo at
 * stage 1, a hired journeyman at stage 2, a rented warehouse at stage 3.
 */
export function getUnlockedStage(availableCash: number): CompanyStage {
  if (availableCash >= STAGE_3_CASH_THRESHOLD) return 3;
  if (availableCash >= STAGE_2_CASH_THRESHOLD) return 2;
  return 1;
}
