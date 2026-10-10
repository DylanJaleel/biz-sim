"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export interface LoginState {
  error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEND_FAILED = "Der Login-Link konnte nicht gesendet werden. Bitte versuche es später erneut.";

export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { error: "Bitte gib eine gültige E-Mail-Adresse ein." };
  }

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
