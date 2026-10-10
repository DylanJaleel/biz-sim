import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { getDb } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

const DEFAULT_FROM = "Business Simulator <onboarding@resend.dev>";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendMagicLink({ identifier, url }: { identifier: string; url: string }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set; cannot send magic link emails.");
    }
    console.info(`\n[auth] Magic link for ${identifier} (no RESEND_API_KEY set):\n${url}\n`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? DEFAULT_FROM,
      to: identifier,
      subject: "Dein Login-Link für den Business Simulator",
      text: `Öffne diesen Link, um dich anzumelden:\n${url}\n\nWenn du das nicht angefordert hast, ignoriere diese E-Mail.`,
      html: `<p>Tippe auf den Button, um dich anzumelden:</p><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Jetzt anmelden</a></p><p style="color:#71717a;font-size:13px">Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error ${response.status}: ${await response.text()}`);
  }
}

// Lazy config: the Prisma client (and thus DATABASE_URL) is only touched when
// a request actually reaches Auth.js, never at import/build time.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PrismaAdapter(getDb()),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  providers: [Resend({ sendVerificationRequest: sendMagicLink })],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
}));
