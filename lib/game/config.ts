// Balancing constants of the Boardroom game. Change them together with the
// balance tests in tests/game-balance.test.ts.

export const DAYS_PER_MONTH = 20;
export const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;
/** The game starts in October of year 1. */
export const START_MONTH_INDEX = 9;

export const START_CASH = 150_000;
export const START_REPUTATION = 20;
/** Monthly board fee per mandate. */
export const BOARD_FEE = 750;

export const ACTION_DAYS = {
  dd: 3,
  invest: 1,
  question: 1,
  cfo: 1,
  pretalk: 1,
  meeting: 1,
  founderCall: 1,
  learn: 1,
} as const;

// Company model
export const OPEX_PER_HIRE = 5_500;
export const GROWTH_PULL = 0.15;
export const REVENUE_NOISE = 0.012;
export const DEBT_ANNUAL_RATE = 0.09;
/** Share of the remaining loan repaid each month. */
export const DEBT_REPAYMENT_RATE = 0.04;
/** A customer with a larger share of revenue may leave, with this chance per month. */
export const CUSTOMER_LOSS_THRESHOLD = 0.4;
export const CUSTOMER_LOSS_CHANCE = 0.035;
export const PHASE_THRESHOLDS = { launch: 25_000, scale: 80_000 } as const;

// Valuation: ARR × multiple, the multiple grows with the growth rate.
export const MULTIPLE_BASE = 1.5;
export const MULTIPLE_PER_GROWTH = 80;
export const MULTIPLE_MIN = 1;
export const MULTIPLE_MAX = 10;

// Emergency financing when the cash runs out (used in projections and as fallback).
export const DOWN_ROUND_MONTHS = 9;
export const DOWN_ROUND_DISCOUNT = 0.6;
export const DEAD_VALUATION = 250_000;

// Meetings
export const SHARES_PER_MEMBER = 20;
export const ARGUMENT_PULL = 0.45;
export const PRETALK_BOOST = 1.6;
export const PRETALK_SHIFT = 0.15;
export const PROPOSER_STANCE = 0.45;
export const PROPOSER_RECEPTIVENESS = 0.5;
export const OVERRULED_TRUST = { no: -9, conditions: -4 } as const;
export const LAPSED_TRUST = -6;
export const LAPSED_REPUTATION = -2;
export const JUDGMENT_REPUTATION = { strong: 4, fair: 1, weak: -3 } as const;
export const RESULT_REPUTATION = { good: 2, bad: -2 } as const;
export const FOUNDER_CALL = { trust: 6, morale: 2 } as const;
export const PROJECTION_MONTHS = 12;
/** Gap to the best outcome (share of its value) that still counts as strong or fair judgment. */
export const STRONG_GAP = 0.02;
export const FAIR_GAP = 0.1;

export function monthLabel(month: number): string {
  const index = (START_MONTH_INDEX + month - 1) % 12;
  const year = Math.floor((START_MONTH_INDEX + month - 1) / 12) + 1;
  return `${MONTH_NAMES[index]} · Jahr ${year}`;
}

export function monthName(month: number): string {
  return MONTH_NAMES[(START_MONTH_INDEX + month - 1) % 12];
}
