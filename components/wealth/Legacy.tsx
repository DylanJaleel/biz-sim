import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { legacyPage, type LegacyPageView } from "@/lib/game/wealth-views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur, pct } from "@/components/game/format";
import { FoundationForm } from "./FoundationForm";
import { WealthTabs } from "./WealthTabs";
import styles from "./wealth.module.css";

// Stiftung & Dynastie: der Lebenswerk-Wert (nur Anzeige), die Stufen nach dem
// Plattform-Investor, die gemeinnützige Stiftung und die Nachfolge in der Familie.

const COLORS: Record<string, string> = { worth: "#1c9a5a", exits: "#2342f5", foundation: "#e0457b", reputation: "#e8a23a", trophies: "#9b5de5" };
const num = (n: number) => Math.round(n).toLocaleString("de-DE");

function LegacyChart({ points }: { points: LegacyPageView["history"] }) {
  if (points.length < 2) return <p className="muted small">Der Verlauf beginnt mit diesem Spielstand und wächst jedes Quartal um einen Punkt.</p>;
  const w = 640;
  const h = 200;
  const pad = { l: 36, r: 10, t: 12, b: 24 };
  const max = Math.max(10, ...points.map((p) => p.value)) * 1.1;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, max / 2, max].map((t) => Math.round(t / 10) * 10);
  return (
    <svg className={styles.chart} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Verlauf des Lebenswerk-Werts">
      {ticks.map((t) => (
        <g key={t}>
          <line className={styles.chartGrid} x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} />
          <text x={2} y={y(t) + 4}>
            {t}
          </text>
        </g>
      ))}
      <path className={styles.chartArea} d={area} />
      <path className={styles.chartLine} d={line} />
      <text x={pad.l} y={h - 4}>
        {points[0]!.label.replace(" · ", " ")}
      </text>
      <text x={w - pad.r - 110} y={h - 4}>
        {points.at(-1)!.label.replace(" · ", " ")}
      </text>
    </svg>
  );
}

function Bar({ value, max, tone }: { value: number; max: number; tone?: "warn" | "good" }) {
  return (
    <span className={`${styles.bar} ${tone === "warn" ? styles.barWarn : tone === "good" ? styles.barGood : ""}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </span>
  );
}

export async function Legacy() {
  const { state, revision } = await currentGame();
  const v = legacyPage(state);
  const f = v.foundation;
  const d = v.dynasty;
  const ds = d.state;
  const heir = d.heir;
  return (
    <div className="page legacy">
      <header className="page__head">
        <p className="eyebrow">Lebenswerk</p>
        <h1 className="page__title">Stiftung & Dynastie</h1>
        <p className="page__lead">
          Vermögen ist nur ein Teil: Verkäufe, Ruf, Tombstones und was du stiftest zählen mit. Und irgendwann führt jemand anderes dein Family Office weiter.
        </p>
      </header>

      <div className="kpis">
        <div>
          <small>Lebenswerk-Wert</small>
          <b>{v.legacy.total}</b>
          <span>{v.yearChange !== null ? `${v.yearChange >= 0 ? "+" : "−"}${Math.abs(v.yearChange)} seit Jahresbeginn` : "nur Anzeige"}</span>
        </div>
        <div>
          <small>Verwaltetes Vermögen</small>
          <b>{eur(v.aum.total)}</b>
          <span>{pct(v.aum.total / v.aum.target, 1)} von 1 Mrd. €</span>
        </div>
        <div>
          <small>Stufe</small>
          <b>{v.career}</b>
          <span>{d.inCharge ? `Generation 2 seit ${d.handedOver}` : "Generation 1"}</span>
        </div>
        <div>
          <small>Stiftung</small>
          <b>{f.state ? eur(f.state.capital) : "keine"}</b>
          <span>{f.state ? `${num(f.state.people)} Menschen gefördert` : "ab 70 Ruf, 5 Mio. €"}</span>
        </div>
      </div>

      <WealthTabs
        storageKey="boardroom:legacy-tab"
        tabs={[
          { id: "value", label: "Lebenswerk" },
          { id: "foundation", label: "Stiftung" },
          { id: "dynasty", label: "Dynastie", count: d.council ? 1 : 0 },
        ]}
      >
        <section aria-label="Lebenswerk" className={styles.two}>
          <div className="panel">
            <p className="eyebrow">Lebenswerk-Wert</p>
            <p className={styles.score}>{v.legacy.total}</p>
            <div className={styles.stack} aria-hidden="true">
              {v.legacy.parts.map((p) => (
                <i key={p.id} style={{ width: `${(p.points / Math.max(1, v.legacy.total)) * 100}%`, background: COLORS[p.id] }} />
              ))}
            </div>
            <ul className={styles.parts}>
              {v.legacy.parts.map((p) => (
                <li key={p.id}>
                  <i style={{ background: COLORS[p.id] }} aria-hidden="true" />
                  <span>
                    {p.label}
                    <small>{p.detail}</small>
                  </span>
                  <b>{num(p.points)}</b>
                </li>
              ))}
            </ul>
            <p className="muted small">Der Wert ist nur eine Anzeige: Er entscheidet nichts im Spiel, zeigt aber, was über das Geld hinaus bleibt.</p>
          </div>
          <div>
            <div className="panel">
              <h2 className="panel__title">Verlauf</h2>
              <LegacyChart points={v.history} />
            </div>
            <div className="panel">
              <h2 className="panel__title">Die Stufen danach</h2>
              <ul className={styles.ladder}>
                {v.ladder.map((s, i) => (
                  <li key={s.title} data-state={s.done ? "done" : s.next ? "next" : undefined}>
                    <span className={styles.mark}>{s.done ? "✓" : i + 1}</span>
                    <span>
                      <b>{s.title}</b>
                      <small>{s.requirement}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel">
              <h2 className="panel__title">Verwaltetes Vermögen (AuM)</h2>
              <p className="muted small">Alles, über dessen Anlage du entscheidest, egal wem es gehört. Für die Fondsfamilie zählt 1 Mrd. €.</p>
              <div className={styles.lines}>
                <div>
                  <span>Family Office (Familienvermögen)</span>
                  <span>{v.familyOffice ? eur(v.aum.familyOffice) : "noch nicht gegründet"}</span>
                </div>
                <div>
                  <span>Eigene Fonds mit dem Geld der Investoren</span>
                  <span>{eur(v.aum.funds)}</span>
                </div>
                <div>
                  <span>Stiftungskapital</span>
                  <span>{eur(v.aum.foundation)}</span>
                </div>
                <div className="sum">
                  <b>Zusammen</b>
                  <b>{eur(v.aum.total)}</b>
                </div>
              </div>
              <Bar value={v.aum.total} max={v.aum.target} />
            </div>
          </div>
        </section>

        <section aria-label="Stiftung">
          {!f.state ? (
            <div className="panel">
              <p className="eyebrow">Gemeinnützige Stiftung</p>
              <h2 className="panel__title">Etwas, das bleibt</h2>
              <p>
                Eine Stiftung ist Vermögen mit festem Zweck, das niemandem mehr gehört. Das Grundstockvermögen bleibt für immer, nur der Ertrag (etwa {pct(f.rules.yield, 0)} im
                Jahr) fließt in die Förderung. Weil der Zweck der Allgemeinheit dient, ist sie gemeinnützig: Zuwendungen bis {eur(f.rules.allowance)} in zehn Jahren erstattet das
                Finanzamt zu {pct(f.rules.taxRate, 0)}.
              </p>
              <div className={styles.grid}>
                {f.purposes.map((p) => (
                  <div key={p.id} className="panel">
                    <b>{p.label}</b>
                    <p className="muted small">
                      {p.text} Etwa {eur(p.perPerson)} je geförderter Person im Jahr.
                    </p>
                  </div>
                ))}
              </div>
              {f.blocker && <p className="muted">{f.blocker}</p>}
              <FoundationForm
                mode="found"
                amounts={f.amounts.filter((a) => a >= f.rules.minCapital)}
                refund={f.refund}
                purposes={f.purposes.map((p) => ({ id: p.id, label: p.label }))}
                cash={v.cash}
                cost={f.rules.cost}
                days={f.rules.days}
                disabled={f.blocker !== null}
                revision={revision}
              />
              <p className="muted small">
                Gründung: {eur(f.rules.cost)} für Satzung, Notar und Anerkennung, {f.rules.days} Tage. Bringt Ruf. Was gestiftet ist, kommt nie zurück und zählt nicht mehr zu
                deinem Vermögen.
              </p>
            </div>
          ) : (
            <div className={styles.two}>
              <div className="panel">
                <p className="eyebrow">Deine Stiftung</p>
                <h2 className="panel__title">{f.purposes.find((p) => p.id === f.state!.purpose)?.label}</h2>
                <div className={styles.lines}>
                  <div>
                    <span>Grundstockvermögen</span>
                    <span>{eur(f.state.capital)}</span>
                  </div>
                  <div>
                    <span>Ausschüttung im Jahr</span>
                    <span>{eur(f.yearGrant)}</span>
                  </div>
                  <div>
                    <span>Gefördert bisher</span>
                    <span>
                      {num(f.state.people)} {f.purposes.find((p) => p.id === f.state!.purpose)?.people}
                    </span>
                  </div>
                  <div>
                    <span>Ausgezahlt bisher</span>
                    <span>{eur(f.state.granted)}</span>
                  </div>
                  <div>
                    <span>Steuerlich noch abziehbar (zehn Jahre)</span>
                    <span>{eur(f.allowanceLeft)}</span>
                  </div>
                </div>
                <p className="muted small">Einmal im Jahr kommt ein Bericht, und die Stiftung bringt dir etwas Ruf.</p>
              </div>
              <div className="panel">
                <h2 className="panel__title">Zustiften</h2>
                <p className="muted small">
                  Jede volle Million bringt Ruf (höchstens +{f.rules.giftReputationMax}). Bis {eur(f.allowanceLeft)} erstattet das Finanzamt {pct(f.rules.taxRate, 0)}, darüber
                  nichts mehr.
                </p>
                <FoundationForm mode="give" amounts={[...f.amounts]} refund={f.refund} cash={v.cash} cost={0} days={f.rules.giveDays} disabled={false} revision={revision} />
                <ul className={styles.list} style={{ marginTop: 12 }}>
                  {f.state.gifts.map((g) => (
                    <li key={g.month}>
                      {eur(g.amount)} · davon {eur(g.deductible)} steuerlich abziehbar
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <section aria-label="Dynastie">
          {!v.familyOffice ? (
            <div className="panel">
              <h2 className="panel__title">Erst das Family Office</h2>
              <p className="muted">Nachfolge, Familiencharta und Familienrat beginnen mit dem Family Office.</p>
              <Link href="/holding" className="btn btn--sm">
                Zur Holding
              </Link>
            </div>
          ) : (
            <>
              {d.council && (
                <div className="panel panel--notice">
                  <p className="eyebrow">Familienrat tagt diesen Monat</p>
                  <h2 className="panel__title">{d.council.title}</h2>
                  <p>{d.council.text}</p>
                  <div className="panel__actions">
                    {d.council.options.map((o, i) => (
                      <ActionButton
                        key={o.label}
                        action={{ type: "dynasty", move: "council", choice: i }}
                        revision={revision}
                        size="sm"
                        days={d.councilDays}
                        variant={i === 0 ? "primary" : undefined}
                      >
                        {`${o.label}${o.cost ? ` (${eur(o.cost)})` : o.share ? ` (${eur(v.cash * o.share)})` : ""}`}
                      </ActionButton>
                    ))}
                  </div>
                  <p className="muted small">Ohne Antwort entscheidet die Familie ohne dich: Zusammenhalt {d.rules.councilMissed}.</p>
                </div>
              )}

              {d.inCharge ? (
                <div className={styles.two}>
                  <div className="panel">
                    <p className="eyebrow">Generation 2</p>
                    <h2 className="panel__title">{d.inCharge.name} führt das Tagesgeschäft</h2>
                    <p>
                      Seit {d.handedOver} entscheidet {d.inCharge.name} im Beirat, bei Runden und neuen Beteiligungen. Du beobachtest: Berichte kommen in die Post und in den
                      Monatsabschluss. Dein Feld ist jetzt das Familienvermögen: Anlagestrategie, Immobilien, Stiftung und der Familienrat.
                    </p>
                    <div className="panel__actions">
                      <Link href="/immobilien" className="btn btn--sm">
                        Immobilien
                      </Link>
                      <Link href="/boerse" className="btn btn--sm">
                        Börse
                      </Link>
                      <Link href="/portfolio" className="btn btn--sm">
                        Portfolio ansehen
                      </Link>
                    </div>
                  </div>
                  <div className="panel">
                    <h2 className="panel__title">Anlagestrategie des Family Office</h2>
                    <p className="muted small">Freies Geld über einer Reserve von sechs Monatskosten plus 150.000 € legt das Family Office jeden Monat nach dieser Mischung an.</p>
                    <div className={styles.grid}>
                      {d.strategies.map((s) => (
                        <div key={s.id} className="panel" data-on={ds.strategy === s.id}>
                          <b>
                            {s.label}
                            {ds.strategy === s.id ? " · aktiv" : ""}
                          </b>
                          <p className="muted small">{s.text}</p>
                          <p className="small">
                            Tagesgeld {pct(s.weights.tagesgeld, 0)}, Anleihen {pct(s.weights.anleihen, 0)}, Dividenden {pct(s.weights.dividenden, 0)}, Tech {pct(s.weights.tech, 0)}
                          </p>
                          {ds.strategy !== s.id && (
                            <ActionButton action={{ type: "dynasty", move: "strategy", strategy: s.id }} revision={revision} size="sm">
                              Wählen
                            </ActionButton>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : !heir ? (
                <>
                  <p className="muted">
                    Wer das Family Office einmal führt, bestimmt, was aus deinem Vermögen wird. Beide brauchen bei gleichem Mentoring etwa gleich lange; sie unterscheiden sich in
                    ihren Eigenschaften, nicht darin, wer besser ist.
                  </p>
                  <div className={styles.grid}>
                    {d.heirs.map((h) => (
                      <div key={h.kind} className={`panel ${styles.heir}`}>
                        <div className={styles.heirHead}>
                          <span className={`${styles.avatar} ${h.kind === "kind" ? styles.avatarWarm : ""}`}>{h.short}</span>
                          <span>
                            <b>{h.name}</b>
                            <br />
                            <span className="muted small">
                              {h.role} · {h.age} Jahre
                            </span>
                          </span>
                        </div>
                        <p className="small">{h.text}</p>
                        <div className={styles.traits}>
                          {Object.entries(h.traits).map(([k, val]) => (
                            <div key={k}>
                              <span className="muted">{k}</span>
                              <Bar value={val} max={100} />
                              <b>{val}</b>
                            </div>
                          ))}
                        </div>
                        <div className={styles.lines}>
                          <div>
                            <span>Reife heute</span>
                            <span>
                              {h.start} von {d.rules.maturity}
                            </span>
                          </div>
                          <div>
                            <span>Je Mentoring-Tag</span>
                            <span>+{h.perDay.toLocaleString("de-DE")}</span>
                          </div>
                        </div>
                        <b className="small">Dafür</b>
                        <ul className={styles.list}>
                          {h.pros.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                        <b className="small">Dagegen</b>
                        <ul className={styles.list}>
                          {h.cons.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                        {h.lost ? (
                          <span className="muted small">Hat abgesagt.</span>
                        ) : (
                          <ActionButton action={{ type: "dynasty", move: "choose", heir: h.kind }} revision={revision} size="sm" variant="primary">
                            {`${h.name.split(" ").at(-1)} aufbauen`}
                          </ActionButton>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.two}>
                  <div className={`panel ${styles.heir}`}>
                    <div className={styles.heirHead}>
                      <span className={`${styles.avatar} ${heir.kind === "kind" ? styles.avatarWarm : ""}`}>{heir.short}</span>
                      <span>
                        <p className="eyebrow" style={{ margin: 0 }}>
                          Deine Nachfolge seit {heir.since}
                        </p>
                        <b>{heir.name}</b>
                      </span>
                    </div>
                    <div>
                      <div className="small" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Reife (bereit ab {d.rules.maturity})</span>
                        <b>{Math.floor(heir.maturity)}</b>
                      </div>
                      <Bar value={heir.maturity} max={100} tone={heir.maturity >= d.rules.maturity ? "good" : undefined} />
                    </div>
                    <div>
                      <div className="small" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Zusammenhalt der Familie (ab {d.rules.cohesion})</span>
                        <b>{Math.round(ds.cohesion)}</b>
                      </div>
                      <Bar value={ds.cohesion} max={100} tone={ds.cohesion >= d.rules.cohesion ? "good" : "warn"} />
                    </div>
                    {heir.stalledUntil && (
                      <p className={styles.stress}>
                        Durststrecke bis {heir.stalledUntil}: Die Reife wächst kaum. Mit mindestens {d.rules.stallDays} Mentoring-Tagen bis dahin bleibt {heir.name} meist an Bord.
                      </p>
                    )}
                    <div className={styles.lines}>
                      <div>
                        <span>Mentoring diesen Monat</span>
                        <span>
                          {heir.daysThisMonth} von {d.rules.mentorMax} Tagen
                        </span>
                      </div>
                      <div>
                        <span>Bereit bei 1 / 2 / 3 Tagen im Monat</span>
                        <span>{[heir.readyIn.one, heir.readyIn.two, heir.readyIn.three].map((m) => (m === null ? "–" : m === 0 ? "jetzt" : `${m} Mon.`)).join(" / ")}</span>
                      </div>
                    </div>
                    <ActionButton
                      action={{ type: "dynasty", move: "mentor" }}
                      revision={revision}
                      size="sm"
                      days={1}
                      disabled={heir.daysThisMonth >= d.rules.mentorMax || v.daysLeft < 1}
                    >
                      Mentoring-Tag
                    </ActionButton>
                  </div>
                  <div>
                    <div className="panel">
                      <h2 className="panel__title">Übergabe</h2>
                      <ul className="reqs">
                        {d.checks.map((c) => (
                          <li key={c.label} className={c.done ? "is-done" : undefined}>
                            <span aria-hidden="true">{c.done ? "✓" : "○"}</span> {c.label}
                          </li>
                        ))}
                      </ul>
                      <ActionButton action={{ type: "dynasty", move: "handover" }} revision={revision} days={d.rules.handoverDays} variant="primary" disabled={!d.ready}>
                        Family Office übergeben
                      </ActionButton>
                      <p className="muted small">Danach beginnt Generation 2: {heir.name} führt das Tagesgeschäft, du beobachtest und verwaltest das Familienvermögen.</p>
                    </div>
                  </div>
                </div>
              )}

              {!d.inCharge && (
                <div className="panel">
                  <h2 className="panel__title">Familiencharta</h2>
                  <p className="muted small">
                    Regeln, solange alle sich einig sind. Jeder Artikel kostet einen Tag und {eur(d.rules.charterCost)} für die Anwältin und hebt den Zusammenhalt um{" "}
                    {d.rules.charterCohesion}. Der Familienrat tagt jedes Jahr im April.
                  </p>
                  <ul className={styles.charter}>
                    {d.charter.map((c) => (
                      <li key={c.id}>
                        <div>
                          <b>{c.title}</b>
                          <small>{c.text}</small>
                        </div>
                        {c.signed ? (
                          <span className="pos small">✓ in der Charta</span>
                        ) : (
                          <ActionButton action={{ type: "dynasty", move: "charter", article: c.id }} revision={revision} size="sm" days={1}>
                            Aufnehmen
                          </ActionButton>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </WealthTabs>
    </div>
  );
}
