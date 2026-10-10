import { connection } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Deployment smoke test: reports which required settings are present (never
 * their values) and whether the database answers. Returns 503 when the app
 * can't work, so it can also back an uptime monitor.
 */
export async function GET() {
  // Opt out of prerendering: this must run against the live environment.
  await connection();

  const checks = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.AUTH_SECRET),
    emailProvider: Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== "production",
    database: false,
  };

  if (checks.databaseUrl) {
    try {
      await getDb().$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }
  }

  const ok = Object.values(checks).every(Boolean);
  return Response.json({ ok, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
