"use client";

import Link from "next/link";
import { useState } from "react";
import { ACTION_DAYS } from "@/lib/game/config";
import type { GvBallot, GvVote, RoundTake } from "@/lib/game/types";
import type { RoundView } from "@/lib/game/views";
import { eur } from "@/components/game/format";
import { usePlay } from "@/components/game/usePlay";
import { BallotSpeech, GvStage, useReveal, type Seat } from "./GvStage";
import { fmtPct } from "./holders";

// Die Gesellschafterversammlung: Hier zählt nicht jede Person, sondern jedes
// Prozent. Das Halbrund hat hundert Plätze, einen pro Prozent der Firma.

export function ShareholderMeeting({ view, revision }: { view: RoundView; revision: number }) {
  const { round } = view;
  const open = round.status === "open";
  const [take, setTake] = useState<RoundTake>(() =>
    view.options.find((o) => o.take === "prorata")?.allowed ? "prorata" : view.options.find((o) => o.take === "half")?.allowed ? "half" : "none",
  );
  const [vote, setVote] = useState<GvVote>("go");
  const { play, pending, error } = usePlay(revision);
  const ballots: GvBallot[] = round.ballots ?? [];
  // After the vote the ballots arrive with the new server state; reveal them one by one.
  const { revealed, start, voting, current, finished, yes, no } = useReveal(ballots, !open);

  const submit = () => {
    play({ type: "round", roundId: round.id, take, vote }, start);
  };

  const seats: Seat[] = voting
    ? ballots.map((b, i) => ({ ...b, vote: i < revealed ? b.vote : undefined }))
    : [
        { id: "you", name: "Du", kind: "you", pct: view.stake },
        ...[...view.holders].sort((a, b) => b.pct - a.pct).map((h) => ({ id: h.id, name: h.name, kind: h.kind, pct: h.pct })),
      ];
  const approved = round.status === "closed";
  const choice = view.options.find((o) => o.take === take)!;
  const tooBusy = open && view.daysLeft < ACTION_DAYS.round;

  return (
    <div className="gv">
      <header className="room__header">
        <nav className="crumbs" aria-label="Pfad">
          <Link href="/">Büro</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/firma/${view.startupId}`}>{view.startupName}</Link>
          <span aria-hidden="true">/</span>
          <span>Gesellschafterversammlung</span>
        </nav>
        <h1 className="room__title">
          {round.label}: {eur(round.amount)} für {view.startupName}
        </h1>
        <p className="room__motion">
          Angeführt von {round.lead}. Hier stimmt nicht jede Person mit einer Stimme ab, sondern jedes Prozent der Firma.
          {round.down && " Der Preis liegt unter dem letzten Wert: eine Down Round."}
        </p>
        <div className="gv__terms">
          <span>
            <small>Neues Geld</small>
            <b>{eur(round.amount)}</b>
          </span>
          <span>
            <small>Bewertung vor dem Geld</small>
            <b>{eur(round.preMoney)}</b>
          </span>
          <span>
            <small>Bewertung nach dem Geld</small>
            <b>{eur(view.postMoney)}</b>
          </span>
          <span>
            <small>Neue Investoren erhalten</small>
            <b>{fmtPct((round.amount / view.postMoney) * 100)}</b>
          </span>
          {round.down && <span className="tag tag--no">Down Round</span>}
        </div>
      </header>

      <div className="room__body">
        <div className="room__stage">
          <GvStage
            seats={seats}
            voting={voting}
            finished={finished}
            approved={approved}
            current={current}
            yes={yes}
            no={no}
            label="Halbrund aus 100 Anteilen, eine Farbe pro Gesellschafter oder Stimme"
          />
        </div>

        <aside className="room__side">
          {current && current.reason && !finished && <BallotSpeech ballot={current} />}

          {open && !voting && (
            <section className="panel choice" aria-labelledby="gv-choice">
              <p className="eyebrow">Deine Entscheidung</p>
              <h2 id="gv-choice" className="panel__title">
                Ziehst du mit?
              </h2>
              <div className="choice__list" role="radiogroup" aria-label="Beteiligung an der Runde">
                {view.options.map((o) => (
                  <button
                    key={o.take}
                    type="button"
                    role="radio"
                    aria-checked={take === o.take}
                    className={`choice__option${take === o.take ? " is-selected" : ""}`}
                    disabled={!o.allowed}
                    onClick={() => setTake(o.take)}
                  >
                    <span className="choice__vote">{o.label}</span>
                    <span className="choice__text">
                      {o.amount > 0 ? `${eur(o.amount)} einzahlen` : "Kein Geld einzahlen"}
                      {o.syndicate ? ` + ${eur(o.syndicate)} vom Syndikat` : ""} · Anteil {fmtPct(view.stake)} → {fmtPct(o.stakeAfter)}
                    </span>
                    <span className="choice__sub">{o.reason ?? `Wert deines Anteils direkt nach der Runde: ${eur(o.valueAfter)}`}</span>
                  </button>
                ))}
              </div>
              <div className="gv__vote-row">
                <span>Deine Stimme ({fmtPct(view.stake)})</span>
                <div className="segmented" role="group" aria-label="Deine Stimme">
                  <button type="button" aria-pressed={vote === "go"} onClick={() => setVote("go")}>
                    Zustimmen
                  </button>
                  <button type="button" aria-pressed={vote === "no"} onClick={() => setVote("no")}>
                    Ablehnen
                  </button>
                </div>
              </div>
              {tooBusy ? (
                <p className="notice notice--warn">Die Versammlung kostet {ACTION_DAYS.round} Tage. Ohne dich stimmt sie am Monatsende ab, und du ziehst nicht mit.</p>
              ) : (
                <button type="button" className="btn btn--primary btn--lg gv__submit" onClick={submit} disabled={pending || !choice.allowed}>
                  {pending ? "Die Versammlung tagt…" : `In der Versammlung abstimmen · ${ACTION_DAYS.round} Tage`}
                </button>
              )}
              {error && (
                <p className="action__error" role="alert">
                  {error}
                </p>
              )}
              <p className="choice__hint">
                Pro rata heißt: so viel nachlegen, dass dein Prozentsatz gleich bleibt. Wer nicht mitzieht, behält seine Anteile, aber einen kleineren Teil der größeren Firma. Mit
                einem Syndikat führst du die Runde an: Angels aus deinem Club legen Geld dazu, und du bekommst 20 % ihres Gewinns.
              </p>
            </section>
          )}

          {finished && (
            <section className="panel" aria-labelledby="gv-result">
              <p className="eyebrow">Ergebnis</p>
              <h2 id="gv-result" className="panel__title panel__title--serif">
                {approved ? "Die Runde ist durch" : "Die Runde ist gescheitert"}
              </h2>
              {approved ? (
                <p>
                  {view.startupName} bekommt {eur(round.amount)}. Du hast {eur(round.playerAmount ?? 0)} eingezahlt. Dein Anteil: {fmtPct(round.stakeBefore ?? view.stake)} →{" "}
                  {fmtPct(round.stakeAfter ?? view.stake)}.
                </p>
              ) : (
                <p>Die Mehrheit der Anteile hat dagegen gestimmt. Die Firma bekommt kein neues Geld, die Gründung muss weitersuchen.</p>
              )}
              <div className="verdict__actions">
                <Link className="btn btn--primary" href={`/firma/${view.startupId}`}>
                  Zur Firma
                </Link>
                <Link className="btn" href="/">
                  Ins Büro
                </Link>
              </div>
            </section>
          )}

          {!open && !voting && <p className="muted">Diese Runde wurde ohne Versammlung beendet.</p>}
        </aside>
      </div>
    </div>
  );
}
