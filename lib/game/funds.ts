import { CARRY, FUND_FEE, FUND_MAX_DEAL } from "./config";
import { mnaRandom } from "./lbo";
import { applyDelta } from "./sim";
import { companyValue } from "./venture";
import type { Ctx } from "./mna-core";
import type { FundFamily, FundRaising, FundState, FundTerms, GameState, IncomeLines, LpacKind, LpacVote, LpConcession, LpKind, LpProspect, Round, Startup } from "./types";
import {
  CONCESSION_COST,
  CROSS_FUND_AGE,
  FAIRNESS_OPINION_COST,
  FEE_CUT,
  FUND_ADMIN_COST,
  FUND_EXTENSION_MONTHS,
  FUND_FAMILY_MAX,
  FUND_FIRST_CLOSE,
  FUND_HARD_CAP,
  FUND_HURDLE,
  FUND_INVEST_MONTHS,
  FUND_NEXT_INVESTED,
  FUND_TARGET_FACTOR,
  FUND_TARGET_LIMITS,
  FUND_TERM_MONTHS,
  LP_TRUST_START,
  LPAC_DAYS,
  ROADSHOW_DAYS,
  ROADSHOW_MONTHS,
  SECONDARY_SALE,
} from "./venture-config";

// Die Fondsfamilie: Fonds I, II und III mit echten Investoren (LPs).
// Jeder Fonds rechnet Carry über einen Wasserfall für den ganzen Fonds
// (europäisch): erst bekommen die Investoren ihr eingezahltes Kapital zurück,
// dann 8 % Hurdle, dann holt der Manager auf (Catch-up), danach 80/20.
// Der Investorenbeirat (LPAC) entscheidet Interessenkonflikte, Fristen und Gebühren.

export const ROMAN = ["", "I", "II", "III"];
const mio = (n: number) => `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €`;
const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
const times = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;

export function defaultTerms(): FundTerms {
  return { fee: FUND_FEE, hurdle: FUND_HURDLE, carry: CARRY };
}

export function fundId(f: FundState): string {
  return f.id ?? "fonds";
}

function emptyFamily(): FundFamily {
  return { later: [], votes: [], trust: LP_TRUST_START, done: [] };
}

/** Fund I of an older game ran deal-by-deal carry: that carry counts as already paid. */
function legacyCarry(state: GameState): number {
  let carry = 0;
  for (const e of state.exits.filter((x) => x.status === "accepted")) {
    const s = state.startups.find((x) => x.id === e.startupId);
    for (const p of e.payouts ?? []) {
      if (p.kind !== "fund") continue;
      const cost = s?.capTable.find((h) => h.id === p.id)?.cost ?? 0;
      carry += Math.max(0, p.amount - cost) * CARRY;
    }
  }
  return carry;
}

/** Fund I with every field of the waterfall filled in. Pure: works on a copy. */
function normalizedFirst(state: GameState, f: FundState): FundState {
  if (f.wf) return f;
  const months = Math.max(0, state.month - f.raised);
  const paid = legacyCarry(state);
  return {
    ...f,
    id: "fonds",
    no: 1,
    wf: true,
    // Older games kept the fund's proceeds net of carry: count the carry back in.
    returned: f.returned + paid,
    carryPaid: paid,
    fees: Math.round((f.size * FUND_FEE * months) / 12),
    pref: Math.round(f.invested * FUND_HURDLE * (months / 12) * 0.5),
    terms: f.terms ?? defaultTerms(),
    ends: f.ends ?? f.raised + FUND_TERM_MONTHS,
  };
}

/** The fund family for writing; older games get one (and Fund I switches to the whole-fund waterfall). */
export function familyOf(state: GameState): FundFamily {
  if (state.fund && !state.fund.wf) state.fund = normalizedFirst(state, state.fund);
  if (!state.funds) state.funds = emptyFamily();
  return state.funds;
}

/** Read-only view for pages and bots. */
export function familyRead(state: GameState): FundFamily {
  return state.funds ?? emptyFamily();
}

/** All funds for writing, oldest first. */
export function fundsOf(state: GameState): FundState[] {
  const family = familyOf(state);
  return state.fund ? [state.fund, ...family.later] : [...family.later];
}

/** All funds as the player sees them, oldest first (never writes). */
export function fundsRead(state: GameState): FundState[] {
  const later = familyRead(state).later;
  return state.fund ? [normalizedFirst(state, state.fund), ...later] : [...later];
}

export function termsOf(f: FundState): FundTerms {
  return f.terms ?? defaultTerms();
}

export function endsOf(f: FundState): number {
  return f.ends ?? f.raised + FUND_TERM_MONTHS;
}

export function investing(state: GameState, f: FundState): boolean {
  return f.closed === undefined && state.month < f.raised + FUND_INVEST_MONTHS;
}

function pickInvesting(state: GameState, funds: FundState[]): FundState | undefined {
  const all = funds.filter((f) => f.closed === undefined && f.cash >= 10_000);
  return [...all].reverse().find((f) => investing(state, f)) ?? all[all.length - 1];
}

/** The fund that puts money into new deals: the newest one still investing with money left. */
export function investingFund(state: GameState): FundState | undefined {
  return pickInvesting(state, fundsOf(state));
}

/** Same as investingFund, for pages and bots (never writes). */
export function investingFundRead(state: GameState): FundState | undefined {
  return pickInvesting(state, fundsRead(state));
}

// ---------------------------------------------------------------------------
// Wasserfall und Kennzahlen
// ---------------------------------------------------------------------------

export interface WaterfallSplit {
  /** Kapital zurück an die Investoren. */
  capital: number;
  /** Vorzugsrendite (Hurdle) an die Investoren. */
  hurdle: number;
  /** Aufholung (Catch-up) für den Manager. */
  catchUp: number;
  /** Rest: Investoren und Manager im Verhältnis 80 zu 20. */
  restLp: number;
  restGp: number;
  lp: number;
  gp: number;
  /** Where each tranche ends (for the chart). */
  marks: { capital: number; hurdle: number; catchUp: number };
}

/** Splits all distributions of a fund (European, whole-fund waterfall). */
export function waterfallSplit(paidIn: number, pref: number, carry: number, total: number): WaterfallSplit {
  const capital = Math.min(total, paidIn);
  const hurdle = Math.min(total - capital, pref);
  const catchMax = carry < 1 ? (pref * carry) / (1 - carry) : 0;
  const catchUp = Math.min(total - capital - hurdle, catchMax);
  const rest = Math.max(0, total - capital - hurdle - catchUp);
  const restGp = rest * carry;
  const restLp = rest - restGp;
  return {
    capital,
    hurdle,
    catchUp,
    restLp,
    restGp,
    lp: capital + hurdle + restLp,
    gp: catchUp + restGp,
    marks: { capital: paidIn, hurdle: paidIn + pref, catchUp: paidIn + pref + catchMax },
  };
}

export function paidIn(f: FundState): number {
  return f.invested + (f.fees ?? 0);
}

/** What the fund's stakes are worth today, at the last round's price (paper value). */
export function fundNav(state: GameState, f: FundState): number {
  const id = fundId(f);
  let nav = 0;
  for (const s of state.startups) {
    if (s.status !== "active") continue;
    const h = s.capTable.find((x) => x.id === id && x.kind === "fund");
    if (h) nav += (h.pct / 100) * companyValue(s);
  }
  return nav;
}

export interface FundMetrics {
  paidIn: number;
  nav: number;
  /** Distributions to the investors (after carry) ÷ paid-in capital. */
  dpi: number;
  /** (Distributions + value of what is left, after carry) ÷ paid-in capital. */
  tvpi: number;
  investedShare: number;
  carryPaid: number;
  /** Carry the player would get if everything were sold today at paper value. */
  carryOpen: number;
  split: WaterfallSplit;
}

export function fundMetrics(state: GameState, f: FundState): FundMetrics {
  const t = termsOf(f);
  const paid = paidIn(f);
  const nav = fundNav(state, f);
  const carryPaid = f.carryPaid ?? 0;
  const split = waterfallSplit(paid, f.pref ?? 0, t.carry, f.returned + nav);
  const lpNow = f.returned - carryPaid;
  return {
    paidIn: paid,
    nav,
    dpi: paid > 0 ? lpNow / paid : 0,
    tvpi: paid > 0 ? split.lp / paid : 1,
    investedShare: f.size > 0 ? f.invested / f.size : 0,
    carryPaid,
    carryOpen: Math.max(0, split.gp - carryPaid),
    split,
  };
}

/** The track record investors look at: all funds so far, weighted by paid-in capital. */
export function trackRecord(state: GameState): { tvpi: number; dpi: number } {
  const funds = fundsRead(state).filter((f) => paidIn(f) > 0);
  const total = funds.reduce((sum, f) => sum + paidIn(f), 0);
  if (total === 0) return { tvpi: 1, dpi: 0 };
  let tvpi = 0;
  let dpi = 0;
  for (const f of funds) {
    const m = fundMetrics(state, f);
    tvpi += (m.tvpi * paidIn(f)) / total;
    dpi += (m.dpi * paidIn(f)) / total;
  }
  return { tvpi, dpi };
}

/**
 * Money flows back into a fund (sale, dividend, secondary): the investors get
 * theirs first, the player's carry follows the waterfall. Returns the carry paid.
 */
export function fundDistribute(state: GameState, f: FundState, amount: number): number {
  if (amount <= 0) return 0;
  f.returned += amount;
  const split = waterfallSplit(paidIn(f), f.pref ?? 0, termsOf(f).carry, f.returned);
  const pay = Math.max(0, split.gp - (f.carryPaid ?? 0));
  if (pay > 0) {
    f.carryPaid = (f.carryPaid ?? 0) + pay;
    state.cash += pay;
  }
  return pay;
}

/** Routes the fund lines of a sale's payouts into their funds; returns the carry the player gets. */
export function fundProceeds(ctx: Ctx, payouts: { id: string; kind: string; amount: number }[], name: string, notes: string[]): number {
  const funds = fundsOf(ctx.state);
  let carry = 0;
  for (const p of payouts) {
    if (p.kind !== "fund" || p.amount <= 0) continue;
    const f = funds.find((x) => fundId(x) === p.id) ?? funds[0];
    if (!f) continue;
    const paid = fundDistribute(ctx.state, f, p.amount);
    carry += paid;
    ctx.lesson("dpi_tvpi");
    if (paid > 0) {
      ctx.lesson("catch_up");
      notes.push(`${f.name}: ${name} bringt ${eur(p.amount)}. Die Investoren haben ihr Kapital und die Hurdle zurück, dein Carry: ${eur(paid)}.`);
    } else {
      notes.push(`${f.name}: ${name} bringt ${eur(p.amount)}. Das Geld geht an die Investoren, bis sie Kapital und Hurdle zurückhaben; Carry gibt es erst danach.`);
    }
  }
  return carry;
}

// ---------------------------------------------------------------------------
// Der Monat der Fonds: Gebühren, Kosten, Hurdle, Fristen, LPAC
// ---------------------------------------------------------------------------

/** Cost of the open positions: after the investment period a stepped-down fee is charged on it. */
function openCost(state: GameState, f: FundState): number {
  const id = fundId(f);
  return state.startups.filter((s) => s.status === "active").reduce((sum, s) => sum + (s.capTable.find((h) => h.id === id)?.cost ?? 0), 0);
}

export interface FeeLine {
  fee: number;
  admin: number;
  esg: number;
  keyPerson: number;
}

/** Fee and running costs of one fund in a month (what the player earns from it). */
export function feeLine(state: GameState, f: FundState): FeeLine {
  if (f.closed !== undefined) return { fee: 0, admin: 0, esg: 0, keyPerson: 0 };
  const t = termsOf(f);
  const extended = state.month >= f.raised + FUND_TERM_MONTHS;
  const base = investing(state, f) || !t.stepDown ? f.size : openCost(state, f);
  const fee = extended && t.waived ? 0 : Math.round((base * t.fee) / 12);
  const later = (f.no ?? 1) >= 2;
  return {
    fee,
    admin: later ? Math.round((f.size * FUND_ADMIN_COST) / 12) : 0,
    esg: t.esg ? Math.round(CONCESSION_COST.esg / 12) : 0,
    keyPerson: t.keyPerson && !state.team.some((m) => m.role === "partner") ? CONCESSION_COST.keyPerson : 0,
  };
}

/** Called from the holding's month: fees in, costs out, hurdle accrues. */
export function fundsFees(state: GameState, income: IncomeLines): void {
  if (!state.fund && !state.funds) return;
  let net = 0;
  for (const f of fundsOf(state)) {
    const line = feeLine(state, f);
    f.fees = (f.fees ?? 0) + line.fee;
    net += line.fee - line.admin - line.esg - line.keyPerson;
    // The hurdle accrues on the capital the investors have not yet got back.
    const back = Math.min(f.returned - (f.carryPaid ?? 0), paidIn(f));
    if (f.closed === undefined) f.pref = (f.pref ?? 0) + (Math.max(0, paidIn(f) - back) * termsOf(f).hurdle) / 12;
  }
  state.cash += net;
  income.fundFee = (income.fundFee ?? 0) + net;
}

/** Roadshow deadlines, fund terms and conflicts: what comes up for the LPAC. Runs after the month turned. */
export function fundsMonth(ctx: Ctx, notes: string[]): void {
  const state = ctx.state;
  if (!state.fund && !state.funds) return;
  const family = familyOf(state);
  const month = state.month;
  // Unanswered votes: the default applies.
  for (const v of family.votes.filter((x) => x.status === "open" && x.due < month)) decideLpac(ctx, v, defaultChoice(v.kind), notes, true);
  const r = family.raising;
  if (r && month >= r.expires) {
    if (committed(r) >= r.target * FUND_FIRST_CLOSE) closeFund(ctx, notes);
    else {
      family.raising = undefined;
      family.trust = Math.max(0, family.trust - 5);
      const text = `Die Roadshow für Fonds ${ROMAN[r.no]} ist gescheitert: Nur ${mio(committed(r))} zugesagt, für den First Close fehlen ${mio(r.target * FUND_FIRST_CLOSE - committed(r))}.`;
      notes.push(text);
      ctx.mail({ kind: "system", from: "Boardroom", subject: `Fonds ${ROMAN[r.no]}: kein Closing`, body: text });
    }
  }
  const funds = fundsOf(state);
  for (const f of funds) {
    if (f.closed !== undefined) continue;
    const id = fundId(f);
    const open = (kind: LpacKind) => family.votes.some((v) => v.fundId === id && v.kind === kind && v.status === "open");
    if (month >= f.raised + FUND_INVEST_MONTHS && !family.done.includes(`fee|${id}`)) {
      family.done.push(`fee|${id}`);
      addVote(ctx, { kind: "fee", fundId: id });
    }
    if (month >= endsOf(f) && !open("extension")) {
      if (fundNav(state, f) <= 1_000) {
        f.closed = month;
        notes.push(`${f.name} ist abgewickelt: Alle Beteiligungen sind verkauft.`);
      } else addVote(ctx, { kind: "extension", fundId: id });
    }
  }
  crossFundOffer(ctx, funds);
}

function crossFundOffer(ctx: Ctx, funds: FundState[]): void {
  const state = ctx.state;
  const family = familyOf(state);
  for (const older of funds) {
    if (older.closed !== undefined || state.month - older.raised < CROSS_FUND_AGE) continue;
    const key = `cross|${fundId(older)}`;
    if (family.done.includes(key)) continue;
    const later = funds.find((f) => (f.no ?? 1) > (older.no ?? 1) && investing(state, f) && f.cash >= 500_000);
    if (!later) continue;
    const target = state.startups
      .filter((s) => s.status === "active" && !s.capTable.some((h) => h.id === fundId(later)))
      .map((s) => ({ s, h: s.capTable.find((h) => h.id === fundId(older)) }))
      .filter((x) => x.h && x.h.pct >= 1)
      .map((x) => ({ ...x, value: (x.h!.pct / 100) * companyValue(x.s) * 0.5 }))
      .filter((x) => x.value >= 300_000 && x.value <= later.cash)
      .sort((a, b) => b.value - a.value)[0];
    if (!target) continue;
    family.done.push(key);
    addVote(ctx, { kind: "crossfund", fundId: fundId(older), otherFundId: fundId(later), startupId: target.s.id, amount: Math.round(target.value / 10_000) * 10_000 });
  }
}

// ---------------------------------------------------------------------------
// LPAC: Investorenbeirat
// ---------------------------------------------------------------------------

export interface LpacOption {
  id: string;
  label: string;
  text: string;
  /** Chance that the LPAC agrees (before trust). */
  chance: number;
  cost?: number;
}

export const LPAC_OPTIONS: Record<LpacKind, LpacOption[]> = {
  studio: [
    {
      id: "fair",
      label: "Mit Fairness Opinion vorlegen",
      text: "Ein unabhängiger Gutachter prüft den Preis (15.000 €). Der Fonds zahlt den heutigen Wert.",
      chance: 0.85,
      cost: FAIRNESS_OPINION_COST,
    },
    { id: "direct", label: "Zum Studio-Preis vorlegen", text: "Der Fonds soll 50 % über dem heutigen Wert einsteigen. Gut für dich, schlecht für die Investoren.", chance: 0.4 },
    { id: "drop", label: "Zurückziehen", text: "Die Studio-Firma bekommt kein Geld vom Fonds. Kein Konflikt.", chance: 1 },
  ],
  crossfund: [
    {
      id: "fair",
      label: "Mit unabhängiger Bewertung vorlegen",
      text: "Ein Gutachter setzt den Preis (15.000 €). Fonds I bekommt Geld für seine Investoren, der spätere Fonds steigt fair ein.",
      chance: 0.8,
      cost: FAIRNESS_OPINION_COST,
    },
    {
      id: "premium",
      label: "Mit 15 % Aufschlag vorlegen",
      text: "Fonds I verkauft teurer: mehr Rückfluss und Carry dort, auf Kosten der Investoren des späteren Fonds.",
      chance: 0.35,
    },
    { id: "drop", label: "Nicht vorlegen", text: "Fonds I behält den Anteil. Kein Konflikt.", chance: 1 },
  ],
  extension: [
    {
      id: "waive",
      label: "Verlängerung ohne Gebühr beantragen",
      text: "Ein Jahr mehr Zeit für gute Verkäufe; dafür verzichtest du in der Verlängerung auf die Gebühr.",
      chance: 0.9,
    },
    {
      id: "fee",
      label: "Verlängerung mit voller Gebühr beantragen",
      text: "Ein Jahr mehr Zeit und weiter Gebühr. Lehnt der LPAC ab, wird der Rest mit 25 % Abschlag verkauft.",
      chance: 0.45,
    },
    { id: "sell", label: "Rest am Zweitmarkt verkaufen", text: "Käufer für Fondsanteile zahlen 85 % des heutigen Werts. Der Fonds wird abgewickelt.", chance: 1 },
  ],
  fee: [
    {
      id: "stepdown",
      label: "Gebühr auf investiertes Kapital senken",
      text: "Marktüblich: Nach der Investitionsphase zählt nur noch das Geld, das noch in Firmen steckt.",
      chance: 1,
    },
    { id: "keep", label: "Volle Gebühr weiter beantragen", text: "Mehr Gebühr für dich. Das geht nur mit einem sehr guten Ergebnis durch.", chance: 0.25 },
  ],
};

export const LPAC_TITLE: Record<LpacKind, string> = {
  studio: "Interessenkonflikt: Fondsgeld für deine Studio-Firma",
  crossfund: "Interessenkonflikt: Fonds verkauft an Fonds",
  extension: "Die Laufzeit des Fonds endet",
  fee: "Gebühr nach der Investitionsphase",
};

function defaultChoice(kind: LpacKind): string {
  return kind === "fee" ? "stepdown" : kind === "extension" ? "fee" : "drop";
}

function addVote(ctx: Ctx, data: Omit<LpacVote, "id" | "month" | "due" | "status">): LpacVote {
  const state = ctx.state;
  const family = familyOf(state);
  const vote: LpacVote = { id: ctx.id("lpac"), month: state.month, due: state.month + 1, status: "open", ...data };
  family.votes.push(vote);
  if (family.votes.length > 30) family.votes.splice(0, family.votes.length - 30);
  ctx.lesson("lpac");
  const f = fundsOf(state).find((x) => fundId(x) === data.fundId);
  ctx.mail({
    kind: "system",
    from: `LPAC ${f?.name ?? "deines Fonds"}`,
    subject: LPAC_TITLE[data.kind],
    body: `${voteText(state, vote)} Der Investorenbeirat wartet auf deinen Vorschlag; bis Monatsende entscheidest du auf der Fonds-Seite, sonst gilt der Standard.`,
  });
  return vote;
}

/** Plain-language description of a vote. */
export function voteText(state: GameState, v: LpacVote): string {
  const fund = (id?: string) => fundsRead(state).find((f) => fundId(f) === id)?.name ?? "dein Fonds";
  const company = state.startups.find((s) => s.id === v.startupId)?.name ?? "die Firma";
  switch (v.kind) {
    case "studio":
      return `${fund(v.fundId)} soll ${mio(v.amount ?? 0)} in ${company} stecken, eine Firma aus deinem eigenen Venture Studio. Du sitzt auf beiden Seiten des Tisches: Je höher der Preis, desto besser für dich und desto schlechter für die Investoren.`;
    case "crossfund":
      return `${fund(v.fundId)} läuft aus und will einen Teil seines Anteils an ${company} für etwa ${mio(v.amount ?? 0)} an ${fund(v.otherFundId)} verkaufen. Du verwaltest beide Fonds: Den Preis darfst du nicht allein festlegen.`;
    case "extension":
      return `Die zehn Jahre von ${fund(v.fundId)} sind um, aber es stecken noch Beteiligungen darin. Verlängern, um besser zu verkaufen, oder jetzt am Zweitmarkt verkaufen?`;
    case "fee":
      return `Die Investitionsphase von ${fund(v.fundId)} ist vorbei: Neue Firmen kommen nicht mehr dazu. Üblich ist, die Gebühr ab jetzt nur noch auf das investierte Kapital zu rechnen.`;
  }
}

export function lpacChance(state: GameState, v: LpacVote, option: LpacOption): number {
  if (option.chance >= 1) return 1;
  const trust = familyRead(state).trust;
  let chance = option.chance + (trust - LP_TRUST_START) / 200;
  if (v.kind === "fee" && option.id === "keep") {
    const f = fundsRead(state).find((x) => fundId(x) === v.fundId);
    if (f) chance += (fundMetrics(state, f).tvpi - 1) * 0.3;
  }
  return Math.max(0.05, Math.min(0.95, chance));
}

/** The player's proposal goes to the LPAC; the outcome follows at once. */
export function playLpac(ctx: Ctx, voteId: string, choice: string): void {
  const family = familyOf(ctx.state);
  const v = family.votes.find((x) => x.id === voteId);
  if (!v || v.status !== "open") ctx.fail("Diese Abstimmung des LPAC liegt nicht mehr vor.");
  const option = LPAC_OPTIONS[v.kind].find((o) => o.id === choice);
  if (!option) ctx.fail("Diesen Vorschlag gibt es nicht.");
  if (option.cost && ctx.state.cash < option.cost) ctx.fail(`Für das Gutachten fehlen dir ${eur(option.cost)}.`);
  if (option.chance < 1 || option.cost) ctx.spend("lpac", "Sitzung des LPAC", LPAC_DAYS);
  const notes: string[] = [];
  decideLpac(ctx, v, choice, notes, false);
}

function decideLpac(ctx: Ctx, v: LpacVote, choice: string, notes: string[], lapsed: boolean): void {
  const state = ctx.state;
  const family = familyOf(state);
  const option = LPAC_OPTIONS[v.kind].find((o) => o.id === choice) ?? LPAC_OPTIONS[v.kind].find((o) => o.id === defaultChoice(v.kind))!;
  const funds = fundsOf(state);
  const f = funds.find((x) => fundId(x) === v.fundId);
  const other = funds.find((x) => fundId(x) === v.otherFundId);
  const s = state.startups.find((x) => x.id === v.startupId);
  const trust = (d: number) => (family.trust = Math.max(0, Math.min(100, family.trust + d)));
  if (option.cost) state.cash -= option.cost;
  const yes = mnaRandom(state, `lpac|${v.id}|${option.id}`)() < lpacChance(state, v, option);
  v.choice = option.id;
  v.status = yes ? "approved" : "rejected";
  let result = "";
  switch (v.kind) {
    case "studio": {
      if (option.id === "drop" || !f || !s || s.status !== "active") {
        trust(2);
        v.status = "done";
        result = "Zurückgezogen. Die Studio-Firma finanziert sich ohne den Fonds.";
        break;
      }
      if (!yes) {
        trust(option.id === "direct" ? -12 : -3);
        if (option.id === "direct") ctx.reputation(-2);
        result =
          option.id === "direct"
            ? "Abgelehnt. Die Investoren fühlen sich übervorteilt; das spricht sich herum."
            : "Abgelehnt, trotz Gutachten. Die Investoren wollen keine Firma des Managers im Fonds.";
        break;
      }
      const amount = Math.min(v.amount ?? 0, f.cash);
      const pre = companyValue(s) * (option.id === "direct" ? 1.5 : 1);
      if (amount < 10_000) {
        result = "Zugestimmt, aber im Fonds ist kein Geld mehr frei.";
        break;
      }
      ctx.replace(fundInvest(f, s, amount, Math.max(pre, 100_000)));
      trust(option.id === "direct" ? -4 : 3);
      result = `Zugestimmt. ${f.name} investiert ${mio(amount)} in ${s.name}${option.id === "direct" ? " zum Studio-Preis. Die Investoren murren" : " zum geprüften Preis"}.`;
      break;
    }
    case "crossfund": {
      if (option.id === "drop" || !f || !other || !s || s.status !== "active") {
        trust(1);
        v.status = "done";
        result = "Nicht vorgelegt. Fonds I behält den Anteil.";
        break;
      }
      if (!yes) {
        trust(option.id === "premium" ? -12 : -2);
        if (option.id === "premium") ctx.reputation(-2);
        result =
          option.id === "premium"
            ? "Abgelehnt. Ein Aufschlag zwischen zwei eigenen Fonds riecht nach Selbstbedienung."
            : "Abgelehnt. Die Investoren wollen keine Geschäfte zwischen den Fonds.";
        break;
      }
      const price = Math.min(other.cash, (v.amount ?? 0) * (option.id === "premium" ? 1.15 : 1));
      const holder = s.capTable.find((h) => h.id === fundId(f));
      if (!holder || price < 10_000) {
        result = "Zugestimmt, aber der Anteil ist inzwischen weg.";
        break;
      }
      const pct = Math.min(holder.pct * 0.5, (price / Math.max(1, companyValue(s))) * 100);
      const share = pct / holder.pct;
      const cost = (holder.cost ?? 0) * share;
      const capTable = s.capTable.map((h) => (h.id === holder.id ? { ...h, pct: h.pct - pct, cost: (h.cost ?? 0) - cost, pref: (h.pref ?? 0) * (1 - share) } : h));
      const buyer = capTable.find((h) => h.id === fundId(other));
      if (buyer) {
        buyer.pct += pct;
        buyer.cost = (buyer.cost ?? 0) + price;
      } else capTable.push({ id: fundId(other), name: other.name, kind: "fund", pct, pref: (holder.pref ?? 0) * share, cost: price });
      ctx.replace({ ...s, capTable });
      other.cash -= price;
      other.invested += price;
      const carry = fundDistribute(state, f, price);
      trust(option.id === "premium" ? -5 : 3);
      result = `Zugestimmt. ${other.name} kauft für ${mio(price)} von ${f.name}${carry > 0 ? `; dein Carry aus ${f.name}: ${eur(carry)}` : ""}.`;
      break;
    }
    case "extension": {
      if (!f) break;
      if (option.id === "sell") {
        const got = sellRest(state, f, SECONDARY_SALE.offered);
        trust(2);
        v.status = "done";
        result = `Verkauft. Käufer am Zweitmarkt zahlen ${mio(got)}; ${f.name} ist abgewickelt.`;
        break;
      }
      if (yes) {
        f.ends = endsOf(f) + FUND_EXTENSION_MONTHS;
        f.terms = { ...termsOf(f), ...(option.id === "waive" ? { waived: true } : {}) };
        trust(option.id === "waive" ? 3 : -3);
        result = `Verlängert um ein Jahr${option.id === "waive" ? ", ohne Gebühr" : ""}.`;
      } else {
        const got = sellRest(state, f, SECONDARY_SALE.forced);
        trust(-6);
        result = `Abgelehnt. Der Rest wird mit Abschlag verkauft: ${mio(got)}. ${f.name} ist abgewickelt.`;
      }
      break;
    }
    case "fee": {
      if (!f) break;
      if (option.id === "keep" && yes) {
        trust(-3);
        result = "Zugestimmt. Die volle Gebühr läuft weiter, die Investoren merken es sich.";
      } else {
        f.terms = { ...termsOf(f), stepDown: true };
        trust(option.id === "keep" ? -8 : 4);
        result =
          option.id === "keep"
            ? "Abgelehnt. Die Gebühr zählt ab jetzt nur auf das investierte Kapital."
            : "Beschlossen. Die Gebühr zählt ab jetzt nur auf das investierte Kapital.";
        if (option.id === "stepdown") v.status = "done";
      }
      break;
    }
  }
  if (lapsed) result = `Ohne deinen Vorschlag: ${result}`;
  v.result = result;
  notes.push(`LPAC: ${result}`);
}

/** A fund buys new shares of a company: money into the company, shares and a 1x preference for the fund. */
export function fundInvest(f: FundState, s: Startup, amount: number, pre: number): Startup {
  const d = amount / (pre + amount);
  const next = applyDelta(s, { cash: amount, dilution: d, dilutionTo: { id: fundId(f), name: f.name, kind: "fund" } });
  const holder = next.capTable.find((h) => h.id === fundId(f))!;
  holder.pref = (holder.pref ?? 0) + amount;
  holder.cost = (holder.cost ?? 0) + amount;
  f.cash -= amount;
  f.invested += amount;
  return next;
}

/**
 * A round closed at a company a fund holds: the fund takes its pro-rata share
 * of the new shares from the lead, out of its reserves, up to a quarter of the fund per company.
 */
export function fundFollowOn(ctx: Ctx, round: Round, notes: string[]): void {
  const state = ctx.state;
  const s = state.startups.find((x) => x.id === round.startupId);
  if (!s || s.status !== "active") return;
  const post = round.preMoney + round.amount;
  const lead = s.capTable.find((h) => h.id === round.leadId);
  if (!lead || post <= 0) return;
  let capTable = s.capTable;
  for (const f of fundsOf(state)) {
    const id = fundId(f);
    const h = capTable.find((x) => x.id === id && x.kind === "fund");
    if (!h || f.closed !== undefined || state.month >= endsOf(f) - 24) continue;
    const before = h.pct / ((round.preMoney / post) * 100 || 1);
    const room = f.size * FUND_MAX_DEAL - (h.cost ?? 0);
    const amount = Math.floor(Math.min(round.amount * before, room, f.cash, (lead.pref ?? 0) * 0.9) / 1000) * 1000;
    if (amount < 10_000) continue;
    const pct = (amount / post) * 100;
    if (pct >= lead.pct) continue;
    capTable = capTable.map((x) =>
      x.id === lead.id
        ? { ...x, pct: x.pct - pct, pref: (x.pref ?? 0) - amount }
        : x.id === id
          ? { ...x, pct: x.pct + pct, pref: (x.pref ?? 0) + amount, cost: (x.cost ?? 0) + amount }
          : x,
    );
    f.cash -= amount;
    f.invested += amount;
    notes.push(`${f.name} zieht bei ${s.name} anteilig mit: ${eur(amount)}.`);
  }
  if (capTable !== s.capTable) ctx.replace({ ...s, capTable });
}

/** Secondary sale of all the fund's stakes; returns the money it brought. */
function sellRest(state: GameState, f: FundState, factor: number): number {
  const id = fundId(f);
  let total = 0;
  for (const s of state.startups) {
    if (s.status !== "active") continue;
    const h = s.capTable.find((x) => x.id === id);
    if (!h) continue;
    total += (h.pct / 100) * companyValue(s) * factor;
    h.id = `sek-${id}-${s.id}`;
    h.kind = "investor";
    h.name = "Käufer am Zweitmarkt";
    delete h.cost;
  }
  fundDistribute(state, f, total);
  f.closed = state.month;
  return total;
}

/** A fund is asked to put money into a studio company: always a conflict for the LPAC. */
export function askLpacForStudio(ctx: Ctx, s: Startup, amount: number): LpacVote | null {
  const f = investingFund(ctx.state);
  if (!f) return null;
  return addVote(ctx, { kind: "studio", fundId: fundId(f), startupId: s.id, amount: Math.min(amount, f.cash, f.size * FUND_MAX_DEAL) });
}

// ---------------------------------------------------------------------------
// Fonds II und III: Roadshow bei Investoren
// ---------------------------------------------------------------------------

interface LpDef {
  name: string;
  kind: LpKind;
  share: number;
  minTvpi?: number;
  minDpi?: number;
  wish?: LpConcession;
}

const LP_POOL: LpDef[] = [
  { name: "Versorgungswerk Hanse", kind: "pension", share: 0.2, minTvpi: 1.25, wish: "esg" },
  { name: "Pensionskasse Rheintal", kind: "pension", share: 0.15, minDpi: 0.25, wish: "lpacSeat" },
  { name: "Sparkasse Elbufer", kind: "bank", share: 0.1, minTvpi: 1.05 },
  { name: "Family Office Lindqvist", kind: "familyoffice", share: 0.12, minTvpi: 1.15, wish: "keyPerson" },
  { name: "Nordstern Dachfonds", kind: "fof", share: 0.2, minTvpi: 1.45, wish: "fee" },
  { name: "Stiftung Mittelstand Morgen", kind: "foundation", share: 0.08, minTvpi: 1, wish: "esg" },
  { name: "Alpenrand Versicherung", kind: "insurer", share: 0.18, minDpi: 0.4, wish: "fee" },
];
const PRIVATE_LP: LpDef = { name: "Unternehmerkreis aus deinem Netzwerk", kind: "private", share: 0.08 };

export const LP_KIND_LABEL: Record<LpKind, string> = {
  pension: "Pensionskasse",
  insurer: "Versicherung",
  familyoffice: "Family Office",
  fof: "Dachfonds",
  foundation: "Stiftung",
  bank: "Bank",
  private: "Privatinvestoren",
};

export function nextFundNo(state: GameState): number {
  return fundsRead(state).length + 1;
}

/** Why the player cannot start the roadshow for the next fund, or null. */
export function nextFundBlocker(state: GameState): string | null {
  const funds = fundsRead(state);
  if (funds.length === 0) return "Zuerst legst du in der Holding Fonds I auf.";
  if (familyRead(state).raising) return "Die Roadshow läuft schon.";
  if (funds.length >= FUND_FAMILY_MAX) return "Drei Fonds sind genug für eine Fondsfamilie.";
  const latest = funds[funds.length - 1]!;
  const share = latest.size > 0 ? latest.invested / latest.size : 0;
  if (share < FUND_NEXT_INVESTED)
    return `${latest.name} ist erst zu ${Math.round(share * 100)} % investiert. Ab ${Math.round(FUND_NEXT_INVESTED * 100)} % kannst du Fonds ${ROMAN[funds.length + 1]} auflegen.`;
  return null;
}

export function targetSize(state: GameState, no = nextFundNo(state)): number {
  const funds = fundsRead(state);
  const prev = funds[funds.length - 1];
  const limits = FUND_TARGET_LIMITS[no] ?? [10_000_000, 60_000_000];
  const tr = trackRecord(state);
  const factor = Math.max(1.5, Math.min(3.5, FUND_TARGET_FACTOR + (tr.tvpi - 1) * 1.5));
  return Math.round(Math.max(limits[0], Math.min(limits[1], (prev?.size ?? 0) * factor)) / 1_000_000) * 1_000_000;
}

export function committed(r: FundRaising): number {
  return r.lps.filter((l) => l.status === "committed").reduce((sum, l) => sum + l.amount, 0);
}

export function hasConcession(t: FundTerms, c: LpConcession): boolean {
  return c === "fee" ? t.fee < FUND_FEE : Boolean(t[c]);
}

function grant(t: FundTerms, c: LpConcession): FundTerms {
  return c === "fee" ? { ...t, fee: FUND_FEE - FEE_CUT } : { ...t, [c]: true };
}

/** What the investor's check of the track record says: >= 0 means yes. */
export function lpScore(state: GameState, lp: LpProspect): number {
  const tr = trackRecord(state);
  const family = familyRead(state);
  const metric = lp.minDpi !== undefined ? (tr.dpi - lp.minDpi) * 1.5 : tr.tvpi - (lp.minTvpi ?? 1);
  return metric + (family.trust - LP_TRUST_START) / 250 + (state.reputation - 80) / 200;
}

export function playFund(ctx: Ctx, move: string, lpId?: string): void {
  const state = ctx.state;
  const family = familyOf(state);
  switch (move) {
    case "launch": {
      const why = nextFundBlocker(state);
      if (why) ctx.fail(why);
      if (!state.familyOffice) ctx.fail("Einen Fonds legst du aus dem Family Office auf.");
      ctx.spend("fund", "Roadshow: Präsentation vorbereiten", ROADSHOW_DAYS.launch);
      const no = nextFundNo(state);
      const target = targetSize(state, no);
      const r = mnaRandom(state, `roadshow|${no}`);
      const pool = [...LP_POOL];
      const picked: LpDef[] = [];
      while (picked.length < (no >= 3 ? 6 : 5) && pool.length > 0) picked.push(pool.splice(Math.floor(r() * pool.length) % pool.length, 1)[0]!);
      picked.push(PRIVATE_LP);
      const stricter = no >= 3 ? 0.15 : 0;
      family.raising = {
        no,
        started: state.month,
        expires: state.month + ROADSHOW_MONTHS,
        target,
        terms: defaultTerms(),
        lps: picked.map((d, i) => ({
          id: `lp${no}-${i}`,
          name: d.name,
          kind: d.kind,
          amount: Math.round((target * d.share * (0.85 + r() * 0.3)) / 100_000) * 100_000,
          ...(d.minTvpi !== undefined ? { minTvpi: Math.round((d.minTvpi + stricter) * 100) / 100 } : {}),
          ...(d.minDpi !== undefined ? { minDpi: Math.round((d.minDpi + stricter) * 100) / 100 } : {}),
          ...(d.wish ? { wish: d.wish } : {}),
          status: "open" as const,
        })),
      };
      ctx.lesson("dpi_tvpi");
      ctx.mail({
        kind: "system",
        from: "Boardroom",
        subject: `Roadshow für Fonds ${ROMAN[no]} gestartet`,
        body: `Zielgröße ${mio(target)}. First Close ab ${mio(target * FUND_FIRST_CLOSE)}, höchstens ${mio(target * FUND_HARD_CAP)} (Hard Cap). Jeder Termin bei einem Investor kostet einen Tag; sie schauen auf DPI und TVPI deiner bisherigen Fonds. Du hast zwölf Monate.`,
      });
      return;
    }
    case "pitch": {
      const r = family.raising;
      if (!r) ctx.fail("Es läuft keine Roadshow.");
      const lp = r.lps.find((l) => l.id === lpId);
      if (!lp || lp.status !== "open") ctx.fail("Dieser Investor ist schon angesprochen.");
      ctx.spend("fund", `Roadshow: ${lp.name}`, ROADSHOW_DAYS.pitch);
      const tr = trackRecord(state);
      if (lpScore(state, lp) < 0) {
        lp.status = "declined";
        lp.note =
          lp.minDpi !== undefined
            ? `Wir wollen erst echte Rückflüsse sehen: DPI ab ${times(lp.minDpi)}, bei dir ${times(tr.dpi)}.`
            : `Uns fehlt das Ergebnis: TVPI ab ${times(lp.minTvpi ?? 1)}, bei dir ${times(tr.tvpi)}.`;
        return;
      }
      if (lp.wish && !hasConcession(r.terms, lp.wish)) {
        lp.status = "wants";
        lp.note = "Wir sind dabei, wenn du uns entgegenkommst.";
        return;
      }
      commit(r, lp);
      return;
    }
    case "concede":
    case "refuse": {
      const r = family.raising;
      const lp = r?.lps.find((l) => l.id === lpId);
      if (!r || !lp || lp.status !== "wants" || !lp.wish) ctx.fail("Dieser Investor wartet nicht auf eine Antwort.");
      if (move === "refuse") {
        lp.status = "declined";
        lp.note = "Ohne Zugeständnis steigen wir nicht ein.";
        return;
      }
      r.terms = grant(r.terms, lp.wish);
      for (const other of r.lps.filter((l) => l.status === "wants" && l.wish && hasConcession(r.terms, l.wish))) commit(r, other);
      return;
    }
    case "close": {
      const r = family.raising;
      if (!r) ctx.fail("Es läuft keine Roadshow.");
      if (committed(r) < r.target * FUND_FIRST_CLOSE) ctx.fail(`Für das Closing brauchst du mindestens ${mio(r.target * FUND_FIRST_CLOSE)} Zusagen.`);
      ctx.spend("fund", `Closing Fonds ${ROMAN[r.no]}`, ROADSHOW_DAYS.close);
      closeFund(ctx, []);
      return;
    }
    default:
      ctx.fail("Diesen Schritt gibt es nicht.");
  }
}

function commit(r: FundRaising, lp: LpProspect): void {
  const room = r.target * FUND_HARD_CAP - committed(r);
  lp.amount = Math.max(0, Math.min(lp.amount, Math.round(room / 100_000) * 100_000));
  lp.status = lp.amount > 0 ? "committed" : "declined";
  lp.note = lp.amount > 0 ? "Zugesagt." : "Der Fonds ist voll.";
}

function closeFund(ctx: Ctx, notes: string[]): void {
  const state = ctx.state;
  const family = familyOf(state);
  const r = family.raising!;
  const size = Math.round(Math.min(committed(r), r.target * FUND_HARD_CAP) / 100_000) * 100_000;
  const f: FundState = {
    id: `fonds${r.no}`,
    no: r.no,
    name: `Dein Fonds ${ROMAN[r.no]}`,
    size,
    cash: size,
    invested: 0,
    returned: 0,
    raised: state.month,
    fees: 0,
    pref: 0,
    carryPaid: 0,
    wf: true,
    terms: r.terms,
    ends: state.month + FUND_TERM_MONTHS,
  };
  family.later.push(f);
  family.raising = undefined;
  ctx.reputation(3);
  ctx.lesson("hurdle");
  const investors = r.lps.filter((l) => l.status === "committed").length;
  const text = `${f.name} ist geschlossen: ${mio(size)} von ${investors} Investoren. Gebühr ${(r.terms.fee * 100).toLocaleString("de-DE")} % im Jahr, Carry 20 % nach Kapital und ${Math.round(r.terms.hurdle * 100)} % Hurdle. Neue Beteiligungen finanziert ab jetzt ${f.name} mit.`;
  notes.push(text);
  ctx.mail({ kind: "system", from: "Boardroom", subject: `Closing: ${f.name}`, body: text });
}

// ---------------------------------------------------------------------------
// Ansicht
// ---------------------------------------------------------------------------

export interface FundCard {
  fund: FundState;
  id: string;
  roman: string;
  metrics: FundMetrics;
  terms: FundTerms;
  fee: FeeLine;
  investing: boolean;
  ends: number;
  investUntil: number;
}

export function fundCards(state: GameState): FundCard[] {
  return fundsRead(state).map((f) => ({
    fund: f,
    id: fundId(f),
    roman: ROMAN[f.no ?? 1] ?? "",
    metrics: fundMetrics(state, f),
    terms: termsOf(f),
    fee: feeLine(state, f),
    investing: investing(state, f),
    ends: endsOf(f),
    investUntil: f.raised + FUND_INVEST_MONTHS,
  }));
}

/** Companies a fund holds, for the fund page. */
export function fundHoldings(state: GameState, f: FundState): { id: string; name: string; pct: number; cost: number; value: number; status: string }[] {
  const id = fundId(f);
  return state.startups
    .map((s) => ({ s, h: s.capTable.find((x) => x.id === id && x.kind === "fund") }))
    .filter((x) => x.h && (x.s.status === "active" || x.s.status === "exited"))
    .map(({ s, h }) => ({ id: s.id, name: s.name, pct: h!.pct, cost: h!.cost ?? 0, value: s.status === "active" ? (h!.pct / 100) * companyValue(s) : 0, status: s.status }));
}
