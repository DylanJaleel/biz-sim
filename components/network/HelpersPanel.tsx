import Link from "next/link";
import { ACTION_DAYS } from "@/lib/game/config";
import type { HelperView, RivalView } from "@/lib/game/network-views";
import { ActionButton } from "@/components/game/ActionButton";

// Wer hier helfen kann: Kontakte, die eine Firma voranbringen, und
// Spezialisten für Übernahmen, Mandate und Plattformen. Dazu ein Hinweis,
// wenn ein Kontakt bei derselben Firma mitbietet.

export function HelpersPanel({
  helpers,
  rival,
  revision,
  targetId,
  title = "Wer helfen kann",
  lead,
}: {
  helpers: HelperView[];
  rival?: RivalView | null;
  revision: number;
  /** The company (Einbringen) or the deal, add-on, mandate (Spezialist). */
  targetId: string;
  title?: string;
  lead?: string;
}) {
  if (helpers.length === 0 && !rival) return null;
  return (
    <section className="panel net-help" aria-labelledby={`help-${targetId}`}>
      <p className="eyebrow">Netzwerk</p>
      <h2 id={`help-${targetId}`} className="panel__title">
        {title}
      </h2>
      {lead && <p className="muted small">{lead}</p>}
      {rival && !rival.defused && (
        <div className="notice net-help__rival">
          <p>
            <b>{rival.name}</b> ({rival.org}) bietet mit. Der Preis liegt deshalb {Math.round(rival.premium * 100)} % höher. Ab {rival.needed} Wärme zieht {rival.name} zurück
            (jetzt {rival.met ? rival.warmth : "unbekannt"}).
          </p>
          {rival.open ? (
            <ActionButton action={{ type: "meetContact", contactId: rival.contactId }} revision={revision} days={ACTION_DAYS.meetContact} size="sm">
              {rival.met ? "Treffen" : "Kennenlernen"}
            </ActionButton>
          ) : (
            <p className="muted small">Dieser Kreis öffnet sich erst mit mehr Ruf.</p>
          )}
        </div>
      )}
      {rival?.defused && <p className="notice notice--good">{rival.name} hat sich zurückgezogen: Ihr kennt euch gut genug.</p>}
      {helpers.length > 0 && (
        <ul className="net-help__list">
          {helpers.map((h) => (
            <li key={h.id} className="net-help__row">
              <span className="net-help__who">
                <Link href={`/netzwerk?kontakt=${h.id}`}>
                  <b>{h.name}</b>
                </Link>{" "}
                <small className="muted">
                  {h.role} · Wärme {h.warmth}
                </small>
                <span className="net-help__why">{h.why}</span>
                {h.blocker && <small className="muted">{h.blocker}</small>}
              </span>
              {h.blocker && (h.blocker.includes("kühl") || h.blocker.includes("kennst du noch nicht")) && (
                <ActionButton action={{ type: "meetContact", contactId: h.id }} revision={revision} days={ACTION_DAYS.meetContact} size="sm" variant="ghost">
                  Treffen
                </ActionButton>
              )}
              <ActionButton
                action={h.action === "intro" ? { type: "introContact", contactId: h.id, startupId: targetId } : { type: "specialist", contactId: h.id, targetId }}
                revision={revision}
                days={1}
                size="sm"
                disabled={h.blocker !== null}
              >
                {h.action === "intro" ? "Einbringen" : "Beauftragen"}
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">Jede Hilfe kostet Wärme und füllt dein Vertrauenskonto nicht auf. Wer nur nimmt, bekommt irgendwann ein Nein.</p>
    </section>
  );
}
