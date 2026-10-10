/**
 * Balancing constants — the single source of truth for every number in the
 * economy. The reasoning behind them is in docs/game-economy-design.md; they
 * were tuned with `npm run simulate` (lib/simulation.ts), so change them
 * together with the balance tests in tests/economy-balance.test.ts.
 */

export const WEEKS_PER_YEAR = 52;

// --- Start ---------------------------------------------------------------
// 5.000 € equity + 15.000 € loan = 20.000 €; 10.000 € of that went into the
// first equipment (van, tools, workshop deposit), so 10.000 € are left.
export const STARTING_CASH = 10_000;
export const STARTING_REPUTATION = 40;
export const STARTING_VEHICLES = 1;

export const LOAN_PRINCIPAL = 15_000;
export const LOAN_ANNUAL_INTEREST_RATE = 0.06;
export const LOAN_TERM_WEEKS = 104;

// --- Time budget per person ---------------------------------------------
export const WORK_HOURS_PER_PERSON = 40;

// Tool quality: how much of the paid time becomes billable (less rework,
// searching, waiting), what keeping each person's tools in shape costs per week, how often a job
// goes wrong, and which job grades can be taken at all.
export interface ToolLevelConfig {
  level: 1 | 2 | 3;
  name: string;
  efficiency: number;
  upkeepPerPerson: number;
  defectRate: number;
  upgradeCost: number;
}
export const TOOL_LEVELS: readonly ToolLevelConfig[] = [
  { level: 1, name: "Grundausstattung", efficiency: 0.7, upkeepPerPerson: 25, defectRate: 0.08, upgradeCost: 0 },
  { level: 2, name: "Profi-Werkzeug", efficiency: 0.76, upkeepPerPerson: 40, defectRate: 0.05, upgradeCost: 9_000 },
  { level: 3, name: "Meister-Ausstattung", efficiency: 0.82, upkeepPerPerson: 70, defectRate: 0.03, upgradeCost: 20_000 },
];

// Workshop: how many people fit (owner included) and what it costs per week.
export interface WorkshopLevelConfig {
  level: 1 | 2 | 3;
  name: string;
  seats: number;
  rentPerWeek: number;
  upgradeCost: number;
}
export const WORKSHOP_LEVELS: readonly WorkshopLevelConfig[] = [
  { level: 1, name: "Kleine Werkstatt", seats: 3, rentPerWeek: 290, upgradeCost: 0 },
  { level: 2, name: "Werkstatt mit Lager", seats: 6, rentPerWeek: 640, upgradeCost: 12_000 },
  { level: 3, name: "Großwerkstatt", seats: 10, rentPerWeek: 1_200, upgradeCost: 30_000 },
];

// Vehicles: everybody on site needs one, otherwise they lose time sharing.
export const VEHICLE_PRICE = 8_000;
export const VEHICLE_WEEKLY_COST = 110;
export const MISSING_VEHICLE_FACTOR = 0.7;

// --- Owner ---------------------------------------------------------------
export const OWNER_WEEKLY_DRAW = 500;
// Every employee costs the owner billable time (planning, paperwork, training).
export const OWNER_ADMIN_LOAD_PER_EMPLOYEE = 0.025;
export const OWNER_MIN_EFFICIENCY = 0.3;

// --- Employees (Geselle) ---------------------------------------------------
export const EMPLOYEE_WEEKLY_WAGE = 1_000;
export const EMPLOYEE_RECRUITING_FEE = 2_500;
export const EMPLOYEE_SKILL = 0.85;
export const EMPLOYEE_ONBOARDING_WEEKS = 2;
export const EMPLOYEE_ONBOARDING_FACTOR = 0.5;
export const EMPLOYEE_NOTICE_WEEKS = 2;
export const EMPLOYEE_INSURANCE_PER_WEEK = 20;
export const EMPLOYEE_ADMIN_PER_WEEK = 15;

// --- Other fixed costs ---------------------------------------------------------
export const BASE_INSURANCE_PER_WEEK = 65;
export const BASE_ADMIN_PER_WEEK = 60;

// --- Money trouble -------------------------------------------------------------
export const OVERDRAFT_LIMIT = 3_000;
export const OVERDRAFT_ANNUAL_RATE = 0.12;
export const INSOLVENCY_NEGATIVE_CASH_WEEKS = 3;

// --- Market --------------------------------------------------------------------
// Three market segments with their own demand. A better reputation adds
// demand in the higher segments; the simple jobs never go away.
export const SEASON_AMPLITUDE = 0.2;

export type OrderType = "repair" | "standard" | "installation" | "custom";
export interface OrderTemplate {
  hours: readonly [number, number];
  materialPerHour: readonly [number, number];
  deadlineWeeks: readonly [number, number];
}
export const ORDER_TEMPLATES: Record<OrderType, OrderTemplate> = {
  repair: { hours: [3, 8], materialPerHour: [10, 22], deadlineWeeks: [1, 2] },
  standard: { hours: [8, 18], materialPerHour: [14, 28], deadlineWeeks: [1, 3] },
  installation: { hours: [16, 32], materialPerHour: [22, 40], deadlineWeeks: [2, 4] },
  custom: { hours: [24, 48], materialPerHour: [18, 35], deadlineWeeks: [2, 4] },
};

export interface MarketSegment {
  tier: 1 | 2 | 3;
  name: string;
  /** Hours of new offers per week at neutral season, before the reputation factor. */
  baseHours: number;
  /** Demand factor = max(0, floor + slope × reputation / 100). */
  reputationFloor: number;
  reputationSlope: number;
  /** Labor revenue per hour (material is charged on top). */
  rate: readonly [number, number];
  typeWeights: Record<OrderType, number>;
}
export const MARKET_SEGMENTS: readonly MarketSegment[] = [
  {
    tier: 1,
    name: "Privatkunden & Kleinaufträge",
    baseHours: 52,
    reputationFloor: 0.9,
    reputationSlope: 0.2,
    rate: [40, 60],
    typeWeights: { repair: 0.5, standard: 0.35, installation: 0.15, custom: 0 },
  },
  {
    tier: 2,
    name: "Gewerbe & Renovierung",
    baseHours: 40,
    reputationFloor: 0.2,
    reputationSlope: 1.3,
    rate: [51, 68],
    typeWeights: { repair: 0.15, standard: 0.3, installation: 0.35, custom: 0.2 },
  },
  {
    tier: 3,
    name: "Premium & Objekt",
    baseHours: 20,
    reputationFloor: -0.1,
    reputationSlope: 1.2,
    rate: [64, 86],
    typeWeights: { repair: 0, standard: 0.1, installation: 0.3, custom: 0.6 },
  },
];
export const MATERIAL_MARKUP_RANGE: readonly [number, number] = [0.08, 0.18];

// --- Quality, reputation ------------------------------------------------------------
export const DEFECT_REFUND_SHARE = 0.3;
export const DEFECT_REPUTATION_LOSS = 2.5;
export const OVERLOAD_UTILIZATION_START = 0.85;
export const OVERLOAD_DEFECT_MULTIPLIER = 0.6;
export const REPUTATION_GAIN_PER_HOUR = 0.045;
export const REPUTATION_DECAY_RATE = 0.012;

// --- Weekly events (rolled when the week starts, so the player can plan around them) ---
export const EVENT_PROBABILITY_PER_WEEK = 0.22;
export const EVENT_WEIGHTS = { sick: 0.4, material_spike: 0.35, breakdown: 0.25 } as const;
export const SICK_CAPACITY_FACTOR = 0.4;
export const MATERIAL_SPIKE_MULTIPLIER = 1.35;
export const BREAKDOWN_COST_RANGE: readonly [number, number] = [500, 1_400];

// --- Login rate limits (magic link requests), see lib/rate-limit.ts -------------------
export const LOGIN_EMAIL_LIMIT = 3;
export const LOGIN_EMAIL_WINDOW_SECONDS = 15 * 60;
export const LOGIN_IP_LIMIT = 10;
export const LOGIN_IP_WINDOW_SECONDS = 60 * 60;

export function toolConfig(level: number): ToolLevelConfig {
  return TOOL_LEVELS[Math.min(Math.max(level, 1), TOOL_LEVELS.length) - 1];
}

export function workshopConfig(level: number): WorkshopLevelConfig {
  return WORKSHOP_LEVELS[Math.min(Math.max(level, 1), WORKSHOP_LEVELS.length) - 1];
}
