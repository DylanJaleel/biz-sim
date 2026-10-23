"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MeetingEvent, MeetingPlayback } from "@/lib/game/meeting";
import type { CovenantId, Vote } from "@/lib/game/types";
import type { MeetingView } from "@/lib/game/views";
import { usePlay } from "@/components/game/usePlay";
import { eur, signed } from "@/components/game/format";
import { BoardStage } from "./BoardStage";
import { deriveRoom, OUTCOME_LABEL, VOTE_LABEL } from "./derive";
import { INTEREST_LABEL, peopleOf, seatedOf } from "./people";
import { MoodMeter, PhaseTrack } from "./PhaseTrack";
import { Protocol } from "./Protocol";
import { SpeechCard } from "./SpeechCard";
import { usePlayback } from "./usePlayback";
import { VoteCard } from "./VoteCard";

const VOTES: Vote[] = ["go", "conditions", "no"];
const PLAIN: Vote[] = ["go", "no"];

const JUDGMENT = {
  strong: { label: "Starke Entscheidung", text: "Dein Votum entspricht dem, was nach Planrechnung am meisten Wert schafft." },
  fair: { label: "Vertretbar", text: "Dein Votum liegt nah an der besten Option, aber nicht ganz." },
  weak: { label: "Schwach begründet", text: "Nach Planrechnung gab es eine deutlich bessere Option." },
} as const;

/** The meeting as it can be shown again afterwards: everyone's vote, then the verdict. */
function replayOf(view: MeetingView): MeetingEvent[] {
  const ballots = view.decision?.ballots ?? [];
  return [
    { kind: "phase", phase: "vote" },
    ...ballots.map((b) => ({ kind: "vote" as const, speaker: b.member, vote: b.vote, reason: "", shares: b.shares })),
    { kind: "phase", phase: "verdict" },
  ];
}

export function MeetingRoom({ view, revision }: { view: MeetingView; revision: number }) {
  // A meeting that was open when the room was entered stays live, even after the server has stored the result.
  const [live] = useState(view.status === "open");
  // The script is fixed when the room is entered; later server renders no longer carry it.
  const [script] = useState(() => ({ opening: view.opening, debates: view.debates }));
  const [argument, setArgument] = useState<string | null | undefined>(undefined);
  const [vote, setVote] = useState<Vote | null>(null);
  const [covenant, setCovenant] = useState<CovenantId | null>(null);
  const [result, setResult] = useState<MeetingPlayback | null>(null);
  const { play, pending, error } = usePlay(revision);

  const people = useMemo(() => peopleOf(view.board, view.corporate, view.family), [view.board, view.corporate, view.family]);
  const seats = useMemo(() => seatedOf(view.board), [view.board]);

  const events = useMemo(() => {
    if (!live) return replayOf(view);
    if (result) return result.events;
    if (argument === undefined) return script.opening;
    return [...script.opening, ...(script.debates[argument ?? "none"] ?? [])];
  }, [live, view, script, argument, result]);

  const playback = usePlayback(events, live ? 0 : events.length);
  const room = useMemo(() => deriveRoom(events, playback.shown), [events, playback.shown]);

  const blocked = live && view.daysLeft < 1 && !view.sitting && !result;
  const askArgument = live && !blocked && playback.caughtUp && argument === undefined;
  const askVote = live && !blocked && playback.caughtUp && argument !== undefined && vote === null;
  const finished = (!live || (result !== null && playback.caughtUp)) && view.decision !== undefined;

  const castVote = (v: Vote, c?: CovenantId) => {
    setVote(v);
    setCovenant(c ?? null);
    play({ type: "meeting", itemId: view.itemId, argument: argument ?? null, vote: v, ...(c ? { covenant: c } : {}) }, (data) => {
      if (data.result.kind === "meeting") setResult(data.result.playback);
    });
  };

  return (
    <div className="room">
      <header className="room__header">
        <nav className="crumbs" aria-label="Pfad">
          <Link href="/">Büro</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/firma/${view.startupId}`}>{view.startupName}</Link>
          <span aria-hidden="true">/</span>
          <span>{view.corporate ? "Aufsichtsratssitzung" : "Beiratssitzung"}</span>
        </nav>
        {view.agenda.length > 1 && (
          <ol className="room__agenda" aria-label="Tagesordnung">
            {view.agenda.map((a, n) => (
              <li key={a.id} className={a.current ? "is-current" : a.status !== "open" ? "is-done" : undefined}>
                {a.current || a.status !== "open" ? (
                  <span>
                    TOP {n + 1}
                    {a.status !== "open" && !a.current ? " ✓" : ""}
                  </span>
                ) : (
                  <Link href={`/sitzung/${a.id}`}>TOP {n + 1}</Link>
                )}
              </li>
            ))}
          </ol>
        )}
        <h1 className="room__title">{view.title}</h1>
        <p className="room__motion">{view.motion}</p>
        <PhaseTrack phase={room.phase} />
      </header>

      <div className="room__body">
        <div className="room__stage">
          <BoardStage
            seats={seats}
            people={people}
            room={room}
            label={`${view.corporate ? "Aufsichtsrat" : "Beirat"} von ${view.startupName} mit ${seats.length} Mitgliedern und dir am Pult`}
          />
          <div className="room__bar">
            <MoodMeter mood={room.mood} />
            {live && !playback.caughtUp && (
              <div className="controls" role="group" aria-label="Wiedergabe">
                <button type="button" className="btn btn--sm" onClick={playback.toggle}>
                  {playback.playing ? "Pause" : "Weiter"}
                </button>
                <button type="button" className="btn btn--sm" onClick={playback.next}>
                  Nächster Beitrag
                </button>
                <button type="button" className="btn btn--sm" aria-pressed={playback.speed === 2} onClick={() => playback.setSpeed(playback.speed === 1 ? 2 : 1)}>
                  {playback.speed}×
                </button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={playback.skip}>
                  Überspringen
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="room__side">
          {blocked ? (
            <div className="panel panel--notice">
              <p className="panel__title">Kein Tag mehr frei</p>
              <p>Eine Sitzung kostet einen Tag. Schließe den Monat ab: Der Punkt wird einmal vertagt, Dringendes entscheidet sonst die Geschäftsführung allein.</p>
              <Link className="btn" href={`/firma/${view.startupId}`}>
                Zurück zur Firma
              </Link>
            </div>
          ) : (
            <SpeechCard events={events} room={room} people={people} />
          )}

          {askArgument && (
            <section className="panel choice" aria-labelledby="argue-title">
              <p className="eyebrow">Du bist dran</p>
              <h2 id="argue-title" className="panel__title">
                Was bringst du ein?
              </h2>
              <div className="choice__list">
                {view.args.map((a) => (
                  <button key={a.id} type="button" className="choice__option" onClick={() => setArgument(a.id)}>
                    <span className="choice__text">{a.text}</span>
                    <span className="choice__meta">
                      <span className={`tag tag--${a.toward}`}>spricht für {VOTE_LABEL[a.toward]}</span>
                      {a.appeals.map((i) => (
                        <span key={i} className="tag">
                          {INTEREST_LABEL[i]}
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
                <button type="button" className="choice__option choice__option--quiet" onClick={() => setArgument(null)}>
                  <span className="choice__text">Nichts sagen und zuhören.</span>
                </button>
              </div>
              <p className="choice__hint">Ein Argument wirkt bei denen, deren Interessen es trifft. Wer vorher mit dir gesprochen hat, hört genauer hin.</p>
            </section>
          )}

          {askVote && (
            <section className="panel choice" aria-labelledby="vote-title">
              <p className="eyebrow">Abstimmung</p>
              <h2 id="vote-title" className="panel__title">
                Wie stimmst du?
              </h2>
              <p className="choice__hint">Du hast 20 Stimmanteile, alle auf dein Votum. Die anderen verteilen ihre nach Überzeugung.</p>
              <div className="choice__list">
                {PLAIN.map((v) => (
                  <button key={v} type="button" className={`choice__option choice__option--${v}`} onClick={() => castVote(v)} disabled={pending}>
                    <span className="choice__vote">{VOTE_LABEL[v]}</span>
                    <span className="choice__text">{view.outcomes[v].label}</span>
                    <span className="choice__sub">{view.outcomes[v].summary}</span>
                  </button>
                ))}
                <div className="choice__option choice__option--conditions choice__group" role="group" aria-labelledby="covenant-title">
                  <span className="choice__vote" id="covenant-title">
                    Ja mit Auflage: welche?
                  </span>
                  <span className="choice__sub">Eine passt zur Lage, die anderen sind schlechter als ein klares Ja oder Nein.</span>
                  <div className="covenant-chips">
                    {view.covenants.map((c) => (
                      <button key={c.id} type="button" className="covenant-chip" title={c.short} onClick={() => castVote("conditions", c.id)} disabled={pending}>
                        <b>{c.name}</b>
                        <small>{c.term}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {vote && !result && (
            <div className="panel" role="status">
              {pending
                ? `Die Stimmen werden ausgezählt…${covenant ? ` Deine Auflage: ${view.covenants.find((c) => c.id === covenant)?.name}.` : ""}`
                : error
                  ? null
                  : "Einen Moment…"}
            </div>
          )}
          {error && (
            <div className="panel panel--error" role="alert">
              <p>{error}</p>
              {vote && !result && (
                <button type="button" className="btn btn--sm" onClick={() => setVote(null)}>
                  Erneut abstimmen
                </button>
              )}
            </div>
          )}

          <Protocol events={events} shown={playback.shown} people={people} />
        </aside>
      </div>

      {!live && view.status === "lapsed" && (
        <section className="panel verdict">
          <p className="eyebrow">Keine Sitzung</p>
          <h2 className="panel__title">Der {view.corporate ? "Aufsichtsrat" : "Beirat"} hat nicht getagt</h2>
          <p>
            {view.corporate ? "Der Vorstand" : "Die Gründung"} hat allein entschieden: <b>{view.decision ? view.outcomes[view.decision.outcome].label : "–"}</b>. Das kostet
            Vertrauen und Ruf.
          </p>
        </section>
      )}

      {finished && view.decision && view.status === "decided" && <Verdict view={view} />}
    </div>
  );
}

/** What the player should take away about conditions: which one fitted, and why. */
function CovenantNote({ review, followUp }: { review: NonNullable<MeetingView["covenantReview"]>; followUp: MeetingView["followUp"] }) {
  const hit = review.chosen === review.fit;
  return (
    <div className={`covenant-note${review.chosen ? (hit ? " covenant-note--hit" : " covenant-note--miss") : ""}`}>
      {review.chosen ? (
        hit ? (
          <p>
            <b>Die Auflage „{review.chosenName}“ passte.</b> {review.fitWhy}
          </p>
        ) : (
          <p>
            <b>„{review.chosenName}“ passte nicht.</b> {review.missWhy} Gepasst hätte „{review.fitName}“: {review.fitWhy}
          </p>
        )
      ) : (
        <p>
          <b>Passende Auflage wäre „{review.fitName}“ gewesen.</b> {review.fitWhy}
        </p>
      )}
      {review.appliedName && (
        <p className="verdict__note">
          Es gilt {review.chosen && review.appliedName !== "die Auflage des Gremiums" ? `die Auflage „${review.appliedName}“` : review.appliedName}. Sie wirkt ab dem nächsten
          Monat.
          {followUp ? ` Prüfe sie im Folgetermin nach (1 Tag, bis Ende ${followUp}), sonst wirkt sie nur zum Teil.` : ""}
        </p>
      )}
      {review.slight && <p className="verdict__note">Die Optionen lagen kaum auseinander. Diese Entscheidung bewegt deinen Ruf kaum.</p>}
    </div>
  );
}

function Verdict({ view }: { view: MeetingView }) {
  const d = view.decision!;
  const people = peopleOf(view.board, view.corporate, view.family);
  const judgment = JUDGMENT[d.judgment];
  const max = Math.max(...VOTES.map((v) => Math.abs(d.values[v])), 1);
  const review = view.covenantReview;
  const reviewMax = Math.max(...(review?.options.map((o) => Math.abs(o.value)) ?? []), 1);
  return (
    <section className="verdict" aria-labelledby="verdict-title">
      <div className="verdict__grid">
        {d.ballots && <VoteCard ballots={d.ballots} outcome={d.outcome} question={view.motion} people={people} />}

        <div className="verdict__review">
          <div className="panel">
            <p className="eyebrow">Rückblick</p>
            <h2 id="verdict-title" className="panel__title">
              {OUTCOME_LABEL[d.outcome]}: {view.outcomes[d.outcome].label}
            </h2>
            <p className={`judgment judgment--${d.judgment}`}>
              <b>{judgment.label}.</b> {judgment.text}
            </p>
            <p className="verdict__note">Bewertet wird, was du wissen konntest, nicht ob du Glück hattest.</p>
            {review ? (
              <ul className="outlook" aria-label="Erwarteter Wert deines Anteils in 12 Monaten">
                {review.options.map((o) => (
                  <li key={o.key} className={`outlook__row${o.best ? " is-best" : ""}${o.mine ? " is-mine" : ""}${o.fit ? " is-fit" : ""}`}>
                    <span className="outlook__label">
                      {o.label}
                      {o.mine && <em> · dein Votum</em>}
                      {o.best && <em> · beste Option</em>}
                    </span>
                    <span className="outlook__bar">
                      <i style={{ width: `${Math.max(4, (Math.abs(o.value) / reviewMax) * 100)}%` }} />
                    </span>
                    <span className="outlook__value">{eur(o.value)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="outlook" aria-label="Erwarteter Wert deines Anteils in 12 Monaten">
                {VOTES.map((v) => (
                  <li key={v} className={`outlook__row${v === d.best ? " is-best" : ""}${v === d.vote ? " is-mine" : ""}`}>
                    <span className="outlook__label">
                      {VOTE_LABEL[v]}
                      {v === d.vote && <em> · dein Votum</em>}
                      {v === d.best && <em> · beste Option</em>}
                    </span>
                    <span className="outlook__bar">
                      <i style={{ width: `${Math.max(4, (Math.abs(d.values[v]) / max) * 100)}%` }} />
                    </span>
                    <span className="outlook__value">{eur(d.values[v])}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="verdict__note">Erwarteter Wert deiner Position in 12 Monaten, halb im Basisfall, halb in einem schwächeren Markt.</p>
            {review && <CovenantNote review={review} followUp={view.followUp} />}
            <div className="deltas">
              <span>
                Ruf <b>{signed(d.reputationDelta)}</b>
              </span>
              <span>
                Vertrauen {view.corporate ? "des Vorstands" : "der Gründung"} <b>{signed(d.trustDelta)}</b>
              </span>
            </div>
            {view.result ? (
              <p className={`result result--${view.result.good ? "good" : "bad"}`}>{view.result.text}</p>
            ) : (
              <p className="verdict__note">Wie es ausgeht, zeigt sich in den nächsten Monaten im Monatsbericht.</p>
            )}
          </div>

          <div className="panel lesson-card">
            <p className="eyebrow">Neu im Notizbuch</p>
            <h3 className="panel__title">{view.lesson.title}</h3>
            <p>{view.lesson.summary}</p>
            {view.lesson.rule && <p className="lesson-card__rule">{view.lesson.rule}</p>}
          </div>

          <div className="verdict__actions">
            {view.nextItemId && (
              <Link className="btn btn--primary" href={`/sitzung/${view.nextItemId}`}>
                Nächster Punkt: {view.agenda.find((a) => a.id === view.nextItemId)?.title}
              </Link>
            )}
            <Link className={view.nextItemId ? "btn" : "btn btn--primary"} href={`/firma/${view.startupId}`}>
              Zurück zur Firma
            </Link>
            <Link className="btn" href="/">
              Ins Büro
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
