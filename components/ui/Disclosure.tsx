"use client";

import { useId, useState, useSyncExternalStore, type ElementType, type ReactNode } from "react";

// Auf Telefon und Tablet (bis 1100 px) klappt dieser Block zu, damit die Seite
// kurz bleibt. Auf dem Desktop ist alles offen und die Kopfzeile ist ein
// gewöhnlicher Text, genau wie vorher. Das Verhalten steckt im CSS
// (.disc in globals.css); der State sorgt nur für aria-expanded.

const NARROW = "(max-width: 1100px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

export function Disclosure({
  title,
  as: Heading,
  headingId,
  headingClass,
  hint,
  actions,
  defaultOpen = false,
  quietOnWide = false,
  wideContents = false,
  className,
  children,
}: {
  /** Text der Kopfzeile, auch der Schalter auf schmalen Bildschirmen. */
  title: ReactNode;
  /** Als Überschrift (h2, h3) ausgeben; sonst ein einfaches div. */
  as?: ElementType;
  headingId?: string;
  headingClass?: string;
  /** Kleiner Zusatz rechts neben dem Titel (nur zugeklappt sichtbar, wenn narrow). */
  hint?: ReactNode;
  /** Aktion neben dem Titel, nur zugeklappt auf schmalen Bildschirmen. */
  actions?: ReactNode;
  defaultOpen?: boolean;
  /** Auf dem Desktop keine Kopfzeile zeigen, nur den Inhalt. */
  quietOnWide?: boolean;
  /** Auf dem Desktop verschwindet der Rahmen: Der Inhalt reiht sich direkt in das umgebende Grid ein. */
  wideContents?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const narrow = useNarrow();
  const bodyId = useId();
  const Tag = (Heading ?? "div") as ElementType;
  return (
    <div className={`disc${quietOnWide ? " disc--quiet" : ""}${wideContents ? " disc--contents" : ""}${className ? ` ${className}` : ""}`} data-open={open}>
      <div className="disc__row">
        <Tag id={headingId} className={`disc__head${headingClass ? ` ${headingClass}` : ""}`}>
          {narrow ? (
            <button type="button" className="disc__toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
              <span className="disc__title">{title}</span>
              {hint && <span className="disc__hint">{hint}</span>}
              <svg className="disc__chev" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 8l5 5 5-5" />
              </svg>
            </button>
          ) : (
            <span className="disc__toggle">
              <span className="disc__title">{title}</span>
              {hint && <span className="disc__hint">{hint}</span>}
              <svg className="disc__chev" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 8l5 5 5-5" />
              </svg>
            </span>
          )}
        </Tag>
        {actions && <div className="disc__actions">{actions}</div>}
      </div>
      <div id={bodyId} className="disc__body">
        {children}
      </div>
    </div>
  );
}
