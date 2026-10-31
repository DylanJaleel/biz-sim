import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { daysLeft } from "@/lib/game/engine";
import { familyRead, investingFundRead, LPAC_TITLE } from "@/lib/game/funds";
import { building, FIT_LABEL, milestone, nextTranche, studioBlocker, studioCompanies, studioRead, trancheAmount } from "@/lib/game/studio";
import {
  STUDIO_BUILD_MONTHS,
  STUDIO_CEO_MIN,
  STUDIO_DAYS,
  STUDIO_ESOP,
  STUDIO_EXITS,
  STUDIO_FOUND_DAYS,
  STUDIO_MAX,
  STUDIO_POOL_MONTHS,
  STUDIO_REPUTATION,
  STUDIO_TRANCHE_DAYS,
  TRANCHE_SIZE,
} from "@/lib/game/venture-config";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { FoundForm } from "./FoundForm";

// Venture Studio: Ideen aus dem Pool, ein CEO, Geld in Tranchen an Meilensteinen.

const RISK_LABEL = { low: "geringes Risiko", mid: "mittleres Risiko", high: "hohes Risiko" } as const;

export async function StudioPage() {
  const { state, revision } = await currentGame();
  const blocker = studioBlocker(state);
  const studio = studioRead(state);
  const inBuild = building(state);
  const companies = studioCompanies(state);
  const free = daysLeft(state);
  const fund = investingFundRead(state);
  const votes = familyRead(state).votes;
  const exits = state.exits.filter((e) => e.status === "accepted").length;
  const nextPool = (studio.period + 1) * STUDIO_POOL_MONTHS;
  return (
    <div className="page studio">
      <header className="page__head">
        <p className="eyebrow">Venture Studio</p>
        <h1 className="page__title">Eigene Firmen aufbauen</h1>
        <p className="page__lead">
          Du wartest nicht auf Gründer: Du wählst die Idee, holst einen CEO und gibst das Geld in Tranchen frei, wenn ein Meilenstein steht. Am Anfang hältst du die Mehrheit. Bis
          zu {STUDIO_MAX} Firmen gleichzeitig im Aufbau, jede kostet dich {STUDIO_DAYS} Tage im Monat.
        </p>
        <div className="market__summary">
          <span>
            Im Aufbau{" "}
            <b>
              {inBuild.length} von {STUDIO_MAX}
            </b>
          </span>
          <span>
            Studio-Tage im Monat <b>{inBuild.length * STUDIO_DAYS}</b>
          </span>
          <span>
            Gegründet <b>{studio.founded}</b>
          </span>
        </div>
      </header>

      {blocker && (
        <section className="panel">
          <p className="eyebrow">Noch geschlossen</p>
          <h2 className="panel__title">Das Studio öffnet sich später</h2>
          <ul className="reqs">
            <li className={state.reputation >= STUDIO_REPUTATION ? "is-done" : undefined}>
              <span aria-hidden="true">{state.reputation >= STUDIO_REPUTATION ? "✓" : "○"}</span> Ruf {STUDIO_REPUTATION} (heute {state.reputation})
            </li>
            <li className={exits >= STUDIO_EXITS ? "is-done" : undefined}>
              <span aria-hidden="true">{exits >= STUDIO_EXITS ? "✓" : "○"}</span> {STUDIO_EXITS} erfolgreiche Verkäufe (bisher {exits})
            </li>
          </ul>
          <p className="muted">{blocker}</p>
        </section>
      )}

      {companies.length > 0 && (
        <section className="panel" aria-labelledby="studio-firms">
          <p className="eyebrow">Deine Studio-Firmen</p>
          <h2 id="studio-firms" className="panel__title">
            Tranchen und Meilensteine
          </h2>
          <ul className="studio-firms">
            {companies.map((s) => {
              const i = nextTranche(s);
              const ms = i > 0 ? milestone(s, i) : null;
              const vote = s.studio!.fundVote ? votes.find((v) => v.id === s.studio!.fundVote) : undefined;
              const active = s.status === "active";
              return (
                <li key={s.id} className="studio-firm">
                  <div className="studio-firm__head">
                    <Link href={`/firma/${s.id}`}>
                      <b>{s.name}</b>
                    </Link>
                    <span className="muted small">
                      {s.tagline} · seit {monthLabel(s.studio!.founded)} · dein Anteil {s.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %
                      {!active
                        ? s.status === "dead"
                          ? " · insolvent"
                          : " · verkauft"
                        : s.studio!.built !== undefined
                          ? " · aus dem Studio entlassen"
                          : ` · ${STUDIO_DAYS} Tage im Monat`}
                    </span>
                  </div>
                  <ol className="tranches">
                    {s.studio!.tranches.map((t, k) => {
                      const m = k > 0 ? milestone(s, k) : null;
                      return (
                        <li key={t.label} className={t.released !== undefined ? "is-done" : k === i ? "is-next" : undefined}>
                          <b>{t.label}</b>
                          <small>
                            {t.released !== undefined ? `${eur(t.amount ?? 0)} · ${monthLabel(t.released)}` : `${Math.round(t.share * 100)} % · ${eur(trancheAmount(s, k))}`}
                          </small>
                          {t.released === undefined && m && (
                            <span className="meter" aria-label={m.text}>
                              <i style={{ width: `${Math.round(m.progress * 100)}%` }} />
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {active && ms && (
                    <div className="studio-firm__next">
                      <p className="small">
                        Nächste Tranche „{ms.label}“: {ms.text}. {ms.done ? "Erreicht: Du kannst freigeben und verhandeln." : "Noch nicht erreicht."}
                      </p>
                      {ms.done && (
                        <div className="studio-firm__sizes">
                          {(["lean", "plan", "big"] as const).map((size) => (
                            <div key={size} className="studio-size">
                              <b>{TRANCHE_SIZE[size].label}</b>
                              <small className="muted">
                                {eur(trancheAmount(s, i, size))}
                                {TRANCHE_SIZE[size].shift !== 0
                                  ? ` · ${TRANCHE_SIZE[size].shift > 0 ? "+" : "−"}${Math.abs(TRANCHE_SIZE[size].shift)} Punkte Anteil für dich`
                                  : " · Anteile bleiben"}
                              </small>
                              <ActionButton
                                action={{ type: "studio", move: "tranche", startupId: s.id, size }}
                                revision={revision}
                                size="sm"
                                variant={size === "plan" ? "primary" : undefined}
                                days={STUDIO_TRANCHE_DAYS}
                                disabled={free < STUDIO_TRANCHE_DAYS || state.cash < trancheAmount(s, i, size)}
                              >
                                Freigeben
                              </ActionButton>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {active && (
                    <p className="small muted studio-firm__fund">
                      {vote ? (
                        <>
                          {LPAC_TITLE.studio}: {vote.status === "open" ? <Link href="/fonds">liegt beim LPAC</Link> : vote.result}
                        </>
                      ) : fund ? (
                        <>
                          {fund.name} könnte mitfinanzieren. Weil das deine eigene Firma ist, muss der Investorenbeirat (LPAC) zustimmen.{" "}
                          <ActionButton action={{ type: "studio", move: "fundAsk", startupId: s.id }} revision={revision} size="sm" variant="ghost">
                            Fonds fragen
                          </ActionButton>
                        </>
                      ) : (
                        "Mit einem eigenen Fonds könnte die Firma auch Geld vom Fonds bekommen (nach Zustimmung des LPAC)."
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!blocker && (
        <section className="panel" aria-labelledby="pool-title">
          <p className="eyebrow">Ideenpool · neu gemischt ab {monthLabel(nextPool)}</p>
          <h2 id="pool-title" className="panel__title">
            Welche Firma baust du?
          </h2>
          <p className="muted small">
            Ideen mit Pilotkunde aus deinem Portfolio sind sicherer. Die Firma braucht {STUDIO_BUILD_MONTHS} Monate Aufbau oder bis alle Tranchen draußen sind; danach ist sie eine
            Beteiligung wie jede andere.
          </p>
          {inBuild.length >= STUDIO_MAX && <p className="notice">Zwei Firmen sind im Aufbau. Eine neue gründest du, wenn eine davon aus dem Studio entlassen ist.</p>}
          <ul className="ideas">
            {studio.pool.map((idea) => (
              <li key={idea.id} className="idea">
                <div className="idea__head">
                  <b>{idea.name}</b>
                  <span className={`tag tag--${idea.risk === "high" ? "no" : idea.risk === "mid" ? "conditions" : "go"}`}>{RISK_LABEL[idea.risk]}</span>
                </div>
                <p className="small">
                  {idea.tagline} · {idea.sector}
                </p>
                <p className="muted small">{idea.pitch}</p>
                <p className="small">
                  Markt {idea.market} von 100 · Bedarf {eur(idea.need)}
                  {idea.pilot ? ` · Pilotkunde: ${idea.pilot}` : ""}
                </p>
                <FoundForm
                  ideaId={idea.id}
                  need={idea.need}
                  ceos={idea.ceos.map((c) => ({ name: c.name, fit: FIT_LABEL[c.fit], strength: c.strength, ask: c.ask, ...(c.via ? { via: c.via } : {}) }))}
                  revision={revision}
                  days={STUDIO_FOUND_DAYS}
                  esop={STUDIO_ESOP}
                  minCeo={STUDIO_CEO_MIN}
                  disabled={inBuild.length >= STUDIO_MAX || free < STUDIO_FOUND_DAYS}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
