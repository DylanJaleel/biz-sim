import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";
import type { GeneratedOrder } from "@/lib/orders";

const ORDER_TYPE_LABELS: Record<GeneratedOrder["type"], string> = {
  repair: "Reparatur",
  custom: "Sonderauftrag",
  installation: "Einbau",
};

export function OrderPoolCard({ orders }: { orders: GeneratedOrder[] }) {
  return (
    <Card title="Auftragspool – diese Woche">
      <ul className="flex flex-col gap-3">
        {orders.map((order, index) => (
          <li
            key={index}
            className="rounded-xl border border-black/10 p-3 dark:border-white/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">
                  {ORDER_TYPE_LABELS[order.type]}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Material {formatCurrency(order.materialNeed)} · Frist {order.deadlineWeeks}{" "}
                  {order.deadlineWeeks === 1 ? "Woche" : "Wochen"}
                </div>
              </div>
              <div className="shrink-0 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(order.payout)}
              </div>
            </div>
            <button
              type="button"
              disabled
              title="Annahme-Logik folgt in Phase 3"
              className="mt-3 h-11 w-full rounded-xl border border-black/10 text-sm font-medium text-zinc-400 dark:border-white/10"
            >
              Annehmen
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
