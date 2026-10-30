import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { ACTION_DAYS, FUND_FEE, FUND_MATCH, monthLabel, SALARY, TEAM_MAX } from "@/lib/game/config";
import { holdingView } from "@/lib/game/views";
import { holdingMna } from "@/lib/game/mna-views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";
import { AssignSelect } from "./AssignSelect";

// Die Holding: Family Office, Team, eigener Fonds, Kaufkredite und Aktien in
// der Sperrfrist. Hier wird aus dem Angel ein Investor mit Organisation.

const ROLE_TEXT = {
  associate: { title: "Associate", text: "Übernimmt ein Beiratsmandat und entscheidet dort, wenn du keine Zeit hast. Meist gut, selten brillant; den Ruf teilt ihr euch." },
  partner: { title: "Partnerin", text: `Bringt jeden Monat einen zusätzlichen Deal und nimmt dir Arbeit ab: drei Arbeitstage mehr im Monat.` },
} as const;

export async function Holding() {
  const { state, revision } = await currentGame();
  const view = holdingView(state);
  const mna = holdingMna(state);
  const rec = mna.record;
  const fund = view.fund;
  return (
    <div className="page holding">
      <header className="page__head">
        <p className="eyebrow">Holding</p>
        <h1 className="page__title">{view.founded ? "Dein Family Office" : "Vom Angel zum Family Office"}</h1>
        <p className="page__lead">
          Ab einer gewissen Größe arbeitet niemand mehr allein. Ein Family Office bündelt dein Vermögen, ein Team übernimmt Mandate, und mit genug Erfolgen vertrauen dir andere ihr
          Geld an.
        </p>
        <div className="market__summary">
          <span>
            Vermögen <b>{eur(view.worth)}</b>
          </span>
          <span>
            Konto <b>{eur(view.cash)}</b>
          </span>
          {fund && (
            <span>
              Fonds <b>{eur(fund.size)}</b>
            </span>
          )}
        </div>
      </header>

      {!view.founded ? (
        <section className="panel holding__found" aria-labelledby="found-title">
          <p className="eyebrow">Karriere</p>
          <h2 id="found-title" className="panel__title">
            Family Office gründen
          </h2>
          <ul className="reqs">
            {view.foundRequirements.map((r) => (
              <li key={r.label} className={r.done ? "is-done" : undefined}>
                <span aria-hidden="true">{r.done ? "✓" : "○"}</span> {r.label}
              </li>
            ))}
          </ul>
          <ActionButton
            action={{ type: "foundFamilyOffice" }}
            revision={revision}
            days={ACTION_DAYS.foundFamilyOffice}
            variant="primary"
            disabled={view.foundRequirements.some((r) => !r.done)}
          >
            Gründen
          </ActionButton>
        </section>
      ) : (
        <>
          <section className="panel" aria-labelledby="team-title">
            <p className="eyebrow">Team</p>
            <h2 id="team-title" className="panel__title">
              Wer für dich arbeitet
            </h2>
            {view.team.length === 0 && <p className="muted">Noch niemand. Jede Stelle kostet jeden Monat Gehalt.</p>}
            <ul className="team">
              {view.team.map((m) => (
                <li key={m.id} className="team__row">
                  <span className="gv__avatar" style={{ ["--member" as string]: m.role === "partner" ? "#7b4dff" : "#0e9f8e" }}>
                    {m.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </span>
                  <span className="team__name">
                    <b>{m.name}</b>
                    <small>
                      {ROLE_TEXT[m.role].title} · {eur(m.salary)} im Monat · seit {monthLabel(m.hired)}
                    </small>
                  </span>
                  {m.role === "associate" ? (
                    <AssignSelect memberId={m.id} current={m.mandate} mandates={view.mandates} revision={revision} />
                  ) : (
                    <span className="muted small">+3 Tage, +1 Deal im Monat</span>
                  )}
                  <ActionButton action={{ type: "fire", memberId: m.id }} revision={revision} size="sm" variant="ghost">
                    Entlassen
                  </ActionButton>
                </li>
              ))}
            </ul>
            <div className="hire">
              {(["associate", "partner"] as const).map((role) => (
                <div key={role} className="hire__card">
                  <b>{ROLE_TEXT[role].title}</b>
                  <span className="muted small">
                    {eur(SALARY[role])} im Monat · höchstens {TEAM_MAX[role]}
                  </span>
                  <p>{ROLE_TEXT[role].text}</p>
                  <ActionButton action={{ type: "hire", role }} revision={revision} days={ACTION_DAYS.hire} size="sm" disabled={!view.canHire[role]}>
                    Einstellen
                  </ActionButton>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" aria-labelledby="fund-title">
            <p className="eyebrow">Fonds</p>
            <h2 id="fund-title" className="panel__title">
              {fund ? fund.name : "Einen eigenen Fonds auflegen"}
            </h2>
            {fund ? (
              <>
                <div className="kpis kpis--compact">
                  <span>
                    <small>Zugesagt</small>
                    <b>{eur(fund.size)}</b>
                  </span>
                  <span>
                    <small>Noch frei</small>
                    <b>{eur(fund.cash)}</b>
                  </span>
                  <span>
                    <small>Investiert</small>
                    <b>{eur(fund.invested)}</b>
                  </span>
                  <span>
                    <small>Zurückgeflossen</small>
                    <b>{eur(fund.returned)}</b>
                  </span>
                </div>
                <p className="muted">
                  Seit {monthLabel(fund.raised)}. Bei jedem neuen Einstieg legt der Fonds das {FUND_MATCH}-Fache deines Tickets dazu, höchstens ein Viertel des Fonds pro Firma. Du
                  bekommst {FUND_FEE * 100} % Verwaltungsgebühr im Jahr ({eur((fund.size * FUND_FEE) / 12)} im Monat) und 20 % Carry über den Wasserfall des ganzen Fonds: erst wenn
                  die Investoren Kapital und 8 % Hurdle zurückhaben.
                </p>
                <div className="panel__actions">
                  <Link href="/fonds" className="btn btn--sm btn--primary">
                    Zur Fondsfamilie: Wasserfall, LPAC, Fonds II
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p>
                  Investoren würden dir heute etwa <b>{eur(view.fundSize)}</b> anvertrauen. Der Fonds investiert bei jedem neuen Einstieg das {FUND_MATCH}-Fache deines Tickets mit,
                  stimmt wie du und zahlt dir {FUND_FEE * 100} % Gebühr im Jahr plus 20 % Carry, sobald die Investoren ihr Geld und eine Mindestrendite zurückhaben.
                </p>
                {view.fundBlocker && <p className="notice notice--warn">{view.fundBlocker}</p>}
                <ActionButton action={{ type: "raiseFund" }} revision={revision} days={ACTION_DAYS.raiseFund} variant="primary" disabled={Boolean(view.fundBlocker)}>
                  Fonds auflegen
                </ActionButton>
              </>
            )}
          </section>
        </>
      )}

      <section className="panel mna-holding" aria-labelledby="mna-title">
        <p className="eyebrow">Mittelstand</p>
        <h2 id="mna-title" className="panel__title">
          M&A, Nachfolge und Buy-and-Build
        </h2>
        <Disclosure title="Worum geht es?" quietOnWide>
          <p className="muted">
            Als M&A-Berater lernst du, wie Familienbetriebe verkauft werden. Im Nachfolge-Programm kaufst du selbst einen, mit Bank und Verkäufer. Als Plattform kauft er kleinere
            dazu, bis die Gruppe verkauft wird. Alles dazu steht auf einer eigenen Seite.
          </p>
        </Disclosure>
        <div className="kpis kpis--compact">
          <span>
            <small>Mandate abgeschlossen</small>
            <b>{rec.mandatesDone}</b>
          </span>
          <span>
            <small>Firmen gekauft</small>
            <b>{rec.acquisitions}</b>
          </span>
          <span>
            <small>Zukäufe</small>
            <b>{rec.addons}</b>
          </span>
          <span>
            <small>Plattformen verkauft</small>
            <b>{rec.platformExits.filter((e) => !e.forced).length}</b>
          </span>
        </div>
        <div className="panel__actions">
          <Link href="/nachfolge" className="btn btn--sm btn--primary">
            Zu M&A und Nachfolge
          </Link>
          {mna.platformId && (
            <Link href={`/plattform/${mna.platformId}`} className="btn btn--sm">
              Zur Plattform
            </Link>
          )}
        </div>
      </section>

      {(view.loans.length > 0 || view.lockups.length > 0 || view.dividendCompanies.length > 0) && (
        <section className="panel" aria-labelledby="money-title">
          <p className="eyebrow">Geldflüsse</p>
          <h2 id="money-title" className="panel__title">
            Kredite, Ausschüttungen, gesperrte Aktien
          </h2>
          <ul className="list">
            {view.loans.map((l) => (
              <li key={l.id} className="list__row">
                <b>{l.label}</b>
                <span className="muted">
                  Restschuld {eur(l.balance)} · Rate {eur(l.payment)} im Monat · {(l.rate * 100).toLocaleString("de-DE")} % Zins
                </span>
              </li>
            ))}
            {view.dividendCompanies.map((c) => (
              <li key={c.id} className="list__row">
                <Link href={`/firma/${c.id}`}>{c.name}</Link>
                <span className="muted">Mehrheit: schüttet jedes Quartal aus, was über drei Monatskosten liegt</span>
              </li>
            ))}
            {view.lockups.map((l) => (
              <li key={l.id} className="list__row">
                <b>{l.name}: Aktien in der Sperrfrist</b>
                <span className="muted">
                  heute {eur(l.value)} wert · frei ab {monthLabel(l.due)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
