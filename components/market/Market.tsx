import { currentGame } from "@/lib/current-game";
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
    </div>
  );
}
