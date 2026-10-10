import { formatCurrency } from "@/lib/format";
import type { WeekSummary } from "@/lib/economy";

function Line({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-3 py-1 text-sm ${
        emphasize ? "font-semibold text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400"
      }`}
    >
      <span>{label}</span>
      <span className={`shrink-0 tabular-nums ${value < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
        {value < 0 ? `−${formatCurrency(-value)}` : formatCurrency(value)}
      </span>
    </div>
  );
}

/** Income and expense lines plus the highlighted weekly profit, shared by the weekly card and the summary sheet. */
export function BalanceLines({ summary }: { summary: WeekSummary }) {
  return (
    <>
      <Line label="Einnahmen aus Aufträgen" value={summary.revenue} />
      {summary.items.map((item) => (
        <Line key={item.key} label={item.label} value={item.amount} />
      ))}
      <div
        className={`-mx-2 mt-3 rounded-xl px-2 py-1 ${
          summary.profit < 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"
        }`}
      >
        <Line label="Gewinn der Woche" value={summary.profit} emphasize />
      </div>
    </>
  );
}

export { Line as BalanceLine };
