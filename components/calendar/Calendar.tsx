import { currentGame } from "@/lib/current-game";
import { ACTION_DAYS, DAYS_PER_MONTH, monthLabel } from "@/lib/game/config";
import type { ActionKind } from "@/lib/game/types";
import { eur, signed } from "@/components/game/format";
import { ReportButton } from "./ReportButton";

const KIND_LABEL: Partial<Record<ActionKind, string>> = {
  dd: "Prüfung",
  invest: "Beteiligung",
  question: "Rückfrage",
  cfo: "CFO-Gespräch",
  pretalk: "Vorgespräch",
  meeting: "Beiratssitzung",
  founderCall: "Gespräch mit Gründung",
  learn: "Weiterbildung",
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr"];

export async function Calendar() {
  const { state } = await currentGame();
  const days = Array.from({ length: DAYS_PER_MONTH }, (_, i) => {
    const day = i + 1;
    const entry = state.calendar.find((c) => day >= c.day && day < c.day + c.days);
    return { day, entry, start: entry?.day === day };
  });
  const reports = [...state.reports].reverse();

  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow">Kalender</p>
        <h1 className="page__title">{monthLabel(state.month)}</h1>
        <p className="page__lead">
          Ein Monat hat {DAYS_PER_MONTH} Arbeitstage. Jede Handlung belegt Tage. Was du nicht schaffst, entscheiden andere.
        </p>
      </header>

      <div className="cal" role="grid" aria-label={`Arbeitstage im ${monthLabel(state.month)}`}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal__wd" role="columnheader">
            {w}
          </span>
        ))}
        {days.map(({ day, entry, start }) => (
          <div key={day} role="gridcell" className={`cal__day${entry ? ` cal__day--${entry.kind}` : ""}${start ? " is-start" : ""}`}>
            <span className="cal__num">{day}</span>
            {start && entry && (
              <span className="cal__label">
                <b>{KIND_LABEL[entry.kind] ?? entry.kind}</b>
                <span>{entry.label}</span>
              </span>
            )}
          </div>
        ))}
      </div>

      <section className="page__section">
        <h2 className="section-title">Was wie lange dauert</h2>
        <ul className="costs">
          {(Object.keys(ACTION_DAYS) as (keyof typeof ACTION_DAYS)[]).map((k) => (
            <li key={k}>
              <span className={`cal__swatch cal__day--${k}`} aria-hidden="true" />
              {KIND_LABEL[k]} <b>{ACTION_DAYS[k] === 1 ? "1 Tag" : `${ACTION_DAYS[k]} Tage`}</b>
            </li>
          ))}
        </ul>
      </section>

      {reports.length > 0 && (
        <section className="page__section">
          <h2 className="section-title">Monatsberichte</h2>
          <ul className="list">
            {reports.map((r) => (
              <li key={r.month} className="list__row">
                <b>{monthLabel(r.month)}</b>
                <span className="muted">
                  Kapital {eur(r.playerCash)} · Beteiligungen {eur(r.portfolioValue)} · Ruf {r.reputation} ({signed(r.reputation - r.reputationBefore)})
                </span>
                <ReportButton report={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
