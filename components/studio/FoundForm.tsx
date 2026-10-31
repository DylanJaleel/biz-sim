"use client";

import { useState } from "react";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";

export interface FoundCeo {
  name: string;
  fit: string;
  strength: number;
  ask: number;
  via?: string;
}

/** Choose the CEO and your starting share, then found the company. */
export function FoundForm({
  ideaId,
  need,
  ceos,
  revision,
  days,
  esop,
  minCeo,
  disabled,
}: {
  ideaId: string;
  need: number;
  ceos: FoundCeo[];
  revision: number;
  days: number;
  esop: number;
  minCeo: number;
  disabled?: boolean;
}) {
  const [ceo, setCeo] = useState(ceos.reduce((best, c, i) => (c.strength > ceos[best]!.strength ? i : best), 0));
  const [keep, setKeep] = useState(70);
  const total = Math.round((need * keep) / 70 / 10_000) * 10_000;
  const seed = Math.round((total * 0.15) / 1000) * 1000;
  const ceoPct = 100 - keep - esop;
  const chosen = ceos[ceo]!;
  const short = chosen.ask - ceoPct;
  return (
    <div className="found">
      <fieldset className="found__ceos">
        <legend className="small muted">CEO</legend>
        {ceos.map((c, i) => (
          <label key={c.name} className={`found__ceo${i === ceo ? " is-on" : ""}`}>
            <input type="radio" name={`ceo-${ideaId}`} checked={i === ceo} onChange={() => setCeo(i)} />
            <span>
              <b>{c.name}</b>
              <small className="muted">
                Stärke {c.fit} · {c.strength} von 100 · will {c.ask} %{c.via ? ` · über ${c.via}` : ""}
              </small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="found__keep">
        <span className="small muted">Dein Startanteil</span>
        <div className="segmented" role="group" aria-label="Startanteil">
          {[60, 70, 80].map((k) => (
            <button key={k} type="button" aria-pressed={keep === k} onClick={() => setKeep(k)}>
              {k} %
            </button>
          ))}
        </div>
        <small className={short > 0 ? (ceoPct < minCeo ? "neg" : "warn") : "muted"}>
          CEO {ceoPct} %, Team {esop} %.{" "}
          {short > 0
            ? `${chosen.name.split(" ")[0]} wollte ${chosen.ask} %${ceoPct < minCeo ? ": unter " + minCeo + " % wird es unruhig." : ", das drückt Stimmung und Vertrauen."}`
            : "Passt zu den Erwartungen."}
        </small>
      </div>
      <p className="small">
        Gesamtbedarf {eur(total)} · Gründungskapital jetzt {eur(seed)}
      </p>
      <ActionButton action={{ type: "studio", move: "found", ideaId, ceo, keep }} revision={revision} variant="primary" size="sm" days={days} disabled={disabled}>
        Gründen
      </ActionButton>
    </div>
  );
}
