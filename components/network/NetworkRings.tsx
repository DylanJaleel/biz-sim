"use client";

import Link from "next/link";
import { useState } from "react";
import { ACTION_DAYS } from "@/lib/game/config";
import type { ContactCard, NetworkPage } from "@/lib/game/network-views";
import { ActionButton } from "@/components/game/ActionButton";
import { initialsOf } from "@/components/shares/holders";

// Drei Ringe um dich: innen die Menschen, die dich schon kennen, außen die,
// die über Millionen entscheiden. Linien zeigen, wer wen kennt.

const SIZE = 420;
const C = SIZE / 2;
const RADII = { 1: 72, 2: 132, 3: 192 } as const;
const RING_COLOR = { 1: "#0e9f8e", 2: "#7b4dff", 3: "#d48a10" } as const;

export function NetworkRings({ view, revision, initial }: { view: NetworkPage; revision: number; initial: string }) {
  const [selected, setSelected] = useState(initial);
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

  return (
    <div className="net">
      <div className="net__map stage">
        <div className="net__canvas">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            {view.rings.map((r) => (
              <circle key={r.ring} cx={C} cy={C} r={RADII[r.ring]} className={`net__ring${r.open ? "" : " is-locked"}`} style={{ stroke: RING_COLOR[r.ring] }} />
            ))}
            {edges.map((e) => {
              const a = at.get(e.a)!;
              const b = at.get(e.b)!;
              const lit = selected === e.a || selected === e.b;
              return <line key={`${e.a}~${e.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`net__edge net__edge--${e.kind}${lit ? " is-lit" : ""}`} />;
            })}
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
              className={`net__contact${c.id === selected ? " is-selected" : ""}${c.open ? "" : " is-locked"}${c.met ? "" : " is-new"}${c.favors.length > 0 ? " has-favor" : ""}${c.refuses ? " is-refusing" : ""}`}
              style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%`, ["--member" as string]: RING_COLOR[c.ring] }}
              onClick={() => setSelected(c.id)}
              aria-pressed={c.id === selected}
              aria-label={`${c.name}, ${c.role}${c.favors.length > 0 ? ", hat eine Bitte" : ""}`}
            >
              <span className="net__avatar">{initialsOf(c.name)}</span>
              <span className="net__warmth" style={{ ["--w" as string]: `${c.warmth}%` }} aria-hidden="true" />
              {c.favors.length > 0 && <span className="net__badge" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>

      {contact && <ContactDetail contact={contact} view={view} revision={revision} />}
    </div>
  );
}

function ContactDetail({ contact, view, revision }: { contact: ContactCard; view: NetworkPage; revision: number }) {
  const [company, setCompany] = useState(view.companies[0]?.id ?? "");
  const [target, setTarget] = useState(contact.useful.length > 0 ? (view.targets.find((t) => contact.useful.some((u) => u.label === t.label))?.id ?? "") : "");
  const specialist = contact.specialist;
  const needsTarget = specialist && specialist.kind !== "boutique";
  return (
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
          <p className="muted small">
            {contact.ringLabel} · {contact.trait}
          </p>
        </div>
      </div>
      <p>{contact.bio}</p>
      {contact.career && (
        <p className="notice net__career">
          <small>{contact.career.month}</small> {contact.career.text}
        </p>
      )}
      <p>
        <b>Kann helfen:</b> {specialist ? specialist.text : contact.help}
      </p>
      {contact.hint && (
        <p className="muted small">
          Vor einer Beiratssitzung kann {contact.name} einen Tipp zu {contact.hint.join(" und ")} geben (kostet Wärme, keinen Tag).
        </p>
      )}

      <div className="net__meter">
        <span>Wärme der Beziehung</span>
        <b>{contact.met ? contact.warmth : "noch unbekannt"}</b>
        <span className="meter" aria-hidden="true">
          <i style={{ width: `${contact.warmth}%` }} />
        </span>
        <small className="muted">
          {contact.met
            ? `Nächsten Monat ohne Treffen: ${contact.nextWarmth}. Ab ${view.warmthIntroMin} kannst du um Hilfe bitten${specialist ? ` (Spezialisten ab ${view.specialistMin})` : ""}.`
            : `Ein erstes Treffen bringt ${contact.meetGain} Wärme.`}
          {contact.cooling && " Achtung: Sie fällt unter die Schwelle."}
        </small>
      </div>
      <div className="net__meter">
        <span>Vertrauenskonto</span>
        <b className={`net__bal net__bal--${contact.balanceTone}`}>
          {contact.balance > 0 ? `+${contact.balance}` : contact.balance} · {contact.balanceLabel}
        </b>
        <small className="muted">
          Gefallen tun füllt es, um Hilfe bitten leert es. Hilft mit {contact.strength} % der üblichen Stärke{contact.level > 0 ? " (Aufstieg)" : ""}
          {contact.generous ? ", häufiger und günstiger" : ""}.
        </small>
      </div>

      {contact.rivalFor && (
        <p className="notice notice--warn">
          Bietet gerade bei {contact.rivalFor} mit. Ab 50 Wärme zieht {contact.name} zurück.
        </p>
      )}

      {contact.favors.map((f) => (
        <div key={f.id} className="notice net__favor">
          <p>
            <b>Bittet dich:</b> {f.subject}{" "}
            <small className="muted">
              ({f.cost}, bis Ende {f.expires})
            </small>
          </p>
          <div className="deal__actions">
            <ActionButton
              action={{ type: "favor", favorId: f.id, accept: true }}
              revision={revision}
              days={f.days > 0 ? f.days : undefined}
              size="sm"
              variant="primary"
              disabled={Boolean(f.blocker)}
            >
              Zusagen
            </ActionButton>
            <ActionButton action={{ type: "favor", favorId: f.id, accept: false }} revision={revision} size="sm" variant="ghost">
              Absagen
            </ActionButton>
          </div>
        </div>
      ))}

      {contact.useful.length > 0 && (
        <div className="net__useful">
          <p className="eyebrow">Wäre gerade nützlich für</p>
          <ul>
            {contact.useful.map((u) => (
              <li key={u.label}>
                <Link href={u.href}>{u.label}</Link> <small className="muted">{u.why}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
      {contact.events.length > 0 && <p className="muted small">Kommt zu: {contact.events.join(", ")}.</p>}

      {!contact.open ? (
        <p className="notice">Dieser Kreis öffnet sich ab {contact.needs} Ruf. Gute Entscheidungen im Beirat und Vorträge bringen Ruf.</p>
      ) : (
        <div className="net__actions">
          <ActionButton action={{ type: "meetContact", contactId: contact.id }} revision={revision} days={ACTION_DAYS.meetContact}>
            {contact.met ? `Treffen (+${contact.meetGain} Wärme)` : `Kennenlernen (+${contact.meetGain} Wärme)`}
          </ActionButton>
          {!specialist &&
            (view.companies.length > 0 ? (
              <div className="net__intro">
                <label>
                  <span className="sr-only">Firma</span>
                  <select value={company} onChange={(e) => setCompany(e.target.value)}>
                    {view.companies.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <ActionButton
                  action={{ type: "introContact", contactId: contact.id, startupId: company }}
                  revision={revision}
                  days={ACTION_DAYS.introContact}
                  variant="primary"
                  disabled={!contact.canIntro || !company}
                >
                  Einbringen
                </ActionButton>
              </div>
            ) : (
              <p className="muted small">Einbringen kannst du Kontakte, sobald du an einer Firma beteiligt bist.</p>
            ))}
          {specialist &&
            (needsTarget ? (
              view.targets.length > 0 ? (
                <div className="net__intro">
                  <label>
                    <span className="sr-only">Wofür</span>
                    <select value={target} onChange={(e) => setTarget(e.target.value)}>
                      <option value="">Wofür?</option>
                      {view.targets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ActionButton
                    action={{ type: "specialist", contactId: contact.id, targetId: target || undefined }}
                    revision={revision}
                    days={1}
                    variant="primary"
                    disabled={!target}
                  >
                    Beauftragen
                  </ActionButton>
                </div>
              ) : (
                <p className="muted small">Gerade gibt es keine Übernahme, kein Mandat und keine Plattform, bei der {contact.name} helfen könnte.</p>
              )
            ) : (
              <ActionButton action={{ type: "specialist", contactId: contact.id }} revision={revision} days={1} variant="primary">
                Mandat vermitteln lassen
              </ActionButton>
            ))}
          {contact.introBlocker && contact.met && <p className="muted small">{contact.introBlocker}</p>}
        </div>
      )}
    </aside>
  );
}
