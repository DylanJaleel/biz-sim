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
import { Disclosure } from "@/components/ui/Disclosure";
import { CompanyTabs, type CompanyPane } from "./CompanyTabs";
import { CovenantPrep } from "./CovenantPrep";
import { HelpersPanel } from "@/components/network/HelpersPanel";
import { helpersForCompany, hintsFor } from "@/lib/game/network-views";
import { ForecastTool } from "./ForecastTool";
import { LEANING_LABEL, PACE_LABEL, PHASE_LABEL } from "./labels";
import { Sparkline } from "./Sparkline";

const JUDGMENT_LABEL = {
  strong: "stark",
  fair: "vertretbar",
  weak: "schwach",
} as const;

export async function Company({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state, revision } = await currentGame();
  const found = state.startups.find((s) => s.id === id);
  if (!found || found.status === "offered" || found.status === "declined") notFound();
  const view = companyView(state, id);
  const s = view.startup;
  const m = s.metrics;
  const people = peopleOf(s.board, Boolean(s.corporate), s.flags.includes("mittelstand"));
  const active = s.status === "active";
  const item = view.item;
  const corporate = Boolean(s.corporate);
  const board = corporate ? "Aufsichtsrat" : "Beirat";
  const prepDays = (days: number) => (view.analyst ? 0 : days);
  const canSit = view.agenda.length > 0 && (view.sitting || view.daysLeft >= ACTION_DAYS.meeting);
  const panes: CompanyPane[] = [
    ...(view.agenda.length > 0 || active ? [{ id: "agenda", label: "Tagesordnung" }] : []),
    { id: "zahlen", label: "Zahlen" },
    ...(!corporate ? [{ id: "anteile", label: "Gesellschafter" }] : []),
    ...(view.agenda.length > 0 || view.followUps.length > 0 ? [{ id: "auflagen", label: "Auflagen" }] : []),
    ...(active && !corporate ? [{ id: "rechner", label: "Rechner" }] : []),
    ...(view.past.length > 0 ? [{ id: "entscheidungen", label: "Entscheidungen" }] : []),
    { id: "beirat", label: board },
  ];

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
          <span className="company__pills">
            {s.stage && <span className="pill">{s.stage}</span>}
            <span className="pill">{PHASE_LABEL[s.phase]}</span>
            {active && s.pace && s.pace.kind !== "normal" && (
              <span className={`pill pill--pace-${s.pace.kind}`} title={s.pace.kind === "busy" ? s.pace.reason : "Gerade stehen wenige Themen an."}>
                {PACE_LABEL[s.pace.kind]}
              </span>
            )}
          </span>
        </div>
        {s.status === "dead" && <p className="notice notice--bad">Insolvent. Dein Anteil ist verloren. Was hätte man früher sehen können?</p>}
        {s.status === "sold" && <p className="notice notice--bad">Deinen Anteil musstest du mit Abschlag verkaufen, um flüssig zu bleiben.</p>}
        {s.status === "exited" && <p className="notice notice--good">Verkauft für {eur(s.exitValue ?? 0)}. Dein Erlös ist in deinem Privatkapital.</p>}
        {view.associate && active && (
          <p className="notice">
            {view.associate} betreut dieses Mandat. Vorlagen, die du bis Monatsende nicht selbst entscheidest, entscheidet {view.associate.split(" ")[0]} für dich.
          </p>
        )}
        {s.flags.includes("mittelstand") && active && s.stake > 50 && !s.lbo && (
          <p className="notice">Du hältst die Mehrheit. Verdient die Firma Geld, schüttet sie jedes Quartal aus, was über drei Monatskosten in der Kasse liegt.</p>
        )}
        {s.lbo && active && (
          <p className="notice">
            Gekauft mit Bankkredit: Die Firma zahlt Zins und Tilgung, die Bank prüft jedes Quartal den Covenant. Ausschüttungen gibt es nur bei niedriger Verschuldung.{" "}
            <Link href={`/plattform/${s.id}`}>{s.platform ? "Zur Plattform" : "Schulden, Covenant und Buy-and-Build"}</Link>
          </p>
        )}
        {corporate && (
          <p className="notice">Du sitzt im Aufsichtsrat: keine Anteile, feste Vergütung, eine Sitzung pro Quartal. Du kontrollierst den Vorstand, du führst nicht selbst.</p>
        )}
      </header>

      <CompanyTabs panes={panes}>
        <section className="kpis" aria-label="Kennzahlen" data-pane="zahlen">
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
            <small>{corporate ? "Firmenwert" : "Bewertung"}</small>
            <b>{eur(view.valuation)}</b>
            <span>{corporate ? "Mandat ohne Anteile" : `Dein Anteil ${s.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % = ${eur(view.stakeValue)}`}</span>
          </div>
          <div>
            <small>Team</small>
            <b>{m.team} Leute</b>
            <span>Stimmung {Math.round(m.morale)}</span>
          </div>
          <div>
            <small>{corporate ? "Vertrauen des Vorstands" : s.flags.includes("mittelstand") ? "Vertrauen der Geschäftsführung" : "Vertrauen der Gründung"}</small>
            <b>{Math.round(m.trust)}</b>
            <span className="meter" aria-hidden="true">
              <i style={{ width: `${m.trust}%` }} />
            </span>
          </div>
        </section>

        <div className="company__grid">
          <div className="company__main">
            {view.agenda.length > 1 && (
              <section className="panel agenda-head" aria-label="Tagesordnung" data-pane="agenda">
                <p className="eyebrow">
                  Tagesordnung · {view.agenda.length} Punkte{s.pace?.kind === "busy" ? ` · ${PACE_LABEL.busy}` : ""}
                </p>
                {s.pace?.kind === "busy" && s.pace.reason && <p className="agenda-head__reason">{s.pace.reason}</p>}
                <ol className="agenda-head__list">
                  {view.agenda.map((a) => (
                    <li key={a.id}>
                      <a href={`#top-${a.id}`}>{a.title}</a>
                      {a.urgent && <span className="tag tag--no">dringend</span>}
                      {a.postponed && <span className="tag tag--conditions">vertagt</span>}
                    </li>
                  ))}
                </ol>
                <p className="muted small">
                  Alle Punkte werden in einer Sitzung beraten: Der erste kostet {ACTION_DAYS.meeting} Tag, jeder weitere keinen. Vorbereitung kostet pro Punkt Tage. Was bis
                  Monatsende offen bleibt, wird einmal vertagt; Dringendes entscheidet sonst {corporate ? "der Vorstand" : "die Gründung"} allein.
                </p>
              </section>
            )}
            {view.agenda.length > 0
              ? view.agenda.map((item, n) => (
                  <section
                    key={item.id}
                    id={`top-${item.id}`}
                    className={`panel item${item.urgent ? " item--urgent" : ""}`}
                    aria-labelledby={`item-title-${item.id}`}
                    data-pane="agenda"
                  >
                    <p className="eyebrow">
                      {view.agenda.length > 1 ? `TOP ${n + 1} · ` : ""}Vorlage für den {board}
                      {item.urgent ? " · dringend" : ""}
                      {item.postponed ? " · vertagt aus dem Vormonat" : ""}
                    </p>
                    <Disclosure
                      as="h2"
                      headingId={`item-title-${item.id}`}
                      headingClass="panel__title panel__title--serif"
                      title={item.title}
                      defaultOpen={n === 0}
                      className="item__acc"
                      actions={
                        canSit && n > 0 ? (
                          <Link className="btn btn--sm btn--primary" href={`/sitzung/${item.id}`}>
                            {view.sitting ? "Punkt beraten" : "Sitzung einberufen"}
                          </Link>
                        ) : undefined
                      }
                    >
                      <p className="item__motion">{item.motion}</p>
                      <p>{item.context}</p>

                      <div className="item__options">
                        {(["go", "conditions", "no"] as const).map((v) => (
                          <div key={v} className={`option option--${v}`}>
                            <span className="option__vote">{VOTE_LABEL[v]}</span>
                            <span>{v === "conditions" ? item.covenants.options.map((c) => c.name).join(" · ") : item.outcomeLabels[v]}</span>
                          </div>
                        ))}
                      </div>

                      <p className="item__covenant-link muted small">
                        Bei „Auflagen“ wählst du in der Sitzung, welche. <a href="#auflagen">Auflagen vorbereiten</a>
                      </p>

                      <Disclosure title="Mehr vorbereiten" hint="Rückfragen, CFO, Vorgespräche" quietOnWide className="item__prep">
                        <h3 className="item__h">Rückfragen an {corporate ? "den Vorstand" : "die Gründung"}</h3>
                        <ul className="qa">
                          {item.questions.map((q) => (
                            <li key={q.id}>
                              <p className="qa__q">{q.q}</p>
                              {q.a ? (
                                <p className="qa__a">{q.a}</p>
                              ) : (
                                <ActionButton
                                  action={{
                                    type: "question",
                                    itemId: item.id,
                                    questionId: q.id,
                                  }}
                                  revision={revision}
                                  days={prepDays(ACTION_DAYS.question)}
                                  size="sm"
                                >
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
                              <span role="columnheader">{corporate ? "Wert von 1 % der Firma in 12 Monaten" : "Wert deines Anteils in 12 Monaten"}</span>
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
                            {item.covenants.plans?.map((o) => (
                              <div role="row" key={o.id} className="cfo-table__row cfo-table__row--conditions cfo-table__row--covenant">
                                <span role="cell">
                                  <b>Auflage</b> {o.name}
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
                            <p className="muted">
                              {view.analyst ? "Dein Analyst" : "Der CFO"} rechnet jede Option durch, auch die drei Auflagen: Kasse, Runway und was{" "}
                              {corporate ? "die Firma" : "dein Anteil"} in einem Jahr wert sein dürfte.
                            </p>
                            <ActionButton action={{ type: "cfo", itemId: item.id }} revision={revision} days={prepDays(ACTION_DAYS.cfo)} size="sm">
                              Durchrechnen lassen
                            </ActionButton>
                          </div>
                        )}

                        {view.agenda.length > 1 && (
                          <div className="item__talks">
                            <h3 className="item__h">Vorgespräche zu diesem Punkt</h3>
                            <div className="item__talk-row">
                              {item.members.map((m) =>
                                m.pretalked ? (
                                  <span key={m.seat} className={`tag tag--${m.leaning === "open" ? "open" : m.leaning}`}>
                                    {m.short}: {LEANING_LABEL[m.leaning ?? "open"]}
                                  </span>
                                ) : (
                                  <ActionButton
                                    key={m.seat}
                                    action={{ type: "pretalk", itemId: item.id, seat: m.seat }}
                                    revision={revision}
                                    days={ACTION_DAYS.pretalk}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    {m.short}
                                  </ActionButton>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </Disclosure>

                      <div className={`item__cta${canSit ? " item__cta--dup" : ""}`}>
                        <p className="muted">
                          {view.sitting
                            ? `Der ${board} tagt heute schon: Dieser Punkt kostet keinen weiteren Tag. Gelernt wird: ${item.lesson}.`
                            : view.daysLeft >= ACTION_DAYS.meeting
                              ? `Die Sitzung kostet ${ACTION_DAYS.meeting} Tag${view.agenda.length > 1 ? ", weitere Punkte derselben Sitzung keinen" : ""}. Gelernt wird: ${item.lesson}.`
                              : `Kein Tag mehr frei. Schließe den Monat ab: ${item.urgent ? `Dann entscheidet ${corporate ? "der Vorstand" : "die Gründung"} allein.` : "Der Punkt wird einmal vertagt."}`}
                        </p>
                        {(view.sitting || view.daysLeft >= ACTION_DAYS.meeting) && (
                          <Link className="btn btn--primary btn--lg" href={`/sitzung/${item.id}`}>
                            {view.sitting ? "Punkt beraten" : "Sitzung einberufen"}
                          </Link>
                        )}
                      </div>
                    </Disclosure>
                  </section>
                ))
              : active && (
                  <section className="panel" data-pane="agenda">
                    <p className="eyebrow">{board}</p>
                    <p className="panel__title">Keine offene Vorlage</p>
                    <p className="muted">
                      {corporate
                        ? "Der Aufsichtsrat tagt einmal im Quartal. Bis dahin führt der Vorstand."
                        : s.pace?.kind === "calm"
                          ? "Eine ruhige Phase: Die Firma arbeitet, der Beirat wird gerade kaum gebraucht. Das kann ein, zwei Monate so bleiben."
                          : "Nicht jeden Monat gibt es etwas zu entscheiden. Du kannst die Zeit nutzen, um mit der Gründung zu sprechen."}
                    </p>
                  </section>
                )}

            <CovenantPrep view={view} revision={revision} hints={view.agenda.map((i) => hintsFor(state, i.id))} />

            <section className="panel" data-pane="zahlen">
              <div className="panel__row">
                <div>
                  <p className="eyebrow">Umsatz pro Monat</p>
                  <p className="panel__title">{eur(m.revenue)}</p>
                </div>
                {active && (
                  <ActionButton action={{ type: "founderCall", startupId: s.id }} revision={revision} days={ACTION_DAYS.founderCall} size="sm" disabled={view.calledThisMonth}>
                    {view.calledThisMonth
                      ? "Diesen Monat gesprochen"
                      : corporate
                        ? "Vorstand anrufen"
                        : s.flags.includes("mittelstand")
                          ? "Geschäftsführung anrufen"
                          : "Gründung anrufen"}
                  </ActionButton>
                )}
              </div>
              <Sparkline history={s.history} current={m.revenue} />
            </section>

            {!corporate && (
              <section className="panel" id="anteile" aria-labelledby="shares-title" data-pane="anteile">
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
                {view.exits
                  .filter((e) => e.status === "open")
                  .map((e) => (
                    <Link key={e.id} href={`/verkauf/${e.id}`} className="banner">
                      <span>
                        <b>Kaufangebot:</b> {e.buyer} bietet {eur(e.price)} für die ganze Firma. Die Gesellschafter entscheiden bis Monatsende.
                      </span>
                      <span className="banner__cta">Zum Verkauf</span>
                    </Link>
                  ))}
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
                  Über 50 % machen dich zum Mehrheitsgesellschafter. Anteile bekommst du in Runden, als Leistungsanteile für gute Beiratsarbeit oder durch Kauf von anderen
                  Gesellschaftern.
                </p>
                {view.exits.some((e) => e.status !== "open") && (
                  <ul className="rounds">
                    {view.exits
                      .filter((e) => e.status !== "open")
                      .map((e) => (
                        <li key={e.id}>
                          <Link href={`/verkauf/${e.id}`}>
                            <span className="decision__month">{monthLabel(e.month)}</span>
                            <span>
                              Kaufangebot {e.buyer} · {eur(e.price)}
                            </span>
                            <span className={`tag tag--${e.status === "accepted" ? "go" : "no"}`}>
                              {e.status === "accepted" ? "verkauft" : e.status === "withdrawn" ? "zurückgezogen" : "abgelehnt"}
                            </span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            )}

            {active && !corporate && <ForecastTool startup={s} />}

            {view.past.length > 0 && (
              <section className="panel" data-pane="entscheidungen">
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
                              {p.delegated && <span className="tag">Associate</span>}
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

          <aside className="company__side" data-pane="beirat">
            <section className="panel" aria-labelledby="board-title">
              <p className="eyebrow">{board}</p>
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
                          item &&
                          view.agenda.length === 1 && (
                            <ActionButton
                              action={{
                                type: "pretalk",
                                itemId: item.id,
                                seat: b.seat,
                              }}
                              revision={revision}
                              days={ACTION_DAYS.pretalk}
                              size="sm"
                              variant="ghost"
                            >
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
            {active && !corporate && <HelpersPanel helpers={helpersForCompany(state, s.id)} revision={revision} targetId={s.id} />}
          </aside>
        </div>
      </CompanyTabs>

      {canSit && (
        <div className="company__bar">
          <span className="company__bar-text">
            <b>{view.agenda.length === 1 ? "1 Punkt offen" : `${view.agenda.length} Punkte offen`}</b>
            <small>{view.sitting ? "Der Beirat tagt schon: kein weiterer Tag." : `Die Sitzung kostet ${ACTION_DAYS.meeting} Tag.`}</small>
          </span>
          <Link className="btn btn--primary" href={`/sitzung/${view.agenda[0]!.id}`}>
            {view.sitting ? "Punkt beraten" : "Sitzung einberufen"}
          </Link>
        </div>
      )}
    </div>
  );
}
