import { FOUNDER_PREMIUM, LEAD_SHARE, ROUND_MIN, ROUND_MONTHS } from "./config";
import { dilute, monthlyCashFlow, NEW_INVESTORS, runwayMonths, valuation } from "./sim";
import type { GvBallot, GvVote, Holder, HolderKind, Round, RoundTake, Startup } from "./types";

// Wem die Firma gehört. Der Spieler steht nicht in der Liste, sein Anteil ist
// Startup.stake; zusammen ergibt alles 100 %.

export { dilute, NEW_INVESTORS };

export const HOLDER_LABEL: Record<HolderKind | "you", string> = {
  founder: "Gründung",
  cofounder: "Mitgründung",
  vc: "Fonds",
  angel: "Angel",
  esop: "Mitarbeiterpool",
  investor: "Investor",
  advisor: "Beirat",
  you: "Du",
};

const round2 = (v: number) => Math.round(v * 100) / 100;

/** The pre-money table of a new company, scaled so the player's new shares fit in. */
export function capTableAfterEntry(pre: Holder[], stake: number): Holder[] {
  const total = pre.reduce((sum, h) => sum + h.pct, 0) || 1;
  return pre.map((h) => ({ ...h, pct: (h.pct / total) * (100 - stake) }));
}

export function totalPct(s: Startup): number {
  return s.stake + s.capTable.reduce((sum, h) => sum + h.pct, 0);
}

/** Holders who vote in the shareholders' meeting; the option pool does not. */
export function votingHolders(s: Startup): Holder[] {
  return s.capTable.filter((h) => h.kind !== "esop" && h.pct > 0.005);
}

// ---------------------------------------------------------------------------
// Rounds
// ---------------------------------------------------------------------------

const LEADS = [
  { id: "isar", name: "Isar Capital" },
  { id: "hafenwerk", name: "Hafenwerk Ventures" },
  { id: "elbe", name: "Elbe Growth" },
  { id: "westpark", name: "Westpark Partners" },
];

export interface RoundTerms {
  label: string;
  amount: number;
  preMoney: number;
  leadId: string;
  lead: string;
  down: boolean;
}

/**
 * What investors offer: about fourteen months of burn, priced from today's
 * value. Growth, clean numbers and a good relationship with the founders lift
 * the price; a warm introduction to an investor lifts it further.
 */
export function roundTerms(s: Startup, roundsSoFar: number, random: () => number): RoundTerms {
  const burn = Math.max(0, -monthlyCashFlow(s.metrics));
  const amount = Math.max(ROUND_MIN, Math.round((burn * ROUND_MONTHS) / 10_000) * 10_000);
  const m = s.metrics;
  let factor = 0.75 + m.growth * 6 + (m.trust - 50) / 400 + (m.axes.finance - 50) / 300;
  if (s.flags.includes("investor_intro")) factor += 0.15;
  factor = Math.min(1.6, Math.max(0.5, factor));
  const preMoney = Math.round((valuation(m) * factor) / 10_000) * 10_000;
  const down = factor < 0.9;
  const lead = LEADS[Math.floor(random() * LEADS.length) % LEADS.length]!;
  const big = s.phase === "scale" || s.phase === "profit";
  const series = ["Seed", "Serie A", "Serie B", "Serie C"];
  const label = down ? "Brückenrunde" : series[Math.min(series.length - 1, roundsSoFar + (big ? 1 : 0))]!;
  return { label, amount, preMoney, leadId: lead.id, lead: lead.name, down };
}

/** Chance that investors want in at all: growth, clean numbers, trust and a warm introduction help. */
export function fundability(s: Startup): number {
  const m = s.metrics;
  const p = 0.2 + m.growth * 8 + (m.axes.finance - 50) / 150 + (m.trust - 50) / 300 + (s.flags.includes("investor_intro") ? 0.25 : 0);
  return Math.min(0.9, Math.max(0.08, p));
}

export function postMoney(r: Pick<Round, "amount" | "preMoney">): number {
  return r.preMoney + r.amount;
}

/** What the player puts in for each choice. */
export function playerAmount(r: Pick<Round, "amount">, stake: number, take: RoundTake): number {
  if (take === "prorata") return Math.round((r.amount * stake) / 100 / 1000) * 1000;
  if (take === "half") return Math.round((r.amount * stake) / 200 / 1000) * 1000;
  if (take === "lead") return Math.round((r.amount * LEAD_SHARE) / 1000) * 1000;
  return 0;
}

/** The player's stake after the round for a given choice. */
export function stakeAfter(r: Pick<Round, "amount" | "preMoney">, stake: number, take: RoundTake): number {
  const post = postMoney(r);
  return stake * (r.preMoney / post) + (playerAmount(r, stake, take) / post) * 100;
}

function holderVote(h: Holder, r: Round, s: Startup): { vote: GvVote; reason: string } {
  const runway = runwayMonths(s.metrics);
  switch (h.kind) {
    case "founder":
    case "cofounder":
    case "advisor":
      return { vote: "go", reason: r.down ? "Lieber ein kleineres Stück als gar keine Firma." : "Mit dem Geld können wir wachsen." };
    case "vc":
    case "investor":
      if (!r.down) return { vote: "go", reason: "Faire Bewertung, wir ziehen mit." };
      if (runway < 3) return { vote: "go", reason: "Der Preis tut weh, aber ohne Geld ist alles weg." };
      return { vote: "no", reason: "Zu billig. Erst die Zahlen verbessern, dann zu einem besseren Preis." };
    case "angel":
      if (!r.down) return { vote: "go", reason: "Passt, ich bin dabei." };
      return { vote: "no", reason: "Bei diesem Preis verliere ich zu viel. Ich stimme dagegen." };
    case "esop":
      return { vote: "go", reason: "" };
  }
}

/**
 * The shareholders' meeting: every holder votes with their percentage, the
 * option pool does not vote. Majority of the voting shares decides.
 */
export function shareholderVote(r: Round, s: Startup, player: GvVote | "abstain"): { ballots: GvBallot[]; approved: boolean } {
  const ballots: GvBallot[] = votingHolders(s).map((h) => ({ id: h.id, name: h.name, kind: h.kind, pct: round2(h.pct), ...holderVote(h, r, s) }));
  ballots.push({
    id: "you",
    name: "Du",
    kind: "you",
    pct: round2(s.stake),
    vote: player,
    reason: player === "go" ? "Ich stimme der Runde zu." : player === "no" ? "Ich stimme dagegen." : "Nicht abgestimmt.",
  });
  const voting = ballots.filter((b) => b.vote !== "abstain").reduce((sum, b) => sum + b.pct, 0);
  const yes = ballots.filter((b) => b.vote === "go").reduce((sum, b) => sum + b.pct, 0);
  return { ballots, approved: voting > 0 && yes > voting / 2 };
}

/** Applies a closed round to the company: new money, new holders, everyone diluted. */
export function applyRound(s: Startup, r: Round, invested: number): Startup {
  const post = postMoney(r);
  const keep = r.preMoney / post;
  const capTable = s.capTable.map((h) => ({ ...h, pct: h.pct * keep }));
  const leadPct = ((r.amount - invested) / post) * 100;
  const existing = capTable.find((h) => h.id === r.leadId);
  if (existing) existing.pct += leadPct;
  else if (leadPct > 0.005) capTable.push({ id: r.leadId, name: r.lead, kind: "investor", pct: leadPct });
  const stake = s.stake * keep + (invested / post) * 100;
  const flags = [...s.flags.filter((f) => f !== "round_open" && f !== "investor_intro"), ...(s.flags.includes("seeded") ? [] : ["seeded"])];
  return { ...s, stake, capTable, flags, metrics: { ...s.metrics, cash: s.metrics.cash + r.amount, axes: { ...s.metrics.axes, finance: Math.min(100, s.metrics.axes.finance + 5) } } };
}

/** Moves shares from a holder to the player. */
export function transferToPlayer(s: Startup, sellerId: string, pct: number): Startup {
  const capTable = s.capTable.map((h) => (h.id === sellerId ? { ...h, pct: Math.max(0, h.pct - pct) } : h)).filter((h) => h.pct > 0.005);
  return { ...s, capTable, stake: s.stake + pct };
}

/** New shares for the player's board work; everyone else is diluted a little. */
export function grantToPlayer(s: Startup, pct: number): Startup {
  const d = pct / 100;
  return { ...s, capTable: s.capTable.map((h) => ({ ...h, pct: h.pct * (1 - d) })), stake: s.stake * (1 - d) + pct };
}

/** Who sells and at which price, if the player asks. Founders only sell a little and only when they trust you. */
export function sellers(s: Startup): { holder: Holder; pct: number; factor: number }[] {
  const out: { holder: Holder; pct: number; factor: number }[] = [];
  for (const h of s.capTable) {
    if (h.kind === "angel" || h.kind === "vc" || h.kind === "investor") out.push({ holder: h, pct: h.pct / 2, factor: 1 });
    if ((h.kind === "founder" || h.kind === "cofounder") && s.metrics.trust >= 70) out.push({ holder: h, pct: h.pct * 0.2, factor: FOUNDER_PREMIUM });
  }
  return out.filter((x) => x.pct >= 0.5);
}
