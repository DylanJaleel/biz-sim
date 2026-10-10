import { Prisma } from "@prisma/client";
import {
  INSOLVENCY_NEGATIVE_CASH_WEEKS,
  LOAN_TERM_WEEKS,
  STARTING_CASH,
  STARTING_REPUTATION,
  STARTING_VEHICLES,
  WEEKS_PER_YEAR,
  toolConfig,
  type OrderType,
} from "../config";
import { getDb } from "../db";
import {
  capacityHours,
  companyValue,
  generateOffers,
  headcount,
  marginPerHour,
  personCapacities,
  previewWeek,
  resolveWeek,
  rollWeekEvent,
  seasonFactor,
  seasonLabel,
  weeklyFixedCosts,
  type AcceptedJob,
  type Business,
  type CostItem,
  type LedgerLine,
  type Offer,
  type WeekEvent,
  type WeekSummary,
} from "../economy";
import { checkInvestment, fireOutcome, type InvestmentCheck, type InvestmentKind } from "../investments";
import { calculateWeeklyLoanCharge, createLoan, type LoanState } from "../loan";
import { isOrderOpen, remainingWeeks } from "../orders";
import { evaluateWeekOutcome, type GameStatus } from "../outcome";
import { createSeededRandom, type RandomSource } from "../rng";
import { GameActionError } from "./errors";

export { GameActionError } from "./errors";

type Tx = Prisma.TransactionClient;

export interface OrderRecord extends Offer {
  id: string;
  remainingWeeks: number;
  marginPerHour: number;
}

export interface TeamMember {
  /** null for the owner. */
  id: string | null;
  name: string;
  role: "owner" | "employee";
  status: "active" | "starting" | "notice";
  hours: number;
  hasVehicle: boolean;
  onboarding: boolean;
  sick: boolean;
  startsWeek: number | null;
  endsWeek: number | null;
}

export interface CompanyState {
  id: string;
  name: string;
  weekNumber: number;
  year: number;
  weekOfYear: number;
  season: { factor: number; label: string };
  cash: number;
  status: GameStatus;
  loan: LoanState;
  loanPayment: number;
  value: number;
  business: Business;
  team: TeamMember[];
  capacity: { total: number; used: number; remaining: number };
  event: WeekEvent | null;
  fixedCosts: CostItem[];
  /** Orders that can be accepted with the current tools, most urgent/profitable first. */
  availableOrders: OrderRecord[];
  /** Open orders that need better tools than the business has. */
  lockedOrders: OrderRecord[];
  acceptedOrders: OrderRecord[];
  /** The week as it would turn out with the current plan (no bad luck on the jobs). */
  preview: WeekSummary;
  investmentChecks: Record<InvestmentKind, InvestmentCheck>;
  /** Oldest first. */
  recentRounds: { weekNumber: number; profit: number; utilization: number }[];
}

// ---------------------------------------------------------------------------
// Company lifecycle
// ---------------------------------------------------------------------------

/**
 * Returns the user's company id, creating the company on first call. Safe to
 * call on every request: a concurrent first-login race resolves via the unique
 * userId constraint.
 */
export async function ensureCompanyForUser(userId: string): Promise<string> {
  const db = getDb();

  const existing = await db.company.findUnique({ where: { userId }, select: { id: true } });
  if (existing) return existing.id;

  const loan = createLoan();

  try {
    const company = await db.company.create({
      data: {
        userId,
        name: "Mein Handwerksbetrieb",
        cash: STARTING_CASH,
        weekNumber: 1,
        reputation: STARTING_REPUTATION,
        vehicles: STARTING_VEHICLES,
        status: "ACTIVE",
        loan: {
          create: {
            principal: loan.principal,
            interestRate: loan.annualInterestRate,
            weeklyRate: loan.annualInterestRate / 52,
            remainingBalance: loan.remainingBalance,
          },
        },
      },
      select: { id: true },
    });
    return company.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await db.company.findUniqueOrThrow({ where: { userId }, select: { id: true } });
      return raced.id;
    }
    throw error;
  }
}

/** Deletes the company and everything hanging off it (cascade); the next visit starts a fresh game. */
export async function restartGame(companyId: string): Promise<void> {
  await getDb().company.delete({ where: { id: companyId } });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashSeed(companyId: string, weekNumber: number, salt: number): number {
  let hash = weekNumber * 7919 + salt;
  for (let i = 0; i < companyId.length; i++) {
    hash = (hash * 31 + companyId.charCodeAt(i)) | 0;
  }
  return hash;
}

function toBusiness(
  company: { toolLevel: number; workshopLevel: number; vehicles: number; reputation: number },
  employees: { hiredWeek: number; endsWeek: number | null }[],
): Business {
  return {
    toolLevel: company.toolLevel,
    workshopLevel: company.workshopLevel,
    vehicles: company.vehicles,
    reputation: company.reputation,
    employees: employees.map((employee) => ({ hiredWeek: employee.hiredWeek, endsWeek: employee.endsWeek })),
  };
}

function toLoanState(loan: { principal: Prisma.Decimal; interestRate: Prisma.Decimal; remainingBalance: Prisma.Decimal }): LoanState {
  return {
    principal: Number(loan.principal),
    annualInterestRate: Number(loan.interestRate),
    termWeeks: LOAN_TERM_WEEKS,
    remainingBalance: Number(loan.remainingBalance),
  };
}

type OrderRow = {
  id: string;
  weekOffered: number;
  type: string;
  tier: number;
  laborHours: number;
  materialNeed: Prisma.Decimal;
  deadlineWeeks: number;
  payout: Prisma.Decimal;
};

function toOrderRecord(row: OrderRow, weekNumber: number, materialMultiplier: number): OrderRecord {
  const offer: Offer = {
    weekOffered: row.weekOffered,
    type: row.type as OrderType,
    tier: row.tier as 1 | 2 | 3,
    hours: row.laborHours,
    materialNeed: Number(row.materialNeed),
    payout: Number(row.payout),
    deadlineWeeks: row.deadlineWeeks,
  };
  return {
    ...offer,
    id: row.id,
    remainingWeeks: remainingWeeks(offer, weekNumber),
    marginPerHour: marginPerHour(offer, materialMultiplier),
  };
}

function toAcceptedJob(row: OrderRow): AcceptedJob {
  return { hours: row.laborHours, payout: Number(row.payout), materialNeed: Number(row.materialNeed) };
}

function parseEvent(effectJson: Prisma.JsonValue | undefined): WeekEvent | null {
  return effectJson ? (effectJson as unknown as WeekEvent) : null;
}

/** Serializes all mutations of one company, so double taps and stale tabs can't interleave. */
async function lockCompany(tx: Tx, companyId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Company" WHERE "id" = ${companyId} FOR UPDATE`;
}

/**
 * Creates the offers and the incident of a week once; later calls do nothing.
 * Takes the company lock, so two requests opening the same new week at once
 * can't both generate a pool.
 */
async function prepareWeek(tx: Tx, companyId: string, week: number, business: Business) {
  await lockCompany(tx, companyId);
  const existing = await tx.order.count({ where: { companyId, weekOffered: week } });
  if (existing > 0) return;

  const offers = generateOffers(week, business.reputation, createSeededRandom(hashSeed(companyId, week, 1)));
  await tx.order.createMany({
    data: offers.map((offer) => ({
      companyId,
      weekOffered: offer.weekOffered,
      type: offer.type,
      tier: offer.tier,
      laborHours: offer.hours,
      materialNeed: offer.materialNeed,
      deadlineWeeks: offer.deadlineWeeks,
      payout: offer.payout,
      status: "AVAILABLE" as const,
    })),
  });

  const event = rollWeekEvent(createSeededRandom(hashSeed(companyId, week, 2)), headcount(business, week));
  if (event) {
    await tx.gameEvent.createMany({
      data: [{ companyId, weekNumber: week, type: event.type, effectJson: event as unknown as Prisma.InputJsonValue }],
      skipDuplicates: true,
    });
  }
}

const INVESTMENT_KINDS: InvestmentKind[] = ["hire", "vehicle", "tools", "workshop"];

// ---------------------------------------------------------------------------
// Reading the state
// ---------------------------------------------------------------------------

export async function loadCompanyState(companyId: string): Promise<CompanyState> {
  const db = getDb();

  const company = await db.company.findUniqueOrThrow({
    where: { id: companyId },
    include: { loan: true, employees: { orderBy: [{ hiredWeek: "asc" }, { id: "asc" }] } },
  });
  if (!company.loan) throw new Error(`Company ${companyId} has no loan record.`);

  if (company.status === "ACTIVE") {
    await db.$transaction(async (tx) => prepareWeek(tx, companyId, company.weekNumber, toBusiness(company, company.employees)));
  }

  const week = company.weekNumber;
  const business = toBusiness(company, company.employees);
  const [orders, eventRow, ledger, rounds] = await Promise.all([
    company.status === "ACTIVE"
      ? db.order.findMany({ where: { companyId, status: { in: ["AVAILABLE", "ACCEPTED"] } }, orderBy: { id: "asc" } })
      : Promise.resolve([]),
    db.gameEvent.findUnique({ where: { companyId_weekNumber: { companyId, weekNumber: week } } }),
    db.ledgerEntry.findMany({ where: { companyId, weekNumber: week } }),
    db.round.findMany({ where: { companyId, status: "RESOLVED" }, orderBy: { weekNumber: "desc" }, take: 8 }),
  ]);

  const event = parseEvent(eventRow?.effectJson);
  const materialMultiplier = event?.type === "material_spike" ? event.multiplier : 1;
  const cash = Number(company.cash);
  const loan = toLoanState(company.loan);

  const open = orders
    .filter((row) => row.status === "AVAILABLE" && isOrderOpen(row, week))
    .map((row) => toOrderRecord(row, week, materialMultiplier))
    .sort((a, b) => a.remainingWeeks - b.remainingWeeks || b.marginPerHour - a.marginPerHour);
  const acceptedRows = orders.filter((row) => row.status === "ACCEPTED");
  const acceptedOrders = acceptedRows.map((row) => toOrderRecord(row, week, materialMultiplier));

  const capacities = personCapacities(business, week, event);
  const total = capacityHours(business, week, event);
  const used = acceptedOrders.reduce((sum, order) => sum + order.hours, 0);

  const team: TeamMember[] = [];
  const activeCapacity = [...capacities];
  const owner = activeCapacity.shift();
  if (owner) {
    team.push({ id: null, name: "Du (Inhaber)", role: "owner", status: "active", hours: owner.hours, hasVehicle: owner.hasVehicle, onboarding: false, sick: owner.sick, startsWeek: null, endsWeek: null });
  }
  let employeeNumber = 0;
  for (const employee of company.employees) {
    if (employee.endsWeek !== null && employee.endsWeek <= week) continue;
    employeeNumber += 1;
    const isActive = employee.hiredWeek <= week;
    const capacity = isActive ? activeCapacity.shift() : undefined;
    team.push({
      id: employee.id,
      name: `Geselle ${employeeNumber}`,
      role: "employee",
      status: !isActive ? "starting" : employee.endsWeek !== null ? "notice" : "active",
      hours: capacity?.hours ?? 0,
      hasVehicle: capacity?.hasVehicle ?? false,
      onboarding: capacity?.onboarding ?? false,
      sick: capacity?.sick ?? false,
      startsWeek: isActive ? null : employee.hiredWeek,
      endsWeek: employee.endsWeek,
    });
  }

  const investments: LedgerLine[] = ledger.map((entry) => ({ label: entry.label, amount: Number(entry.amount) }));
  const investmentSum = investments.reduce((sum, line) => sum + line.amount, 0);
  const preview = previewWeek({
    weekNumber: week,
    business,
    cashBefore: cash - investmentSum,
    investments,
    accepted: acceptedRows.map(toAcceptedJob),
    event,
    loan,
  });

  return {
    id: company.id,
    name: company.name,
    weekNumber: week,
    year: Math.floor((week - 1) / WEEKS_PER_YEAR) + 1,
    weekOfYear: ((week - 1) % WEEKS_PER_YEAR) + 1,
    season: { factor: seasonFactor(week), label: seasonLabel(week) },
    cash,
    status: company.status,
    loan,
    loanPayment: calculateWeeklyLoanCharge(loan).totalPayment,
    value: companyValue({ cash, loanRemaining: loan.remainingBalance, business }),
    business,
    team,
    capacity: { total, used, remaining: Math.max(0, total - used) },
    event,
    fixedCosts: weeklyFixedCosts(business, week),
    availableOrders: open.filter((order) => order.tier <= company.toolLevel),
    lockedOrders: open.filter((order) => order.tier > company.toolLevel),
    acceptedOrders,
    preview,
    investmentChecks: Object.fromEntries(
      INVESTMENT_KINDS.map((kind) => [kind, checkInvestment(kind, business, week, cash)]),
    ) as Record<InvestmentKind, InvestmentCheck>,
    recentRounds: rounds
      .map((round) => {
        const summary = round.summaryJson as unknown as WeekSummary;
        return { weekNumber: round.weekNumber, profit: summary.profit, utilization: summary.utilization };
      })
      .reverse(),
  };
}

export async function getLatestRoundSummary(companyId: string): Promise<WeekSummary | null> {
  const round = await getDb().round.findFirst({
    where: { companyId, status: "RESOLVED" },
    orderBy: { weekNumber: "desc" },
  });

  return (round?.summaryJson as unknown as WeekSummary) ?? null;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

async function loadActiveCompany(tx: Tx, companyId: string) {
  await lockCompany(tx, companyId);
  const company = await tx.company.findUniqueOrThrow({
    where: { id: companyId },
    include: { loan: true, employees: { orderBy: [{ hiredWeek: "asc" }, { id: "asc" }] } },
  });
  if (company.status !== "ACTIVE") {
    throw new GameActionError("GAME_OVER", "Das Spiel ist beendet.");
  }
  return company;
}

async function loadOwnOrder(tx: Tx, companyId: string, orderId: string) {
  const order = await tx.order.findFirst({ where: { id: orderId, companyId } });
  if (!order) throw new GameActionError("ORDER_NOT_FOUND", "Auftrag nicht gefunden.");
  return order;
}

async function loadWeekEvent(tx: Tx, companyId: string, weekNumber: number): Promise<WeekEvent | null> {
  const row = await tx.gameEvent.findUnique({ where: { companyId_weekNumber: { companyId, weekNumber } } });
  return parseEvent(row?.effectJson);
}

export async function acceptOrder(companyId: string, orderId: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const company = await loadActiveCompany(tx, companyId);
    const order = await loadOwnOrder(tx, companyId, orderId);

    if (order.status !== "AVAILABLE" || !isOrderOpen(order, company.weekNumber)) {
      throw new GameActionError("ORDER_UNAVAILABLE", "Dieser Auftrag ist nicht mehr verfügbar.");
    }
    if (order.tier > company.toolLevel) {
      const needed = toolConfig(order.tier);
      throw new GameActionError("TOOL_LEVEL_TOO_LOW", `Dieser Auftrag verlangt „${needed.name}“ (Stufe ${needed.level}).`);
    }

    const business = toBusiness(company, company.employees);
    const event = await loadWeekEvent(tx, companyId, company.weekNumber);
    const accepted = await tx.order.findMany({ where: { companyId, status: "ACCEPTED" } });
    const free = capacityHours(business, company.weekNumber, event) - accepted.reduce((sum, row) => sum + row.laborHours, 0);

    if (order.laborHours > free + 1e-9) {
      throw new GameActionError(
        "NOT_ENOUGH_HOURS",
        `Dafür fehlen Stunden: ${order.laborHours} Std. nötig, nur ${Math.max(0, Math.floor(free * 10) / 10)} Std. frei.`,
      );
    }

    await tx.order.update({ where: { id: order.id }, data: { status: "ACCEPTED" } });
  });
}

export async function rejectOrder(companyId: string, orderId: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    await loadActiveCompany(tx, companyId);
    const order = await loadOwnOrder(tx, companyId, orderId);

    if (order.status !== "AVAILABLE") {
      throw new GameActionError("ORDER_UNAVAILABLE", "Dieser Auftrag ist nicht mehr verfügbar.");
    }

    await tx.order.update({ where: { id: order.id }, data: { status: "REJECTED" } });
  });
}

/** Takes an accepted order back into the pool (before the week is closed). */
export async function withdrawOrder(companyId: string, orderId: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    await loadActiveCompany(tx, companyId);
    const order = await loadOwnOrder(tx, companyId, orderId);

    if (order.status !== "ACCEPTED") {
      throw new GameActionError("NOT_ACCEPTED", "Dieser Auftrag wurde nicht angenommen.");
    }

    await tx.order.update({ where: { id: order.id }, data: { status: "AVAILABLE" } });
  });
}

// ---------------------------------------------------------------------------
// Investments and staff
// ---------------------------------------------------------------------------

/** Hire, buy a vehicle, upgrade tools or workshop. Costs are booked immediately and listed in the week summary. */
export async function invest(companyId: string, kind: InvestmentKind): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const company = await loadActiveCompany(tx, companyId);
    const business = toBusiness(company, company.employees);
    const check = checkInvestment(kind, business, company.weekNumber, Number(company.cash));

    if (!check.ok) throw new GameActionError("INVESTMENT_REFUSED", check.reason);

    await tx.ledgerEntry.create({
      data: { companyId, weekNumber: company.weekNumber, label: check.label, amount: -check.cost },
    });

    const data: Prisma.CompanyUpdateInput = { cash: { decrement: check.cost } };
    if (kind === "vehicle") data.vehicles = { increment: 1 };
    if (kind === "tools") data.toolLevel = { increment: 1 };
    if (kind === "workshop") data.workshopLevel = { increment: 1 };
    await tx.company.update({ where: { id: companyId }, data });

    if (kind === "hire") {
      await tx.employee.create({ data: { companyId, role: "geselle", hiredWeek: company.weekNumber + 1 } });
    }
  });
}

/** A future hire is cancelled (the fee is gone); a working employee leaves after the notice period. */
export async function fireEmployee(companyId: string, employeeId: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const company = await loadActiveCompany(tx, companyId);
    const employee = await tx.employee.findFirst({ where: { id: employeeId, companyId } });

    if (!employee || (employee.endsWeek !== null && employee.endsWeek <= company.weekNumber)) {
      throw new GameActionError("EMPLOYEE_NOT_FOUND", "Mitarbeiter nicht gefunden.");
    }
    if (employee.endsWeek !== null) {
      throw new GameActionError("EMPLOYEE_NOT_FOUND", "Diesem Mitarbeiter wurde bereits gekündigt.");
    }

    const outcome = fireOutcome(employee, company.weekNumber);
    if ("cancel" in outcome) {
      await tx.employee.delete({ where: { id: employee.id } });
    } else {
      await tx.employee.update({ where: { id: employee.id }, data: { endsWeek: outcome.endsWeek } });
    }
  });
}

// ---------------------------------------------------------------------------
// Closing the week
// ---------------------------------------------------------------------------

export interface CloseRoundResult {
  summary: WeekSummary;
  status: GameStatus;
}

/**
 * Closes the company's current week: completes the accepted orders, books
 * all costs and the loan payment, rolls quality problems, updates reputation,
 * decides whether the business survives, and prepares the next week (offers
 * and incident). `expectedWeek` is the week the player was looking at, so a
 * repeated tap or a stale tab fails instead of skipping a week.
 */
export async function closeRound(
  companyId: string,
  expectedWeek: number,
  random: RandomSource = Math.random,
): Promise<CloseRoundResult> {
  return getDb().$transaction(async (tx) => {
    const company = await loadActiveCompany(tx, companyId);

    if (!company.loan) throw new Error(`Company ${companyId} has no loan record.`);
    if (company.weekNumber !== expectedWeek) {
      throw new GameActionError("STALE_WEEK", "Diese Woche wurde bereits abgeschlossen.");
    }

    const week = company.weekNumber;
    const business = toBusiness(company, company.employees);
    const [acceptedRows, event, ledger, previousRounds] = await Promise.all([
      tx.order.findMany({ where: { companyId, status: "ACCEPTED" } }),
      loadWeekEvent(tx, companyId, week),
      tx.ledgerEntry.findMany({ where: { companyId, weekNumber: week } }),
      tx.round.findMany({
        where: { companyId, status: "RESOLVED" },
        orderBy: { weekNumber: "desc" },
        take: INSOLVENCY_NEGATIVE_CASH_WEEKS - 1,
      }),
    ]);

    const investments: LedgerLine[] = ledger.map((entry) => ({ label: entry.label, amount: Number(entry.amount) }));
    const investmentSum = investments.reduce((sum, line) => sum + line.amount, 0);

    const summary = resolveWeek({
      weekNumber: week,
      business,
      // The cash column already reflects this week's investments; the summary starts from before them.
      cashBefore: Number(company.cash) - investmentSum,
      investments,
      accepted: acceptedRows.map(toAcceptedJob),
      event,
      loan: toLoanState(company.loan),
      random,
    });

    const status = evaluateWeekOutcome({
      cashAfter: summary.cashAfter,
      previousCashAfterNewestFirst: previousRounds.map((round) => (round.summaryJson as unknown as WeekSummary).cashAfter),
    });

    await tx.round.create({
      data: { companyId, weekNumber: week, status: "RESOLVED", summaryJson: summary as unknown as Prisma.InputJsonValue },
    });

    await tx.order.updateMany({
      where: { id: { in: acceptedRows.map((order) => order.id) } },
      data: { status: "COMPLETED" },
    });

    const nextWeek = week + 1;
    const lapsed = await tx.order.findMany({ where: { companyId, status: "AVAILABLE" } });
    await tx.order.updateMany({
      where: { id: { in: lapsed.filter((order) => !isOrderOpen(order, nextWeek)).map((order) => order.id) } },
      data: { status: "EXPIRED" },
    });

    await tx.loan.update({ where: { companyId }, data: { remainingBalance: summary.loanAfter.remainingBalance } });

    await tx.company.update({
      where: { id: companyId },
      data: {
        cash: summary.cashAfter,
        reputation: summary.reputationAfter,
        status,
        weekNumber: status === "ACTIVE" ? nextWeek : week,
      },
    });

    if (status === "ACTIVE") {
      await prepareWeek(tx, companyId, nextWeek, { ...business, reputation: summary.reputationAfter });
    }

    return { summary, status };
  });
}
