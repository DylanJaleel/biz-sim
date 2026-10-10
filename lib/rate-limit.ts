import { createHash } from "node:crypto";
import { getDb } from "./db";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
}

/** Stable, bounded bucket key that doesn't store the raw value (email/IP). */
export function rateLimitKey(scope: string, value: string): string {
  return `${scope}:${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}

/**
 * Fixed-window counter shared by all serverless instances through the
 * database. A single atomic upsert increments the bucket or starts a fresh
 * window, so concurrent requests can't slip past the limit.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const db = getDb();

  const [row] = await db.$queryRaw<{ count: number; elapsed: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStart" <= now() - make_interval(secs => ${windowSeconds}::double precision)
        THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" <= now() - make_interval(secs => ${windowSeconds}::double precision)
        THEN now() ELSE "RateLimitBucket"."windowStart" END
    RETURNING "count", EXTRACT(EPOCH FROM (now() - "windowStart"))::float8 AS elapsed`;

  // Buckets of long-gone visitors would otherwise pile up forever.
  if (Math.random() < 0.02) {
    await db.rateLimitBucket.deleteMany({
      where: { windowStart: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  }

  const allowed = row.count <= limit;
  return {
    allowed,
    count: row.count,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(windowSeconds - row.elapsed)),
  };
}
