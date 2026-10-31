"use client";

import { useEffect, useId, useRef } from "react";
import type { ReleaseView } from "@/lib/changelog";
import { ReleaseList } from "@/components/news/ReleaseList";

// „Das ist neu“: modaler Dialog im Stil der Einführung (gleiche Karte, gleiche Knöpfe). Esc und
// „Verstanden“ schließen, „Ansehen“ schließt und navigiert. Gespeichert wird einmal, beim Schließen
// (siehe Onboarding.tsx); der Dialog selbst schreibt nichts.

export function NewsPopup({ releases, onClose }: { releases: ReleaseView[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const textId = useId();
  const count = releases.reduce((n, r) => n + r.items.length, 0);
  const single = releases.length === 1 ? releases[0]! : null;

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    primary.current?.focus({ preventScroll: true });
  }, []);

  return (
    <dialog
      ref={dialog}
      className="tour tour--news"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={textId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="tour__dim" aria-hidden="true" />
      <div className="tour__card news__card">
        <div className="tour__scroll">
          <p className="tour__count">{single ? `Update vom ${single.dateLabel}` : `${releases.length} Updates seit deinem letzten Besuch`}</p>
          <h2 id={titleId} className="tour__title">
            Das ist neu
          </h2>
          <p id={textId} className="tour__text">
            {single ? `${single.title}. ` : ""}
            {count} {count === 1 ? "Neuerung" : "Neuerungen"}: was es ist, wo du sie findest und ab wann sie offen sind.
          </p>
          <ReleaseList releases={releases} headings={!single} onNavigate={onClose} />
        </div>
        <div className="tour__foot">
          <p className="news__again">Alles später wieder unter Menü › Wissen › Neuigkeiten.</p>
          <div className="tour__buttons">
            <button ref={primary} type="button" className="btn btn--primary btn--sm" onClick={onClose}>
              Verstanden
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
