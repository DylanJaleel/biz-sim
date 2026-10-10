import { INSOLVENCY_NEGATIVE_CASH_WEEKS, OVERDRAFT_LIMIT } from "./config";

/** There is no way to "win": a business either keeps going or ends in insolvency. */
export type GameStatus = "ACTIVE" | "INSOLVENT";

/** Length of the current run of negative weekly closing balances (previous weeks newest first). */
export function countConsecutiveNegativeCash(cashAfter: number, previousCashAfterNewestFirst: number[]): number {
  if (cashAfter >= 0) return 0;
  let streak = 1;
  for (const previous of previousCashAfterNewestFirst) {
    if (previous >= 0) break;
    streak += 1;
  }
  return streak;
}

/**
 * The bank tolerates an overdraft up to a limit and for a few weeks; beyond
 * that the business is insolvent.
 */
export function evaluateWeekOutcome(input: {
  cashAfter: number;
  previousCashAfterNewestFirst: number[];
}): GameStatus {
  if (input.cashAfter < -OVERDRAFT_LIMIT) return "INSOLVENT";

  const streak = countConsecutiveNegativeCash(
    input.cashAfter,
    input.previousCashAfterNewestFirst.slice(0, INSOLVENCY_NEGATIVE_CASH_WEEKS - 1),
  );
  return streak >= INSOLVENCY_NEGATIVE_CASH_WEEKS ? "INSOLVENT" : "ACTIVE";
}
