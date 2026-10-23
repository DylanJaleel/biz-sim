import { ACTION_DAYS, monthName } from "@/lib/game/config";
import type { CompanyView } from "@/lib/game/views";
import { ActionButton } from "@/components/game/ActionButton";

// Eigener Bereich der Firmenseite: Welche Auflage passt zu welchem Punkt, was
// verraten Kennzahlen, Rückfrage und Vorgespräche, und welche Auflagen warten
// noch auf ihren Folgetermin.

export function CovenantPrep({ view, revision }: { view: CompanyView; revision: number }) {
  const prepDays = view.analyst ? 0 : ACTION_DAYS.question;
  if (view.agenda.length === 0 && view.followUps.length === 0) return null;
  return (
    <section className="panel covenant-prep" id="auflagen" aria-labelledby="covenant-prep-title" data-pane="auflagen">
      <p className="eyebrow">Auflagen</p>
      <h2 id="covenant-prep-title" className="panel__title">
        Ja, aber welches Aber?
      </h2>
      <p className="muted small">
        Zu jedem Punkt stehen drei Auflagen zur Wahl, eine passt zur Lage. Die passende ist oft besser als ein klares Ja oder Nein, die anderen kosten Zeit und Vertrauen. Eine
        Auflage wirkt einen Monat später und nur ganz, wenn du sie im Folgetermin nachprüfst.
      </p>

      {view.agenda.map((item) => (
        <div key={item.id} className="covenant-prep__item">
          <h3 className="item__h">{item.title}</h3>
          <ul className="covenant-list">
            {item.covenants.options.map((c) => (
              <li key={c.id}>
                <b>{c.name}</b> <small className="muted">{c.term}</small>
                <span>{c.short}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">Ohne Aufwand siehst du nur die Kennzahlen. Sie geben Hinweise, aber oft auf mehr als eine Auflage:</p>
          <ul className="covenant-signals" aria-label="Kennzahlen als Hinweis">
            {item.covenants.signals.map((g) => (
              <li key={g.label} className={g.alert ? "is-alert" : undefined}>
                {g.label} <b>{g.value}</b>
              </li>
            ))}
          </ul>
          {item.covenants.risk.a ? (
            <p className="covenant-answer">
              <b>{item.covenants.risk.q}</b> {item.covenants.risk.a}
            </p>
          ) : (
            <div className="item__row covenant-prep__ask">
              <p className="muted">Die Rückfrage zum Risiko zeigt, welche Gefahr die Gründung am meisten fürchtet, und damit, welche Auflage passt.</p>
              <ActionButton action={{ type: "question", itemId: item.id, questionId: item.covenants.risk.id }} revision={revision} days={prepDays} size="sm">
                {item.covenants.risk.q}
              </ActionButton>
            </div>
          )}
          {item.covenants.hints.map((h) => (
            <p key={h.seat} className="covenant-answer">
              <b>{h.short} im Vorgespräch:</b> „{h.text}“
            </p>
          ))}
          {!item.cfo && <p className="muted small">Der CFO rechnet auf der Tagesordnung jede Auflage mit durch.</p>}
        </div>
      ))}

      {view.followUps.length > 0 && (
        <div className="follow-ups" id="folgetermine">
          <h3 className="item__h">Folgetermine: Auflagen nachprüfen</h3>
          <ul className="follow-ups__list">
            {view.followUps.map((f) => (
              <li key={f.itemId}>
                <span>
                  <b>{f.covenant}</b> · {f.title}
                  <small className="muted"> · {f.ready ? `bis Ende ${monthName(f.until)}` : `ab nächstem Monat, bis Ende ${monthName(f.until)}`}</small>
                </span>
                <ActionButton action={{ type: "followUp", itemId: f.itemId }} revision={revision} days={ACTION_DAYS.followUp} size="sm" disabled={!f.ready}>
                  Nachprüfen
                </ActionButton>
              </li>
            ))}
          </ul>
          <p className="muted small">Eine Auflage, die niemand nachprüft, wirkt nur zum Teil, und die Geschäftsführung nimmt die nächste weniger ernst.</p>
        </div>
      )}
    </section>
  );
}
