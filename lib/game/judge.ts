import { CLOSE_GAP, CONDITION_DELAY, DEAD_VALUATION, FAIR_GAP, JUDGMENT_STAKES, PROJECTION_MONTHS, ROUND_MIN, ROUND_MONTHS, STRONG_GAP } from "./config";
import { applyDelta, monthlyCashFlow, stepMonth, valuation } from "./sim";
import type { ResolvedOutcome, Template } from "./templates";
import type { Delta, Judgment, Startup, Vote } from "./types";

export const VOTES: Vote[] = ["go", "conditions", "no"];

interface Branch {
  immediate: Delta[];
  scheduled: { due: number; delta: Delta }[];
}

/** Value of the player's position (stake value plus cash received) after one branch of an outcome. */
function branchValue(s: Startup, branch: Branch): number {
  let start = s;
  let playerCash = 0;
  for (const d of branch.immediate) {
    if (d.exit !== undefined) return (s.stake / 100) * d.exit + playerCash + (d.playerCash ?? 0);
    start = applyDelta(start, d);
    playerCash += d.playerCash ?? 0;
  }
  const exitLater = branch.scheduled.find((x) => x.delta.exit !== undefined);
  if (exitLater) return (start.stake / 100) * (exitLater.delta.exit ?? 0) + playerCash;
  for (const x of branch.scheduled) playerCash += x.delta.playerCash ?? 0;
  // Half the weight on a weaker market: plans that only work when everything goes right lose value.
  const base = financedValue(start, PROJECTION_MONTHS, branch.scheduled);
  const weak = financedValue(start, PROJECTION_MONTHS, [...branch.scheduled, { due: 1, delta: WEAK_MARKET }]);
  return 0.5 * base + 0.5 * weak + playerCash;
}

/**
 * Value of the player's position after `months`, as the CFO plans it: a
 * startup whose cash runs out raises a round at its value of the day (as the
 * game does), which dilutes the stake. Without this every plan of a company
 * with less than a year of cash would end in insolvency and be worth 0 €, so
 * all options looked the same. Only a company too weak for any investor dies.
 */
function financedValue(s: Startup, months: number, scheduled: { due: number; delta: Delta }[]): number {
  let current: Startup = { ...s, status: "active" };
  const mature = s.corporate === true || s.metrics.valuedOn === "ebitda";
  for (let i = 1; i <= months; i++) {
    for (const item of scheduled) if (item.due === i) current = applyDelta(current, item.delta);
    const flow = monthlyCashFlow(current.metrics);
    if (!mature && flow < 0 && current.metrics.cash + flow < 0) {
      const value = valuation(current.metrics);
      if (value >= DEAD_VALUATION) {
        const amount = Math.max(ROUND_MIN, -flow * ROUND_MONTHS) - Math.min(0, current.metrics.cash);
        current = applyDelta(current, { cash: amount, dilution: amount / (value + amount) });
      }
    }
    current = stepMonth(current).startup;
    if (current.status === "dead") return 0;
  }
  return (current.stake / 100) * valuation(current.metrics);
}

const WEAK_MARKET: Delta = { growth: -0.025, axes: { market: -8 } };

export interface OutcomeOutlook {
  value: number;
  /** Chance of the good branch, if the outcome is risky. */
  chance?: number;
  good?: number;
  bad?: number;
}

/**
 * A supervisory board member (or a seat held only through the fund) has no
 * shares of their own but judges by the value of the whole company: values
 * are planned for 1 % of it. Pages show them as the company value (`positionBasis`).
 */
export function judgedStartup(input: Startup): Startup {
  return input.stake <= 0 ? { ...input, stake: 1 } : input;
}

/** What the planned values of a company mean on screen: the player's stake, or (without shares) the whole company. */
export function positionBasis(s: Pick<Startup, "stake">): { scale: number; label: string; short: string } {
  return s.stake <= 0
    ? { scale: 100, label: "Erwarteter Firmenwert (Eigenkapital) in 12 Monaten", short: "Firmenwert in 12 Monaten" }
    : { scale: 1, label: "Erwarteter Wert deines Anteils in 12 Monaten", short: "Wert deines Anteils in 12 Monaten" };
}

/** Planned value of one resolved outcome: certain effects as given, risky ones as the probability-weighted mix. */
export function outcomeValue(s: Startup, resolved: ResolvedOutcome): OutcomeOutlook {
  const immediate = resolved.effects.filter((e) => e.delay === 0).map((e) => e.delta);
  const scheduled = resolved.effects.filter((e) => e.delay > 0).map((e) => ({ due: e.delay, delta: e.delta }));
  const risk = resolved.risk;
  if (!risk) return { value: branchValue(s, { immediate, scheduled }) };
  const withRisk = (delta: Delta): Branch =>
    risk.delay === 0 ? { immediate: [...immediate, delta], scheduled } : { immediate, scheduled: [...scheduled, { due: risk.delay, delta }] };
  const good = branchValue(s, withRisk(risk.good));
  const bad = branchValue(s, withRisk(risk.bad));
  return { value: risk.chance * good + (1 - risk.chance) * bad, chance: risk.chance, good, bad };
}

/** Conditions take time to agree and set up: every effect comes this many months later. */
export function delayOutcome(resolved: ResolvedOutcome, months: number): ResolvedOutcome {
  if (months <= 0) return resolved;
  return {
    effects: resolved.effects.map((e) => ({ ...e, delay: e.delay + months })),
    ...(resolved.risk ? { risk: { ...resolved.risk, delay: resolved.risk.delay + months } } : {}),
  };
}

/** What an outcome does when the board decides it; conditions start a month later. */
export function resolveVote(t: Template, vote: Vote, s: Startup): ResolvedOutcome {
  const resolved = t.outcomes[vote].resolve(s);
  return vote === "conditions" ? delayOutcome(resolved, CONDITION_DELAY) : resolved;
}

/**
 * What each outcome is worth to the player after twelve months, as the CFO
 * would plan it: certain effects as given, risky effects as the
 * probability-weighted mix of both branches. "conditions" is the board's own
 * standard condition (the template's middle path).
 */
export function outlook(t: Template, input: Startup): Record<Vote, OutcomeOutlook> {
  const s = judgedStartup(input);
  const result = {} as Record<Vote, OutcomeOutlook>;
  for (const v of VOTES) result[v] = outcomeValue(s, resolveVote(t, v, s));
  return result;
}

export function bestVote(values: Record<Vote, number>): Vote {
  return VOTES.reduce((best, v) => (values[v] > values[best] ? v : best), "conditions" as Vote);
}

/** The option with the highest value; ties keep the first key. */
export function bestOf(values: Record<string, number>): string {
  const keys = Object.keys(values);
  return keys.reduce((best, k) => (values[k]! > values[best]! ? k : best), keys[0]!);
}

/**
 * Judgment of the player's choice, measured against what was knowable: the
 * planned value of each option. The gap to the best option counts relative to
 * the spread of the decision (best minus `floor`, by default the worst
 * option), so "close to the best" only counts when the options really differ.
 */
export function judge(values: Record<string, number>, choice: string, floor?: number): Judgment {
  const best = bestOf(values);
  if (choice === best) return "strong";
  const top = values[best]!;
  const bottom = floor ?? Math.min(...Object.values(values));
  const gap = (top - (values[choice] ?? bottom)) / Math.max(1e-9, top - bottom);
  if (gap <= STRONG_GAP) return "strong";
  if (gap <= FAIR_GAP) return "fair";
  return "weak";
}

/**
 * How much a decision matters for the reputation (0..1): when the options lie
 * close together, the choice is nearly a coin toss and moves little.
 */
export function judgmentWeight(values: Record<string, number>, floor?: number): number {
  const all = Object.values(values);
  const top = Math.max(...all);
  const bottom = floor ?? Math.min(...all);
  const relative = (top - bottom) / Math.max(1, Math.abs(top));
  return Math.min(1, Math.max(0, (relative - JUDGMENT_STAKES.min) / (JUDGMENT_STAKES.full - JUDGMENT_STAKES.min)));
}

/**
 * A close call: the chosen option lies only a little below the best one, in
 * share of the best value or in euros. Such a choice is no mistake; it gets a
 * neutral note and barely moves reputation and trust.
 */
export function isClose(values: Record<string, number>, choice: string): boolean {
  const best = bestOf(values);
  if (choice === best || values[choice] === undefined) return false;
  const top = values[best]!;
  return top - values[choice]! <= Math.max(CLOSE_GAP.relative * Math.abs(top), CLOSE_GAP.absolute);
}
