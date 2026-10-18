"use client";

import { useEffect, useState } from "react";
import type { ShareOption, Shares, SpeakerId, Vote } from "@/lib/game/types";
import { hemicycle, majorityOf, rowsFor, SHARE_LABEL, SHARE_OPTIONS, sumShares, totalOf, type Ballot } from "@/lib/game/votes";
import { OUTCOME_LABEL, VOTE_LABEL } from "./derive";
import type { People } from "./people";

function describe(shares: Shares): string {
  return SHARE_OPTIONS.filter((o) => shares[o] > 0)
    .map((o) => `${shares[o]} ${SHARE_LABEL[o]}`)
    .join(", ");
}

const W = 640;
const CY = 300;
const R1 = 262;

/** Endabstimmung als Halbrund wie im Parlament: jeder Punkt ein Stimmanteil. */
export function VoteCard({ ballots, outcome, question, people }: { ballots: Ballot[]; outcome: Vote; question: string; people: People }) {
  const shares = sumShares(ballots);
  const total = totalOf(shares);
  const majority = majorityOf(total);
  const rows = rowsFor(total);
  const r0 = R1 - (rows - 1) * 30;
  const dotR = Math.min(15, 8 + (7 - rows) * 2);
  const seats = hemicycle(ballots, { cx: W / 2, cy: CY, r0, r1: R1, rows });
  const [focus, setFocus] = useState<SpeakerId | null>(null);
  const [shown, setShown] = useState(false);
  const [run, setRun] = useState(0);

  // Die Punkte füllen das Halbrund von links nach rechts, einmal beim Erscheinen und auf Wunsch erneut.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => {
      cancelAnimationFrame(id);
      setShown(false);
    };
  }, [run]);

  return (
    <div className="vote-card">
      <div className="vote-card__head">
        <div>
          <p className="eyebrow">Endabstimmung</p>
          <p className="vote-card__q">{question}</p>
        </div>
        <span className={`vote-status vote-status--${outcome}`}>{OUTCOME_LABEL[outcome]}</span>
      </div>

      <svg
        className={`hemi${shown ? "" : " hemi--hidden"}${focus ? " hemi--focus" : ""}`}
        viewBox={`0 0 ${W} 318`}
        role="img"
        aria-label={`Halbrund aus ${total} Stimmanteilen: ${describe(shares)}`}
      >
        <line className="hemi__maj" x1={W / 2} y1={CY - R1 - dotR - 6} x2={W / 2} y2={CY - r0 + dotR + 6} />
        <text className="hemi__maj-t" x={W / 2} y={CY - R1 - dotR - 12}>
          {majority}
        </text>
        {seats.map((s) => (
          <circle
            key={s.index}
            cx={s.x.toFixed(1)}
            cy={s.y.toFixed(1)}
            r={dotR}
            className={`hemi__dot share--${s.option}${focus === s.member ? " hemi__dot--hi" : ""}`}
            style={{ ["--i" as string]: s.index }}
          />
        ))}
      </svg>

      <div className="vote-card__counts">
        {SHARE_OPTIONS.map((o) => (
          <div key={o} className={`vote-count vote-count--${o}`}>
            <span>{SHARE_LABEL[o]}</span>
            <b>{shares[o]}</b>
          </div>
        ))}
      </div>

      <div className="vote-card__foot">
        <span>
          Mehrheit: <b>{majority} von {total}</b> · Ja und Auflagen zusammen <b>{shares.go + shares.conditions}</b>
        </span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRun((n) => n + 1)}>
          Abstimmung abspielen
        </button>
      </div>

      <ul className="vote-members" aria-label="Stimmanteile je Mitglied">
        {ballots.map((b) => {
          const person = people[b.member];
          const on = focus === b.member;
          return (
            <li key={b.member}>
              <button type="button" className="vote-member" aria-pressed={on} onClick={() => setFocus(on ? null : b.member)} style={{ ["--member" as string]: person.color }}>
                <span className="vote-member__avatar">{person.initials}</span>
                <span className="vote-member__name">{person.name}</span>
                <span className={`vote-member__vote vote-member__vote--${b.vote}`}>{VOTE_LABEL[b.vote]}</span>
                <span className="sr-only">: {describe(b.shares)}</span>
                <span className="vote-member__strip" aria-hidden="true">
                  {SHARE_OPTIONS.flatMap((o: ShareOption) =>
                    Array.from({ length: b.shares[o] }, (_, i) => <i key={`${o}${i}`} className={`share share--${o}`} />),
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
