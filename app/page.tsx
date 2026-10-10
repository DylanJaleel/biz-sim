import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export default function DashboardPage() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Business Simulator
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Spielstand der Demo-Firma aus der Datenbank – noch ohne Login (siehe
            docs/implementation-plan.md Phase 2) oder interaktive Auftragsannahme (Phase 3).
          </p>
        </header>

        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard />
        </Suspense>
      </main>
    </div>
  );
}
