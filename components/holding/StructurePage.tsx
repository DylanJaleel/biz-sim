import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { netWorth } from "@/lib/game/engine";
import { structureView, type StructureCompany } from "@/lib/game/holdco";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";
import { HoldingTabs } from "./HoldingTabs";

// Gesellschaftsstruktur: wem was gehört, wer mit am Tisch sitzt, welche Bank
// am Darlehen hängt, und ob eine Zwischenholding die Haftung trennt.

const q = (n: number) => `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
const x = (n: number) => `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×`;

function Company({ c }: { c: StructureCompany }) {
  const href = c.kind === "startup" ? `/firma/${c.id}` : `/plattform/${c.id}`;
  return (
    <li className={`org-node org-node--${c.kind}`}>
      <div className="org-node__card">
        <span className="org-node__top">
          <Link href={href}>{c.name}</Link>
          <span className="org-quota">{q(c.stake)}</span>
        </span>
        <small>
          {c.label}
          {c.addons > 0 ? ` · ${c.addons} Zukäufe` : ""}
          {c.fundPct > 0 ? ` · Fonds ${q(c.fundPct)}` : ""} · Wert deines Anteils {eur(c.value)}
        </small>
        {c.lead && <small>Zuständig: {c.lead}</small>}
        {c.coOwners.length > 0 && (
          <span className="org-chips" aria-label="Mitgesellschafter">
            {c.coOwners.map((o) => (
              <span key={o.name} className={o.veto ? "org-chip org-chip--veto" : "org-chip"} title={o.veto ? "Vetorecht" : undefined}>
                {o.name} {q(o.pct)}
                {o.veto ? " · Veto" : ""}
              </span>
            ))}
          </span>
        )}
        {c.bank && (
          <small className={c.bank.leverage > c.bank.limit ? "neg" : undefined}>
            Bank: {eur(c.bank.amount)} · {x(c.bank.leverage)} EBITDA, Grenze {x(c.bank.limit)}
          </small>
        )}
        {c.rights.length > 0 && (
          <ul className="org-rights">
            {c.rights.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export async function StructurePage() {
  const { state, revision } = await currentGame();
  const v = structureView(state, netWorth(state));
  return (
    <div className="page holding holding--structure">
      <header className="page__head">
        <p className="eyebrow">Holding · Struktur</p>
        <h1 className="page__title">Deine Gesellschaftsstruktur</h1>
        <p className="page__lead">Wem was gehört, wer mit am Tisch sitzt und welche Bank am Darlehen hängt. Tippe eine Firma an, um zu ihr zu springen.</p>
        {v.founded && <HoldingTabs current="/holding/struktur" />}
      </header>

      <section className="panel org-panel" aria-label="Organigramm">
        <ul className="org">
          <li className="org-node org-node--root">
            <div className="org-node__card">
              <b>Du</b>
              <small>
                Privatvermögen {eur(v.worth)} · Konto {eur(v.cash)}
              </small>
            </div>
            <ul>
              <li className="org-node org-node--fo">
                <div className="org-node__card">
                  <b>{v.founded ? "Family Office GmbH" : "Noch kein Family Office"}</b>
                  <small>{v.founded ? "Holding für dein Vermögen · 100 %" : "Deine Beteiligungen hältst du privat."}</small>
                </div>
                <ul>
                  {(v.bought.length > 0 || v.holdco) && (
                    <li className={`org-node ${v.holdco ? "org-node--holdco" : "org-node--ghost"}`}>
                      <div className="org-node__card">
                        <b>{v.holdco ? v.holdco.name : "Ohne Zwischenholding"}</b>
                        <small>
                          {v.holdco
                            ? `Zwischenholding seit ${monthLabel(v.holdco.since)} · haftet für die gekauften Firmen, nicht du`
                            : `Gekaufte Firmen hängen direkt an dir: Die Bank hat deine Bürgschaft über ${eur(v.guarantee)}.`}
                        </small>
                      </div>
                      {v.bought.length > 0 && (
                        <ul>
                          {v.bought.map((c) => (
                            <Company key={c.id} c={c} />
                          ))}
                        </ul>
                      )}
                    </li>
                  )}
                  {v.direct.map((c) => (
                    <Company key={c.id} c={c} />
                  ))}
                  {v.fund && (
                    <li className="org-node org-node--fund">
                      <div className="org-node__card">
                        <b>{v.fund.name}</b>
                        <small>Fonds · {eur(v.fund.size)} Zusagen der Investoren · du verwaltest ihn</small>
                      </div>
                      {v.viaFund.length > 0 && (
                        <ul>
                          {v.viaFund.map((c) => (
                            <Company key={c.id} c={c} />
                          ))}
                        </ul>
                      )}
                    </li>
                  )}
                </ul>
              </li>
              {v.corporate && (
                <li className="org-node org-node--corp">
                  <div className="org-node__card">
                    <Link href={`/firma/${v.corporate.id}`}>{v.corporate.name}</Link>
                    <small>Aufsichtsratsmandat · keine Anteile</small>
                  </div>
                </li>
              )}
            </ul>
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="holdco-title">
        <p className="eyebrow">Zwischenholding</p>
        <h2 id="holdco-title" className="panel__title">
          {v.holdco ? "Haftung getrennt" : "Haftung trennen?"}
        </h2>
        {v.holdco ? (
          <p>
            Die {v.holdco.name} hält deine gekauften Firmen. Fällt eine aus, verliert die Holding ihren Anteil, aber die Bank kommt nicht an dein Privatvermögen oder deine anderen
            Firmen. Die Gesellschaftervereinbarung enthält die Mitverkaufspflicht: Beim Verkauf einer Plattform verkaufen alle Mitgesellschafter mit.
          </p>
        ) : (
          <>
            <p>
              Eine Zwischenholding ist eine eigene GmbH zwischen dir und deinen gekauften Firmen. Sie kostet einmal {eur(v.cost)} für Notar und Steuerberatung und einen Tag. Dafür:
            </p>
            <ul className="op-rules">
              <li>
                <b>Haftungstrennung:</b> Ohne Holding verlangt die Bank deine persönliche Bürgschaft über {Math.round(v.guaranteeShare * 100)} % ihres Kredits. Geht eine Firma
                in die Insolvenz oder wird zwangsverkauft, zahlst du privat. Heute stehen {eur(v.guarantee)} im Risiko.
              </li>
              <li>
                <b>Mitverkaufspflicht (Drag-along):</b> Mit der Holding wird eine Gesellschaftervereinbarung beurkundet. Ohne sie ziehen Käufer einer Plattform{" "}
                {Math.round(v.holdout * 100)} % ab, weil Mitgesellschafter ihre Anteile behalten könnten.
              </li>
            </ul>
            {v.blocker && <p className="notice notice--warn">{v.blocker}</p>}
            <ActionButton action={{ type: "holdco" }} revision={revision} days={v.days} variant="primary" disabled={Boolean(v.blocker)}>
              {`Zwischenholding gründen (${eur(v.cost)})`}
            </ActionButton>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="rights-title">
        <Disclosure as="h2" headingId="rights-title" headingClass="panel__title" title="Rechte der Mitgesellschafter">
          <ul className="op-rules">
            <li>
              <b>Vetorecht:</b> Wer mindestens {v.vetoMin} % hält (der Verkäufer mit Rückbeteiligung, die Suchende), muss großen Zukäufen zustimmen. Ab {Math.round(v.vetoSize * 100)}{" "}
              % des Firmenwerts verlangt er eine Commercial Due Diligence, die die Passung zeigt. Zeigt sie, dass ein Zukauf nicht passt, legt er sein Veto ein.
            </li>
            <li>
              <b>Mitverkaufspflicht:</b> Verkaufst du die Mehrheit, müssen die anderen zu denselben Bedingungen mitverkaufen. Käufer wollen 100 % und zahlen dafür den vollen Preis.
            </li>
          </ul>
        </Disclosure>
      </section>
      <p className="muted small">
        Lernkarten im <Link href="/notizbuch">Notizbuch</Link>: Zwischenholding, Vetorecht, Mitverkaufspflicht, Passung von Zukäufen.
      </p>
    </div>
  );
}
