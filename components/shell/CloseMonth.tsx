"use client";

import { useEffect, useRef, useState } from "react";
import { monthLabel } from "@/lib/game/config";
import type { MonthReport } from "@/lib/game/types";
import type { MonthOutlook } from "@/lib/game/month-view";
import { MonthOverview } from "./MonthOverview";
import { usePlay } from "@/components/game/usePlay";

interface CloseMonthProps {
  revision: number;
  month: number;
  openItems: string[];
  daysLeft: number;
  /** Was im neuen Monat ansteht; wird nach dem Abschluss mit dem neuen Stand geliefert. */
  outlook?: MonthOutlook;
}

/** Closing the month moves time on. Open board items lapse, so the button asks first. */
export function CloseMonth({ revision, month, openItems, daysLeft, outlook }: CloseMonthProps) {
  const { play, pending, error, clearError } = usePlay(revision);
  const [confirm, setConfirm] = useState(false);
  const [report, setReport] = useState<MonthReport | null>(null);

  const close = () => {
    play({ type: "closeMonth" }, (data) => {
      setConfirm(false);
      if (data.result.kind === "report") setReport(data.result.report);
    });
  };

  return (
    <>
      <button type="button" className="btn btn--primary topbar__close" onClick={() => setConfirm(true)}>
        <span className="topbar__long">Monat abschließen</span>
        <span className="topbar__short">Abschließen</span>
      </button>
      {confirm && (
        <Dialog
          label={`${monthLabel(month)} abschließen`}
          onClose={() => {
            setConfirm(false);
            clearError();
          }}
        >
          <p className="eyebrow">{monthLabel(month)}</p>
          <h2 className="dialog__title">Monat abschließen?</h2>
          {openItems.length > 0 ? (
            <p className="dialog__warn">Offene Vorlage bei {openItems.join(", ")}. Ohne Sitzung entscheidet die Gründung allein. Das kostet Vertrauen und Ruf.</p>
          ) : (
            <p>Die Firmen arbeiten einen Monat weiter. Danach liegt der Monatsbericht auf deinem Tisch.</p>
          )}
          {daysLeft > 0 && <p className="dialog__muted">Du hast noch {daysLeft} freie Tage. Sie verfallen.</p>}
          {error && (
            <p className="dialog__warn" role="alert">
              {error}
            </p>
          )}
          <div className="dialog__actions">
            <button type="button" className="btn" onClick={() => setConfirm(false)} disabled={pending}>
              Abbrechen
            </button>
            <button type="button" className="btn btn--primary" onClick={close} disabled={pending}>
              {pending ? "Monat läuft…" : "Abschließen"}
            </button>
          </div>
        </Dialog>
      )}
      {report && <ReportDialog report={report} outlook={outlook} animate onClose={() => setReport(null)} />}
    </>
  );
}

export function Dialog({ label, onClose, children, wide, className }: { label: string; onClose: () => void; children: React.ReactNode; wide?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    // No close() on cleanup: it would fire onClose and dismiss the dialog during a remount.
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={[wide ? "dialog dialog--wide" : "dialog", className].filter(Boolean).join(" ")}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog__body">{children}</div>
    </dialog>
  );
}

export function ReportDialog({ report, onClose, outlook, animate = false }: { report: MonthReport; onClose: () => void; outlook?: MonthOutlook; animate?: boolean }) {
  return (
    <Dialog label={`Monatsbericht ${monthLabel(report.month)}`} onClose={onClose} wide className="dialog--month">
      <MonthOverview report={report} outlook={outlook} animate={animate} onClose={onClose} />
    </Dialog>
  );
}
