"use client";

import { useState, useTransition } from "react";
import { investAction } from "@/app/(app)/actions";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";
import type { InvestmentCheck, InvestmentKind } from "@/lib/investments";

/**
 * One way to grow the business. Investments are not reversible, so the button
 * asks twice: first tap arms it, second tap books it.
 */
export function InvestCard({
  kind,
  title,
  status,
  details,
  action,
  check,
}: {
  kind: InvestmentKind;
  title: string;
  /** Current state, e.g. "Stufe 1 · Grundausstattung". */
  status: string;
  /** What the next step changes. */
  details: string[];
  action: string;
  check: InvestmentCheck;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function book() {
    setError(null);
    startTransition(async () => {
      const result = await investAction(kind);
      setArmed(false);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{status}</p>

      <ul className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
        {details.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {check.ok ? (
        armed ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setArmed(false)}
              className="h-12 rounded-xl border border-black/15 text-base font-medium text-zinc-700 active:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:active:bg-zinc-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={book}
              className="h-12 rounded-xl bg-blue-600 text-base font-semibold text-white active:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "Wird gebucht…" : `Ja, ${formatCurrency(check.cost)}`}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="mt-4 h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white active:bg-blue-700"
          >
            {action} · {formatCurrency(check.cost)}
          </button>
        )
      ) : (
        <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {check.reason}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </Card>
  );
}
