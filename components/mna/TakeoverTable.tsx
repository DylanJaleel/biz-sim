"use client";

import { useState } from "react";
import { structureDeal, type PreviewInput } from "@/lib/game/lbo";
import type { TakeoverTerms } from "@/lib/game/types";
import type { TakeoverView } from "@/lib/game/takeover";
import { NegotiationDesk } from "@/components/scene/NegotiationDesk";
import { usePlay } from "@/components/game/usePlay";
import { eur, pct } from "@/components/game/format";

// Übernahme am Tisch: oben die Szene mit dem Inhaber und den Papieren, darunter dein Angebot
// mit Schiebereglern und rechts Mittelherkunft und -verwendung mit dem Covenant der Bank.
// Gerechnet wird mit derselben Struktur wie beim Kauf (lib/game/lbo.ts).

const x = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
const mio = (n: number) => `${(n / 1_000_000).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mio. €`;
const p0 = (n: number) => `${Math.round(n * 100)} %`;

export interface TakeoverTableProps {
  name: string;
  t: TakeoverView;
  preview: PreviewInput;
  limits: { bankLeverage: number; bankShare: number; vendor: number; earnout: number; covenant: number; vendorRate: number; vendorMonths: number; earnoutMonths: number };
  rule: number;
  cash: number;
  daysLeft: number;
  acquireDays: number;
  revision: number;
  blocker: string | null;
}

function paper(title: string, t: TakeoverTerms, ebitda: number, note: string) {
  return {
    title,
    lines: [
      { label: "Unternehmenswert", value: mio(t.price) },
      { label: "Multiple", value: x(t.price / Math.max(1, ebitda)) },
      { label: "Verkäuferdarlehen", value: p0(t.vendor) },
      { label: "Earn-out", value: p0(t.earnout) },
      { label: "Zusagen", value: t.pledge ? "Standort, Jobs" : "keine" },
    ],
    note,
  };
}

export function TakeoverTable(p: TakeoverTableProps) {
  const { t } = p;
  const ebitda = Math.max(1, p.preview.ebitda);
  const agreed = t.status === "agreed" && t.agreed ? t.agreed : null;
  const start = t.lastOffer ?? { price: Math.round((t.ask * 0.92) / 10_000) * 10_000, vendor: 0.1, earnout: 0.05, pledge: false };
  const [multiple, setMultiple] = useState(Math.round((start.price / ebitda) * 20) / 20);
  const [bank, setBank] = useState(Math.min(p.limits.bankShare, 0.5));
  const [vendor, setVendor] = useState(start.vendor);
  const [earnout, setEarnout] = useState(start.earnout);
  const [pledge, setPledge] = useState(start.pledge);
  const { play, pending, error } = usePlay(p.revision);
  const price = agreed ? agreed.price : Math.round((multiple * ebitda) / 10_000) * 10_000;
  const terms = agreed ? { bank, vendor: agreed.vendor, earnout: agreed.earnout } : { bank, vendor, earnout };
  const st = structureDeal(price, ebitda, terms, p.preview.regime, p.preview.stake);
  const mine = st.equity + st.fees;
  const uses = price + st.fees;
  const lev = st.bank / ebitda;
  const tight = lev > p.limits.covenant - 0.5;
  const short = mine > p.cash;
  const open = t.status === "open" && !t.blocked;
  const left = t.rounds - t.played;
  const minMult = Math.floor(((t.ask * 0.7) / ebitda) * 20) / 20;
  const maxMult = Math.ceil(((t.ask * 1.05) / ebitda) * 20) / 20;
  const pain = t.pain.exact !== undefined ? t.pain.exact : null;
  const painText = t.pain.range ? `${mio(t.pain.range[0])} bis ${mio(t.pain.range[1])}` : undefined;
  const mineTerms: TakeoverTerms = agreed ?? { price, vendor, earnout, pledge };
  const bar = (n: number) => `${(n / Math.max(1, uses)) * 100}%`;
  return (
    <section className="tko" aria-label={`Übernahme am Tisch: ${p.name}`}>
      <NegotiationDesk
        scene
        name={t.owner}
        role={t.ownerTitle}
        look="senior"
        mood={t.mood}
        relieved={Boolean(agreed)}
        gone={t.status === "walked" || t.status === "left"}
        played={Math.min(t.played, t.rounds)}
        rounds={t.rounds}
        bonusRound={t.bonus}
        bubble={agreed ? "„Abgemacht. Ich gebe Ihnen die Hand darauf.“" : t.say}
        bubbleNote={agreed ? "Einigung" : t.sayNote}
        offer={paper(`Gegenangebot ${t.owner.split(" ").slice(-1)[0]}`, agreed ?? t.counter, ebitda, t.played > 0 ? `Runde ${t.played}` : "Forderung")}
        counter={paper(agreed ? "Einigung" : `Dein Angebot · Runde ${Math.min(t.played + 1, t.rounds)}`, mineTerms, ebitda, agreed ? "per Handschlag" : "noch nicht hingelegt")}
        painThreshold={pain}
        painText={painText}
        painLabel={t.pain.by ? `Schmerzgrenze (${t.pain.by})` : "Schmerzgrenze"}
        painHint="verdeckt: Due Diligence mit der CFO oder ein M&A-Berater verrät sie"
      />

      <div className="tko__grid">
        <div className="tko__panel">
          <div className="tko__head">
            <h2>Dein Angebot</h2>
            <span>
              {agreed ? "Preis und Verkäuferanteil stehen" : open ? `Runde ${Math.min(t.played + 1, t.rounds)} · kostet ${t.days} Tag` : (t.blocked ?? "Verhandlung beendet")}
            </span>
          </div>
          <Slider
            label="Preis (Unternehmenswert)"
            value={agreed ? agreed.price / ebitda : multiple}
            min={minMult}
            max={maxMult}
            step={0.05}
            onChange={setMultiple}
            disabled={Boolean(agreed) || !open}
            shown={`${x(price / ebitda)} · ${mio(price)}`}
            note={`Faustregel für Firmen dieser Größe: um ${x(p.rule)} EBITDA. Gefordert sind ${x(t.ask / ebitda)}.`}
          />
          <Slider
            label="Bankkredit"
            value={bank}
            min={0}
            max={p.limits.bankShare}
            step={0.05}
            onChange={setBank}
            shown={`${x(st.bank / ebitda)} · ${mio(st.bank)}`}
            note={`höchstens ${x(p.limits.bankLeverage)} EBITDA und ${p0(p.limits.bankShare)} des Preises · Zins ${pct(st.rate)} · 7 Jahre Tilgung`}
          />
          <Slider
            label="Verkäuferdarlehen"
            value={agreed ? agreed.vendor : vendor}
            min={0}
            max={p.limits.vendor}
            step={0.05}
            onChange={setVendor}
            disabled={Boolean(agreed) || !open}
            shown={`${p0(agreed ? agreed.vendor : vendor)} · ${mio(st.vendor)}`}
            note={`${pct(p.limits.vendorRate, 0)} Zins, zurück nach ${p.limits.vendorMonths / 12} Jahren. Der Inhaber geht bis ${p0(t.maxVendor)} gern mit.`}
          />
          <Slider
            label="Earn-out"
            value={agreed ? agreed.earnout : earnout}
            min={0}
            max={p.limits.earnout}
            step={0.05}
            onChange={setEarnout}
            disabled={Boolean(agreed) || !open}
            shown={`${p0(agreed ? agreed.earnout : earnout)} · ${mio(st.earnout)}`}
            note={`nach ${p.limits.earnoutMonths} Monaten, nur wenn das EBITDA hält. Mehr als ${p0(t.maxEarnout)} verärgert ihn.`}
          />
          <label className="tko__pledge">
            <input type="checkbox" checked={agreed ? agreed.pledge : pledge} disabled={Boolean(agreed) || !open} onChange={(e) => setPledge(e.target.checked)} />
            <span>
              <b>Zusagen: Standort und Arbeitsplätze fünf Jahre sichern</b>
              <small>Kostet dich wenig, ist dem Inhaber viel wert und hebt seine Stimmung.</small>
            </span>
          </label>
          {error && <p className="notice notice--bad">{error}</p>}
          {p.blocker && agreed && <p className="notice notice--warn">{p.blocker}</p>}
          {short && <p className="notice notice--bad">Dafür fehlen dir {eur(mine - p.cash)} Eigenkapital.</p>}
          <div className="tko__actions">
            {open && (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={pending || left <= 0 || p.daysLeft < t.days}
                  onClick={() => play({ type: "takeover", startupId: t.id, move: "offer", price, vendor, earnout, pledge })}
                >
                  {left > 0 ? `Angebot hinlegen (${t.days} Tag)` : "Keine Runde mehr"}
                </button>
                {t.played > 0 && (
                  <button type="button" className="btn" disabled={pending || p.daysLeft < t.days} onClick={() => play({ type: "takeover", startupId: t.id, move: "accept" })}>
                    Gegenangebot annehmen ({mio(t.counter.price)})
                  </button>
                )}
                <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => play({ type: "takeover", startupId: t.id, move: "leave" })}>
                  Aufstehen
                </button>
              </>
            )}
            {agreed && (
              <button
                type="button"
                className="btn btn--primary"
                disabled={pending || short || Boolean(p.blocker) || p.daysLeft < p.acquireDays}
                onClick={() => play({ type: "acquire", targetId: t.id, bid: "ask", bank, vendor: agreed.vendor, earnout: agreed.earnout })}
              >
                Kaufvertrag unterschreiben ({p.acquireDays} Tage)
              </button>
            )}
          </div>
          {open && (
            <p className="muted small">
              {left > 0 ? `Noch ${left === 1 ? "eine Runde" : `${left} Runden`}.` : "Das war sein letztes Wort."} Gute Laune (ab 70) bringt eine Runde mehr; ein Angebot weit unter
              seiner Schmerzgrenze verärgert ihn, unter 25 steht er auf.
            </p>
          )}
        </div>

        <div className="tko__panel">
          <div className="tko__head">
            <h2>Mittelherkunft und -verwendung</h2>
            <span>{mio(uses)}</span>
          </div>
          <div
            className="tko__bars"
            role="img"
            aria-label={`Verwendung ${mio(uses)}; Herkunft: Bank ${mio(st.bank)}, Verkäuferdarlehen ${mio(st.vendor)}, Earn-out ${mio(st.earnout)}, dein Geld ${mio(mine)}`}
          >
            <span>Verwendung</span>
            <div className="tko__bar">
              <i className="tko-c--price" style={{ width: bar(price) }} />
              <i className="tko-c--fees" style={{ width: bar(st.fees) }} />
            </div>
            <span>Herkunft</span>
            <div className="tko__bar">
              <i className="tko-c--bank" style={{ width: bar(st.bank) }} />
              <i className="tko-c--vendor" style={{ width: bar(st.vendor) }} />
              <i className="tko-c--earnout" style={{ width: bar(st.earnout) }} />
              <i className="tko-c--equity" style={{ width: bar(mine) }} />
            </div>
          </div>
          <dl className="tko__legend">
            <div>
              <dt>
                <i className="tko-c--price" /> Kaufpreis
              </dt>
              <dd>{mio(price)}</dd>
            </div>
            <div>
              <dt>
                <i className="tko-c--bank" /> Bank
              </dt>
              <dd>{mio(st.bank)}</dd>
            </div>
            <div>
              <dt>
                <i className="tko-c--fees" /> Notar, Anwälte, Bank
              </dt>
              <dd>{mio(st.fees)}</dd>
            </div>
            <div>
              <dt>
                <i className="tko-c--vendor" /> Verkäuferdarlehen
              </dt>
              <dd>{mio(st.vendor)}</dd>
            </div>
            <div />
            <div>
              <dt>
                <i className="tko-c--earnout" /> Earn-out (später)
              </dt>
              <dd>{mio(st.earnout)}</dd>
            </div>
            <div />
            <div>
              <dt>
                <i className="tko-c--equity" /> Dein Geld
              </dt>
              <dd className={short ? "neg" : undefined}>{mio(mine)}</dd>
            </div>
          </dl>
          <div className="tko__cov">
            <div className="tko__head">
              <h3>Nettoverschuldung ÷ EBITDA</h3>
              <span>Covenant {x(p.limits.covenant)}, jedes Quartal geprüft</span>
            </div>
            <div className="tko__meter" aria-hidden="true">
              <i className={tight ? "is-tight" : undefined} style={{ width: `${Math.min(100, (lev / (p.limits.covenant * 1.2)) * 100)}%` }} />
              <b style={{ left: `${(1 / 1.2) * 100}%` }} />
            </div>
            <p className={tight ? "neg small" : "muted small"}>
              {x(lev)} nach dem Kauf{tight ? ": wenig Luft. Ein schwaches Quartal, und die Bank greift ein." : "."}
            </p>
          </div>
        </div>
      </div>
      {t.history.length > 0 && (
        <ol className="tko__log" aria-label="Verlauf">
          {t.history.map((h, i) => (
            <li key={i}>
              <b>Runde {i + 1}:</b> du {mio(h.offer.price)} ({p0(h.offer.vendor)} Darlehen, {p0(h.offer.earnout)} Earn-out{h.offer.pledge ? ", Zusagen" : ""}). {h.say}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Slider(props: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; shown: string; note: string; disabled?: boolean }) {
  return (
    <label className="tko-slider">
      <span className="tko-slider__head">
        <b>{props.label}</b>
        <b>{props.shown}</b>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <span className="muted small">{props.note}</span>
    </label>
  );
}
