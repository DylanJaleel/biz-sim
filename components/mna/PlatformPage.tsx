import Link from "next/link";
import { HelpersPanel } from "@/components/network/HelpersPanel";
import { specialistsFor } from "@/lib/game/network-views";
import { notFound, redirect } from "next/navigation";
import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { platformRedirect, platformView } from "@/lib/game/mna-views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur, pct } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";
import { SaleForm } from "./SaleForm";

// Eine gekaufte Firma mit Bankkredit: Schulden, Covenant, Zukäufe,
// Integration und am Ende der Verkauf der Gruppe.

const x = (n: number) => (Number.isFinite(n) ? `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×` : "–");
const STATUS = {
  ok: { label: "Die Bank ist zufrieden", tone: "notice--good" },
  watch: { label: "Covenant gebrochen: Zinsaufschlag, keine Ausschüttung, kein Zukauf", tone: "notice--warn" },
  cure: { label: "Die Bank verlangt frisches Eigenkapital", tone: "notice--bad" },
} as const;

export async function PlatformPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state, revision } = await currentGame();
  const v = platformView(state, id);
  if (!v) {
    const next = platformRedirect(state, id);
    if (next) redirect(next);
    notFound();
  }
  const p = v.platform;
  const lbo = v.lbo;
  const headroom = Math.max(0, Math.min(1, (Number.isFinite(v.leverage) ? v.leverage : v.covenant) / v.covenant));
  return (
    <div className="page mna mna--platform">
      <header className="page__head">
        <nav className="crumbs" aria-label="Pfad">
          <Link href="/nachfolge">Nachfolge-Programm</Link>
          <span aria-hidden="true">/</span>
          <span>{v.name}</span>
        </nav>
        <p className="eyebrow">
          {p ? "Buy-and-Build-Plattform" : "Gekaufter Familienbetrieb"} · {v.sector}
        </p>
        <h1 className="page__title">{v.name}</h1>
        <p className="page__lead">
          Gekauft {monthLabel(lbo.acquired)} für {eur(lbo.entryEv)} ({x(v.entryMultiple)} EBITDA). Dein Geld bisher: {eur(lbo.equity)}.{" "}
          <Link href={`/firma/${v.id}`}>Zur Firmenseite mit Beirat</Link>
        </p>
      </header>

      <section className="kpis" aria-label="Kennzahlen">
        <div>
          <small>EBITDA im Jahr</small>
          <b>{eur(v.ebitda)}</b>
          <span>Marge {pct(v.margin)}</span>
        </div>
        <div>
          <small>Unternehmenswert</small>
          <b>{eur(v.ev)}</b>
          <span>{x(v.multiple)} EBITDA heute</span>
        </div>
        <div>
          <small>Verschuldung</small>
          <b className={v.leverage > v.covenant ? "neg" : undefined}>{x(v.leverage)}</b>
          <span className="meter" aria-hidden="true">
            <i style={{ width: `${headroom * 100}%` }} />
          </span>
          <span>Grenze der Bank {x(v.covenant)}</span>
        </div>
        <div>
          <small>Dein Anteil</small>
          <b>{eur(v.myValue)}</b>
          <span>
            {v.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % · {x(v.moic)} deines Geldes
          </span>
        </div>
      </section>

      {!v.active && <p className="notice">Diese Firma gehört dir nicht mehr.</p>}

      <section className="panel" aria-labelledby="bank-title">
        <p className="eyebrow">Bank und Verkäufer</p>
        <h2 id="bank-title" className="panel__title">
          Schulden
        </h2>
        <p className={`notice ${STATUS[lbo.status].tone}`}>{STATUS[lbo.status].label}</p>
        {lbo.status === "cure" && lbo.cure && (
          <div className="panel__actions">
            <ActionButton action={{ type: "platform", startupId: v.id, move: "cure" }} revision={revision} days={1} variant="danger" disabled={v.playerCash < lbo.cure.amount}>
              {`${eur(lbo.cure.amount)} nachschießen (Equity Cure)`}
            </ActionButton>
            <span className="muted small">Frist: Ende {monthLabel(lbo.cure.due)}. Sonst verkauft die Bank die Firma zu einem Notpreis.</span>
          </div>
        )}
        <ul className="list">
          <li className="list__row">
            <b>Bankkredit</b>
            <span className="muted">
              {eur(lbo.bank)} · {pct(lbo.rate)} Zins · {eur(lbo.payment)} Rate im Monat
            </span>
          </li>
          {lbo.vendors.map((d) => (
            <li key={d.label} className="list__row">
              <b>{d.label}</b>
              <span className="muted">
                {eur(d.amount)} · fällig {monthLabel(d.due)}
              </span>
            </li>
          ))}
          {lbo.earnouts.map((e) => (
            <li key={e.label} className="list__row">
              <b>{e.label}</b>
              <span className="muted">
                {eur(e.amount)} · fällig {monthLabel(e.due)}, wenn das EBITDA mindestens {eur(e.target)} beträgt
              </span>
            </li>
          ))}
          <li className="list__row">
            <b>Kasse der Firma</b>
            <span className="muted">
              {eur(v.cash)} · Ausschüttungen {v.dividends ? "erlaubt" : `gesperrt (erst unter ${x(v.dividendMax)} Verschuldung und ohne Covenant-Bruch)`}
            </span>
          </li>
          {v.searcher && (
            <li className="list__row">
              <b>{v.searcher.name}</b>
              <span className="muted">Geschäftsführung aus dem Nachfolge-Programm · hält {v.searcher.pct.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</span>
            </li>
          )}
        </ul>
      </section>

      {v.active && (
        <HelpersPanel
          helpers={specialistsFor(state, id)}
          revision={revision}
          targetId={id}
          title="Spezialisten aus deinem Netzwerk"
          lead="Eine Bankerin, die den Covenant lockert, oder eine Interim-Managerin, die Übergabe und Integration zusammenhält."
        />
      )}

      {!p && v.active && (
        <section className="panel" aria-labelledby="make-title">
          <p className="eyebrow">Buy-and-Build</p>
          <h2 id="make-title" className="panel__title">
            Zur Plattform machen
          </h2>
          <p>
            Als Plattform kauft die Firma kleinere Wettbewerber derselben Branche dazu. Klein kaufen ist billig, die größere Gruppe ist pro Euro EBITDA mehr wert. Dafür brauchst du
            ein Team, Geduld mit der Integration und eine Bank, die mitzieht.
          </p>
          {v.makeBlocker && <p className="notice notice--warn">{v.makeBlocker}</p>}
          <ActionButton
            action={{ type: "platform", startupId: v.id, move: "make" }}
            revision={revision}
            days={v.makeDays}
            variant="primary"
            disabled={Boolean(v.makeBlocker) || v.playerCash < v.makeCost}
          >
            {`Plattform-Strategie beauftragen (${eur(v.makeCost)})`}
          </ActionButton>
        </section>
      )}

      {p && (
        <>
          <section className="panel" aria-labelledby="targets-title">
            <p className="eyebrow">Zukäufe</p>
            <Disclosure as="h2" headingId="targets-title" headingClass="panel__title" title="Kandidaten" hint={`${v.targets.length}`} defaultOpen={v.targets.length > 0}>
              {v.targets.length === 0 ? (
                <p className="muted">Gerade keine. Neue Kandidaten kommen alle paar Monate, öfter mit Partnerin und warmem Draht zum Deal-Flow.</p>
              ) : (
                <ul className="list mna-rows">
                  {v.targets.map((t) => (
                    <li key={t.id} className="list__row">
                      {t.status === "review" ? <b>{t.name}</b> : <Link href={`/uebernahme/${t.id}`}>{t.name}</Link>}
                      <span className="muted small">
                        EBITDA {eur(t.ebitda)} · {eur(t.ev)} ({x(t.multiple)}) {t.status === "review" ? "· beim Kartellamt" : `· bis ${monthLabel(t.expires)}`}
                      </span>
                      {t.status === "open" && (
                        <Link className="btn btn--sm" href={`/uebernahme/${t.id}`}>
                          Prüfen und kaufen
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Disclosure>
          </section>

          <section className="panel" aria-labelledby="int-title">
            <p className="eyebrow">Integration</p>
            <Disclosure
              as="h2"
              headingId="int-title"
              headingClass="panel__title"
              title={
                p.integrations.length === 0
                  ? "Keine Integration läuft"
                  : `${p.integrations.length} Integration${p.integrations.length > 1 ? "en" : ""} (dein Team schafft ${v.capacity})`
              }
              defaultOpen={p.integrations.length > 0}
            >
              <ul className="list">
                {v.integrations.map((i) => (
                  <li key={i.name} className="list__row">
                    <b>{i.name}</b>
                    <span className="muted small">
                      {i.kind === "fast" ? "schnell" : "behutsam"} · noch {i.left} Monat{i.left === 1 ? "" : "e"} · {eur(i.cost)} Kosten im Monat · EBITDA {eur(i.ebitda)}
                    </span>
                  </li>
                ))}
              </ul>
              {p.addons.length > 0 && (
                <Disclosure title={p.addons.length === 1 ? "Bisher ein Zukauf" : `Bisher ${p.addons.length} Zukäufe`} as="h3">
                  <ul className="list">
                    {p.addons.map((a) => (
                      <li key={`${a.name}-${a.month}`} className="list__row">
                        <b>{a.name}</b>
                        <span className="muted small">
                          {monthLabel(a.month)} · {eur(a.ev)} · {x(a.multiple)} EBITDA
                        </span>
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </Disclosure>
          </section>

          <section className="panel" aria-labelledby="sale-title">
            <p className="eyebrow">Exit</p>
            <Disclosure
              as="h2"
              headingId="sale-title"
              headingClass="panel__title"
              title="Die Gruppe verkaufen"
              hint={v.exitId ? "Angebot liegt vor" : p.sale ? "läuft" : undefined}
              defaultOpen={Boolean(v.exitId || p.sale)}
            >
              {v.exitId ? (
                <p>
                  Ein Angebot liegt vor. <Link href={`/verkauf/${v.exitId}`}>Zur Gesellschafterversammlung</Link>
                </p>
              ) : p.sale ? (
                <>
                  <p>
                    {p.sale.process === "auction" ? "Bieterverfahren" : "Exklusiver Verkauf"} an {p.sale.buyers === "strategic" ? "Konzerne" : "Finanzinvestoren"} läuft seit{" "}
                    {monthLabel(p.sale.started)}. Das Angebot kommt zum Ende von {monthLabel(p.sale.due)}.
                  </p>
                  <ActionButton action={{ type: "platform", startupId: v.id, move: "stopSale" }} revision={revision} variant="ghost" size="sm">
                    Verkauf abbrechen
                  </ActionButton>
                </>
              ) : (
                <>
                  <p className="muted small">
                    Käufer zahlen das Multiple einer Gruppe dieser Größe. Laufende Integrationen und ein gebrochener Covenant drücken den Preis. Die Schulden werden aus dem Erlös
                    bezahlt.
                  </p>
                  {v.active && <SaleForm id={v.id} revision={revision} days={v.saleDays} months={v.saleMonths} />}
                </>
              )}
            </Disclosure>
          </section>
        </>
      )}
    </div>
  );
}
