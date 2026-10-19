import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { getDb } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/mail";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

// Lazy config: the Prisma client (and thus DATABASE_URL) is only touched when
// a request actually reaches Auth.js, never at import/build time.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PrismaAdapter(getDb()),
  // Stay signed in for half a year, on every device: the game waits where you left it.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 180 },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  providers: [Resend({ sendVerificationRequest: sendMagicLinkEmail })],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
}));
