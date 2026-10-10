"use client";

import { useState } from "react";
import { OrderCard } from "@/components/dashboard/OrderCard";
import { Card } from "@/components/ui/Card";
import type { OrderRecord } from "@/lib/repository/company";

const INITIAL_VISIBLE = 6;

/** Offers of the week. Long pools are folded, jobs that need better tools sit in their own closed section. */
export function OrderPoolCard({
  orders,
  lockedOrders,
  freeHours,
}: {
  orders: OrderRecord[];
  lockedOrders: OrderRecord[];
  freeHours: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? orders : orders.slice(0, INITIAL_VISIBLE);

  return (
    <Card title={`Auftragsmarkt · ${orders.length}`}>
      {orders.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Im Moment gibt es keine passenden Angebote. Nächste Woche kommen neue.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((order) => (
            <OrderCard key={order.id} order={order} mode="available" fits={order.hours <= freeHours + 1e-9} />
          ))}
        </ul>
      )}

      {orders.length > INITIAL_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 h-11 w-full rounded-xl text-sm font-medium text-blue-600 active:bg-blue-50 dark:text-blue-400 dark:active:bg-blue-500/10"
        >
          {expanded ? "Weniger anzeigen" : `${orders.length - INITIAL_VISIBLE} weitere anzeigen`}
        </button>
      )}

      {lockedOrders.length > 0 && (
        <details className="mt-4 rounded-xl border border-dashed border-black/15 p-3 dark:border-white/15">
          <summary className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Gesperrt · {lockedOrders.length} Aufträge brauchen bessere Werkzeuge
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {lockedOrders.slice(0, 8).map((order) => (
              <OrderCard key={order.id} order={order} mode="locked" />
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
