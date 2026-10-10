import { OrderCard } from "@/components/dashboard/OrderCard";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { WeekSummary } from "@/lib/economy";
import { formatCurrency, formatHours, formatSignedCurrency } from "@/lib/format";
import type { OrderRecord } from "@/lib/repository/company";

function Row({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between ${
        strong
          ? `font-semibold ${value < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"}`
          : "text-zinc-600 dark:text-zinc-400"
      }`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatSignedCurrency(value)}</dd>
    </div>
  );
}

/** The plan of the week: hours used, accepted jobs and what that adds up to against the fixed costs. */
export function WeekPlanCard({
  weekNumber,
  accepted,
  capacity,
  preview,
}: {
  weekNumber: number;
  accepted: OrderRecord[];
  capacity: { total: number; used: number };
  preview: WeekSummary;
}) {
  const fixed = preview.items.filter((item) => item.key !== "material" && item.key !== "loanInterest" && item.key !== "repair");
  const fixedTotal = fixed.reduce((sum, item) => sum + item.amount, 0);
  const material = preview.items.find((item) => item.key === "material")?.amount ?? 0;
  const other = preview.profit - preview.revenue - material - fixedTotal;

  return (
    <Card title={`Diese Woche · Woche ${weekNumber}`}>
      <ProgressBar
        value={capacity.used}
        max={Math.max(capacity.total, 1)}
        label={`Auslastung ${formatHours(capacity.used)} von ${formatHours(capacity.total)}`}
      />

      {accepted.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Noch nichts geplant. Wähle Aufträge aus dem Markt – die Fixkosten laufen auch ohne Arbeit.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {accepted.map((order) => (
            <OrderCard key={order.id} order={order} mode="accepted" />
          ))}
        </ul>
      )}

      <dl className="mt-4 space-y-1 text-sm">
        <Row label="Einnahmen" value={preview.revenue} />
        <Row label="Material" value={material} />
        <Row label="Fixkosten (Löhne, Miete, …)" value={fixedTotal} />
        {Math.abs(other) > 0.5 && <Row label="Zinsen & Sonstiges" value={other} />}
        <div className="my-1 border-t border-black/10 dark:border-white/10" />
        <Row label="Erwarteter Gewinn" value={preview.profit} strong />
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <dt>danach Kredittilgung</dt>
          <dd className="tabular-nums">−{formatCurrency(preview.loanPrincipalPayment)}</dd>
        </div>
      </dl>
    </Card>
  );
}
