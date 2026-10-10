import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestDatabase } from "./helpers/test-db";

let database: Awaited<ReturnType<typeof startTestDatabase>>;

beforeAll(async () => {
  database = await startTestDatabase();
}, 30_000);

afterAll(async () => {
  await database.stop();
});

const { consumeRateLimit, rateLimitKey } = await import("../lib/rate-limit");

describe("consumeRateLimit", () => {
  it("allows requests up to the limit and blocks the next one", async () => {
    const key = rateLimitKey("test", "a@example.com");

    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consumeRateLimit(key, 3, 60));

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3].count).toBe(4);
    expect(results[3].retryAfterSeconds).toBeGreaterThan(0);
    expect(results[3].retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("tracks different keys independently", async () => {
    const first = rateLimitKey("test", "b@example.com");
    const second = rateLimitKey("test", "c@example.com");

    await consumeRateLimit(first, 1, 60);
    expect((await consumeRateLimit(first, 1, 60)).allowed).toBe(false);
    expect((await consumeRateLimit(second, 1, 60)).allowed).toBe(true);
  });

  it("starts a fresh window once the old one has elapsed", async () => {
    const key = rateLimitKey("test", "d@example.com");

    await consumeRateLimit(key, 1, 1);
    expect((await consumeRateLimit(key, 1, 1)).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1_200));
    const afterWindow = await consumeRateLimit(key, 1, 1);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.count).toBe(1);
  });

  it("counts concurrent requests exactly", async () => {
    const key = rateLimitKey("test", "e@example.com");

    const results = await Promise.all(Array.from({ length: 5 }, () => consumeRateLimit(key, 3, 60)));

    expect(results.filter((r) => r.allowed)).toHaveLength(3);
    expect(results.filter((r) => !r.allowed)).toHaveLength(2);
  });

  it("removes buckets that have been idle for more than a day", async () => {
    const { getDb } = await import("../lib/db");
    const db = getDb();
    const staleKey = rateLimitKey("test", "stale@example.com");
    await db.rateLimitBucket.create({
      data: { key: staleKey, count: 1, windowStart: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    });

    vi.spyOn(Math, "random").mockReturnValueOnce(0);
    await consumeRateLimit(rateLimitKey("test", "fresh@example.com"), 3, 60);

    expect(await db.rateLimitBucket.findUnique({ where: { key: staleKey } })).toBeNull();
  });

  it("does not put the raw value into the bucket key", () => {
    expect(rateLimitKey("login-email", "secret@example.com")).not.toContain("secret");
  });
});
