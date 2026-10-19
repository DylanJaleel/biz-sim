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
/** Monthly board fee per mandate, by company value: small startups pay an expense allowance. */
export const BOARD_FEES = [
  { upTo: 1_000_000, fee: 500 },
  { upTo: 3_000_000, fee: 1_000 },
  { upTo: 10_000_000, fee: 1_750 },
  { upTo: Infinity, fee: 2_500 },
] as const;
/** Private living costs per month. */
export const LIVING_COSTS = 1_800;
/** The bank lets the account go this far below zero, at a monthly interest. */
export const OVERDRAFT_LIMIT = 25_000;
export const OVERDRAFT_RATE = 0.009;
/** A forced sale of a stake brings this share of its value. */
export const FIRE_SALE = 0.7;
/** Day rate for consulting: base plus reputation. */
export const DAY_RATE_BASE = 500;
export const DAY_RATE_PER_REPUTATION = 10;
export const TRADE_FEE = 0.001;

// Phase 3: exits, syndicate, offices, corporate board
/** Share of a syndicate's gain the lead keeps. */
export const CARRY = 0.2;
export const SYNDICATE_REPUTATION = 45;
export const SYNDICATE_WARMTH = 40;
export const EXIT_CHANCE = 0.025;
export const EXIT_MIN_VALUE = 2_000_000;
export const EXIT_MIN_AGE = 8;
/** Negotiating: the buyer pays this much more, or walks away. */
export const NEGOTIATE_GAIN = 0.15;
export const NEGOTIATE_CHANCE = 0.55;
export const CORPORATE_REPUTATION = 65;
export const CORPORATE_FEE = 4_000;
export const NEWS_FROM_MONTH = 3;
/** Syndicate partners cool off a little each time they are asked for money. */
export const SYNDICATE_WARMTH_COST = 15;

export const ACTION_DAYS = {
  dd: 3,
  invest: 1,
  question: 1,
  cfo: 1,
  pretalk: 1,
  meeting: 1,
  founderCall: 1,
  learn: 1,
  round: 2,
  buyShares: 1,
  askShares: 2,
  meetContact: 1,
  introContact: 1,
  exit: 2,
  negotiate: 1,
  joinCorporate: 1,
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

// Phase 2: rounds, shares, network
/** A round starts when the money lasts less than this many months. */
export const ROUND_RUNWAY = 6;
/** Months of burn a round raises. */
export const ROUND_MONTHS = 14;
export const ROUND_MIN = 100_000;
/** No new round within this many months of the last one. */
export const ROUND_COOLDOWN = 6;
/** After investors said no, the founders try again after this many months. */
export const FAILED_SEARCH_COOLDOWN = 3;
/** Reputation needed to lead a round; the lead takes half of it. */
export const LEAD_REPUTATION = 40;
export const LEAD_SHARE = 0.5;
export const LEAD_REPUTATION_GAIN = 3;
export const MAJORITY_REPUTATION_GAIN = 5;
/** Discount when an early holder wants out; premium founders ask. */
export const SECONDARY_DISCOUNT = 0.85;
export const FOUNDER_PREMIUM = 1.25;
export const SECONDARY_CHANCE = 0.1;
/** Shares granted per quarter for strong board work. */
export const ADVISOR_SHARES = 0.5;
export const RING_REPUTATION = { 1: 0, 2: 35, 3: 55 } as const;
export const WARMTH_MEET_FIRST = 30;
export const WARMTH_MEET = 15;
export const WARMTH_INTRO_MIN = 40;
export const WARMTH_INTRO_COST = 20;
export const WARMTH_DECAY = 3;
export const INTRO_COOLDOWN = 3;

export function monthLabel(month: number): string {
  const index = (START_MONTH_INDEX + month - 1) % 12;
  const year = Math.floor((START_MONTH_INDEX + month - 1) / 12) + 1;
  return `${MONTH_NAMES[index]} · Jahr ${year}`;
}

export function monthName(month: number): string {
  return MONTH_NAMES[(START_MONTH_INDEX + month - 1) % 12];
}
