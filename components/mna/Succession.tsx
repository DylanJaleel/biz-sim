import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { mandateLines, successionView } from "@/lib/game/mna-views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";

// Das Nachfolge-Programm nach dem Vorbild der Search Funds: Du finanzierst
// eine Suchende, sie findet einen Familienbetrieb ohne Nachfolge, du kaufst
// ihn mit Bank und Verkäufer, sie führt ihn.

const SOURCE = { search: "Von deiner Suchenden", market: "Über einen M&A-Berater", referral: "Empfehlung" } as const;
const STATUS = { ok: "Bank zufrieden", watch: "Covenant gebrochen", cure: "Bank verlangt Geld" } as const;
const x = (n: number) => `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×`;

export async function Succession() {
  const { state, revision } = await currentGame();
  const v = successionView(state);
  const r = v.record;
  const mandates = mandateLines(state);
  return (
    <div className="page mna mna--succession">
      <header className="page__head">
        <nav className="crumbs" aria-label="Pfad">
          <Link href="/holding">Holding</Link>
          <span aria-hidden="true">/</span>
          <span>M&A und Nachfolge</span>
        </nav>
        <p className="eyebrow">M&A-Mandate · Nachfolge-Programm (Search Fund) · Buy-and-Build</p>
        <h1 className="page__title">Familienbetriebe ohne Nachfolge</h1>
        <Disclosure title="So funktioniert das Programm" quietOnWide className="mna-lead">
          <p className="page__lead">
            Tausende Inhaber finden niemanden, der übernimmt. Du finanzierst eine Suchende für bis zu {v.maxMonths} Monate. Findet sie eine passende Firma, kaufst du sie mit
            Eigenkapital, Bankkredit und oft mit Hilfe des Verkäufers. Sie wird Geschäftsführerin und verdient sich bis zu {v.earnIn.max} % der Firma. Viele Suchen scheitern; dann
            ist das Suchkapital weg.
          </p>
        </Disclosure>
      </header>

      <section className="kpis" aria-label="Deine Lage">
        <div>
          <small>Ruf</small>
          <b>{v.reputation}</b>
          <span>Kauf ab {v.buyoutReputation}</span>
        </div>
        <div>
          <small>Vermögen</small>
          <b>{eur(v.worth)}</b>
          <span>Konto {eur(v.cash)}</span>
        </div>
        <div>
          <small>Gekaufte Firmen</small>
          <b>{r.acquisitions}</b>
          <span>
            {r.successions} Übergaben gelungen, {r.troubledHandovers} holprig
          </span>
        </div>
        <div>
          <small>Suchen</small>
          <b>{r.searchesStarted}</b>
          <span>{r.searchesFailed} ohne Kauf beendet</span>
        </div>
      </section>

      <section className="panel" aria-labelledby="mandates">
        <p className="eyebrow">Stufe 1 · Investment Banking</p>
        <Disclosure
          as="h2"
          headingId="mandates"
          headingClass="panel__title"
          title="M&A-Mandate"
          hint={mandates.length > 0 ? `${mandates.length} im Gang` : "keine"}
          defaultOpen={mandates.some((m) => m.status === "offered")}
        >
          <Disclosure title="Was sind M&A-Mandate?" quietOnWide>
            <p className="muted small">
              Ab 35 Ruf fragen Familienunternehmer und Käufer nach Beratung, du findest die Anfragen bei den Aufträgen im Büro. Bisher {r.mandatesDone} abgeschlossen,{" "}
              {r.mandatesFailed} gescheitert, {eur(r.mandateFees)} Honorar. Ein abgeschlossenes Mandat ist die Voraussetzung für das Nachfolge-Programm.
            </p>
          </Disclosure>
          {mandates.length > 0 && (
            <ul className="list">
              {mandates.map((m) => (
                <li key={m.id} className="list__row">
                  <Link href={`/mandat/${m.id}`}>{m.company}</Link>
                  <span className="muted small">
                    {m.side === "sell" ? "Verkauf" : "Kauf"} · {m.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Disclosure>
      </section>

      {v.active ? (
        <section className="panel" aria-labelledby="search-now">
          <p className="eyebrow">Laufende Suche</p>
          <h2 id="search-now" className="panel__title">
            {v.active.name}
          </h2>
          <p>
            {v.active.background}. Führung {v.active.operator} von 100, Netzwerk {v.active.network} von 100. Kostet {eur(v.active.cost)} im Monat.
          </p>
          <div className="kpis kpis--compact">
            <span>
              <small>Seit</small>
              <b>{monthLabel(v.active.started)}</b>
            </span>
            <span>
              <small>Noch</small>
              <b>{v.active.left} Monate</b>
            </span>
            <span>
              <small>Suchkapital bisher</small>
              <b>{eur(v.active.spent)}</b>
            </span>
            <span>
              <small>Firmen vorgeschlagen</small>
              <b>{v.active.targets}</b>
            </span>
          </div>
          {v.active.quiet && <p className="notice">Die ersten drei Monate baut sie ihre Liste auf und spricht mit Steuerberatern, Banken und Kammern. Danach kommen Vorschläge.</p>}
          <div className="panel__actions">
            <ActionButton action={{ type: "search", move: "stop" }} revision={revision} variant="ghost" size="sm">
              Suche beenden
            </ActionButton>
          </div>
        </section>
      ) : (
        <section className="panel" aria-labelledby="search-start">
          <p className="eyebrow">Eine Suchende auswählen</p>
          <h2 id="search-start" className="panel__title">
            Wer sucht für dich?
          </h2>
          {v.blocker && <p className="notice notice--warn">{v.blocker}</p>}
          <Disclosure title="Worauf kommt es an?" quietOnWide>
            <p className="muted small">
              Führungserfahrung zählt nach dem Kauf: Wer gut führt, verliert weniger Schlüsselleute. Ein großes Netzwerk bringt schneller Vorschläge. Wie lange jemand durchhält,
              zeigt sich erst unterwegs.
            </p>
          </Disclosure>
          <ul className="mna-cards">
            {v.candidates.map((c, i) => (
              <li key={c.name} className="mna-card">
                <b>{c.name}</b>
                <span className="muted small">{c.background}</span>
                <span className="small">
                  Führung {c.operator} · Netzwerk {c.network} · {eur(c.cost)} im Monat
                </span>
                <ActionButton
                  action={{ type: "search", move: "start", candidate: i }}
                  revision={revision}
                  days={v.startDays}
                  size="sm"
                  disabled={Boolean(v.blocker) || v.cash < c.cost * 6}
                >
                  Suche finanzieren
                </ActionButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel" aria-labelledby="targets">
        <p className="eyebrow">Zum Verkauf</p>
        <h2 id="targets" className="panel__title">
          Firmen, die eine Nachfolge suchen
        </h2>
        {v.targets.length === 0 ? (
          <p className="muted">Gerade keine. Angebote kommen von deiner Suchenden, über Berater in die Post und als Empfehlung zufriedener Mandanten.</p>
        ) : (
          <ul className="list mna-rows">
            {v.targets.map((t) => (
              <li key={t.id} className="list__row">
                <Link href={`/uebernahme/${t.id}`}>{t.name}</Link>
                <span className="pill">{SOURCE[t.source]}</span>
                <span className="muted small">
                  {t.sector} · EBITDA {eur(t.ebitda)} · {eur(t.ev)} ({x(t.multiple)}) · {t.stake} % · bis {monthLabel(t.expires)}
                </span>
                <Link className="btn btn--sm" href={`/uebernahme/${t.id}`}>
                  Prüfen und strukturieren
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {v.owned.length > 0 && (
        <section className="panel" aria-labelledby="owned">
          <p className="eyebrow">Gekauft</p>
          <h2 id="owned" className="panel__title">
            Deine Familienbetriebe
          </h2>
          <ul className="list mna-rows">
            {v.owned.map((o) => (
              <li key={o.id} className="list__row">
                <Link href={`/plattform/${o.id}`}>{o.name}</Link>
                {o.platform && <span className="pill">Plattform</span>}
                <span className={`tag ${o.status === "ok" ? "tag--go" : o.status === "watch" ? "tag--conditions" : "tag--no"}`}>{STATUS[o.status]}</span>
                <span className="muted small">
                  {o.stake.toLocaleString("de-DE", { maximumFractionDigits: 0 })} % · EBITDA {eur(o.ebitda)} · Verschuldung {Number.isFinite(o.leverage) ? x(o.leverage) : "–"} ·
                  dein Anteil {eur(o.value)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.platformExits.length > 0 && (
        <section className="panel" aria-labelledby="exits">
          <p className="eyebrow">Stufe 3 · Buy-and-Build</p>
          <Disclosure as="h2" headingId="exits" headingClass="panel__title" title="Verkaufte Plattformen" hint={String(r.platformExits.length)}>
            <ul className="list">
              {r.platformExits.map((e) => (
                <li key={`${e.name}-${e.month}`} className="list__row">
                  <b>{e.name}</b>
                  <span className="muted small">
                    {e.forced ? "Zwangsverkauf durch die Bank" : `${x(e.multiple)} EBITDA (gekauft für ${x(e.entryMultiple)})`} · {x(e.moic)} deines Geldes · {e.addons} Zukäufe
                  </span>
                </li>
              ))}
            </ul>
          </Disclosure>
        </section>
      )}

      {v.past.length > 0 && (
        <section className="panel" aria-labelledby="past">
          <Disclosure as="h2" headingId="past" headingClass="panel__title" title="Frühere Suchen" hint={String(v.past.length)}>
            <ul className="list">
              {v.past.map((p) => (
                <li key={`${p.name}-${p.ended}`} className="list__row">
                  <b>{p.name}</b>
                  <span className="muted small">
                    {p.status} · {eur(p.spent)} Suchkapital{p.ended ? ` · ${monthLabel(p.ended)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Disclosure>
        </section>
      )}
    </div>
  );
}
