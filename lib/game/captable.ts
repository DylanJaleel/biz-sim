import { CARRY, FOUNDER_PREMIUM, LEAD_SHARE, ROUND_MIN, ROUND_MONTHS } from "./config";
import { dilute, monthlyCashFlow, NEW_INVESTORS, runwayMonths, valuation } from "./sim";
import type { ExitOffer, GvBallot, GvVote, Holder, HolderKind, Payout, Round, RoundTake, Startup } from "./types";

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
  syndicate: "Dein Syndikat",
  fund: "Dein Fonds",
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
export function roundTerms(s: Startup, roundsSoFar: number, random: () => number, sentiment = 0): RoundTerms {
  const burn = Math.max(0, -monthlyCashFlow(s.metrics));
  const amount = Math.max(ROUND_MIN, Math.round((burn * ROUND_MONTHS) / 10_000) * 10_000);
  const m = s.metrics;
  let factor = 0.75 + m.growth * 6 + (m.trust - 50) / 400 + (m.axes.finance - 50) / 300;
  if (s.flags.includes("investor_intro")) factor += 0.15;
  factor += sentiment * 0.15;
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
export function fundability(s: Startup, sentiment = 0): number {
  const m = s.metrics;
  const p = 0.2 + m.growth * 8 + (m.axes.finance - 50) / 150 + (m.trust - 50) / 300 + (s.flags.includes("investor_intro") ? 0.25 : 0) + sentiment * 0.15;
  return Math.min(0.9, Math.max(0.08, p));
}

export function postMoney(r: Pick<Round, "amount" | "preMoney">): number {
  return r.preMoney + r.amount;
}

/** What the player puts in for each choice. */
export function playerAmount(r: Pick<Round, "amount">, stake: number, take: RoundTake): number {
  if (take === "prorata" || take === "syndicate") return Math.round((r.amount * stake) / 100 / 1000) * 1000;
  if (take === "half") return Math.round((r.amount * stake) / 200 / 1000) * 1000;
  if (take === "lead") return Math.round((r.amount * LEAD_SHARE) / 1000) * 1000;
  return 0;
}

/** What the syndicate brings when the player leads with co-investors: the rest of the lead half. */
export function syndicateAmount(r: Pick<Round, "amount">, stake: number): number {
  return Math.max(0, Math.round((r.amount * LEAD_SHARE) / 1000) * 1000 - playerAmount(r, stake, "syndicate"));
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
    case "syndicate":
    case "fund":
      return { vote: "go", reason: "" };
  }
}

/** A syndicate or the player's fund votes the way the player votes. */
function withSyndicate(h: Holder, player: GvVote | "abstain", own: () => { vote: GvVote; reason: string }): { vote: GvVote | "abstain"; reason: string } {
  if (h.kind !== "syndicate" && h.kind !== "fund") return own();
  return { vote: player, reason: player === "abstain" ? "Ohne deine Weisung keine Stimme." : h.kind === "fund" ? "Dein Fonds stimmt wie du." : "Das Syndikat stimmt wie du." };
}

/**
 * The shareholders' meeting: every holder votes with their percentage, the
 * option pool does not vote. Majority of the voting shares decides.
 */
export function shareholderVote(r: Round, s: Startup, player: GvVote | "abstain"): { ballots: GvBallot[]; approved: boolean } {
  const ballots: GvBallot[] = votingHolders(s).map((h) => ({ id: h.id, name: h.name, kind: h.kind, pct: round2(h.pct), ...withSyndicate(h, player, () => holderVote(h, r, s)) }));
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

/**
 * Applies a closed round to the company: new money, new holders, everyone
 * diluted. New money is preferred: it is paid back first in an exit.
 */
export function applyRound(s: Startup, r: Round, invested: number, syndicate = 0): Startup {
  const post = postMoney(r);
  const keep = r.preMoney / post;
  const capTable = s.capTable.map((h) => ({ ...h, pct: h.pct * keep }));
  const leadMoney = r.amount - invested - syndicate;
  const leadPct = (leadMoney / post) * 100;
  const existing = capTable.find((h) => h.id === r.leadId);
  if (existing) {
    existing.pct += leadPct;
    existing.pref = (existing.pref ?? 0) + leadMoney;
  } else if (leadPct > 0.005) capTable.push({ id: r.leadId, name: r.lead, kind: "investor", pct: leadPct, pref: leadMoney });
  if (syndicate > 0) {
    const syn = capTable.find((h) => h.kind === "syndicate");
    if (syn) {
      syn.pct += (syndicate / post) * 100;
      syn.pref = (syn.pref ?? 0) + syndicate;
      syn.cost = (syn.cost ?? 0) + syndicate;
    } else capTable.push({ id: "syndikat", name: "Dein Syndikat", kind: "syndicate", pct: (syndicate / post) * 100, pref: syndicate, cost: syndicate });
  }
  const stake = s.stake * keep + (invested / post) * 100;
  const flags = [...s.flags.filter((f) => f !== "round_open" && f !== "investor_intro"), ...(s.flags.includes("seeded") ? [] : ["seeded"])];
  return {
    ...s,
    stake,
    capTable,
    playerPref: (s.playerPref ?? 0) + invested,
    playerCost: (s.playerCost ?? 0) + invested,
    flags,
    metrics: { ...s.metrics, cash: s.metrics.cash + r.amount, axes: { ...s.metrics.axes, finance: Math.min(100, s.metrics.axes.finance + 5) } },
  };
}

// ---------------------------------------------------------------------------
// Exits
// ---------------------------------------------------------------------------

/**
 * Who gets what when the company is sold. Preferred money (1×, non-participating)
 * chooses between getting its money back first and converting into its share.
 */
export function waterfall(s: Startup, price: number): { payouts: Payout[]; carry: number } {
  const parties = [
    ...s.capTable.map((h) => ({ id: h.id, name: h.name, kind: h.kind as Payout["kind"], pct: h.pct, pref: h.pref ?? 0, cost: h.cost ?? 0 })),
    { id: "you", name: "Du", kind: "you" as const, pct: s.stake, pref: s.playerPref ?? 0, cost: 0 },
  ];
  const takers = new Set<string>();
  let remaining = price;
  let commonPct = 0;
  for (let i = 0; i < 12; i++) {
    const prefSum = parties.filter((p) => takers.has(p.id)).reduce((sum, p) => sum + p.pref, 0);
    if (prefSum >= price) {
      const payouts = parties.map((p) => ({ id: p.id, name: p.name, kind: p.kind, pct: p.pct, pref: p.pref, amount: takers.has(p.id) ? (p.pref / prefSum) * price : 0 }));
      return withCarry(payouts, parties);
    }
    remaining = price - prefSum;
    commonPct = parties.filter((p) => !takers.has(p.id)).reduce((sum, p) => sum + p.pct, 0) || 1;
    let changed = false;
    for (const p of parties) {
      if (takers.has(p.id) || p.pref <= 0) continue;
      if ((remaining * p.pct) / commonPct < p.pref) {
        takers.add(p.id);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const payouts = parties.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    pct: p.pct,
    pref: p.pref,
    amount: takers.has(p.id) ? p.pref : (remaining * p.pct) / commonPct,
  }));
  return withCarry(payouts, parties);
}

/**
 * The player earns a share of the syndicate's gain on each deal (carry). The
 * own funds pay carry over their whole-fund waterfall instead (see funds.ts).
 */
function withCarry(payouts: Payout[], parties: { id: string; cost: number }[]): { payouts: Payout[]; carry: number } {
  let carry = 0;
  for (const p of payouts) {
    const cost = parties.find((x) => x.id === p.id)?.cost ?? 0;
    if (p.kind === "syndicate" && p.amount > cost) carry += (p.amount - cost) * CARRY;
  }
  return { payouts, carry };
}

function holderExitVote(h: Holder, offer: ExitOffer, s: Startup, payout: number): { vote: GvVote; reason: string } {
  const value = valuation(s.metrics);
  const runway = runwayMonths(s.metrics);
  const ratio = offer.price / Math.max(1, value);
  switch (h.kind) {
    case "founder":
    case "cofounder":
      if (ratio >= 1.25) return { vote: "go", reason: "Ein Preis, der unsere Arbeit würdigt. Ich verkaufe." };
      if (runway < 3 && ratio >= 0.8) return { vote: "go", reason: "Lieber jetzt verkaufen als in ein paar Monaten ohne Geld dastehen." };
      return { vote: "no", reason: "Wir sind mehr wert. Ich will das selbst zu Ende bringen." };
    case "vc":
    case "investor":
      if ((h.pref ?? 0) > 0 && payout >= (h.pref ?? 0) * 1.5) return { vote: "go", reason: "Unser Fonds macht ein gutes Vielfaches. Verkaufen." };
      if (ratio >= 1.1) return { vote: "go", reason: "Ein fairer Preis. Ein Fonds muss irgendwann zurückzahlen." };
      return { vote: "no", reason: "Zu billig. Dafür sind wir nicht eingestiegen." };
    case "angel":
      return ratio >= 1.1 ? { vote: "go", reason: "Ein guter Ausstieg, ich bin dabei." } : { vote: "no", reason: "Da verliere ich zu viel. Nein." };
    default:
      return { vote: "go", reason: "Einverstanden." };
  }
}

/** The shareholders vote on selling the company; payouts follow the waterfall. */
export function exitVote(offer: ExitOffer, s: Startup, player: GvVote | "abstain"): { ballots: GvBallot[]; approved: boolean; payouts: Payout[]; carry: number } {
  const { payouts, carry } = waterfall(s, offer.price);
  const paid = (id: string) => payouts.find((p) => p.id === id)?.amount ?? 0;
  const ballots: GvBallot[] = votingHolders(s).map((h) => ({
    id: h.id,
    name: h.name,
    kind: h.kind,
    pct: round2(h.pct),
    ...withSyndicate(h, player, () => holderExitVote(h, offer, s, paid(h.id))),
  }));
  ballots.push({
    id: "you",
    name: "Du",
    kind: "you",
    pct: round2(s.stake),
    vote: player,
    reason: player === "go" ? "Ich stimme dem Verkauf zu." : player === "no" ? "Ich stimme dagegen." : "Nicht abgestimmt.",
  });
  const voting = ballots.filter((b) => b.vote !== "abstain").reduce((sum, b) => sum + b.pct, 0);
  const yes = ballots.filter((b) => b.vote === "go").reduce((sum, b) => sum + b.pct, 0);
  return { ballots, approved: voting > 0 && yes > voting / 2, payouts, carry };
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
