"use client";

import { useState, useTransition } from "react";
import { restartGameAction } from "@/app/(app)/actions";

/** Two-step confirmation: a reset deletes the whole game and can't be undone. */
export function ResetGameCard() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <section className="panel">
      <p className="eyebrow">Neues Spiel</p>
      <p className="panel__title">Von vorn beginnen</p>
      <p className="muted">Du startest wieder als Business Angel im Oktober des ersten Jahres. Dein bisheriger Spielstand geht verloren.</p>
      {confirming ? (
        <div className="panel__actions">
          <button type="button" className="btn" disabled={pending} onClick={() => setConfirming(false)}>
            Abbrechen
          </button>
          <button type="button" className="btn btn--danger" disabled={pending} onClick={() => startTransition(() => restartGameAction())}>
            {pending ? "Setze zurück…" : "Ja, neu beginnen"}
          </button>
        </div>
      ) : (
        <div className="panel__actions">
          <button type="button" className="btn" onClick={() => setConfirming(true)}>
            Neues Spiel starten
          </button>
        </div>
      )}
    </section>
  );
}
