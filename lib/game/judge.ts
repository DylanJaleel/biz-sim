import { CONDITION_DELAY, FAIR_GAP, JUDGMENT_STAKES, PROJECTION_MONTHS, STRONG_GAP } from "./config";
import { applyDelta, project } from "./sim";
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
  const base = project(start, PROJECTION_MONTHS, branch.scheduled).value;
  const weak = project(start, PROJECTION_MONTHS, [...branch.scheduled, { due: 1, delta: WEAK_MARKET }]).value;
  return 0.5 * base + 0.5 * weak + playerCash;
}

const WEAK_MARKET: Delta = { growth: -0.025, axes: { market: -8 } };

export interface OutcomeOutlook {
  value: number;
  /** Chance of the good branch, if the outcome is risky. */
  chance?: number;
  good?: number;
  bad?: number;
}

/** A supervisory board member holds no shares but judges by the value of the whole company. */
export function judgedStartup(input: Startup): Startup {
  return input.corporate && input.stake === 0 ? { ...input, stake: 1 } : input;
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
