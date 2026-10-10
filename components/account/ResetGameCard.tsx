"use client";

import { useState, useTransition } from "react";
import { restartGameAction } from "@/app/(app)/actions";
import { Card } from "@/components/ui/Card";

/** Two-step confirmation: a reset deletes the whole game and can't be undone. */
export function ResetGameCard() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card title="Spiel zurücksetzen">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Startet mit frischem Betrieb in Woche 1. Dein bisheriger Spielstand geht dabei verloren.
      </p>
      {confirming ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="h-12 rounded-xl border border-black/15 text-base font-medium text-zinc-700 active:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:active:bg-zinc-800"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => restartGameAction())}
            className="h-12 rounded-xl bg-red-600 text-base font-semibold text-white active:bg-red-700 disabled:opacity-60"
          >
            {pending ? "Setze zurück…" : "Ja, zurücksetzen"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 h-12 w-full rounded-xl border border-black/15 text-base font-medium text-zinc-900 active:bg-zinc-100 dark:border-white/15 dark:text-zinc-50 dark:active:bg-zinc-800"
        >
          Neues Spiel starten
        </button>
      )}
    </Card>
  );
}
