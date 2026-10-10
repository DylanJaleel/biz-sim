import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_PREFIXES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * Optimistic redirect only: a missing session cookie sends the visitor to
 * /login. The cookie's validity is verified in lib/session.ts (requireUser),
 * which every protected page/action calls.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => SESSION_COOKIE_PREFIXES.some((prefix) => cookie.name.startsWith(prefix)));

  if (hasSessionCookie) return NextResponse.next();

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api/auth|api/health|login|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
