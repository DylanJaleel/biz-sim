import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_PORT = 55_433;
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${TEST_PORT}/postgres?sslmode=disable`;
process.env.DATABASE_URL = DATABASE_URL;

const projectRoot = path.resolve(import.meta.dirname, "..");

let pglite: PGlite;
let socketServer: PGLiteSocketServer;

beforeAll(async () => {
  pglite = await PGlite.create();
  socketServer = new PGLiteSocketServer({ db: pglite, port: TEST_PORT, host: "127.0.0.1", maxConnections: 5 });
  await socketServer.start();

  await promisify(execFile)(path.join(projectRoot, "node_modules", ".bin", "prisma"), ["db", "push", "--skip-generate"], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL },
  });
}, 30_000);

afterAll(async () => {
  await socketServer.stop();
  await pglite.close();
});

const { getDb } = await import("../lib/db");
const { DEMO_USER_EMAIL, STARTING_CASH } = await import("../lib/config");
const { closeRound, getDemoCompanyId, getLatestRoundSummary, loadCompanyState } = await import(
  "../lib/repository/company"
);

async function createCompany(email: string) {
  const db = getDb();
  const user = await db.user.create({ data: { email } });
  return db.company.create({
    data: {
      userId: user.id,
      name: "Test Co",
      cash: STARTING_CASH,
      stage: 1,
      weekNumber: 1,
      reputation: 50,
      status: "ACTIVE",
      loan: {
        create: {
          principal: 15_000,
          interestRate: 0.06,
          weeklyRate: 0.06 / 52,
          remainingBalance: 15_000,
        },
      },
    },
  });
}

describe("getDemoCompanyId", () => {
  it("throws a helpful error when no demo company exists yet", async () => {
    await expect(getDemoCompanyId()).rejects.toThrow(/npm run db:seed/);
  });

  it("resolves the seeded demo company's id", async () => {
    const company = await createCompany(DEMO_USER_EMAIL);
    await expect(getDemoCompanyId()).resolves.toBe(company.id);
  });
});

describe("loadCompanyState / closeRound", () => {
  let companyId: string;

  beforeAll(async () => {
    const company = await createCompany("repo-test@example.com");
    companyId = company.id;
  });

  it("generates this week's order pool on first load", async () => {
    const state = await loadCompanyState(companyId);
    expect(state.weekNumber).toBe(1);
    expect(state.cash).toBe(STARTING_CASH);
    expect(state.loan.remainingBalance).toBe(15_000);
    expect(state.availableOrders.length).toBeGreaterThan(0);
  });

  it("does not regenerate the pool on a second load", async () => {
    const first = await loadCompanyState(companyId);
    const second = await loadCompanyState(companyId);
    expect(second.availableOrders.map((o) => o.id)).toEqual(first.availableOrders.map((o) => o.id));
  });

  it("resolves a round, persists the summary, and advances the week", async () => {
    const before = await loadCompanyState(companyId);
    const acceptedOrder = before.availableOrders[0];

    const db = getDb();
    await db.order.update({ where: { id: acceptedOrder.id }, data: { status: "ACCEPTED" } });

    const { summary } = await closeRound(companyId);
    expect(summary.weekNumber).toBe(1);
    expect(summary.revenue).toBe(acceptedOrder.payout);

    const after = await loadCompanyState(companyId);
    expect(after.weekNumber).toBe(2);
    expect(after.cash).toBeCloseTo(before.cash + summary.netResult, 5);
    expect(after.loan.remainingBalance).toBeCloseTo(summary.loanAfter.remainingBalance, 5);
    expect(after.availableOrders.length).toBeGreaterThan(0);

    const latest = await getLatestRoundSummary(companyId);
    expect(latest?.weekNumber).toBe(1);
    expect(latest?.netResult).toBeCloseTo(summary.netResult, 5);
  });

  it("expires orders from the closed week that weren't accepted", async () => {
    const db = getDb();
    const expiredCount = await db.order.count({
      where: { companyId, weekOffered: 1, status: "EXPIRED" },
    });
    expect(expiredCount).toBeGreaterThan(0);

    const acceptedCount = await db.order.count({
      where: { companyId, weekOffered: 1, status: "ACCEPTED" },
    });
    expect(acceptedCount).toBe(1);
  });
});
