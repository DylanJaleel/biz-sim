import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { CORPORATE_FEE } from "@/lib/game/config";
import { openItems } from "@/lib/game/engine";
import { runwayMonths, valuation } from "@/lib/game/sim";
import { eur, pct, runwayText } from "@/components/game/format";
import { PHASE_LABEL } from "./labels";

export async function Portfolio() {
  const { state } = await currentGame();
  const active = state.startups.filter((s) => s.status === "active" && !s.corporate);
  const corporate = state.startups.filter((s) => s.status === "active" && s.corporate);
  const closed = state.startups.filter((s) => s.status === "dead" || s.status === "exited" || s.status === "sold");
  const offered = state.startups.filter((s) => s.status === "offered");
  const open = new Set(openItems(state).map((i) => i.startupId));

  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow">Portfolio</p>
        <h1 className="page__title">Deine Mandate</h1>
        <p className="page__lead">
          Jede Beteiligung ist ein Sitz im Beirat. Dein Anteil steigt im Wert, wenn die Firma wächst und gesund bleibt. Team, Fonds und Kredite verwaltest du in der <Link href="/holding">Holding</Link>.
        </p>
      </header>

      {active.length === 0 && (
        <div className="panel">
          <p className="panel__title">Noch keine Beteiligung</p>
          <p>
            {offered.length > 0 ? "In deiner Post liegen Angebote. Prüfe sie und steig ein." : "Gerade liegt kein Angebot vor. Schließe den Monat ab, dann melden sich neue Gründungen."}
          </p>
          {offered.length > 0 && (
            <Link className="btn btn--primary" href="/post">
              Zur Post
            </Link>
          )}
        </div>
      )}

      <div className="grid-cards">
        {active.map((s) => {
          const value = valuation(s.metrics);
          return (
            <Link key={s.id} href={`/firma/${s.id}`} className="company-card">
              <span className="company-card__head">
                <span>
                  <b className="company-card__name">{s.name}</b>
                  <span className="company-card__tag">{s.tagline}</span>
                </span>
                <span className="pill">{s.flags.includes("mittelstand") ? "Nachfolge" : PHASE_LABEL[s.phase]}</span>
              </span>
              <span className="kpis kpis--compact">
                <span>
                  <small>Umsatz/Monat</small>
                  <b>{eur(s.metrics.revenue)}</b>
                </span>
                <span>
                  <small>Wachstum</small>
                  <b>{pct(s.metrics.growth)}</b>
                </span>
                <span>
                  <small>Runway</small>
                  <b>{runwayText(runwayMonths(s.metrics))}</b>
                </span>
                <span>
                  <small>Dein Anteil</small>
                  <b>
                    {s.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % · {eur((s.stake / 100) * value)}
                  </b>
                </span>
              </span>
              {open.has(s.id) && <span className="company-card__alert">Vorlage wartet auf den Beirat</span>}
            </Link>
          );
        })}
      </div>

      {corporate.map((s) => (
        <section key={s.id} className="page__section">
          <h2 className="section-title">Aufsichtsrat</h2>
          <Link href={`/firma/${s.id}`} className="company-card">
            <span className="company-card__head">
              <span>
                <b className="company-card__name">{s.name}</b>
                <span className="company-card__tag">{s.tagline}</span>
              </span>
              <span className="pill">Mandat</span>
            </span>
            <span className="kpis kpis--compact">
              <span>
                <small>Umsatz/Monat</small>
                <b>{eur(s.metrics.revenue)}</b>
              </span>
              <span>
                <small>Wachstum</small>
                <b>{pct(s.metrics.growth)}</b>
              </span>
              <span>
                <small>Firmenwert</small>
                <b>{eur(valuation(s.metrics))}</b>
              </span>
              <span>
                <small>Vergütung</small>
                <b>{eur(CORPORATE_FEE)} / Monat</b>
              </span>
            </span>
            {open.has(s.id) && <span className="company-card__alert">Der Aufsichtsrat tagt diesen Monat</span>}
          </Link>
        </section>
      ))}

      {closed.length > 0 && (
        <section className="page__section">
          <h2 className="section-title">Abgeschlossen</h2>
          <ul className="list">
            {closed.map((s) => (
              <li key={s.id} className="list__row">
                <Link href={`/firma/${s.id}`}>{s.name}</Link>
                <span className={`tag tag--${s.status === "exited" ? "go" : "no"}`}>{s.status === "exited" ? "verkauft" : s.status === "sold" ? "Anteil verkauft" : "insolvent"}</span>
                {s.exitValue !== undefined && <span className="muted">Verkauf für {eur(s.exitValue)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
