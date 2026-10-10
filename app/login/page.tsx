import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Anmelden · Business Simulator" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Business Simulator
        </h1>
        <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
          Gründe deinen Handwerksbetrieb und führe ihn in 52 Wochen aus den Schulden. Wir senden dir
          einen Login-Link – kein Passwort nötig.
        </p>
      </header>

      <Suspense>
        <AuthErrorBanner searchParams={searchParams} />
      </Suspense>

      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <LoginForm />
      </div>
    </main>
  );
}
