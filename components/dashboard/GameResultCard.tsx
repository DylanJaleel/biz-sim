import { RestartButton } from "@/components/dashboard/RestartButton";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { INSOLVENCY_NEGATIVE_CASH_WEEKS, OVERDRAFT_LIMIT } from "@/lib/config";
import { formatCurrency } from "@/lib/format";

/** The only way a run ends: insolvency. There is no finish line, so this also shows how far the business got. */
export function GameResultCard({
  weekNumber,
  cash,
  loanRemaining,
  value,
  headcount,
}: {
  weekNumber: number;
  cash: number;
  loanRemaining: number;
  value: number;
  headcount: number;
}) {
  return (
    <Card>
      <h2 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">Insolvenz</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Dein Kapital lag mehr als {formatCurrency(OVERDRAFT_LIMIT)} im Minus oder {INSOLVENCY_NEGATIVE_CASH_WEEKS} Wochen
        in Folge unter null. Die Bank dreht den Geldhahn zu. Beim nächsten Mal: Rücklagen halten, erst investieren,
        wenn die Aufträge die Fixkosten sicher tragen.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatTile label="Durchgehalten" value={`${weekNumber} Wochen`} />
        <StatTile label="Teamgröße" value={`${headcount}`} hint="Personen inkl. dir" />
        <StatTile label="Endkapital" value={formatCurrency(cash)} />
        <StatTile label="Restschuld" value={formatCurrency(loanRemaining)} hint={`Firmenwert ${formatCurrency(value)}`} />
      </div>
      <div className="mt-5">
        <RestartButton />
      </div>
    </Card>
  );
}
