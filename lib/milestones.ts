/** The next milestone check due at or after `weekNumber` (section 4.3: every `interval` weeks). */
export function nextMilestoneWeek(weekNumber: number, interval: number): number {
  return Math.ceil(weekNumber / interval) * interval || interval;
}

export interface MilestoneCheckResult {
  achieved: boolean;
  cumulativeProfit: number;
  targetCumulativeProfit: number;
}

export function checkMilestone(
  cumulativeProfit: number,
  targetCumulativeProfit: number,
): MilestoneCheckResult {
  return {
    achieved: cumulativeProfit >= targetCumulativeProfit,
    cumulativeProfit,
    targetCumulativeProfit,
  };
}

/** Win condition after the final week (section 4.3): loan repaid and profit target met. */
export function checkFinalGoal(
  remainingLoanBalance: number,
  cumulativeProfit: number,
  targetCumulativeProfit: number,
): boolean {
  return remainingLoanBalance <= 0 && cumulativeProfit >= targetCumulativeProfit;
}
