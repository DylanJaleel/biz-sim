"use client";

import { useState } from "react";
import { annuityOf, previewStructure, type PreviewInput } from "@/lib/game/lbo";
import type { DdModule } from "@/lib/game/mna-config";
import type { IntegrationKind } from "@/lib/game/types";
import { ActionButton } from "@/components/game/ActionButton";
import { eur, pct } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";

// Der Strukturierungs-Tisch: erst prüfen, dann Preis und Finanzierung wählen.
// Die Rechnung im Browser ist dieselbe, die der Kauf danach verwendet.

export interface DealDeskProps {
  id: string;
  kind: "deal" | "addon";
  revision: number;
  dd: { module: DdModule; title: string; text: string; cost: number; done: boolean }[];
  preview: PreviewInput;
  limits: {
    bankLeverage: number;
    bankShare: number;
    vendor: number;
    earnout: number;
    minEquity: number;
    covenant: number;
    vendorRate: number;
    vendorMonths: number;
    earnoutMonths: number;
    fees: number;
  };
  lowBid: { discount: number; chance: number };
  found: number;
  cash: number;
  daysLeft: number;
  acquireDays: number;
  blocker: string | null;
  integration?: { fast: { months: number; synergy: number; churn: number }; careful: { months: number; synergy: number; churn: number } };
  /** Add-ons: net debt and EBITDA of the group before the deal. */
  group?: { bank: number; ebitda: number };
}

const x = (n: number) => `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×`;

export function DealDesk(p: DealDeskProps) {
  const [checks, setChecks] = useState<DdModule[]>(p.dd.filter((d) => !d.done).map((d) => d.module));
  const [bid, setBid] = useState<"ask" | "low">("ask");
  const [bank, setBank] = useState(0.4);
  const [vendor, setVendor] = useState(0.1);
  const [earnout, setEarnout] = useState(0);
  const [integration, setIntegration] = useState<IntegrationKind>("careful");
  const terms = { bid, bank, vendor, earnout };
  const s = previewStructure(p.preview, terms);
  const ddTodo = p.dd.filter((d) => !d.done && checks.includes(d.module));
  const ddCost = ddTodo.reduce((sum, d) => sum + d.cost, 0);
  const monthly = annuityOf(s.bank, s.rate, 84) + (s.vendor * p.limits.vendorRate) / 12;
  const groupLeverage = p.group ? (p.group.bank + s.bank) / Math.max(1, p.group.ebitda + p.preview.ebitda) : s.leverage;
  const tight = groupLeverage > p.limits.covenant - 0.5;
  const short = s.fromPlayer > p.cash;
  const lowChance = Math.min(1, p.lowBid.chance + 0.1 * p.found);
  return (
    <div className="mna-desk">
      <section className="panel" aria-labelledby="dd-title">
        <p className="eyebrow">Schritt 1</p>
        <h2 id="dd-title" className="panel__title">
          Due Diligence
        </h2>
        <Disclosure title="Warum prüfen?" quietOnWide>
          <p className="muted small">
            Jeder Baustein kostet einen Tag und Beraterhonorar. Was du findest, senkt den Preis. Was du übersiehst, trifft dich nach dem Kauf: als Nachzahlung, als verlorener
            Kunde, als niedrigeres EBITDA.
          </p>
        </Disclosure>
        <div className="mna-options mna-options--grid">
          {p.dd.map((d) => (
            <label key={d.module} className={d.done ? "is-done" : checks.includes(d.module) ? "is-on" : undefined}>
              <input
                type="checkbox"
                disabled={d.done}
                checked={d.done || checks.includes(d.module)}
                onChange={() => setChecks((xs) => (xs.includes(d.module) ? xs.filter((m) => m !== d.module) : [...xs, d.module]))}
              />
              <b>
                {d.title} {d.done ? "· erledigt" : `· ${eur(d.cost)}`}
              </b>
              <span>{d.text}</span>
            </label>
          ))}
        </div>
        {ddTodo.length > 0 && (
          <ActionButton
            action={{ type: "examine", targetId: p.id, modules: ddTodo.map((d) => d.module) }}
            revision={p.revision}
            days={ddTodo.length}
            disabled={ddCost > p.cash || ddTodo.length > p.daysLeft}
          >
            {`Prüfen lassen (${eur(ddCost)})`}
          </ActionButton>
        )}
      </section>

      <section className="panel" aria-labelledby="fin-title">
        <p className="eyebrow">Schritt 2</p>
        <h2 id="fin-title" className="panel__title">
          Preis und Finanzierung
        </h2>
        <fieldset className="mna-field">
          <legend>Gebot</legend>
          <div className="mna-options">
            <label className={bid === "ask" ? "is-on" : undefined}>
              <input type="radio" name={`bid-${p.id}`} checked={bid === "ask"} onChange={() => setBid("ask")} />
              <b>Geforderten Preis zahlen</b>
              <span>Sicher, abzüglich dessen, was die Prüfung gefunden hat.</span>
            </label>
            <label className={bid === "low" ? "is-on" : undefined}>
              <input type="radio" name={`bid-${p.id}`} checked={bid === "low"} onChange={() => setBid("low")} />
              <b>{Math.round(p.lowBid.discount * 100)} % weniger bieten</b>
              <span>Der Verkäufer nimmt mit etwa {Math.round(lowChance * 100)} % an (jeder Befund hilft). Sonst ist die Firma weg.</span>
            </label>
          </div>
        </fieldset>
        <div className="mna-sliders">
          <Slider
            label="Bankkredit"
            value={bank}
            max={p.limits.bankShare}
            onChange={setBank}
            note={`höchstens ${x(p.limits.bankLeverage)} EBITDA · ${pct(s.rate)} Zins · 7 Jahre Tilgung`}
            amount={s.bank}
          />
          <Slider
            label="Verkäuferdarlehen"
            value={vendor}
            max={p.limits.vendor}
            onChange={setVendor}
            note={`${pct(p.limits.vendorRate, 0)} Zins, zurück nach ${p.limits.vendorMonths / 12} Jahren`}
            amount={s.vendor}
          />
          <Slider
            label="Earn-out"
            value={earnout}
            max={p.limits.earnout}
            onChange={setEarnout}
            note={`nach ${p.limits.earnoutMonths} Monaten, nur wenn das EBITDA hält`}
            amount={s.earnout}
          />
        </div>
        {p.integration && (
          <fieldset className="mna-field">
            <legend>Integration</legend>
            <div className="mna-options">
              {(["careful", "fast"] as const).map((k) => (
                <label key={k} className={integration === k ? "is-on" : undefined}>
                  <input type="radio" name={`int-${p.id}`} checked={integration === k} onChange={() => setIntegration(k)} />
                  <b>{k === "careful" ? "Behutsam" : "Schnell und hart"}</b>
                  <span>
                    {p.integration![k].months} Monate · Einsparungen klappen in etwa {Math.round(p.integration![k].synergy * 100)} % der Fälle · Kunden gehen in etwa{" "}
                    {Math.round(p.integration![k].churn * 100)} %
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <table className="mna-table">
          <tbody>
            <tr>
              <th>Kaufpreis (Unternehmenswert)</th>
              <td>{eur(s.price)}</td>
            </tr>
            <tr>
              <th>Bank</th>
              <td>{eur(s.bank)}</td>
            </tr>
            <tr>
              <th>Verkäufer (Darlehen und Earn-out)</th>
              <td>{eur(s.vendor + s.earnout)}</td>
            </tr>
            {p.kind === "addon" && (
              <tr>
                <th>Aus der Kasse der Plattform</th>
                <td>{eur(s.fromPlatform)}</td>
              </tr>
            )}
            <tr>
              <th>Nebenkosten (Notar, Anwälte, Bank)</th>
              <td>{eur(s.fees)}</td>
            </tr>
            <tr className="mna-table__sum">
              <th>Dein Geld jetzt</th>
              <td>{eur(s.fromPlayer)}</td>
            </tr>
            <tr>
              <th>{p.kind === "addon" ? "Verschuldung der Gruppe danach" : "Bankkredit ÷ EBITDA"}</th>
              <td className={tight ? "neg" : undefined}>
                {x(groupLeverage)} (Grenze {x(p.limits.covenant)})
              </td>
            </tr>
            <tr>
              <th>Zins und Tilgung im Monat</th>
              <td>{eur(monthly)}</td>
            </tr>
          </tbody>
        </table>
        {tight && <p className="notice notice--warn">Wenig Luft bis zum Covenant. Ein schwaches Quartal, ein verlorener Kunde, und die Bank greift ein.</p>}
        {short && <p className="notice notice--bad">Dafür fehlen dir {eur(s.fromPlayer - p.cash)}.</p>}
        {p.blocker && <p className="notice notice--warn">{p.blocker}</p>}
        <div className="mna-bar">
          <ActionButton
            action={{ type: "acquire", targetId: p.id, bid, bank, vendor, earnout, ...(p.kind === "addon" ? { integration } : {}) }}
            revision={p.revision}
            days={p.acquireDays}
            variant="primary"
            disabled={short || Boolean(p.blocker) || p.daysLeft < p.acquireDays}
          >
            {p.kind === "addon" ? "Zukauf unterschreiben" : "Kaufvertrag unterschreiben"}
          </ActionButton>
          <span className={`mna-bar__text${short ? " neg" : ""}`}>Dein Geld jetzt {eur(s.fromPlayer)}</span>
        </div>
      </section>
    </div>
  );
}

function Slider({ label, value, max, onChange, note, amount }: { label: string; value: number; max: number; onChange: (v: number) => void; note: string; amount: number }) {
  return (
    <label className="mna-slider">
      <span className="mna-slider__head">
        <b>{label}</b>
        <span>
          {Math.round(value * 100)} % · {eur(amount)}
        </span>
      </span>
      <input type="range" min={0} max={max} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="muted small">{note}</span>
    </label>
  );
}
