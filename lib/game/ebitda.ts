import {
  EBITDA_BASE,
  EBITDA_MULTIPLE_MAX,
  EBITDA_MULTIPLE_MIN,
  EQUITY_FLOOR,
  LOSS_MAKER_REVENUE_MULTIPLE,
  MULTIPLE_AT_BASE,
  MULTIPLE_GROWTH_CAP,
  MULTIPLE_PER_DOUBLING,
  MULTIPLE_PER_GROWTH_POINT,
} from "./mna-config";
import type { Metrics } from "./types";

// Familienbetriebe werden nicht nach Umsatz bewertet, sondern nach dem, was
// sie verdienen: EBITDA (Gewinn vor Zinsen, Steuern und Abschreibungen) mal
// ein Vielfaches. Größere Firmen bekommen ein höheres Vielfaches, weil sie
// sicherer sind und mehr Käufer sie bezahlen können. Genau davon lebt
// Buy-and-Build: klein kaufen, groß verkaufen (Multiple-Arbitrage).

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Operating profit per month: gross profit minus running costs. */
export function monthlyEbitda(m: Pick<Metrics, "revenue" | "grossMargin" | "opex">): number {
  return m.revenue * m.grossMargin - m.opex;
}

export function annualEbitda(m: Pick<Metrics, "revenue" | "grossMargin" | "opex">): number {
  return monthlyEbitda(m) * 12;
}

/** Multiple a buyer pays for this much annual EBITDA, before growth and quality. */
export function sizeMultiple(ebitda: number): number {
  const doublings = Math.log2(Math.max(1, ebitda) / EBITDA_BASE);
  return clamp(MULTIPLE_AT_BASE + MULTIPLE_PER_DOUBLING * doublings, EBITDA_MULTIPLE_MIN, EBITDA_MULTIPLE_MAX);
}

/** Clean books earn a little more, one dominant customer costs a lot. */
export function qualityFactor(m: Pick<Metrics, "axes" | "topCustomer">): number {
  return (0.85 + (0.3 * m.axes.finance) / 100) * (1 - Math.max(0, m.topCustomer - 0.3) * 0.6);
}

/** The multiple the market pays today: size, growth and quality. */
export function fairMultiple(m: Metrics): number {
  const growth = clamp(m.growth * 100 * MULTIPLE_PER_GROWTH_POINT, MULTIPLE_GROWTH_CAP[0], MULTIPLE_GROWTH_CAP[1]);
  return clamp((sizeMultiple(annualEbitda(m)) + growth) * qualityFactor(m), EBITDA_MULTIPLE_MIN, EBITDA_MULTIPLE_MAX + 1);
}

/** Enterprise value: what the business is worth without its cash and debt. */
export function enterpriseValue(m: Metrics): number {
  const ebitda = annualEbitda(m);
  if (ebitda <= 0) return Math.max(0, m.revenue * 12 * LOSS_MAKER_REVENUE_MULTIPLE);
  return ebitda * fairMultiple(m);
}

/**
 * Equity value: enterprise value plus the cash beyond two months of costs (the
 * working capital belongs to the business), minus all debt; never quite zero.
 */
export function ebitdaEquityValue(m: Metrics): number {
  const excess = Math.max(0, m.cash - 2 * m.opex);
  return Math.max(m.revenue * 12 * EQUITY_FLOOR, enterpriseValue(m) + excess - m.debt - (m.acqDebt ?? 0));
}
