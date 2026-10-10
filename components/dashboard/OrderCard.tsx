"use client";

import { useState, useTransition } from "react";
import { acceptOrderAction, rejectOrderAction, withdrawOrderAction } from "@/app/(app)/actions";
import type { ActionResult } from "@/lib/action-result";
import { formatCurrency } from "@/lib/format";
import type { OrderRecord } from "@/lib/repository/company";

const ORDER_TYPE_LABELS: Record<OrderRecord["type"], string> = {
  repair: "Reparatur",
  custom: "Sonderauftrag",
  installation: "Einbau",
};

function deadlineLabel(weeks: number): string {
  return weeks <= 1 ? "Letzte Woche" : `Noch ${weeks} Wochen`;
}

/** One order as a touch-friendly card: profit first, then what it costs and how long it stays open. */
export function OrderCard({
  order,
  mode,
  canAccept = true,
}: {
  order: OrderRecord;
  mode: "available" | "accepted";
  canAccept?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (orderId: string) => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action(order.id);
      if (!result.ok) setError(result.error);
    });
  }

  const profit = order.payout - order.materialNeed;

  return (
    <li className="rounded-xl border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 dark:text-zinc-50">{ORDER_TYPE_LABELS[order.type]}</div>
          <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Auszahlung {formatCurrency(order.payout)} · Material {formatCurrency(order.materialNeed)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(profit)}
          </div>
          {mode === "available" && (
            <div
              className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                order.remainingWeeks <= 1
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {deadlineLabel(order.remainingWeeks)}
            </div>
          )}
        </div>
      </div>

      {mode === "available" ? (
        <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(rejectOrderAction)}
            className="h-11 rounded-xl border border-black/15 text-sm font-medium text-zinc-700 active:bg-zinc-100 disabled:opacity-50 dark:border-white/15 dark:text-zinc-200 dark:active:bg-zinc-800"
          >
            Ablehnen
          </button>
          <button
            type="button"
            disabled={pending || !canAccept}
            onClick={() => run(acceptOrderAction)}
            className="h-11 rounded-xl bg-blue-600 text-sm font-semibold text-white active:bg-blue-700 disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          >
            {canAccept ? "Annehmen" : "Kapazität voll"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(withdrawOrderAction)}
          className="mt-3 h-11 w-full rounded-xl border border-black/15 text-sm font-medium text-zinc-700 active:bg-zinc-100 disabled:opacity-50 dark:border-white/15 dark:text-zinc-200 dark:active:bg-zinc-800"
        >
          Zurückziehen
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}
