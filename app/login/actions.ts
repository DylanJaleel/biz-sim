"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import {
  LOGIN_EMAIL_LIMIT,
  LOGIN_EMAIL_WINDOW_SECONDS,
  LOGIN_IP_LIMIT,
  LOGIN_IP_WINDOW_SECONDS,
} from "@/lib/config";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

export interface LoginState {
  error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEND_FAILED = "Der Login-Link konnte nicht gesendet werden. Bitte versuche es später erneut.";

async function clientIp(): Promise<string> {
  const requestHeaders = await headers();
  // Vercel sets x-forwarded-for itself, so the first entry is the real client.
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip") || "unknown";
}

function tooManyRequests(retryAfterSeconds: number): LoginState {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return { error: `Zu viele Anfragen. Bitte versuche es in ${minutes} Min. erneut.` };
}

export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { error: "Bitte gib eine gültige E-Mail-Adresse ein." };
  }

  const ipLimit = await consumeRateLimit(
    rateLimitKey("login-ip", await clientIp()),
    LOGIN_IP_LIMIT,
    LOGIN_IP_WINDOW_SECONDS,
  );
  if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfterSeconds);

  const emailLimit = await consumeRateLimit(
    rateLimitKey("login-email", email),
    LOGIN_EMAIL_LIMIT,
    LOGIN_EMAIL_WINDOW_SECONDS,
  );
  if (!emailLimit.allowed) return tooManyRequests(emailLimit.retryAfterSeconds);

  let resultUrl: string;
  try {
    // redirect: false returns Auth.js's target URL instead of throwing a
    // redirect, so we can send the player straight to our own page.
    resultUrl = await signIn("resend", { email, redirect: false, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) return { error: SEND_FAILED };
    throw error;
  }

  if (new URL(resultUrl, "http://localhost").searchParams.has("error")) {
    return { error: SEND_FAILED };
  }

  redirect("/login/check-email");
}
