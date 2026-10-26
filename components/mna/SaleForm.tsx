"use client";

import { useState } from "react";
import type { ProcessKind } from "@/lib/game/types";
import { ActionButton } from "@/components/game/ActionButton";

// Verkauf der Plattform: an wen und wie. Angebote kommen nach ein bis zwei Monaten.

export function SaleForm({ id, revision, days, months }: { id: string; revision: number; days: Record<ProcessKind, number>; months: Record<ProcessKind, number> }) {
  const [process, setProcess] = useState<ProcessKind>("auction");
  const [buyers, setBuyers] = useState<"strategic" | "financial">("strategic");
  return (
    <div className="mna-form">
      <fieldset className="mna-field">
        <legend>Käufer</legend>
        <div className="mna-options">
          <label className={buyers === "strategic" ? "is-on" : undefined}>
            <input type="radio" name={`sale-buyers-${id}`} checked={buyers === "strategic"} onChange={() => setBuyers("strategic")} />
            <b>Konzern (Stratege)</b>
            <span>Zahlt für Synergien oft mehr, braucht aber länger.</span>
          </label>
          <label className={buyers === "financial" ? "is-on" : undefined}>
            <input type="radio" name={`sale-buyers-${id}`} checked={buyers === "financial"} onChange={() => setBuyers("financial")} />
            <b>Größerer Private-Equity-Fonds</b>
            <span>Rechnet mit Kredit: In schwachen Märkten bietet er deutlich weniger.</span>
          </label>
        </div>
      </fieldset>
      <fieldset className="mna-field">
        <legend>Prozess</legend>
        <div className="mna-options">
          <label className={process === "auction" ? "is-on" : undefined}>
            <input type="radio" name={`sale-process-${id}`} checked={process === "auction"} onChange={() => setProcess("auction")} />
            <b>Bieterverfahren</b>
            <span>Etwa {months.auction} Monate bis zum Angebot, meist der bessere Preis.</span>
          </label>
          <label className={process === "exclusive" ? "is-on" : undefined}>
            <input type="radio" name={`sale-process-${id}`} checked={process === "exclusive"} onChange={() => setProcess("exclusive")} />
            <b>Exklusiv</b>
            <span>Angebot zum Monatsende, aber ohne Wettbewerb.</span>
          </label>
        </div>
      </fieldset>
      <div className="mna-bar">
        <ActionButton action={{ type: "platform", startupId: id, move: "sell", process, buyers }} revision={revision} days={days[process]} variant="primary">
          Verkaufsprozess starten
        </ActionButton>
      </div>
    </div>
  );
}
