import { CompanyOverviewCard } from "@/components/dashboard/CompanyOverviewCard";
import { EventBanner } from "@/components/dashboard/EventBanner";
import { MilestoneCard } from "@/components/dashboard/MilestoneCard";
import { NoRoundYetCard } from "@/components/dashboard/NoRoundYetCard";
import { OrderPoolCard } from "@/components/dashboard/OrderPoolCard";
import { WeeklyBalanceCard } from "@/components/dashboard/WeeklyBalanceCard";
import { GAME_LENGTH_WEEKS, MILESTONE_INTERVAL_WEEKS, STARTING_CASH, TARGET_CUMULATIVE_PROFIT } from "@/lib/config";
import { checkMilestone, nextMilestoneWeek } from "@/lib/milestones";
import { getDemoCompanyId, getLatestRoundSummary, loadCompanyState } from "@/lib/repository/company";

/**
 * Reads the seeded demo company from the database. Runs at request time
 * (Cache Components leaves it uncached by default) — the parent page wraps
 * it in <Suspense> so the static shell around it can still prerender.
 */
export async function Dashboard() {
  const companyId = await getDemoCompanyId();
  const [state, latestRound] = await Promise.all([
    loadCompanyState(companyId),
    getLatestRoundSummary(companyId),
  ]);

  const milestoneWeekDue = nextMilestoneWeek(state.weekNumber, MILESTONE_INTERVAL_WEEKS);
  // Approximation until Phase 3 tracks cumulative profit directly: in this
  // phase cash only moves via resolved rounds, so cash minus the starting
  // amount equals profit so far.
  const cumulativeProfit = state.cash - STARTING_CASH;
  const milestoneTarget = Math.round((TARGET_CUMULATIVE_PROFIT * milestoneWeekDue) / GAME_LENGTH_WEEKS);
  const milestone = checkMilestone(cumulativeProfit, milestoneTarget);

  return (
    <>
      <EventBanner description={latestRound?.eventDescription ?? null} />

      <CompanyOverviewCard
        weekNumber={state.weekNumber}
        gameLengthWeeks={state.gameLengthWeeks}
        cash={state.cash}
        stage={state.stage}
        loanRemaining={state.loan.remainingBalance}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OrderPoolCard orders={state.availableOrders} />
        <div className="flex flex-col gap-6">
          {latestRound ? <WeeklyBalanceCard summary={latestRound} /> : <NoRoundYetCard />}
          <MilestoneCard milestone={milestone} weekDue={milestoneWeekDue} />
        </div>
      </div>
    </>
  );
}
