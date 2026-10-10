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
            className="flex items-center justify-between rounded-xl border border-black/10 p-3 dark:border-white/10"
          >
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-50">
                {ORDER_TYPE_LABELS[order.type]}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Material: {formatCurrency(order.materialNeed)} · Frist: {order.deadlineWeeks}{" "}
                {order.deadlineWeeks === 1 ? "Woche" : "Wochen"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(order.payout)}
              </div>
              <button
                type="button"
                disabled
                title="Annahme-Logik folgt, sobald Spielstand & Kapazität angebunden sind"
                className="mt-1 rounded-full border border-black/10 px-3 py-1 text-xs text-zinc-400 dark:border-white/10"
              >
                Annehmen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
