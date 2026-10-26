import Link from "next/link";
import type { FavorCard } from "@/lib/game/network-views";
import { ActionButton } from "@/components/game/ActionButton";
import { NetAvatar } from "./NetAvatar";

// Eine Bitte eines Kontakts, in Teilen: Kopf mit Frist, Kosten und Nutzen,
// Antwort-Knöpfe. Die Netzwerkseite zeigt alles; im Brief steht der Text schon
// darüber, dort genügen Fakten und Knöpfe.

export function FavorButtons({ favor, revision, size }: { favor: FavorCard; revision: number; size?: "sm" }) {
  return (
    <div className="net-btns">
      <ActionButton
        action={{ type: "favor", favorId: favor.id, accept: true }}
        revision={revision}
        days={favor.days > 0 ? favor.days : undefined}
        variant="primary"
        size={size}
        disabled={Boolean(favor.blocker)}
      >
        Zusagen
      </ActionButton>
      <ActionButton action={{ type: "favor", favorId: favor.id, accept: false }} revision={revision} variant="ghost" size={size}>
        Absagen
      </ActionButton>
      {favor.blocker && <small className="muted net-btns__why">{favor.blocker}</small>}
    </div>
  );
}

export function FavorDue({ favor }: { favor: FavorCard }) {
  return <span className={`nt-due${favor.urgent ? " is-urgent" : ""}`}>{favor.urgent ? "Läuft diesen Monat ab" : `Frist: Ende ${favor.expires}`}</span>;
}

export function FavorFacts({ favor }: { favor: FavorCard }) {
  return (
    <dl className="nt-facts">
      <div>
        <dt>Kostet dich</dt>
        <dd>{favor.cost}</dd>
      </div>
      <div>
        <dt>Bringt dir</dt>
        <dd>{favor.gain}</dd>
      </div>
      <div>
        <dt>Absagen</dt>
        <dd>Kühlt die Beziehung ab. Liegenlassen kühlt stärker.</dd>
      </div>
    </dl>
  );
}

/** The full card on the network page. */
export function FavorItem({ favor, revision }: { favor: FavorCard; revision: number }) {
  return (
    <li className={`nt-card nt-favor nr-${favor.ring}${favor.urgent ? " is-urgent" : ""}`}>
      <div className="nt-card__top">
        <NetAvatar name={favor.contactName} ring={favor.ring} size="md" />
        <Link className="nt-card__who" href={`/netzwerk?kontakt=${favor.contactId}`}>
          {favor.contactName}
        </Link>
        <FavorDue favor={favor} />
      </div>
      <h3 className="nt-card__h">{favor.subject}</h3>
      <p className="nt-card__text">{favor.body}</p>
      <FavorFacts favor={favor} />
      <FavorButtons favor={favor} revision={revision} />
    </li>
  );
}
