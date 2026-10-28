"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface StatsData {
  monthLong: string;
  monthShort: string;
  free: number;
  total: number;
  cash: string;
  worth: string;
  reputation: number;
}

/** Kennzahlen der Kopfleiste. Auf schmalen Breiten bleiben Tage und Privatkapital, ein Tipp auf den Pfeil zeigt alle. */
export function TopBarStats({ data }: { data: StatsData }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        box.current?.querySelector<HTMLElement>(".tbs__more")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pct = `${(data.free / data.total) * 100}%`;
  return (
    <div className="tbs" ref={box}>
      <dl className="tbs__list">
        <div className="tbs__i tbs__i--3">
          <dt>Monat</dt>
          <dd>
            <span className="tbs__long">{data.monthLong}</span>
            <span className="tbs__short">{data.monthShort}</span>
          </dd>
        </div>
        <div className="tbs__i tbs__i--1">
          <dt>Tage frei</dt>
          <dd>
            <span className="days" aria-hidden="true">
              <i style={{ width: pct }} />
            </span>
            {data.free} / {data.total}
          </dd>
        </div>
        <div className="tbs__i tbs__i--1">
          <dt>Privatkapital</dt>
          <dd>{data.cash}</dd>
        </div>
        <div className="tbs__i tbs__i--2">
          <dt>Vermögen</dt>
          <dd>{data.worth}</dd>
        </div>
        <div className="tbs__i tbs__i--3">
          <dt>Ruf</dt>
          <dd>{data.reputation}</dd>
        </div>
      </dl>
      <button type="button" className="tbs__more" aria-expanded={open} aria-controls={id} aria-label="Alle Kennzahlen anzeigen" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <dl className="tbs__pop" id={id} aria-label="Kennzahlen">
          <div>
            <dt>Monat</dt>
            <dd>{data.monthLong}</dd>
          </div>
          <div>
            <dt>Tage frei</dt>
            <dd>
              {data.free} von {data.total}
            </dd>
          </div>
          <div>
            <dt>Privatkapital</dt>
            <dd>{data.cash}</dd>
          </div>
          <div>
            <dt>Vermögen</dt>
            <dd>{data.worth}</dd>
          </div>
          <div>
            <dt>Ruf</dt>
            <dd>{data.reputation}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
