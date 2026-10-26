"use client";

import { useRef, useState } from "react";
import type { NetworkPage } from "@/lib/game/network-views";
import { initialsOf } from "@/components/shares/holders";
import { ContactDetail } from "./ContactDetail";
import { LockIcon, NetBadge } from "./NetAvatar";
import { RING_CLASS, shortName } from "./ring";

// Drei Ringe um dich: innen die Menschen, die dich schon kennen, außen die,
// die über Millionen entscheiden. Der Ring um jeden Avatar zeigt die Wärme,
// feine Linien zeigen, wer wen kennt.

const SIZE = 420;
const C = SIZE / 2;
const RADII = { 1: 72, 2: 132, 3: 192 } as const;

export function NetworkRings({ view, revision, initial }: { view: NetworkPage; revision: number; initial: string }) {
  const [selected, setSelected] = useState(initial);
  const detailRef = useRef<HTMLDivElement>(null);
  const contact = view.contacts.find((c) => c.id === selected);

  const placed = ([1, 2, 3] as const).flatMap((ring) => {
    const list = view.contacts.filter((c) => c.ring === ring);
    return list.map((c, i) => {
      // Keep the top of each ring free for its label.
      const gap = 0.55;
      const a = -Math.PI / 2 + gap + ((i + 0.5) / list.length) * (Math.PI * 2 - 2 * gap);
      return { c, x: C + RADII[ring] * Math.cos(a), y: C + RADII[ring] * Math.sin(a) };
    });
  });
  const at = new Map(placed.map((p) => [p.c.id, p]));
  const edges = view.edges.filter((e) => at.get(e.a)?.c.open && at.get(e.b)?.c.open);

  const choose = (id: string) => {
    setSelected(id);
    // Stacked layout (narrow phone): bring the card into view.
    if (window.matchMedia("(max-width: 760px)").matches) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      detailRef.current?.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
    }
  };

  return (
    <div className="net">
      <div className="net__map stage">
        <div className="net__canvas" role="group" aria-label="Netzwerkkarte: Kontakte in drei Kreisen um dich">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            {([3, 2, 1] as const).map((ring) => {
              const r = view.rings.find((x) => x.ring === ring)!;
              return <circle key={ring} cx={C} cy={C} r={RADII[ring]} className={`net__zone ${RING_CLASS[ring]}${r.open ? "" : " is-locked"}`} />;
            })}
            {edges.map((e) => {
              const a = at.get(e.a)!;
              const b = at.get(e.b)!;
              const lit = selected === e.a || selected === e.b;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const qx = mx + (C - mx) * 0.4;
              const qy = my + (C - my) * 0.4;
              return <path key={`${e.a}~${e.b}`} d={`M${a.x} ${a.y}Q${qx} ${qy} ${b.x} ${b.y}`} className={`net__edge net__edge--${e.kind}${lit ? " is-lit" : ""}`} />;
            })}
            {placed
              .filter((p) => p.c.met && p.c.open)
              .map((p) => (
                <line key={p.c.id} x1={C} y1={C} x2={p.x} y2={p.y} className={`net__tie${p.c.id === selected ? " is-lit" : ""}`} style={{ opacity: 0.08 + p.c.warmth / 400 }} />
              ))}
          </svg>
          <span className="net__me" style={{ left: "50%", top: "50%" }}>
            Du
          </span>
          {view.rings.map((r) => (
            <span key={r.ring} className={`net__label ${RING_CLASS[r.ring]}${r.open ? "" : " is-locked"}`} style={{ left: "50%", top: `${((C - RADII[r.ring]) / SIZE) * 100}%` }}>
              {!r.open && <LockIcon />}
              {r.label}
              {!r.open && <small>ab {r.needs} Ruf</small>}
            </span>
          ))}
          {placed.map(({ c, x, y }) => {
            const hot = c.warmth >= 75 ? " is-hot" : c.warmth >= 50 ? " is-warm" : "";
            return (
              <button
                key={c.id}
                type="button"
                className={`net__contact ${RING_CLASS[c.ring]}${c.id === selected ? " is-selected" : ""}${c.open ? "" : " is-locked"}${c.met ? hot : " is-new"}${c.cooling ? " is-cooling" : ""}${c.refuses ? " is-refusing" : ""}`}
                style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%`, ["--w" as string]: c.met ? c.warmth : 0 }}
                onClick={() => choose(c.id)}
                aria-pressed={c.id === selected}
                aria-label={`${c.name}, ${c.role}, ${c.ringLabel}${c.open ? (c.met ? `, Wärme ${c.warmth}` : ", noch nicht getroffen") : `, gesperrt bis ${c.needs} Ruf`}${c.favors.length > 0 ? ", hat eine Bitte" : ""}${c.rivalFor ? ", Konkurrenz" : ""}${c.cooling ? ", kühlt ab" : ""}${c.career ? ", Karriere-Neuigkeit" : ""}`}
              >
                <span className="net__avatar">{c.open ? initialsOf(c.name) : <LockIcon />}</span>
                {c.open && c.favors.length > 0 && (
                  <span className="net__mark net__mark--tr">
                    <NetBadge kind="favor" />
                  </span>
                )}
                {c.open && c.rivalFor && (
                  <span className="net__mark net__mark--br">
                    <NetBadge kind="rival" />
                  </span>
                )}
                {c.open && c.career && (
                  <span className="net__mark net__mark--tl">
                    <NetBadge kind="career" />
                  </span>
                )}
                {c.open && c.cooling && (
                  <span className="net__mark net__mark--bl">
                    <NetBadge kind="cooling" />
                  </span>
                )}
                <span className="net__name">{shortName(c.name)}</span>
              </button>
            );
          })}
        </div>
        <ul className="net__legend" aria-label="Zeichenerklärung">
          <li>
            <i className="net__key net__key--ring" aria-hidden="true" /> Ring: Wärme
          </li>
          <li>
            <NetBadge kind="favor" /> Bitte
          </li>
          <li>
            <NetBadge kind="rival" /> Konkurrenz
          </li>
          <li>
            <NetBadge kind="career" /> Neuigkeit
          </li>
          <li>
            <NetBadge kind="cooling" /> Kühlt ab
          </li>
          <li>
            <i className="net__key net__key--line" aria-hidden="true" /> kennen sich
          </li>
        </ul>
      </div>

      <div ref={detailRef} className="net__side">
        {contact && <ContactDetail key={contact.id} contact={contact} view={view} revision={revision} />}
      </div>
    </div>
  );
}
