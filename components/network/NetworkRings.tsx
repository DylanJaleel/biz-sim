"use client";

import { useState } from "react";
import { ACTION_DAYS, WARMTH_INTRO_MIN } from "@/lib/game/config";
import type { NetworkView } from "@/lib/game/views";
import { ActionButton } from "@/components/game/ActionButton";
import { initialsOf } from "@/components/shares/holders";

// Drei Ringe um dich: innen die Menschen, die dich schon kennen, außen die,
// die über Millionen entscheiden.

const SIZE = 420;
const C = SIZE / 2;
const RADII = { 1: 72, 2: 132, 3: 192 } as const;
const RING_COLOR = { 1: "#0e9f8e", 2: "#7b4dff", 3: "#d48a10" } as const;

export function NetworkRings({ view, revision }: { view: NetworkView; revision: number }) {
  const [selected, setSelected] = useState(view.contacts[0]?.id ?? "");
  const [target, setTarget] = useState(view.mandates[0]?.id ?? "");
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

  return (
    <div className="net">
      <div className="net__map stage">
        <div className="net__canvas">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            {view.rings.map((r) => (
              <circle key={r.ring} cx={C} cy={C} r={RADII[r.ring]} className={`net__ring${r.open ? "" : " is-locked"}`} style={{ stroke: RING_COLOR[r.ring] }} />
            ))}
            {placed
              .filter((p) => p.c.met && p.c.open)
              .map((p) => (
                <line key={p.c.id} x1={C} y1={C} x2={p.x} y2={p.y} className="net__tie" style={{ opacity: 0.15 + p.c.warmth / 140 }} />
              ))}
          </svg>
          <span className="net__me" style={{ left: "50%", top: "50%" }}>
            Du
          </span>
          {view.rings.map((r) => (
            <span key={r.ring} className={`net__label${r.open ? "" : " is-locked"}`} style={{ left: "50%", top: `${((C - RADII[r.ring]) / SIZE) * 100}%` }}>
              {r.label}
              {!r.open && ` · ab ${r.needs} Ruf`}
            </span>
          ))}
          {placed.map(({ c, x, y }) => (
            <button
              key={c.id}
              type="button"
              className={`net__contact${c.id === selected ? " is-selected" : ""}${c.open ? "" : " is-locked"}${c.met ? "" : " is-new"}`}
              style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%`, ["--member" as string]: RING_COLOR[c.ring] }}
              onClick={() => setSelected(c.id)}
              aria-pressed={c.id === selected}
              aria-label={`${c.name}, ${c.role}`}
            >
              <span className="net__avatar">{initialsOf(c.name)}</span>
              <span className="net__warmth" style={{ ["--w" as string]: `${c.warmth}%` }} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {contact && (
        <aside className="panel net__detail" aria-labelledby="contact-name" style={{ ["--member" as string]: RING_COLOR[contact.ring] }}>
          <div className="net__head">
            <span className="member__avatar">{initialsOf(contact.name)}</span>
            <div>
              <h2 id="contact-name" className="panel__title">
                {contact.name}
              </h2>
              <p className="muted small">
                {contact.role} · {contact.org}
              </p>
            </div>
          </div>
          <p>{contact.bio}</p>
          <p>
            <b>Kann helfen:</b> {contact.help}
          </p>
          <div className="net__meter">
            <span>Wärme der Beziehung</span>
            <b>{contact.met ? contact.warmth : "noch unbekannt"}</b>
            <span className="meter" aria-hidden="true">
              <i style={{ width: `${contact.warmth}%` }} />
            </span>
            <small className="muted">
              Ab {WARMTH_INTRO_MIN} kannst du um einen Gefallen bitten. Jeder Monat kühlt um 3 ab. Hilft ein Kontakt derselben Firma noch einmal, wirkt es jedes Mal halb so stark.
            </small>
          </div>
          {!contact.open ? (
            <p className="notice">Dieser Kreis öffnet sich mit mehr Ruf. Gute Entscheidungen im Beirat bringen Ruf.</p>
          ) : (
            <div className="net__actions">
              <ActionButton action={{ type: "meetContact", contactId: contact.id }} revision={revision} days={ACTION_DAYS.meetContact}>
                {contact.met ? "Treffen" : "Kennenlernen"}
              </ActionButton>
              {view.mandates.length > 0 ? (
                <div className="net__intro">
                  <label>
                    <span className="sr-only">Firma</span>
                    <select value={target} onChange={(e) => setTarget(e.target.value)}>
                      {view.mandates.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ActionButton
                    action={{ type: "introContact", contactId: contact.id, startupId: target }}
                    revision={revision}
                    days={ACTION_DAYS.introContact}
                    variant="primary"
                    disabled={!contact.canIntro || !target}
                  >
                    Einbringen
                  </ActionButton>
                </div>
              ) : (
                <p className="muted small">Einbringen kannst du Kontakte, sobald du an einer Firma beteiligt bist.</p>
              )}
              {contact.cooldown > 0 && <p className="muted small">Hat gerade geholfen. Wieder möglich in {contact.cooldown} Monaten.</p>}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
