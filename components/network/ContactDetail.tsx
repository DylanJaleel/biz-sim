"use client";

import Link from "next/link";
import { useState } from "react";
import { ACTION_DAYS } from "@/lib/game/config";
import { BAL_MAX, BAL_MIN } from "@/lib/game/network-config";
import type { ContactCard, NetworkPage } from "@/lib/game/network-views";
import { ActionButton } from "@/components/game/ActionButton";
import { Disclosure } from "@/components/ui/Disclosure";
import { FavorButtons } from "./FavorParts";
import { NetAvatar } from "./NetAvatar";
import { RING_CLASS } from "./ring";

// Die Karte eines Kontakts: wer das ist, wie es um die Beziehung steht, wobei
// er gerade hilft, was du tun kannst, und was bei ihm los war.

const CAREER_TAG = { up: "Aufgestiegen", move: "Gewechselt", new: "Neu in der Rolle" } as const;

export function ContactDetail({ contact, view, revision }: { contact: ContactCard; view: NetworkPage; revision: number }) {
  const [company, setCompany] = useState(view.companies[0]?.id ?? "");
  const [target, setTarget] = useState(contact.useful.length > 0 ? (view.targets.find((t) => contact.useful.some((u) => u.label === t.label))?.id ?? "") : "");
  const specialist = contact.specialist;
  const needsTarget = specialist && specialist.kind !== "boutique";
  const first = contact.name.replace(/^(Dr\.|Prof\.)\s*/g, "").split(" ")[0];
  const trend = contact.nextWarmth - contact.warmth;
  const balPos = ((Math.max(BAL_MIN, Math.min(BAL_MAX, contact.balance)) - BAL_MIN) / (BAL_MAX - BAL_MIN)) * 100;
  const history = contact.career || contact.events.length > 0;

  return (
    <aside className={`panel net__detail ${RING_CLASS[contact.ring]}`} aria-labelledby="contact-name">
      <header className="net-who">
        <NetAvatar name={contact.name} ring={contact.ring} warmth={contact.warmth} met={contact.met} cooling={contact.cooling} locked={!contact.open} size="lg" />
        <div className="net-who__text">
          <h2 id="contact-name" className="net-who__name">
            {contact.name}
          </h2>
          <p className="net-who__role">
            {contact.role} · {contact.org}
          </p>
          <p className="net-who__tags">
            <span className="tag net-tag--ring">{contact.ringLabel}</span>
            <span className="tag">{contact.trait}</span>
            {contact.open && !contact.met && <span className="tag">Noch unbekannt</span>}
            {contact.open && contact.favors.length > 0 && <span className="tag net-tag--favor">Hat eine Bitte</span>}
            {contact.open && contact.rivalFor && <span className="tag net-tag--rival">Konkurrenz</span>}
            {contact.open && contact.cooling && <span className="tag net-tag--cooling">Kühlt ab</span>}
            {contact.open && contact.career && <span className="tag net-tag--career">{CAREER_TAG[contact.career.kind]}</span>}
          </p>
        </div>
      </header>
      <p className="net-bio">{contact.bio}</p>

      {!contact.open ? (
        <p className="notice net-locked">Dieser Kreis öffnet sich ab {contact.needs} Ruf. Gute Entscheidungen im Beirat und Vorträge bringen Ruf.</p>
      ) : (
        <>
          <section className="net-sec" aria-labelledby="sec-rel">
            <h3 id="sec-rel" className="net-sec__t">
              Beziehung
            </h3>
            {contact.met ? (
              <>
                <div className="net-gauge">
                  <div className="net-gauge__row">
                    <span>Wärme</span>
                    <b>{contact.warmth}</b>
                    <span className={`net-trend${contact.cooling ? " is-cooling" : ""}`} title="Ohne Treffen im nächsten Monat">
                      {trend === 0 ? "bleibt" : `${trend < 0 ? "↓" : "↑"} ${contact.nextWarmth} im nächsten Monat`}
                    </span>
                  </div>
                  <span className={`meter net-meter${contact.cooling ? " is-cooling" : ""}`} aria-hidden="true">
                    <i style={{ width: `${contact.warmth}%` }} />
                    <em style={{ left: `${view.warmthIntroMin}%` }} />
                  </span>
                  <small className="muted">
                    {contact.cooling
                      ? `Ohne Treffen fällt die Wärme unter ${view.warmthIntroMin}. Dann hilft ${first} nicht mehr.`
                      : `Ab ${view.warmthIntroMin} Wärme hilft ${first} dir${specialist ? ` (Spezialisten ab ${view.specialistMin})` : ""}.`}
                  </small>
                </div>
                <div className="net-gauge">
                  <div className="net-gauge__row">
                    <span>Vertrauen</span>
                    <b className={`net-bal net-bal--${contact.balanceTone}`}>{contact.balanceLabel}</b>
                  </div>
                  <span className="net-track" aria-hidden="true">
                    <i style={{ left: `${balPos}%` }} />
                  </span>
                  <small className="muted">
                    Hilft mit {contact.strength} % der üblichen Stärke{contact.level > 0 ? " (nach Aufstieg)" : ""}
                    {contact.generous ? ", häufiger und günstiger" : ""}.
                  </small>
                </div>
              </>
            ) : (
              <p className="muted">
                Ihr kennt euch noch nicht. Ein erstes Treffen bringt {contact.meetGain} Wärme; ab {view.warmthIntroMin} kann {first} helfen.
              </p>
            )}
          </section>

          <section className="net-sec" aria-labelledby="sec-help">
            <h3 id="sec-help" className="net-sec__t">
              Hilft gerade bei
            </h3>
            <p className="net-help-text">{specialist ? specialist.text : contact.help}</p>
            {contact.useful.length > 0 && (
              <ul className="net-useful">
                {contact.useful.map((u) => (
                  <li key={u.label}>
                    <Link href={u.href}>{u.label}</Link>
                    <small className="muted">{u.why}</small>
                  </li>
                ))}
              </ul>
            )}
            {contact.hint && (
              <p className="muted small">
                Vor einer Beiratssitzung gibt {first} einen Tipp zu {contact.hint.join(" und ")}. Das kostet Wärme, keinen Tag.
              </p>
            )}
          </section>

          {contact.rivalFor && (
            <p className="notice notice--warn net-rival">
              <b>Konkurrenz:</b> {first} bietet gerade bei {contact.rivalFor} mit. Ab 50 Wärme zieht {first} zurück.
            </p>
          )}

          {contact.favors.map((f) => (
            <div key={f.id} className={`net-ask${f.urgent ? " is-urgent" : ""}`}>
              <p className="net-ask__t">
                <b>Bittet dich:</b> {f.subject}
              </p>
              <p className="muted small">
                {f.cost}. Bis Ende {f.expires}. Nutzen: {f.gain}.
              </p>
              <FavorButtons favor={f} revision={revision} size="sm" />
            </div>
          ))}

          <section className="net-sec" aria-labelledby="sec-act">
            <h3 id="sec-act" className="net-sec__t">
              Was du tun kannst
            </h3>
            <div className="net__actions">
              <ActionButton
                action={{ type: "meetContact", contactId: contact.id }}
                revision={revision}
                days={ACTION_DAYS.meetContact}
                variant={contact.cooling ? "primary" : undefined}
              >
                {contact.met ? `Treffen · +${contact.meetGain} Wärme` : `Kennenlernen · +${contact.meetGain} Wärme`}
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
                      Für Hilfe einbringen
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
                    <p className="muted small">Gerade gibt es keine Übernahme, kein Mandat und keine Plattform, bei der {first} helfen könnte.</p>
                  )
                ) : (
                  <ActionButton action={{ type: "specialist", contactId: contact.id }} revision={revision} days={1} variant="primary">
                    Mandat vermitteln lassen
                  </ActionButton>
                ))}
              {contact.introBlocker && contact.met && !specialist && <p className="muted small">{contact.introBlocker}</p>}
            </div>
          </section>

          {history && (
            <Disclosure title="Verlauf" as="h3" headingClass="net-sec__t" className="net-sec net-hist" hint={contact.career ? contact.career.month : undefined}>
              {contact.career && (
                <p className="net-career">
                  <small>{contact.career.month}</small> {contact.career.text}
                </p>
              )}
              {contact.events.length > 0 && <p className="muted small">Kommt zu: {contact.events.join(", ")}.</p>}
            </Disclosure>
          )}
        </>
      )}
    </aside>
  );
}
