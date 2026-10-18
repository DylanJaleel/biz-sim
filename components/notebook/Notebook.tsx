import { currentGame } from "@/lib/current-game";
import { ACTION_DAYS } from "@/lib/game/config";
import { CURRICULUM, lessonOf } from "@/lib/game/lessons";
import { ActionButton } from "@/components/game/ActionButton";

export async function Notebook() {
  const { state, revision } = await currentGame();
  const known = state.lessons.map(lessonOf);
  const missing = CURRICULUM.length - known.length;

  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow">Notizbuch</p>
        <h1 className="page__title">Was du gelernt hast</h1>
        <p className="page__lead">
          Jede Entscheidung im Beirat schaltet einen Begriff frei. Mit einer Weiterbildung lernst du den nächsten, bevor er dir in einer Vorlage begegnet.
        </p>
        {missing > 0 && (
          <ActionButton action={{ type: "learn" }} revision={revision} days={ACTION_DAYS.learn}>
            Weiterbildung besuchen
          </ActionButton>
        )}
      </header>

      {known.length === 0 && <p className="muted">Noch leer. Prüfe ein Angebot oder entscheide im Beirat, dann füllt es sich.</p>}

      <div className="lessons">
        {known.map((l) => (
          <article key={l.id} className="lesson">
            <h2 className="lesson__title">{l.title}</h2>
            <p>{l.summary}</p>
            {l.rule && <p className="lesson__rule">{l.rule}</p>}
            <p className="lesson__example">
              <b>Beispiel:</b> {l.example}
            </p>
            <p className="lesson__ingame">
              <b>Im Spiel:</b> {l.inGame}
            </p>
          </article>
        ))}
        {Array.from({ length: missing }, (_, i) => (
          <article key={`locked-${i}`} className="lesson lesson--locked" aria-label="Noch nicht freigeschaltet">
            <span aria-hidden="true">?</span>
          </article>
        ))}
      </div>
    </div>
  );
}
