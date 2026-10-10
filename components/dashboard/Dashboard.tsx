import { CompanyOverviewCard } from "@/components/dashboard/CompanyOverviewCard";
import { EventBanner } from "@/components/dashboard/EventBanner";
import { MilestoneCard } from "@/components/dashboard/MilestoneCard";
import { NoRoundYetCard } from "@/components/dashboard/NoRoundYetCard";
import { OrderPoolCard } from "@/components/dashboard/OrderPoolCard";
import { WeeklyBalanceCard } from "@/components/dashboard/WeeklyBalanceCard";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { MILESTONE_INTERVAL_WEEKS, STARTING_CASH, TARGET_CUMULATIVE_PROFIT } from "@/lib/config";
import { checkMilestone, nextMilestoneWeek } from "@/lib/milestones";
import { getLatestRoundSummary, loadCompanyState, ensureCompanyForUser } from "@/lib/repository/company";
import { requireUser } from "@/lib/session";

/**
 * Reads the signed-in player's company. Runs at request time (it reads the
 * session cookie), so the parent page wraps it in <Suspense> and the static
 * shell around it can still prerender.
 */
export async function Dashboard() {
  const user = await requireUser();
  const companyId = await ensureCompanyForUser(user.id);
  const [state, latestRound] = await Promise.all([
    loadCompanyState(companyId),
    getLatestRoundSummary(companyId),
  ]);

  const displayName = user.name ?? user.email?.split("@")[0] ?? "Unternehmer";
  const milestoneWeekDue = nextMilestoneWeek(state.weekNumber, MILESTONE_INTERVAL_WEEKS);
  // Approximation until Phase 3 tracks cumulative profit directly: cash only
  // moves via resolved rounds, so cash minus the starting amount is profit.
  const cumulativeProfit = state.cash - STARTING_CASH;
  const milestoneTarget = Math.round(
    (TARGET_CUMULATIVE_PROFIT * milestoneWeekDue) / state.gameLengthWeeks,
  );
  const milestone = checkMilestone(cumulativeProfit, milestoneTarget);

  return (
    <>
      <PageHeader
        title={`Hallo, ${displayName}`}
        subtitle="Dein Betrieb auf einen Blick"
        trailing={<Chip>Woche {state.weekNumber}/{state.gameLengthWeeks}</Chip>}
      />

      <EventBanner description={latestRound?.eventDescription ?? null} />

      <CompanyOverviewCard
        cash={state.cash}
        stage={state.stage}
        loanRemaining={state.loan.remainingBalance}
        weeksLeft={Math.max(state.gameLengthWeeks - state.weekNumber + 1, 0)}
      />

      <OrderPoolCard orders={state.availableOrders} />

      {latestRound ? <WeeklyBalanceCard summary={latestRound} /> : <NoRoundYetCard />}

      <MilestoneCard milestone={milestone} weekDue={milestoneWeekDue} />
    </>
  );
}
