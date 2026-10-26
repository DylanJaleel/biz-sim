import { getDb } from "@/lib/db";
import { ASSUMED_CU, IDLE_SECONDS, NEON_PRICES, usageReport } from "@/lib/usage";

const usd = (value: number) => `${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const num = (value: number, digits = 1) => value.toLocaleString("de-DE", { maximumFractionDigits: digits });

const STATUS = {
  ok: { label: "Im Rahmen", text: "Die Hochrechnung liegt deutlich unter dem Budget." },
  warn: { label: "Knapp", text: "Die Hochrechnung nähert sich dem Budget. Ist es erreicht, pausieren Spielzüge bis zum Monatsende." },
  stopped: { label: "Budget erreicht", text: "Spielzüge pausieren bis zum Monatsende. Ansehen geht weiter, dein Spielstand bleibt erhalten." },
} as const;

/** What the database costs this month, as far as the game can tell, and the budget that stops play. */
export async function UsageCard() {
  let report;
  try {
    report = await usageReport(getDb());
  } catch {
    return null;
  }
  const status = STATUS[report.status];
  const share = Math.min(1, report.projectedUsd / report.budgetUsd);

  return (
    <section className="panel usage" aria-labelledby="usage-title">
      <p className="eyebrow">Kosten der Datenbank</p>
      <h2 id="usage-title" className="panel__title">
        {usd(report.totalUsd)} bisher, etwa {usd(report.projectedUsd)} im Monat
      </h2>
      <p className={`usage__status usage__status--${report.status}`}>
        <b>{status.label}.</b> {status.text}
      </p>
      <span className="meter" aria-label={`Hochrechnung ${Math.round(share * 100)} % des Budgets`}>
        <i style={{ width: `${Math.round(share * 100)}%` }} />
      </span>
      <dl className="usage__list">
        <div>
          <dt>Monatsbudget</dt>
          <dd>{usd(report.budgetUsd)}</dd>
        </div>
        <div>
          <dt>Rechenzeit</dt>
          <dd>
            {num(report.activeHours)} h · {usd(report.computeUsd)}
          </dd>
        </div>
        <div>
          <dt>Übertragung</dt>
          <dd>
            {num(report.transferGb * 1000)} MB von {NEON_PRICES.transferIncludedGb} GB inklusive
          </dd>
        </div>
        <div>
          <dt>Speicher</dt>
          <dd>
            {num(report.storageGb * 1000, 0)} MB · {usd(report.storageUsd)}
          </dd>
        </div>
      </dl>
      <p className="muted">
        Geschätzt aus der Nutzung durch das Spiel: Die Datenbank ist wach, solange gespielt wird, und schläft {IDLE_SECONDS / 60} Minuten nach dem letzten Zug ein. Gerechnet mit{" "}
        {num(ASSUMED_CU, 2)} CU zu {num(NEON_PRICES.computePerCuHour, 3)} $ je CU-Stunde. Die genaue Abrechnung steht bei Vercel unter Integrations → Neon → Usage.
      </p>
    </section>
  );
}
