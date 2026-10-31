// Balancing constants of the Boardroom game. Change them together with the
// balance tests in tests/game-balance.test.ts.

export const DAYS_PER_MONTH = 20;
export const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"] as const;
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
export const SYNDICATE_REPUTATION = 50;
export const SYNDICATE_WARMTH = 40;
export const EXIT_CHANCE = 0.025;
export const EXIT_MIN_VALUE = 2_000_000;
export const EXIT_MIN_AGE = 8;
/** Negotiating: the buyer pays this much more, or walks away. */
export const NEGOTIATE_GAIN = 0.15;
export const NEGOTIATE_CHANCE = 0.55;
export const CORPORATE_REPUTATION = 70;
export const CORPORATE_FEE = 4_000;
export const NEWS_FROM_MONTH = 3;
// Phase 4: family office, team, buyouts, fund, IPO
export const FAMILY_OFFICE_REPUTATION = 75;
export const FAMILY_OFFICE_WORTH = 2_000_000;
export const FAMILY_OFFICE_COST = 40_000;
// Team (Operating Partner): profiles, contracts and effects live in team.ts.
export const BUYOUT_REPUTATION = 60;
/** Family businesses offer themselves for sale only to buyers with this net worth. */
export const BUYOUT_WORTH = 1_000_000;
/** Share of a buyout price the bank lends, and on what terms. */
export const BUYOUT_LOAN_SHARE = 0.4;
export const BUYOUT_LOAN_RATE = 0.055;
export const BUYOUT_LOAN_MONTHS = 96;
/** Majority-owned profitable companies distribute most of what they do not need. */
export const DIVIDEND_RESERVE_MONTHS = 3;
export const DIVIDEND_SHARE = 0.7;
export const FUND_REPUTATION = 85;
/** Investors want a track record: this many sales, and a family office that has run for a while. */
export const FUND_EXITS = 2;
export const FUND_OFFICE_MONTHS = 12;
export const FUND_BASE = 3_000_000;
export const FUND_PER_EXIT = 1_000_000;
export const FUND_MAX = 15_000_000;
export const FUND_FEE = 0.02;
/** The fund puts in this multiple of the player's own ticket. */
export const FUND_MATCH = 2;
/** No single company gets more than this share of the fund. */
export const FUND_MAX_DEAL = 0.25;
export const IPO_MIN_VALUE = 12_000_000;
export const IPO_CHANCE = 0.05;
export const IPO_LOCKUP = 12;
/** Share of the player's IPO proceeds paid at once; the rest waits for the lockup. */
export const IPO_CASH_SHARE = 0.5;
/** Generated deals: from this month on, and at most this many open offers. */
export const DEALS_FROM_MONTH = 4;
export const DEALS_MAX_OPEN = 3;

// Agenda: several items per board meeting
/** At most this many open items per company. */
export const AGENDA_MAX = 3;
/** Chance of a third item in a quarterly meeting. */
export const AGENDA_THIRD = 0.2;

// Rhythm: each company goes through calm, normal and busy phases.
/** How long a phase lasts, in months [min, max]. */
export const PACE_MONTHS = { calm: [2, 4], normal: [2, 4], busy: [1, 2] } as const;
/** Next phase when one ends, as chances [calm, normal, busy]. */
export const PACE_NEXT = { calm: [0.35, 0.55, 0.1], normal: [0.45, 0.45, 0.1], busy: [0.5, 0.5, 0] } as const;
/** Chance of a single item in a calm quarter, and between quarters in a normal phase. */
export const PACE_CALM_QUARTER = 0.5;
export const PACE_NORMAL_BETWEEN = 0.4;
/** Chance of a third item in a busy phase. */
export const PACE_BUSY_THIRD = 0.4;

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
  foundFamilyOffice: 2,
  hire: 1,
  buyout: 3,
  raiseFund: 3,
  followUp: 1,
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
/**
 * Markets are not endless: above this monthly revenue every doubling costs
 * growth potential, so even a star company slows down as it gets big.
 */
export const SCALE_REVENUE = 150_000;
export const SCALE_DRAG = 0.01;
/** Per doubling above SCALE_REVENUE, growth returns this much faster to its potential. */
export const SCALE_PULL = 1;

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
/** Gap to the best option, as share of the decision's spread (best minus worst), that still counts as strong or fair judgment. */
export const STRONG_GAP = 0.12;
export const FAIR_GAP = 0.35;
/** Spread of a decision relative to the best value: below `min` the choice moves no reputation, from `full` on all of it. */
export const JUDGMENT_STAKES = { min: 0.01, full: 0.2 } as const;
/** A choice this close to the best option (share of its value, or euros) is a close call: neutral note, little reputation or trust at stake. */
export const CLOSE_GAP = { relative: 0.03, absolute: 2_000 } as const;
/** Share of the trust lost for overruling the management that still counts in a close call. */
export const CLOSE_TRUST_SHARE = 0.25;

// Conditions ("Auflagen"): the player picks which one; one of three fits.
/** Conditions start this many months later than a plain yes. */
export const CONDITION_DELAY = 1;
/** The follow-up meeting has to happen within this many months after the decision. */
export const FOLLOW_UP_MONTHS = 2;
/** Without follow-up, this share of the benefit of a condition is lost, and the management takes it less seriously. */
export const FOLLOW_UP_MISSED = { share: 0.5, trust: -2 } as const;
/** The management wanted a plain yes and the player asked for conditions: the team loses some drive. */
export const CONDITIONS_TEMPO = { morale: -3 } as const;

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
/** No more than this in total per company: a board seat is not a second salary in shares. */
export const ADVISOR_SHARES_MAX = 2;
export const RING_REPUTATION = { 1: 0, 2: 35, 3: 55 } as const;
export const WARMTH_MEET_FIRST = 30;
export const WARMTH_MEET = 15;
export const WARMTH_INTRO_MIN = 40;
export const WARMTH_INTRO_COST = 20;
export const WARMTH_DECAY = 3;
export const INTRO_COOLDOWN = 3;
/** The same contact helping the same company again: each time this share of the effect before. */
export const INTRO_REPEAT = 0.5;

export function monthLabel(month: number): string {
  const index = (START_MONTH_INDEX + month - 1) % 12;
  const year = Math.floor((START_MONTH_INDEX + month - 1) / 12) + 1;
  return `${MONTH_NAMES[index]} · Jahr ${year}`;
}

export function monthName(month: number): string {
  return MONTH_NAMES[(START_MONTH_INDEX + month - 1) % 12];
}

/** Former soft cap of reputation (gains were halved above it); the gain curve below replaces it. */
export const REPUTATION_SOFT_CAP = 80;
/**
 * Reputation grows slower the higher it already is: from `from` on, only `factor`
 * of a gain counts (the rest is carried over, so small gains are not lost).
 * `cap` is the most reputation that can be won in one month at that level.
 * Losses always count in full. 100 is a late goal, not a quick one.
 */
export const REPUTATION_GAIN_STEPS = [
  { from: 0, factor: 0.7, cap: 5 },
  { from: 50, factor: 0.5, cap: 3 },
  { from: 60, factor: 0.4, cap: 3 },
  { from: 75, factor: 0.3, cap: 2 },
  { from: 85, factor: 0.2, cap: 2 },
] as const;
/** At the very top fame fades: above this, a month without any gain costs one point. */
export const REPUTATION_FADE_FROM = 90;
