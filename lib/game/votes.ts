import { SHARES_PER_MEMBER } from "./config";
import type { ShareOption, Shares, SpeakerId, Vote } from "./types";

// Stimmanteile wie im Boardroom-Repo: Jedes Mitglied verteilt 20 Anteile nach
// Überzeugung, das Ergebnis folgt aus der Mehrheit der Anteile.

export const SHARE_OPTIONS: ShareOption[] = ["go", "conditions", "no", "abstain"];
const VOTES: Vote[] = ["go", "conditions", "no"];

export function emptyShares(): Shares {
  return { go: 0, conditions: 0, no: 0, abstain: 0 };
}

export function voteFromStance(stance: number): Vote {
  if (stance >= 0.35) return "go";
  if (stance <= -0.25) return "no";
  return "conditions";
}

/** The more convinced a member is, the more shares go to the vote; the undecided keep some back. */
export function sharesFromStance(stance: number, vote: Vote, rand: () => number): Shares {
  const jitter = () => (rand() - 0.5) * 2;
  let go = Math.round(Math.min(18, Math.max(0, 6.5 + 10 * stance + jitter())));
  let no = Math.round(Math.min(18, Math.max(0, (stance < 0 ? 4 - 16 * stance : 4 - 4 * stance) + jitter())));
  let abstain = Math.abs(stance) < 0.15 ? Math.round(2 + rand() * 3) : 0;
  while (go + no + abstain > SHARES_PER_MEMBER) {
    if (go >= no && go > 0) go--;
    else if (no > 0) no--;
    else abstain--;
  }
  const shares: Shares = { go, conditions: SHARES_PER_MEMBER - go - no - abstain, no, abstain };
  const top = VOTES.reduce((best, o) => (shares[o] > shares[best] ? o : best), vote);
  if (top !== vote) [shares[top], shares[vote]] = [shares[vote], shares[top]];
  return shares;
}

/** The player puts all shares on the chosen vote. */
export function playerShares(vote: Vote): Shares {
  return { ...emptyShares(), [vote]: SHARES_PER_MEMBER };
}

export interface Ballot {
  member: SpeakerId;
  vote: Vote;
  shares: Shares;
}

export function sumShares(ballots: Ballot[]): Shares {
  const total = emptyShares();
  for (const b of ballots) for (const o of SHARE_OPTIONS) total[o] += b.shares[o];
  return total;
}

export function totalOf(shares: Shares): number {
  return SHARE_OPTIONS.reduce((sum, o) => sum + shares[o], 0);
}

export function majorityOf(total: number): number {
  return Math.floor(total / 2) + 1;
}

/** Yes alone with a majority: approved. Yes plus conditions: approved with conditions. Otherwise rejected. */
export function outcomeFromShares(totals: Shares): Vote {
  const total = totalOf(totals);
  if (total === 0) return "conditions";
  const majority = majorityOf(total);
  if (totals.go >= majority) return "go";
  if (totals.go + totals.conditions >= majority) return "conditions";
  return "no";
}

export interface VoteSeat {
  x: number;
  y: number;
  option: ShareOption;
  member: SpeakerId;
  index: number;
}

interface HemicycleLayout {
  cx: number;
  cy: number;
  r0: number;
  r1: number;
  rows?: number;
}

export function rowsFor(total: number): number {
  if (total <= 20) return 3;
  if (total <= 40) return 4;
  if (total <= 60) return 5;
  if (total <= 100) return 6;
  return 7;
}

/**
 * Seats of a parliament-style hemicycle: rows by radius, seats proportional to
 * the row length, sorted left to right. Shares are grouped by option, inside an
 * option by seat order.
 */
export function hemicycle(ballots: Ballot[], layout: HemicycleLayout): VoteSeat[] {
  const pieces: { option: ShareOption; member: SpeakerId }[] = [];
  for (const option of SHARE_OPTIONS) {
    for (const b of ballots) for (let n = 0; n < b.shares[option]; n++) pieces.push({ option, member: b.member });
  }
  const total = pieces.length;
  if (total === 0) return [];
  const rows = Math.max(1, Math.min(layout.rows ?? rowsFor(total), Math.floor(total / 2)));
  const radii = Array.from({ length: rows }, (_, k) => (rows === 1 ? layout.r1 : layout.r0 + ((layout.r1 - layout.r0) * k) / (rows - 1)));
  const sum = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.max(2, Math.round((total * r) / sum)));
  let diff = total - counts.reduce((a, b) => a + b, 0);
  for (let k = rows - 1; diff !== 0; k = (k - 1 + rows) % rows) {
    const step = diff > 0 ? 1 : -1;
    if (step < 0 && counts[k]! <= 2) continue;
    counts[k]! += step;
    diff -= step;
  }
  const spots: { r: number; a: number }[] = [];
  radii.forEach((r, k) => {
    const n = counts[k]!;
    for (let j = 0; j < n; j++) spots.push({ r, a: Math.PI - (j * Math.PI) / (n - 1) });
  });
  spots.sort((p, q) => q.a - p.a || p.r - q.r);
  return spots.map((s, index) => ({
    x: layout.cx + s.r * Math.cos(s.a),
    y: layout.cy - s.r * Math.sin(s.a),
    option: pieces[index]!.option,
    member: pieces[index]!.member,
    index,
  }));
}

export const SHARE_LABEL: Record<ShareOption, string> = {
  go: "Ja",
  conditions: "Auflagen",
  no: "Nein",
  abstain: "Enthaltung",
};
