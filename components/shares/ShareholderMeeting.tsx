"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HOLDER_LABEL } from "@/lib/game/captable";
import { ACTION_DAYS } from "@/lib/game/config";
import type { GvBallot, GvVote, HolderKind, RoundTake } from "@/lib/game/types";
import type { RoundView } from "@/lib/game/views";
import { eur } from "@/components/game/format";
import { usePlay } from "@/components/game/usePlay";
import { fmtPct, HOLDER_COLOR, initialsOf } from "./holders";

// Die Gesellschafterversammlung: Hier zählt nicht jede Person, sondern jedes
// Prozent. Das Halbrund hat hundert Plätze, einen pro Prozent der Firma.

const VB_W = 360;
const VB_H = 204;
const C = { x: 180, y: 176 };
const ROWS = [74, 94, 114, 134, 154];

type Seat = { id: string; name: string; kind: HolderKind | "you"; pct: number; vote?: GvVote | "abstain"; reason?: string };

function spots(): { x: number; y: number }[] {
  const sum = ROWS.reduce((a, b) => a + b, 0);
  const counts = ROWS.map((r) => Math.round((100 * r) / sum));
  let diff = 100 - counts.reduce((a, b) => a + b, 0);
  for (let k = ROWS.length - 1; diff !== 0; k = (k - 1 + ROWS.length) % ROWS.length) {
    counts[k]! += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
  }
  const out: { r: number; a: number }[] = [];
  ROWS.forEach((r, k) => {
    const n = counts[k]!;
    for (let j = 0; j < n; j++) out.push({ r, a: Math.PI - (j * Math.PI) / (n - 1) });
  });
  out.sort((p, q) => q.a - p.a || p.r - q.r);
  return out.map((s) => ({ x: C.x + s.r * Math.cos(s.a), y: C.y - s.r * Math.sin(s.a) }));
}
const SPOTS = spots();

/** Largest remainder: whole dots per holder that add up to 100. */
function allocate(seats: Seat[]): number[] {
  const total = seats.reduce((s, x) => s + x.pct, 0) || 1;
  const raw = seats.map((x) => (x.pct / total) * 100);
  const base = raw.map(Math.floor);
  let rest = 100 - base.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
  for (const { i } of order) {
    if (rest <= 0) break;
    base[i]! += 1;
    rest -= 1;
  }
  return base;
}

const VOTE_COLOR = { go: "var(--dot-go)", no: "var(--dot-no)", abstain: "var(--dot-abst)" };
const GROUP = { go: 0, abstain: 1, no: 2 } as const;

export function ShareholderMeeting({ view, revision }: { view: RoundView; revision: number }) {
  const { round } = view;
  const open = round.status === "open";
  const [take, setTake] = useState<RoundTake>(() => (view.options.find((o) => o.take === "prorata")?.allowed ? "prorata" : view.options.find((o) => o.take === "half")?.allowed ? "half" : "none"));
  const [vote, setVote] = useState<GvVote>("go");
  const [animate, setAnimate] = useState(false);
  const [revealed, setRevealed] = useState(open ? 0 : (round.ballots?.length ?? 0));
  const { play, pending, error } = usePlay(revision);
  const ballots: GvBallot[] = round.ballots ?? [];

  // After the vote the ballots arrive with the new server state; reveal them one by one.
  useEffect(() => {
    if (!animate || revealed >= ballots.length) return;
    const timer = setTimeout(() => setRevealed((n) => n + 1), revealed === 0 ? 500 : 1100);
    return () => clearTimeout(timer);
  }, [animate, revealed, ballots.length]);

  const submit = () => {
    play({ type: "round", roundId: round.id, take, vote }, () => {
      setRevealed(0);
      setAnimate(true);
    });
  };

  const voting = ballots.length > 0;
  const seats: Seat[] = voting
    ? ballots.map((b, i) => ({ ...b, vote: i < revealed ? b.vote : undefined }))
    : [
        { id: "you", name: "Du", kind: "you", pct: view.stake },
        ...[...view.holders].sort((a, b) => b.pct - a.pct).map((h) => ({ id: h.id, name: h.name, kind: h.kind, pct: h.pct })),
      ];
  // Group dots by vote once votes are in, like seats in a parliament.
  const ordered = voting ? [...seats].sort((a, b) => (a.vote ? GROUP[a.vote] : 1) - (b.vote ? GROUP[b.vote] : 1)) : seats;
  const counts = allocate(ordered);
  const dots: { color: string; seat: string }[] = [];
  ordered.forEach((seat, i) => {
    const color = seat.vote ? VOTE_COLOR[seat.vote] : HOLDER_COLOR[seat.kind];
    for (let n = 0; n < counts[i]!; n++) dots.push({ color, seat: seat.id });
  });
  const current = voting && revealed > 0 && revealed <= ballots.length ? ballots[revealed - 1] : undefined;
  const finished = voting && revealed >= ballots.length;
  const yes = ballots.slice(0, revealed).filter((b) => b.vote === "go").reduce((s, b) => s + b.pct, 0);
  const no = ballots.slice(0, revealed).filter((b) => b.vote === "no").reduce((s, b) => s + b.pct, 0);
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
          <div className="stage gv__stage">
            <svg className="gv__hemi" viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label="Halbrund aus 100 Anteilen, eine Farbe pro Gesellschafter oder Stimme">
              <line className="gv__maj" x1={C.x} y1={C.y - ROWS[ROWS.length - 1]! - 12} x2={C.x} y2={C.y - ROWS[0]! + 10} />
              {dots.map((d, i) => (
                <circle key={i} cx={SPOTS[i]!.x.toFixed(1)} cy={SPOTS[i]!.y.toFixed(1)} r={5.6} style={{ fill: d.color }} className={current && d.seat === current.id ? "is-on" : undefined} />
              ))}
              <text className="gv__center" x={C.x} y={C.y - 14}>
                {voting ? (finished ? (approved ? "Angenommen" : "Abgelehnt") : `${fmtPct(yes)} Ja`) : "100 Anteile"}
              </text>
              <text className="gv__sub" x={C.x} y={C.y + 20}>
                {voting ? `${fmtPct(yes)} dafür · ${fmtPct(no)} dagegen · ` : ""}Mehrheit: über 50 % der abgegebenen Stimmen
              </text>
            </svg>
            <ul className="gv__holders">
              {seats.map((s) => (
                <li key={s.id} className={`gv__holder${current?.id === s.id ? " is-on" : ""}${s.id === "you" ? " is-you" : ""}`} style={{ ["--member" as string]: HOLDER_COLOR[s.kind] }}>
                  <span className="gv__avatar">{initialsOf(s.name)}</span>
                  <span className="gv__hname">{s.name}</span>
                  <span className="gv__hpct">{fmtPct(s.pct)}</span>
                  {s.vote && <span className={`gv__vote gv__vote--${s.vote}`}>{s.vote === "go" ? "Ja" : s.vote === "no" ? "Nein" : "Enthalten"}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="room__side">
          {current && current.reason && !finished && (
            <div className="speech__card" style={{ ["--member" as string]: HOLDER_COLOR[current.kind] }}>
              <div className="speech__head">
                <span className="speech__avatar">{initialsOf(current.name)}</span>
                <div>
                  <p className="speech__name">{current.name}</p>
                  <p className="speech__meta">
                    {HOLDER_LABEL[current.kind]} · {fmtPct(current.pct)} · {current.vote === "go" ? "Ja" : current.vote === "no" ? "Nein" : "enthält sich"}
                  </p>
                </div>
              </div>
              <p className="speech__text">{current.reason}</p>
            </div>
          )}

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
                      {o.amount > 0 ? `${eur(o.amount)} einzahlen` : "Kein Geld einzahlen"} · Anteil {fmtPct(view.stake)} → {fmtPct(o.stakeAfter)}
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
                Pro rata heißt: so viel nachlegen, dass dein Prozentsatz gleich bleibt. Wer nicht mitzieht, behält seine Anteile, aber einen kleineren Teil der größeren Firma.
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
