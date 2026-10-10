import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";
import type { RoundSummary } from "@/lib/round";

function Line({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${emphasize ? "font-semibold" : "text-zinc-600 dark:text-zinc-400"}`}>
      <span>{label}</span>
      <span className={value < 0 ? "text-red-600 dark:text-red-400" : undefined}>
        {value >= 0 ? formatCurrency(value) : `-${formatCurrency(Math.abs(value))}`}
      </span>
    </div>
  );
}

export function WeeklyBalanceCard({ summary }: { summary: RoundSummary }) {
  return (
    <Card title={`Wochenbilanz · Woche ${summary.weekNumber}`}>
      <Line label="Einnahmen" value={summary.revenue} />
      <Line label="Material" value={-summary.materialCost} />
      {summary.wageCost > 0 && <Line label="Löhne" value={-summary.wageCost} />}
      {summary.rentCost > 0 && <Line label="Lagermiete" value={-summary.rentCost} />}
      <Line label="Kredittilgung" value={-summary.loanPrincipalPayment} />
      <Line label="Kreditzinsen" value={-summary.loanInterestPayment} />
      <div
        className={`-mx-2 mt-3 rounded-xl px-2 py-1 ${
          summary.netResult < 0
            ? "bg-red-50 dark:bg-red-500/10"
            : "bg-emerald-50 dark:bg-emerald-500/10"
        }`}
      >
        <Line label="Nettogewinn" value={summary.netResult} emphasize />
      </div>
    </Card>
  );
}
