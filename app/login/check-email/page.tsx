import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "E-Mail prüfen · Boardroom" };

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Prüfe dein Postfach
      </h1>
      <p className="text-base text-zinc-600 dark:text-zinc-400">
        Wir haben dir einen Login-Link geschickt. Öffne ihn auf diesem Gerät, um dich anzumelden. Der
        Link ist 24 Stunden gültig und kann nur einmal verwendet werden.
      </p>
      {process.env.NODE_ENV === "development" && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          Entwicklungsmodus ohne <code>RESEND_API_KEY</code>: Der Link steht in der Server-Konsole.
        </p>
      )}
      <Link
        href="/login"
        className="flex h-12 items-center justify-center rounded-xl border border-black/15 text-base font-medium text-zinc-900 active:bg-zinc-100 dark:border-white/15 dark:text-zinc-50 dark:active:bg-zinc-800"
      >
        Andere E-Mail-Adresse verwenden
      </Link>
    </main>
  );
}
