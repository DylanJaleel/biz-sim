import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { formatCurrency } from "@/lib/format";

export function CompanyOverviewCard({
  cash,
  value,
  reputation,
  loanRemaining,
  overdraft,
}: {
  cash: number;
  value: number;
  reputation: number;
  loanRemaining: number;
  overdraft: number;
}) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Kapital</div>
      <div
        className={`mt-1 text-4xl font-bold tracking-tight tabular-nums ${
          cash < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {formatCurrency(cash)}
      </div>
      {cash < 0 && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Im Dispo – die Bank duldet höchstens {formatCurrency(overdraft)} Minus.
        </p>
      )}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatTile label="Firmenwert" value={formatCurrency(value)} hint="Eigenkapital" />
        <StatTile label="Ruf" value={`${Math.round(reputation)}/100`} />
        <StatTile label="Restschuld" value={formatCurrency(loanRemaining)} />
      </div>
    </Card>
  );
}
