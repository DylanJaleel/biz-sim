"use client";

import { useState } from "react";
import type { OfferView } from "@/lib/game/wealth-views";
import type { Binding } from "@/lib/game/wealth-types";
import { ActionButton } from "@/components/game/ActionButton";
import { eur, pct } from "@/components/game/format";
import styles from "./wealth.module.css";

const BINDINGS: Binding[] = [5, 10, 15];
const rate = (r: number) => pct(r, 2);
const factor = (n: number) => `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}fach`;
const STARS = ["", "●○○○○", "●●○○○", "●●●○○", "●●●●○", "●●●●●"];

/** Marktplatz: Karten links, rechts das Angebot mit Beleihung und Zinsbindung zum Durchrechnen. */
export function BuyPanel({ offers, cash, daysLeft, days, revision }: { offers: OfferView[]; cash: number; daysLeft: number; days: number; revision: number }) {
  const [selectedId, setSelectedId] = useState(offers.find((o) => !o.blocker)?.id ?? offers[0]!.id);
  const offer = offers.find((o) => o.id === selectedId) ?? offers[0]!;
  const ltvs = [...new Set(offer.options.map((o) => o.ltv))];
  const [ltvWish, setLtv] = useState<number | null>(null);
  const [binding, setBinding] = useState<Binding>(10);
  const ltv = ltvWish !== null && ltvs.includes(ltvWish) ? ltvWish : offer.maxLtv;
  const f = offer.options.find((o) => o.ltv === ltv && o.binding === binding)?.f ?? offer.standard;
  const short = Math.max(0, f.cash - cash);
  return (
    <div className={styles.market}>
      <div className={styles.cards}>
        {offers.map((o) => (
          <button
            key={o.id}
            type="button"
            className={o.id === offer.id ? styles.cardOn : styles.card}
            data-blocked={o.blocker !== null}
            onClick={() => setSelectedId(o.id)}
            aria-pressed={o.id === offer.id}
          >
            <div className={styles.cardImg} style={{ backgroundImage: `url(/boardroom/${o.image}.webp)` }}>
              <span className={styles.kind}>{o.label}</span>
              <span className={styles.city}>{o.cityName}</span>
            </div>
            <div className={styles.cardBody}>
              <b>{o.name}</b>
              <span className="muted small">
                {o.area.toLocaleString("de-DE")} m²{o.units > 1 ? ` · ${o.units} ${o.kind === "gewerbe" ? "Mieter" : "Wohnungen"}` : ""}
              </span>
              <dl className={styles.facts}>
                <div>
                  <dt>Preis</dt>
                  <dd>{eur(o.price)}</dd>
                </div>
                <div>
                  <dt>{o.kind === "penthouse" ? "Mietwert" : "Faktor"}</dt>
                  <dd>{o.kind === "penthouse" ? pct(o.rent / o.price) : factor(o.price / o.rent)}</dd>
                </div>
                <div>
                  <dt>{o.kind === "penthouse" ? "Zustand" : "Rendite"}</dt>
                  <dd>{o.kind === "penthouse" ? STARS[o.condition] : pct(o.rent / o.price)}</dd>
                </div>
              </dl>
              {o.blocker && <span className="muted small">{o.blocker}</span>}
            </div>
          </button>
        ))}
      </div>

      <aside className={`panel ${styles.panelSticky}`} aria-label={`Angebot ${offer.name}`}>
        <p className="eyebrow">Angebot prüfen</p>
        <h2 className="panel__title">{offer.name}</h2>
        <p className="muted small">
          {offer.label} in {offer.cityName}, Zustand {offer.conditionLabel}. Steht bis Ende des Quartals.
        </p>
        <div className={styles.lines}>
          <div>
            <span>Kaufpreis</span>
            <span>{eur(offer.price)}</span>
          </div>
          <div>
            <span>{offer.kind === "penthouse" ? "Mietwert im Jahr (du wohnst selbst)" : "Jahresmiete bei Vollvermietung"}</span>
            <span>{eur(offer.rent)}</span>
          </div>
          <div>
            <span>Bruttomietrendite · Faktor</span>
            <span>
              {pct(f.grossYield, 2)} · {factor(f.factor)}
            </span>
          </div>
          <div>
            <span>Nebenkosten (Steuer, Notar, Makler)</span>
            <span>
              {pct(offer.costsShare)} · {eur(f.costs)}
            </span>
          </div>
        </div>

        <b className="small">Beleihung (Hypothek in % vom Kaufpreis)</b>
        <div className={styles.choices} role="radiogroup" aria-label="Beleihung">
          {ltvs.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={l === ltv} className={l === ltv ? styles.choiceOn : styles.choice} onClick={() => setLtv(l)}>
              {pct(l, 0)}
            </button>
          ))}
        </div>
        <b className="small">Zinsbindung</b>
        <div className={styles.choices} role="radiogroup" aria-label="Zinsbindung">
          {BINDINGS.map((b) => {
            const r = offer.options.find((o) => o.ltv === ltv && o.binding === b)?.f.rate ?? offer.rates[b];
            return (
              <button key={b} type="button" role="radio" aria-checked={b === binding} className={b === binding ? styles.choiceOn : styles.choice} onClick={() => setBinding(b)}>
                {b} Jahre
                <small>{rate(r)}</small>
              </button>
            );
          })}
        </div>

        <div className={styles.lines}>
          <div>
            <span>Darlehen</span>
            <span>{eur(f.loan)}</span>
          </div>
          {f.loan > 0 && (
            <>
              <div>
                <span>Zins fest für {binding} Jahre</span>
                <span>{rate(f.rate)}</span>
              </div>
              <div>
                <span>Rate im Monat (Zins plus 2 % Tilgung)</span>
                <span>{eur(f.payment)}</span>
              </div>
            </>
          )}
          <div className="sum">
            <span>Eigenmittel gesamt</span>
            <span>{eur(f.cash)}</span>
          </div>
          <div>
            <span>Konto danach</span>
            <span className={short > 0 ? "neg" : undefined}>{eur(cash - f.cash)}</span>
          </div>
          <div className="sum">
            <span>{offer.kind === "penthouse" ? "Unterhalt im Monat" : "Miete nach Leerstand minus Instandhaltung"}</span>
            <span>{eur(f.rentMonth - f.upkeepMonth)}</span>
          </div>
          <div>
            <b>Cashflow im Monat</b>
            <b className={f.cashflow < 0 ? "neg" : "pos"}>{eur(f.cashflow)}</b>
          </div>
          {f.dscr !== null && offer.kind !== "penthouse" && (
            <div>
              <span>Kapitaldienstdeckung (Miete ÷ Rate)</span>
              <span className={f.dscr < 1.1 ? "neg" : undefined}>{f.dscr.toLocaleString("de-DE", { maximumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
        {f.loan > 0 && (
          <p className={f.stressCashflow < 0 ? styles.stress : styles.stressOk}>
            <b>Zinswende-Test:</b> Nach {binding} Jahren bleiben {eur(f.rest)} Restschuld. Bei zwei Punkten mehr ({rate(f.stressRate)}) wird der Cashflow zu {eur(f.stressCashflow)}{" "}
            im Monat.
          </p>
        )}
        {offer.kind === "penthouse" && (
          <p className="muted small">
            Ein Penthouse ersetzt dein Büro: Die Büromiete entfällt, die Vorteile deiner Büro-Stufe bleiben. Einmalig +3 Ruf, jedes Jahr ein Neujahrsempfang.
          </p>
        )}
        <ActionButton
          action={{ type: "estate", move: "buy", offerId: offer.id, ltv, binding }}
          revision={revision}
          days={days}
          variant="primary"
          disabled={offer.blocker !== null || short > 0 || daysLeft < days}
        >
          Kaufen
        </ActionButton>
        {offer.blocker ? (
          <p className="muted small">{offer.blocker}</p>
        ) : short > 0 ? (
          <p className="muted small">Es fehlen {eur(short)} Eigenkapital. Mehr Beleihung oder Geld aus dem Depot holen.</p>
        ) : null}
      </aside>
    </div>
  );
}
