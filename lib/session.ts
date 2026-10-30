import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Data-access-layer entry point: every page/action that touches player data
 * goes through here instead of trusting the proxy's optimistic cookie check.
 * Reads the session cookie, so callers must sit behind <Suspense> (Cache
 * Components).
 */
export async function requireUser() {
  // Auth.js may re-encrypt the session token, which draws random bytes. Mark
  // the render as request-time first so prefetches never prerender this part.
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}
