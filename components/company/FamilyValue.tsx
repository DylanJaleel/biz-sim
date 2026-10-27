import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { Disclosure } from "@/components/ui/Disclosure";
import { monthLabel } from "@/lib/game/config";
import type { FamilyValueView } from "@/lib/game/family";

// Für eigene Mittelstandsfirmen: Was treibt den Wert (EBITDA, Multiple,
// Schulden, Kasse), wie hat er sich zuletzt entwickelt, und was kannst du als
// Mehrheitsgesellschafter tun, wenn es mehrere Monate schlecht läuft.

const x = (n: number) => (Number.isFinite(n) && n > 0 ? `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×` : "–");
const mio = (n: number) => `${(n / 1_000_000).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mio. €`;
const pctText = (n: number) => `${(n * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;

export function FamilyValue({ view, startupId, revision, daysLeft }: { view: FamilyValueView; startupId: string; revision: number; daysLeft: number }) {
  const p = view.parts;
  const trend = view.trend.filter((t) => t.equity > 0);
  const first = trend[0];
  const last = trend[trend.length - 1];
  const change = first && last && first !== last ? last.equity / Math.max(1, first.equity) - 1 : null;
  return (
    <section className="panel family" data-pane="zahlen" aria-labelledby="family-title">
      <p className="eyebrow">Was den Wert treibt</p>
      <h2 id="family-title" className="panel__title">
        {eur(p.equity)} für die Eigentümer
      </h2>
      <table className="mna-table">
        <tbody>
          <tr>
            <th>EBITDA im Jahr · Marge {pctText(view.margin)}</th>
            <td>{eur(p.ebitda)}</td>
          </tr>
          <tr>
            <th>× Multiple</th>
            <td>{p.substance ? "nur Substanz" : x(p.multiple)}</td>
          </tr>
          <tr>
            <th>= Unternehmenswert</th>
            <td>{eur(p.ev)}</td>
          </tr>
          <tr>
            <th>+ freie Kasse (über zwei Monatskosten)</th>
            <td>{eur(p.excessCash)}</td>
          </tr>
          {view.bank > 0 && (
            <tr>
              <th>− Bankkredit</th>
              <td>{eur(view.bank)}</td>
            </tr>
          )}
          {view.vendors > 0 && (
            <tr>
              <th>− Verkäuferdarlehen</th>
              <td>{eur(view.vendors)}</td>
            </tr>
          )}
          {view.earnout && (
            <tr>
              <th>− Earn-out, so weit das Ziel erreichbar ist (offen {eur(view.earnout.open)})</th>
              <td>{eur(view.earnout.expected)}</td>
            </tr>
          )}
          <tr className="mna-table__sum">
            <th>= Eigenkapitalwert</th>
            <td>{eur(p.equity)}</td>
          </tr>
        </tbody>
      </table>
      {view.entry && (
        <p className="muted">
          Beim Kauf: EBITDA {mio(view.entry.ebitda)} × {x(view.entry.multiple)} = {mio(view.entry.ev)} Unternehmenswert, Marge {pctText(view.entry.margin)}.
        </p>
      )}
      {trend.length > 1 && (
        <>
          <p className="eyebrow">Verlauf{change !== null ? `: ${change >= 0 ? "+" : "−"}${Math.abs(Math.round(change * 100))} % in ${trend.length - 1} Monaten` : ""}</p>
          <ol className="family__trend">
            {trend.map((t) => (
              <li key={t.month}>
                <span>{monthLabel(t.month)}</span>
                <b>{mio(t.equity)}</b>
                {t.ebitda !== undefined && (
                  <small>
                    EBITDA {mio(t.ebitda)}
                    {t.multiple ? ` · ${x(t.multiple)}` : ""}
                  </small>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
      {view.diagnosis.length > 0 ? (
        <p className="notice notice--warn">{view.diagnosis.join(" ")}</p>
      ) : (
        <p className="muted">Ertrag, Marge und Führung sind im Rahmen. Der Wert schwankt mit Markt und Konjunktur.</p>
      )}
      {view.levers.length > 0 && (
        <Disclosure as="h3" headingClass="panel__title" title="Eingreifen" hint={`${view.levers.filter((l) => !l.blocker).length} möglich`} defaultOpen={view.diagnosis.length > 0}>
          <p className="muted">Als Mehrheitsgesellschafter kannst du selbst handeln. Jeder Hebel kostet Geld oder Ruhe im Betrieb; nicht jeder wirkt.</p>
          <ul className="mna-cards">
            {view.levers.map((l) => (
              <li key={l.id} className="mna-card">
                <b>{l.title}</b>
                <span className="muted">{l.text}</span>
                <small>
                  <b>Kosten:</b> {l.cost}
                </small>
                <small>
                  <b>Wirkung:</b> {l.effect}
                </small>
                <small>
                  <b>Risiko:</b> {l.risk}
                </small>
                {l.blocker && <small className="muted">{l.blocker}</small>}
                <ActionButton action={{ type: "lever", startupId, lever: l.id }} revision={revision} days={l.days} size="sm" disabled={Boolean(l.blocker) || daysLeft < l.days}>
                  Umsetzen
                </ActionButton>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </section>
  );
}
