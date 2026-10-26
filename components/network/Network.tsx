import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { networkPage } from "@/lib/game/network-views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";
import { NetworkRings } from "./NetworkRings";

// Das Netzwerk: die Karte der Kontakte mit ihren Beziehungen, offene Bitten,
// Einladungen und der Jahreskalender der Veranstaltungen.

export async function Network({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { state, revision } = await currentGame();
  const view = networkPage(state);
  const wanted = typeof params.kontakt === "string" ? params.kontakt : undefined;
  const initial = view.contacts.find((c) => c.id === wanted)?.id ?? view.contacts.find((c) => c.favors.length > 0)?.id ?? view.contacts[0]?.id ?? "";
  const known = view.contacts.filter((c) => c.met).length;
  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow">Netzwerk</p>
        <h1 className="page__title">Wen du kennst</h1>
        <p className="page__lead">
          Drei Kreise: persönliche Kontakte, Branchenprofis, Entscheider. Wärme zeigt, wie nah ihr euch seid; das Vertrauenskonto, wer wem zuletzt geholfen hat. Wer Gefallen tut,
          bekommt stärkere Hilfe. Wer nur nimmt, hört irgendwann Nein.
        </p>
        <p className="muted small">
          {known} von {view.contacts.length} kennst du · Gefallen getan {view.log.given} · abgesagt {view.log.declined} · verstrichen {view.log.lapsed} · Veranstaltungen{" "}
          {view.log.events} · Spezialisten beauftragt {view.log.specialists}
        </p>
      </header>

      <NetworkRings key={initial} view={view} revision={revision} initial={initial} />

      <section className="page__section" id="bitten" aria-labelledby="favors-title">
        <Disclosure
          title="Offene Bitten"
          as="h2"
          headingId="favors-title"
          headingClass="section-title"
          hint={view.favors.length > 0 ? `${view.favors.length}` : undefined}
          defaultOpen
        >
          {view.favors.length === 0 ? (
            <p className="muted">Gerade bittet dich niemand um etwas. Bitten kommen per Post, mit Frist bis Ende des nächsten Monats.</p>
          ) : (
            <ul className="net-favors">
              {view.favors.map((f) => (
                <li key={f.id} className={`panel net-favor${f.urgent ? " is-urgent" : ""}`}>
                  <p className="eyebrow">
                    {f.contactName} · bis Ende {f.expires}
                  </p>
                  <h3 className="item__h">{f.subject}</h3>
                  <p>{f.body}</p>
                  <p className="muted small">{f.cost}.</p>
                  <div className="deal__actions">
                    <ActionButton
                      action={{ type: "favor", favorId: f.id, accept: true }}
                      revision={revision}
                      days={f.days > 0 ? f.days : undefined}
                      variant="primary"
                      disabled={Boolean(f.blocker)}
                    >
                      Zusagen
                    </ActionButton>
                    <ActionButton action={{ type: "favor", favorId: f.id, accept: false }} revision={revision} variant="ghost">
                      Absagen
                    </ActionButton>
                    {f.blocker && <small className="muted">{f.blocker}</small>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Disclosure>
      </section>

      <section className="page__section" id="termine" aria-labelledby="events-title">
        <Disclosure title="Veranstaltungen" as="h2" headingId="events-title" headingClass="section-title" hint={view.events.length > 0 ? `${view.events.length}` : undefined}>
          {view.events.length === 0 ? (
            <p className="muted">Gerade keine Einladung. Sie kommen einen Monat vorher in die Post.</p>
          ) : (
            <ul className="net-events">
              {view.events.map((e) => (
                <li key={e.id} className="panel net-event">
                  <p className="eyebrow">
                    {e.month} · {e.city} · {e.days === 1 ? "1 Tag" : `${e.days} Tage`} · {e.travel} · {eur(e.money)}
                  </p>
                  <h3 className="item__h">{e.name}</h3>
                  <p>{e.text}</p>
                  <p className="muted small">
                    Wer kommt: {e.guests.map((g) => `${g.name}${g.met ? "" : " (neu)"}`).join(", ")}.{e.deal ? " Manchmal ergibt sich ein Deal." : ""}
                    {e.mandate ? " Manchmal ein Mandat." : ""}
                  </p>
                  {e.status === "invited" ? (
                    <div className="deal__actions">
                      <ActionButton action={{ type: "event", eventId: e.id, move: "accept" }} revision={revision} days={e.thisMonth ? e.days : undefined} variant="primary">
                        {e.thisMonth ? "Hingehen" : "Zusagen"}
                      </ActionButton>
                      {e.talk?.possible && (
                        <ActionButton action={{ type: "event", eventId: e.id, move: "accept", talk: true }} revision={revision} days={e.thisMonth ? e.days + 1 : undefined}>
                          {`Mit Vortrag (+${e.talk.reputation} Ruf)`}
                        </ActionButton>
                      )}
                      <ActionButton action={{ type: "event", eventId: e.id, move: "decline" }} revision={revision} variant="ghost">
                        Absagen
                      </ActionButton>
                      {e.talk && !e.talk.possible && <small className="muted">Vortrag ab {e.talk.from} Ruf.</small>}
                    </div>
                  ) : (
                    <p className={`notice${e.status === "declined" ? "" : " notice--good"}`}>
                      {e.status === "attended" ? "Du warst dort." : e.status === "accepted" ? "Zugesagt. Der Termin kommt zu Monatsbeginn in deinen Kalender." : "Abgesagt."}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Disclosure>
      </section>

      <section className="page__section" aria-labelledby="year-title">
        <Disclosure title="Jahreskalender" as="h2" headingId="year-title" headingClass="section-title">
          <ul className="list net-year">
            {view.year.map((y) => (
              <li key={y.id} className={`list__row${y.open ? "" : " is-locked"}`}>
                <b>{y.name}</b>
                <span className="muted">
                  {y.month} · {y.city} · {y.open ? "du wirst eingeladen" : `ab ${y.minReputation} Ruf`}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Alles zu Gegenseitigkeit, Warm Intros und Veranstaltungen steht im <Link href="/notizbuch">Notizbuch</Link>.
          </p>
        </Disclosure>
      </section>
    </div>
  );
}
