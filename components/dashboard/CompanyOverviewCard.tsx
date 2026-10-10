import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { formatCurrency } from "@/lib/format";
import type { CompanyStage } from "@/lib/stage";

const STAGE_LABELS: Record<CompanyStage, string> = {
  1: "Solo-Handwerker",
  2: "Mit Geselle",
  3: "Mit Lager",
};

export function CompanyOverviewCard({
  cash,
  stage,
  loanRemaining,
  weeksLeft,
}: {
  cash: number;
  stage: CompanyStage;
  loanRemaining: number;
  weeksLeft: number;
}) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Kapital
      </div>
      <div
        className={`mt-1 text-4xl font-bold tracking-tight ${
          cash < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {formatCurrency(cash)}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatTile label="Stufe" value={`${stage}`} hint={STAGE_LABELS[stage]} />
        <StatTile label="Restschuld" value={formatCurrency(loanRemaining)} />
        <StatTile label="Verbleibend" value={`${weeksLeft} Wo.`} />
      </div>
    </Card>
  );
}
