import { STARTING_CASH, STARTING_REPUTATION, STARTING_VEHICLES } from "./config";
import {
  capacityHours,
  companyValue,
  generateOffers,
  headcount,
  resolveWeek,
  rollWeekEvent,
  seatsTaken,
  totalFixedCosts,
  type Business,
  type LedgerLine,
  type Offer,
  type WeekEvent,
  type WeekSummary,
} from "./economy";
import { applyInvestment, checkInvestment, type InvestmentKind } from "./investments";
import { createLoan, calculateWeeklyLoanCharge, type LoanState } from "./loan";
import { isOrderOpen } from "./orders";
import { evaluateWeekOutcome } from "./outcome";
import { createSeededRandom } from "./rng";

/**
 * Headless playthrough used to calibrate and guard the economy (see
 * docs/game-economy-design.md). It runs the same engine and the same
 * investment rules as the app, with a scripted "player" (Strategy).
 */

export interface PoolOffer extends Offer {
  id: number;
}

export interface StrategyView {
  week: number;
  cash: number;
  business: Business;
  loan: LoanState;
  event: WeekEvent | null;
  /** Offers that can still be accepted this week. */
  openOffers: PoolOffer[];
  capacityHours: number;
  /** Average utilization of the last (up to) 4 weeks; 0 while there is no history. */
  recentUtilization: number;
  weeksOfHistory: number;
  /** Fixed costs plus the loan payment of this week. */
  weeklyObligations: number;
}

export interface Strategy {
  name: string;
  /** Next investment to make this week, or null. Called repeatedly (max 4 per week). */
  invest(view: StrategyView): InvestmentKind | null;
  /** Offers to take on, in order; whatever doesn't fit is skipped by the simulator. */
  pick(view: StrategyView): PoolOffer[];
}

export interface WeekRecord {
  week: number;
  profit: number;
  cashAfter: number;
  headcount: number;
  utilization: number;
  reputation: number;
  defects: number;
}

export interface SimulationResult {
  insolvent: boolean;
  weeksPlayed: number;
  finalCash: number;
  finalValue: number;
  finalBusiness: Business;
  records: WeekRecord[];
  investments: { week: number; kind: InvestmentKind }[];
}

function materialMultiplier(event: WeekEvent | null): number {
  return event?.type === "material_spike" ? event.multiplier : 1;
}

function eligible(view: StrategyView, offer: PoolOffer): boolean {
  return offer.tier <= view.business.toolLevel;
}

/**
 * Best play: choose the set of offers with the highest total margin that fits
 * into the available hours (0/1 knapsack on whole hours).
 */
export function pickBestMargin(view: StrategyView): PoolOffer[] {
  const multiplier = materialMultiplier(view.event);
  const candidates = view.openOffers.filter((offer) => eligible(view, offer));
  const budget = Math.floor(view.capacityHours + 1e-9);

  // best[h] = highest total margin using at most h hours; keep[i][h] = offer i is in that set.
  const best = new Array<number>(budget + 1).fill(0);
  const keep = candidates.map(() => new Array<boolean>(budget + 1).fill(false));
  candidates.forEach((offer, i) => {
    const value = offer.payout - offer.materialNeed * multiplier;
    for (let h = budget; h >= offer.hours; h--) {
      if (best[h - offer.hours] + value > best[h]) {
        best[h] = best[h - offer.hours] + value;
        keep[i][h] = true;
      }
    }
  });

  const chosen: PoolOffer[] = [];
  let h = budget;
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (keep[i][h]) {
      chosen.push(candidates[i]);
      h -= candidates[i].hours;
    }
  }
  return chosen;
}

/** Careless play: takes whatever comes first, ignoring what it pays per hour. */
export function pickFirstCome(view: StrategyView): PoolOffer[] {
  return view.openOffers.filter((offer) => eligible(view, offer)).sort((a, b) => a.id - b.id);
}

export const passive: Strategy = { name: "passiv", invest: () => null, pick: () => [] };
export const careless: Strategy = { name: "unbedacht", invest: () => null, pick: pickFirstCome };
export const solo: Strategy = { name: "solo (optimal)", invest: () => null, pick: pickBestMargin };

/**
 * The intended path: save a buffer, then invest in a fixed order — tools,
 * a van and a first hire, a second hire, master tools, a bigger workshop, more
 * hires. If the next step isn't affordable yet, the player waits and saves.
 */
export function grower(options: { maxEmployees?: number; reserveWeeks?: number } = {}): Strategy {
  const maxEmployees = options.maxEmployees ?? 5;
  const reserveWeeks = options.reserveWeeks ?? 2;

  return {
    name: `wachsend (max ${maxEmployees} MA)`,
    pick: pickBestMargin,
    invest(view) {
      const { business, week, cash } = view;
      const reserve = reserveWeeks * view.weeklyObligations;
      const employees = business.employees.length;
      const next = (kind: InvestmentKind): InvestmentKind | null => {
        const check = checkInvestment(kind, business, week, cash);
        return check.ok && cash - check.cost >= reserve ? kind : null;
      };
      const capacityIsBottleneck = view.weeksOfHistory >= 4 && view.recentUtilization >= 0.9;

      if (business.toolLevel < 2) return next("tools");
      if (business.vehicles < seatsTaken(business, week)) return next("vehicle");
      if (employees < 2) return capacityIsBottleneck ? next("hire") : null;
      if (business.toolLevel < 3 && business.reputation >= 60) return next("tools");
      if (employees >= maxEmployees || !capacityIsBottleneck) return null;
      if (!checkInvestment("hire", business, week, cash).ok) return next("workshop");
      return next("hire");
    },
  };
}

/** Hires as soon as the fee is covered, without vehicles or a buffer. */
export const reckless: Strategy = {
  name: "waghalsig",
  pick: pickBestMargin,
  invest(view) {
    const check = checkInvestment("hire", view.business, view.week, view.cash);
    return check.ok && view.cash - check.cost > 500 ? "hire" : null;
  },
};

export interface WeekDebug {
  view: StrategyView;
  accepted: PoolOffer[];
  summary: WeekSummary;
}

export function simulate(options: {
  seed: number;
  weeks: number;
  strategy: Strategy;
  onWeek?: (info: WeekDebug) => void;
}): SimulationResult {
  const random = createSeededRandom(options.seed);
  let business: Business = {
    toolLevel: 1,
    workshopLevel: 1,
    vehicles: STARTING_VEHICLES,
    reputation: STARTING_REPUTATION,
    employees: [],
  };
  let cash = STARTING_CASH;
  let loan = createLoan();
  let nextOfferId = 1;
  let pool: PoolOffer[] = generateOffers(1, business.reputation, random).map((offer) => ({ ...offer, id: nextOfferId++ }));
  let event = rollWeekEvent(random, 1);
  const records: WeekRecord[] = [];
  const investmentLog: { week: number; kind: InvestmentKind }[] = [];
  const previousCashAfter: number[] = [];
  let insolvent = false;
  let week = 1;

  for (; week <= options.weeks; week++) {
    const cashBefore = cash;
    const investments: LedgerLine[] = [];

    const buildView = (): StrategyView => ({
      week,
      cash,
      business,
      loan,
      event,
      openOffers: pool.filter((offer) => isOrderOpen(offer, week)),
      capacityHours: capacityHours(business, week, event),
      recentUtilization: mean(records.slice(-4).map((record) => record.utilization)),
      weeksOfHistory: records.length,
      weeklyObligations: totalFixedCosts(business, week) + calculateWeeklyLoanCharge(loan).totalPayment,
    });

    for (let i = 0; i < 4; i++) {
      const kind = options.strategy.invest(buildView());
      if (!kind) break;
      const check = checkInvestment(kind, business, week, cash);
      if (!check.ok) break;
      cash -= check.cost;
      investments.push({ label: check.label, amount: -check.cost });
      business = applyInvestment(kind, business, week);
      investmentLog.push({ week, kind });
    }

    const view = buildView();
    let remaining = view.capacityHours;
    const accepted: PoolOffer[] = [];
    for (const offer of options.strategy.pick(view)) {
      if (offer.hours <= remaining + 1e-9 && eligible(view, offer)) {
        accepted.push(offer);
        remaining -= offer.hours;
      }
    }
    pool = pool.filter((offer) => !accepted.includes(offer));

    const summary = resolveWeek({
      weekNumber: week,
      business,
      cashBefore,
      investments,
      accepted,
      event,
      loan,
      random,
    });

    options.onWeek?.({ view, accepted, summary });
    cash = summary.cashAfter;
    loan = summary.loanAfter;
    business = { ...business, reputation: summary.reputationAfter };
    records.push({
      week,
      profit: summary.profit,
      cashAfter: cash,
      headcount: summary.headcount,
      utilization: summary.utilization,
      reputation: summary.reputationAfter,
      defects: summary.defects,
    });

    const status = evaluateWeekOutcome({ cashAfter: cash, previousCashAfterNewestFirst: previousCashAfter });
    previousCashAfter.unshift(cash);
    if (status === "INSOLVENT") {
      insolvent = true;
      break;
    }

    pool = pool.filter((offer) => isOrderOpen(offer, week + 1));
    pool.push(...generateOffers(week + 1, business.reputation, random).map((offer) => ({ ...offer, id: nextOfferId++ })));
    event = rollWeekEvent(random, headcount(business, week + 1));
  }

  return {
    insolvent,
    weeksPlayed: records.length,
    finalCash: cash,
    finalValue: companyValue({ cash, loanRemaining: loan.remainingBalance, business }),
    finalBusiness: business,
    records,
    investments: investmentLog,
  };
}

export interface Aggregate {
  runs: number;
  insolvencyShare: number;
  medianWeeksPlayed: number;
  avgProfitFirstYear: number;
  avgProfitSecondYear: number;
  medianValue: number;
  medianHeadcountEnd: number;
  avgUtilization: number;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
function mean(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function aggregate(results: SimulationResult[]): Aggregate {
  const profitIn = (from: number, to: number) =>
    mean(results.flatMap((r) => r.records.filter((rec) => rec.week > from && rec.week <= to).map((rec) => rec.profit)));

  return {
    runs: results.length,
    insolvencyShare: results.filter((r) => r.insolvent).length / results.length,
    medianWeeksPlayed: median(results.map((r) => r.weeksPlayed)),
    avgProfitFirstYear: profitIn(0, 52),
    avgProfitSecondYear: profitIn(52, 104),
    medianValue: median(results.map((r) => r.finalValue)),
    medianHeadcountEnd: median(results.map((r) => r.records.at(-1)?.headcount ?? 1)),
    avgUtilization: mean(results.flatMap((r) => r.records.map((rec) => rec.utilization))),
  };
}

export function runMany(strategy: Strategy, weeks: number, seeds: number, firstSeed = 1): Aggregate {
  return aggregate(Array.from({ length: seeds }, (_, i) => simulate({ seed: firstSeed + i, weeks, strategy })));
}
