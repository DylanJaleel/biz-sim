"use client";

import { useTransition } from "react";
import { setOfficeStyleAction } from "@/app/(app)/konto/actions";
import { Disclosure } from "@/components/ui/Disclosure";
import type { OfficeStyle } from "@/lib/office-style";

/** Switch between the new glass cockpit and the classic desk from above. */
export function OfficeStyleCard({ current }: { current: OfficeStyle }) {
  const [pending, startTransition] = useTransition();
  const choose = (style: OfficeStyle) => startTransition(() => setOfficeStyleAction(style));
  return (
    <section className="panel" aria-labelledby="ansicht-title">
      <p className="eyebrow">Ansicht</p>
      <Disclosure as="h2" headingId="ansicht-title" headingClass="panel__title" title="Wie dein Büro aussieht">
        <p className="muted">
          Das Glas-Cockpit zeigt dein Büro als schwebende Fenster vor dem eigenen Raum. Der klassische Schreibtisch ist die bisherige Ansicht von oben. Am Spielstand ändert das
          nichts.
        </p>
        <div className="panel__actions">
          <button type="button" className={current === "glas" ? "btn btn--primary" : "btn"} aria-pressed={current === "glas"} disabled={pending} onClick={() => choose("glas")}>
            Glas-Cockpit
          </button>
          <button
            type="button"
            className={current === "klassisch" ? "btn btn--primary" : "btn"}
            aria-pressed={current === "klassisch"}
            disabled={pending}
            onClick={() => choose("klassisch")}
          >
            Klassischer Schreibtisch
          </button>
        </div>
      </Disclosure>
    </section>
  );
}
