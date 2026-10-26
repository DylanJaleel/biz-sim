import Link from "next/link";
import { ACTION_DAYS, monthName } from "@/lib/game/config";
import type { CompanyView } from "@/lib/game/views";
import type { HintView } from "@/lib/game/network-views";
import { ActionButton } from "@/components/game/ActionButton";
import { NetAvatar } from "@/components/network/NetAvatar";

// Eigener Bereich der Firmenseite: Welche Auflage passt zu welchem Punkt, was
// verraten Kennzahlen, Rückfrage und Vorgespräche, und welche Auflagen warten
// noch auf ihren Folgetermin.

export function CovenantPrep({ view, revision, hints = [] }: { view: CompanyView; revision: number; hints?: HintView[] }) {
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
          <NetworkHint hint={hints.find((h) => h.itemId === item.id)} revision={revision} />
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

/** A call to someone in the network who knows these conditions: costs warmth instead of days. */
function NetworkHint({ hint, revision }: { hint?: HintView; revision: number }) {
  if (!hint) return null;
  if (hint.tip)
    return (
      <div className="covenant-answer covenant-answer--network net-tip">
        <NetAvatar name={hint.tip.name} ring={hint.tip.ring} size="sm" />
        <p>
          <b>{hint.tip.name} am Telefon:</b> {hint.tip.text}
        </p>
      </div>
    );
  if (hint.options.length === 0) return null;
  const ready = hint.options.filter((o) => o.blocker === null);
  const cold = hint.options.filter((o) => o.blocker !== null);
  return (
    <div className="covenant-hint">
      <p className="eyebrow">Netzwerk</p>
      <p className="muted small">
        Wer sich mit Auflagen auskennt, nennt die passende oder sagt, welche es nicht ist. Das kostet keinen Tag, aber {hint.cost} Wärme (ab {hint.min} Wärme).
      </p>
      {ready.length > 0 && (
        <ul className="covenant-hint__list">
          {ready.slice(0, 3).map((o) => (
            <li key={o.id}>
              <NetAvatar name={o.name} ring={o.ring} warmth={o.warmth} size="sm" />
              <span className="covenant-hint__who">
                <b>{o.name}</b>
                <small className="muted">
                  {o.role} · kennt {o.knows.join(" und ")} · Wärme {o.warmth}
                </small>
              </span>
              <ActionButton action={{ type: "contactHint", contactId: o.id, itemId: hint.itemId }} revision={revision} size="sm" variant="primary">
                Anrufen
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
      {cold.length > 0 && (
        <p className="muted small">
          {ready.length > 0 ? "Auch" : "Wüssten etwas, sind aber gerade nicht erreichbar"}: {cold.map((o) => `${o.name} (Wärme ${o.warmth})`).join(", ")}. Ein Treffen im{" "}
          <Link href="/netzwerk">Netzwerk</Link> wärmt die Beziehung.
        </p>
      )}
    </div>
  );
}
