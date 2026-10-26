"use client";

import { useState } from "react";
import type { DdModule } from "@/lib/game/mna-config";
import type { BuyerFocus, ProcessKind } from "@/lib/game/types";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";

// Vorbereitung eines Mandats: Preis (Multiple), Käuferkreis, Prozess und
// Prüfung in einem Schritt. Die Tage stehen auf dem Knopf.

export interface MandateFormProps {
  id: string;
  side: "sell" | "buy";
  ebitda: number;
  multiples: number[];
  initial: number;
  dd: { module: DdModule; title: string; text: string }[];
  days: { value: number; buyers: number; ddEach: number; exclusive: number; auction: number };
  revision: number;
  daysLeft: number;
}

const BUYERS: { id: BuyerFocus; label: string; text: string }[] = [
  { id: "strategic", label: "Strategen", text: "Konzerne der Branche: zahlen für Synergien am meisten, sind aber Wettbewerber am Tisch." },
  { id: "financial", label: "Finanzinvestoren", text: "Private-Equity-Fonds: schnell und diskret, zahlen weniger, wenn Kredite teuer sind." },
  { id: "mixed", label: "Beide", text: "Breiter Käuferkreis: mehr Wettbewerb, mehr Aufwand." },
];

export function MandateForm(props: MandateFormProps) {
  const sell = props.side === "sell";
  const [multiple, setMultiple] = useState(props.initial);
  const [buyers, setBuyers] = useState<BuyerFocus>("mixed");
  const [process, setProcess] = useState<ProcessKind>(sell ? "auction" : "exclusive");
  const [dd, setDd] = useState<DdModule[]>(["financial"]);
  const days = props.days.value + (sell ? props.days.buyers : 0) + dd.length * props.days.ddEach + (process === "auction" ? props.days.auction : props.days.exclusive);
  const toggle = (m: DdModule) => setDd((xs) => (xs.includes(m) ? xs.filter((x) => x !== m) : [...xs, m]));
  return (
    <div className="mna-form">
      <fieldset className="mna-field">
        <legend>{sell ? "Preisvorstellung: Vielfaches des EBITDA" : "Euer Gebot: Vielfaches des EBITDA"}</legend>
        <div className="mna-chips" role="group">
          {props.multiples.map((m) => (
            <button key={m} type="button" aria-pressed={multiple === m} onClick={() => setMultiple(m)}>
              {m.toLocaleString("de-DE")}×
            </button>
          ))}
        </div>
        <p className="muted small">
          {sell ? "Gefordert" : "Geboten"}: <b>{eur(multiple * props.ebitda)}</b>.{" "}
          {sell ? "Zu hoch, und niemand bietet. Zu niedrig, und der Mandant verschenkt Geld." : "Zu niedrig, und der Verkäufer winkt ab. Zu hoch, und dein Mandant zahlt drauf."}
        </p>
      </fieldset>
      {sell && (
        <fieldset className="mna-field">
          <legend>Käuferkreis</legend>
          <div className="mna-options">
            {BUYERS.map((b) => (
              <label key={b.id} className={buyers === b.id ? "is-on" : undefined}>
                <input type="radio" name={`buyers-${props.id}`} checked={buyers === b.id} onChange={() => setBuyers(b.id)} />
                <b>{b.label}</b>
                <span>{b.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="mna-field">
        <legend>Prozess</legend>
        <div className="mna-options">
          <label className={process === "exclusive" ? "is-on" : undefined}>
            <input type="radio" name={`process-${props.id}`} checked={process === "exclusive"} onChange={() => setProcess("exclusive")} />
            <b>Exklusiv</b>
            <span>{sell ? "Ein Käufer, schnell und diskret. Der Preis orientiert sich an deiner Forderung." : "Direkt mit dem Inhaber verhandeln, ohne Konkurrenz."}</span>
          </label>
          <label className={process === "auction" ? "is-on" : undefined}>
            <input type="radio" name={`process-${props.id}`} checked={process === "auction"} onChange={() => setProcess("auction")} />
            <b>Bieterverfahren</b>
            <span>{sell ? "Mehrere Bieter treiben den Preis. Kostet mehr Tage; es kann durchsickern." : "Ihr bietet gegen andere: höherer Preis, aber faire Chance."}</span>
          </label>
        </div>
      </fieldset>
      <fieldset className="mna-field">
        <legend>{sell ? "Vorbereitende Prüfung (Vendor Due Diligence)" : "Prüfung vor dem Gebot"}</legend>
        <div className="mna-options mna-options--grid">
          {props.dd.map((d) => (
            <label key={d.module} className={dd.includes(d.module) ? "is-on" : undefined}>
              <input type="checkbox" checked={dd.includes(d.module)} onChange={() => toggle(d.module)} />
              <b>{d.title}</b>
              <span>{d.text}</span>
            </label>
          ))}
        </div>
        <p className="muted small">
          {sell
            ? "Was du vorher findest, kostet wenig Preis. Was der Käufer später findet, drückt den Preis stark oder lässt den Deal platzen."
            : "Jeder Befund drückt den Preis. Was ihr überseht, zahlt dein Mandant nach dem Kauf."}{" "}
          Jede Prüfung kostet einen Tag.
        </p>
      </fieldset>
      <div className="mna-bar">
        <ActionButton
          action={{ type: "mandate", mandateId: props.id, move: "launch", multiple, process, dd, ...(sell ? { buyers } : {}) }}
          revision={props.revision}
          days={days}
          variant="primary"
          disabled={days > props.daysLeft}
        >
          {sell ? "Verkaufsprozess starten" : "Angebot abgeben"}
        </ActionButton>
        <span className="mna-bar__text">
          {sell ? "Forderung" : "Gebot"} {eur(multiple * props.ebitda)}
        </span>
      </div>
    </div>
  );
}
