"use client";

import { useState } from "react";
import { ActionButton } from "@/components/game/ActionButton";
import { teaserBidders, teaserEffect, teaserLeak } from "@/lib/game/teaser";
import type { TeaserFact } from "@/lib/game/types";

// Der Teaser eines großen Mandats: anonymes Kurzprofil für die Käufer. Jede
// Zeile bringt etwas und kostet etwas; die Wirkung steht sofort daneben.

const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0");

function Meter({ label, value, text }: { label: string; value: number; text: string }) {
  const tone = value >= 60 ? "good" : value >= 35 ? "warn" : "bad";
  return (
    <div className="teaser__meter">
      <div>
        <span>{label}</span>
        <output>{text}</output>
      </div>
      <span className={`teaser__bar teaser__bar--${tone}`}>
        <i style={{ width: `${value}%` }} />
      </span>
    </div>
  );
}

export function TeaserForm({ id, facts, revision, days, daysLeft }: { id: string; facts: TeaserFact[]; revision: number; days: number; daysLeft: number }) {
  const [on, setOn] = useState<string[]>(facts.filter((f) => ["revenue", "ebitda", "plan"].includes(f.id)).map((f) => f.id));
  const e = teaserEffect(facts, on);
  const hidden = facts.filter((f) => f.finding && !on.includes(f.id));
  const toggle = (fid: string) => setOn((xs) => (xs.includes(fid) ? xs.filter((x) => x !== fid) : [...xs, fid]));
  return (
    <div className="teaser">
      <ul className="teaser__facts">
        {facts.map((f) => (
          <li key={f.id}>
            <label className={on.includes(f.id) ? "is-on" : undefined}>
              <input type="checkbox" role="switch" checked={on.includes(f.id)} onChange={() => toggle(f.id)} />
              <span>
                <b>{f.title}</b>
                <small>{f.text}</small>
                <span className="teaser__fx">
                  <em className={f.interest >= 0 ? "is-good" : "is-warn"}>Interesse {sign(f.interest)}</em>
                  <em className={f.price >= 0 ? "is-good" : "is-warn"}>Preis {sign(f.price)}</em>
                  {f.conf < -5 && <em className="is-bad">Leak-Risiko</em>}
                  {f.finding && <em className="is-line">wesentlich</em>}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="teaser__side">
        <Meter label="Interesse der Käufer" value={e.interest} text={`etwa ${teaserBidders(e.interest)} Bieter`} />
        <Meter label="Preiserwartung" value={e.price} text={e.price >= 60 ? "hoch" : e.price >= 35 ? "mittel" : "niedrig"} />
        <Meter label="Vertraulichkeit" value={e.conf} text={`Leak-Risiko ${Math.round(teaserLeak(e.conf) * 100)} %`} />
        <Meter label="Glaubwürdigkeit" value={e.cred} text={e.cred >= 60 ? "hoch" : e.cred >= 40 ? "mittel" : "gering"} />
        <p className={`notice ${e.conf < 60 ? "notice--bad" : hidden.length ? "notice--warn" : "notice--good"}`}>
          {e.conf < 60
            ? "Der Teaser ist kaum noch anonym: Belegschaft und Kunden könnten es aus der Zeitung erfahren."
            : hidden.length
              ? `Du verschweigst ${hidden.length === 1 ? "einen wesentlichen Punkt" : `${hidden.length} wesentliche Punkte`}. Die Prüfung der Käufer findet sie trotzdem, dann sinkt der Preis und dein Ansehen.`
              : "Ehrlich und anonym: vielleicht weniger Aufmerksamkeit, aber die Bieter kommen mit Zahlen, die halten."}
        </p>
        <ActionButton
          action={{ type: "mandate", mandateId: id, move: "teaser", facts: on }}
          revision={revision}
          days={days}
          variant="primary"
          disabled={on.length < 2 || days > daysLeft}
        >
          Teaser an die Käufer senden
        </ActionButton>
      </div>
    </div>
  );
}
