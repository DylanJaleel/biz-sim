/**
 * Balancing constants for the MVP scenario.
 * Values from docs/business-sim-game-design.md section 4.3 — placeholders with a
 * plausible order of magnitude, not final balance. Adjust here after playtesting,
 * never hardcode these numbers elsewhere.
 */

/**
 * Temporary stand-in for a logged-in user (Phase 2 of the implementation
 * plan replaces this with real Auth.js sessions). `scripts/seed.ts` creates
 * this account and its company; the repository layer reads it back.
 */
export const DEMO_USER_EMAIL = "demo@biz-sim.local";

export const GAME_LENGTH_WEEKS = 52;
export const MILESTONE_INTERVAL_WEEKS = 13;

export const STARTING_CASH = 5_000;

export const LOAN_PRINCIPAL = 15_000;
export const LOAN_ANNUAL_INTEREST_RATE = 0.06;
export const LOAN_TERM_WEEKS = 52;

export const TARGET_CUMULATIVE_PROFIT = 10_000;

// Stage unlock thresholds (available cash)
export const STAGE_2_CASH_THRESHOLD = 3_000;
export const STAGE_3_CASH_THRESHOLD = 8_000;

// Stage 2: Geselle (journeyman employee)
export const EMPLOYEE_WEEKLY_WAGE = 450;
export const EMPLOYEE_CAPACITY_FACTOR = 2;

// Stage 3: Warehouse
export const WAREHOUSE_WEEKLY_RENT = 150;
export const WAREHOUSE_CAPACITY_KG = 5_000;
export const WAREHOUSE_BULK_DISCOUNT_RATE = 0.1;

// Order pool generation (section 3.1 / 4.3 — "sinnvolle Zufallsbereiche")
export const ORDER_POOL_MIN = 3;
export const ORDER_POOL_MAX = 6;
export const ORDER_PAYOUT_MIN = 300;
export const ORDER_PAYOUT_MAX = 2_500;
export const ORDER_MATERIAL_COST_RATIO_MIN = 0.3;
export const ORDER_MATERIAL_COST_RATIO_MAX = 0.6;
export const ORDER_DEADLINE_WEEKS_MIN = 1;
export const ORDER_DEADLINE_WEEKS_MAX = 4;

// Game over triggers
export const INSOLVENCY_NEGATIVE_CASH_WEEKS = 2;
export const INSOLVENCY_MISSED_MILESTONES_IN_A_ROW = 2;

// Random events — target ~1 event every 4-6 weeks (midpoint: 1 in 5 weeks)
export const RANDOM_EVENT_PROBABILITY_PER_WEEK = 1 / 5;
export const MATERIAL_PRICE_SPIKE_MULTIPLIER = 1.5;
export const EMPLOYEE_SICK_PRODUCTIVITY_PENALTY = 0.5;
