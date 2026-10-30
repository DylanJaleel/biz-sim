import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { estatePage, type RatePoint } from "@/lib/game/wealth-views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur, pct } from "@/components/game/format";
import { BuyPanel } from "./BuyPanel";
import { WealthTabs } from "./WealthTabs";

// Immobilien: Marktplatz, Bestand, Zinsen. Kaufen mit Hypothek, vermieten,
// sanieren, verkaufen. Die Zinsbindung entscheidet, ob eine Zinswende wehtut.

const rate = (r: number) => pct(r, 2);

function RateChart({ points }: { points: RatePoint[] }) {
  if (points.length < 2) return null;
  const w = 640;
  const h = 180;
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const min = 0.025;
  const max = 0.065;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r);
  const y = (r: number) => pad.t + (1 - (r - min) / (max - min)) * (h - pad.t - pad.b);
  const now = points.findIndex((p) => p.future) - 1;
  const past = points.filter((p) => !p.future);
  const line = (ps: RatePoint[], offset: number) => ps.map((p, i) => `${i === 0 ? "M" : "L"}${x(i + offset).toFixed(1)},${y(p.rate).toFixed(1)}`).join(" ");
  const futureFrom = Math.max(0, past.length - 1);
  const labels = points.filter((_, i) => i === 0 || i === points.length - 1 || (now > 0 && i === now));
  return (
    <svg className="wl-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Verlauf des Marktzinses für zehn Jahre Zinsbindung">
      {[0.03, 0.04, 0.05, 0.06].map((r) => (
        <g key={r}>
          <line className="wl-chart-grid" x1={pad.l} x2={w - pad.r} y1={y(r)} y2={y(r)} />
          <text x={4} y={y(r) + 4}>
            {Math.round(r * 100)} %
          </text>
        </g>
      ))}
      <path className="wl-chart-line" d={line(past, 0)} />
      {now >= 0 && <path className="wl-chart-future" d={line(points.slice(futureFrom), futureFrom)} />}
      {now >= 0 && <line className="wl-chart-now" x1={x(now)} x2={x(now)} y1={pad.t} y2={h - pad.b} />}
      {labels.map((p) => (
        <text key={p.month} x={Math.min(w - 90, Math.max(pad.l, x(points.indexOf(p)) - 40))} y={h - 6}>
          {p.label.replace(" · ", " ")}
        </text>
      ))}
    </svg>
  );
}

export async function Estate() {
  const { state, revision } = await currentGame();
  const v = estatePage(state);
  const t = v.totals;
  const tier = v.magnate.tier >= 0 ? v.magnate.tiers[v.magnate.tier]! : null;
  const nextTier = v.magnate.tiers[v.magnate.tier + 1];
  return (
    <div className="page estate">
      <header className="page__head">
        <p className="eyebrow">Anlageklasse</p>
        <h1 className="page__title">Immobilien</h1>
        <p className="page__lead">
          Kaufen mit Hypothek, vermieten, sanieren. Die Hypothek ist ein Kredit, für den das Haus haftet. Die Zinsbindung (wie lange der Zins fest ist) entscheidet, ob aus dem
          Cashflow nach einer Zinswende ein Verlust wird.
        </p>
      </header>

      <div className="wl-strip">
        <span className="wl-note">
          Marktzins 10 Jahre <b>{rate(v.rate.now)}</b> · 5 Jahre {rate(v.rate.byBinding[5])} · 15 Jahre {rate(v.rate.byBinding[15])}
        </span>
        {v.rate.turn && (
          <span className="wl-note-warn">
            {v.rate.turn.up ? "Zinswende angekündigt" : "Zinssenkung angekündigt"}: ab {v.rate.turn.month}, danach eher {rate(v.rate.turn.target)}.
          </span>
        )}
        {v.rate.bank.active ? (
          <span className="wl-note-good">{v.rate.bank.name} gibt dir 0,2 Punkte Nachlass.</span>
        ) : (
          <span className="wl-note">Mit {v.rate.bank.name} ab Wärme 50 wird der Zins 0,2 Punkte günstiger.</span>
        )}
        {v.penthouse.owned && <span className="wl-note-good">Du arbeitest aus dem Penthouse: {eur(v.penthouse.rentSaved)} Büromiete gespart.</span>}
      </div>

      <div className="kpis">
        <div>
          <small>Immobilienwert</small>
          <b>{eur(t.value)}</b>
          <span>{t.count === 1 ? "1 Objekt" : `${t.count} Objekte`}</span>
        </div>
        <div>
          <small>Darlehen</small>
          <b>{eur(t.debt)}</b>
          <span>Beleihung {t.value > 0 ? pct(t.debt / t.value, 0) : "–"}</span>
        </div>
        <div>
          <small>Eigenkapital im Bestand</small>
          <b>{eur(t.equity)}</b>
          <span>Wert minus Darlehen</span>
        </div>
        <div>
          <small>Miete im Monat</small>
          <b>{eur(t.rentMonth)}</b>
          <span>nach Leerstand</span>
        </div>
        <div>
          <small>Cashflow im Monat</small>
          <b className={t.cashflowMonth < 0 ? "neg" : undefined}>{eur(t.cashflowMonth)}</b>
          <span>nach Instandhaltung und Rate</span>
        </div>
      </div>

      {!v.unlocked ? (
        <section className="panel">
          <h2 className="panel__title">Noch kein Termin bei der Bank</h2>
          <p className="muted">{v.unlockText} Bis dahin: Beteiligungen, Aufträge, Börse.</p>
          <Link href="/" className="btn btn--sm">
            Zum Büro
          </Link>
        </section>
      ) : (
        <WealthTabs
          storageKey="boardroom:estate-tab"
          tabs={[
            { id: "market", label: "Marktplatz", count: v.offers.length },
            { id: "owned", label: "Bestand", count: v.owned.length },
            { id: "rates", label: "Zinsen und Ziele" },
          ]}
        >
          <section aria-label="Marktplatz">
            {v.offers.length === 0 ? (
              <p className="muted">Gerade ist nichts auf dem Markt. Neue Angebote kommen zum Quartalsbeginn.</p>
            ) : (
              <BuyPanel offers={v.offers} cash={v.cash} daysLeft={v.daysLeft} days={v.days.buy} revision={revision} />
            )}
          </section>

          <section aria-label="Bestand">
            {v.owned.length === 0 ? (
              <p className="muted">Noch kein Objekt. Im Marktplatz findest du jedes Quartal neue Angebote.</p>
            ) : (
              <div className="wl-table">
                {v.owned.map((p) => (
                  <article key={p.id} className="wl-row">
                    <div className="wl-row-img" style={{ backgroundImage: `url(/boardroom/${p.image}.webp)` }} aria-hidden="true" />
                    <div className="wl-cell">
                      <b>{p.name}</b>
                      <small>
                        {p.label} · {p.cityName} · seit {p.bought}
                      </small>
                      <small>
                        Zustand {p.conditionLabel}
                        {p.kind !== "penthouse" && ` · ${pct(1 - p.occupancy, 0)} Leerstand`}
                        {p.renovating && ` · Sanierung bis ${p.renovating}`}
                      </small>
                    </div>
                    <div className="wl-cell">
                      <small>Marktwert</small>
                      <b>{eur(p.value)}</b>
                      <small>Kauf {eur(p.price)}</small>
                    </div>
                    <div className="wl-cell">
                      <small>Darlehen</small>
                      <b>{p.debt > 0 ? eur(p.debt) : "keins"}</b>
                      {p.ltv !== null && (
                        <small className={p.ltv > p.maxLtv ? "neg" : undefined}>
                          Beleihung {pct(p.ltv, 0)} (Bank: bis {pct(p.maxLtv, 0)})
                        </small>
                      )}
                    </div>
                    <div className="wl-cell">
                      <small>Zins fest</small>
                      <b>{p.rate !== null ? rate(p.rate) : "–"}</b>
                      {p.until && (
                        <small className={p.monthsLeft !== null && p.monthsLeft <= 6 ? "neg" : undefined}>
                          bis {p.until}
                          {p.rateToday !== null && ` · heute ${rate(p.rateToday)}`}
                        </small>
                      )}
                    </div>
                    <div className="wl-cell">
                      <small>Cashflow im Monat</small>
                      <b className={p.cashflow < 0 ? "neg" : "pos"}>{eur(p.cashflow)}</b>
                      <small>
                        {p.kind === "penthouse" ? "Wohnsitz und Büro" : `Miete ${eur(p.rentMonth)}`} · Rate {eur(p.payment)}
                      </small>
                    </div>
                    <div className="wl-row-actions">
                      <ActionButton
                        action={{ type: "estate", move: "renovate", propertyId: p.id }}
                        revision={revision}
                        size="sm"
                        days={v.days.renovate}
                        disabled={p.condition >= 5 || p.renovating !== null || v.cash < p.renovationCost}
                      >
                        {`Sanieren (${eur(p.renovationCost)})`}
                      </ActionButton>
                      <ActionButton
                        action={{ type: "estate", move: "sell", propertyId: p.id }}
                        revision={revision}
                        size="sm"
                        variant="ghost"
                        days={v.days.sell}
                        disabled={p.renovating !== null}
                      >
                        {`Verkaufen: ${eur(p.sale.proceeds)} für dich`}
                      </ActionButton>
                      <span className="muted small">
                        Makler {eur(p.sale.costs)}
                        {p.sale.fee > 0 && `, Vorfälligkeit ${eur(p.sale.fee)}`}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Zinsen und Ziele" className="wl-two">
            <div className="panel">
              <h2 className="panel__title">Marktzins für zehn Jahre fest</h2>
              <p className="muted small">
                Etwa alle fünfeinhalb Jahre dreht der Zins, in vier Schritten über ein Jahr. Die Wirtschaftsnachrichten kündigen jede Wende neun Monate vorher an. Gestrichelt: was
                die Notenbank angekündigt hat.
              </p>
              <RateChart points={v.path} />
              <p className="muted small">
                Läuft die Zinsbindung aus, gilt der Marktzins des Monats plus Aufschlag für Objektart und Beleihung. Ist der Wert gefallen, verlangt die Bank vor der
                Anschlussfinanzierung eine Sondertilgung bis zur erlaubten Beleihung.
              </p>
            </div>
            <div className="panel">
              <p className="eyebrow">Nebenziel</p>
              <h2 className="panel__title">Immobilien-Magnat{tier ? ` · ${tier.name}` : ""}</h2>
              <p className="muted small">Zählt den Marktwert deiner Anlageobjekte, ohne Penthouse.</p>
              <ul className="wl-ladder">
                {v.magnate.tiers.map((x, i) => (
                  <li key={x.name} data-state={i <= v.magnate.tier ? "done" : i === v.magnate.tier + 1 ? "next" : undefined}>
                    <span className="wl-mark">{i <= v.magnate.tier ? "✓" : i + 1}</span>
                    <span>
                      <b>{x.name}</b>
                      <small>ab {eur(x.value)} Marktwert</small>
                    </span>
                  </li>
                ))}
              </ul>
              {nextTier && (
                <>
                  <span className="wl-bar" style={{ marginTop: 12 }}>
                    <i style={{ width: `${Math.min(100, (v.magnate.value / nextTier.value) * 100)}%` }} />
                  </span>
                  <p className="muted small">
                    Heute {eur(v.magnate.value)} in {t.units} Einheiten. Bis {nextTier.name} fehlen {eur(Math.max(0, nextTier.value - v.magnate.value))}.
                  </p>
                </>
              )}
              <p className="muted small">
                Bisher {v.record.bought} gekauft, {v.record.sold} verkauft, {v.record.refinanced} Anschlussfinanzierungen
                {v.record.topUps > 0 ? `, ${v.record.topUps}× nachgeschossen` : ""}.
              </p>
            </div>
          </section>
        </WealthTabs>
      )}
    </div>
  );
}
