"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSaveAction, deleteSaveAction, importSaveAction, restoreSaveAction } from "@/app/(app)/konto/actions";
import type { ActionResult } from "@/lib/action-result";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();
  const run = (work: () => Promise<ActionResult>, success: string, then?: () => void) => {
    setError(null);
    setDone(null);
    start(async () => {
      const result = await work();
      if (result.ok) {
        setDone(success);
        then?.();
        router.refresh();
      } else setError(result.error);
    });
  };
  return { pending, error, done, run };
}

function Feedback({ error, done }: { error: string | null; done: string | null }) {
  if (error)
    return (
      <p className="action__error" role="alert">
        {error}
      </p>
    );
  if (done)
    return (
      <p className="saves__done" role="status">
        {done}
      </p>
    );
  return null;
}

export function CreateSave({ suggestion }: { suggestion: string }) {
  const [name, setName] = useState("");
  const { pending, error, done, run } = useAction();
  return (
    <form
      className="saves__create"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createSaveAction(name), "Gesichert.", () => setName(""));
      }}
    >
      <input className="select saves__name" value={name} onChange={(e) => setName(e.target.value)} placeholder={suggestion} maxLength={80} aria-label="Name der Sicherung" />
      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Sichere…" : "Jetzt sichern"}
      </button>
      <Feedback error={error} done={done} />
    </form>
  );
}

/** Loading replaces the running game, so it asks once more. */
export function SaveButtons({ id, name, deletable }: { id: string; name: string; deletable: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const { pending, error, done, run } = useAction();
  return (
    <span className="saves__actions">
      {confirming ? (
        <>
          <span className="muted small">Laufendes Spiel durch „{name}“ ersetzen? Es wird vorher gesichert.</span>
          <button type="button" className="btn btn--sm" disabled={pending} onClick={() => setConfirming(false)}>
            Abbrechen
          </button>
          <button type="button" className="btn btn--sm btn--primary" disabled={pending} onClick={() => run(() => restoreSaveAction(id), "Geladen.", () => setConfirming(false))}>
            {pending ? "Lade…" : "Ja, laden"}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn btn--sm" onClick={() => setConfirming(true)}>
            Laden
          </button>
          {deletable && (
            <button type="button" className="btn btn--sm btn--ghost" disabled={pending} onClick={() => run(() => deleteSaveAction(id), "Gelöscht.")}>
              Löschen
            </button>
          )}
        </>
      )}
      <Feedback error={error} done={done} />
    </span>
  );
}

export function ImportSave() {
  const input = useRef<HTMLInputElement>(null);
  const { pending, error, done, run } = useAction();
  return (
    <div className="saves__import">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          run(() => importSaveAction(text), "Spielstand aus der Datei geladen. Dein vorheriger Stand ist gesichert.");
          e.target.value = "";
        }}
      />
      <button type="button" className="btn" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? "Lade…" : "Datei laden"}
      </button>
      <Feedback error={error} done={done} />
    </div>
  );
}
