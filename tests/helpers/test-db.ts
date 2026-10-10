import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");

/**
 * Boots an in-process PGlite Postgres, applies the real versioned migrations
 * and points DATABASE_URL (read lazily by lib/db.ts) at it. Uses an
 * OS-assigned port so test files can run in parallel.
 *
 * The migration step must be async: a synchronous child process would block
 * the event loop that serves the in-process socket server.
 */
export async function startTestDatabase() {
  const pglite = await PGlite.create();
  const server = new PGLiteSocketServer({ db: pglite, port: 0, host: "127.0.0.1", maxConnections: 5 });
  await server.start();

  // getServerConn() is "host:port"; `port` itself is private on the class.
  const databaseUrl = `postgresql://postgres:postgres@${server.getServerConn()}/postgres?sslmode=disable`;
  process.env.DATABASE_URL = databaseUrl;

  await promisify(execFile)(path.join(projectRoot, "node_modules", ".bin", "prisma"), ["migrate", "deploy"], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  return {
    async stop() {
      await server.stop();
      await pglite.close();
    },
  };
}
