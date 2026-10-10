import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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
const { STARTING_CASH } = await import("../lib/config");
const { closeRound, ensureCompanyForUser, getLatestRoundSummary, loadCompanyState } = await import(
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

describe("ensureCompanyForUser", () => {
  it("creates a company with the configured starting cash and loan on first call", async () => {
    const db = getDb();
    const user = await db.user.create({ data: { email: "first-login@example.com" } });

    const companyId = await ensureCompanyForUser(user.id);

    const company = await db.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { loan: true },
    });
    expect(Number(company.cash)).toBe(STARTING_CASH);
    expect(company.weekNumber).toBe(1);
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

// Last on purpose: the spies below replace company.findUnique/create on the shared
// client for the rest of the file.
describe("ensureCompanyForUser race", () => {
  it("recovers when a concurrent first login created the company in between", async () => {
    const db = getDb();
    const user = await db.user.create({ data: { email: "race@example.com" } });
    const winner = await ensureCompanyForUser(user.id);

    // Simulate losing the race: the existence check misses the row the other
    // request just inserted, and create() reports the unique userId violation.
    // The once-mocks are consumed by this call; the spies then delegate to the
    // real methods. (The error is mocked rather than provoked: PGlite's socket server can't
    // recover from real database-level errors, which would crash the engine.)
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
  });
});
