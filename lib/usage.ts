import type { PrismaClient } from "@prisma/client";

// Datenbank-Kosten im Blick behalten. Neon rechnet im Launch-Plan nach
// Nutzung ab: Rechenzeit, solange die Datenbank wach ist (sie schläft nach
// fünf Minuten ohne Anfrage ein), Speicher und Datenübertragung. Jede
// Server-Instanz zählt hier mit, wann sie Anfragen stellt und wie viele
// Spielstand-Bytes über die Leitung gehen, und schreibt das gesammelt in
// DbUsage. Die Zahlen sind eine vorsichtige Schätzung: laufen mehrere
// Instanzen gleichzeitig, zählt jede ihre eigene Wachzeit, die Schätzung
// liegt dann eher zu hoch als zu niedrig.

/** Preise laut Neon Launch-Plan (Stand der Einrichtung), in US-Dollar. */
export const NEON_PRICES = {
  computePerCuHour: 0.106,
  storagePerGbMonth: 0.35,
  transferIncludedGb: 100,
  transferPerGb: 0.1,
};

/** Nach so vielen Sekunden ohne Anfrage schläft die Datenbank ein. */
export const IDLE_SECONDS = 300;

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Rechengröße der Datenbank in CU. Sollte zur Einstellung bei Neon passen (empfohlen: fest 0,25 CU). */
export const ASSUMED_CU = numberFromEnv("NEON_CU", 0.25);
/** Monatsbudget in US-Dollar. Ist es erreicht, pausieren Spielzüge bis zum Monatsende. */
export const MONTHLY_BUDGET_USD = numberFromEnv("DB_BUDGET_USD", 5);
/** Ab diesem Anteil der Hochrechnung am Budget gibt es eine Warnung. */
export const WARN_SHARE = 0.8;

const FLUSH_MS = 15_000;

interface Pending {
  activeMs: number;
  bytesRead: number;
  bytesWritten: number;
  queries: number;
  lastQueryAt: number | null;
  lastFlushAt: number;
  flushing: boolean;
  db: PrismaClient | null;
}

declare global {
  var dbUsagePending: Pending | undefined;
}

function pending(): Pending {
  globalThis.dbUsagePending ??= { activeMs: 0, bytesRead: 0, bytesWritten: 0, queries: 0, lastQueryAt: null, lastFlushAt: Date.now(), flushing: false, db: null };
  return globalThis.dbUsagePending;
}

export function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

/**
 * Called for every database query. A burst of queries keeps the database
 * awake from the first to the last query plus the idle tail, so each query
 * adds the gap to the previous one, at most the idle tail.
 */
export function noteQuery(now = Date.now()): void {
  const p = pending();
  const gap = p.lastQueryAt === null ? Infinity : now - p.lastQueryAt;
  p.activeMs += Math.min(gap, IDLE_SECONDS * 1000);
  p.lastQueryAt = now;
  p.queries += 1;
  if (p.db && !p.flushing && now - p.lastFlushAt > FLUSH_MS) void flushUsage(p.db);
}

export function noteBytes(kind: "read" | "written", bytes: number): void {
  const p = pending();
  if (kind === "read") p.bytesRead += bytes;
  else p.bytesWritten += bytes;
}

/** Hooks the counter into a Prisma client created with query events. */
export function trackClient(db: PrismaClient): void {
  pending().db = db;
  (db as unknown as { $on: (event: "query", cb: () => void) => void }).$on("query", () => noteQuery());
}

/** Flushes when the last flush is a while ago; call it at the end of a request so a frozen instance loses little. */
export async function flushIfDue(db: PrismaClient): Promise<void> {
  if (Date.now() - pending().lastFlushAt > FLUSH_MS) await flushUsage(db);
}

/** Writes what this instance counted since the last flush. */
export async function flushUsage(db: PrismaClient): Promise<void> {
  const p = pending();
  if (p.flushing || (p.activeMs === 0 && p.bytesRead === 0 && p.bytesWritten === 0)) return;
  p.flushing = true;
  const batch = { activeSeconds: Math.round(p.activeMs / 1000), bytesRead: BigInt(p.bytesRead), bytesWritten: BigInt(p.bytesWritten), queries: p.queries };
  p.activeMs = p.bytesRead = p.bytesWritten = p.queries = 0;
  p.lastFlushAt = Date.now();
  try {
    const month = monthKey();
    const lastActiveAt = new Date();
    await db.dbUsage.upsert({
      where: { month },
      create: { month, ...batch, lastActiveAt },
      update: {
        activeSeconds: { increment: batch.activeSeconds },
        bytesRead: { increment: batch.bytesRead },
        bytesWritten: { increment: batch.bytesWritten },
        queries: { increment: batch.queries },
        lastActiveAt,
      },
    });
  } catch {
    // Counting must never break the game; this batch is simply lost.
  } finally {
    p.flushing = false;
  }
}

export interface UsageRow {
  activeSeconds: number;
  bytesRead: bigint;
  bytesWritten: bigint;
}

export interface CostEstimate {
  month: string;
  activeHours: number;
  transferGb: number;
  storageGb: number;
  computeUsd: number;
  storageUsd: number;
  transferUsd: number;
  totalUsd: number;
  /** The month-to-date cost scaled to the whole month. */
  projectedUsd: number;
  budgetUsd: number;
  status: "ok" | "warn" | "stopped";
}

function monthFraction(now: Date): number {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  // At least one day, so the first hours of a month don't explode the projection.
  return Math.min(1, Math.max((now.getTime() - start) / (end - start), 86_400_000 / (end - start)));
}

export function estimateCost(row: UsageRow | null, storageBytes: number, now = new Date(), budgetUsd = MONTHLY_BUDGET_USD, cu = ASSUMED_CU): CostEstimate {
  const activeHours = (row?.activeSeconds ?? 0) / 3600;
  const transferGb = Number((row?.bytesRead ?? BigInt(0)) + (row?.bytesWritten ?? BigInt(0))) / 1e9;
  const storageGb = storageBytes / 1e9;
  const fraction = monthFraction(now);
  const computeUsd = activeHours * cu * NEON_PRICES.computePerCuHour;
  // Storage is billed over the month; so far only the elapsed part of it.
  const storageUsd = storageGb * NEON_PRICES.storagePerGbMonth * fraction;
  const transferUsd = Math.max(0, transferGb - NEON_PRICES.transferIncludedGb) * NEON_PRICES.transferPerGb;
  const totalUsd = computeUsd + storageUsd + transferUsd;
  const projectedUsd = (computeUsd + transferUsd) / fraction + storageGb * NEON_PRICES.storagePerGbMonth;
  const status = totalUsd >= budgetUsd ? "stopped" : projectedUsd >= budgetUsd * WARN_SHARE ? "warn" : "ok";
  return { month: monthKey(now), activeHours, transferGb, storageGb, computeUsd, storageUsd, transferUsd, totalUsd, projectedUsd, budgetUsd, status };
}

let gate: { month: string; checkedAt: number; stopped: boolean } | null = null;

/** True when this month's estimated cost has reached the budget. Checked at most once a minute. */
export async function budgetReached(db: PrismaClient): Promise<boolean> {
  const month = monthKey();
  if (gate && gate.month === month && Date.now() - gate.checkedAt < 60_000) return gate.stopped;
  const row = await db.dbUsage.findUnique({ where: { month }, select: { activeSeconds: true, bytesRead: true, bytesWritten: true } });
  const stopped = estimateCost(row, 0).totalUsd >= MONTHLY_BUDGET_USD;
  gate = { month, checkedAt: Date.now(), stopped };
  return stopped;
}

/** Everything the account page shows: this month's numbers and the database size. */
export async function usageReport(db: PrismaClient): Promise<CostEstimate> {
  await flushUsage(db);
  const row = await db.dbUsage.findUnique({ where: { month: monthKey() } });
  const size = await db.$queryRaw<{ size: bigint }[]>`SELECT pg_database_size(current_database()) AS size`;
  return estimateCost(row, Number(size[0]?.size ?? 0));
}
