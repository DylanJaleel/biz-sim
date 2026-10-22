"use client";

import { useState } from "react";
import { DEFAULT_LEVERS, forecast, type Financing, type Levers, type Scenario } from "@/lib/game/cfo";
import type { Startup } from "@/lib/game/types";
import { eur, eurShort, runwayText } from "@/components/game/format";

// Mit dem CFO rechnen: Hebel bewegen und sehen, was mit der Kasse passiert.
// Das kostet keine Zeit, es ist das Gespräch, das man zwischendurch führt.

const FINANCING: { id: Financing; label: string }[] = [
  { id: "none", label: "Keine" },
  { id: "equity", label: "Eigenkapital" },
  { id: "debt", label: "Kredit" },
];

const SCENARIO: { id: Scenario; label: string }[] = [
  { id: "base", label: "Basis" },
  { id: "weak", label: "Schwacher Markt" },
];

function Chart({ plan, base }: { plan: { cash: number }[]; base: { cash: number }[] }) {
  const W = 560;
  const H = 180;
  const PAD = { l: 64, r: 8, t: 10, b: 22 };
  const all = [...plan, ...base].map((p) => p.cash);
  const max = Math.max(0, ...all);
  const min = Math.min(0, ...all);
  const x = (i: number) => PAD.l + (i / (plan.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + ((max - v) / Math.max(1, max - min)) * (H - PAD.t - PAD.b);
  const line = (pts: { cash: number }[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.cash).toFixed(1)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Kasse über 24 Monate: Plan im Vergleich zu heute">
      <line className="chart__zero" x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} />
      <text className="chart__label" x={PAD.l - 6} y={y(max) + 4} textAnchor="end">
        {eurShort(max)}
      </text>
      <text className="chart__label" x={PAD.l - 6} y={y(0) + 4} textAnchor="end">
        0
      </text>
      {min < 0 && (
        <text className="chart__label" x={PAD.l - 6} y={y(min) + 4} textAnchor="end">
          {eurShort(min)}
        </text>
      )}
      {[0, 6, 12, 18, 24].map((m) => (
        <text key={m} className="chart__label" x={x(m)} y={H - 6} textAnchor={m === 24 ? "end" : m === 0 ? "start" : "middle"}>
          {m === 0 ? "heute" : `M${m}`}
        </text>
      ))}
      <path className="chart__base" d={line(base)} />
      <path className="chart__plan" d={line(plan)} />
    </svg>
  );
}

export function ForecastTool({ startup }: { startup: Startup }) {
  const [levers, setLevers] = useState<Levers>(DEFAULT_LEVERS);
  const f = forecast(startup, levers);
  const set = (patch: Partial<Levers>) => setLevers((l) => ({ ...l, ...patch }));

  return (
    <section className="panel forecast" aria-labelledby="forecast-title" data-pane="rechner">
      <p className="eyebrow">Mit dem CFO rechnen</p>
      <h2 id="forecast-title" className="panel__title">
        Was wäre, wenn …
      </h2>
      <div className="forecast__levers">
        <label className="lever">
          <span>
            Einstellungen <b>+{levers.hires}</b>
          </span>
          <input type="range" min={0} max={4} step={1} value={levers.hires} onChange={(e) => set({ hires: Number(e.target.value) })} />
        </label>
        <label className="lever">
          <span>
            Preiserhöhung <b>+{Math.round(levers.price * 100)} %</b>
          </span>
          <input type="range" min={0} max={0.3} step={0.05} value={levers.price} onChange={(e) => set({ price: Number(e.target.value) })} />
        </label>
        <div className="lever">
          <span>Finanzierung</span>
          <div className="segmented" role="group" aria-label="Finanzierung">
            {FINANCING.map((o) => (
              <button key={o.id} type="button" aria-pressed={levers.financing === o.id} onClick={() => set({ financing: o.id })}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="lever">
          <span>Szenario</span>
          <div className="segmented" role="group" aria-label="Szenario">
            {SCENARIO.map((o) => (
              <button key={o.id} type="button" aria-pressed={levers.scenario === o.id} onClick={() => set({ scenario: o.id })}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Chart plan={f.plan} base={f.base} />
      <p className="chart__legend">
        <span className="chart__key chart__key--plan" /> Plan <span className="chart__key chart__key--base" /> so wie heute
      </p>

      <div className="forecast__facts">
        <span>
          <small>Geld reicht ohne Änderung</small>
          <b>{runwayText(f.runwayBase)}</b>
        </span>
        <span>
          <small>Geld reicht mit Plan</small>
          <b>{runwayText(f.runwayPlan)}</b>
        </span>
        <span>
          <small>Dein Anteil danach</small>
          <b>{f.stakeAfter.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</b>
        </span>
        {f.financingAmount > 0 && (
          <span>
            <small>Neues Geld</small>
            <b>{eur(f.financingAmount)}</b>
          </span>
        )}
      </div>
      <ul className="forecast__lines">
        {f.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {f.warning && <p className="notice notice--warn">{f.warning}</p>}
    </section>
  );
}
