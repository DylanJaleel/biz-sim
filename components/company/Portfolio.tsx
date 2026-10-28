import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { cockpitRows } from "@/lib/game/cockpit";
import { eur } from "@/components/game/format";
import { PortfolioCockpit } from "./PortfolioCockpit";

export async function Portfolio() {
  const { state } = await currentGame();
  const rows = cockpitRows(state);
  const closed = state.startups.filter((s) => s.status === "dead" || s.status === "exited" || s.status === "sold");
  const offered = state.startups.filter((s) => s.status === "offered");

  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow">Portfolio</p>
        <h1 className="page__title">Deine Mandate</h1>
        <p className="page__lead">
          Jede Beteiligung ist ein Sitz im Beirat. Die Ampel zeigt dir auf einen Blick, wo es brennt. Dein Anteil steigt im Wert, wenn die Firma wächst und gesund bleibt. Team,
          Fonds und Kredite verwaltest du in der <Link href="/holding">Holding</Link>.
        </p>
      </header>

      {rows.length === 0 && (
        <div className="panel">
          <p className="panel__title">Noch keine Beteiligung</p>
          <p>
            {offered.length > 0
              ? "In deiner Post liegen Angebote. Prüfe sie und steig ein."
              : "Gerade liegt kein Angebot vor. Schließe den Monat ab, dann melden sich neue Gründungen."}
          </p>
          {offered.length > 0 && (
            <Link className="btn btn--primary" href="/post">
              Zur Post
            </Link>
          )}
        </div>
      )}

      {rows.length > 0 && <PortfolioCockpit rows={rows} />}

      {closed.length > 0 && (
        <section className="page__section">
          <h2 className="section-title">Abgeschlossen</h2>
          <ul className="list">
            {closed.map((s) => (
              <li key={s.id} className="list__row">
                <Link href={`/firma/${s.id}`}>{s.name}</Link>
                <span className={`tag tag--${s.status === "exited" ? "go" : "no"}`}>
                  {s.status === "exited" ? "verkauft" : s.status === "sold" ? "Anteil verkauft" : "insolvent"}
                </span>
                {s.exitValue !== undefined && <span className="muted">Verkauf für {eur(s.exitValue)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
