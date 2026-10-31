import Link from "next/link";
import { monthLabel } from "@/lib/game/config";
import type { CorporatesView } from "@/lib/game/corporates";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";

// Das Konzernmandat auf der Seite des Konzerns: Amtszeit bis zur Hauptversammlung,
// Aussicht auf die Wiederwahl, Vorsitz, Vergütung und der Rücktritt.

const pctText = (n: number) => `${Math.round(n * 100)} %`;

export function CorporateSeat({ view, id, revision, month }: { view: CorporatesView; id: string; revision: number; month: number }) {
  const seat = view.seats.find((x) => x.id === id);
  if (!seat) return null;
  const length = Math.max(1, seat.termEnd - seat.termStart);
  const done = Math.min(1, Math.max(0, (month - seat.termStart) / length));
  const tone = seat.chance >= 0.7 ? "pos" : seat.chance >= 0.45 ? "" : "neg";
  return (
    <section className="corp-seat panel" aria-labelledby="corp-seat-title">
      <div className="corp-seat__head">
        <div>
          <p className="eyebrow">{seat.chair ? "Vorsitz des Aufsichtsrats" : "Mitglied des Aufsichtsrats"}</p>
          <h2 id="corp-seat-title" className="panel__title">
            {seat.terms}. Amtszeit · Hauptversammlung Ende {monthLabel(seat.termEnd)}
          </h2>
        </div>
        {seat.chair && <span className="pill corp-seat__chair">Vorsitz · Stimme {view.chairWeight.toLocaleString("de-DE")}-fach</span>}
      </div>
      <div className="corp-seat__term" role="img" aria-label={`Amtszeit zu ${pctText(done)} vorbei, noch ${seat.monthsLeft} Monate`}>
        <i style={{ width: `${done * 100}%` }} />
        <span>{monthLabel(seat.termStart)}</span>
        <span>noch {seat.monthsLeft} Monate</span>
      </div>
      <dl className="corp-seat__facts">
        <div>
          <dt>Wiederwahl heute</dt>
          <dd className={tone}>{pctText(seat.chance)}</dd>
          <small>Stimmung im Gremium, Qualität deiner Entscheidungen, Umsatz seit Beginn der Amtszeit</small>
        </div>
        <div>
          <dt>Deine Vergütung</dt>
          <dd>{eur(seat.fee)} / Monat</dd>
          <small>
            {seat.partner
              ? `${seat.partner} sitzt für dich im Gremium und bekommt die Hälfte von ${eur(seat.feeTotal)}.`
              : seat.chair
                ? "Als Vorsitz mehr als ein einfaches Mitglied."
                : `Als Vorsitz ${view.chairFee.toLocaleString("de-DE")}-fach.`}
          </small>
        </div>
        <div>
          <dt>Im Aufsichtsrat seit</dt>
          <dd>{monthLabel(seat.since)}</dd>
          <small>{seat.chair ? "Du leitest die Sitzungen." : `Vorsitz möglich bei einer Wiederwahl ab ${view.chairReputation} Ruf, wenn das Gremium dir vertraut.`}</small>
        </div>
      </dl>
      <div className="corp-seat__actions">
        <ActionButton action={{ type: "corporateResign", startupId: id }} revision={revision} variant="ghost" size="sm">
          Zurücktreten
        </ActionButton>
        <span className="muted small">
          Ein Rücktritt mitten in der Amtszeit kostet etwas Ruf. Ein Operating Partner kann das Mandat für dich übernehmen: <Link href="/holding/team">Team</Link>.
        </span>
      </div>
    </section>
  );
}
