import { Prisma } from "@prisma/client";
import { GAME_LENGTH_WEEKS, INSOLVENCY_NEGATIVE_CASH_WEEKS, SOLO_ORDER_CAPACITY_PER_WEEK, STARTING_CASH } from "../config";
import { getDb } from "../db";
import { maybeGenerateRandomEvent } from "../events";
import { createLoan, type LoanState } from "../loan";
import { evaluateRoundOutcome, type GameStatus } from "../outcome";
import { generateOrderPool, isOrderOpen, remainingWeeks, type GeneratedOrder } from "../orders";
import { createSeededRandom } from "../rng";
import { resolveRound, type RoundSummary } from "../round";
import { advanceStage, type CompanyStage } from "../stage";
import { GameActionError } from "./errors";

export { GameActionError } from "./errors";

export interface OrderRecord extends GeneratedOrder {
  id: string;
  remainingWeeks: number;
}

export interface CompanyState {
  id: string;
  weekNumber: number;
  gameLengthWeeks: number;
  cash: number;
  stage: CompanyStage;
  status: GameStatus;
  loan: LoanState;
  /** Open orders the player can still accept or reject, most urgent first. */
  availableOrders: OrderRecord[];
  /** Orders taken on for this week; they are paid out when the week is closed. */
  acceptedOrders: OrderRecord[];
  orderCapacity: number;
}

type Tx = Prisma.TransactionClient;

/**
 * Returns the user's company id, creating the company (starting cash + loan
 * from lib/config.ts) on first call. Safe to call on every request: a
 * concurrent first-login race resolves via the unique userId constraint.
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
        stage: 1,
        weekNumber: 1,
        reputation: 50,
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

function hashSeed(companyId: string, weekNumber: number): number {
  let hash = weekNumber;
  for (let i = 0; i < companyId.length; i++) {
    hash = (hash * 31 + companyId.charCodeAt(i)) | 0;
  }
  return hash;
}

function newOrderRows(companyId: string, weekNumber: number) {
  return generateOrderPool(weekNumber, createSeededRandom(hashSeed(companyId, weekNumber))).map((order) => ({
    companyId,
    weekOffered: order.weekOffered,
    type: order.type,
    materialNeed: order.materialNeed,
    deadlineWeeks: order.deadlineWeeks,
    payout: order.payout,
    status: "AVAILABLE" as const,
  }));
}

async function ensureCurrentWeekOrders(companyId: string, weekNumber: number) {
  const db = getDb();
  const existing = await db.order.count({ where: { companyId, weekOffered: weekNumber } });
  if (existing > 0) return;
  await db.order.createMany({ data: newOrderRows(companyId, weekNumber) });
}

/** Serializes all mutations of one company, so double taps and stale tabs can't interleave. */
async function lockCompany(tx: Tx, companyId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Company" WHERE "id" = ${companyId} FOR UPDATE`;
}

function orderCapacity(): number {
  return SOLO_ORDER_CAPACITY_PER_WEEK;
}

function toOrderRecord(
  row: { id: string; weekOffered: number; type: string; materialNeed: Prisma.Decimal; deadlineWeeks: number; payout: Prisma.Decimal },
  weekNumber: number,
): OrderRecord {
  const order = {
    weekOffered: row.weekOffered,
    type: row.type as GeneratedOrder["type"],
    materialNeed: Number(row.materialNeed),
    deadlineWeeks: row.deadlineWeeks,
    payout: Number(row.payout),
  };
  return { id: row.id, ...order, remainingWeeks: remainingWeeks(order, weekNumber) };
}

function toLoanState(loan: { principal: Prisma.Decimal; interestRate: Prisma.Decimal; remainingBalance: Prisma.Decimal }): LoanState {
  return {
    principal: Number(loan.principal),
    annualInterestRate: Number(loan.interestRate),
    termWeeks: GAME_LENGTH_WEEKS,
    remainingBalance: Number(loan.remainingBalance),
  };
}

export async function loadCompanyState(companyId: string): Promise<CompanyState> {
  const db = getDb();
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, include: { loan: true } });

  if (!company.loan) {
    throw new Error(`Company ${companyId} has no loan record.`);
  }

  const active = company.status === "ACTIVE";
  if (active) await ensureCurrentWeekOrders(companyId, company.weekNumber);

  const rows = active
    ? await db.order.findMany({ where: { companyId, status: { in: ["AVAILABLE", "ACCEPTED"] } }, orderBy: { id: "asc" } })
    : [];

  const availableOrders = rows
    .filter((row) => row.status === "AVAILABLE" && isOrderOpen(row, company.weekNumber))
    .map((row) => toOrderRecord(row, company.weekNumber))
    .sort((a, b) => a.remainingWeeks - b.remainingWeeks || b.payout - b.materialNeed - (a.payout - a.materialNeed));

  return {
    id: company.id,
    weekNumber: company.weekNumber,
    gameLengthWeeks: GAME_LENGTH_WEEKS,
    cash: Number(company.cash),
    stage: company.stage as CompanyStage,
    status: company.status,
    loan: toLoanState(company.loan),
    availableOrders,
    acceptedOrders: rows.filter((row) => row.status === "ACCEPTED").map((row) => toOrderRecord(row, company.weekNumber)),
    orderCapacity: orderCapacity(),
  };
}

export async function getLatestRoundSummary(companyId: string): Promise<RoundSummary | null> {
  const round = await getDb().round.findFirst({
    where: { companyId, status: "RESOLVED" },
    orderBy: { weekNumber: "desc" },
  });

  return (round?.summaryJson as unknown as RoundSummary) ?? null;
}

async function loadActiveCompany(tx: Tx, companyId: string) {
  await lockCompany(tx, companyId);
  const company = await tx.company.findUniqueOrThrow({ where: { id: companyId }, include: { loan: true } });
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

export async function acceptOrder(companyId: string, orderId: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const company = await loadActiveCompany(tx, companyId);
    const order = await loadOwnOrder(tx, companyId, orderId);

    if (order.status !== "AVAILABLE" || !isOrderOpen(order, company.weekNumber)) {
      throw new GameActionError("ORDER_UNAVAILABLE", "Dieser Auftrag ist nicht mehr verfügbar.");
    }

    const accepted = await tx.order.count({ where: { companyId, status: "ACCEPTED" } });
    if (accepted >= orderCapacity()) {
      throw new GameActionError(
        "CAPACITY_REACHED",
        `Kapazität erreicht: Du schaffst ${orderCapacity()} Aufträge pro Woche.`,
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

export interface CloseRoundResult {
  summary: RoundSummary;
  status: GameStatus;
  stageBefore: CompanyStage;
  stageAfter: CompanyStage;
}

/**
 * Closes the company's current week: pays out the accepted orders, charges
 * the loan, rolls a random event, decides whether the game goes on, and
 * prepares the next week. `expectedWeek` is the week the player was looking
 * at — a repeated tap or a stale tab therefore fails instead of skipping a
 * week.
 */
export async function closeRound(companyId: string, expectedWeek: number): Promise<CloseRoundResult> {
  return getDb().$transaction(async (tx) => {
    const company = await loadActiveCompany(tx, companyId);

    if (!company.loan) {
      throw new Error(`Company ${companyId} has no loan record.`);
    }
    if (company.weekNumber !== expectedWeek) {
      throw new GameActionError("STALE_WEEK", "Diese Woche wurde bereits abgeschlossen.");
    }

    const acceptedOrders = await tx.order.findMany({ where: { companyId, status: "ACCEPTED" } });
    const event = maybeGenerateRandomEvent();

    const summary = resolveRound({
      weekNumber: company.weekNumber,
      cashBefore: Number(company.cash),
      acceptedOrders: acceptedOrders.map((order) => ({
        payout: Number(order.payout),
        materialNeed: Number(order.materialNeed),
      })),
      employeeWageTotal: 0,
      warehouseRent: 0,
      loan: toLoanState(company.loan),
      event,
    });

    const previousRounds = await tx.round.findMany({
      where: { companyId, status: "RESOLVED" },
      orderBy: { weekNumber: "desc" },
      take: INSOLVENCY_NEGATIVE_CASH_WEEKS - 1,
    });

    const status = evaluateRoundOutcome({
      weekNumber: company.weekNumber,
      cashAfter: summary.cashAfter,
      loanRemainingAfter: summary.loanAfter.remainingBalance,
      previousCashAfterNewestFirst: previousRounds.map((round) => (round.summaryJson as unknown as RoundSummary).cashAfter),
    });

    const stageBefore = company.stage as CompanyStage;
    const stageAfter = advanceStage(stageBefore, summary.cashAfter);
    const nextWeekNumber = company.weekNumber + 1;

    await tx.round.create({
      data: {
        companyId,
        weekNumber: company.weekNumber,
        status: "RESOLVED",
        summaryJson: summary as unknown as Prisma.InputJsonValue,
      },
    });

    if (event) {
      await tx.gameEvent.create({
        data: {
          companyId,
          weekNumber: company.weekNumber,
          type: event.type,
          effectJson: event as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await tx.order.updateMany({
      where: { id: { in: acceptedOrders.map((order) => order.id) } },
      data: { status: "COMPLETED" },
    });

    const lapsed = await tx.order.findMany({ where: { companyId, status: "AVAILABLE" } });
    await tx.order.updateMany({
      where: { id: { in: lapsed.filter((order) => !isOrderOpen(order, nextWeekNumber)).map((order) => order.id) } },
      data: { status: "EXPIRED" },
    });

    await tx.loan.update({
      where: { companyId },
      data: { remainingBalance: summary.loanAfter.remainingBalance },
    });

    await tx.company.update({
      where: { id: companyId },
      data: {
        cash: summary.cashAfter,
        status,
        stage: stageAfter,
        weekNumber: status === "ACTIVE" ? nextWeekNumber : company.weekNumber,
      },
    });

    if (status === "ACTIVE") {
      await tx.order.createMany({ data: newOrderRows(companyId, nextWeekNumber) });
    }

    return { summary, status, stageBefore, stageAfter };
  });
}
