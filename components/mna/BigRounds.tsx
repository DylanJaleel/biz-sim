"use client";

import { useState } from "react";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { MOOD_LINE, NegotiationDesk } from "@/components/scene/NegotiationDesk";
import { moodKey } from "@/lib/game/negotiation";
import type { BigBidView } from "@/lib/game/rivals-views";
import type { MandateLever } from "@/lib/game/types";

// Die drei Verhandlungsrunden eines großen Mandats: Bieter wählen, Hebel
// wählen, Runde spielen. Danach (oder jederzeit) der Zuschlag.

export interface BigRoundsProps {
  id: string;
  bids: BigBidView[];
  levers: { id: MandateLever; title: string; text: string }[];
  rounds: number;
  maxRounds: number;
  /** Gute Stimmung am Tisch: eine Runde mehr. */
  bonusRound?: boolean;
  power: number;
  exclusive?: string;
  revision: number;
  days: { round: number; close: number };
}

export function BigRounds(props: BigRoundsProps) {
  const active = props.bids.filter((b) => !b.out && (!props.exclusive || b.buyer === props.exclusive));
  const [bidder, setBidder] = useState(active[0]?.buyer ?? "");
  const [lever, setLever] = useState<MandateLever>("batna");
  const chosen = active.find((b) => b.buyer === bidder) ?? active[0];
  const done = props.rounds >= props.maxRounds;
  const leverTitle = props.levers.find((l) => l.id === lever)?.title;
  return (
    <div className="rounds">
      {chosen && (
        <NegotiationDesk
          name={chosen.buyer}
          role={chosen.kind === "strategic" ? "Stratege" : "Finanzinvestor"}
          look="exec"
          mood={chosen.mood}
          gone={chosen.out}
          played={props.rounds}
          rounds={props.maxRounds}
          bonusRound={props.bonusRound}
          bubble={MOOD_LINE[moodKey(chosen.mood)]}
          offer={{
            title: `Angebot von ${chosen.buyer}`,
            lines: [{ label: "Preis", value: eur(chosen.ev + chosen.earnout) }, ...(chosen.earnout > 0 ? [{ label: "davon Earn-out", value: eur(chosen.earnout) }] : [])],
            note: `Dein Honorar bei Zuschlag: ${eur(chosen.fee)}`,
          }}
          counter={{
            title: done ? "Runden gespielt" : `Runde ${props.rounds + 1}: dein Hebel`,
            lines: [{ label: "Hebel", value: done ? "Zuschlag" : (leverTitle ?? "–") }],
            note: done ? "Erteile jetzt den Zuschlag." : `Verhandlungsmacht ${props.power} von 100`,
          }}
        />
      )}
      <ul className="rounds__bids" aria-label="Bieter">
        {props.bids.map((b) => (
          <li key={b.buyer}>
            <button type="button" aria-pressed={chosen?.buyer === b.buyer} disabled={!active.includes(b)} onClick={() => setBidder(b.buyer)}>
              <span>
                <b>{b.buyer}</b>
                <small>
                  {b.kind === "strategic" ? "Stratege" : "Finanzinvestor"} · {b.out ? "ausgestiegen" : `Stimmung ${b.mood}`}
                </small>
              </span>
              <span className="rounds__offer">
                {eur(b.ev + b.earnout)}
                <small>
                  {b.earnout > 0 ? `${eur(b.ev)} bar + ${eur(b.earnout)} Earn-out` : "bar"}
                  {` · Honorar ${eur(b.fee)}`}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="rounds__power">
        <span>Verhandlungsmacht</span>
        <span className="teaser__bar teaser__bar--good">
          <i style={{ width: `${props.power}%` }} />
        </span>
        <output>{props.power} / 100</output>
      </div>
      {!done && chosen && (
        <fieldset className="mna-field">
          <legend>
            Runde {props.rounds + 1} von {props.maxRounds}: Hebel bei {chosen.buyer}
          </legend>
          <div className="mna-options mna-options--grid">
            {props.levers.map((l) => (
              <label key={l.id} className={lever === l.id ? "is-on" : undefined}>
                <input type="radio" name={`lever-${props.id}`} checked={lever === l.id} onChange={() => setLever(l.id)} />
                <b>{l.title}</b>
                <span>{l.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="panel__actions mna-bar">
        {!done && chosen && (
          <ActionButton
            action={{ type: "mandate", mandateId: props.id, move: "round", bidder: chosen.buyer, lever }}
            revision={props.revision}
            days={props.days.round}
            variant="primary"
          >
            Runde spielen
          </ActionButton>
        )}
        {chosen && (
          <ActionButton
            action={{ type: "mandate", mandateId: props.id, move: "accept_bid", bidder: chosen.buyer }}
            revision={props.revision}
            days={props.days.close}
            variant={done ? "primary" : undefined}
          >
            Zuschlag an {chosen.buyer}
          </ActionButton>
        )}
      </div>
    </div>
  );
}
