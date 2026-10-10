import { OrderCard } from "@/components/dashboard/OrderCard";
import { Card } from "@/components/ui/Card";
import type { OrderRecord } from "@/lib/repository/company";

export function OrderPoolCard({ orders, canAccept }: { orders: OrderRecord[]; canAccept: boolean }) {
  return (
    <Card title={`Verfügbare Aufträge (${orders.length})`}>
      {orders.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Keine offenen Aufträge. Nach dem Wochenabschluss kommen neue.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} mode="available" canAccept={canAccept} />
          ))}
        </ul>
      )}
    </Card>
  );
}
