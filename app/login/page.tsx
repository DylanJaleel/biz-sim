import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Anmelden · Boardroom" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#2342f5]">Boardroom</p>
        <h1 className="mt-2 font-[family-name:var(--font-serif)] text-4xl tracking-tight text-zinc-900 dark:text-zinc-50">
          Vom Business Angel zum Investment-Mogul.
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          Sitz in Beiräten, bring Argumente ein, stimm ab und lerne dabei, wie Firmen wirklich
          funktionieren. Wir senden dir einen Login-Link, kein Passwort nötig.
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
