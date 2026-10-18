"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SEAT_ORDER } from "@/lib/game/startups";
import type { SpeakerId } from "@/lib/game/types";
import { hemicycle, majorityOf, sumShares, totalOf } from "@/lib/game/votes";
import { liveBallots, OUTCOME_LABEL, VOTE_LABEL, type Reaction, type RoomState } from "./derive";
import type { People } from "./people";

// Der Ratstisch von oben: fünf Plätze im Halbrund, du am Pult an der offenen Seite.
// Wer spricht, leuchtet. Wortwechsel laufen als Linien am Tischrand entlang, damit das
// Halbrund in der Mitte frei bleibt. Dort füllt sich live, wohin der Raum tendiert und
// wie abgestimmt wird.

const VB_W = 200;
const VB_H = 146;
const C = { x: 100, y: 102 };
const R_SEAT = 82;
const TABLE = { inner: 54, outer: 70, from: -0.22, to: Math.PI + 0.22 };
const HEMI = { r0: 19, r1: 46 };
const LANES = [50.5, 52.2, 48.9, 53.6];
const LANE_LOW = 25;
const YOU = { x: C.x, y: C.y + LANE_LOW };

function seatAngle(id: SpeakerId): number {
  const i = SEAT_ORDER.indexOf(id as (typeof SEAT_ORDER)[number]);
  return (0.9 - i * 0.2) * Math.PI;
}

function seatPoint(id: SpeakerId): { x: number; y: number } {
  if (id === "you") return YOU;
  const a = seatAngle(id);
  return { x: C.x + R_SEAT * Math.cos(a), y: C.y - R_SEAT * Math.sin(a) };
}

function lanePoint(a: number, r: number): { x: number; y: number } {
  const ry = Math.sin(a) >= 0 ? r : LANE_LOW;
  return { x: C.x + r * Math.cos(a), y: C.y - ry * Math.sin(a) };
}

/** Path from one seat to another along the inner rim of the table. */
export function linkPath(from: SpeakerId, to: SpeakerId, lane = 0): string {
  const r = LANES[lane % LANES.length]!;
  const angleOf = (id: SpeakerId, other: SpeakerId) => {
    if (id !== "you") return seatAngle(id);
    // Zu dir führt die Linie um die offene Seite herum, auf der Seite der anderen Person.
    return seatAngle(other) > Math.PI / 2 ? (3 * Math.PI) / 2 : -Math.PI / 2;
  };
  const a0 = angleOf(from, to);
  const a1 = angleOf(to, from);
  const steps = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 0.06));
  const pts = [seatPoint(from)];
  for (let k = 0; k <= steps; k++) pts.push(lanePoint(a0 + ((a1 - a0) * k) / steps, r));
  pts.push(seatPoint(to));
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

const TABLE_PATH = (() => {
  const { inner, outer, from, to } = TABLE;
  const p = (a: number, r: number) => `${(C.x + r * Math.cos(a)).toFixed(2)} ${(C.y - r * Math.sin(a)).toFixed(2)}`;
  return `M${p(from, outer)} A${outer} ${outer} 0 1 0 ${p(to, outer)} L${p(to, inner)} A${inner} ${inner} 0 1 1 ${p(from, inner)} Z`;
})();

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

interface RoundTableProps {
  seats: SpeakerId[];
  people: People;
  room: RoomState;
  label: string;
}

export function RoundTable({ seats, people, room, label }: RoundTableProps) {
  const reduce = useReducedMotion();
  const members = seats.filter((s) => s !== "you");
  const voters: SpeakerId[] = [...members, "you"];
  const latestReaction = room.latest?.kind === "reaction" ? room.latest : undefined;
  const active = new Set<SpeakerId>();
  if (room.latest && room.latest.kind !== "phase") active.add(room.latest.speaker);
  if (latestReaction) active.add(latestReaction.target);

  const ballots = liveBallots(voters, room);
  const stateOf = new Map(ballots.map((b) => [b.member, b.state]));
  const dots = hemicycle(ballots, { cx: C.x, cy: C.y, ...HEMI, rows: 6 });
  const cast = ballots.filter((b) => b.state === "cast");
  const castShares = sumShares(cast);
  const total = totalOf(sumShares(ballots));
  const verdict = room.phase === "verdict";
  const outcome = verdict ? outcomeOf(castShares) : undefined;

  let caption: string;
  if (verdict && outcome) caption = OUTCOME_LABEL[outcome];
  else if (cast.length > 0) caption = `Abstimmung · ${cast.length} von ${voters.length}`;
  else if (Object.keys(room.stances).length > 0) caption = "Tendenz im Raum";
  else caption = "Noch offen";

  return (
    <div className="rt" role="img" aria-label={label} data-phase={room.phase}>
      <svg className="rt__svg" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true">
        <defs>
          <radialGradient id="rt-spot" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" className="rt__spot-a" />
            <stop offset="1" className="rt__spot-b" />
          </radialGradient>
        </defs>
        {[...active].map((id) => {
          const p = seatPoint(id);
          return <circle key={`spot-${id}`} className="rt__spot" cx={p.x} cy={p.y} r={22} fill="url(#rt-spot)" />;
        })}
        <path className="rt__table" d={TABLE_PATH} />
        <path className="rt__table-edge" d={TABLE_PATH} />

        <g className={`rt__hemi${verdict ? " is-verdict" : ""}`}>
          <line className="rt__maj" x1={C.x} y1={C.y - HEMI.r1 - 3.2} x2={C.x} y2={C.y - HEMI.r0 + 3.2} />
          {dots.map((d) => (
            <circle
              key={d.index}
              cx={d.x.toFixed(2)}
              cy={d.y.toFixed(2)}
              r={1.55}
              className={`rt__dot share--${d.option} is-${stateOf.get(d.member)}`}
            />
          ))}
        </g>

        {room.reactions.map((r, i) => (
          <Link key={i} reaction={r} lane={i} active={r === latestReaction} reduce={Boolean(reduce)} />
        ))}
      </svg>

      <div className="rt__center" style={{ top: pct(C.y - 0.5, VB_H) }}>
        <span className={`rt__caption${outcome ? ` rt__caption--${outcome}` : ""}`}>{caption}</span>
      </div>
      {cast.length > 0 && (
        <span className="rt__tally" style={{ top: pct(C.y + 2.5, VB_H) }}>
          {castShares.go + castShares.conditions} dafür · Mehrheit {majorityOf(total)}
        </span>
      )}

      {seats.map((id) => {
        const person = people[id];
        if (!person) return null;
        const p = seatPoint(id);
        const speaking = active.has(id);
        const vote = room.votes[id];
        const cls = ["rt__seat"];
        if (id === "you") cls.push("rt__seat--you");
        if (speaking) cls.push("is-on");
        if (active.size > 0 && !speaking) cls.push("is-dim");
        return (
          <div
            key={id}
            className={cls.join(" ")}
            style={{ left: pct(p.x, VB_W), top: pct(p.y, VB_H), ["--member" as string]: person.color }}
            data-seat={id}
          >
            <AnimatePresence>
              {vote && (
                <motion.span
                  className={`rt__vote rt__vote--${vote}`}
                  initial={reduce ? false : { opacity: 0, y: 6, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                >
                  {VOTE_LABEL[vote]}
                </motion.span>
              )}
            </AnimatePresence>
            <motion.span
              className="rt__avatar"
              animate={{ scale: speaking ? 1.12 : 1 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 24 }}
            >
              {speaking && !reduce && <span className="rt__pulse" />}
              <span>{person.initials}</span>
            </motion.span>
            <span className="rt__name">
              {id !== "you" && <b>{person.name}</b>}
              {id === "you" ? <span>am Pult</span> : <span>{person.role}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function outcomeOf(shares: ReturnType<typeof sumShares>) {
  const total = totalOf(shares);
  const majority = majorityOf(total);
  if (shares.go >= majority) return "go" as const;
  if (shares.go + shares.conditions >= majority) return "conditions" as const;
  return "no" as const;
}

function Link({ reaction, lane, active, reduce }: { reaction: Reaction; lane: number; active: boolean; reduce: boolean }) {
  const d = linkPath(reaction.speaker, reaction.target, lane);
  const cls = `rt__link rt__link--${reaction.relation}${active ? " is-active" : ""}`;
  const end = seatPoint(reaction.target);
  if (reaction.relation === "agree") {
    return (
      <g className={cls}>
        <motion.path
          d={d}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
        {active && <circle className="rt__link-end" cx={end.x} cy={end.y} r={1.6} />}
      </g>
    );
  }
  // Widerspruch ist gepunktet; pathLength würde das Strichmuster überschreiben, darum nur einblenden.
  return (
    <g className={cls}>
      <motion.path d={d} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
      {active && <circle className="rt__link-end" cx={end.x} cy={end.y} r={1.6} />}
    </g>
  );
}
