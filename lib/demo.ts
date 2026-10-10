import {
  GAME_LENGTH_WEEKS,
  MILESTONE_INTERVAL_WEEKS,
  STARTING_CASH,
  TARGET_CUMULATIVE_PROFIT,
} from "./config";
import { maybeGenerateRandomEvent, type GameEventEffect } from "./events";
import { calculateWeeklyLoanCharge, createLoan, type LoanState } from "./loan";
import { checkMilestone, type MilestoneCheckResult } from "./milestones";
import { generateOrderPool, type GeneratedOrder } from "./orders";
import { createSeededRandom } from "./rng";
import { resolveRound, type RoundSummary } from "./round";
import { getUnlockedStage, type CompanyStage } from "./stage";

export interface DemoGameState {
  weekNumber: number;
  gameLengthWeeks: number;
  cash: number;
  cumulativeProfit: number;
  stage: CompanyStage;
  loan: LoanState;
  lastWeekSummary: RoundSummary;
  lastWeekEvent: GameEventEffect | null;
  currentOrderPool: GeneratedOrder[];
  milestone: MilestoneCheckResult;
  milestoneWeekDue: number;
}

/**
 * Builds a sample mid-game state purely from the lib/ game-logic functions,
 * with a fixed seed so server rendering is deterministic. Stands in for
 * persisted Prisma state until auth + DB wiring lands (see
 * docs/implementation-plan.md, phase 2).
 */
export function createDemoGameState(): DemoGameState {
  const weekNumber = 6;

  let loan = createLoan();
  for (let week = 1; week < weekNumber; week++) {
    loan = { ...loan, remainingBalance: calculateWeeklyLoanCharge(loan).remainingBalanceAfter };
  }

  const lastWeekEvent = maybeGenerateRandomEvent(createSeededRandom(1234));
  const lastWeekSummary = resolveRound({
    weekNumber,
    acceptedOrders: [
      { payout: 1_200, materialNeed: 420 },
      { payout: 650, materialNeed: 210 },
    ],
    employeeWageTotal: 0,
    warehouseRent: 0,
    loan,
    event: lastWeekEvent,
  });

  const cumulativeProfit = 1_180;
  const cash = STARTING_CASH + cumulativeProfit;
  const stage = getUnlockedStage(cash);
  const milestoneWeekDue = MILESTONE_INTERVAL_WEEKS;
  const milestoneTarget = Math.round((TARGET_CUMULATIVE_PROFIT * milestoneWeekDue) / GAME_LENGTH_WEEKS);
  const milestone = checkMilestone(cumulativeProfit, milestoneTarget);

  const currentOrderPool = generateOrderPool(weekNumber + 1, createSeededRandom(5_678));

  return {
    weekNumber,
    gameLengthWeeks: GAME_LENGTH_WEEKS,
    cash,
    cumulativeProfit,
    stage,
    loan: lastWeekSummary.loanAfter,
    lastWeekSummary,
    lastWeekEvent,
    currentOrderPool,
    milestone,
    milestoneWeekDue,
  };
}
