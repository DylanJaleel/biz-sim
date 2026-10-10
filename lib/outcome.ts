import {
  GAME_LENGTH_WEEKS,
  INSOLVENCY_NEGATIVE_CASH_WEEKS,
  STARTING_CASH,
  TARGET_CUMULATIVE_PROFIT,
} from "./config";
import { checkFinalGoal } from "./milestones";
import { checkGameOver } from "./insolvency";

/**
 * ACTIVE: running. INSOLVENT: cash was negative too long. WON: goal reached
 * after the last week. FAILED: the last week is over but the goal was missed.
 */
export type GameStatus = "ACTIVE" | "INSOLVENT" | "WON" | "FAILED";

/**
 * Profit so far, approximated from cash: until wages/rent/purchases exist
 * (phase 4) cash only moves through resolved rounds, so this is exact.
 */
export function approximateCumulativeProfit(cash: number): number {
  return cash - STARTING_CASH;
}

/** Length of the current run of negative weekly closing balances, newest first input. */
export function countConsecutiveNegativeCash(
  cashAfter: number,
  previousCashAfterNewestFirst: number[],
): number {
  if (cashAfter >= 0) return 0;
  let streak = 1;
  for (const previous of previousCashAfterNewestFirst) {
    if (previous >= 0) break;
    streak += 1;
  }
  return streak;
}

export interface RoundOutcomeInput {
  weekNumber: number;
  cashAfter: number;
  loanRemainingAfter: number;
  previousCashAfterNewestFirst: number[];
}

export function evaluateRoundOutcome(input: RoundOutcomeInput): GameStatus {
  const consecutiveNegativeCashWeeks = countConsecutiveNegativeCash(
    input.cashAfter,
    input.previousCashAfterNewestFirst.slice(0, INSOLVENCY_NEGATIVE_CASH_WEEKS - 1),
  );

  if (checkGameOver({ consecutiveNegativeCashWeeks, consecutiveMissedMilestones: 0 })) {
    return "INSOLVENT";
  }

  if (input.weekNumber >= GAME_LENGTH_WEEKS) {
    const goalReached = checkFinalGoal(
      input.loanRemainingAfter,
      approximateCumulativeProfit(input.cashAfter),
      TARGET_CUMULATIVE_PROFIT,
    );
    return goalReached ? "WON" : "FAILED";
  }

  return "ACTIVE";
}
