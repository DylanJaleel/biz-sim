import { outlook, VOTES, type OutcomeOutlook } from "./judge";
import { burn as burnOf, fill, type Template } from "./templates";
import { project, runwayMonths, valuation } from "./sim";
import type { Delta, Startup, Vote } from "./types";

// Der CFO rechnet: Was passiert mit Kasse, Umsatz und deinem Anteil, wenn man an
// einem Hebel dreht? Alle Zahlen kommen aus derselben Simulation wie das Spiel.

export type Financing = "none" | "equity" | "debt";
export type Scenario = "base" | "weak";

export interface Levers {
  hires: number;
  price: number;
  financing: Financing;
  scenario: Scenario;
}

export const DEFAULT_LEVERS: Levers = { hires: 0, price: 0, financing: "none", scenario: "base" };

export interface ForecastPoint {
  month: number;
  cash: number;
  revenue: number;
  stake: number;
  value: number;
}

export interface Forecast {
  plan: ForecastPoint[];
  base: ForecastPoint[];
  runwayPlan: number | null;
  runwayBase: number | null;
  financingAmount: number;
  stakeAfter: number;
  lines: string[];
  warning: string | null;
}

const HORIZON = 24;

function financingAmount(s: Startup, financing: Financing): number {
  const burn = Math.max(15_000, burnOf(s));
  if (financing === "equity") return Math.round((burn * 9) / 10_000) * 10_000;
  if (financing === "debt") return Math.round((burn * 5) / 10_000) * 10_000;
  return 0;
}

function series(s: Startup, scheduled: { due: number; delta: Delta }[]): { points: ForecastPoint[]; runway: number | null } {
  // Runs without the emergency round so the forecast shows when the money really ends.
  const points: ForecastPoint[] = [{ month: 0, cash: s.metrics.cash, revenue: s.metrics.revenue, stake: s.stake, value: (s.stake / 100) * valuation(s.metrics) }];
  const p = project({ ...s, crisisMonths: -HORIZON }, HORIZON, scheduled);
  let runway: number | null = null;
  p.months.forEach((m, i) => {
    points.push({ month: i + 1, cash: m.cash, revenue: m.revenue, stake: m.stake, value: (m.stake / 100) * m.valuation });
    if (runway === null && m.cash < 0) runway = i + 1;
  });
  return { points, runway };
}

/** The CFO's forecast for the next 24 months, with and without the player's levers. */
export function forecast(s: Startup, levers: Levers): Forecast {
  const weak: { due: number; delta: Delta }[] = levers.scenario === "weak" ? [{ due: 1, delta: { growth: -s.metrics.growth / 2, axes: { market: -10 } } }] : [];
  const scheduled = [...weak];
  if (levers.hires > 0) {
    scheduled.push({ due: 1, delta: { team: levers.hires } });
    scheduled.push({ due: 4, delta: { growth: 0.006 * levers.hires } });
  }
  if (levers.price > 0) {
    const gm = s.metrics.grossMargin;
    const margin = 1 - (1 - gm) / (1 + levers.price);
    scheduled.push({ due: 1, delta: { revenuePct: levers.price - levers.price * 0.4, grossMargin: margin - gm, growth: -levers.price * 0.04 } });
  }
  const amount = financingAmount(s, levers.financing);
  if (levers.financing === "equity") {
    scheduled.push({ due: 1, delta: { cash: amount, dilution: amount / (valuation(s.metrics) + amount) } });
  } else if (levers.financing === "debt") {
    scheduled.push({ due: 1, delta: { cash: amount, debt: amount } });
  }

  const plan = series(s, scheduled);
  const base = series(s, weak);
  const last = plan.points[plan.points.length - 1]!;

  const lines: string[] = [];
  if (levers.hires === 0 && levers.price === 0 && levers.financing === "none") {
    lines.push(
      base.runway
        ? `Ohne Änderung ist die Kasse in Monat ${base.runway} leer. Bewege einen Hebel und schau, was passiert.`
        : "Ohne Änderung reicht das Geld über zwei Jahre. Bewege einen Hebel und schau, was passiert.",
    );
  }
  if (levers.price > 0) {
    lines.push(
      `Der höhere Preis wirkt sofort auf die Marge: Der Rohertrag pro Kunde steigt, weil die Kosten pro Kunde gleich bleiben. Einige Kunden springen ab, und das Wachstum wird etwas langsamer.`,
    );
  }
  if (levers.hires > 0) {
    lines.push(
      `Jede Einstellung kostet ab dem ersten Monat rund 5.500 €. Mehr Wachstum bringt sie erst nach etwa drei Monaten. Deshalb fällt die Kurve zuerst schneller.`,
    );
  }
  if (levers.financing === "equity") {
    lines.push(
      `Die Eigenkapitalrunde über ${amount.toLocaleString("de-DE")} € kostet keine Zinsen und muss nicht zurückgezahlt werden. Der Preis: Dein Anteil sinkt von ${fmtPct(s.stake)} auf ${fmtPct(last.stake)}, weil neue Anteile ausgegeben werden.`,
    );
  }
  if (levers.financing === "debt") {
    lines.push(
      `Der Kredit über ${amount.toLocaleString("de-DE")} € lässt deinen Anteil unangetastet. Dafür laufen jeden Monat Zinsen und Tilgung, auch wenn der Umsatz ausbleibt. Weniger Eigenkapital heißt mehr Hebel, aber weniger Puffer.`,
    );
  }
  if (levers.scenario === "weak") {
    lines.push("Im schwachen Szenario wächst die Firma nur halb so schnell. Fixkosten und Tilgung bleiben trotzdem.");
  }
  if ((plan.runway ?? Infinity) <= 6) {
    lines.push("Hinweis für den Beirat: Reicht das Geld keine sechs Monate, spricht viel für einen Budgetdeckel als Auflage. Ob er passt, zeigt die Rückfrage zum Risiko.");
  }
  const warning = plan.runway ?`In Monat ${plan.runway} ist die Kasse leer. Vorher braucht die Firma neues Geld oder niedrigere Kosten.` : null;

  return {
    plan: plan.points,
    base: base.points,
    runwayPlan: plan.runway,
    runwayBase: base.runway,
    financingAmount: amount,
    stakeAfter: last.stake,
    lines,
    warning,
  };
}

function fmtPct(value: number): string {
  return `${(Math.round(value * 10) / 10).toLocaleString("de-DE")} %`;
}

export interface OutcomeView {
  vote: Vote;
  label: string;
  runwayAfter: number;
  outlook: OutcomeOutlook;
  cashAfter: number;
}

/** What the CFO says about each possible decision of a board item. */
export function outcomeViews(t: Template, s: Startup): OutcomeView[] {
  const o = outlook(t, s);
  return VOTES.map((vote) => {
    const resolved = t.outcomes[vote].resolve(s);
    const cashNow = resolved.effects.filter((e) => e.delay === 0).reduce((sum, e) => sum + (e.delta.cash ?? 0), 0);
    const opexNow = resolved.effects
      .filter((e) => e.delay === 0)
      .reduce((sum, e) => sum + (e.delta.opex ?? 0) + (e.delta.team ?? 0) * 5_500, 0);
    const metrics = { ...s.metrics, cash: s.metrics.cash + cashNow, opex: s.metrics.opex + opexNow };
    return {
      vote,
      label: fill(t.outcomes[vote].label, s),
      runwayAfter: runwayMonths(metrics),
      outlook: o[vote],
      cashAfter: metrics.cash,
    };
  });
}
