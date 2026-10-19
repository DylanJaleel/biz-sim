import { FAIR_GAP, PROJECTION_MONTHS, STRONG_GAP } from "./config";
import { applyDelta, project } from "./sim";
import type { Template } from "./templates";
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

/**
 * What each outcome is worth to the player after twelve months, as the CFO
 * would plan it: certain effects as given, risky effects as the
 * probability-weighted mix of both branches.
 */
export function outlook(t: Template, input: Startup): Record<Vote, OutcomeOutlook> {
  // A supervisory board member holds no shares but judges by the value of the whole company.
  const s = input.corporate && input.stake === 0 ? { ...input, stake: 1 } : input;
  const result = {} as Record<Vote, OutcomeOutlook>;
  for (const v of VOTES) {
    const resolved = t.outcomes[v].resolve(s);
    const immediate = resolved.effects.filter((e) => e.delay === 0).map((e) => e.delta);
    const scheduled = resolved.effects.filter((e) => e.delay > 0).map((e) => ({ due: e.delay, delta: e.delta }));
    const risk = resolved.risk;
    if (!risk) {
      result[v] = { value: branchValue(s, { immediate, scheduled }) };
      continue;
    }
    const withRisk = (delta: Delta): Branch =>
      risk.delay === 0
        ? { immediate: [...immediate, delta], scheduled }
        : { immediate, scheduled: [...scheduled, { due: risk.delay, delta }] };
    const good = branchValue(s, withRisk(risk.good));
    const bad = branchValue(s, withRisk(risk.bad));
    result[v] = { value: risk.chance * good + (1 - risk.chance) * bad, chance: risk.chance, good, bad };
  }
  return result;
}

export function bestVote(values: Record<Vote, number>): Vote {
  return VOTES.reduce((best, v) => (values[v] > values[best] ? v : best), "conditions" as Vote);
}

/** Judgment of the player's vote, measured against what was knowable: the planned value of each outcome. */
export function judge(values: Record<Vote, number>, vote: Vote): Judgment {
  const best = bestVote(values);
  if (vote === best) return "strong";
  const top = values[best];
  const gap = (top - values[vote]) / Math.max(1, Math.abs(top));
  if (gap <= STRONG_GAP) return "strong";
  if (gap <= FAIR_GAP) return "fair";
  return "weak";
}
