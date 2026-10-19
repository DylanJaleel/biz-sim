import { dayRate } from "@/lib/game/gigs";
import type { Gig } from "@/lib/game/types";
import { ActionButton } from "./ActionButton";
import { eur } from "./format";

/** This month's paid work. Every job costs days the mandates do not get. */
export function GigList({ gigs, revision, reputation, daysLeft, compact }: { gigs: Gig[]; revision: number; reputation: number; daysLeft: number; compact?: boolean }) {
  const offered = gigs.filter((g) => g.status === "offered");
  const booked = gigs.filter((g) => g.status === "booked");
  return (
    <div className={compact ? "gigs gigs--compact" : "gigs"}>
      {!compact && <p className="muted small">Dein Tagessatz bei {reputation} Ruf: {eur(dayRate(reputation))}. Bezahlt wird am Monatsende.</p>}
      {offered.length === 0 && booked.length === 0 && <p className="muted small">Diesen Monat liegen keine Aufträge vor.</p>}
      <ul>
        {booked.map((g) => (
          <li key={g.id} className="gig is-booked">
            <span className="gig__body">
              <b>{g.title}</b>
              <span className="muted small">
                {g.client} · {g.days === 1 ? "1 Tag" : `${g.days} Tage`} · gebucht
              </span>
            </span>
            <span className="gig__fee">{eur(g.fee)}</span>
          </li>
        ))}
        {offered.map((g) => (
          <li key={g.id} className="gig">
            <span className="gig__body">
              <b>{g.title}</b>
              <span className="muted small">
                {g.client}
                {g.reputation ? ` · +${g.reputation} Ruf` : ""}
                {g.contactId ? " · Kontakt" : ""}
              </span>
              {!compact && <span className="gig__text">{g.text}</span>}
            </span>
            <span className="gig__fee">{eur(g.fee)}</span>
            <ActionButton action={{ type: "gig", gigId: g.id }} revision={revision} days={g.days} size="sm" disabled={g.days > daysLeft}>
              Annehmen
            </ActionButton>
          </li>
        ))}
      </ul>
    </div>
  );
}
