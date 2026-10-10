import { CompanyOverviewCard } from "@/components/dashboard/CompanyOverviewCard";
import { EventBanner } from "@/components/dashboard/EventBanner";
import { GameResultCard } from "@/components/dashboard/GameResultCard";
import { OrderPoolCard } from "@/components/dashboard/OrderPoolCard";
import { RoundCloseBar } from "@/components/dashboard/RoundCloseBar";
import { WeekPlanCard } from "@/components/dashboard/WeekPlanCard";
import { WeeklyBalanceCard } from "@/components/dashboard/WeeklyBalanceCard";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { OVERDRAFT_LIMIT } from "@/lib/config";
import { businessSizeLabel, headcount } from "@/lib/economy";
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
  const people = headcount(state.business, state.weekNumber);
  const header = (
    <PageHeader
      title={`Hallo, ${displayName}`}
      subtitle={`${businessSizeLabel(people)} · Jahr ${state.year} · ${state.season.label}`}
      trailing={<Chip>Woche {state.weekNumber}</Chip>}
    />
  );

  if (state.status !== "ACTIVE") {
    return (
      <>
        {header}
        <GameResultCard
          weekNumber={state.weekNumber}
          cash={state.cash}
          loanRemaining={state.loan.remainingBalance}
          value={state.value}
          headcount={people}
        />
        {latestRound && <WeeklyBalanceCard summary={latestRound} recent={state.recentRounds} />}
        <RoundCloseBar key="round-close" weekNumber={state.weekNumber} acceptedCount={0} active={false} />
      </>
    );
  }

  return (
    <>
      {header}

      <EventBanner event={state.event} />

      <CompanyOverviewCard
        cash={state.cash}
        value={state.value}
        reputation={state.business.reputation}
        loanRemaining={state.loan.remainingBalance}
        overdraft={OVERDRAFT_LIMIT}
      />

      <WeekPlanCard
        weekNumber={state.weekNumber}
        accepted={state.acceptedOrders}
        capacity={state.capacity}
        preview={state.preview}
      />

      <OrderPoolCard
        orders={state.availableOrders}
        lockedOrders={state.lockedOrders}
        freeHours={state.capacity.remaining}
      />

      {latestRound && <WeeklyBalanceCard summary={latestRound} recent={state.recentRounds} />}

      <RoundCloseBar key="round-close" weekNumber={state.weekNumber} acceptedCount={state.acceptedOrders.length} />
    </>
  );
}
