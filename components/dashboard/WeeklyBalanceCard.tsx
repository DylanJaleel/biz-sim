import { BalanceLines } from "@/components/dashboard/BalanceLines";
import { Card } from "@/components/ui/Card";
import type { WeekSummary } from "@/lib/economy";
import { formatSignedCurrency } from "@/lib/format";

/** Last closed week plus a small trend of the recent profits. */
export function WeeklyBalanceCard({
  summary,
  recent,
}: {
  summary: WeekSummary;
  recent: { weekNumber: number; profit: number }[];
}) {
  const maxAbs = Math.max(1, ...recent.map((round) => Math.abs(round.profit)));

  return (
    <Card title={`Letzte Bilanz · Woche ${summary.weekNumber}`}>
      {recent.length > 1 && (
        <figure className="mb-4" aria-label="Gewinn der letzten Wochen">
          <div className="flex h-16 items-center gap-1" role="img" aria-label={recent.map((r) => `Woche ${r.weekNumber}: ${formatSignedCurrency(r.profit)}`).join(", ")}>
            {recent.map((round) => (
              <div key={round.weekNumber} className="flex h-full flex-1 flex-col justify-center">
                <div
                  className={`w-full rounded-sm ${round.profit < 0 ? "self-start bg-red-400 dark:bg-red-500" : "self-end bg-emerald-500"}`}
                  style={{ height: `${Math.max(4, (Math.abs(round.profit) / maxAbs) * 50)}%` }}
                />
              </div>
            ))}
          </div>
          <figcaption className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Gewinn der letzten {recent.length} Wochen
          </figcaption>
        </figure>
      )}
      <BalanceLines summary={summary} />
    </Card>
  );
}
