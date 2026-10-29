"use client";

import { useEffect, useRef, useState } from "react";
import { monthLabel } from "@/lib/game/config";
import type { MonthReport } from "@/lib/game/types";
import { eur, signed } from "@/components/game/format";
import { usePlay } from "@/components/game/usePlay";

interface CloseMonthProps {
  revision: number;
  month: number;
  openItems: string[];
  daysLeft: number;
}

/** Closing the month moves time on. Open board items lapse, so the button asks first. */
export function CloseMonth({ revision, month, openItems, daysLeft }: CloseMonthProps) {
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
      {report && <ReportDialog report={report} onClose={() => setReport(null)} />}
    </>
  );
}

export function Dialog({ label, onClose, children, wide }: { label: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    // No close() on cleanup: it would fire onClose and dismiss the dialog during a remount.
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "dialog dialog--wide" : "dialog"}
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

function Change({ before, after, money = true }: { before: number; after: number; money?: boolean }) {
  const diff = after - before;
  const tone = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return (
    <span className={`change change--${tone}`}>
      {money ? eur(after) : after}
      <small>{money ? signed(Math.round(diff / 100) / 10, " Tsd.") : signed(diff)}</small>
    </span>
  );
}

export function ReportDialog({ report, onClose }: { report: MonthReport; onClose: () => void }) {
  return (
    <Dialog label={`Monatsbericht ${monthLabel(report.month)}`} onClose={onClose} wide>
      <p className="eyebrow">Monatsbericht</p>
      <h2 className="dialog__title">{monthLabel(report.month)}</h2>
      <div className="report__totals">
        <div>
          <span>Privatkapital</span>
          <Change before={report.playerCashBefore} after={report.playerCash} />
        </div>
        <div>
          <span>Beteiligungen</span>
          <Change before={report.portfolioValueBefore} after={report.portfolioValue} />
        </div>
        <div>
          <span>Ruf</span>
          <Change before={report.reputationBefore} after={report.reputation} money={false} />
        </div>
      </div>
      {report.income && (
        <dl className="report__income">
          {[
            ["Beratung", report.income.consulting],
            ["Beiratsvergütung", report.income.boardFees],
            ["Zinsen und Dividenden", report.income.payouts],
            ["Lebenshaltung", report.income.living],
            ["Büromiete", report.income.rent ?? 0],
            ["Fuhrpark", report.income.vehicles ?? 0],
            ["Gehälter", report.income.salaries ?? 0],
            ["Fondsgebühr", report.income.fundFee ?? 0],
            ["Ausschüttungen", report.income.dividends ?? 0],
            ["Kaufkredite", report.income.loans ?? 0],
            ["Aktien nach Sperrfrist", report.income.lockups ?? 0],
            ["Dispozinsen", report.income.interest],
          ]
            .filter(([, v]) => v !== 0)
            .map(([label, v]) => (
              <div key={label as string}>
                <dt>{label}</dt>
                <dd className={(v as number) >= 0 ? "pos" : "neg"}>{eur(v as number)}</dd>
              </div>
            ))}
        </dl>
      )}
      {report.lines.length === 0 && <p className="dialog__muted">Noch keine Beteiligung. Schau in die Post: Dort liegen Angebote.</p>}
      {report.lines.map((line) => (
        <section key={line.startupId} className="report__line">
          <header>
            <b>{line.name}</b>
            {line.status === "dead" && <span className="tag tag--no">insolvent</span>}
            {line.status === "exited" && <span className="tag tag--go">verkauft</span>}
            {line.status === "sold" && <span className="tag tag--no">Anteil verkauft</span>}
          </header>
          <div className="report__figures">
            <span>
              Umsatz/Monat <Change before={line.revenueBefore} after={line.revenue} />
            </span>
            <span>
              Kasse <Change before={line.cashBefore} after={line.cash} />
            </span>
            <span>
              Bewertung <Change before={line.valuationBefore} after={line.valuation} />
            </span>
            <span>
              {line.corporate ? (
                <>
                  Rolle <b>Aufsichtsrat</b>
                </>
              ) : (
                <>
                  Dein Anteil <b>{line.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</b>
                </>
              )}
            </span>
          </div>
          {line.valueWhy && <p className="report__why">{line.valueWhy}</p>}
          {line.events.length > 0 && (
            <ul className="report__events">
              {line.events.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {report.notes.length > 0 && (
        <ul className="report__notes">
          {report.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      <div className="dialog__actions">
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Weiter
        </button>
      </div>
    </Dialog>
  );
}
