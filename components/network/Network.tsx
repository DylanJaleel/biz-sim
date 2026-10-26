import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { networkPage } from "@/lib/game/network-views";
import { EventItem, YearGrid } from "./EventParts";
import { FavorItem } from "./FavorParts";
import { NetworkRings } from "./NetworkRings";
import { NetworkTabs } from "./NetworkTabs";

// Das Netzwerk: die Karte der Kontakte mit ihren Beziehungen, offene Bitten,
// Einladungen und der Jahreskalender der Veranstaltungen. Auf kleinen
// Bildschirmen drei Reiter, auf dem Desktop alles auf einer Seite.

export async function Network({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { state, revision } = await currentGame();
  const view = networkPage(state);
  const wanted = typeof params.kontakt === "string" ? params.kontakt : undefined;
  const initial = view.contacts.find((c) => c.id === wanted)?.id ?? view.contacts.find((c) => c.favors.length > 0)?.id ?? view.contacts[0]?.id ?? "";
  const known = view.contacts.filter((c) => c.met).length;
  const invites = view.events.filter((e) => e.status === "invited").length;
  const status = Object.fromEntries([...view.events].reverse().map((e) => [e.defId, e.status]));
  const log = [
    { n: view.log.given, text: "Gefallen getan" },
    { n: view.log.declined, text: "abgesagt" },
    { n: view.log.lapsed, text: "verstrichen" },
    { n: view.log.events, text: view.log.events === 1 ? "Veranstaltung" : "Veranstaltungen" },
    { n: view.log.specialists, text: view.log.specialists === 1 ? "Spezialist beauftragt" : "Spezialisten beauftragt" },
  ].filter((x) => x.n > 0);

  return (
    <div className="page net-page">
      <header className="page__head net-head">
        <div>
          <p className="eyebrow">Netzwerk</p>
          <h1 className="page__title">Wen du kennst</h1>
          <p className="page__lead">Wärme zeigt, wie nah ihr euch seid. Wer Gefallen tut, bekommt stärkere Hilfe. Wer nur nimmt, hört irgendwann Nein.</p>
        </div>
        <ul className="net-stats" aria-label="Stand deines Netzwerks">
          <li>
            <b>
              {known} von {view.contacts.length}
            </b>{" "}
            kennst du
          </li>
          {log.map((l) => (
            <li key={l.text}>
              <b>{l.n}</b> {l.text}
            </li>
          ))}
        </ul>
      </header>

      <NetworkTabs
        panes={[
          { id: "karte", label: "Karte" },
          { id: "bitten", label: "Bitten", count: view.favors.length },
          { id: "termine", label: "Termine", count: invites },
        ]}
      >
        <div data-npane="karte">
          <NetworkRings key={initial} view={view} revision={revision} initial={initial} />
        </div>

        <div className="net-lower">
          <section className="net-col" data-npane="bitten" id="bitten" aria-labelledby="favors-title">
            <h2 id="favors-title" className="net-col__t">
              Bitten an dich {view.favors.length > 0 && <span className="net-col__n">{view.favors.length}</span>}
            </h2>
            {view.favors.length === 0 ? (
              <p className="net-empty">Gerade bittet dich niemand um etwas. Bitten kommen per Post, mit Frist bis Ende des nächsten Monats.</p>
            ) : (
              <ul className="nt-cards">
                {view.favors.map((f) => (
                  <FavorItem key={f.id} favor={f} revision={revision} />
                ))}
              </ul>
            )}
          </section>

          <section className="net-col" data-npane="termine" id="termine" aria-labelledby="events-title">
            <h2 id="events-title" className="net-col__t">
              Termine {invites > 0 && <span className="net-col__n">{invites}</span>}
            </h2>
            {view.events.length === 0 ? (
              <p className="net-empty">Gerade keine Einladung. Sie kommen einen Monat vorher in die Post.</p>
            ) : (
              <ul className="nt-cards">
                {view.events.map((e) => (
                  <EventItem key={e.id} event={e} revision={revision} />
                ))}
              </ul>
            )}
            <h3 className="net-col__sub">Das Jahr im Überblick</h3>
            <YearGrid year={view.year} invited={status} now={state.month} />
            <p className="muted small net-note">
              Alles zu Gegenseitigkeit, Warm Intros und Veranstaltungen steht im <Link href="/notizbuch">Notizbuch</Link>.
            </p>
          </section>
        </div>
      </NetworkTabs>
    </div>
  );
}
