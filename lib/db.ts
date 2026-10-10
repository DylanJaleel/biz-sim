import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * Lazily creates the Prisma Client so merely importing this module (e.g. at
 * build time, before DATABASE_URL is known) never touches the database.
 * Local dev points DATABASE_URL at the PGlite socket server (`npm run dev`);
 * production points it at a managed Postgres instance.
 */
export function getDb(): PrismaClient {
  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = new PrismaClient();
  }
  return globalThis.prismaGlobal;
}
