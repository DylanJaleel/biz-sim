import Link from "next/link";
import type { ReleaseView } from "@/lib/changelog";

// Die Einträge eines oder mehrerer Releases: Chip „Neu“ oder „Verbessert“, Freischaltung, Kurztext,
// Weg im Menü und ein Knopf „Ansehen“. Das Popup (components/shell/NewsPopup.tsx) und die Seite /neu teilen sich diese Liste.

export function ReleaseList({ releases, headings, onNavigate }: { releases: ReleaseView[]; headings: boolean; onNavigate?: () => void }) {
  return (
    <div className="news">
      {releases.map((r) => (
        <section key={r.id} className="news__release" aria-labelledby={`news-${r.id}`}>
          {headings && (
            <h3 id={`news-${r.id}`} className="news__heading">
              <time dateTime={r.id}>{r.dateLabel}</time>
              <span>{r.title}</span>
            </h3>
          )}
          <ul className="news__list">
            {r.items.map((item) => (
              <li key={item.title} className="news__item">
                <div className="news__top">
                  <h4 className="news__title">{item.title}</h4>
                  <span className="news__chips">
                    <span className={item.isNew ? "tag tag--kind-deal" : "tag"}>{item.isNew ? "Neu" : "Verbessert"}</span>
                    {item.unlock && <span className={item.unlock.locked ? "tag news__locked" : "tag tag--go"}>{item.unlock.label}</span>}
                  </span>
                </div>
                <p className="news__text">{item.text}</p>
                <div className="news__foot">
                  <p className="news__where">
                    <span className="sr-only">So findest du es: </span>
                    {item.where}
                  </p>
                  {item.href && (
                    <Link href={item.href} className="btn btn--sm" onClick={onNavigate}>
                      Ansehen
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
