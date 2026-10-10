import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/format";
import type { MilestoneCheckResult } from "@/lib/milestones";

export function MilestoneCard({
  milestone,
  weekDue,
}: {
  milestone: MilestoneCheckResult;
  weekDue: number;
}) {
  return (
    <Card title={`Meilenstein · Woche ${weekDue}`}>
      <ProgressBar
        value={milestone.cumulativeProfit}
        max={milestone.targetCumulativeProfit}
        label={`${formatCurrency(milestone.cumulativeProfit)} von ${formatCurrency(milestone.targetCumulativeProfit)}`}
      />
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        {milestone.achieved
          ? "Ziel erreicht – weiter so."
          : "Noch nicht erreicht. Bei zwei verpassten Meilensteinen in Folge droht die Insolvenz."}
      </p>
    </Card>
  );
}
