import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ensureCompanyForUser } from "@/lib/repository/company";

/**
 * Data-access-layer entry point: every page/action that touches player data
 * goes through here instead of trusting the proxy's optimistic cookie check.
 * Reads the session cookie, so callers must sit behind <Suspense> (Cache
 * Components).
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function requireCompanyId(): Promise<string> {
  const user = await requireUser();
  return ensureCompanyForUser(user.id);
}
