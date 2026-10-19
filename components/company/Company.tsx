import Link from "next/link";
import { notFound } from "next/navigation";
import { currentGame } from "@/lib/current-game";
import { ACTION_DAYS, monthLabel } from "@/lib/game/config";
import { companyView } from "@/lib/game/views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur, pct, runwayText } from "@/components/game/format";
import { INTEREST_LABEL, PERSONALITY_LABEL, peopleOf } from "@/components/boardroom/people";
import { VOTE_LABEL } from "@/components/boardroom/derive";
import { CapTableBar } from "@/components/shares/CapTableBar";
import { fmtPct } from "@/components/shares/holders";
import { ForecastTool } from "./ForecastTool";
import { LEANING_LABEL, PHASE_LABEL } from "./labels";
import { Sparkline } from "./Sparkline";

const JUDGMENT_LABEL = { strong: "stark", fair: "vertretbar", weak: "schwach" } as const;

export async function Company({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state, revision } = await currentGame();
  const found = state.startups.find((s) => s.id === id);
  if (!found || found.status === "offered" || found.status === "declined") notFound();
  const view = companyView(state, id);
  const s = view.startup;
  const m = s.metrics;
  const people = peopleOf(s.board);
  const active = s.status === "active";
  const item = view.item;

  return (
    <div className="page company">
      <header className="page__head">
        <nav className="crumbs" aria-label="Pfad">
          <Link href="/">Büro</Link>
          <span aria-hidden="true">/</span>
          <Link href="/portfolio">Portfolio</Link>
          <span aria-hidden="true">/</span>
          <span>{s.name}</span>
        </nav>
        <div className="company__title">
          <div>
            <h1 className="page__title">{s.name}</h1>
            <p className="page__lead">
              {s.tagline} · {s.sector}
            </p>
          </div>
          <span className="pill">{PHASE_LABEL[s.phase]}</span>
        </div>
        {s.status === "dead" && <p className="notice notice--bad">Insolvent. Dein Anteil ist verloren. Was hätte man früher sehen können?</p>}
        {s.status === "exited" && <p className="notice notice--good">Verkauft für {eur(s.exitValue ?? 0)}. Dein Erlös ist in deinem Privatkapital.</p>}
      </header>

      <section className="kpis" aria-label="Kennzahlen">
        <div>
          <small>Umsatz/Monat</small>
          <b>{eur(m.revenue)}</b>
          <span>{pct(m.growth)} Wachstum</span>
        </div>
        <div>
          <small>Cashflow/Monat</small>
          <b className={view.cashFlow < 0 ? "neg" : "pos"}>{eur(view.cashFlow)}</b>
          <span>Rohmarge {pct(m.grossMargin, 0)}</span>
        </div>
        <div>
          <small>Kasse</small>
          <b>{eur(m.cash)}</b>
          <span>Runway {runwayText(view.runway)}</span>
        </div>
        <div>
          <small>Bewertung</small>
          <b>{eur(view.valuation)}</b>
          <span>
            Dein Anteil {s.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % = {eur(view.stakeValue)}
          </span>
        </div>
        <div>
          <small>Team</small>
          <b>{m.team} Leute</b>
          <span>Stimmung {Math.round(m.morale)}</span>
        </div>
        <div>
          <small>Vertrauen der Gründung</small>
          <b>{Math.round(m.trust)}</b>
          <span className="meter" aria-hidden="true">
            <i style={{ width: `${m.trust}%` }} />
          </span>
        </div>
      </section>

      <div className="company__grid">
        <div className="company__main">
          {item ? (
            <section className={`panel item${item.urgent ? " item--urgent" : ""}`} aria-labelledby="item-title">
              <p className="eyebrow">Vorlage für den Beirat{item.urgent ? " · dringend" : ""}</p>
              <h2 id="item-title" className="panel__title panel__title--serif">
                {item.title}
              </h2>
              <p className="item__motion">{item.motion}</p>
              <p>{item.context}</p>

              <div className="item__options">
                {(["go", "conditions", "no"] as const).map((v) => (
                  <div key={v} className={`option option--${v}`}>
                    <span className="option__vote">{VOTE_LABEL[v]}</span>
                    <span>{item.outcomeLabels[v]}</span>
                  </div>
                ))}
              </div>

              <h3 className="item__h">Rückfragen an die Gründung</h3>
              <ul className="qa">
                {item.questions.map((q) => (
                  <li key={q.id}>
                    <p className="qa__q">{q.q}</p>
                    {q.a ? (
                      <p className="qa__a">{q.a}</p>
                    ) : (
                      <ActionButton action={{ type: "question", itemId: item.id, questionId: q.id }} revision={revision} days={ACTION_DAYS.question} size="sm">
                        Fragen
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ul>

              <h3 className="item__h">CFO-Gespräch</h3>
              {item.outcomes ? (
                <div className="cfo-table" role="table" aria-label="Was der CFO zu jeder Option sagt">
                  <div role="row" className="cfo-table__head">
                    <span role="columnheader">Option</span>
                    <span role="columnheader">Kasse danach</span>
                    <span role="columnheader">Runway</span>
                    <span role="columnheader">Wert deines Anteils in 12 Monaten</span>
                  </div>
                  {item.outcomes.map((o) => (
                    <div role="row" key={o.vote} className={`cfo-table__row cfo-table__row--${o.vote}`}>
                      <span role="cell">
                        <b>{VOTE_LABEL[o.vote]}</b> {o.label}
                      </span>
                      <span role="cell">{eur(o.cashAfter)}</span>
                      <span role="cell">{runwayText(o.runwayAfter)}</span>
                      <span role="cell">
                        {eur(o.outlook.value)}
                        {o.outlook.chance !== undefined && (
                          <small>
                            {" "}
                            · {Math.round(o.outlook.chance * 100)} % Chance: {eur(o.outlook.good ?? 0)}, sonst {eur(o.outlook.bad ?? 0)}
                          </small>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="item__row">
                  <p className="muted">Der CFO rechnet jede Option durch: Kasse, Runway und was dein Anteil in einem Jahr wert sein dürfte.</p>
                  <ActionButton action={{ type: "cfo", itemId: item.id }} revision={revision} days={ACTION_DAYS.cfo} size="sm">
                    Durchrechnen lassen
                  </ActionButton>
                </div>
              )}

              <div className="item__cta">
                <p className="muted">
                  {view.daysLeft >= ACTION_DAYS.meeting
                    ? `Die Sitzung kostet ${ACTION_DAYS.meeting} Tag. Danach ist die Vorlage entschieden. Gelernt wird: ${item.lesson}.`
                    : "Kein Tag mehr frei. Schließe den Monat ab, sonst entscheidet die Gründung allein."}
                </p>
                {view.daysLeft >= ACTION_DAYS.meeting && (
                  <Link className="btn btn--primary btn--lg" href={`/sitzung/${item.id}`}>
                    Sitzung einberufen
                  </Link>
                )}
              </div>
            </section>
          ) : (
            active && (
              <section className="panel">
                <p className="eyebrow">Beirat</p>
                <p className="panel__title">Keine offene Vorlage</p>
                <p className="muted">Neue Themen kommen mit dem nächsten Monat. Du kannst die Zeit nutzen, um mit der Gründung zu sprechen.</p>
              </section>
            )
          )}

          <section className="panel">
            <div className="panel__row">
              <div>
                <p className="eyebrow">Umsatz pro Monat</p>
                <p className="panel__title">{eur(m.revenue)}</p>
              </div>
              {active && (
                <ActionButton action={{ type: "founderCall", startupId: s.id }} revision={revision} days={ACTION_DAYS.founderCall} size="sm" disabled={view.calledThisMonth}>
                  {view.calledThisMonth ? "Diesen Monat gesprochen" : "Gründung anrufen"}
                </ActionButton>
              )}
            </div>
            <Sparkline history={s.history} current={m.revenue} />
          </section>

          <section className="panel" id="anteile" aria-labelledby="shares-title">
            <div className="panel__row">
              <div>
                <p className="eyebrow">Gesellschafter</p>
                <h2 id="shares-title" className="panel__title">
                  Wem {s.name} gehört
                </h2>
              </div>
              {active && (
                <ActionButton action={{ type: "askShares", startupId: s.id }} revision={revision} days={ACTION_DAYS.askShares} size="sm" disabled={view.askedThisMonth}>
                  {view.askedThisMonth ? "Diesen Monat gefragt" : "Anteile anfragen"}
                </ActionButton>
              )}
            </div>
            <CapTableBar holders={s.capTable} stake={s.stake} />
            {view.round && (
              <Link href={`/gv/${view.round.id}`} className="banner">
                <span>
                  <b>{view.round.label} läuft:</b> {eur(view.round.amount)} von {view.round.lead}. Die Gesellschafterversammlung entscheidet bis Monatsende.
                </span>
                <span className="banner__cta">Zur Versammlung</span>
              </Link>
            )}
            {view.offers.map((o) => (
              <div key={o.id} className="offer">
                <span>
                  <b>{o.sellerName}</b> verkauft {fmtPct(o.pct)} für {eur(o.price)}
                  <small className="muted"> · gilt bis Ende nächsten Monats</small>
                </span>
                <ActionButton action={{ type: "buyShares", offerId: o.id }} revision={revision} days={ACTION_DAYS.buyShares} size="sm" variant="primary">
                  Kaufen
                </ActionButton>
              </div>
            ))}
            {view.rounds.length > 0 && (
              <ul className="rounds">
                {view.rounds.map((r) => (
                  <li key={r.id}>
                    <Link href={`/gv/${r.id}`}>
                      <span className="decision__month">{monthLabel(r.month)}</span>
                      <span>
                        {r.label} · {eur(r.amount)}
                      </span>
                      <span className={`tag tag--${r.status === "closed" ? "go" : "no"}`}>{r.status === "closed" ? "angenommen" : "abgelehnt"}</span>
                      {r.stakeBefore !== undefined && r.stakeAfter !== undefined && (
                        <span className="muted small">
                          {fmtPct(r.stakeBefore)} → {fmtPct(r.stakeAfter)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted small">
              Über 50 % machen dich zum Mehrheitsgesellschafter. Anteile bekommst du in Runden, als Leistungsanteile für gute Beiratsarbeit oder durch Kauf von anderen Gesellschaftern.
            </p>
          </section>

          {active && <ForecastTool startup={s} />}

          {view.past.length > 0 && (
            <section className="panel">
              <p className="eyebrow">Entscheidungen</p>
              <ul className="decisions">
                {view.past.map((p) => (
                  <li key={p.id}>
                    <Link href={`/sitzung/${p.id}`} className="decision">
                      <span className="decision__month">{monthLabel(p.month)}</span>
                      <span className="decision__title">{p.title}</span>
                      <span className="decision__meta">
                        {p.status === "lapsed" ? (
                          <span className="tag tag--no">ohne Beirat</span>
                        ) : (
                          <>
                            {p.outcome && <span className={`tag tag--${p.outcome}`}>{p.outcomeLabel}</span>}
                            {p.judgment && <span className={`tag tag--judgment-${p.judgment}`}>Urteil {JUDGMENT_LABEL[p.judgment]}</span>}
                          </>
                        )}
                      </span>
                      {p.result && <span className={`decision__result decision__result--${p.result.good ? "good" : "bad"}`}>{p.result.text}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="company__side">
          <section className="panel" aria-labelledby="board-title">
            <p className="eyebrow">Beirat</p>
            <h2 id="board-title" className="panel__title">
              Wer am Tisch sitzt
            </h2>
            <ul className="members">
              {view.board.map((b) => {
                const p = people[b.seat];
                return (
                  <li key={b.seat} className="member" style={{ ["--member" as string]: p.color }}>
                    <span className="member__avatar">{p.initials}</span>
                    <span className="member__body">
                      <span className="member__name">
                        {b.name} <small>{p.role}</small>
                      </span>
                      <span className="member__title">
                        {b.title} · {PERSONALITY_LABEL[b.personality]}
                      </span>
                      {b.pretalked ? (
                        <span className="member__talk">
                          <span className={`tag tag--${b.leaning === "open" ? "open" : b.leaning}`}>{LEANING_LABEL[b.leaning ?? "open"]}</span>
                          <span className="muted">wichtig: {b.interests.map((i) => INTEREST_LABEL[i]).join(", ")}</span>
                        </span>
                      ) : (
                        item && (
                          <ActionButton action={{ type: "pretalk", itemId: item.id, seat: b.seat }} revision={revision} days={ACTION_DAYS.pretalk} size="sm" variant="ghost">
                            Vorgespräch
                          </ActionButton>
                        )
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="muted small">
              Im Vorgespräch erfährst du, wohin jemand neigt und worauf es dieser Person ankommt. In der Sitzung hört sie dann genauer auf dein Argument.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
