import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { ASSETS, holdingsValue, REGIME_LABEL } from "@/lib/game/market";
import { eur } from "@/components/game/format";
import { AssetCard } from "./AssetCard";

export async function Market() {
  const { state, revision } = await currentGame();
  const m = state.market;
  const depot = holdingsValue(m);
  const invested = Object.values(m.invested).reduce((a, b) => a + b, 0);
  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow">Börse</p>
        <h1 className="page__title">{m.headline}</h1>
        <p className="page__lead">
          Startup-Anteile kannst du kaum verkaufen, Wertpapiere an jedem Tag. Hier parkst du, was du gerade nicht brauchst, und holst es zurück, wenn eine Runde kommt. Kaufen und Verkaufen kostet keine Tage, aber 0,1 % Gebühr.
        </p>
        <div className="market__summary">
          <span className={`pill pill--${m.regime}`}>{REGIME_LABEL[m.regime]}</span>
          <span>
            Depot <b>{eur(depot)}</b>
          </span>
          <span>
            Gewinn <b className={depot - invested >= 0 ? "pos" : "neg"}>{eur(depot - invested)}</b>
          </span>
          <span>
            Konto <b>{eur(state.cash)}</b>
          </span>
        </div>
      </header>
      <div className="assets">
        {ASSETS.map((a) => (
          <AssetCard
            key={a.id}
            asset={a}
            price={m.prices[a.id]}
            history={m.history.map((h) => h.prices[a.id])}
            units={m.holdings[a.id]}
            invested={m.invested[a.id]}
            cash={state.cash}
            revision={revision}
          />
        ))}
      </div>
      {state.news.length > 0 && (
        <section className="page__section news" aria-labelledby="news-title">
          <h2 id="news-title" className="section-title">
            Wirtschaftsblatt
          </h2>
          <ul className="news__list">
            {state.news.slice(0, 6).map((n, i) => (
              <li key={`${n.month}-${i}`} className="news__item">
                <span className="decision__month">{monthLabel(n.month)}</span>
                <b>{n.title}</b>
                <span className="muted">
                  {n.text} Betrifft: {n.startupIds.map((id) => state.startups.find((s) => s.id === id)?.name ?? id).join(", ")}.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
