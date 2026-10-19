import Link from "next/link";
import { DAYS_PER_MONTH, monthLabel, monthName } from "@/lib/game/config";
import { careerOf } from "@/lib/game/career";
import { LESSONS } from "@/lib/game/lessons";
import { deskView } from "@/lib/game/views";
import { currentGame } from "@/lib/current-game";
import { eur } from "@/components/game/format";

// Dein Schreibtisch von oben. Alles, was zu tun ist, liegt als Gegenstand darauf.

export async function Office() {
  const { state } = await currentGame();
  const desk = deskView(state, LESSONS.length);
  const firstOpen = desk.openItems[0];
  const folderHref = firstOpen ? `/firma/${firstOpen.startupId}` : "/portfolio";
  const portfolioValue = desk.mandates.reduce((sum, m) => sum + m.value, 0);
  const career = careerOf(state);
  const next = career.steps.find((step) => !step.done);
  const warm = state.contacts.filter((c) => c.met && c.warmth >= 40).length;

  return (
    <div className="office">
      <section className="desk" aria-label="Schreibtisch">
        <div className="desk__surface">
          <Link href="/portfolio" className="desk__item laptop" aria-label={`Laptop: ${desk.mandates.length} Mandate`}>
            <span className="laptop__screen">
              <span className="laptop__head">Portfolio</span>
              {desk.mandates.length === 0 ? (
                <span className="laptop__empty">Noch kein Mandat</span>
              ) : (
                <>
                  {desk.mandates.slice(0, 3).map((m) => (
                    <span key={m.id} className="laptop__row">
                      <span>{m.name}</span>
                      <b>{eur(m.value)}</b>
                      {m.open && <i className="dot-urgent" aria-label="Vorlage offen" />}
                    </span>
                  ))}
                  <span className="laptop__total">
                    <span>Gesamt</span>
                    <b>{eur(portfolioValue)}</b>
                  </span>
                </>
              )}
            </span>
            <span className="laptop__keys" aria-hidden="true" />
          </Link>

          <Link href="/post" className="desk__item phone" aria-label={`Telefon: ${desk.unread} neue Nachrichten`}>
            <span className="phone__screen">
              <span className="phone__time">09:41</span>
              {desk.unread > 0 ? <span className="phone__note">{desk.unread} neu</span> : <span className="phone__idle">Post</span>}
            </span>
            {desk.unread > 0 && <span className="desk__badge">{desk.unread}</span>}
          </Link>

          <Link href={folderHref} className="desk__item folder" aria-label={`Vorlagen: ${desk.openItems.length} offen`}>
            <span className="folder__paper folder__paper--2" aria-hidden="true" />
            <span className="folder__paper" aria-hidden="true" />
            <span className="folder__front">
              <span className="folder__tab">Vorlagen</span>
              <span className="folder__title">{firstOpen ? firstOpen.title : "Keine offene Vorlage"}</span>
              {firstOpen && <span className="folder__sub">{firstOpen.startupName}</span>}
            </span>
            {desk.openItems.length > 0 && <span className="desk__badge desk__badge--urgent">{desk.openItems.length}</span>}
          </Link>

          <Link href="/kalender" className="desk__item calendar" aria-label={`Kalender: ${desk.daysLeft} Tage frei`}>
            <span className="calendar__head">{monthName(desk.month)}</span>
            <span className="calendar__num">{desk.daysLeft}</span>
            <span className="calendar__sub">von {DAYS_PER_MONTH} Tagen frei</span>
          </Link>

          <Link href="/notizbuch" className="desk__item notebook" aria-label={`Notizbuch: ${desk.lessons} von ${desk.lessonsTotal} Lernkarten`}>
            <span className="notebook__band" aria-hidden="true" />
            <span className="notebook__title">Notizbuch</span>
            <span className="notebook__sub">
              {desk.lessons} / {desk.lessonsTotal}
            </span>
          </Link>

          <Link href="/netzwerk" className="desk__item cards" aria-label={`Visitenkarten: ${warm} warme Kontakte`}>
            <span className="cards__card cards__card--2" aria-hidden="true" />
            <span className="cards__card">
              <b>Netzwerk</b>
              <span>{warm} warm</span>
            </span>
          </Link>

          <span className="desk__item cup" aria-hidden="true" />
          <span className="desk__item pen" aria-hidden="true" />
        </div>
      </section>

      <aside className="assistant" aria-labelledby="assistant-title">
        <p className="eyebrow">{monthLabel(desk.month)}</p>
        <h1 id="assistant-title" className="assistant__title">
          Guten Morgen.
        </h1>
        <p className="assistant__lead">Deine Assistenz hat sortiert, was heute ansteht.</p>
        <ul className="assistant__tasks">
          {desk.tasks.map((t, i) => (
            <li key={i}>
              <Link href={t.href} className={`task task--${t.tone}`}>
                <span className="task__dot" aria-hidden="true" />
                <span>{t.text}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="career" aria-label="Karriere">
          <p className="eyebrow">Karriere</p>
          <ol className="career__steps">
            {career.steps.map((step) => (
              <li key={step.title} className={step.done ? "is-done" : step === next ? "is-next" : step.later ? "is-later" : undefined}>
                <span className="career__dot" aria-hidden="true" />
                <span className="career__title">{step.title}</span>
                {step === next && <span className="career__req">{step.requirement}</span>}
              </li>
            ))}
          </ol>
        </div>
        <p className="assistant__foot">
          Jede Handlung kostet Tage. Wenn du fertig bist, schließe oben den Monat ab: Die Firmen arbeiten weiter, und der Monatsbericht kommt.
        </p>
      </aside>
    </div>
  );
}
