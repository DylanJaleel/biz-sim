import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import type { DuelView } from "@/lib/game/rivals-views";

// Das Bietgefecht um einen Familienbetrieb: du gegen einen Rivalen, höchstens
// drei Runden. Der Inhaber wertet Preis und Bedingungen.

export function DuelPanel({ id, duel, revision }: { id: string; duel: DuelView; revision: number }) {
  const open = duel.status === "open";
  const left = duel.rounds - duel.round;
  const max = Math.max(duel.scoreYou, duel.scoreRival, 1);
  return (
    <section className={`panel duel${open ? " is-open" : ""}`} aria-labelledby="duel-title">
      <div className="panel__row">
        <div>
          <p className="eyebrow">{open ? `Bietgefecht · Runde ${Math.min(duel.round + 1, duel.rounds)} von ${duel.rounds} · Frist bis Monatsende` : "Bietgefecht entschieden"}</p>
          <h2 id="duel-title" className="panel__title">
            Du gegen {duel.rival.name}
          </h2>
          <p className="muted small">
            {duel.rival.head}, {duel.rival.kind} aus {duel.rival.city}. {duel.rival.style}
          </p>
        </div>
      </div>
      <div className="duel__vs" role="group" aria-label="Wertung des Inhabers">
        <div className={duel.ahead ? "is-ahead" : undefined}>
          <small>Dein Gebot</small>
          <b>{eur(duel.you)}</b>
          <span>{duel.concept ? "mit Nachfolge-Konzept" : "keine Zusagen"}</span>
          <i style={{ width: `${(duel.scoreYou / max) * 100}%` }} aria-hidden="true" />
        </div>
        <div className={duel.ahead ? undefined : "is-ahead"}>
          <small>{duel.rival.name}</small>
          <b>{eur(duel.rivalBid)}</b>
          <span>{duel.rival.terms}</span>
          <i style={{ width: `${(duel.scoreRival / max) * 100}%` }} aria-hidden="true" />
        </div>
      </div>
      <p className={`notice ${duel.status === "won" ? "notice--good" : duel.status === "open" ? (duel.ahead ? "notice--good" : "notice--warn") : "notice--bad"}`}>
        {duel.status === "won"
          ? `Zuschlag für dich bei ${eur(duel.you)}. Jetzt prüfen und finanzieren.`
          : duel.status === "lost"
            ? `${duel.rival.name} hat den Zuschlag bekommen.`
            : duel.status === "left"
              ? "Du bist ausgestiegen."
              : duel.ahead
                ? "Der Inhaber sieht dich vorn."
                : `Der Inhaber sieht ${duel.rival.name} vorn: Er wertet Preis und Bedingungen. Noch ${left === 1 ? "eine Runde" : `${left} Runden`}.`}
      </p>
      {open && (
        <div className="panel__actions duel__moves">
          <ActionButton
            action={{ type: "duel", targetId: id, move: "raise", size: "small" }}
            revision={revision}
            days={duel.days.raise}
            variant="primary"
            disabled={duel.daysLeft < duel.days.raise}
          >
            Auf {eur(duel.raise.small)} erhöhen
          </ActionButton>
          <ActionButton action={{ type: "duel", targetId: id, move: "raise", size: "big" }} revision={revision} days={duel.days.raise} disabled={duel.daysLeft < duel.days.raise}>
            Auf {eur(duel.raise.big)} erhöhen
          </ActionButton>
          {!duel.concept && (
            <ActionButton action={{ type: "duel", targetId: id, move: "concept" }} revision={revision} days={duel.days.concept} disabled={duel.daysLeft < duel.days.concept}>
              Nachfolge-Konzept vorlegen
            </ActionButton>
          )}
          <ActionButton action={{ type: "duel", targetId: id, move: "leave" }} revision={revision} variant="ghost">
            Aussteigen
          </ActionButton>
        </div>
      )}
      {open && !duel.concept && (
        <p className="muted small">
          Nachfolge-Konzept: Standort fünf Jahre sichern, Bonus für die Belegschaft, der Inhaber bleibt Berater. Ihm ist das meist {eur(duel.conceptRange[0])} bis{" "}
          {eur(duel.conceptRange[1])} wert. Dich kostet es beim Kauf etwa {eur(duel.conceptCost)}, dafür vertraut dir die Belegschaft.
        </p>
      )}
      {open && <p className="muted small">Gewinnerfluch: Wer im Bietgefecht gewinnt, hat oft zu viel bezahlt. Jede Erhöhung kostet Rendite. Aussteigen ist kein Fehler.</p>}
      <ol className="duel__log" aria-label="Verlauf">
        {duel.log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </section>
  );
}
