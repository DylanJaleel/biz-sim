import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { daysLeft } from "@/lib/game/engine";
import { fundBlocker } from "@/lib/game/engine";
import {
  committed,
  familyRead,
  fundCards,
  fundHoldings,
  hasConcession,
  LP_KIND_LABEL,
  LPAC_OPTIONS,
  LPAC_TITLE,
  lpacChance,
  lpScore,
  nextFundBlocker,
  nextFundNo,
  ROMAN,
  targetSize,
  trackRecord,
  voteText,
  type FundCard,
} from "@/lib/game/funds";
import { CONCESSION_LABEL, FUND_FIRST_CLOSE, FUND_HARD_CAP, FUND_NEXT_INVESTED, LPAC_DAYS, ROADSHOW_DAYS } from "@/lib/game/venture-config";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";
import { Waterfall } from "./Waterfall";

// Die Fondsfamilie: Fonds I bis III, Roadshow bei Investoren, der Wasserfall
// für den ganzen Fonds und die Fragen an den Investorenbeirat (LPAC).

const x = (v: number) => `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
const pctOf = (v: number) => `${Math.round(v * 100)} %`;

function FundPanel({ card, state, open }: { card: FundCard; state: Awaited<ReturnType<typeof currentGame>>["state"]; open: boolean }) {
  const { fund, metrics: m, terms, fee } = card;
  const holdings = fundHoldings(state, fund);
  const concessions = (["esg", "fee", "lpacSeat", "keyPerson"] as const).filter((c) => hasConcession(terms, c));
  const net = fee.fee - fee.admin - fee.esg - fee.keyPerson;
  return (
    <section className="panel fund-card" aria-labelledby={`fund-${card.id}`}>
      <p className="eyebrow">
        Fonds {card.roman} · seit {monthLabel(fund.raised)}
        {fund.closed !== undefined ? " · abgewickelt" : card.investing ? ` · investiert bis ${monthLabel(card.investUntil)}` : ` · Laufzeit bis ${monthLabel(card.ends)}`}
      </p>
      <h2 id={`fund-${card.id}`} className="panel__title">
        {fund.name}
      </h2>
      <div className="kpis kpis--compact fund-kpis">
        <span>
          <small>Zusagen</small>
          <b>{eur(fund.size)}</b>
        </span>
        <span>
          <small>Investiert</small>
          <b>{pctOf(m.investedShare)}</b>
        </span>
        <span>
          <small title="Ausschüttungen an die Investoren ÷ eingezahltes Kapital">DPI</small>
          <b>{x(m.dpi)}</b>
        </span>
        <span>
          <small title="(Ausschüttungen + heutiger Wert) ÷ eingezahltes Kapital, nach Carry">TVPI</small>
          <b>{x(m.tvpi)}</b>
        </span>
        <span>
          <small>Carry bisher</small>
          <b>{eur(m.carryPaid)}</b>
        </span>
        <span>
          <small>Gebühr netto im Monat</small>
          <b>{eur(net)}</b>
        </span>
      </div>
      <div className="fund-invested" aria-label={`Investiert ${pctOf(m.investedShare)}`}>
        <i style={{ width: `${Math.min(100, m.investedShare * 100)}%` }} />
        <span className="fund-invested__mark" style={{ left: `${FUND_NEXT_INVESTED * 100}%` }} title="Ab hier kannst du den nächsten Fonds auflegen" />
      </div>
      <p className="muted small">
        Eingezahlt {eur(m.paidIn)} (Investitionen plus Gebühren) · ausgeschüttet {eur(fund.returned)} · Wert der Beteiligungen heute {eur(m.nav)} · frei {eur(fund.cash)}. Gebühr{" "}
        {(terms.fee * 100).toLocaleString("de-DE")} %{terms.stepDown ? " auf das investierte Kapital" : " auf die Zusagen"}, Carry {Math.round(terms.carry * 100)} %, Hurdle{" "}
        {Math.round(terms.hurdle * 100)} %.
        {fee.admin + fee.esg + fee.keyPerson > 0 ? ` Kosten im Monat: ${eur(fee.admin + fee.esg + fee.keyPerson)} (Verwaltung, Zugeständnisse).` : ""}
        {concessions.length > 0 ? ` Zugeständnisse: ${concessions.map((c) => CONCESSION_LABEL[c].title).join(", ")}.` : ""}
      </p>
      <Waterfall split={m.split} returned={fund.returned} total={fund.returned + m.nav} carryPaid={m.carryPaid} />
      {holdings.length > 0 && (
        <Disclosure title={`Beteiligungen (${holdings.length})`} defaultOpen={open && holdings.length <= 4}>
          <ul className="list">
            {holdings.map((h) => (
              <li key={h.id} className="list__row">
                <Link href={`/firma/${h.id}`}>{h.name}</Link>
                <span className="muted">
                  {h.status === "exited" ? "verkauft" : `${h.pct.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % · Wert ${eur(h.value)}`} · Einsatz {eur(h.cost)}
                </span>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </section>
  );
}

export async function FundsPage() {
  const { state, revision } = await currentGame();
  const cards = fundCards(state);
  const family = familyRead(state);
  const tr = trackRecord(state);
  const raising = family.raising;
  const blocker = nextFundBlocker(state);
  const no = nextFundNo(state);
  const votes = family.votes.filter((v) => v.status === "open");
  const past = family.votes
    .filter((v) => v.status !== "open")
    .slice(-6)
    .reverse();
  const aum = cards.filter((c) => c.fund.closed === undefined).reduce((sum, c) => sum + c.fund.size, 0);
  const free = daysLeft(state);
  return (
    <div className="page funds">
      <header className="page__head">
        <p className="eyebrow">Fonds</p>
        <h1 className="page__title">{cards.length > 1 ? "Deine Fondsfamilie" : "Fonds und Investoren"}</h1>
        <p className="page__lead">
          Investoren (Limited Partners, kurz LPs) geben dir Geld, du investierst es. Du bekommst eine Gebühr und Carry, aber erst, wenn die Investoren ihr Geld und eine
          Mindestrendite zurückhaben. Ihr Beirat, der LPAC, entscheidet, wenn du auf beiden Seiten des Tisches sitzt.
        </p>
        {cards.length > 0 && (
          <div className="market__summary">
            <span>
              Verwaltet <b>{eur(aum)}</b>
            </span>
            <span title="Gewichtet über alle Fonds">
              TVPI <b>{x(tr.tvpi)}</b>
            </span>
            <span>
              DPI <b>{x(tr.dpi)}</b>
            </span>
            <span title="Wie sehr die Investoren dir vertrauen (0 bis 100)">
              Vertrauen <b>{Math.round(family.trust)}</b>
            </span>
          </div>
        )}
      </header>

      {cards.length === 0 && (
        <section className="panel">
          <p className="eyebrow">Fonds I</p>
          <h2 className="panel__title">Noch kein eigener Fonds</h2>
          <p>Den ersten Fonds legst du aus dem Family Office auf. Danach öffnen sich hier Fonds II und III mit echten Investoren.</p>
          <p className="notice">{fundBlocker(state) ?? "Du kannst Fonds I jetzt in der Holding auflegen."}</p>
          <Link href="/holding" className="btn btn--sm btn--primary">
            Zur Holding
          </Link>
        </section>
      )}

      {votes.length > 0 && (
        <section className="panel lpac" aria-labelledby="lpac-title">
          <p className="eyebrow">LPAC · Investorenbeirat</p>
          <h2 id="lpac-title" className="panel__title">
            {votes.length === 1 ? "Eine Frage an den LPAC" : `${votes.length} Fragen an den LPAC`}
          </h2>
          {votes.map((v) => (
            <article key={v.id} className="lpac__vote">
              <h3>{LPAC_TITLE[v.kind]}</h3>
              <p>{voteText(state, v)}</p>
              <p className="muted small">Ohne deinen Vorschlag gilt bis Ende {monthLabel(v.due)} der Standard.</p>
              <div className="lpac__options">
                {LPAC_OPTIONS[v.kind].map((o) => (
                  <div key={o.id} className="lpac__option">
                    <b>{o.label}</b>
                    <span className="muted small">{o.text}</span>
                    <span className="small">{o.chance >= 1 ? "Kein Risiko" : `Zustimmung wahrscheinlich zu ${Math.round(lpacChance(state, v, o) * 100)} %`}</span>
                    <ActionButton
                      action={{ type: "lpac", voteId: v.id, choice: o.id }}
                      revision={revision}
                      size="sm"
                      days={o.chance < 1 || o.cost ? LPAC_DAYS : undefined}
                      disabled={(o.chance < 1 || Boolean(o.cost)) && free < LPAC_DAYS}
                    >
                      Vorschlagen
                    </ActionButton>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {cards.map((c, i) => (
        <FundPanel key={c.id} card={c} state={state} open={i === cards.length - 1} />
      ))}

      {cards.length > 0 && raising && (
        <section className="panel roadshow" aria-labelledby="roadshow-title">
          <p className="eyebrow">Roadshow · bis {monthLabel(raising.expires)}</p>
          <h2 id="roadshow-title" className="panel__title">
            Fonds {ROMAN[raising.no]}: {eur(committed(raising))} von {eur(raising.target)} zugesagt
          </h2>
          <div className="roadshow__bar" aria-hidden="true">
            <i style={{ width: `${Math.min(100, (committed(raising) / (raising.target * FUND_HARD_CAP)) * 100)}%` }} />
            <span style={{ left: `${(FUND_FIRST_CLOSE / FUND_HARD_CAP) * 100}%` }}>First Close</span>
            <span style={{ left: `${(1 / FUND_HARD_CAP) * 100}%` }}>Ziel</span>
          </div>
          <p className="muted small">
            First Close ab {eur(raising.target * FUND_FIRST_CLOSE)}, Hard Cap {eur(raising.target * FUND_HARD_CAP)}. Investoren prüfen dein Zeugnis: TVPI {x(tr.tvpi)}, DPI{" "}
            {x(tr.dpi)}. Jedes Zugeständnis gilt für alle und für immer.
          </p>
          <ul className="lps">
            {raising.lps.map((lp) => {
              const wish = lp.wish ? CONCESSION_LABEL[lp.wish] : null;
              const req = lp.minDpi !== undefined ? `will DPI ab ${x(lp.minDpi)}` : lp.minTvpi !== undefined ? `will TVPI ab ${x(lp.minTvpi)}` : "kennt dich persönlich";
              const likely = lpScore(state, lp) >= 0;
              return (
                <li key={lp.id} className={`lps__row lps__row--${lp.status}`}>
                  <span className="lps__who">
                    <b>{lp.name}</b>
                    <small className="muted">
                      {LP_KIND_LABEL[lp.kind]} · {eur(lp.amount)} · {req}
                      {wish ? ` · wünscht: ${wish.title}` : ""}
                    </small>
                    {lp.note && <small>{lp.note}</small>}
                    {lp.status === "wants" && wish && <small className="muted">{wish.text}</small>}
                  </span>
                  <span className="lps__act">
                    {lp.status === "open" && (
                      <>
                        <small className={likely ? "pos" : "neg"}>{likely ? "Zeugnis reicht" : "Zeugnis reicht kaum"}</small>
                        <ActionButton
                          action={{ type: "fund", move: "pitch", lpId: lp.id }}
                          revision={revision}
                          size="sm"
                          days={ROADSHOW_DAYS.pitch}
                          disabled={free < ROADSHOW_DAYS.pitch}
                        >
                          Ansprechen
                        </ActionButton>
                      </>
                    )}
                    {lp.status === "wants" && (
                      <>
                        <ActionButton action={{ type: "fund", move: "concede", lpId: lp.id }} revision={revision} size="sm" variant="primary">
                          Zugestehen
                        </ActionButton>
                        <ActionButton action={{ type: "fund", move: "refuse", lpId: lp.id }} revision={revision} size="sm" variant="ghost">
                          Ablehnen
                        </ActionButton>
                      </>
                    )}
                    {lp.status === "committed" && <span className="tag tag--go">zugesagt</span>}
                    {lp.status === "declined" && <span className="tag tag--no">abgesagt</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <ActionButton
            action={{ type: "fund", move: "close" }}
            revision={revision}
            variant="primary"
            days={ROADSHOW_DAYS.close}
            disabled={committed(raising) < raising.target * FUND_FIRST_CLOSE || free < ROADSHOW_DAYS.close}
          >
            Fonds {ROMAN[raising.no]} schließen ({eur(Math.min(committed(raising), raising.target * FUND_HARD_CAP))})
          </ActionButton>
        </section>
      )}

      {cards.length > 0 && !raising && no <= 3 && (
        <section className="panel" aria-labelledby="next-title">
          <p className="eyebrow">Nächster Fonds</p>
          <h2 id="next-title" className="panel__title">
            Fonds {ROMAN[no]} auflegen
          </h2>
          <p>
            Zielgröße heute etwa <b>{eur(targetSize(state, no))}</b>, je nach Ergebnis deiner bisherigen Fonds. Auf der Roadshow sprichst du Pensionskassen, Versicherungen, Family
            Offices und Dachfonds an; jeder Termin kostet einen Tag.
          </p>
          <ul className="reqs">
            <li className={blocker === null ? "is-done" : undefined}>
              <span aria-hidden="true">{blocker === null ? "✓" : "○"}</span> {cards[cards.length - 1]!.fund.name} zu mindestens {Math.round(FUND_NEXT_INVESTED * 100)} % investiert
              (heute {pctOf(cards[cards.length - 1]!.metrics.investedShare)})
            </li>
          </ul>
          {blocker && <p className="notice notice--warn">{blocker}</p>}
          <ActionButton
            action={{ type: "fund", move: "launch" }}
            revision={revision}
            variant="primary"
            days={ROADSHOW_DAYS.launch}
            disabled={Boolean(blocker) || free < ROADSHOW_DAYS.launch}
          >
            Roadshow starten
          </ActionButton>
        </section>
      )}

      {past.length > 0 && (
        <section className="panel" aria-labelledby="lpac-past">
          <p className="eyebrow">LPAC</p>
          <h2 id="lpac-past" className="panel__title">
            Bisherige Beschlüsse
          </h2>
          <ul className="list">
            {past.map((v) => (
              <li key={v.id} className="list__row">
                <b>
                  {monthLabel(v.month)} · {LPAC_TITLE[v.kind]}
                </b>
                <span className="muted">{v.result}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
