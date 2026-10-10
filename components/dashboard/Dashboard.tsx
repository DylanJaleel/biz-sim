import { CompanyOverviewCard } from "@/components/dashboard/CompanyOverviewCard";
import { EventBanner } from "@/components/dashboard/EventBanner";
import { GameResultCard } from "@/components/dashboard/GameResultCard";
import { MilestoneCard } from "@/components/dashboard/MilestoneCard";
import { NoRoundYetCard } from "@/components/dashboard/NoRoundYetCard";
import { OrderPoolCard } from "@/components/dashboard/OrderPoolCard";
import { RoundCloseBar } from "@/components/dashboard/RoundCloseBar";
import { WeekPlanCard } from "@/components/dashboard/WeekPlanCard";
import { WeeklyBalanceCard } from "@/components/dashboard/WeeklyBalanceCard";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { MILESTONE_INTERVAL_WEEKS, TARGET_CUMULATIVE_PROFIT } from "@/lib/config";
import { calculateWeeklyLoanCharge } from "@/lib/loan";
import { checkMilestone, nextMilestoneWeek } from "@/lib/milestones";
import { approximateCumulativeProfit } from "@/lib/outcome";
import { ensureCompanyForUser, getLatestRoundSummary, loadCompanyState } from "@/lib/repository/company";
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
  const header = (
    <PageHeader
      title={`Hallo, ${displayName}`}
      subtitle="Dein Betrieb auf einen Blick"
      trailing={<Chip>Woche {state.weekNumber}/{state.gameLengthWeeks}</Chip>}
    />
  );

  if (state.status !== "ACTIVE") {
    return (
      <>
        {header}
        <GameResultCard
          status={state.status}
          weekNumber={state.weekNumber}
          cash={state.cash}
          loanRemaining={state.loan.remainingBalance}
        />
        {latestRound && <WeeklyBalanceCard summary={latestRound} />}
      </>
    );
  }

  const milestoneWeekDue = nextMilestoneWeek(state.weekNumber, MILESTONE_INTERVAL_WEEKS);
  const milestoneTarget = Math.round((TARGET_CUMULATIVE_PROFIT * milestoneWeekDue) / state.gameLengthWeeks);
  const milestone = checkMilestone(approximateCumulativeProfit(state.cash), milestoneTarget);
  const loanPayment = calculateWeeklyLoanCharge(state.loan).totalPayment;
  const capacityLeft = state.acceptedOrders.length < state.orderCapacity;

  return (
    <>
      {header}

      <EventBanner description={latestRound?.eventDescription ?? null} />

      <CompanyOverviewCard
        cash={state.cash}
        stage={state.stage}
        loanRemaining={state.loan.remainingBalance}
        weeksLeft={Math.max(state.gameLengthWeeks - state.weekNumber + 1, 0)}
      />

      <WeekPlanCard
        weekNumber={state.weekNumber}
        accepted={state.acceptedOrders}
        capacity={state.orderCapacity}
        loanPayment={loanPayment}
      />

      <OrderPoolCard orders={state.availableOrders} canAccept={capacityLeft} />

      {latestRound ? <WeeklyBalanceCard summary={latestRound} /> : <NoRoundYetCard />}

      <MilestoneCard milestone={milestone} weekDue={milestoneWeekDue} />

      <RoundCloseBar weekNumber={state.weekNumber} acceptedCount={state.acceptedOrders.length} />
    </>
  );
}
