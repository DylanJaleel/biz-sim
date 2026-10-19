import { currentGame } from "@/lib/current-game";
import { networkView } from "@/lib/game/views";
import { NetworkRings } from "./NetworkRings";

export async function Network() {
  const { state, revision } = await currentGame();
  const view = networkView(state);
  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow">Netzwerk</p>
        <h1 className="page__title">Wen du kennst</h1>
        <p className="page__lead">
          Drei Kreise: persönliche Kontakte, Branchenprofis, Entscheider. Ein Treffen wärmt die Beziehung, ein Gefallen kühlt sie ab. Die äußeren Kreise öffnen sich mit deinem Ruf.
        </p>
      </header>
      <NetworkRings view={view} revision={revision} />
    </div>
  );
}
