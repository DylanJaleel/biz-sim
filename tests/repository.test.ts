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
const config = await import("../lib/config");
const {
  acceptOrder,
  closeRound,
  ensureCompanyForUser,
  fireEmployee,
  GameActionError,
  getLatestRoundSummary,
  invest,
  loadCompanyState,
  rejectOrder,
  restartGame,
  withdrawOrder,
} = await import("../lib/repository/company");

const { STARTING_CASH, EMPLOYEE_RECRUITING_FEE, TOOL_LEVELS } = config;
const NO_BAD_LUCK = () => 1;

let emailCounter = 0;

/**
 * A fresh user + company. The generated order pool and the week's incident
 * are removed so tests control exactly which orders and events exist.
 */
async function setupCompany(overrides: Prisma.CompanyUpdateInput = {}, loanRemaining?: number) {
  const db = getDb();
  const user = await db.user.create({ data: { email: `player-${emailCounter++}@example.com` } });
  const companyId = await ensureCompanyForUser(user.id);
  await loadCompanyState(companyId);
  await db.order.deleteMany({ where: { companyId } });
  await db.gameEvent.deleteMany({ where: { companyId } });
  await db.company.update({ where: { id: companyId }, data: overrides });
  if (loanRemaining !== undefined) {
    await db.loan.update({ where: { companyId }, data: { remainingBalance: loanRemaining } });
  }
  return { userId: user.id, companyId };
}

async function addOrder(
  companyId: string,
  order: {
    weekOffered?: number;
    deadlineWeeks?: number;
    payout?: number;
    materialNeed?: number;
    hours?: number;
    tier?: number;
  } = {},
) {
  const created = await getDb().order.create({
    data: {
      companyId,
      weekOffered: order.weekOffered ?? 1,
      type: "repair",
      tier: order.tier ?? 1,
      laborHours: order.hours ?? 10,
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
  it("creates an open-ended solo company with the configured start capital and loan on first call", async () => {
    const db = getDb();
    const user = await db.user.create({ data: { email: "first-login@example.com" } });

    const companyId = await ensureCompanyForUser(user.id);

    const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, include: { loan: true } });
    expect(Number(company.cash)).toBe(STARTING_CASH);
    expect(company.weekNumber).toBe(1);
    expect(company.status).toBe("ACTIVE");
    expect(company.toolLevel).toBe(1);
    expect(company.workshopLevel).toBe(1);
    expect(company.vehicles).toBe(1);
    expect(company.reputation).toBe(config.STARTING_REPUTATION);
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
  it("generates the week's offers once and starts solo with one person's hours", async () => {
    const db = getDb();
    const user = await db.user.create({ data: { email: "load-state@example.com" } });
    const companyId = await ensureCompanyForUser(user.id);

    const first = await loadCompanyState(companyId);
    const second = await loadCompanyState(companyId);

    expect(first.weekNumber).toBe(1);
    expect(first.status).toBe("ACTIVE");
    expect(first.team).toHaveLength(1);
    expect(first.capacity.total).toBeCloseTo(config.WORK_HOURS_PER_PERSON * TOOL_LEVELS[0].efficiency, 5);
    expect(first.capacity.used).toBe(0);
    expect(first.availableOrders.length).toBeGreaterThan(0);
    expect(first.availableOrders.every((order) => order.tier === 1)).toBe(true);
    expect(second.availableOrders.map((o) => o.id)).toEqual(first.availableOrders.map((o) => o.id));
    expect(first.preview.profit).toBeLessThan(0); // fixed costs without any work
  });

  it("lists the most urgent orders first, then the best margin per hour", async () => {
    const { companyId } = await setupCompany();
    const late = await addOrder(companyId, { deadlineWeeks: 3, payout: 2_000, materialNeed: 100, hours: 10 });
    const urgentLowMargin = await addOrder(companyId, { deadlineWeeks: 1, payout: 500, materialNeed: 400, hours: 10 });
    const urgentHighMargin = await addOrder(companyId, { deadlineWeeks: 1, payout: 900, materialNeed: 100, hours: 10 });

    const state = await loadCompanyState(companyId);

    expect(state.availableOrders.map((o) => o.id)).toEqual([urgentHighMargin, urgentLowMargin, late]);
    expect(state.availableOrders[0].marginPerHour).toBeCloseTo(80, 5);
  });

  it("keeps orders above the tool level visible but locked", async () => {
    const { companyId } = await setupCompany();
    const simple = await addOrder(companyId, { tier: 1 });
    const premium = await addOrder(companyId, { tier: 3 });

    const state = await loadCompanyState(companyId);

    expect(state.availableOrders.map((o) => o.id)).toEqual([simple]);
    expect(state.lockedOrders.map((o) => o.id)).toEqual([premium]);
  });
});

describe("accepting, rejecting and withdrawing orders", () => {
  it("accepts orders until the hours of the week are used up and then refuses", async () => {
    const { companyId } = await setupCompany(); // 28 h
    const [a, b, c] = [
      await addOrder(companyId, { hours: 14 }),
      await addOrder(companyId, { hours: 14 }),
      await addOrder(companyId, { hours: 2 }),
    ];

    await acceptOrder(companyId, a);
    await acceptOrder(companyId, b);
    await expectGameError(acceptOrder(companyId, c), "NOT_ENOUGH_HOURS");

    const state = await loadCompanyState(companyId);
    expect(state.acceptedOrders).toHaveLength(2);
    expect(state.capacity.used).toBe(28);
    expect(state.capacity.remaining).toBeCloseTo(0, 5);
  });

  it("refuses jobs that need better tools", async () => {
    const { companyId } = await setupCompany();
    const premium = await addOrder(companyId, { tier: 2, hours: 5 });

    await expectGameError(acceptOrder(companyId, premium), "TOOL_LEVEL_TOO_LOW");
  });

  it("frees hours again when an accepted order is withdrawn", async () => {
    const { companyId } = await setupCompany();
    const [a, b, c] = [
      await addOrder(companyId, { hours: 14 }),
      await addOrder(companyId, { hours: 14 }),
      await addOrder(companyId, { hours: 14 }),
    ];
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

describe("investments and staff", () => {
  it("books a hire immediately, starts the employee next week and adds hours then", async () => {
    const { companyId } = await setupCompany();

    await invest(companyId, "hire");

    const state = await loadCompanyState(companyId);
    expect(state.cash).toBe(STARTING_CASH - EMPLOYEE_RECRUITING_FEE);
    expect(state.team.map((member) => member.status)).toEqual(["active", "starting"]);
    expect(state.team[1].startsWeek).toBe(2);
    expect(state.capacity.total).toBeCloseTo(config.WORK_HOURS_PER_PERSON * TOOL_LEVELS[0].efficiency, 5);
    const ledger = await getDb().ledgerEntry.findMany({ where: { companyId } });
    expect(ledger.map((entry) => Number(entry.amount))).toEqual([-EMPLOYEE_RECRUITING_FEE]);

    await closeRound(companyId, 1, NO_BAD_LUCK);
    const next = await loadCompanyState(companyId);
    expect(next.team.map((member) => member.status)).toEqual(["active", "active"]);
    expect(next.team[1].onboarding).toBe(true);
    expect(next.capacity.total).toBeGreaterThan(config.WORK_HOURS_PER_PERSON * TOOL_LEVELS[0].efficiency);
  });

  it("refuses investments the player can't afford", async () => {
    const { companyId } = await setupCompany({ cash: 1_000 });

    await expectGameError(invest(companyId, "hire"), "INVESTMENT_REFUSED");
    await expectGameError(invest(companyId, "tools"), "INVESTMENT_REFUSED");
    expect((await loadCompanyState(companyId)).cash).toBe(1_000);
    expect(await getDb().ledgerEntry.count({ where: { companyId } })).toBe(0);
  });

  it("only allows a vehicle when somebody is without one, and the workshop limits the team", async () => {
    const { companyId } = await setupCompany({ cash: 100_000 });

    await expectGameError(invest(companyId, "vehicle"), "INVESTMENT_REFUSED");

    await invest(companyId, "hire");
    await invest(companyId, "vehicle");
    await invest(companyId, "hire"); // owner + 2 = 3 seats = small workshop
    await expectGameError(invest(companyId, "hire"), "INVESTMENT_REFUSED");

    await invest(companyId, "workshop");
    await invest(companyId, "hire");

    const state = await loadCompanyState(companyId);
    expect(state.business.vehicles).toBe(2);
    expect(state.business.workshopLevel).toBe(2);
    expect(state.team).toHaveLength(4);
  });

  it("unlocks better jobs and more productive hours with a tool upgrade", async () => {
    const { companyId } = await setupCompany({ cash: 30_000 });
    const premium = await addOrder(companyId, { tier: 2, hours: 5 });
    const before = await loadCompanyState(companyId);
    expect(before.lockedOrders.map((o) => o.id)).toEqual([premium]);

    await invest(companyId, "tools");

    const after = await loadCompanyState(companyId);
    expect(after.cash).toBe(30_000 - TOOL_LEVELS[1].upgradeCost);
    expect(after.capacity.total).toBeGreaterThan(before.capacity.total);
    expect(after.availableOrders.map((o) => o.id)).toEqual([premium]);
    await acceptOrder(companyId, premium);
  });

  it("cancels a hire that hasn't started, but lets a working employee go only after the notice period", async () => {
    const { companyId } = await setupCompany();
    await invest(companyId, "hire");
    const [future] = await getDb().employee.findMany({ where: { companyId } });

    await fireEmployee(companyId, future.id);
    expect(await getDb().employee.count({ where: { companyId } })).toBe(0);

    await invest(companyId, "hire");
    await closeRound(companyId, 1, NO_BAD_LUCK); // the hire starts in week 2
    const [working] = await getDb().employee.findMany({ where: { companyId } });

    await fireEmployee(companyId, working.id);
    const state = await loadCompanyState(companyId);
    expect(state.team[1]).toMatchObject({ status: "notice", endsWeek: 2 + config.EMPLOYEE_NOTICE_WEEKS });
    await expectGameError(fireEmployee(companyId, working.id), "EMPLOYEE_NOT_FOUND");
  });

  it("does not let a player fire another company's employee", async () => {
    const mine = await setupCompany();
    const theirs = await setupCompany();
    await invest(theirs.companyId, "hire");
    const [theirEmployee] = await getDb().employee.findMany({ where: { companyId: theirs.companyId } });

    await expectGameError(fireEmployee(mine.companyId, theirEmployee.id), "EMPLOYEE_NOT_FOUND");
  });
});

describe("closeRound", () => {
  it("pays the accepted orders, books the costs and moves on to the next week", async () => {
    const { companyId } = await setupCompany();
    const id = await addOrder(companyId, { payout: 1_000, materialNeed: 300, hours: 20 });
    await acceptOrder(companyId, id);

    const { summary, status } = await closeRound(companyId, 1, NO_BAD_LUCK);

    expect(status).toBe("ACTIVE");
    expect(summary.revenue).toBe(1_000);
    expect(summary.completedHours).toBe(20);
    expect(summary.cashBefore).toBe(STARTING_CASH);
    expect(summary.items.find((item) => item.key === "material")?.amount).toBe(-300);
    expect(summary.profit).toBeCloseTo(summary.items.reduce((sum, item) => sum + item.amount, 1_000), 5);
    expect(summary.cashAfter).toBeCloseTo(summary.cashBefore + summary.profit - summary.loanPrincipalPayment, 5);

    const after = await loadCompanyState(companyId);
    expect(after.weekNumber).toBe(2);
    expect(after.cash).toBeCloseTo(summary.cashAfter, 5);
    expect(after.loan.remainingBalance).toBeCloseTo(summary.loanAfter.remainingBalance, 5);
    expect(after.business.reputation).toBeCloseTo(summary.reputationAfter, 5);
    expect(after.acceptedOrders).toEqual([]);
    expect(after.availableOrders.length).toBeGreaterThan(0);
    expect((await getDb().order.findUniqueOrThrow({ where: { id } })).status).toBe("COMPLETED");
    expect((await getLatestRoundSummary(companyId))?.weekNumber).toBe(1);
  });

  it("lists this week's investments in the summary without counting them twice", async () => {
    const { companyId } = await setupCompany();
    await invest(companyId, "hire");

    const { summary } = await closeRound(companyId, 1, NO_BAD_LUCK);

    expect(summary.investmentTotal).toBe(-EMPLOYEE_RECRUITING_FEE);
    expect(summary.cashBefore).toBe(STARTING_CASH);
    expect(summary.cashAfter).toBeCloseTo(
      STARTING_CASH + summary.profit - summary.loanPrincipalPayment - EMPLOYEE_RECRUITING_FEE,
      5,
    );
    // the profit of the week is not reduced by the investment
    expect(summary.profit).toBeCloseTo(summary.items.reduce((sum, item) => sum + item.amount, 0), 5);
  });

  it("does not pay an accepted order a second time in later weeks", async () => {
    const { companyId } = await setupCompany();
    await acceptOrder(companyId, await addOrder(companyId, { payout: 1_000, materialNeed: 300 }));

    await closeRound(companyId, 1, NO_BAD_LUCK);
    const { summary } = await closeRound(companyId, 2, NO_BAD_LUCK);

    expect(summary.revenue).toBe(0);
  });

  it("carries unaccepted orders over until their deadline, then expires them", async () => {
    const { companyId } = await setupCompany();
    const longDeadline = await addOrder(companyId, { deadlineWeeks: 3 });
    const shortDeadline = await addOrder(companyId, { deadlineWeeks: 1 });

    await closeRound(companyId, 1, NO_BAD_LUCK);
    let state = await loadCompanyState(companyId);
    expect(state.availableOrders.map((o) => o.id)).toContain(longDeadline);
    expect(state.availableOrders.map((o) => o.id)).not.toContain(shortDeadline);
    expect((await getDb().order.findUniqueOrThrow({ where: { id: shortDeadline } })).status).toBe("EXPIRED");

    await closeRound(companyId, 2, NO_BAD_LUCK);
    state = await loadCompanyState(companyId);
    expect(state.availableOrders.find((o) => o.id === longDeadline)?.remainingWeeks).toBe(1);

    await closeRound(companyId, 3, NO_BAD_LUCK);
    expect((await getDb().order.findUniqueOrThrow({ where: { id: longDeadline } })).status).toBe("EXPIRED");
  });

  it("rejects a repeated close for the same week instead of skipping ahead", async () => {
    const { companyId } = await setupCompany();

    await closeRound(companyId, 1, NO_BAD_LUCK);

    await expectGameError(closeRound(companyId, 1, NO_BAD_LUCK), "STALE_WEEK");
    expect((await loadCompanyState(companyId)).weekNumber).toBe(2);
  });

  it("applies the incident of the week (here: a vehicle breakdown) and shows it in the state beforehand", async () => {
    const { companyId } = await setupCompany();
    await getDb().gameEvent.create({
      data: {
        companyId,
        weekNumber: 1,
        type: "breakdown",
        effectJson: { type: "breakdown", repairCost: 800, description: "Der Transporter hat eine Panne." },
      },
    });

    expect((await loadCompanyState(companyId)).event?.type).toBe("breakdown");
    const { summary } = await closeRound(companyId, 1, NO_BAD_LUCK);

    expect(summary.eventDescription).toBe("Der Transporter hat eine Panne.");
    expect(summary.items.find((item) => item.key === "repair")?.amount).toBe(-800);
  });

  it("rolls a defect with bad luck: refund and reputation loss", async () => {
    const { companyId } = await setupCompany();
    await acceptOrder(companyId, await addOrder(companyId, { payout: 1_000, hours: 10 }));

    const { summary } = await closeRound(companyId, 1, () => 0);

    expect(summary.defects).toBe(1);
    expect(summary.items.find((item) => item.key === "defects")?.amount).toBeCloseTo(-300, 5);
    expect(summary.reputationAfter).toBeLessThan(summary.reputationBefore);
  });

  it("ends in insolvency when the overdraft limit is exceeded and then blocks all actions", async () => {
    const { companyId } = await setupCompany({ cash: -config.OVERDRAFT_LIMIT + 100 });
    const pending = await addOrder(companyId, { deadlineWeeks: 4 });

    const result = await closeRound(companyId, 1, NO_BAD_LUCK);

    expect(result.status).toBe("INSOLVENT");
    const state = await loadCompanyState(companyId);
    expect(state.status).toBe("INSOLVENT");
    expect(state.weekNumber).toBe(1);
    expect(state.availableOrders).toEqual([]);
    await expectGameError(acceptOrder(companyId, pending), "GAME_OVER");
    await expectGameError(invest(companyId, "hire"), "GAME_OVER");
    await expectGameError(closeRound(companyId, 1, NO_BAD_LUCK), "GAME_OVER");
  });

  it("tolerates a week in the red within the overdraft limit and charges overdraft interest the week after", async () => {
    const { companyId } = await setupCompany({ cash: 200 });

    const first = await closeRound(companyId, 1, NO_BAD_LUCK);
    expect(first.summary.cashAfter).toBeLessThan(0);
    expect(first.summary.cashAfter).toBeGreaterThan(-config.OVERDRAFT_LIMIT);
    expect(first.status).toBe("ACTIVE");

    const second = await closeRound(companyId, 2, NO_BAD_LUCK);
    expect(second.summary.items.some((item) => item.key === "overdraft")).toBe(true);
  });
});

describe("restartGame", () => {
  it("deletes the whole game and lets the same user start over", async () => {
    const { userId, companyId } = await setupCompany();
    await invest(companyId, "hire");
    await acceptOrder(companyId, await addOrder(companyId));
    await closeRound(companyId, 1, NO_BAD_LUCK);

    await restartGame(companyId);

    const db = getDb();
    expect(await db.company.count({ where: { id: companyId } })).toBe(0);
    for (const table of [db.order, db.round, db.loan, db.employee, db.ledgerEntry, db.gameEvent] as const) {
      expect(await (table as typeof db.order).count({ where: { companyId } })).toBe(0);
    }

    const freshId = await ensureCompanyForUser(userId);
    expect(freshId).not.toBe(companyId);
    const fresh = await loadCompanyState(freshId);
    expect(fresh.weekNumber).toBe(1);
    expect(fresh.cash).toBe(STARTING_CASH);
    expect(fresh.team).toHaveLength(1);
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
