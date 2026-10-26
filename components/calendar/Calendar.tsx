import { currentGame } from "@/lib/current-game";
import { ACTION_DAYS, monthLabel } from "@/lib/game/config";
import { daysLeft } from "@/lib/game/engine";
import { monthDays, officeOf } from "@/lib/game/office";
import type { ActionKind } from "@/lib/game/types";
import { eur, signed } from "@/components/game/format";
import { GigList } from "@/components/game/GigList";
import { ReportButton } from "./ReportButton";
import Link from "next/link";
import { calendarEvents } from "@/lib/game/network-views";
import { EventFacts } from "@/components/network/EventParts";
import { dateParts } from "@/components/network/ring";

const KIND_LABEL: Partial<Record<ActionKind, string>> = {
  dd: "Prüfung",
  invest: "Beteiligung",
  question: "Rückfrage",
  cfo: "CFO-Gespräch",
  pretalk: "Vorgespräch",
  meeting: "Beiratssitzung",
  founderCall: "Gespräch mit Gründung",
  learn: "Weiterbildung",
  round: "Gesellschafterversammlung",
  buyShares: "Anteilskauf",
  askShares: "Anteile anfragen",
  meetContact: "Kontakt treffen",
  introContact: "Kontakt einbringen",
  gig: "Auftrag",
  exit: "Verkauf",
  negotiate: "Verhandlung",
  joinCorporate: "Aufsichtsrat",
  favor: "Gefallen",
  event: "Veranstaltung",
  specialist: "Spezialist",
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr"];

const dayText = (n: number) => (n === 0 ? "Analyst" : n === 1 ? "1 Tag" : `${n} Tage`);

export async function Calendar() {
  const { state } = await currentGame();
  const total = monthDays(state);
  const office = officeOf(state);
  const days = Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    const entry = state.calendar.find((c) => day >= c.day && day < c.day + c.days);
    return { day, entry, start: entry?.day === day };
  });
  const reports = [...state.reports].reverse();
  const events = calendarEvents(state);

  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow">Kalender</p>
        <h1 className="page__title">{monthLabel(state.month)}</h1>
        <p className="page__lead">
          Ein Monat hat {total} Arbeitstage{office.extraDays > 0 ? `, dank ${office.name}` : ""}. Jede Handlung belegt Tage. Was du nicht schaffst, entscheiden andere.
        </p>
      </header>

      <div className="cal-layout">
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

        <div className="cal-layout__side">
          {events.length > 0 && (
            <section className="page__section" aria-labelledby="cal-events">
              <h2 id="cal-events" className="section-title">
                Termine im Netzwerk
              </h2>
              <ul className="nt-cards nt-cards--tight">
                {events.map((e) => {
                  const d = dateParts(e.month);
                  return (
                    <li key={e.id} className={`nt-card nt-event nt-event--row${e.thisMonth ? " is-now" : ""}`}>
                      <div className="nt-date" aria-label={e.month}>
                        <b>{d.month}</b>
                        <small>{d.year}</small>
                      </div>
                      <div className="nt-event__main">
                        <h3 className="nt-card__h">{e.name}</h3>
                        <EventFacts event={e} />
                        <p className="nt-event__status">
                          <span className={`tag ${e.status === "invited" ? "net-tag--favor" : "tag--go"}`}>
                            {e.status === "attended" ? "Besucht" : e.status === "accepted" ? "Zugesagt" : "Einladung offen"}
                          </span>
                          {e.status === "invited" && (
                            <Link className="btn btn--sm" href={e.mailId ? `/post?mail=${e.mailId}` : "/netzwerk#termine"}>
                              Antworten
                            </Link>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="page__section">
            <h2 className="section-title">Bezahlte Aufträge</h2>
            <GigList gigs={state.gigs.filter((g) => g.month === state.month)} reputation={state.reputation} daysLeft={daysLeft(state)} />
          </section>

          <section className="page__section">
            <h2 className="section-title">Was wie lange dauert</h2>
            <ul className="costs">
              {(Object.keys(ACTION_DAYS) as (keyof typeof ACTION_DAYS)[]).map((k) => (
                <li key={k}>
                  <span className={`cal__swatch cal__day--${k}`} aria-hidden="true" />
                  {KIND_LABEL[k]} <b>{dayText(k === "dd" ? office.ddDays : office.analyst && (k === "cfo" || k === "question") ? 0 : ACTION_DAYS[k])}</b>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

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
