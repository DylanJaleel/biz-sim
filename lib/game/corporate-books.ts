import { COST_FLEX } from "./mna-config";
import type { Metrics, Startup } from "./types";

// Die Bücher des Konzerns im Aufsichtsratsmandat. Ein Konzern ist kein
// Startup: Er wächst wie ein reifer Betrieb mit dem Markt, seine Kosten
// folgen zum großen Teil dem Umsatz, und die EBITDA-Marge bleibt im Band
// der Branche, solange niemand Unsinn beschließt. Fällt sie darunter, passt
// der Vorstand die Kosten an; liegt sie weit darüber, holen Löhne und
// Wettbewerb auf. Fehlt Geld, zieht er die Kreditlinie, überschüssiges Geld
// tilgt sie wieder.

export const CORPORATE_BOOKS = {
  /** Monthly revenue and gross margin at the start. */
  revenue: 25_000_000,
  grossMargin: 0.34,
  /** EBITDA margin at the start: industrial drives and logistics technology earn about 8 to 12 %. */
  margin: 0.095,
  /** Room around the target margin in which decisions keep their effect (± points). */
  band: 0.02,
  /** Share of the gap below the band the management closes per month (base plus management quality); above it, competition and wages take `erode`. */
  adapt: { base: 0.02, management: 0.04 },
  erode: 0.1,
  /** Target margin moves this much per point of strength (product, market, edge, management), within `targetRange`. */
  strengthMargin: 0.1,
  targetRange: [0.075, 0.105] as [number, number],
  /** Organic growth per month: the market's trend plus a little for strength, within `growthRange` (about −6 to +5 % a year). */
  trend: 0.0005,
  growthSlope: 0.005,
  growthRange: [-0.005, 0.004] as [number, number],
  /** Price and cost advantages are copied: share of the gap to the usual gross margin closed per month. */
  grossMarginDrift: 0.04,
  /** Credit line: drawn below `minCash` up to `refill`, repaid from cash above `buffer`. */
  minCash: 5_000_000,
  refill: 10_000_000,
  buffer: 20_000_000,
  /** Interest of a large, solid company on its credit line (per year). */
  rate: 0.05,
  /** Version of this model; older games ran the Konzern on the startup path. */
  model: 2,
} as const;

/** Strength as in familyGrowth: product, market and edge, plus management. */
function strength(m: Pick<Metrics, "axes">): number {
  return ((m.axes.product + m.axes.market + m.axes.edge) / 300) * 0.7 + (m.axes.management / 100) * 0.3;
}

/** Strength of the Nordhafen AG when the player joins. */
const START_STRENGTH = strength({ axes: { management: 70, product: 35, market: 30, edge: 25, finance: 75 } });

/** Growth the Konzern drifts towards: the market's trend, a little more with better products and management, less with bad morale. */
export function corporateGrowth(m: Pick<Metrics, "axes" | "morale">): number {
  const [low, high] = CORPORATE_BOOKS.growthRange;
  const g = CORPORATE_BOOKS.trend + CORPORATE_BOOKS.growthSlope * (strength(m) - START_STRENGTH) + (0.001 * (m.morale - 60)) / 20;
  return Math.min(high, Math.max(low, g));
}

/** EBITDA margin the Konzern settles around: better products and management lift it a little, for good. */
export function corporateTargetMargin(m: Pick<Metrics, "axes">): number {
  const [low, high] = CORPORATE_BOOKS.targetRange;
  return Math.min(high, Math.max(low, CORPORATE_BOOKS.margin + CORPORATE_BOOKS.strengthMargin * (strength(m) - START_STRENGTH)));
}

export function ebitdaMargin(m: Pick<Metrics, "revenue" | "grossMargin" | "opex">): number {
  return m.revenue > 0 ? (m.revenue * m.grossMargin - m.opex) / m.revenue : 0;
}

/**
 * Gross margin and running costs of the month. The gross margin drifts slowly
 * back to what the trade earns, costs follow revenue (COST_FLEX), and outside
 * the band around the target margin the management (or the competition)
 * closes part of the gap.
 */
export function corporateCosts(m: Metrics, revenue: number): { grossMargin: number; opex: number } {
  const grossMargin = m.grossMargin + CORPORATE_BOOKS.grossMarginDrift * (CORPORATE_BOOKS.grossMargin - m.grossMargin);
  let opex = m.opex * (1 + COST_FLEX * (revenue / Math.max(1, m.revenue) - 1));
  if (revenue <= 0) return { grossMargin, opex: Math.max(0, opex) };
  const margin = (revenue * grossMargin - opex) / revenue;
  const target = corporateTargetMargin(m);
  const speed = CORPORATE_BOOKS.adapt.base + (CORPORATE_BOOKS.adapt.management * m.axes.management) / 100;
  const low = target - CORPORATE_BOOKS.band;
  const high = target + CORPORATE_BOOKS.band;
  if (margin < low) opex -= speed * (low - margin) * revenue;
  else if (margin > high) opex += CORPORATE_BOOKS.erode * (margin - high) * revenue;
  return { grossMargin, opex: Math.max(0, opex) };
}

/** Credit line: draws when the till runs low, repays from what is above the buffer. */
export function corporateCredit(cash: number, debt: number): { cash: number; debt: number; drawn: number; repaid: number } {
  if (cash < CORPORATE_BOOKS.minCash) {
    const drawn = CORPORATE_BOOKS.refill - cash;
    return { cash: cash + drawn, debt: debt + drawn, drawn, repaid: 0 };
  }
  const repaid = Math.min(debt, Math.max(0, cash - CORPORATE_BOOKS.buffer));
  return { cash: cash - repaid, debt: debt - repaid, drawn: 0, repaid };
}

export const corporateInterest = (debt: number) => (debt * CORPORATE_BOOKS.rate) / 12;

/**
 * Games from before the fix: the Konzern ran on the startup growth path with
 * its drag for big companies and lost several percent of revenue every month;
 * the credit line then piled up debt at startup terms. Corrected once: revenue
 * back to the size it had (the decisions' effects on the margin are not
 * recoverable, so the margin starts at the target), debt cut to what the
 * business itself would have needed, at most two years of EBITDA.
 * Returns null when nothing needs correcting.
 */
export function correctOldCorporate(s: Startup): Startup | null {
  if (!s.corporate || (s.corporateModel ?? 1) >= CORPORATE_BOOKS.model) return null;
  const m = s.metrics;
  const broken = m.revenue < 0.7 * CORPORATE_BOOKS.revenue || ebitdaMargin(m) < corporateTargetMargin(m) - 2 * CORPORATE_BOOKS.band || m.growth < -0.003;
  if (!broken || s.status !== "active") return { ...s, corporateModel: CORPORATE_BOOKS.model };
  const revenue = Math.max(m.revenue, CORPORATE_BOOKS.revenue);
  const grossMargin = Math.max(m.grossMargin, CORPORATE_BOOKS.grossMargin - 0.04);
  const opex = Math.round(revenue * (grossMargin - corporateTargetMargin(m)));
  const ebitdaYear = (revenue * grossMargin - opex) * 12;
  const debt = Math.round(Math.min(m.debt, 2 * ebitdaYear));
  const cash = Math.max(m.cash, CORPORATE_BOOKS.refill);
  return { ...s, corporateModel: CORPORATE_BOOKS.model, metrics: { ...m, revenue, grossMargin, opex, debt, cash, growth: corporateGrowth(m) } };
}
