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
  weekNumber,
  gameLengthWeeks,
  cash,
  stage,
  loanRemaining,
}: {
  weekNumber: number;
  gameLengthWeeks: number;
  cash: number;
  stage: CompanyStage;
  loanRemaining: number;
}) {
  return (
    <Card title="Firma">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Woche" value={`${weekNumber} / ${gameLengthWeeks}`} />
        <StatTile label="Kapital" value={formatCurrency(cash)} />
        <StatTile label="Stufe" value={`${stage}`} hint={STAGE_LABELS[stage]} />
        <StatTile label="Restschuld" value={formatCurrency(loanRemaining)} />
      </div>
    </Card>
  );
}
