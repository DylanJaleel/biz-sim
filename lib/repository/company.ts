import { DEMO_USER_EMAIL, GAME_LENGTH_WEEKS } from "../config";
import { getDb } from "../db";
import { maybeGenerateRandomEvent } from "../events";
import type { LoanState } from "../loan";
import { generateOrderPool, type GeneratedOrder } from "../orders";
import { createSeededRandom } from "../rng";
import { resolveRound, type RoundSummary } from "../round";
import { getUnlockedStage, type CompanyStage } from "../stage";

export interface OrderRecord extends GeneratedOrder {
  id: string;
}

export interface CompanyState {
  id: string;
  weekNumber: number;
  gameLengthWeeks: number;
  cash: number;
  stage: CompanyStage;
  status: "ACTIVE" | "INSOLVENT" | "WON";
  loan: LoanState;
  availableOrders: OrderRecord[];
}

/**
 * Stand-in for session-based lookup until Phase 2 wires up Auth.js. Looks up
 * the company created by `npm run db:seed`.
 */
export async function getDemoCompanyId(): Promise<string> {
  const db = getDb();
  const company = await db.company.findFirst({
    where: { user: { email: DEMO_USER_EMAIL } },
    select: { id: true },
  });

  if (!company) {
    throw new Error(
      `No demo company found for ${DEMO_USER_EMAIL}. Run "npm run db:seed" first.`,
    );
  }

  return company.id;
}

async function ensureCurrentWeekOrders(companyId: string, weekNumber: number) {
  const db = getDb();
  const existing = await db.order.count({
    where: { companyId, weekOffered: weekNumber },
  });
  if (existing > 0) return;

  const orders = generateOrderPool(weekNumber, createSeededRandom(hashSeed(companyId, weekNumber)));
  await db.order.createMany({
    data: orders.map((order) => ({
      companyId,
      weekOffered: order.weekOffered,
      type: order.type,
      materialNeed: order.materialNeed,
      deadlineWeeks: order.deadlineWeeks,
      payout: order.payout,
      status: "AVAILABLE",
    })),
  });
}

function hashSeed(companyId: string, weekNumber: number): number {
  let hash = weekNumber;
  for (let i = 0; i < companyId.length; i++) {
    hash = (hash * 31 + companyId.charCodeAt(i)) | 0;
  }
  return hash;
}

export async function loadCompanyState(companyId: string): Promise<CompanyState> {
  const db = getDb();
  const company = await db.company.findUniqueOrThrow({
    where: { id: companyId },
    include: { loan: true },
  });

  if (!company.loan) {
    throw new Error(`Company ${companyId} has no loan record.`);
  }

  await ensureCurrentWeekOrders(companyId, company.weekNumber);

  const orders = await db.order.findMany({
    where: { companyId, weekOffered: company.weekNumber, status: "AVAILABLE" },
    orderBy: { id: "asc" },
  });

  const loan: LoanState = {
    principal: Number(company.loan.principal),
    annualInterestRate: Number(company.loan.interestRate),
    termWeeks: GAME_LENGTH_WEEKS,
    remainingBalance: Number(company.loan.remainingBalance),
  };

  return {
    id: company.id,
    weekNumber: company.weekNumber,
    gameLengthWeeks: GAME_LENGTH_WEEKS,
    cash: Number(company.cash),
    stage: getUnlockedStage(Number(company.cash)),
    status: company.status,
    loan,
    availableOrders: orders.map((order) => ({
      id: order.id,
      weekOffered: order.weekOffered,
      type: order.type as GeneratedOrder["type"],
      materialNeed: Number(order.materialNeed),
      deadlineWeeks: order.deadlineWeeks,
      payout: Number(order.payout),
    })),
  };
}

export async function getLatestRoundSummary(companyId: string): Promise<RoundSummary | null> {
  const db = getDb();
  const round = await db.round.findFirst({
    where: { companyId, status: "RESOLVED" },
    orderBy: { weekNumber: "desc" },
  });

  return (round?.summaryJson as unknown as RoundSummary) ?? null;
}

export interface CloseRoundResult {
  summary: RoundSummary;
}

/**
 * Resolves the company's current week: sums up ACCEPTED orders, charges the
 * loan, rolls a random event, persists the Round/GameEvent/Company/Loan
 * changes, expires the rest of the week's pool, and seeds next week's pool.
 * Order accept/reject itself is wired up in Phase 3 — until then this
 * resolves a round with whatever orders happen to be ACCEPTED (none, today).
 */
export async function closeRound(companyId: string): Promise<CloseRoundResult> {
  const db = getDb();

  return db.$transaction(async (tx) => {
    const company = await tx.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { loan: true },
    });

    if (!company.loan) {
      throw new Error(`Company ${companyId} has no loan record.`);
    }

    const acceptedOrders = await tx.order.findMany({
      where: { companyId, weekOffered: company.weekNumber, status: "ACCEPTED" },
    });

    const loan: LoanState = {
      principal: Number(company.loan.principal),
      annualInterestRate: Number(company.loan.interestRate),
      termWeeks: GAME_LENGTH_WEEKS,
      remainingBalance: Number(company.loan.remainingBalance),
    };

    const event = maybeGenerateRandomEvent();

    const summary = resolveRound({
      weekNumber: company.weekNumber,
      acceptedOrders: acceptedOrders.map((order) => ({
        payout: Number(order.payout),
        materialNeed: Number(order.materialNeed),
      })),
      employeeWageTotal: 0,
      warehouseRent: 0,
      loan,
      event,
    });

    await tx.round.create({
      data: {
        companyId,
        weekNumber: company.weekNumber,
        status: "RESOLVED",
        summaryJson: summary as unknown as object,
      },
    });

    if (event) {
      await tx.gameEvent.create({
        data: {
          companyId,
          weekNumber: company.weekNumber,
          type: event.type,
          effectJson: event as unknown as object,
        },
      });
    }

    await tx.order.updateMany({
      where: { companyId, weekOffered: company.weekNumber, status: "AVAILABLE" },
      data: { status: "EXPIRED" },
    });

    const nextWeekNumber = company.weekNumber + 1;

    await tx.loan.update({
      where: { companyId },
      data: { remainingBalance: summary.loanAfter.remainingBalance },
    });

    await tx.company.update({
      where: { id: companyId },
      data: {
        cash: Number(company.cash) + summary.netResult,
        weekNumber: nextWeekNumber,
      },
    });

    if (nextWeekNumber <= GAME_LENGTH_WEEKS) {
      const nextOrders = generateOrderPool(
        nextWeekNumber,
        createSeededRandom(hashSeed(companyId, nextWeekNumber)),
      );
      await tx.order.createMany({
        data: nextOrders.map((order) => ({
          companyId,
          weekOffered: order.weekOffered,
          type: order.type,
          materialNeed: order.materialNeed,
          deadlineWeeks: order.deadlineWeeks,
          payout: order.payout,
          status: "AVAILABLE",
        })),
      });
    }

    return { summary };
  });
}
