import { INSOLVENCY_MISSED_MILESTONES_IN_A_ROW, INSOLVENCY_NEGATIVE_CASH_WEEKS } from "./config";

export interface GameOverCheckInput {
  consecutiveNegativeCashWeeks: number;
  consecutiveMissedMilestones: number;
}

/** Either trigger in section 4.3 ends the game: sustained negative cash, or repeated missed milestones. */
export function checkGameOver(input: GameOverCheckInput): boolean {
  return (
    input.consecutiveNegativeCashWeeks >= INSOLVENCY_NEGATIVE_CASH_WEEKS ||
    input.consecutiveMissedMilestones >= INSOLVENCY_MISSED_MILESTONES_IN_A_ROW
  );
}
