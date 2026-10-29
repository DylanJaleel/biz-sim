import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { FIT_LABEL, OP, OP_TYPE_LABEL, teamView, type OpCard } from "@/lib/game/team";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";
import { HoldingTabs } from "./HoldingTabs";
import { OpAssign } from "./OpAssign";

// Operating Partner: Profile mit Stärken je Firmentyp, Mandate mit messbarer
// Wirkung und ein Vertrag aus Gehalt, laufendem Anteil und Carry.

const pct = (n: number) => `${(n * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;

function Strengths({ c }: { c: OpCard }) {
  return (
    <dl className="op-bars">
      {c.strengths.map((s) => (
        <div key={s.type} className={s.type === c.top ? "is-top" : undefined}>
          <dt>{s.label}</dt>
          <dd>
            <span className={`op-bar op-bar--${s.fit}`} aria-hidden="true">
              <i style={{ width: `${s.value}%` }} />
            </span>
            <b>{s.value}</b>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Head({ c, sub }: { c: OpCard; sub: string }) {
  return (
    <div className="op-card__head">
      <span className="op-avatar" style={{ ["--member" as string]: c.color }} aria-hidden="true">
        {c.initials}
      </span>
      <span>
        <b>{c.name}</b>
        <small>{sub}</small>
      </span>
    </div>
  );
}

function Contract({ c, fee }: { c: OpCard; fee?: boolean }) {
  return (
    <dl className="op-terms">
      <div>
        <dt>Gehalt</dt>
        <dd>{eur(c.salary)} im Monat</dd>
      </div>
      <div>
        <dt>Laufender Anteil</dt>
        <dd>{c.running > 0 ? `${pct(c.running)} vom Wertzuwachs je Quartal` : "keiner"}</dd>
      </div>
      <div>
        <dt>Carry beim Verkauf</dt>
        <dd>{c.carry > 0 ? `${pct(c.carry)} deines Gewinns` : "verzichtet"}</dd>
      </div>
      <div>
        <dt>Kapazität</dt>
        <dd>{c.capacity} Firmen</dd>
      </div>
      {fee ? (
        <div>
          <dt>Personalberater</dt>
          <dd>{eur(c.fee)}</dd>
        </div>
      ) : (
        <div>
          <dt>Bisher ausgezahlt</dt>
          <dd>{eur(c.paid)}</dd>
        </div>
      )}
    </dl>
  );
}

export async function TeamPage() {
  const { state, revision } = await currentGame();
  const v = teamView(state);
  const led = v.companies.filter((c) => c.lead).length;
  return (
    <div className="page holding holding--team">
      <header className="page__head">
        <p className="eyebrow">Holding · Operating Partner</p>
        <h1 className="page__title">Wer für dich führt</h1>
        <p className="page__lead">
          Operating Partner betreuen deine Firmen. Du entscheidest, wer welche Firma bekommt. Passt die Person zum Firmentyp, spart sie dir Tage, entscheidet Vorlagen besser und
          senkt Risiken.
        </p>
        {v.founded && <HoldingTabs current="/holding/team" />}
      </header>

      {!v.founded ? (
        <p className="notice">
          Operating Partner stellst du im Family Office ein. <Link href="/holding">Zum Family Office</Link>
        </p>
      ) : (
        <>
          <section className="kpis" aria-label="Team in Zahlen">
            <div>
              <small>Team</small>
              <b>
                {v.team.length} von {v.max}
              </b>
              <span>Plätze im Family Office</span>
            </div>
            <div>
              <small>Kosten im Monat</small>
              <b>{eur(v.cost)}</b>
              <span>plus Anteil am Wertzuwachs</span>
            </div>
            <div>
              <small>Entlastung</small>
              <b className={v.days > 0 ? "pos" : undefined}>+{v.days} Tage</b>
              <span>im Monat, höchstens {v.daysMax}</span>
            </div>
            <div>
              <small>Betreut</small>
              <b>
                {led} von {v.companies.length}
              </b>
              <span>Firmen mit Zuständigen</span>
            </div>
          </section>

          <section className="panel" aria-labelledby="op-team">
            <h2 id="op-team" className="panel__title">
              Dein Team
            </h2>
            {v.team.length === 0 && <p className="muted">Noch niemand. Wähle unten aus den Bewerbern; jede Stelle kostet jeden Monat Gehalt.</p>}
            <ul className="op-grid">
              {v.team.map((c) => {
                const options = v.companies
                  .filter((x) => !c.mandates.some((m) => m.id === x.id))
                  .map((x) => ({ id: x.id, name: x.name, fit: x.fit[c.id!] ?? "weak", lead: x.lead }))
                  .sort((a, b) => ["good", "mid", "weak"].indexOf(a.fit) - ["good", "mid", "weak"].indexOf(b.fit));
                return (
                  <li key={c.id} className="op-card">
                    <Head
                      c={c}
                      sub={`${c.age ? `${c.age} Jahre · ` : ""}Operating Partner · Stärke ${OP_TYPE_LABEL[c.top]}${c.hired !== undefined ? ` · seit ${monthLabel(c.hired)}` : ""}`}
                    />
                    <p className="op-card__vita">{c.vita}</p>
                    <Strengths c={c} />
                    <div className="op-mandates">
                      <h3>
                        Mandate{" "}
                        <span className="muted">
                          {c.mandates.length} von {c.capacity}
                        </span>
                      </h3>
                      {c.mandates.length === 0 && <p className="muted small">Noch keine Firma. Ohne Mandat bringt die Person nur ihr Netzwerk mit.</p>}
                      <ul>
                        {c.mandates.map((m) => (
                          <li key={m.id}>
                            <span className="op-mandate__top">
                              <Link href={`/firma/${m.id}`}>{m.name}</Link>
                              <span className={`op-fit op-fit--${m.fit}`}>{FIT_LABEL[m.fit]}</span>
                              <ActionButton action={{ type: "assign", memberId: c.id!, startupId: null, from: m.id }} revision={revision} size="sm" variant="ghost">
                                Abziehen
                              </ActionButton>
                            </span>
                            <span className="muted small">
                              {OP_TYPE_LABEL[m.type]} · seit {monthLabel(m.since)} · {m.effects.join(" · ")}
                              {m.created > 0 ? ` · Wertzuwachs seitdem ${eur(m.created)}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {c.claims.length > 0 && (
                        <p className="muted small">
                          Carry-Anspruch bleibt (unverfallbar nach {v.vestMonths} Monaten): {c.claims.map((x) => x.name).join(", ")}.
                        </p>
                      )}
                      <OpAssign memberId={c.id!} options={options} full={c.mandates.length >= c.capacity} revision={revision} />
                    </div>
                    <p className="op-card__style">{c.style}</p>
                    <Contract c={c} />
                    <div className="op-card__actions">
                      <ActionButton action={{ type: "fire", memberId: c.id! }} revision={revision} size="sm" variant="ghost">
                        Entlassen
                      </ActionButton>
                      <span className="muted small">{c.carry > 0 ? "Wer geht, verliert seinen Carry." : c.legacy ? "Alter Vertrag ohne Beteiligung." : ""}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {v.candidates.length > 0 && (
            <section className="panel" aria-labelledby="op-candidates">
              <div className="op-section-head">
                <h2 id="op-candidates" className="panel__title">
                  Bewerber
                </h2>
                <span className="muted small">
                  Personalberater: {Math.round(v.recruiter * 100)} % vom Jahresgehalt, {v.hireDays} Tage Gespräche
                </span>
              </div>
              <ul className="op-grid">
                {v.candidates.map((c) => (
                  <li key={c.profileId} className="op-card op-card--candidate">
                    <Head c={c} sub={`${c.age} Jahre · Bewerbung · Stärke ${OP_TYPE_LABEL[c.top]}`} />
                    <p className="op-card__vita">{c.vita}</p>
                    <Strengths c={c} />
                    <p className="op-card__style">{c.style}</p>
                    <Contract c={c} fee />
                    <ActionButton
                      action={{ type: "hire", role: "operating", profile: c.profileId }}
                      revision={revision}
                      days={v.hireDays}
                      variant="primary"
                      size="sm"
                      disabled={Boolean(c.blocker)}
                    >
                      Einstellen
                    </ActionButton>
                    {c.blocker && <span className="muted small">{c.blocker}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel" aria-labelledby="op-how">
            <Disclosure as="h2" headingId="op-how" headingClass="panel__title" title="So wirkt ein Operating Partner">
              <ul className="op-rules">
                <li>
                  <b>Passung:</b> Stärke ab 75 passt gut, ab 55 mittel, darunter kaum. Je Firma spart das {OP.days.good.toLocaleString("de-DE")} /{" "}
                  {OP.days.mid.toLocaleString("de-DE")} / {OP.days.weak.toLocaleString("de-DE")} Tage im Monat, zusammen höchstens {OP.daysMax}.
                </li>
                <li>
                  <b>Beirat:</b> Vorlagen, die du bis Monatsende nicht selbst entscheidest, entscheidet der Partner. Er findet die beste Option in {Math.round(OP.skill.good * 100)}{" "}
                  / {Math.round(OP.skill.mid * 100)} / {Math.round(OP.skill.weak * 100)} % der Fälle.
                </li>
                <li>
                  <b>Mittelstand:</b> Übergaberisiken nach dem Kauf sinken um {Math.round((1 - OP.handover.good) * 100)} / {Math.round((1 - OP.handover.mid) * 100)} %.
                </li>
                <li>
                  <b>Plattform:</b> Der Partner bereitet Zukäufe vor: mehr Kandidaten, die Passung ist vorab geprüft, der Kauf dauert einen Tag weniger, eine Integration mehr
                  gleichzeitig und bessere Chancen auf Synergien.
                </li>
                <li>
                  <b>Vergütung:</b> Grundgehalt jeden Monat. Jedes Quartal ein kleiner Anteil am neuen Wertzuwachs der betreuten Firmen (nur über dem bisherigen Höchststand). Der
                  Großteil kommt als Carry erst beim Verkauf: ein Anteil an deinem Gewinn seit Beginn des Mandats. Nach {OP.vestMonths} Monaten bleibt der Anspruch, auch wenn du
                  das Mandat wechselst; wer entlassen wird, verliert ihn.
                </li>
              </ul>
            </Disclosure>
          </section>
          <p className="muted small">
            Lernkarte im <Link href="/notizbuch">Notizbuch</Link>: Operating Partner. Wer zuständig ist, siehst du auch im <Link href="/portfolio">Portfolio</Link>.
          </p>
        </>
      )}
    </div>
  );
}
