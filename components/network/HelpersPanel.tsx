import Link from "next/link";
import { ACTION_DAYS } from "@/lib/game/config";
import type { HelperView, RivalView } from "@/lib/game/network-views";
import { ActionButton } from "@/components/game/ActionButton";
import { NetAvatar, NetBadge } from "./NetAvatar";
import { RING_CLASS } from "./ring";

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
      {rival && !rival.defused && <Rival rival={rival} revision={revision} />}
      {rival?.defused && <p className="notice notice--good">{rival.name} hat sich zurückgezogen: Ihr kennt euch gut genug.</p>}
      {helpers.length > 0 && (
        <ul className="net-help__list">
          {helpers.map((h) => (
            <li key={h.id} className={`net-help__row ${RING_CLASS[h.ring]}`}>
              <NetAvatar name={h.name} ring={h.ring} warmth={h.warmth} met={h.met} cooling={h.blocker?.includes("kühl")} size="md" />
              <span className="net-help__who">
                <Link href={`/netzwerk?kontakt=${h.id}`}>
                  <b>{h.name}</b>
                </Link>
                <small className="muted">
                  {h.role} · {h.met ? `Wärme ${h.warmth}` : "noch unbekannt"}
                </small>
                <span className="net-help__why">{h.why}</span>
                {h.blocker && <small className="net-help__block">{h.blocker}</small>}
              </span>
              <span className="net-help__acts">
                {h.blocker && (h.blocker.includes("kühl") || h.blocker.includes("kennst du noch nicht")) && (
                  <ActionButton action={{ type: "meetContact", contactId: h.id }} revision={revision} days={ACTION_DAYS.meetContact} size="sm">
                    Treffen
                  </ActionButton>
                )}
                <ActionButton
                  action={h.action === "intro" ? { type: "introContact", contactId: h.id, startupId: targetId } : { type: "specialist", contactId: h.id, targetId }}
                  revision={revision}
                  days={1}
                  size="sm"
                  variant={h.blocker === null ? "primary" : undefined}
                  disabled={h.blocker !== null}
                >
                  {h.action === "intro" ? "Einbringen" : "Beauftragen"}
                </ActionButton>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small net-help__foot">Jede Hilfe kostet Wärme und füllt dein Vertrauenskonto nicht auf. Wer nur nimmt, bekommt irgendwann ein Nein.</p>
    </section>
  );
}

/** A contact bids for the same company: price up, until the warmth is high enough. */
function Rival({ rival, revision }: { rival: RivalView; revision: number }) {
  const pct = Math.min(100, Math.round((rival.warmth / rival.needed) * 100));
  return (
    <div className={`net-rival-box ${RING_CLASS[rival.ring]}`}>
      <NetAvatar name={rival.name} ring={rival.ring} warmth={rival.warmth} met={rival.met} size="md" />
      <div className="net-rival-box__text">
        <p className="net-rival-box__t">
          <NetBadge kind="rival" /> <b>{rival.name}</b> bietet mit <small className="muted">({rival.org})</small>
        </p>
        <p className="small">
          Der Preis liegt deshalb {Math.round(rival.premium * 100)} % höher. Ab {rival.needed} Wärme zieht {rival.name.split(" ")[0]} zurück.
        </p>
        {rival.open && (
          <>
            <span className="meter net-meter" aria-hidden="true">
              <i style={{ width: `${pct}%` }} />
            </span>
            <small className="muted">
              Wärme jetzt {rival.met ? rival.warmth : "unbekannt"} von {rival.needed}
            </small>
          </>
        )}
        {!rival.open && <small className="muted">Dieser Kreis öffnet sich erst mit mehr Ruf.</small>}
      </div>
      {rival.open && (
        <ActionButton action={{ type: "meetContact", contactId: rival.contactId }} revision={revision} days={ACTION_DAYS.meetContact} size="sm" variant="primary">
          {rival.met ? "Treffen" : "Kennenlernen"}
        </ActionButton>
      )}
    </div>
  );
}
