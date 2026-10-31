import { RELEASES, releaseViews } from "@/lib/changelog";
import { currentGame } from "@/lib/current-game";
import { ReleaseList } from "./ReleaseList";

// Alle Updates, neueste zuerst. Die Freischaltungs-Chips richten sich nach dem eigenen Spielstand.
export async function NewsPage() {
  const { state } = await currentGame();
  const releases = releaseViews(RELEASES, state);
  return (
    <div className="page page--narrow">
      <header className="page__head">
        <p className="eyebrow">Wissen</p>
        <h1 className="page__title">Neuigkeiten</h1>
        <p className="page__lead">Was bei jedem Update dazugekommen ist, wo du es findest und ab wann es offen ist. Gedimmte Hinweise zeigen, was dir noch fehlt.</p>
      </header>
      <ReleaseList releases={releases} headings />
    </div>
  );
}
