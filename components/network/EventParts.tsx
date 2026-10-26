import type { EventCard, YearEventView } from "@/lib/game/network-views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { LockIcon, NetAvatar } from "./NetAvatar";
import { dateParts } from "./ring";

// Eine Einladung in Teilen: Datum, Kosten, wer kommt, Zusagen. Die Netzwerkseite
// zeigt alles, im Brief genügen Fakten und Knöpfe.

const dayText = (n: number) => (n === 1 ? "1 Tag" : `${n} Tage`);

export function EventFacts({ event }: { event: EventCard }) {
  return (
    <ul className="nt-chips" aria-label="Aufwand">
      <li>{event.city}</li>
      <li>{dayText(event.days)}</li>
      <li>{event.travel}</li>
      <li>{eur(event.money)}</li>
    </ul>
  );
}

export function GuestStack({ event, max = 6 }: { event: EventCard; max?: number }) {
  const guests = event.guests.filter((g) => g.open);
  const shown = guests.slice(0, max);
  return (
    <div className="nt-guests">
      <span className="nt-guests__stack" aria-hidden="true">
        {shown.map((g) => (
          <NetAvatar key={g.id} name={g.name} ring={g.ring} size="xs" met={g.met} warmth={g.met ? 60 : 0} />
        ))}
        {guests.length > shown.length && <span className="nt-guests__more">+{guests.length - shown.length}</span>}
      </span>
      <span className="nt-guests__text">
        <b>Wer kommt:</b> {guests.map((g) => `${g.name}${g.met ? "" : " (neu)"}`).join(", ") || "lauter neue Gesichter"}.{event.deal ? " Manchmal ergibt sich ein Deal." : ""}
        {event.mandate ? " Manchmal ein Mandat." : ""}
      </span>
    </div>
  );
}

export function EventButtons({ event, revision, size }: { event: EventCard; revision: number; size?: "sm" }) {
  if (event.status === "attended") return <p className="notice notice--good">Du warst dort.</p>;
  if (event.status === "declined") return <p className="notice">Du hast abgesagt.</p>;
  if (event.status === "accepted") return <p className="notice notice--good">Zugesagt: Der Termin steht am Monatsanfang in deinem Kalender ({event.month}).</p>;
  return (
    <div className="net-btns">
      <ActionButton action={{ type: "event", eventId: event.id, move: "accept" }} revision={revision} days={event.thisMonth ? event.days : undefined} variant="primary" size={size}>
        {event.thisMonth ? "Hingehen" : "Zusagen"}
      </ActionButton>
      {event.talk?.possible && (
        <ActionButton action={{ type: "event", eventId: event.id, move: "accept", talk: true }} revision={revision} days={event.thisMonth ? event.days + 1 : undefined} size={size}>
          {`Mit Vortrag · +${event.talk.reputation} Ruf`}
        </ActionButton>
      )}
      <ActionButton action={{ type: "event", eventId: event.id, move: "decline" }} revision={revision} variant="ghost" size={size}>
        Absagen
      </ActionButton>
      {event.talk && !event.talk.possible && <small className="muted net-btns__why">Vortrag ab {event.talk.from} Ruf.</small>}
    </div>
  );
}

export function EventItem({ event, revision }: { event: EventCard; revision: number }) {
  const d = dateParts(event.month);
  return (
    <li className={`nt-card nt-event${event.thisMonth ? " is-now" : ""}`}>
      <div className="nt-date" aria-label={event.month}>
        <b>{d.month}</b>
        <small>{d.year}</small>
      </div>
      <div className="nt-event__main">
        <h3 className="nt-card__h">{event.name}</h3>
        <EventFacts event={event} />
        <p className="nt-card__text">{event.text}</p>
        <GuestStack event={event} />
        <EventButtons event={event} revision={revision} />
      </div>
    </li>
  );
}

/** The yearly calendar as small tiles, next event first. */
export function YearGrid({ year, invited, now }: { year: YearEventView[]; invited: Record<string, EventCard["status"]>; now: number }) {
  return (
    <ul className="nt-year">
      {year.map((y) => {
        const status = invited[y.id];
        return (
          <li key={y.id} className={`nt-year__tile${y.open ? "" : " is-locked"}${y.next === now ? " is-now" : ""}`}>
            <span className="nt-year__m">{y.month.slice(0, 3)}</span>
            <span className="nt-year__body">
              <b>{y.name}</b>
              <small className="muted">
                {y.city}
                {y.open ? "" : ` · ab ${y.minReputation} Ruf`}
              </small>
              {y.open && status === "invited" && <span className="tag net-tag--favor">Einladung</span>}
              {y.open && (status === "accepted" || status === "attended") && <span className="tag tag--go">Zugesagt</span>}
            </span>
            {!y.open && <LockIcon />}
          </li>
        );
      })}
    </ul>
  );
}
