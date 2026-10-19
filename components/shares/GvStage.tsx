"use client";

import { useEffect, useState } from "react";
import { HOLDER_LABEL } from "@/lib/game/captable";
import type { GvBallot, GvVote, HolderKind } from "@/lib/game/types";
import { fmtPct, HOLDER_COLOR, initialsOf } from "./holders";

// Das Halbrund der Gesellschafterversammlung: hundert Plätze, einer pro
// Prozent der Firma. Runden und Verkäufe nutzen dieselbe Bühne.

const VB_W = 360;
const VB_H = 204;
const C = { x: 180, y: 176 };
const ROWS = [74, 94, 114, 134, 154];

export type Seat = { id: string; name: string; kind: HolderKind | "you"; pct: number; vote?: GvVote | "abstain"; reason?: string };

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

/** Reveals the ballots one by one after a vote. */
export function useReveal(ballots: GvBallot[], startRevealed: boolean) {
  const [animate, setAnimate] = useState(false);
  const [revealed, setRevealed] = useState(startRevealed ? ballots.length : 0);
  useEffect(() => {
    if (!animate || revealed >= ballots.length) return;
    const timer = setTimeout(() => setRevealed((n) => n + 1), revealed === 0 ? 500 : 1100);
    return () => clearTimeout(timer);
  }, [animate, revealed, ballots.length]);
  const start = () => {
    setRevealed(0);
    setAnimate(true);
  };
  const voting = ballots.length > 0;
  const finished = voting && revealed >= ballots.length;
  const current = voting && revealed > 0 && !finished ? ballots[revealed - 1] : undefined;
  const yes = ballots
    .slice(0, revealed)
    .filter((b) => b.vote === "go")
    .reduce((s, b) => s + b.pct, 0);
  const no = ballots
    .slice(0, revealed)
    .filter((b) => b.vote === "no")
    .reduce((s, b) => s + b.pct, 0);
  return { revealed, start, voting, current, finished, yes, no };
}

export function GvStage({
  seats,
  voting,
  finished,
  approved,
  current,
  yes,
  no,
  idle = "100 Anteile",
  label,
}: {
  seats: Seat[];
  voting: boolean;
  finished: boolean;
  approved: boolean;
  current?: GvBallot;
  yes: number;
  no: number;
  idle?: string;
  label: string;
}) {
  // Group dots by vote once votes are in, like seats in a parliament.
  const ordered = voting ? [...seats].sort((a, b) => (a.vote ? GROUP[a.vote] : 1) - (b.vote ? GROUP[b.vote] : 1)) : seats;
  const counts = allocate(ordered);
  const dots: { color: string; seat: string }[] = [];
  ordered.forEach((seat, i) => {
    const color = seat.vote ? VOTE_COLOR[seat.vote] : HOLDER_COLOR[seat.kind];
    for (let n = 0; n < counts[i]!; n++) dots.push({ color, seat: seat.id });
  });
  return (
    <div className="stage gv__stage">
      <svg className="gv__hemi" viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label={label}>
        <line className="gv__maj" x1={C.x} y1={C.y - ROWS[ROWS.length - 1]! - 12} x2={C.x} y2={C.y - ROWS[0]! + 10} />
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={SPOTS[i]!.x.toFixed(1)}
            cy={SPOTS[i]!.y.toFixed(1)}
            r={5.6}
            style={{ fill: d.color }}
            className={current && d.seat === current.id ? "is-on" : undefined}
          />
        ))}
        <text className="gv__center" x={C.x} y={C.y - 14}>
          {voting ? (finished ? (approved ? "Angenommen" : "Abgelehnt") : `${fmtPct(yes)} Ja`) : idle}
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
  );
}

/** What the current speaker says while the votes come in. */
export function BallotSpeech({ ballot }: { ballot: GvBallot }) {
  return (
    <div className="speech__card" style={{ ["--member" as string]: HOLDER_COLOR[ballot.kind] }}>
      <div className="speech__head">
        <span className="speech__avatar">{initialsOf(ballot.name)}</span>
        <div>
          <p className="speech__name">{ballot.name}</p>
          <p className="speech__meta">
            {HOLDER_LABEL[ballot.kind]} · {fmtPct(ballot.pct)} · {ballot.vote === "go" ? "Ja" : ballot.vote === "no" ? "Nein" : "enthält sich"}
          </p>
        </div>
      </div>
      <p className="speech__text">{ballot.reason}</p>
    </div>
  );
}
