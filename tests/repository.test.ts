import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestDatabase } from "./helpers/test-db";

let database: Awaited<ReturnType<typeof startTestDatabase>>;

beforeAll(async () => {
  database = await startTestDatabase();
}, 30_000);

afterAll(async () => {
  await database.stop();
});

const { getDb } = await import("../lib/db");
const { GAME_LENGTH_WEEKS, SOLO_ORDER_CAPACITY_PER_WEEK, STARTING_CASH, STAGE_2_CASH_THRESHOLD } = await import(
  "../lib/config"
);
const {
  acceptOrder,
  closeRound,
  ensureCompanyForUser,
  GameActionError,
  getLatestRoundSummary,
  loadCompanyState,
  rejectOrder,
  restartGame,
  withdrawOrder,
} = await import("../lib/repository/company");

let emailCounter = 0;

/** A fresh user + company; the generated order pool is replaced by `orders` for deterministic tests. */
async function setupCompany(overrides: Prisma.CompanyUpdateInput = {}, loanRemaining?: number) {
  const db = getDb();
  const user = await db.user.create({ data: { email: `player-${emailCounter++}@example.com` } });
  const companyId = await ensureCompanyForUser(user.id);
  await loadCompanyState(companyId);
  await db.order.deleteMany({ where: { companyId } });
  await db.company.update({ where: { id: companyId }, data: overrides });
  if (loanRemaining !== undefined) {
    await db.loan.update({ where: { companyId }, data: { remainingBalance: loanRemaining } });
  }
  return { userId: user.id, companyId };
}

async function addOrder(
  companyId: string,
  order: { weekOffered?: number; deadlineWeeks?: number; payout?: number; materialNeed?: number } = {},
) {
  const created = await getDb().order.create({
    data: {
      companyId,
      weekOffered: order.weekOffered ?? 1,
      type: "repair",
      deadlineWeeks: order.deadlineWeeks ?? 1,
      payout: order.payout ?? 1_000,
      materialNeed: order.materialNeed ?? 300,
      status: "AVAILABLE",
    },
  });
  return created.id;
}

async function expectGameError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "GameActionError", code });
}

describe("ensureCompanyForUser", () => {
  it("creates a stage-1 company with the configured starting cash and loan on first call", async () => {
    const db = getDb();
    const user = await db.user.create({ data: { email: "first-login@example.com" } });

    const companyId = await ensureCompanyForUser(user.id);

    const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, include: { loan: true } });
    expect(Number(company.cash)).toBe(STARTING_CASH);
    expect(company.stage).toBe(1);
    expect(company.weekNumber).toBe(1);
    expect(company.status).toBe("ACTIVE");
    expect(Number(company.loan?.principal)).toBe(15_000);
    expect(Number(company.loan?.remainingBalance)).toBe(15_000);
  });

  it("returns the existing company on repeated calls", async () => {
    const db = getDb();
    const user = await db.user.create({ data: { email: "repeat@example.com" } });

    const first = await ensureCompanyForUser(user.id);
    const second = await ensureCompanyForUser(user.id);

    expect(second).toBe(first);
    expect(await db.company.count({ where: { userId: user.id } })).toBe(1);
  });
});

describe("loadCompanyState", () => {
  it("generates the week's order pool once and starts at stage 1", async () => {
    const db = getDb();
    const user = await db.user.create({ data: { email: "load-state@example.com" } });
    const companyId = await ensureCompanyForUser(user.id);

    const first = await loadCompanyState(companyId);
    const second = await loadCompanyState(companyId);

    expect(first.weekNumber).toBe(1);
    expect(first.stage).toBe(1);
    expect(first.status).toBe("ACTIVE");
    expect(first.orderCapacity).toBe(SOLO_ORDER_CAPACITY_PER_WEEK);
    expect(first.availableOrders.length).toBeGreaterThan(0);
    expect(second.availableOrders.map((o) => o.id)).toEqual(first.availableOrders.map((o) => o.id));
  });

  it("lists the most urgent orders first, then the most profitable", async () => {
    const { companyId } = await setupCompany();
    const late = await addOrder(companyId, { deadlineWeeks: 3, payout: 2_000, materialNeed: 100 });
    const urgentLowProfit = await addOrder(companyId, { deadlineWeeks: 1, payout: 500, materialNeed: 400 });
    const urgentHighProfit = await addOrder(companyId, { deadlineWeeks: 1, payout: 900, materialNeed: 100 });

    const state = await loadCompanyState(companyId);

    expect(state.availableOrders.map((o) => o.id)).toEqual([urgentHighProfit, urgentLowProfit, late]);
    expect(state.availableOrders.map((o) => o.remainingWeeks)).toEqual([1, 1, 3]);
  });
});

describe("accepting, rejecting and withdrawing orders", () => {
  it("accepts orders up to the weekly capacity and then refuses", async () => {
    const { companyId } = await setupCompany();
    const ids = [await addOrder(companyId), await addOrder(companyId), await addOrder(companyId)];

    await acceptOrder(companyId, ids[0]);
    await acceptOrder(companyId, ids[1]);
    await expectGameError(acceptOrder(companyId, ids[2]), "CAPACITY_REACHED");

    const state = await loadCompanyState(companyId);
    expect(state.acceptedOrders).toHaveLength(SOLO_ORDER_CAPACITY_PER_WEEK);
    expect(state.availableOrders.map((o) => o.id)).toEqual([ids[2]]);
  });

  it("frees capacity again when an accepted order is withdrawn", async () => {
    const { companyId } = await setupCompany();
    const [a, b, c] = [await addOrder(companyId), await addOrder(companyId), await addOrder(companyId)];
    await acceptOrder(companyId, a);
    await acceptOrder(companyId, b);

    await withdrawOrder(companyId, a);
    await acceptOrder(companyId, c);

    const state = await loadCompanyState(companyId);
    expect(state.acceptedOrders.map((o) => o.id).sort()).toEqual([b, c].sort());
    expect(state.availableOrders.map((o) => o.id)).toEqual([a]);
  });

  it("removes rejected orders from the pool for good", async () => {
    const { companyId } = await setupCompany();
    const id = await addOrder(companyId);

    await rejectOrder(companyId, id);

    expect((await loadCompanyState(companyId)).availableOrders).toEqual([]);
    await expectGameError(acceptOrder(companyId, id), "ORDER_UNAVAILABLE");
    await expectGameError(rejectOrder(companyId, id), "ORDER_UNAVAILABLE");
  });

  it("refuses to withdraw an order that was never accepted", async () => {
    const { companyId } = await setupCompany();
    const id = await addOrder(companyId);

    await expectGameError(withdrawOrder(companyId, id), "NOT_ACCEPTED");
  });

  it("does not let a player touch another company's orders", async () => {
    const mine = await setupCompany();
    const theirs = await setupCompany();
    const theirOrder = await addOrder(theirs.companyId);

    await expectGameError(acceptOrder(mine.companyId, theirOrder), "ORDER_NOT_FOUND");
    await expectGameError(rejectOrder(mine.companyId, theirOrder), "ORDER_NOT_FOUND");
    await expectGameError(withdrawOrder(mine.companyId, theirOrder), "ORDER_NOT_FOUND");
    expect((await loadCompanyState(theirs.companyId)).availableOrders).toHaveLength(1);
  });

  it("refuses orders whose deadline has passed", async () => {
    const { companyId } = await setupCompany({ weekNumber: 3 });
    const expired = await addOrder(companyId, { weekOffered: 1, deadlineWeeks: 2 });

    await expectGameError(acceptOrder(companyId, expired), "ORDER_UNAVAILABLE");
    const state = await loadCompanyState(companyId);
    expect(state.availableOrders.map((o) => o.id)).not.toContain(expired);
  });
});

describe("closeRound", () => {
  it("pays the accepted orders, completes them and moves on to the next week", async () => {
    const { companyId } = await setupCompany();
    const id = await addOrder(companyId, { payout: 1_000, materialNeed: 300 });
    await acceptOrder(companyId, id);

    const { summary, status } = await closeRound(companyId, 1);

    expect(status).toBe("ACTIVE");
    expect(summary.revenue).toBe(1_000);
    expect(summary.cashBefore).toBe(STARTING_CASH);

    const after = await loadCompanyState(companyId);
    expect(after.weekNumber).toBe(2);
    expect(after.cash).toBeCloseTo(summary.cashAfter, 5);
    expect(after.loan.remainingBalance).toBeCloseTo(summary.loanAfter.remainingBalance, 5);
    expect(after.acceptedOrders).toEqual([]);
    expect(after.availableOrders.length).toBeGreaterThan(0);

    const order = await getDb().order.findUniqueOrThrow({ where: { id } });
    expect(order.status).toBe("COMPLETED");
    expect((await getLatestRoundSummary(companyId))?.weekNumber).toBe(1);
  });

  it("does not pay an accepted order a second time in later weeks", async () => {
    const { companyId } = await setupCompany();
    await acceptOrder(companyId, await addOrder(companyId, { payout: 1_000, materialNeed: 300 }));

    await closeRound(companyId, 1);
    const { summary } = await closeRound(companyId, 2);

    expect(summary.revenue).toBe(0);
  });

  it("carries unaccepted orders over until their deadline, then expires them", async () => {
    const { companyId } = await setupCompany();
    const longDeadline = await addOrder(companyId, { deadlineWeeks: 3 });
    const shortDeadline = await addOrder(companyId, { deadlineWeeks: 1 });

    await closeRound(companyId, 1);
    let state = await loadCompanyState(companyId);
    expect(state.availableOrders.map((o) => o.id)).toContain(longDeadline);
    expect(state.availableOrders.map((o) => o.id)).not.toContain(shortDeadline);
    expect((await getDb().order.findUniqueOrThrow({ where: { id: shortDeadline } })).status).toBe("EXPIRED");

    await closeRound(companyId, 2);
    state = await loadCompanyState(companyId);
    expect(state.availableOrders.find((o) => o.id === longDeadline)?.remainingWeeks).toBe(1);

    await closeRound(companyId, 3);
    expect((await getDb().order.findUniqueOrThrow({ where: { id: longDeadline } })).status).toBe("EXPIRED");
  });

  it("rejects a repeated close for the same week instead of skipping ahead", async () => {
    const { companyId } = await setupCompany();

    await closeRound(companyId, 1);

    await expectGameError(closeRound(companyId, 1), "STALE_WEEK");
    expect((await loadCompanyState(companyId)).weekNumber).toBe(2);
  });

  it("unlocks stage 2 at the threshold and never takes a stage away again", async () => {
    const { companyId } = await setupCompany({ cash: STAGE_2_CASH_THRESHOLD });
    await acceptOrder(companyId, await addOrder(companyId, { payout: 2_000, materialNeed: 200 }));

    const first = await closeRound(companyId, 1);
    expect(first.stageBefore).toBe(1);
    expect(first.stageAfter).toBe(2);

    await getDb().company.update({ where: { id: companyId }, data: { cash: 100 } });
    const second = await closeRound(companyId, 2);

    expect(second.stageAfter).toBe(2);
    expect((await loadCompanyState(companyId)).stage).toBe(2);
  });

  it("ends in insolvency after two negative weeks and then blocks all actions", async () => {
    const { companyId } = await setupCompany({ cash: -1_000 });
    const pending = await addOrder(companyId, { deadlineWeeks: 4 });

    expect((await closeRound(companyId, 1)).status).toBe("ACTIVE");
    const second = await closeRound(companyId, 2);

    expect(second.status).toBe("INSOLVENT");
    const state = await loadCompanyState(companyId);
    expect(state.status).toBe("INSOLVENT");
    expect(state.weekNumber).toBe(2);
    expect(state.availableOrders).toEqual([]);
    await expectGameError(acceptOrder(companyId, pending), "GAME_OVER");
    await expectGameError(closeRound(companyId, 2), "GAME_OVER");
  });

  it("wins after the last week when the loan is repaid and the profit target is met", async () => {
    const lastInstallment = 15_000 / 52;
    const { companyId } = await setupCompany(
      { weekNumber: GAME_LENGTH_WEEKS, cash: STARTING_CASH + 10_000 },
      lastInstallment,
    );
    await acceptOrder(companyId, await addOrder(companyId, { weekOffered: GAME_LENGTH_WEEKS, payout: 2_000, materialNeed: 200 }));

    const result = await closeRound(companyId, GAME_LENGTH_WEEKS);

    expect(result.status).toBe("WON");
    const state = await loadCompanyState(companyId);
    expect(state.status).toBe("WON");
    expect(state.weekNumber).toBe(GAME_LENGTH_WEEKS);
    expect(state.loan.remainingBalance).toBe(0);
  });

  it("fails after the last week when the profit target is missed", async () => {
    const { companyId } = await setupCompany({ weekNumber: GAME_LENGTH_WEEKS, cash: STARTING_CASH + 1_000 }, 15_000 / 52);

    const result = await closeRound(companyId, GAME_LENGTH_WEEKS);

    expect(result.status).toBe("FAILED");
  });
});

describe("restartGame", () => {
  it("deletes the whole game and lets the same user start over", async () => {
    const { userId, companyId } = await setupCompany();
    await acceptOrder(companyId, await addOrder(companyId));
    await closeRound(companyId, 1);

    await restartGame(companyId);

    const db = getDb();
    expect(await db.company.count({ where: { id: companyId } })).toBe(0);
    expect(await db.order.count({ where: { companyId } })).toBe(0);
    expect(await db.round.count({ where: { companyId } })).toBe(0);
    expect(await db.loan.count({ where: { companyId } })).toBe(0);

    const freshId = await ensureCompanyForUser(userId);
    expect(freshId).not.toBe(companyId);
    const fresh = await loadCompanyState(freshId);
    expect(fresh.weekNumber).toBe(1);
    expect(fresh.cash).toBe(STARTING_CASH);
  });
});

// Last on purpose: the once-mocks below replace company.findUnique/create on the
// shared client; the spies then delegate to the real methods.
describe("ensureCompanyForUser race", () => {
  it("recovers when a concurrent first login created the company in between", async () => {
    const db = getDb();
    const user = await db.user.create({ data: { email: "race@example.com" } });
    const winner = await ensureCompanyForUser(user.id);

    // Simulate losing the race: the existence check misses the row the other
    // request just inserted, and create() reports the unique userId violation.
    // (Mocked rather than provoked: PGlite's socket server can't recover from
    // real database-level errors, which would crash the engine.)
    vi.spyOn(db.company, "findUnique").mockResolvedValueOnce(null);
    vi.spyOn(db.company, "create").mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const loser = await ensureCompanyForUser(user.id);

    expect(loser).toBe(winner);
    expect(await db.company.count({ where: { userId: user.id } })).toBe(1);
    expect(GameActionError).toBeDefined();
  });
});
