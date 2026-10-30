"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { monthLabel, monthName } from "@/lib/game/config";
import type { Light } from "@/lib/game/cockpit-view";
import type { MonthOutlook, OutlookLink } from "@/lib/game/month-view";
import type { MonthReport, ReportLine } from "@/lib/game/types";
import { eur, signed } from "@/components/game/format";

/** Der Monatsüberblick nach „Monat abschließen“: Summe oben, Firmen nach Wirkung, kurze Bereiche für das, was jetzt ansteht. */

const COUNT_MS = 1200;
const COUNT_DELAY_MS = 250;

export function Change({ before, after, money = true }: { before: number; after: number; money?: boolean }) {
  const diff = after - before;
  const tone = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return (
    <span className={`change change--${tone}`}>
      {money ? eur(after) : after}
      <small>{money ? signed(Math.round(diff / 100) / 10, " Tsd.") : signed(diff)}</small>
    </span>
  );
}

const sEur = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "±") + eur(Math.abs(n));
const sPct = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "±") + (Math.abs(n) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " %";
const tone = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "flat");

/** Zählt von `from` auf `to`. Ohne Animation oder bei reduzierter Bewegung steht sofort das Ergebnis da. */
function useCountUp(from: number, to: number, animate: boolean): number {
  const [progress, setProgress] = useState(() =>
    animate && from !== to && typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1,
  );
  useEffect(() => {
    if (progress >= 1) return;
    let raf = 0;
    const start = performance.now() + COUNT_DELAY_MS;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Der Lauf startet einmal beim Öffnen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return from + (to - from) * (1 - Math.pow(1 - progress, 3));
}

interface Row {
  line: ReportLine;
  /** Veränderung deines Anteils am Firmenwert in Euro (Mandate: 0, kein Anteil). */
  mine: number;
  /** Veränderung des Firmenwerts in Prozent; null, wenn vorher kein Wert da war. */
  pct: number | null;
  light: Light | null;
  reason: string | null;
  reasons: string[];
  why: string;
}

const LIGHT_LABEL: Record<Light, string> = { green: "Ruhig", yellow: "Achtung", red: "Kritisch" };

function buildRows(report: MonthReport, outlook?: MonthOutlook): Row[] {
  const rows = report.lines.map((line): Row => {
    const diff = line.valuation - line.valuationBefore;
    const mine = line.corporate ? 0 : (line.stake / 100) * diff;
    const pct = line.valuationBefore > 0 ? diff / line.valuationBefore : null;
    const o = outlook?.firms[line.startupId];
    const gone = line.status === "dead" ? "Insolvent." : line.status === "exited" ? "Die Firma ist verkauft." : line.status === "sold" ? "Du hast deinen Anteil verkauft." : null;
    const light: Light | null = line.status === "dead" ? "red" : (o?.light ?? null);
    const reason = o && o.light !== "green" ? o.reason : null;
    const why = line.valueWhy ?? line.events[0] ?? gone ?? reason ?? "Keine Besonderheiten im Monat.";
    return { line, mine, pct, light, reason, reasons: o && o.light !== "green" ? o.reasons : [], why };
  });
  const size = (r: Row) => Math.abs(r.line.valuation - r.line.valuationBefore);
  return rows.sort((a, b) => Math.abs(b.mine) - Math.abs(a.mine) || size(b) - size(a) || a.line.name.localeCompare(b.line.name, "de"));
}

function Lamp({ light }: { light: Light | null }) {
  if (!light) return <span className="mbd-lamp mbd-lamp--none" aria-hidden="true" />;
  return <span className={`mbd-lamp mbd-lamp--${light}`} role="img" aria-label={LIGHT_LABEL[light]} title={LIGHT_LABEL[light]} />;
}

function FirmRow({ row, open, onToggle, index, onNavigate }: { row: Row; open: boolean; onToggle: () => void; index: number; onNavigate: () => void }) {
  const { line } = row;
  const id = `mbd-firm-${line.startupId}`;
  const arrow = line.corporate ? "" : row.mine > 0 ? "▲ " : row.mine < 0 ? "▼ " : "";
  return (
    <li className={`mbd-firm${open ? " is-open" : ""}`} style={{ "--i": Math.min(index, 8) } as React.CSSProperties}>
      <button type="button" className="mbd-firm__head" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <Lamp light={row.light} />
        <span className="mbd-firm__name">
          <b>
            {line.name}
            {line.status === "dead" && <span className="tag tag--no">insolvent</span>}
            {line.status === "exited" && <span className="tag tag--go">verkauft</span>}
            {line.status === "sold" && <span className="tag tag--no">Anteil verkauft</span>}
          </b>
          <span className="mbd-firm__why">{row.why}</span>
        </span>
        <span className={`mbd-firm__delta mbd-firm__delta--${tone(line.corporate ? line.valuation - line.valuationBefore : row.mine)}`}>
          {line.corporate ? (
            <>
              {sEur(line.valuation - line.valuationBefore)}
              <small>Mandat, kein Anteil</small>
            </>
          ) : (
            <>
              {arrow}
              {sEur(row.mine)}
              <small>{row.pct === null ? "Dein Anteil" : `Firmenwert ${sPct(row.pct)}`}</small>
            </>
          )}
        </span>
        <svg className="mbd-firm__caret" viewBox="0 0 18 18" aria-hidden="true">
          <path d="m4.5 7 4.5 4.5L13.5 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="mbd-firm__body" id={id} hidden={!open}>
        <div className="report__figures">
          <span>
            Umsatz/Monat <Change before={line.revenueBefore} after={line.revenue} />
          </span>
          <span>
            Kasse <Change before={line.cashBefore} after={line.cash} />
          </span>
          <span>
            Bewertung <Change before={line.valuationBefore} after={line.valuation} />
          </span>
          <span>
            {line.corporate ? (
              <>
                Rolle <b>Aufsichtsrat</b>
              </>
            ) : (
              <>
                Dein Anteil <b>{line.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</b>
              </>
            )}
          </span>
        </div>
        {line.valueWhy && <p className="report__why">{line.valueWhy}</p>}
        {line.events.length > 0 && (
          <ul className="report__events">
            {line.events.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
        {row.reasons.length > 0 && (
          <p className="mbd-firm__lamp">
            <b>Ampel: {row.light ? LIGHT_LABEL[row.light] : ""}.</b> {row.reasons.join(" ")}
          </p>
        )}
        {line.status === "active" && (
          <Link className="mbd-firm__go" href={`/firma/${line.startupId}`} onClick={onNavigate}>
            Zur Firma
          </Link>
        )}
      </div>
    </li>
  );
}

function LinkList({ items, onNavigate }: { items: OutlookLink[]; onNavigate: () => void }) {
  return (
    <ul className="mbd-list">
      {items.map((t, i) => (
        <li key={i}>
          <Lamp light={t.light} />
          <Link href={t.href} onClick={onNavigate}>
            {t.text}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mbd-card">
      <header>
        <h3>{title}</h3>
        {hint && <span>{hint}</span>}
      </header>
      {children}
    </section>
  );
}

export function MonthOverview({ report, outlook, animate, onClose }: { report: MonthReport; outlook?: MonthOutlook; animate: boolean; onClose: () => void }) {
  const rows = useMemo(() => buildRows(report, outlook), [report, outlook]);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const allOpen = rows.length > 0 && open.size >= rows.length;

  // Vermögen vor und nach dem Monat; ältere Berichte kennen das „Vorher“ nicht und bekommen eine Schätzung.
  const after = report.worth ?? report.playerCash + report.portfolioValue;
  const before =
    report.worthBefore ??
    (report.worth !== undefined
      ? report.worth - (report.playerCash - report.playerCashBefore) - (report.portfolioValue - report.portfolioValueBefore)
      : report.playerCashBefore + report.portfolioValueBefore);
  const diff = after - before;
  const rel = before > 0 ? diff / before : 0;
  const headline =
    Math.abs(rel) < 0.0005
      ? "Dein Vermögen bleibt stabil"
      : `Dein Vermögen ${rel > 0 ? "wächst" : "sinkt"} um ${(Math.abs(rel) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;

  const worthShown = useCountUp(before, after, animate);
  const cashShown = useCountUp(report.playerCashBefore, report.playerCash, animate);
  const holdShown = useCountUp(report.portfolioValueBefore, report.portfolioValue, animate);

  const incomeRows = report.income
    ? (
        [
          ["Beratung", report.income.consulting],
          ["Beiratsvergütung", report.income.boardFees],
          ["Zinsen und Dividenden", report.income.payouts],
          ["Lebenshaltung", report.income.living],
          ["Büromiete", report.income.rent ?? 0],
          ["Fuhrpark", report.income.vehicles ?? 0],
          ["Immobilien", report.income.estate ?? 0],
          ["Stiftung und Familie", report.income.foundation ?? 0],
          ["Gehälter", report.income.salaries ?? 0],
          ["Fondsgebühr", report.income.fundFee ?? 0],
          ["Ausschüttungen", report.income.dividends ?? 0],
          ["Kaufkredite", report.income.loans ?? 0],
          ["Aktien nach Sperrfrist", report.income.lockups ?? 0],
          ["Dispozinsen", report.income.interest],
        ] as [string, number][]
      ).filter(([, v]) => v !== 0)
    : [];
  const inSum = incomeRows.reduce((s, [, v]) => s + Math.max(0, v), 0);
  const outSum = incomeRows.reduce((s, [, v]) => s + Math.min(0, v), 0);

  const next = monthName(report.month + 1);
  const toggle = (id: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className={`mbd${animate ? " mbd--play" : ""}`}>
      <div className="mbd__scroll">
        <header className="mbd__head">
          <div className="mbd__sheet" aria-hidden="true">
            <span className="mbd__face mbd__face--old">{monthName(report.month).slice(0, 3)}</span>
            <span className="mbd__face mbd__face--new">{next.slice(0, 3)}</span>
          </div>
          <div>
            <p className="eyebrow">Monatsabschluss · {monthLabel(report.month)}</p>
            <h2 className="dialog__title">{headline}</h2>
          </div>
        </header>

        <section className="mbd__hero" aria-label="Summe des Monats">
          <div className="mbd__worth">
            <span className="mbd__lbl">Vermögen</span>
            <div className="mbd__big" aria-label={eur(after)}>
              {eur(worthShown)}
            </div>
            <span className={`mbd__chip mbd__chip--${tone(diff)}`}>
              {sEur(diff)}
              <small>{sPct(rel)} zum Vormonat</small>
            </span>
            <div className={`mbd__line mbd__line--${tone(diff)}`} aria-hidden="true">
              <i />
            </div>
          </div>
          <dl className="mbd__stats">
            <div>
              <dt>Privatkapital</dt>
              <dd>
                <span className="mbd__num">{eur(cashShown)}</span>
                <small className={`mbd__d mbd__d--${tone(report.playerCash - report.playerCashBefore)}`}>{sEur(report.playerCash - report.playerCashBefore)}</small>
              </dd>
            </div>
            <div>
              <dt>Beteiligungen</dt>
              <dd>
                <span className="mbd__num">{eur(holdShown)}</span>
                <small className={`mbd__d mbd__d--${tone(report.portfolioValue - report.portfolioValueBefore)}`}>{sEur(report.portfolioValue - report.portfolioValueBefore)}</small>
              </dd>
            </div>
            <div>
              <dt>Ruf</dt>
              <dd>
                <span className="mbd__num">{report.reputation}</span>
                <small className={`mbd__d mbd__d--${tone(report.reputation - report.reputationBefore)}`}>{signed(report.reputation - report.reputationBefore)}</small>
              </dd>
            </div>
            <div>
              <dt>Einnahmen / Ausgaben</dt>
              <dd>
                <span className="mbd__num mbd__d--up">{report.income ? sEur(inSum) : "–"}</span>
                <small className="mbd__d mbd__d--down">{report.income ? sEur(outSum) : ""}</small>
              </dd>
            </div>
          </dl>
        </section>

        <div className="mbd__cols">
          <section className="mbd__firms" aria-label="Firmen nach Wirkung">
            <header className="mbd__sechead">
              <h3>Firmen</h3>
              <span>nach Wirkung auf dein Vermögen</span>
              {rows.length > 1 && (
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => setOpen(allOpen ? new Set() : new Set(rows.map((r) => r.line.startupId)))}>
                  {allOpen ? "Alle zuklappen" : "Alle aufklappen"}
                </button>
              )}
            </header>
            {rows.length === 0 ? (
              <p className="dialog__muted">Noch keine Beteiligung. Schau in die Post: Dort liegen Angebote.</p>
            ) : (
              <ul className="mbd-firms">
                {rows.map((row, i) => (
                  <FirmRow key={row.line.startupId} row={row} index={i} open={open.has(row.line.startupId)} onToggle={() => toggle(row.line.startupId)} onNavigate={onClose} />
                ))}
              </ul>
            )}
          </section>

          <div className="mbd__side">
            {outlook && outlook.todo.length > 0 && (
              <Card title="Handlungsbedarf" hint={`${outlook.todo.length} ${outlook.todo.length === 1 ? "Punkt" : "Punkte"}`}>
                <LinkList items={outlook.todo} onNavigate={onClose} />
              </Card>
            )}
            {outlook && outlook.network.length > 0 && (
              <Card title="Netzwerk">
                <LinkList items={outlook.network} onNavigate={onClose} />
              </Card>
            )}
            {outlook && outlook.mails.length > 0 && (
              <Card title="Post" hint={`${outlook.unread} ungelesen`}>
                <ul className="mbd-list">
                  {outlook.mails.map((m) => (
                    <li key={m.href}>
                      <span className="tag">Neu</span>
                      <Link href={m.href} onClick={onClose}>
                        <b>{m.from}</b>
                        <small>{m.subject}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
                {outlook.unread > outlook.mails.length && (
                  <Link className="mbd-more" href="/post" onClick={onClose}>
                    Alle {outlook.unread} Nachrichten
                  </Link>
                )}
              </Card>
            )}
            {outlook && outlook.dates.length > 0 && (
              <Card title={`Termine im ${next}`}>
                <ul className="mbd-list">
                  {outlook.dates.map((d, i) => (
                    <li key={i}>
                      <span className="tag">{d.when}</span>
                      <Link href="/kalender" onClick={onClose}>
                        <b>{d.text}</b>
                        <small>{d.note}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {report.notes.length > 0 && (
              <Card title="Hinweise">
                <ul className="report__notes">
                  {report.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </Card>
            )}
            {incomeRows.length > 0 && (
              <details className="mbd-card mbd-income">
                <summary>
                  <h3>Privat: Einnahmen und Ausgaben</h3>
                  <span>
                    {sEur(inSum)} / {sEur(outSum)}
                  </span>
                </summary>
                <dl className="report__income">
                  {incomeRows.map(([label, v]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd className={v >= 0 ? "pos" : "neg"}>{eur(v)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        </div>
      </div>
      <footer className="mbd__foot">
        <span className="mbd__foot-note">{monthLabel(report.month + 1)}</span>
        <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>
          Weiter in den {next}
        </button>
      </footer>
    </div>
  );
}
