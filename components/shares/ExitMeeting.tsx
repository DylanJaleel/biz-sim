"use client";

import Link from "next/link";
import { HOLDER_LABEL } from "@/lib/game/captable";
import { ACTION_DAYS, IPO_LOCKUP } from "@/lib/game/config";
import type { ExitChoice, GvBallot } from "@/lib/game/types";
import type { ExitView } from "@/lib/game/views";
import { eur } from "@/components/game/format";
import { usePlay } from "@/components/game/usePlay";
import { BallotSpeech, GvStage, useReveal, type Seat } from "./GvStage";
import { fmtPct, HOLDER_COLOR, initialsOf } from "./holders";

// Ein Käufer will die ganze Firma. Die Gesellschafterversammlung stimmt ab,
// das Geld fließt durch den Wasserfall: Präferenzen zuerst, dann nach Anteilen.

const STATUS_TEXT: Record<ExitView["offer"]["status"], string> = {
  open: "Offen",
  negotiating: "In Verhandlung",
  accepted: "Verkauft",
  rejected: "Abgelehnt",
  withdrawn: "Zurückgezogen",
};

export function ExitMeeting({ view, revision }: { view: ExitView; revision: number }) {
  const { offer } = view;
  const open = offer.status === "open";
  const { play, pending, error } = usePlay(revision);
  const ballots: GvBallot[] = offer.ballots ?? [];
  const { revealed, start, voting, current, finished, yes, no } = useReveal(ballots, !open);
  const negotiated = offer.choice === "negotiate";

  const decide = (choice: ExitChoice) => play({ type: "exit", exitId: offer.id, choice }, choice === "negotiate" ? undefined : start);

  const seats: Seat[] = voting
    ? ballots.map((b, i) => ({ ...b, vote: i < revealed ? b.vote : undefined }))
    : [
        { id: "you", name: "Du", kind: "you", pct: view.stake },
        ...[...view.holders].sort((a, b) => b.pct - a.pct).map((h) => ({ id: h.id, name: h.name, kind: h.kind, pct: h.pct })),
      ];
  const mine = view.payouts.find((p) => p.id === "you")?.amount ?? 0;
  const ratio = offer.price / Math.max(1, view.value);
  const tooBusy = open && view.daysLeft < ACTION_DAYS.exit;
  const payouts = [...view.payouts].sort((a, b) => b.amount - a.amount);

  return (
    <div className="gv">
      <header className="room__header">
        <nav className="crumbs" aria-label="Pfad">
          <Link href="/">Büro</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/firma/${view.startupId}`}>{view.startupName}</Link>
          <span aria-hidden="true">/</span>
          <span>Verkauf</span>
        </nav>
        <h1 className="room__title">
          {offer.ipo ? `${view.startupName} kann an die Börse` : `${offer.buyer} will ${view.startupName} kaufen`}
        </h1>
        <p className="room__motion">
          {offer.ipo
            ? `Die Banken trauen sich eine Bewertung von ${eur(offer.price)} zu. Die Hälfte deines Erlöses bekommst du sofort, die andere Hälfte deiner Aktien ist ${IPO_LOCKUP} Monate gesperrt und folgt bis dahin dem Markt.`
            : `Für die ganze Firma bietet ${offer.buyer} ${eur(offer.price)}. Das ist ${ratio >= 1 ? `${fmtPct((ratio - 1) * 100)} mehr` : `${fmtPct((1 - ratio) * 100)} weniger`} als der heutige Wert.`}{" "}
          Jedes Prozent der Firma hat eine Stimme.
        </p>
        <div className="gv__terms">
          <span>
            <small>{offer.ipo ? "Bewertung" : "Kaufpreis"}</small>
            <b>{eur(offer.price)}</b>
          </span>
          <span>
            <small>Heutiger Wert</small>
            <b>{eur(view.value)}</b>
          </span>
          <span>
            <small>Dein Anteil</small>
            <b>{fmtPct(view.stake)}</b>
          </span>
          <span>
            <small>Du bekämst</small>
            <b>{eur(mine + view.carry)}</b>
          </span>
          {!open && <span className={`tag ${offer.status === "accepted" ? "tag--go" : "tag--no"}`}>{STATUS_TEXT[offer.status]}</span>}
        </div>
      </header>

      <div className="room__body">
        <div className="room__stage">
          <GvStage
            seats={seats}
            voting={voting}
            finished={finished}
            approved={offer.status === "accepted"}
            current={current}
            yes={yes}
            no={no}
            idle={offer.ipo ? "Börsengang?" : "Verkaufen?"}
            label="Halbrund aus 100 Anteilen: wer dem Verkauf zustimmt"
          />
          <section className="panel waterfall" aria-labelledby="wf-title">
            <p className="eyebrow">Wasserfall</p>
            <h2 id="wf-title" className="panel__title">
              Wer bekommt was?
            </h2>
            <p className="muted">
              Wer in Runden Geld gegeben hat, bekommt es zuerst zurück, oder nimmt seinen Anteil, wenn der mehr bringt. Der Rest wird nach Prozenten verteilt.
            </p>
            <ul className="waterfall__list">
              {payouts.map((p) => (
                <li key={p.id} className={p.id === "you" ? "is-you" : undefined} style={{ ["--member" as string]: HOLDER_COLOR[p.kind] }}>
                  <span className="gv__avatar">{initialsOf(p.name)}</span>
                  <span className="waterfall__name">
                    {p.name}
                    <small>
                      {HOLDER_LABEL[p.kind]} · {fmtPct(p.pct)}
                      {p.pref > 0 && ` · Präferenz ${eur(p.pref)}`}
                    </small>
                  </span>
                  <span className="waterfall__bar" aria-hidden="true">
                    <i style={{ width: `${Math.min(100, (p.amount / Math.max(1, offer.price)) * 100)}%` }} />
                  </span>
                  <b>{eur(p.amount)}</b>
                </li>
              ))}
            </ul>
            {view.carry > 0 && <p className="notice">Dazu kommt dein Carry aus dem Syndikat: {eur(view.carry)}.</p>}
          </section>
        </div>

        <aside className="room__side">
          {current && current.reason && !finished && <BallotSpeech ballot={current} />}

          {open && !voting && (
            <section className="panel choice" aria-labelledby="exit-choice">
              <p className="eyebrow">Deine Entscheidung</p>
              <h2 id="exit-choice" className="panel__title">
                Verkaufen?
              </h2>
              <p>
                Bei diesem Preis bekommst du {eur(mine + view.carry)} für deinen Anteil von {fmtPct(view.stake)}. Danach ist die Firma nicht mehr in deinem Portfolio, das Geld aber
                auf deinem Konto.
              </p>
              {tooBusy ? (
                <p className="notice notice--warn">Die Versammlung kostet {ACTION_DAYS.exit} Tage. Ohne dich stimmen die anderen am Monatsende ab.</p>
              ) : (
                <div className="exit__buttons">
                  <button type="button" className="btn btn--primary btn--lg" onClick={() => decide("accept")} disabled={pending}>
                    Zustimmen · {ACTION_DAYS.exit} Tage
                  </button>
                  {!negotiated && (
                    <button type="button" className="btn btn--lg" onClick={() => decide("negotiate")} disabled={pending || view.daysLeft < ACTION_DAYS.negotiate}>
                      Nachverhandeln · {ACTION_DAYS.negotiate} Tag
                    </button>
                  )}
                  <button type="button" className="btn btn--lg" onClick={() => decide("reject")} disabled={pending}>
                    Ablehnen · {ACTION_DAYS.exit} Tage
                  </button>
                </div>
              )}
              {pending && <p className="muted">Die Versammlung tagt…</p>}
              {error && (
                <p className="action__error" role="alert">
                  {error}
                </p>
              )}
              <p className="choice__hint">
                {negotiated
                  ? "Der Käufer hat nachgelegt. Ein zweites Mal verhandelt er nicht."
                  : "Nachverhandeln bringt vielleicht 15 % mehr. Manchmal steigt der Käufer aber aus, und die Gründung ist enttäuscht."}{" "}
                Auch wenn du ablehnst, kann die Mehrheit der anderen verkaufen.
              </p>
            </section>
          )}

          {finished && (
            <section className="panel" aria-labelledby="exit-result">
              <p className="eyebrow">Ergebnis</p>
              <h2 id="exit-result" className="panel__title panel__title--serif">
                {offer.status === "accepted" ? (offer.ipo ? `${view.startupName} ist an der Börse` : `${view.startupName} ist verkauft`) : "Die Firma bleibt eigenständig"}
              </h2>
              <p>
                {offer.status === "accepted"
                  ? `${eur(mine + view.carry)} gehen auf dein Konto. ${view.carry > 0 ? `Davon ${eur(view.carry)} Carry aus dem Syndikat.` : ""}`
                  : "Die Mehrheit der Anteile hat gegen den Verkauf gestimmt. Der Käufer zieht weiter."}
              </p>
              <div className="verdict__actions">
                <Link className="btn btn--primary" href="/portfolio">
                  Zum Portfolio
                </Link>
                <Link className="btn" href="/">
                  Ins Büro
                </Link>
              </div>
            </section>
          )}

          {offer.status === "withdrawn" && (
            <section className="panel">
              <p className="eyebrow">Ergebnis</p>
              <h2 className="panel__title panel__title--serif">{offer.buyer} ist ausgestiegen</h2>
              <p>Das Angebot ist vom Tisch. Die Firma bleibt in deinem Portfolio.</p>
              <Link className="btn" href={`/firma/${view.startupId}`}>
                Zur Firma
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
