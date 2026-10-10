import { CompanyOverviewCard } from "@/components/dashboard/CompanyOverviewCard";
import { EventBanner } from "@/components/dashboard/EventBanner";
import { MilestoneCard } from "@/components/dashboard/MilestoneCard";
import { OrderPoolCard } from "@/components/dashboard/OrderPoolCard";
import { WeeklyBalanceCard } from "@/components/dashboard/WeeklyBalanceCard";
import { createDemoGameState } from "@/lib/demo";

export default function DashboardPage() {
  const state = createDemoGameState();

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Business Simulator
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Demo-Dashboard mit Beispieldaten aus der Spiellogik (lib/) – noch ohne Login
            oder Spielstand-Persistenz. Siehe docs/implementation-plan.md für den weiteren Fahrplan.
          </p>
        </header>

        <EventBanner event={state.lastWeekEvent} />

        <CompanyOverviewCard
          weekNumber={state.weekNumber}
          gameLengthWeeks={state.gameLengthWeeks}
          cash={state.cash}
          stage={state.stage}
          loanRemaining={state.loan.remainingBalance}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <OrderPoolCard orders={state.currentOrderPool} />
          <div className="flex flex-col gap-6">
            <WeeklyBalanceCard summary={state.lastWeekSummary} />
            <MilestoneCard milestone={state.milestone} weekDue={state.milestoneWeekDue} />
          </div>
        </div>
      </main>
    </div>
  );
}
