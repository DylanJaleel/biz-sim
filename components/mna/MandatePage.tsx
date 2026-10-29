import Link from "next/link";
import { notFound } from "next/navigation";
import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { mandateView } from "@/lib/game/mna-views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";
import { MandateForm } from "./MandateForm";
import { HelpersPanel } from "@/components/network/HelpersPanel";
import { specialistsFor } from "@/lib/game/network-views";
import { bigMandateView } from "@/lib/game/rivals-views";
import { TeaserForm } from "./TeaserForm";
import { BigRounds } from "./BigRounds";

// Ein M&A-Mandat: Du verkaufst eine Firma für ihre Eigentümer oder kaufst
// eine für einen Mandanten. Wenige Entscheidungen, echtes Risiko.

const STEPS = ["Auftrag", "Vorbereitung", "Käufer ansprechen", "Angebote", "Unterschrift", "Abschluss"];
const STEP_OF = { offered: 0, prep: 1, marketing: 2, bids: 3, signing: 4, closed: 5, failed: 5, declined: 0, expired: 0 } as const;
const x = (n: number) => `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×`;

export async function MandatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state, revision } = await currentGame();
  const view = mandateView(state, id);
  if (!view) notFound();
  const sell = view.side === "sell";
  const step = STEP_OF[view.status];
  const best = [...view.bids].sort((a, b) => b.ev - a.ev)[0];
  const big = bigMandateView(state, id);
  return (
    <div className="page mna mna--mandate">
      <header className="page__head">
        <nav className="crumbs" aria-label="Pfad">
          <Link href="/">Büro</Link>
          <span aria-hidden="true">/</span>
          <span>M&A-Mandat</span>
        </nav>
        <p className="eyebrow">
          {big ? "Großmandat · Carve-out" : "M&A-Mandat"} · {sell ? "Verkauf (Sell-side)" : "Kauf (Buy-side)"} · {view.sector}
        </p>
        <h1 className="page__title">{view.company}</h1>
        <p className="page__lead">{view.text}</p>
        <ol className="mna-steps" aria-label="Ablauf">
          {STEPS.map((label, i) => (
            <li key={label} className={i < step ? "is-done" : i === step ? "is-now" : undefined}>
              {label}
            </li>
          ))}
        </ol>
      </header>

      <section className="kpis" aria-label="Eckdaten">
        <div>
          <small>EBITDA im Jahr</small>
          <b>{eur(view.ebitda)}</b>
          <span>Gewinn vor Zinsen, Steuern, Abschreibungen</span>
        </div>
        <div>
          <small>{big ? "Erwartung des Konzerns" : sell ? "Wunschpreis der Familie" : "Obergrenze des Käufers"}</small>
          <b>{eur(view.wish)}</b>
          <span>{x(view.wish / view.ebitda)} EBITDA</span>
        </div>
        <div>
          <small>Faustregel für diese Größe</small>
          <b>{x(view.rule)}</b>
          <span>{view.comps ? `Vergleichbare Deals: ${x(view.comps[0])} bis ${x(view.comps[1])}` : "Ohne Vergleichsanalyse nur grob"}</span>
        </div>
        <div>
          <small>Honorar</small>
          <b>{eur(view.retainer)}</b>
          <span>fest, plus Erfolgshonorar (etwa {eur(view.feeAtWish)})</span>
        </div>
      </section>

      {view.status === "offered" && (
        <section className="panel" aria-labelledby="mandate-offer">
          <h2 id="mandate-offer" className="panel__title">
            Mandat annehmen?
          </h2>
          <p>
            {sell
              ? "Du bereitest den Verkauf vor, sprichst Käufer an und verhandelst. Der feste Teil des Honorars (Retainer) kommt am Monatsende, das Erfolgshonorar nur, wenn der Verkauf klappt."
              : "Du bewertest die Zielfirma, prüfst sie und verhandelst für den Käufer. Retainer am Monatsende, Erfolgshonorar beim Abschluss."}{" "}
            {big
              ? "Ein Großmandat: Teaser, Bieterverfahren, drei Verhandlungsrunden. Rechne mit zwölf bis achtzehn Arbeitstagen über drei Monate."
              : "Rechne mit sechs bis zwölf Arbeitstagen über zwei bis drei Monate."}
          </p>
          {view.blocker && <p className="notice notice--warn">{view.blocker}</p>}
          <div className="panel__actions">
            <ActionButton
              action={{ type: "mandate", mandateId: view.id, move: "accept" }}
              revision={revision}
              days={view.days.accept}
              variant="primary"
              disabled={Boolean(view.blocker)}
            >
              Mandat annehmen
            </ActionButton>
            <ActionButton action={{ type: "mandate", mandateId: view.id, move: "decline" }} revision={revision} variant="ghost">
              Ablehnen
            </ActionButton>
          </div>
          <p className="muted small">Die Anfrage gilt bis Ende {monthLabel(view.expires)}.</p>
        </section>
      )}

      {view.status === "prep" && (
        <>
          <section className="panel" aria-labelledby="mandate-comps">
            <h2 id="mandate-comps" className="panel__title">
              Bewertung
            </h2>
            <Disclosure title="Wie entsteht der Preis?" quietOnWide>
              <p>
                Der Preis eines Familienbetriebs ist ein Vielfaches seines EBITDA. Wie hoch, hängt von Größe, Wachstum, Kundenstruktur und Markt ab. Eine Vergleichsanalyse sucht
                ähnliche Verkäufe der letzten Jahre.
              </p>
            </Disclosure>
            {view.comps ? (
              <p className="notice notice--good">
                Vergleichbare Verkäufe lagen zwischen <b>{x(view.comps[0])}</b> und <b>{x(view.comps[1])}</b> EBITDA. Die Mitte ist meist ein fairer Preis.
              </p>
            ) : (
              <ActionButton action={{ type: "mandate", mandateId: view.id, move: "comps" }} revision={revision} days={view.days.comps}>
                Vergleichsanalyse erstellen
              </ActionButton>
            )}
          </section>
          {big && (
            <section className="panel" aria-labelledby="mandate-teaser">
              <h2 id="mandate-teaser" className="panel__title">
                Teaser: Was erfahren die Käufer?
              </h2>
              <Disclosure title="Was ist ein Teaser?" quietOnWide>
                <p>
                  Ein Teaser ist ein anonymes Kurzprofil auf ein bis zwei Seiten. Er geht an mögliche Käufer, bevor sie den Namen kennen. Wer anbeißt, unterschreibt eine
                  Geheimhaltungsvereinbarung. Mehr verraten bringt mehr Bieter, aber Leak-Risiko. Wesentliches zu verschweigen fliegt in der Due Diligence auf.
                </p>
              </Disclosure>
              {big.teaser ? (
                <p className="notice notice--good">
                  Der Teaser ist raus: {big.teaser.length} Angaben. Interesse {big.effect?.interest}, Preiserwartung {big.effect?.price}, Vertraulichkeit {big.effect?.conf},
                  Glaubwürdigkeit {big.effect?.cred}.
                  {big.concealed > 0 ? ` ${big.concealed === 1 ? "Ein wesentlicher Punkt fehlt" : `${big.concealed} wesentliche Punkte fehlen`}.` : ""}
                </p>
              ) : (
                <TeaserForm id={view.id} facts={big.facts} revision={revision} days={big.days.teaser} daysLeft={view.daysLeft} />
              )}
            </section>
          )}
          {(!big || big.teaser) && (
            <section className="panel" aria-labelledby="mandate-launch">
              <h2 id="mandate-launch" className="panel__title">
                {sell ? "Verkaufsprozess aufsetzen" : "Angebot vorbereiten"}
              </h2>
              <MandateForm
                id={view.id}
                side={view.side}
                ebitda={view.ebitda}
                multiples={view.multiples}
                initial={view.multiples.reduce((a, b) => (Math.abs(b - view.rule) < Math.abs(a - view.rule) ? b : a))}
                dd={view.ddChoices}
                days={view.days}
                revision={revision}
                daysLeft={view.daysLeft}
              />
              <p className="muted small">Startet der Prozess nicht bis Ende des nächsten Monats, springt der Mandant ab.</p>
            </section>
          )}
        </>
      )}

      {view.status === "marketing" && (
        <section className="panel">
          <h2 className="panel__title">{sell ? "Die Käufer sind angesprochen" : "Das Angebot ist raus"}</h2>
          <p>
            {sell
              ? `Gefordert: ${x(view.multiple ?? 0)} EBITDA, ${view.process === "auction" ? "im Bieterverfahren" : "exklusiv"}. Die Antworten kommen zum Monatsende.`
              : `Geboten: ${x(view.multiple ?? 0)} EBITDA. Die Antwort kommt zum Monatsende.`}
          </p>
        </section>
      )}

      {view.status === "bids" && big && (
        <section className="panel" aria-labelledby="mandate-rounds">
          <h2 id="mandate-rounds" className="panel__title">
            Verhandlung · Runde {Math.min(big.rounds + 1, big.maxRounds)} von {big.maxRounds}
          </h2>
          {view.leak && <p className="notice notice--warn">Etwas ist durchgesickert. Die Belegschaft ist unruhig, die Gebote fallen niedriger aus.</p>}
          <p className="muted small">
            Wer eine glaubwürdige Alternative hat (BATNA), bekommt den besseren Preis: Zweitbieter sind Macht. Dein Erfolgshonorar steigt mit dem Preis; ein Earn-out zählt zur
            Hälfte. Ohne Entscheidung erteilt der Mandant zum Monatsende den Zuschlag an das beste Gebot.
          </p>
          <BigRounds
            id={view.id}
            bids={big.bids}
            levers={big.levers}
            rounds={big.rounds}
            maxRounds={big.maxRounds}
            power={big.power}
            exclusive={big.exclusive}
            revision={revision}
            days={{ round: big.days.round, close: view.days.close }}
          />
          {big.log.length > 0 && (
            <ol className="duel__log" aria-label="Verlauf der Verhandlung">
              {big.log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          )}
        </section>
      )}

      {view.status === "bids" && best && !big && (
        <section className="panel" aria-labelledby="mandate-bids">
          <h2 id="mandate-bids" className="panel__title">
            {sell ? "Angebote" : "Antwort"}
          </h2>
          {view.leak && <p className="notice notice--warn">Im Bieterverfahren ist etwas durchgesickert. Kunden und Mitarbeiter sind unruhig, die Angebote fallen niedriger aus.</p>}
          <ul className="list">
            {[...view.bids]
              .sort((a, b) => b.ev - a.ev)
              .map((b) => (
                <li key={b.buyer} className="list__row">
                  <b>{b.buyer}</b>
                  <span className="muted">{b.kind === "strategic" ? "Stratege" : "Finanzinvestor"}</span>
                  <span>
                    {eur(b.ev)} · {x(b.ev / view.ebitda)} EBITDA
                  </span>
                </li>
              ))}
          </ul>
          <div className="panel__actions mna-bar">
            {!(!sell && view.process === "auction") && (
              <ActionButton action={{ type: "mandate", mandateId: view.id, move: "accept_bid" }} revision={revision} days={view.days.close} variant="primary">
                {sell ? `Zuschlag an ${best.buyer}` : "Preis annehmen"}
              </ActionButton>
            )}
            {view.process === "auction" && (sell ? view.bids.length >= 2 : true) && (
              <ActionButton action={{ type: "mandate", mandateId: view.id, move: "final" }} revision={revision} days={view.days.final} variant={sell ? undefined : "primary"}>
                {sell ? "Finale Runde: Bieter gegeneinander" : "Nachbessern (3 % über dem Rivalen)"}
              </ActionButton>
            )}
            {view.process === "exclusive" && (
              <ActionButton action={{ type: "mandate", mandateId: view.id, move: "negotiate" }} revision={revision} days={view.days.negotiate}>
                Nachverhandeln
              </ActionButton>
            )}
          </div>
          <p className="muted small">
            {sell
              ? view.process === "auction"
                ? "Finale Runde: meist 3 bis 8 % mehr, manchmal springt der Beste ab."
                : "Nachverhandeln: halbe Chance auf 5 % mehr, ein Viertel bricht ab."
              : view.process === "auction"
                ? "Bessert ihr nicht nach, geht die Firma an den anderen Bieter."
                : "Nachverhandeln: halbe Chance auf 4 % weniger, ein Viertel bricht ab."}{" "}
            {sell ? "Ohne Entscheidung nimmt der Mandant zum Monatsende das beste Angebot." : "Ohne Entscheidung entscheidet der Mandant zum Monatsende selbst."}
          </p>
        </section>
      )}

      {view.status === "signing" && view.signed && (
        <section className="panel">
          <h2 className="panel__title">Unterschrieben: {eur(view.signed.ev)}</h2>
          {view.signed.earnout ? <p className="muted small">Darin zur Hälfte gewertet: ein Earn-out über {eur(view.signed.earnout)}, fällig nur bei guten Zahlen.</p> : null}
          <p>
            {sell
              ? `${view.signed.buyer} prüft jetzt selbst (Confirmatory Due Diligence). Was deine Vorbereitung nicht gezeigt hat, kommt jetzt auf den Tisch.`
              : "Der Vertrag ist unterschrieben. Abschluss zum Monatsende."}
          </p>
        </section>
      )}

      {view.outcome && (
        <section className={`panel ${view.outcome.mood === "failed" ? "panel--error" : ""}`}>
          <h2 className="panel__title">{view.outcome.mood === "failed" ? "Mandat gescheitert" : "Mandat abgeschlossen"}</h2>
          <p>{view.outcome.text}</p>
          <p className="muted small">
            Ruf {view.outcome.reputation > 0 ? `+${view.outcome.reputation}` : view.outcome.reputation}
            {view.outcome.fee > 0 ? ` · Erfolgshonorar ${eur(view.outcome.fee)}` : ""}
          </p>
        </section>
      )}

      {view.found.length > 0 && (
        <section className="panel" aria-labelledby="mandate-found">
          <h2 id="mandate-found" className="panel__title">
            Befunde der Prüfung
          </h2>
          <ul className="dd">
            {view.found.map((f) => (
              <li key={f.title} className="dd__fact dd__fact--bad">
                <b>{f.title}</b> {f.text} {sell ? "Offengelegt kostet das weniger, als wenn der Käufer es findet." : `Drückt den Preis um etwa ${Math.round(f.priceCut * 100)} %.`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.status === "prep" && (
        <HelpersPanel
          helpers={specialistsFor(state, view.id)}
          revision={revision}
          targetId={view.id}
          title="Spezialisten aus deinem Netzwerk"
          lead="Eine Verkäuferprüfung vor dem Start: Was du kennst, kannst du offenlegen, statt dass der Käufer es findet."
        />
      )}

      <p className="muted small">
        Lernkarten im <Link href="/notizbuch">Notizbuch</Link>: EBITDA-Multiple, Bieterverfahren, Due Diligence{big ? ", Teaser, BATNA" : ""}. Deine Mandate zählen in der{" "}
        <Link href="/rangliste">Rangliste</Link>.
      </p>
    </div>
  );
}
