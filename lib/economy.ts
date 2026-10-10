import {
  BASE_ADMIN_PER_WEEK,
  BASE_INSURANCE_PER_WEEK,
  BREAKDOWN_COST_RANGE,
  DEFECT_REFUND_SHARE,
  DEFECT_REPUTATION_LOSS,
  EMPLOYEE_ADMIN_PER_WEEK,
  EMPLOYEE_INSURANCE_PER_WEEK,
  EMPLOYEE_ONBOARDING_FACTOR,
  EMPLOYEE_ONBOARDING_WEEKS,
  EMPLOYEE_SKILL,
  EMPLOYEE_WEEKLY_WAGE,
  EVENT_PROBABILITY_PER_WEEK,
  EVENT_WEIGHTS,
  MARKET_SEGMENTS,
  MATERIAL_MARKUP_RANGE,
  MATERIAL_SPIKE_MULTIPLIER,
  MISSING_VEHICLE_FACTOR,
  ORDER_TEMPLATES,
  OVERDRAFT_ANNUAL_RATE,
  OVERLOAD_DEFECT_MULTIPLIER,
  OVERLOAD_UTILIZATION_START,
  OWNER_ADMIN_LOAD_PER_EMPLOYEE,
  OWNER_MIN_EFFICIENCY,
  OWNER_WEEKLY_DRAW,
  REPUTATION_DECAY_RATE,
  REPUTATION_GAIN_PER_HOUR,
  SEASON_AMPLITUDE,
  SICK_CAPACITY_FACTOR,
  VEHICLE_PRICE,
  VEHICLE_WEEKLY_COST,
  WORK_HOURS_PER_PERSON,
  TOOL_LEVELS,
  WORKSHOP_LEVELS,
  toolConfig,
  workshopConfig,
  type MarketSegment,
  type OrderType,
} from "./config";
import { calculateWeeklyLoanCharge, type LoanState } from "./loan";
import type { RandomSource } from "./rng";

// ---------------------------------------------------------------------------
// Business state
// ---------------------------------------------------------------------------

/** An employee works in weeks `hiredWeek <= week < endsWeek` (endsWeek null = open-ended). */
export interface EmployeeSlot {
  hiredWeek: number;
  endsWeek: number | null;
}

export interface Business {
  toolLevel: number;
  workshopLevel: number;
  vehicles: number;
  reputation: number;
  employees: EmployeeSlot[];
}

export function isEmployeeActive(employee: EmployeeSlot, week: number): boolean {
  return employee.hiredWeek <= week && (employee.endsWeek === null || week < employee.endsWeek);
}

export function activeEmployees(business: Business, week: number): EmployeeSlot[] {
  return business.employees.filter((employee) => isEmployeeActive(employee, week)).sort((a, b) => a.hiredWeek - b.hiredWeek);
}

/** Owner plus everybody working this week. */
export function headcount(business: Business, week: number): number {
  return 1 + activeEmployees(business, week).length;
}

/** Seats taken in the workshop: hired people (also future starters and those in notice) plus the owner. */
export function seatsTaken(business: Business, week: number): number {
  return 1 + business.employees.filter((employee) => employee.endsWeek === null || employee.endsWeek > week).length;
}

export function businessSizeLabel(people: number): string {
  if (people <= 1) return "Solo-Handwerker";
  if (people <= 3) return "Kleinbetrieb";
  if (people <= 6) return "Handwerksbetrieb";
  return "Großbetrieb";
}

// ---------------------------------------------------------------------------
// Time and money capacity
// ---------------------------------------------------------------------------

export type WeekEvent =
  | { type: "sick"; personIndex: number; description: string }
  | { type: "material_spike"; multiplier: number; description: string }
  | { type: "breakdown"; repairCost: number; description: string };

export interface PersonCapacity {
  role: "owner" | "employee";
  hours: number;
  hasVehicle: boolean;
  onboarding: boolean;
  sick: boolean;
}

/** Billable hours per person this week, owner first. */
export function personCapacities(business: Business, week: number, event: WeekEvent | null): PersonCapacity[] {
  const tool = toolConfig(business.toolLevel);
  const staff = activeEmployees(business, week);
  const ownerEfficiency = Math.max(OWNER_MIN_EFFICIENCY, tool.efficiency - OWNER_ADMIN_LOAD_PER_EMPLOYEE * staff.length);

  const people = [
    { role: "owner" as const, onboarding: false, baseHours: WORK_HOURS_PER_PERSON * ownerEfficiency },
    ...staff.map((employee) => {
      const onboarding = week - employee.hiredWeek < EMPLOYEE_ONBOARDING_WEEKS;
      return {
        role: "employee" as const,
        onboarding,
        baseHours:
          WORK_HOURS_PER_PERSON * tool.efficiency * EMPLOYEE_SKILL * (onboarding ? EMPLOYEE_ONBOARDING_FACTOR : 1),
      };
    }),
  ];

  const sickIndex = event?.type === "sick" ? event.personIndex % people.length : -1;

  return people.map((person, index) => {
    const hasVehicle = index < business.vehicles;
    const sick = index === sickIndex;
    return {
      role: person.role,
      onboarding: person.onboarding,
      hasVehicle,
      sick,
      hours: person.baseHours * (hasVehicle ? 1 : MISSING_VEHICLE_FACTOR) * (sick ? SICK_CAPACITY_FACTOR : 1),
    };
  });
}

export function capacityHours(business: Business, week: number, event: WeekEvent | null): number {
  return personCapacities(business, week, event).reduce((sum, person) => sum + person.hours, 0);
}

export interface CostItem {
  key: string;
  label: string;
  /** Always positive: what the item costs this week. */
  amount: number;
}

/** Costs that run whether or not there is work (loan, material and incidents excluded). */
export function weeklyFixedCosts(business: Business, week: number): CostItem[] {
  const staff = activeEmployees(business, week);
  const items: CostItem[] = [
    { key: "wages", label: "Löhne", amount: staff.length * EMPLOYEE_WEEKLY_WAGE },
    { key: "rent", label: "Werkstattmiete", amount: workshopConfig(business.workshopLevel).rentPerWeek },
    { key: "vehicles", label: "Fahrzeuge", amount: business.vehicles * VEHICLE_WEEKLY_COST },
    {
      key: "insurance",
      label: "Versicherungen",
      amount: BASE_INSURANCE_PER_WEEK + staff.length * EMPLOYEE_INSURANCE_PER_WEEK,
    },
    {
      key: "admin",
      label: "Verwaltung & Büro",
      amount: BASE_ADMIN_PER_WEEK + staff.length * EMPLOYEE_ADMIN_PER_WEEK,
    },
    { key: "tools", label: "Werkzeugpflege", amount: toolConfig(business.toolLevel).upkeepPerPerson * (1 + staff.length) },
    { key: "draw", label: "Lebenshaltung (Inhaber)", amount: OWNER_WEEKLY_DRAW },
  ];
  return items.filter((item) => item.amount > 0);
}

export function totalFixedCosts(business: Business, week: number): number {
  return weeklyFixedCosts(business, week).reduce((sum, item) => sum + item.amount, 0);
}

// ---------------------------------------------------------------------------
// Market
// ---------------------------------------------------------------------------

/** Handwerk is seasonal: 1.0 at the start (spring), peak in early summer, trough in winter. */
export function seasonFactor(week: number): number {
  return 1 + SEASON_AMPLITUDE * Math.sin((2 * Math.PI * (week - 1)) / 52);
}

export function seasonLabel(week: number): string {
  const factor = seasonFactor(week);
  if (factor >= 1.1) return "Hochsaison";
  if (factor <= 0.9) return "Flaute";
  return "Normalbetrieb";
}

/** Hours of new offers per week in one market segment. */
export function segmentDemandHours(segment: MarketSegment, week: number, reputation: number): number {
  const reputationFactor = Math.max(0, segment.reputationFloor + (segment.reputationSlope * reputation) / 100);
  return segment.baseHours * seasonFactor(week) * reputationFactor;
}

/** Hours of new offers appearing this week across all segments. */
export function demandHours(week: number, reputation: number): number {
  return MARKET_SEGMENTS.reduce((sum, segment) => sum + segmentDemandHours(segment, week, reputation), 0);
}

export interface Offer {
  weekOffered: number;
  type: OrderType;
  tier: 1 | 2 | 3;
  hours: number;
  materialNeed: number;
  payout: number;
  deadlineWeeks: number;
}

function between(random: RandomSource, [min, max]: readonly [number, number]): number {
  return min + random() * (max - min);
}

function intBetween(random: RandomSource, [min, max]: readonly [number, number]): number {
  return Math.floor(between(random, [min, max + 1]));
}

function pickType(weights: Record<OrderType, number>, random: RandomSource): OrderType {
  const types = (Object.keys(weights) as OrderType[]).filter((type) => weights[type] > 0);
  const total = types.reduce((sum, type) => sum + weights[type], 0);
  let roll = random() * total;
  for (const type of types) {
    roll -= weights[type];
    if (roll <= 0) return type;
  }
  return types[types.length - 1];
}

/** New offers for a week: random jobs per market segment until the segment's hours for the week are filled. */
export function generateOffers(week: number, reputation: number, random: RandomSource): Offer[] {
  const offers: Offer[] = [];

  for (const segment of MARKET_SEGMENTS) {
    const target = segmentDemandHours(segment, week, reputation);
    let offeredHours = 0;

    while (offeredHours < target) {
      const type = pickType(segment.typeWeights, random);
      const template = ORDER_TEMPLATES[type];
      const hours = intBetween(random, template.hours);
      const materialNeed = Math.round(hours * between(random, template.materialPerHour));
      const labor = hours * between(random, segment.rate);
      const payout = Math.round(labor + materialNeed * (1 + between(random, MATERIAL_MARKUP_RANGE)));

      offers.push({
        weekOffered: week,
        type,
        tier: segment.tier,
        hours,
        materialNeed,
        payout,
        deadlineWeeks: intBetween(random, template.deadlineWeeks),
      });
      offeredHours += hours;
    }
  }

  return offers;
}

/** Margin per billable hour of an offer, before the fixed costs it has to help carry. */
export function marginPerHour(offer: Pick<Offer, "payout" | "materialNeed" | "hours">, materialMultiplier = 1): number {
  return (offer.payout - offer.materialNeed * materialMultiplier) / offer.hours;
}

/** The week's incident, rolled when the week starts so the player can plan around it. */
export function rollWeekEvent(random: RandomSource, people: number): WeekEvent | null {
  if (random() >= EVENT_PROBABILITY_PER_WEEK) return null;

  const roll = random();
  if (roll < EVENT_WEIGHTS.sick) {
    const personIndex = Math.floor(random() * people);
    return {
      type: "sick",
      personIndex,
      description:
        personIndex === 0
          ? "Du bist diese Woche krank und kannst nur wenige Stunden arbeiten."
          : "Ein Mitarbeiter ist diese Woche krank und fällt größtenteils aus.",
    };
  }
  if (roll < EVENT_WEIGHTS.sick + EVENT_WEIGHTS.material_spike) {
    return {
      type: "material_spike",
      multiplier: MATERIAL_SPIKE_MULTIPLIER,
      description: `Materialpreise sind diese Woche um ${Math.round((MATERIAL_SPIKE_MULTIPLIER - 1) * 100)} % gestiegen.`,
    };
  }
  const repairCost = Math.round(between(random, BREAKDOWN_COST_RANGE) / 50) * 50;
  return {
    type: "breakdown",
    repairCost,
    description: `Ein Fahrzeug ist ausgefallen: Die Reparatur kostet ${repairCost.toLocaleString("de-DE")} €.`,
  };
}

// ---------------------------------------------------------------------------
// Week resolution
// ---------------------------------------------------------------------------

export interface AcceptedJob {
  hours: number;
  payout: number;
  materialNeed: number;
}

export interface LedgerLine {
  label: string;
  /** Negative: money that left the account during the week (investments). */
  amount: number;
}

export interface SummaryItem {
  key: string;
  label: string;
  /** Negative: an expense of the week. */
  amount: number;
}

export interface WeekInput {
  weekNumber: number;
  business: Business;
  /** Cash at the start of the week, i.e. before this week's investments. */
  cashBefore: number;
  investments: LedgerLine[];
  accepted: AcceptedJob[];
  event: WeekEvent | null;
  loan: LoanState;
  random: RandomSource;
}

export interface WeekSummary {
  weekNumber: number;
  revenue: number;
  /** Expenses of the week as negative amounts; zero items are left out. */
  items: SummaryItem[];
  /** Revenue minus all expenses including loan interest. Principal repayment is not an expense. */
  profit: number;
  loanPrincipalPayment: number;
  investments: LedgerLine[];
  investmentTotal: number;
  cashBefore: number;
  cashAfter: number;
  loanAfter: LoanState;
  eventDescription: string | null;
  headcount: number;
  capacityHours: number;
  completedHours: number;
  completedOrders: number;
  utilization: number;
  defects: number;
  reputationBefore: number;
  reputationAfter: number;
}

export function resolveWeek(input: WeekInput): WeekSummary {
  const { business, weekNumber, event } = input;
  const capacity = capacityHours(business, weekNumber, event);
  const completedHours = input.accepted.reduce((sum, job) => sum + job.hours, 0);
  const utilization = capacity > 0 ? completedHours / capacity : 0;
  const tool = toolConfig(business.toolLevel);

  const revenue = input.accepted.reduce((sum, job) => sum + job.payout, 0);
  const materialMultiplier = event?.type === "material_spike" ? event.multiplier : 1;
  const materialCost = input.accepted.reduce((sum, job) => sum + job.materialNeed, 0) * materialMultiplier;

  const overload = Math.max(0, utilization - OVERLOAD_UTILIZATION_START) / (1 - OVERLOAD_UTILIZATION_START);
  const defectChance = tool.defectRate * (1 + OVERLOAD_DEFECT_MULTIPLIER * overload);
  let defects = 0;
  let refunds = 0;
  for (const job of input.accepted) {
    if (input.random() < defectChance) {
      defects += 1;
      refunds += job.payout * DEFECT_REFUND_SHARE;
    }
  }

  const loanCharge = calculateWeeklyLoanCharge(input.loan);
  const overdraftInterest = input.cashBefore < 0 ? (-input.cashBefore * OVERDRAFT_ANNUAL_RATE) / 52 : 0;

  const expenses: CostItem[] = [
    { key: "material", label: "Material", amount: materialCost },
    ...weeklyFixedCosts(business, weekNumber),
    { key: "defects", label: "Nachbesserung & Preisnachlässe", amount: refunds },
    { key: "repair", label: "Fahrzeugreparatur", amount: event?.type === "breakdown" ? event.repairCost : 0 },
    { key: "overdraft", label: "Dispozinsen", amount: overdraftInterest },
    { key: "loanInterest", label: "Kreditzinsen", amount: loanCharge.interestPayment },
  ];
  const items = expenses.filter((item) => item.amount > 0).map((item) => ({ ...item, amount: -item.amount }));

  const profit = revenue + items.reduce((sum, item) => sum + item.amount, 0);
  const investmentTotal = input.investments.reduce((sum, line) => sum + line.amount, 0);
  const reputationBefore = business.reputation;
  const reputationAfter = Math.min(
    100,
    Math.max(
      0,
      reputationBefore +
        REPUTATION_GAIN_PER_HOUR * completedHours -
        DEFECT_REPUTATION_LOSS * defects -
        REPUTATION_DECAY_RATE * reputationBefore,
    ),
  );

  return {
    weekNumber,
    revenue,
    items,
    profit,
    loanPrincipalPayment: loanCharge.principalPayment,
    investments: input.investments,
    investmentTotal,
    cashBefore: input.cashBefore,
    cashAfter: input.cashBefore + profit - loanCharge.principalPayment + investmentTotal,
    loanAfter: { ...input.loan, remainingBalance: loanCharge.remainingBalanceAfter },
    eventDescription: event?.description ?? null,
    headcount: headcount(business, weekNumber),
    capacityHours: capacity,
    completedHours,
    completedOrders: input.accepted.length,
    utilization,
    defects,
    reputationBefore,
    reputationAfter,
  };
}

/** The week as it would turn out without bad luck on the jobs themselves (no defects). */
export function previewWeek(input: Omit<WeekInput, "random">): WeekSummary {
  return resolveWeek({ ...input, random: () => 1 });
}

// ---------------------------------------------------------------------------
// Company value (progress indicator — there is no finish line)
// ---------------------------------------------------------------------------

/** Equity: cash plus what the equipment would still fetch, minus the loan. */
export function companyValue(input: {
  cash: number;
  loanRemaining: number;
  business: Pick<Business, "toolLevel" | "workshopLevel" | "vehicles">;
}): number {
  const toolInvestment = TOOL_LEVELS.filter((tool) => tool.level <= input.business.toolLevel).reduce(
    (sum, tool) => sum + tool.upgradeCost,
    0,
  );
  const workshopInvestment = WORKSHOP_LEVELS.filter((workshop) => workshop.level <= input.business.workshopLevel).reduce(
    (sum, workshop) => sum + workshop.upgradeCost,
    0,
  );
  return Math.round(
    input.cash -
      input.loanRemaining +
      input.business.vehicles * VEHICLE_PRICE * 0.6 +
      toolInvestment * 0.5 +
      workshopInvestment * 0.4,
  );
}
