"use client";

import { useEffect, useRef } from "react";
import type { WeekSummaryView } from "@/app/(app)/actions";
import { BalanceLine, BalanceLines } from "@/components/dashboard/BalanceLines";
import { Card } from "@/components/ui/Card";
import { formatHours, formatPercent } from "@/lib/format";

const INSOLVENCY_TEXT = {
  title: "Insolvenz",
  text: "Dein Kapital war zu tief oder zu lange im Minus. Der Betrieb ist am Ende.",
};

/** Bottom sheet shown after closing a week. Native <dialog>: focus trap, Esc and backdrop come for free. */
export function WeekSummarySheet({ view, onClose }: { view: WeekSummaryView; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { summary, status, warnings } = view;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const ending = status === "ACTIVE" ? null : INSOLVENCY_TEXT;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="week-summary-title"
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto w-full max-w-lg overflow-hidden rounded-t-3xl bg-zinc-50 p-0 text-zinc-900 backdrop:bg-black/50 dark:bg-zinc-950 dark:text-zinc-50"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-6">
          <h2 id="week-summary-title" className="text-2xl font-bold tracking-tight">
            Wochenzusammenfassung
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Woche {summary.weekNumber}</p>

          {ending && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              <div className="font-semibold">{ending.title}</div>
              {ending.text}
            </div>
          )}

          {summary.eventDescription && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              ⚠ {summary.eventDescription}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <Card>
              <BalanceLines summary={summary} />
            </Card>

            <Card title="Arbeit">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {summary.completedOrders} {summary.completedOrders === 1 ? "Auftrag" : "Aufträge"} ·{" "}
                {formatHours(summary.completedHours)} von {formatHours(summary.capacityHours)} (
                {formatPercent(summary.utilization)} Auslastung)
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Ruf {summary.reputationBefore.toFixed(1).replace(".", ",")} →{" "}
                {summary.reputationAfter.toFixed(1).replace(".", ",")}
              </p>
            </Card>

            <Card title="Kapital">
              <BalanceLine label="Wochenstart" value={summary.cashBefore} />
              <BalanceLine label="Gewinn der Woche" value={summary.profit} />
              {summary.loanPrincipalPayment > 0 && (
                <BalanceLine label="Kredittilgung" value={-summary.loanPrincipalPayment} />
              )}
              {summary.investments.map((line, index) => (
                <BalanceLine key={`${line.label}-${index}`} label={line.label} value={line.amount} />
              ))}
              <hr className="my-1 border-black/10 dark:border-white/10" />
              <BalanceLine label="Wochenende" value={summary.cashAfter} emphasize />
            </Card>

            {warnings.length > 0 && (
              <Card title="Warnungen">
                <ul className="flex flex-col gap-2">
                  {warnings.map((warning) => (
                    <li
                      key={warning.title}
                      className={`rounded-xl border p-3 text-sm ${
                        warning.level === "critical"
                          ? "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
                          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                      }`}
                    >
                      <div className="font-semibold">{warning.title}</div>
                      {warning.text}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>

        <div className="border-t border-black/10 bg-zinc-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 dark:border-white/10 dark:bg-zinc-950">
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="h-14 w-full rounded-2xl bg-blue-600 text-base font-semibold text-white active:bg-blue-700"
          >
            Fortfahren
          </button>
        </div>
      </div>
    </dialog>
  );
}
