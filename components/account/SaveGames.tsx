import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { KEEP, listSaves, summarize, type SaveKind } from "@/lib/repository/saves";
import { eur } from "@/components/game/format";
import { CreateSave, ImportSave, SaveButtons } from "./SaveControls";

// Der Spielstand zum Ansehen und Sichern: was gerade gespeichert ist, die
// automatischen und eigenen Sicherungen, und eine Datei zum Mitnehmen.

const KIND_LABEL: Record<SaveKind, string> = { auto: "Automatisch", manual: "Eigene", backup: "Vorsorglich" };

const when = (d: Date) => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" }).format(d);

export async function SaveGames({ userId, email }: { userId: string; email: string }) {
  const [{ state, revision, updatedAt }, saves] = await Promise.all([currentGame(), listSaves(userId)]);
  const now = summarize(state);
  return (
    <>
      <section className="panel saves__current" id="spielstand" aria-labelledby="current-title">
        <p className="eyebrow">Dein Spielstand</p>
        <h2 id="current-title" className="panel__title">
          {now.monthLabel} · {now.career}
        </h2>
        <div className="kpis kpis--compact">
          <span>
            <small>Vermögen</small>
            <b>{eur(now.worth)}</b>
          </span>
          <span>
            <small>Konto</small>
            <b>{eur(now.cash)}</b>
          </span>
          <span>
            <small>Ruf</small>
            <b>{now.reputation}</b>
          </span>
          <span>
            <small>Mandate</small>
            <b>{now.mandates}</b>
          </span>
        </div>
        <p className="saves__status">
          <span className="saves__dot" aria-hidden="true" /> Gespeichert auf dem Server, zuletzt am {when(updatedAt)} (Zug {revision}).
        </p>
        <p className="muted small">
          Jeder Zug wird sofort gespeichert. Auf dem Handy oder einem anderen Rechner meldest du dich mit <b>{email}</b> an und spielst genau hier weiter. Die Anmeldung hält 180 Tage.
        </p>
      </section>

      <section className="panel" aria-labelledby="saves-title">
        <p className="eyebrow">Sicherungen</p>
        <h2 id="saves-title" className="panel__title">
          Zurückholen, was war
        </h2>
        <p className="muted small">
          Nach jedem Monatsabschluss entsteht eine Sicherung (die letzten {KEEP.auto} bleiben), vor jedem Laden und vor einem Neustart ebenfalls. Dazu bis zu {KEEP.manual} eigene.
        </p>
        <CreateSave suggestion={`Mein Stand, ${monthLabel(state.month)}`} />
        {saves.length === 0 ? (
          <p className="muted">Noch keine Sicherung. Die erste entsteht beim nächsten Monatsabschluss.</p>
        ) : (
          <ul className="saves">
            {saves.map((s) => (
              <li key={s.id} className="saves__row">
                <span className={`tag saves__kind saves__kind--${s.kind}`}>{KIND_LABEL[s.kind]}</span>
                <span className="saves__name-col">
                  <b>{s.name}</b>
                  <small>
                    {when(s.createdAt)} · {s.summary.monthLabel} · {eur(s.summary.worth)} · Ruf {s.summary.reputation} · {s.summary.career}
                  </small>
                </span>
                <SaveButtons id={s.id} name={s.name} deletable={s.kind === "manual"} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="file-title">
        <p className="eyebrow">Datei</p>
        <h2 id="file-title" className="panel__title">
          Spielstand mitnehmen
        </h2>
        <p className="muted small">
          Lade deinen Stand als Datei herunter und bewahre sie auf, wo du willst. Die Datei trägt eine Prüfsumme: Zurückladen lässt sich nur, was hier gespeichert und nicht verändert wurde.
        </p>
        <div className="panel__actions">
          <a className="btn" href="/api/spielstand" download>
            Als Datei herunterladen
          </a>
          <ImportSave />
        </div>
      </section>
    </>
  );
}
