import {
  DEAD_VALUATION,
  DEBT_ANNUAL_RATE,
  DEBT_REPAYMENT_RATE,
  DOWN_ROUND_DISCOUNT,
  DOWN_ROUND_MONTHS,
  GROWTH_PULL,
  MULTIPLE_BASE,
  MULTIPLE_MAX,
  MULTIPLE_MIN,
  MULTIPLE_PER_GROWTH,
  OPEX_PER_HIRE,
  PHASE_THRESHOLDS,
  REVENUE_NOISE,
  SCALE_DRAG,
  SCALE_PULL,
  SCALE_REVENUE,
  CUSTOMER_LOSS_CHANCE,
  CUSTOMER_LOSS_THRESHOLD,
} from "./config";
import type { Axes, Delta, Holder, HolderKind, Metrics, Startup, StartupPhase } from "./types";

export const NEW_INVESTORS = { id: "investors", name: "Neue Investoren", kind: "investor" as HolderKind };

/** Everyone keeps (1 - d) of their share; the new shares go to `to`. */
export function dilute(capTable: Holder[], d: number, to: { id: string; name: string; kind: HolderKind } = NEW_INVESTORS): Holder[] {
  if (d <= 0) return capTable;
  const next = capTable.map((h) => ({ ...h, pct: h.pct * (1 - d) }));
  const target = next.find((h) => h.id === to.id);
  if (target) target.pct += d * 100;
  else next.push({ ...to, pct: d * 100 });
  return next;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Growth the company drifts towards: product, market and edge, damped by bad morale and by size. */
export function potentialGrowth(m: Metrics): number {
  const strength = ((m.axes.product + m.axes.market + m.axes.edge) / 300) * 0.8 + (m.axes.management / 100) * 0.2;
  return -0.025 + 0.1 * strength * (0.6 + 0.4 * (m.morale / 100)) - scaleDrag(m);
}

/** Growth a company loses because of its size: nothing below SCALE_REVENUE, then a bit per doubling. */
export function scaleDrag(m: Pick<Metrics, "revenue">): number {
  return m.revenue > SCALE_REVENUE ? SCALE_DRAG * Math.log2(m.revenue / SCALE_REVENUE) : 0;
}

export function monthlyInterest(m: Metrics): number {
  return (m.debt * DEBT_ANNUAL_RATE) / 12;
}

/** Cash flow of one month at the current numbers (negative = burn). */
export function monthlyCashFlow(m: Metrics): number {
  return m.revenue * m.grossMargin - m.opex - monthlyInterest(m) - m.debt * DEBT_REPAYMENT_RATE;
}

/** Months until the cash is gone; Infinity when the company earns money. */
export function runwayMonths(m: Metrics): number {
  const flow = monthlyCashFlow(m);
  if (flow >= 0) return Infinity;
  return Math.max(0, m.cash / -flow);
}

export function revenueMultiple(growth: number): number {
  return clamp(MULTIPLE_BASE + growth * MULTIPLE_PER_GROWTH, MULTIPLE_MIN, MULTIPLE_MAX);
}

/** Company value: annual revenue × a multiple that rewards growth, plus net cash. */
export function valuation(m: Metrics): number {
  const arr = m.revenue * 12;
  // Investors pay a little more for clean numbers and a lot less for one dominant customer.
  const quality = (0.85 + (0.3 * m.axes.finance) / 100) * (1 - Math.max(0, m.topCustomer - 0.3) * 0.6);
  return Math.max(0, arr * revenueMultiple(m.growth) * quality + Math.max(0, m.cash - m.debt) * 0.5);
}

export function phaseOf(m: Metrics): StartupPhase {
  if (monthlyCashFlow(m) > 0 && m.revenue >= PHASE_THRESHOLDS.launch) return "profit";
  if (m.revenue >= PHASE_THRESHOLDS.scale) return "scale";
  if (m.revenue >= PHASE_THRESHOLDS.launch) return "launch";
  return "beta";
}

function addAxes(axes: Axes, change: Partial<Axes> | undefined): Axes {
  if (!change) return axes;
  const next = { ...axes };
  for (const key of Object.keys(change) as (keyof Axes)[]) {
    next[key] = clamp(next[key] + (change[key] ?? 0), 0, 100);
  }
  return next;
}

/** Applies a delta to a company. Player-side fields (playerCash, reputation) are ignored here. */
export function applyDelta(s: Startup, d: Delta, scale = 1): Startup {
  const m = s.metrics;
  const teamChange = (d.team ?? 0) * scale;
  const metrics: Metrics = {
    cash: m.cash + (d.cash ?? 0) * scale,
    revenue: Math.max(0, m.revenue * (1 + (d.revenuePct ?? 0) * scale)),
    growth: clamp(m.growth + (d.growth ?? 0) * scale, -0.15, 0.25),
    grossMargin: clamp(m.grossMargin + (d.grossMargin ?? 0) * scale, 0.05, 0.95),
    opex: Math.max(0, m.opex + (d.opex ?? 0) * scale + teamChange * OPEX_PER_HIRE),
    team: Math.max(1, m.team + teamChange),
    morale: clamp(m.morale + (d.morale ?? 0) * scale, 0, 100),
    trust: clamp(m.trust + (d.trust ?? 0) * scale, 0, 100),
    axes: addAxes(m.axes, d.axes && scaleAxes(d.axes, scale)),
    topCustomer: clamp(m.topCustomer + (d.topCustomer ?? 0) * scale, 0, 1),
    debt: Math.max(0, m.debt + (d.debt ?? 0) * scale),
  };
  const dil = clamp((d.dilution ?? 0) * scale, 0, 0.9);
  const stake = s.stake * (1 - dil);
  const capTable = dil > 0 ? dilute(s.capTable ?? [], dil, d.dilutionTo) : s.capTable;
  const flags = d.flag && !s.flags.includes(d.flag) ? [...s.flags, d.flag] : s.flags;
  return { ...s, metrics, stake, capTable, flags, phase: phaseOf(metrics) };
}

function scaleAxes(axes: Partial<Axes>, scale: number): Partial<Axes> {
  const out: Partial<Axes> = {};
  for (const key of Object.keys(axes) as (keyof Axes)[]) out[key] = (axes[key] ?? 0) * scale;
  return out;
}

/** Mixes two deltas: the expected change of a risky effect. */
export function blendDelta(good: Delta, bad: Delta, chance: number): Delta {
  const num = (a?: number, b?: number) => chance * (a ?? 0) + (1 - chance) * (b ?? 0);
  const axes: Partial<Axes> = {};
  for (const key of ["management", "product", "market", "edge", "finance"] as const) {
    const v = num(good.axes?.[key], bad.axes?.[key]);
    if (v) axes[key] = v;
  }
  return {
    cash: num(good.cash, bad.cash),
    revenuePct: num(good.revenuePct, bad.revenuePct),
    growth: num(good.growth, bad.growth),
    grossMargin: num(good.grossMargin, bad.grossMargin),
    opex: num(good.opex, bad.opex),
    team: num(good.team, bad.team),
    morale: num(good.morale, bad.morale),
    trust: num(good.trust, bad.trust),
    topCustomer: num(good.topCustomer, bad.topCustomer),
    debt: num(good.debt, bad.debt),
    dilution: num(good.dilution, bad.dilution),
    playerCash: num(good.playerCash, bad.playerCash),
    reputation: num(good.reputation, bad.reputation),
    axes,
  };
}

export interface StepResult {
  startup: Startup;
  events: string[];
}

/**
 * One month of business. Revenue grows (with a little noise), costs are paid,
 * growth drifts towards what product, market and edge can carry. A company
 * without money first gets a crisis month; if it stays negative, an emergency
 * round at a heavy discount saves it, or it dies when it is worth too little.
 */
export function stepMonth(s: Startup, random: () => number = () => 0.5): StepResult {
  if (s.status !== "active") return { startup: s, events: [] };
  const events: string[] = [];
  const m = s.metrics;
  const noise = (random() - 0.5) * 2 * REVENUE_NOISE;
  // Big companies are tankers: pushes above their potential fade faster.
  const pull = Math.min(0.6, GROWTH_PULL * (1 + (scaleDrag(m) / SCALE_DRAG) * SCALE_PULL));
  const growth = m.growth + (potentialGrowth(m) - m.growth) * pull;
  const revenue = Math.max(0, m.revenue * (1 + growth + noise));
  const interest = monthlyInterest(m);
  const repayment = m.debt * DEBT_REPAYMENT_RATE;
  const cash = m.cash + revenue * m.grossMargin - m.opex - interest - repayment;
  const morale = m.morale + (60 - m.morale) * 0.05;
  // New customers slowly dilute the share of the largest one.
  let topCustomer = Math.max(0.05, m.topCustomer * (1 - Math.max(0, growth) * 0.5));
  let shockedRevenue = revenue;
  if (topCustomer > CUSTOMER_LOSS_THRESHOLD && random() < CUSTOMER_LOSS_CHANCE) {
    shockedRevenue = revenue * (1 - topCustomer * 0.85);
    events.push(`Der größte Kunde kündigt. ${Math.round(topCustomer * 85)} % des Umsatzes fallen weg.`);
    topCustomer = 0.15;
  }
  let next: Startup = { ...s, metrics: { ...m, growth, revenue: shockedRevenue, cash, morale, topCustomer, debt: m.debt - repayment } };
  next = { ...next, phase: phaseOf(next.metrics) };
  if (next.phase !== s.phase) events.push(phaseText(next.phase));

  if (cash < 0) {
    const crisisMonths = s.crisisMonths + 1;
    next = { ...next, crisisMonths };
    if (crisisMonths >= 2) {
      const rescued = random() < rescueChance(next) ? emergencyRound(next) : null;
      if (rescued) {
        next = rescued;
        events.push("Notfinanzierung zu schlechten Bedingungen: Die Firma ist gerettet, dein Anteil schrumpft deutlich.");
      } else {
        next = { ...next, status: "dead" };
        events.push("Insolvenz: Das Geld ist aufgebraucht und niemand finanziert nach.");
      }
    } else {
      events.push("Die Kasse ist leer. Ohne neues Geld droht nächsten Monat das Aus.");
    }
  } else if (s.crisisMonths > 0) {
    next = { ...next, crisisMonths: 0 };
  }
  return { startup: next, events };
}

/** Chance that investors save a company that ran out of money: growth, clean numbers and size help. */
export function rescueChance(s: Startup): number {
  const m = s.metrics;
  const value = valuation(m);
  return clamp(0.15 + m.growth * 6 + (m.axes.finance - 50) / 200 + (value - 400_000) / 2_000_000, 0.05, 0.9);
}

/** Investors put in nine months of burn at a deep discount, or nobody does. */
export function emergencyRound(s: Startup): Startup | null {
  const value = valuation(s.metrics);
  if (value < DEAD_VALUATION) return null;
  const burn = Math.max(10_000, -monthlyCashFlow(s.metrics));
  const amount = burn * DOWN_ROUND_MONTHS - Math.min(0, s.metrics.cash);
  const preMoney = value * DOWN_ROUND_DISCOUNT;
  const dilution = amount / (preMoney + amount);
  return {
    ...applyDelta(s, { cash: amount, dilution, morale: -8, trust: -5 }),
    crisisMonths: 0,
  };
}

function phaseText(phase: StartupPhase): string {
  switch (phase) {
    case "launch":
      return "Neue Phase: Markteinführung. Der Umsatz trägt jetzt erste Strukturen.";
    case "scale":
      return "Neue Phase: Skalieren. Jetzt geht es um Tempo und Organisation.";
    case "profit":
      return "Die Firma verdient Geld. Ab jetzt finanziert sie sich selbst.";
    default:
      return "Zurück in der Testphase.";
  }
}

export interface Projection {
  alive: boolean;
  months: { cash: number; revenue: number; valuation: number; stake: number }[];
  /** Value of the player's stake at the end. */
  value: number;
  stake: number;
}

/**
 * Plans the next months without noise: the CFO's view. Pending changes are
 * applied in the month they are due.
 */
export function project(s: Startup, months: number, scheduled: { due: number; delta: Delta }[] = []): Projection {
  let current: Startup = { ...s, status: "active" };
  const series: Projection["months"] = [];
  for (let i = 1; i <= months; i++) {
    for (const item of scheduled) if (item.due === i) current = applyDelta(current, item.delta);
    const step = stepMonth(current);
    current = step.startup;
    series.push({
      cash: current.metrics.cash,
      revenue: current.metrics.revenue,
      valuation: valuation(current.metrics),
      stake: current.stake,
    });
    if (current.status === "dead") break;
  }
  const alive = current.status !== "dead";
  return {
    alive,
    months: series,
    value: alive ? (current.stake / 100) * valuation(current.metrics) : 0,
    stake: current.stake,
  };
}
