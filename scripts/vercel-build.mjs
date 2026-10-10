// Build entry point for Vercel (Vercel prefers a `vercel-build` script over `build`).
//
// Production deployments apply pending database migrations before building.
// Preview deployments deliberately do NOT migrate: they must never touch the
// production database. Give previews their own database and run
// `npm run db:deploy` against it yourself (see docs/deployment-vercel.md).
import { spawnSync } from "node:child_process";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VERCEL_ENV === "production") {
  // Migrations need a direct (non-pooled) connection: PgBouncer-style poolers
  // break Prisma's advisory locks.
  const migrateUrl =
    process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

  if (!migrateUrl) {
    console.error("Production build needs DATABASE_URL (or MIGRATE_DATABASE_URL) to apply migrations.");
    process.exit(1);
  }

  console.log("Applying database migrations…");
  run("prisma", ["migrate", "deploy"], { DATABASE_URL: migrateUrl });
} else if (process.env.VERCEL_ENV === "preview") {
  console.log("Preview build: skipping database migrations.");
}

run("next", ["build"]);
