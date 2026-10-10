"use client";

import { useState, useTransition } from "react";
import { closeRoundAction, type WeekSummaryView } from "@/app/(app)/actions";
import { WeekSummarySheet } from "@/components/dashboard/WeekSummarySheet";

/**
 * Primary action of the screen. Sticks above the tab bar (thumb zone) while
 * the week is open; the result opens as a bottom sheet. The component stays
 * mounted (without the button) after the business ended, so the final
 * summary isn't torn down when the page re-renders as the insolvency screen.
 */
export function RoundCloseBar({
  weekNumber,
  acceptedCount,
  active = true,
}: {
  weekNumber: number;
  acceptedCount: number;
  active?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<WeekSummaryView | null>(null);

  function closeWeek() {
    setError(null);
    startTransition(async () => {
      const result = await closeRoundAction(weekNumber);
      if (result.ok) setView(result.data);
      else setError(result.error);
    });
  }

  const idle = acceptedCount === 0;

  return (
    <>
      {active && (
      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30">
        {error && (
          <p
            role="alert"
            className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
          >
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={closeWeek}
          className={`h-14 w-full rounded-2xl text-base font-semibold shadow-lg transition-colors disabled:opacity-60 ${
            idle
              ? "bg-zinc-800 text-white active:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900"
              : "bg-blue-600 text-white active:bg-blue-700"
          }`}
        >
          {pending
            ? "Wird ausgewertet…"
            : idle
              ? `Woche ${weekNumber} ohne Aufträge abschließen`
              : `Woche ${weekNumber} abschließen · ${acceptedCount} ${acceptedCount === 1 ? "Auftrag" : "Aufträge"}`}
        </button>
      </div>
      )}

      {view && <WeekSummarySheet view={view} onClose={() => setView(null)} />}
    </>
  );
}
