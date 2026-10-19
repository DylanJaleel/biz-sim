"use client";

import { useState } from "react";
import type { AssetDef } from "@/lib/game/market";
import { eur } from "@/components/game/format";
import { usePlay } from "@/components/game/usePlay";

function Line({ values }: { values: number[] }) {
  const W = 300;
  const H = 70;
  if (values.length < 2) return <div className="asset__chart asset__chart--empty">Kurse ab dem nächsten Monat</div>;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(1e-6, max - min);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * W).toFixed(1)} ${(H - 4 - ((v - min) / span) * (H - 8)).toFixed(1)}`).join(" ");
  const up = values[values.length - 1]! >= values[0]!;
  return (
    <svg className={`asset__chart ${up ? "is-up" : "is-down"}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function AssetCard({ asset, price, history, units, invested, cash, revision }: { asset: AssetDef; price: number; history: number[]; units: number; invested: number; cash: number; revision: number }) {
  const [amount, setAmount] = useState(10_000);
  const { play, pending, error } = usePlay(revision);
  const value = units * price;
  const first = history[0] ?? price;
  const change = first ? price / first - 1 : 0;
  return (
    <article className="asset panel">
      <header className="asset__head">
        <div>
          <p className="eyebrow">{asset.kind}</p>
          <h2 className="panel__title">{asset.name}</h2>
        </div>
        <div className="asset__price">
          <b>{asset.vol === 0 ? `${(asset.yield * 100).toLocaleString("de-DE")} % p. a.` : price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
          {asset.vol > 0 && <span className={change >= 0 ? "pos" : "neg"}>{(change * 100).toLocaleString("de-DE", { maximumFractionDigits: 1, signDisplay: "always" })} %</span>}
        </div>
      </header>
      {asset.vol > 0 ? <Line values={history} /> : <div className="asset__chart asset__chart--flat" aria-hidden="true" />}
      <p className="muted small">{asset.note}</p>
      <dl className="asset__facts">
        <div>
          <dt>Ausschüttung</dt>
          <dd>{asset.yield > 0 ? `${(asset.yield * 100).toLocaleString("de-DE")} % p. a. · ${asset.payEvery === 3 ? "quartalsweise" : "monatlich"}` : "keine"}</dd>
        </div>
        <div>
          <dt>Dein Bestand</dt>
          <dd>
            {eur(value)}
            {invested > 0 && <small className={value - invested >= 0 ? "pos" : "neg"}> ({eur(value - invested)})</small>}
          </dd>
        </div>
      </dl>
      <div className="asset__trade">
        <label>
          <span className="sr-only">Betrag in Euro</span>
          <input type="number" min={100} step={1000} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))} />
        </label>
        <button type="button" className="btn btn--sm btn--primary" disabled={pending || amount <= 0 || amount > cash} onClick={() => play({ type: "trade", assetId: asset.id, amount })}>
          Kaufen
        </button>
        <button type="button" className="btn btn--sm" disabled={pending || value <= 0} onClick={() => play({ type: "trade", assetId: asset.id, amount: -Math.min(amount, value) })}>
          Verkaufen
        </button>
        {value > 0 && (
          <button type="button" className="btn btn--sm btn--ghost" disabled={pending} onClick={() => play({ type: "trade", assetId: asset.id, amount: -Math.ceil(value) })}>
            Alles
          </button>
        )}
      </div>
      {error && (
        <p className="action__error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
