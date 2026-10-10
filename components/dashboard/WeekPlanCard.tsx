import { OrderCard } from "@/components/dashboard/OrderCard";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/format";
import type { OrderRecord } from "@/lib/repository/company";

export function WeekPlanCard({
  weekNumber,
  accepted,
  capacity,
  loanPayment,
}: {
  weekNumber: number;
  accepted: OrderRecord[];
  capacity: number;
  loanPayment: number;
}) {
  const expectedProfit = accepted.reduce((sum, order) => sum + order.payout - order.materialNeed, 0);
  const expectedResult = expectedProfit - loanPayment;

  return (
    <Card title={`Diese Woche · Woche ${weekNumber}`}>
      <ProgressBar value={accepted.length} max={capacity} label={`Auslastung ${accepted.length}/${capacity} Aufträge`} />

      {accepted.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Noch nichts geplant. Wähle bis zu {capacity} Aufträge aus dem Pool – ohne Aufträge läuft die Kreditrate
          trotzdem weiter.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {accepted.map((order) => (
            <OrderCard key={order.id} order={order} mode="accepted" />
          ))}
        </ul>
      )}

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <dt>Gewinn aus Aufträgen</dt>
          <dd>{formatCurrency(expectedProfit)}</dd>
        </div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <dt>Kreditrate</dt>
          <dd>-{formatCurrency(loanPayment)}</dd>
        </div>
        <div
          className={`flex justify-between font-semibold ${
            expectedResult < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"
          }`}
        >
          <dt>Erwartetes Ergebnis</dt>
          <dd>{expectedResult < 0 ? `-${formatCurrency(-expectedResult)}` : formatCurrency(expectedResult)}</dd>
        </div>
      </dl>
    </Card>
  );
}
