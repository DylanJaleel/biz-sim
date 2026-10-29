import { generateDeal, LAST } from "./dealgen";
import { annualEbitda, enterpriseValue, fairMultiple, sizeMultiple } from "./ebitda";
import {
  ACQUIRE_DAYS,
  BANK_MAX_LEVERAGE,
  BANK_MAX_SHARE,
  BANK_RATE,
  BANK_RATE_REGIME,
  BANK_SPREAD_PER_TURN,
  BANK_YEARS,
  COVENANT,
  COVENANT_PENALTY_RATE,
  COVENANT_WAIVER_FEE,
  COST_FLEX,
  CYCLE_REVENUE,
  DD_MODULES,
  EBITDA_GROWTH_CAP,
  GROSS_MARGIN_REVERSION,
  MARGIN_CEILING,
  MARGIN_REVERSION,
  DIVIDEND_MAX_LEVERAGE,
  EARNOUT_MAX,
  EARNOUT_MONTHS,
  FORCED_SALE,
  HANDOVER_MONTHS,
  HANDOVER_RISK,
  LOW_BID,
  MIN_EQUITY,
  SEARCH_MAX_MONTHS,
  SEARCH_QUIET_MONTHS,
  SEARCH_REPUTATION,
  SEARCH_START_DAYS,
  SEARCH_TARGET_CHANCE,
  SEARCH_TARGET_EV,
  SEARCH_TARGET_EV_BOUNDS,
  SEARCH_WORTH,
  SEARCHER_EARN_IN,
  TRANSACTION_COST,
  VENDOR_MAX,
  VENDOR_MONTHS,
  VENDOR_RATE,
  WORKING_CASH_MONTHS,
  type DdModule,
} from "./mna-config";
import { between, ddCost, eur, generateFindings, mio, mnaOf, pickOf, priceAfterFindings, roundTo, times, type Ctx } from "./mna-core";
import { applyDelta, valuation } from "./sim";
import { BUYOUT_REPUTATION } from "./config";
import { INTERIM } from "./network-config";
import { guaranteeClaim, guaranteeText } from "./holdco";
import { handoverFactor } from "./team";
import type { AddonTarget, Delta, Finding, GameState, IncomeLines, LboState, Metrics, Regime, Searcher, SearchFund, Startup } from "./types";

// Kaufen mit fremdem Geld: Übernahme eines Familienbetriebs mit Bankkredit,
// Verkäuferdarlehen und Earn-out, danach Zins, Tilgung und Covenants. Dazu das
// Nachfolge-Programm nach dem Vorbild der Search Funds: Du finanzierst eine
// Suchende, sie findet eine Firma und führt sie danach als Geschäftsführerin.

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Monthly payment of a loan paid back in equal instalments. */
export function annuityOf(amount: number, rate: number, months: number): number {
  if (amount <= 0) return 0;
  const r = rate / 12;
  return Math.round((amount * r) / (1 - Math.pow(1 + r, -months)));
}

/** Annual EBITDA at which a company is worth `ev` on the size curve. */
export function solveEbitda(ev: number): number {
  let e = ev / 5;
  for (let i = 0; i < 12; i++) e = ev / sizeMultiple(e);
  return e;
}

// ---------------------------------------------------------------------------
// Zielfirmen
// ---------------------------------------------------------------------------

export type TargetSource = "market" | "search" | "referral";

/**
 * A family business looking for a successor, valued by EBITDA. Searchers find
 * cheaper ones (no auction), the open market is pricier, a referral sits in
 * between. Some problems are hidden; the due diligence modules find them.
 */
export function targetDeal(ctx: Ctx, r: () => number, opts: { ev: number; source: TargetSource; search?: SearchFund; from?: string; name?: string }): Startup {
  const state = ctx.state;
  const taken = new Set(state.startups.map((s) => s.name));
  const def = generateDeal(r, "buyout", ctx.id("d"), state.month, taken);
  if (opts.name && !taken.has(opts.name)) def.name = opts.name;
  const gm = def.metrics.grossMargin;
  const margin = clamp(gm * between(r, 0.2, 0.34), 0.05, 0.22);
  const ebitda = roundTo(solveEbitda(opts.ev), 10_000);
  const revenue = roundTo(ebitda / 12 / margin, 100);
  const opex = roundTo(revenue * gm - ebitda / 12, 100);
  const cash = roundTo(opex * between(r, 2, 4), 1000);
  const roll = r();
  const rollover = roll < 0.45 ? 0 : roll < 0.8 ? 10 : 20;
  const owner = def.board.find((b) => b.seat === "ceo")!;
  const metrics: Metrics = { ...def.metrics, revenue, opex, cash, debt: 0, valuedOn: "ebitda" };
  const fair = fairMultiple(metrics);
  const factor = opts.source === "search" ? between(r, 0.9, 1.0) : opts.source === "referral" ? between(r, 0.9, 1.0) : between(r, 0.98, 1.15);
  const multiple = Math.round(fair * factor * 10) / 10;
  const ev = roundTo(ebitda * multiple, 10_000);
  const stake = 100 - rollover;
  const keep = rollover > 0 ? ` Ich behalte ${rollover} % und bleibe ein Jahr an Bord.` : " Ich verkaufe alles und begleite die Übergabe ein Jahr lang.";
  const deal = `Kaufpreis für das ganze Unternehmen (ohne Kasse und Schulden): ${mio(ev)}, das sind ${times(multiple)} des EBITDA von ${eur(ebitda)}.`;
  const mail =
    opts.source === "search"
      ? {
          from: `${opts.search!.searcher.name}, Nachfolge-Programm`,
          subject: `Zielfirma gefunden: ${def.name}`,
          body: `Ich habe ${def.name} in ${def.names.city} gefunden: ${def.tagline}. ${owner.name} sucht seit Jahren eine Nachfolge und hat noch mit niemandem sonst gesprochen. ${deal}${keep.replace("Ich behalte", "Der Inhaber behält").replace("und bleibe", "und bleibt").replace("Ich verkaufe alles und begleite", "Er verkauft alles und begleitet")} Prüfen, finanzieren, entscheiden: Das Angebot gilt zwei Monate.`,
        }
      : opts.source === "referral"
        ? {
            from: `${owner.name}, ${def.name}`,
            subject: `Empfehlung von ${opts.from}: ${def.name} sucht eine Nachfolge`,
            body: `${opts.from} hat mir Ihren Namen gegeben. Ich führe ${def.name} in ${def.names.city}. ${deal}${keep} Ich spreche zuerst mit Ihnen, bevor ich einen Berater beauftrage.`,
          }
        : {
            from: `M&A-Boutique im Auftrag von ${owner.name}`,
            subject: `Nachfolge gesucht: ${def.tagline}`,
            body: `Wir begleiten den Verkauf von ${def.name} in ${def.names.city}. ${def.tagline}. ${deal}${keep.replace("Ich behalte", "Der Inhaber behält").replace("und bleibe", "und bleibt").replace("Ich verkaufe alles und begleite", "Er verkauft alles und begleitet")} Andere Käufer sind ebenfalls im Gespräch.`,
          };
  def.metrics = metrics;
  def.stake = stake;
  def.capTable = rollover > 0 ? [{ id: "ceo", name: owner.name, kind: "founder", pct: rollover }] : [];
  def.mail = mail;
  def.diligence = [
    { label: "Ertrag", text: `EBITDA ${eur(ebitda)} im Jahr, ${Math.round(margin * 100)} % vom Umsatz. Keine Bankschulden: Gekauft wird ohne Kasse und Schulden.`, tone: "good" },
    ...def.diligence.slice(1),
    { label: "Prüfung", text: "Diese Übersicht ersetzt keine Due Diligence. Financial, Legal, Tax und Commercial prüfst du beim Strukturieren der Übernahme.", tone: "warn" },
  ];
  const s = ctx.addDeal(def);
  s.offer = {
    ...s.offer!,
    ev,
    multiple,
    ticket: roundTo((ev * stake) / 100, 1000),
    expires: state.month + 1,
    source: opts.source,
    ...(opts.search ? { searchId: opts.search.id } : {}),
  };
  s.findings = generateFindings(r, { ev, ebitda: ebitda / 12, topCustomer: metrics.topCustomer, revenue, grossMargin: gm });
  return s;
}

/** Size of a target an investor of this net worth can carry. */
export function targetEv(worth: number, r: () => number): number {
  return roundTo(clamp(worth * between(r, SEARCH_TARGET_EV[0], SEARCH_TARGET_EV[1]), SEARCH_TARGET_EV_BOUNDS[0], SEARCH_TARGET_EV_BOUNDS[1]), 100_000);
}

// ---------------------------------------------------------------------------
// Due Diligence
// ---------------------------------------------------------------------------

export function examine(ctx: Ctx, targetId: string, modules: DdModule[]): void {
  const state = ctx.state;
  const deal = state.startups.find((s) => s.id === targetId && s.status === "offered" && s.offer?.ev);
  const addon = mnaOf(state).addons.find((a) => a.id === targetId && a.status === "open");
  if (!deal && !addon) ctx.fail("Diese Firma steht nicht mehr zum Verkauf.");
  const done = deal ? (deal.offer!.dd ?? []) : addon!.dd;
  const todo = DD_MODULES.filter((m) => modules.includes(m) && !done.includes(m));
  if (todo.length === 0) ctx.fail("Wähle mindestens eine Prüfung, die noch fehlt.");
  const price = deal ? deal.offer!.ev! : addonEv(addon!);
  const cost = todo.reduce((sum, m) => sum + ddCost(m, price), 0);
  if (state.cash < cost) ctx.fail(`Die Berater kosten ${eur(cost)}. Dafür reicht dein Konto nicht.`);
  const name = deal ? deal.name : addon!.name;
  ctx.spend("acquire", `Due Diligence ${name}`, todo.length);
  state.cash -= cost;
  const findings = deal ? (deal.findings ?? []) : addon!.findings;
  for (const f of findings) if (todo.includes(f.module)) f.found = true;
  if (deal) deal.offer = { ...deal.offer!, dd: [...done, ...todo] };
  else addon!.dd = [...done, ...todo];
  ctx.lesson("dd_bausteine");
}

export function addonEv(a: AddonTarget): number {
  return roundTo((a.revenue * a.grossMargin - a.opex) * 12 * a.multiple, 10_000);
}

// ---------------------------------------------------------------------------
// Finanzierung
// ---------------------------------------------------------------------------

export interface Terms {
  bid: "ask" | "low";
  /** Shares of the price. */
  bank: number;
  vendor: number;
  earnout: number;
}

export interface Structure {
  price: number;
  bank: number;
  vendor: number;
  earnout: number;
  bankMax: number;
  /** Own money needed beyond what the company or the seller finance. */
  equity: number;
  fees: number;
  leverage: number;
  rate: number;
}

export function bankRate(leverage: number, regime: Regime): number {
  return BANK_RATE + Math.max(0, leverage - 2) * BANK_SPREAD_PER_TURN + BANK_RATE_REGIME[regime];
}

/**
 * How a price is paid: the bank lends against EBITDA, the seller can lend and
 * wait for part of the price, the rest is own money. Shares are clamped to
 * what bank and seller accept.
 */
export function structureDeal(price: number, ebitda: number, terms: Pick<Terms, "bank" | "vendor" | "earnout">, regime: Regime, stake = 100, bankRoom?: number): Structure {
  const bankMax = Math.max(0, Math.min(bankRoom ?? BANK_MAX_LEVERAGE * Math.max(0, ebitda), BANK_MAX_SHARE * price));
  let vendor = roundTo(clamp(terms.vendor, 0, VENDOR_MAX) * price, 1000);
  let earnout = roundTo(clamp(terms.earnout, 0, EARNOUT_MAX) * price, 1000);
  let bank = roundTo(Math.min(bankMax, clamp(terms.bank, 0, BANK_MAX_SHARE) * price), 1000);
  const debtMax = (1 - MIN_EQUITY) * price;
  const over = bank + vendor + earnout - debtMax;
  if (over > 0) bank = Math.max(0, bank - over);
  vendor = Math.max(0, vendor);
  earnout = Math.max(0, earnout);
  const equity = roundTo(((price - bank - vendor - earnout) * stake) / 100, 1000);
  const leverage = ebitda > 0 ? bank / ebitda : 0;
  return { price, bank, vendor, earnout, bankMax: roundTo(bankMax, 1000), equity, fees: roundTo(price * TRANSACTION_COST, 1000), leverage, rate: bankRate(leverage, regime) };
}

export interface PreviewInput {
  /** Asked enterprise value before found problems. */
  ask: number;
  /** Product of (1 − price cut) over the problems found so far. */
  cutFactor: number;
  /** Annual EBITDA of the target after the known problems. */
  ebitda: number;
  stake: number;
  regime: Regime;
  /** Add-ons: the bank's room for new debt and the platform's spare cash. */
  bankRoom?: number;
  platformCash?: number;
}

export interface Preview extends Structure {
  fromPlatform: number;
  /** Everything the player pays now: equity part and fees. */
  fromPlayer: number;
}

/** The financing as the structuring page shows it; the same maths the purchase uses. */
export function previewStructure(input: PreviewInput, terms: Terms): Preview {
  const price = roundTo(input.ask * input.cutFactor * (terms.bid === "low" ? 1 - LOW_BID.discount : 1), 10_000);
  const st = structureDeal(price, input.ebitda, terms, input.regime, input.stake, input.bankRoom);
  const fromPlatform = input.platformCash !== undefined ? roundTo(Math.min(st.equity, Math.max(0, input.platformCash)), 1000) : 0;
  return { ...st, fromPlatform, fromPlayer: st.equity - fromPlatform + st.fees };
}

/** Price for a target after found problems and a lower bid. */
export function dealPrice(ask: number, findings: Finding[], bid: "ask" | "low"): number {
  return roundTo(priceAfterFindings(ask, findings) * (bid === "low" ? 1 - LOW_BID.discount : 1), 10_000);
}

/** For the page: how much lower a low bid is and how often a seller takes it (plus per problem found). */
export const LOW_BID_INFO = { discount: LOW_BID.discount, chance: LOW_BID.chance };

/** The seller accepts a lower bid more often when the buyer found problems. */
export function lowBidAccepted(state: GameState, id: string, findings: Finding[]): boolean {
  const chance = LOW_BID.chance + 0.1 * findings.filter((f) => f.found).length;
  return rand(state, `lowbid|${id}`)() < chance;
}

function rand(state: GameState, purpose: string): () => number {
  // Same generator as the engine; duplicated to keep this module free of engine imports.
  let h = 2166136261;
  const text = `${state.seed}|${purpose}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { rand as mnaRandom };

/** Applies the lasting effects of problems (costs, revenue, growth); one-off cash only when `cash` is set. */
export function findingDelta(f: Finding, cash: boolean): Delta {
  return { opex: f.opex ?? 0, revenuePct: f.revenuePct ?? 0, growth: f.growth ?? 0, cash: cash ? (f.cash ?? 0) : 0 };
}

/** Missed problems come out a few months after closing. */
export function scheduleSurprises(ctx: Ctx, s: Startup, findings: Finding[], tag: string): void {
  const r = rand(ctx.state, `surprise|${s.id}|${tag}`);
  findings
    .filter((f) => !f.found)
    .forEach((f, i) => {
      const due = ctx.state.month + 2 + Math.floor(r() * 4);
      ctx.state.effects.push({
        delay: due - ctx.state.month,
        text: `Nach dem Kauf aufgedeckt: ${f.title}. ${f.text}`,
        delta: findingDelta(f, true),
        startupId: s.id,
        due,
        itemId: `finding-${s.id}-${tag}-${i}`,
      });
    });
}

/** Net bank debt (cash above two months of costs counts against it) per annual EBITDA. */
export function netLeverage(s: Startup): number {
  if (!s.lbo) return 0;
  const e = annualEbitda(s.metrics);
  const net = s.lbo.bank - Math.max(0, s.metrics.cash - 2 * s.metrics.opex);
  if (net <= 0) return 0;
  return e > 0 ? net / e : Infinity;
}

export function syncDebt(s: Startup): Startup {
  if (!s.lbo) return s;
  const total = s.lbo.bank + s.lbo.vendors.reduce((sum, v) => sum + v.amount, 0) + s.lbo.earnouts.reduce((sum, e) => sum + e.amount, 0);
  return { ...s, metrics: { ...s.metrics, acqDebt: Math.round(total) } };
}

/** Lenders allow dividends only while the company is safely below the covenant. */
export function lboAllowsDividends(s: Startup): boolean {
  if (!s.lbo) return true;
  return s.lbo.status === "ok" && netLeverage(s) <= DIVIDEND_MAX_LEVERAGE;
}

/** The player buys new shares: everyone else is diluted by the value put in. */
export function injectEquity(s: Startup, amount: number): Startup {
  if (amount <= 0) return s;
  const value = Math.max(1, valuation(s.metrics));
  const keep = value / (value + amount);
  return { ...s, capTable: s.capTable.map((h) => ({ ...h, pct: h.pct * keep })), stake: s.stake * keep + (amount / (value + amount)) * 100 };
}

// ---------------------------------------------------------------------------
// Übernahme eines Familienbetriebs
// ---------------------------------------------------------------------------

export function acquireDeal(ctx: Ctx, s: Startup, terms: Terms): void {
  const state = ctx.state;
  if (s.status !== "offered" || !s.offer?.ev) ctx.fail("Dieses Angebot liegt nicht mehr vor.");
  if (state.reputation < BUYOUT_REPUTATION) ctx.fail(`Eine Firma übernehmen kannst du ab ${BUYOUT_REPUTATION} Ruf.`);
  const offer = s.offer!;
  const findings = s.findings ?? [];
  if (terms.bid === "low" && !lowBidAccepted(state, s.id, findings)) {
    ctx.spend("acquire", `Verhandlung ${s.name}`, 1);
    s.status = "declined";
    ctx.mail({
      kind: "deal",
      from: s.board.find((b) => b.seat === "ceo")?.name ?? s.name,
      subject: `${s.name}: Gespräche beendet`,
      body: `Ihr Gebot lag ${Math.round(LOW_BID.discount * 100)} % unter meinem Preis. Das empfinde ich als respektlos gegenüber dem, was meine Familie aufgebaut hat. Ich verkaufe an jemand anderen.`,
      startupId: s.id,
    });
    return;
  }
  const price = dealPrice(offer.ev!, findings, terms.bid);
  // What the books hide but the buyer knows already: priced in, and it stays.
  let next = s;
  for (const f of findings.filter((x) => x.found)) next = applyDelta(next, findingDelta(f, false));
  const ebitda = annualEbitda(next.metrics);
  const search = offer.searchId ? mnaOf(state).searches.find((x) => x.id === offer.searchId) : undefined;
  const st = structureDeal(price, ebitda, terms, state.market.regime, offer.stake);
  const need = st.equity + st.fees;
  if (state.cash < need) ctx.fail(`Dafür fehlt dir Eigenkapital: ${eur(need)} nötig (Kaufpreisanteil und Nebenkosten).`);
  ctx.spend("acquire", `Übernahme ${s.name}`, ACQUIRE_DAYS);
  state.cash -= need;
  const opex = next.metrics.opex;
  next = {
    ...next,
    metrics: { ...next.metrics, cash: roundTo(opex * WORKING_CASH_MONTHS, 1000), debt: 0 },
  };
  const months = BANK_YEARS * 12;
  const lbo: LboState = {
    acquired: state.month,
    entryEv: price,
    entryEbitda: ebitda,
    equity: need,
    bank: st.bank,
    rate: st.rate,
    payment: annuityOf(st.bank, st.rate, months),
    vendors: st.vendor > 0 ? [{ amount: st.vendor, due: state.month + VENDOR_MONTHS, label: `Verkäuferdarlehen ${s.name}` }] : [],
    earnouts: st.earnout > 0 ? [{ amount: st.earnout, due: state.month + EARNOUT_MONTHS, target: Math.round(ebitda), label: `Earn-out ${s.name}` }] : [],
    breach: 0,
    status: "ok",
    handover: [],
    refRevenue: next.metrics.revenue,
    margin: Math.max(0.03, ebitda / Math.max(1, next.metrics.revenue * 12)),
    grossMargin: next.metrics.grossMargin,
    ...(search ? { searchId: search.id } : {}),
  };
  let stake = offer.stake;
  let capTable = next.capTable.map((h) => ({ ...h }));
  let board = next.board;
  let axes = next.metrics.axes;
  if (search) {
    stake -= SEARCHER_EARN_IN.closing;
    capTable = [...capTable, { id: "searcher", name: search.searcher.name, kind: "founder", pct: SEARCHER_EARN_IN.closing }];
    const old = board.find((b) => b.seat === "ceo")!;
    board = board.map((b) =>
      b.seat === "ceo"
        ? {
            seat: "ceo",
            name: search.searcher.name,
            short: search.searcher.name.split(" ")[0]!,
            title: "Geschäftsführung (Nachfolge-Programm)",
            personality: "doer",
            interests: ["growth", "team"],
          }
        : b.seat === "indep"
          ? { ...b, name: old.name, short: old.short, title: "Altinhaber, Beirat für ein Jahr", personality: old.personality, interests: ["control", "team"] }
          : b,
    );
    axes = { ...axes, management: Math.max(axes.management, Math.round(45 + search.searcher.operator * 0.4)) };
    search.status = "acquired";
    search.startupId = s.id;
    search.ended = state.month;
  }
  next = syncDebt({
    ...next,
    status: "active",
    joined: state.month,
    stake,
    capTable,
    board,
    metrics: { ...next.metrics, axes },
    playerCost: (next.playerCost ?? 0) + need,
    lbo,
    history: [...next.history, { month: state.month, revenue: next.metrics.revenue, cash: next.metrics.cash, valuation: 0, stake }],
  });
  next.history[next.history.length - 1]!.valuation = valuation(next.metrics);
  ctx.replace(next);
  scheduleSurprises(ctx, next, findings, "deal");
  ctx.majority(next, 0);
  const rec = mnaOf(state).record;
  rec.acquisitions += 1;
  ctx.lesson("ebitda_multiple");
  if (st.bank > 0) ctx.lesson("lbo");
  if (st.bank > 0) ctx.lesson("covenant");
  if (st.vendor > 0) ctx.lesson("verkaeuferdarlehen");
  if (st.earnout > 0) ctx.lesson("earn_out");
  if (search) ctx.lesson("search_fund");
  ctx.mail({
    kind: "founder",
    from: search ? search.searcher.name : (s.board.find((b) => b.seat === "ceo")?.name ?? s.name),
    subject: `${s.name}: Kaufvertrag unterschrieben`,
    body: `Kaufpreis ${mio(price)} (${times(price / Math.max(1, ebitda))} EBITDA). Finanziert mit ${eur(st.bank)} Bankkredit${st.vendor > 0 ? `, ${eur(st.vendor)} Verkäuferdarlehen` : ""}${st.earnout > 0 ? `, ${eur(st.earnout)} Earn-out` : ""} und ${eur(need)} von dir. Die Bank verlangt, dass die Nettoverschuldung höchstens das ${COVENANT.toLocaleString("de-DE")}-Fache des EBITDA beträgt; geprüft wird jedes Quartal.${search ? ` ${search.searcher.name} übernimmt die Geschäftsführung und hält ${SEARCHER_EARN_IN.closing} %, mit guter Arbeit bis zu ${SEARCHER_EARN_IN.max} %.` : " Der Altinhaber begleitet die Übergabe ein Jahr lang."}`,
    startupId: s.id,
  });
}

// ---------------------------------------------------------------------------
// Monatslauf: Konjunktur, Zins und Tilgung, Earn-outs, Übergabe, Covenants
// ---------------------------------------------------------------------------

function pay(s: Startup, amount: number): Startup {
  return { ...s, metrics: { ...s.metrics, cash: s.metrics.cash - amount } };
}

export function lboMonth(ctx: Ctx, month: number, notes: string[], lines: Map<string, string[]>): void {
  const state = ctx.state;
  const regime = state.market.regime;
  for (const current of state.startups.filter((x) => x.status === "active" && x.metrics.valuedOn === "ebitda")) {
    let s = current;
    const texts = lines.get(s.id) ?? [];
    // A family business is no startup: growth is capped, and most costs follow revenue.
    let opex = s.metrics.opex;
    const ref = s.lbo?.refRevenue;
    if (ref && ref > 0) opex = Math.max(0, opex * (1 + COST_FLEX * (s.metrics.revenue / ref - 1)));
    // Margins far above what the business made at purchase do not last: wages and competitors catch up.
    const base = s.lbo?.margin;
    if (base && s.metrics.revenue > 0) {
      const margin = (s.metrics.revenue * s.metrics.grossMargin - opex) / s.metrics.revenue;
      const ceiling = base * MARGIN_CEILING;
      if (margin > ceiling) opex += MARGIN_REVERSION * (margin - ceiling) * s.metrics.revenue;
    }
    // Price wars and windfalls fade: the gross margin drifts back to what the business made at purchase.
    const gmBase = s.lbo?.grossMargin;
    const grossMargin = gmBase ? s.metrics.grossMargin + GROSS_MARGIN_REVERSION * (gmBase - s.metrics.grossMargin) : s.metrics.grossMargin;
    // Family businesses feel the business cycle.
    const cycle = CYCLE_REVENUE[regime];
    s = { ...s, metrics: { ...s.metrics, opex, grossMargin, growth: Math.min(EBITDA_GROWTH_CAP, s.metrics.growth), revenue: s.metrics.revenue * (1 + cycle) } };
    if (!s.lbo) {
      ctx.replace(s);
      continue;
    }
    const lbo: LboState = {
      ...s.lbo,
      refRevenue: s.metrics.revenue,
      vendors: s.lbo.vendors.map((v) => ({ ...v })),
      earnouts: s.lbo.earnouts.map((e) => ({ ...e })),
      handover: [...s.lbo.handover],
    };
    s = { ...s, lbo };
    // Interest and repayment.
    const interest = (lbo.bank * lbo.rate) / 12;
    const principal = Math.min(lbo.bank, Math.max(0, lbo.payment - interest));
    s = pay(s, interest + principal);
    lbo.bank = Math.max(0, lbo.bank - principal);
    const vendorInterest = lbo.vendors.reduce((sum, v) => sum + (v.amount * VENDOR_RATE) / 12, 0);
    s = pay(s, vendorInterest);
    const ebitda = annualEbitda(s.metrics);
    // Vendor loans due: pay from cash, else the bank refinances, else it hurts.
    for (const v of lbo.vendors.filter((x) => x.due <= month)) {
      const spare = s.metrics.cash - s.metrics.opex;
      if (spare >= v.amount) {
        s = pay(s, v.amount);
        texts.push(`${v.label} über ${eur(v.amount)} zurückgezahlt.`);
      } else if (ebitda > 0 && (lbo.bank + v.amount) / ebitda <= BANK_MAX_LEVERAGE) {
        lbo.bank += v.amount;
        lbo.payment = annuityOf(lbo.bank, lbo.rate, BANK_YEARS * 12);
        texts.push(`${v.label}: Die Bank finanziert die Rückzahlung von ${eur(v.amount)}.`);
      } else {
        s = pay(s, v.amount);
        texts.push(`${v.label} fällig: ${eur(v.amount)}. Die Bank finanziert nicht, die Kasse muss zahlen.`);
      }
    }
    lbo.vendors = lbo.vendors.filter((x) => x.due > month);
    for (const e of lbo.earnouts.filter((x) => x.due <= month)) {
      if (ebitda >= e.target) {
        if (s.metrics.cash - s.metrics.opex >= e.amount || !(ebitda > 0 && (lbo.bank + e.amount) / ebitda <= BANK_MAX_LEVERAGE)) s = pay(s, e.amount);
        else {
          lbo.bank += e.amount;
          lbo.payment = annuityOf(lbo.bank, lbo.rate, BANK_YEARS * 12);
        }
        texts.push(`${e.label}: Das Ziel ist erreicht, ${eur(e.amount)} gehen an den Verkäufer.`);
      } else {
        s = applyDelta(s, { trust: -5 });
        texts.push(`${e.label}: Ziel verfehlt (EBITDA ${eur(ebitda)} statt ${eur(e.target)}). Die ${eur(e.amount)} entfallen, der Verkäufer ist verärgert.`);
      }
      ctx.lesson("earn_out");
    }
    lbo.earnouts = lbo.earnouts.filter((x) => x.due > month);
    s = handover(ctx, s, month, texts);
    s = earnIn(ctx, s, month, texts);
    s = syncDebt(s);
    // The bank looks at the numbers every quarter.
    if (month % 3 === 0) s = covenantTest(ctx, s, month, texts);
    if (s.metrics.cash < 0 && s.lbo!.status !== "cure") {
      const amount = roundTo(-s.metrics.cash + s.metrics.opex, 1000);
      s = { ...s, lbo: { ...s.lbo!, status: "cure", cure: { amount, due: month + 1 } } };
      ctx.mail({
        kind: "system",
        from: "Hausbank",
        subject: `${s.name}: Die Kasse ist leer`,
        body: `Zins und Tilgung haben die Kasse aufgebraucht. Wir brauchen bis Ende nächsten Monats ${eur(amount)} frisches Eigenkapital von Ihnen. Sonst stellen wir den Kredit fällig und verkaufen die Firma.`,
        startupId: s.id,
      });
      texts.push("Die Kasse ist leer. Die Bank verlangt frisches Eigenkapital.");
    }
    ctx.replace(s);
    lines.set(s.id, texts);
    if (s.lbo!.status === "cure" && s.lbo!.cure && s.lbo!.cure.due <= month) forcedSale(ctx, s, notes);
  }
}

function covenantTest(ctx: Ctx, s: Startup, month: number, texts: string[]): Startup {
  const lbo = { ...s.lbo! };
  const lev = netLeverage(s);
  ctx.lesson("covenant");
  // A leveraged-finance contact may have negotiated more room (see network-life.ts).
  const limit = COVENANT + (lbo.headroom ?? 0);
  if (lev <= limit) {
    if (lbo.status === "watch") {
      lbo.rate = Math.max(0, lbo.rate - COVENANT_PENALTY_RATE);
      lbo.payment = annuityOf(lbo.bank, lbo.rate, BANK_YEARS * 12);
      texts.push(`Covenant wieder eingehalten (${times(lev)} EBITDA). Der Zinsaufschlag entfällt.`);
      const rec = mnaOf(ctx.state).record;
      rec.covenantRecovered = (rec.covenantRecovered ?? 0) + 1;
    }
    if (lbo.status !== "cure") {
      lbo.status = "ok";
      lbo.breach = 0;
    }
    return { ...s, lbo };
  }
  lbo.breach += 1;
  mnaOf(ctx.state).record.covenantBreaches += 1;
  const levText = Number.isFinite(lev) ? `${times(lev)} EBITDA` : "kein positives EBITDA";
  if (lbo.breach === 1 && lbo.status === "ok") {
    lbo.status = "watch";
    lbo.rate += COVENANT_PENALTY_RATE;
    lbo.payment = annuityOf(lbo.bank, lbo.rate, BANK_YEARS * 12);
    const fee = roundTo(lbo.bank * COVENANT_WAIVER_FEE, 100);
    const next = pay({ ...s, lbo }, fee);
    texts.push(
      `Covenant gebrochen: Nettoverschuldung ${levText}, erlaubt sind ${times(limit)}. Die Bank verlangt ${eur(fee)} Gebühr und ${Math.round(COVENANT_PENALTY_RATE * 100)} Prozentpunkte mehr Zins.`,
    );
    ctx.mail({
      kind: "system",
      from: "Hausbank",
      subject: `${s.name}: Covenant gebrochen`,
      body: `Die Nettoverschuldung liegt bei ${levText}. Vereinbart waren höchstens ${times(limit)}. Bis zum nächsten Quartal gilt: Zinsaufschlag, keine Ausschüttungen, keine Zukäufe. Liegt sie dann immer noch darüber, verlangen wir frisches Eigenkapital.`,
      startupId: s.id,
    });
    return next;
  }
  if (lbo.status !== "cure") {
    const e = Math.max(0, annualEbitda(s.metrics));
    const amount = roundTo(Math.max(lbo.bank * 0.1, lbo.bank - 0.9 * limit * e - Math.max(0, s.metrics.cash - 2 * s.metrics.opex)), 1000);
    lbo.status = "cure";
    lbo.cure = { amount, due: month + 1 };
    texts.push(`Covenant zum zweiten Mal gebrochen (${levText}). Die Bank verlangt ${eur(amount)} Eigenkapital.`);
    ctx.mail({
      kind: "system",
      from: "Hausbank",
      subject: `${s.name}: Letzte Frist der Bank`,
      body: `Zwei Quartale über dem Covenant. Wir verlangen bis Ende nächsten Monats ${eur(amount)} frisches Eigenkapital, um die Schulden zu senken (Equity Cure). Sonst kündigen wir den Kredit und verwerten die Firma.`,
      startupId: s.id,
    });
  }
  return { ...s, lbo };
}

/** The player puts in fresh money: the bank's demand is met, the company stays. */
export function cure(ctx: Ctx, s: Startup): void {
  const state = ctx.state;
  if (!s.lbo || s.lbo.status !== "cure" || !s.lbo.cure) ctx.fail("Die Bank verlangt gerade kein Geld.");
  const amount = s.lbo!.cure!.amount;
  if (state.cash < amount) ctx.fail(`Dafür fehlen dir ${eur(amount - state.cash)}.`);
  ctx.spend("platform", `Bankgespräch ${s.name}`, 1);
  state.cash -= amount;
  let next = injectEquity(s, amount);
  const lbo = { ...next.lbo!, vendors: [...next.lbo!.vendors], earnouts: [...next.lbo!.earnouts] };
  let rest = amount;
  let cash = next.metrics.cash;
  if (cash < next.metrics.opex) {
    const fill = Math.min(rest, next.metrics.opex - cash);
    cash += fill;
    rest -= fill;
  }
  const repay = Math.min(lbo.bank, rest);
  lbo.bank -= repay;
  cash += rest - repay;
  if (lbo.rate > bankRate(0, "normal") + 0.03) lbo.rate -= COVENANT_PENALTY_RATE;
  lbo.payment = annuityOf(lbo.bank, lbo.rate, BANK_YEARS * 12);
  lbo.status = "ok";
  lbo.breach = 0;
  delete lbo.cure;
  const record = mnaOf(state).record;
  record.covenantRecovered = (record.covenantRecovered ?? 0) + 1;
  lbo.equity += amount;
  next = syncDebt({ ...next, lbo, metrics: { ...next.metrics, cash }, playerCost: (next.playerCost ?? 0) + amount });
  ctx.replace(next);
  ctx.lesson("covenant");
  ctx.mail({
    kind: "system",
    from: "Hausbank",
    subject: `${s.name}: Eigenkapital eingegangen`,
    body: `Danke. ${eur(amount)} sind da, die Schulden sinken. Wir prüfen weiter jedes Quartal.`,
    startupId: s.id,
  });
}

/** The bank sells the company: debt first, the owners get what is left. */
export function forcedSale(ctx: Ctx, s: Startup, notes: string[]): void {
  const state = ctx.state;
  const lbo = s.lbo!;
  const ev = enterpriseValue(s.metrics) * FORCED_SALE;
  let rest = ev + Math.max(0, s.metrics.cash) - s.metrics.debt;
  // Without a holding the bank calls in the owner's personal guarantee for what it does not get back (holdco.ts).
  const claim = guaranteeClaim(state, lbo.bank, lbo.bank - Math.max(0, rest));
  state.cash -= claim;
  rest -= Math.min(Math.max(0, rest), lbo.bank);
  const vendors = lbo.vendors.reduce((sum, v) => sum + v.amount, 0);
  rest -= Math.min(Math.max(0, rest), vendors);
  const equity = Math.max(0, rest);
  const mine = (equity * s.stake) / 100;
  state.cash += mine;
  const rec = mnaOf(state).record;
  rec.forcedSales += 1;
  if (s.platform) {
    rec.platformExits.push({
      name: s.name,
      month: state.month,
      ev: Math.round(ev),
      ebitda: Math.round(annualEbitda(s.metrics)),
      multiple: annualEbitda(s.metrics) > 10_000 ? Math.round((ev / annualEbitda(s.metrics)) * 10) / 10 : 0,
      entryMultiple: Math.round((lbo.entryEv / Math.max(1, lbo.entryEbitda)) * 10) / 10,
      moic: Math.round((mine / Math.max(1, lbo.equity)) * 100) / 100,
      addons: s.platform.addons.length,
      forced: true,
    });
  }
  ctx.reputation(-6);
  ctx.replace({ ...s, status: "sold", stake: 0, exitValue: Math.round(equity), metrics: { ...s.metrics, acqDebt: 0 }, lbo: { ...lbo, bank: 0, vendors: [], earnouts: [] } });
  state.items = state.items.filter((i) => !(i.startupId === s.id && i.status === "open"));
  for (const a of mnaOf(state).addons.filter((x) => x.platformId === s.id && x.status === "open")) a.status = "expired";
  const text = `Zwangsverkauf: Die Bank hat ${s.name} für ${mio(ev)} verwertet. Nach Bank und Verkäuferdarlehen bleiben dir ${eur(mine)} von ${eur(lbo.equity)} Eigenkapital.${guaranteeText(state, claim)}`;
  notes.push(text);
  ctx.mail({
    kind: "exit",
    from: "Hausbank",
    subject: `${s.name}: Zwangsverkauf`,
    body: `${text} Zu viel Schulden für zu wenig Ertrag: Das ist das Risiko des Hebels.`,
    startupId: s.id,
  });
  ctx.lesson("covenant");
}

/** The first year after a purchase: the old owner, the big customer, key people. */
function handover(ctx: Ctx, s: Startup, month: number, texts: string[]): Startup {
  const lbo = s.lbo!;
  const age = month - lbo.acquired;
  if (age >= HANDOVER_MONTHS) return s;
  const r = rand(ctx.state, `handover|${s.id}|${month}`);
  const search = lbo.searchId ? mnaOf(ctx.state).searches.find((x) => x.id === lbo.searchId) : undefined;
  const operator = search?.searcher.operator ?? 45;
  const seller = (lbo.earnouts.length > 0 ? 0.6 : 1) * (lbo.vendors.length > 0 ? 0.85 : 1);
  const rollover = s.capTable.some((h) => h.id === "ceo" && h.kind === "founder");
  // An interim manager from the network on site: the handover goes smoother.
  // An operating partner looking after the company helps too (team.ts).
  const steady = ((lbo.interim ?? 0) >= month ? INTERIM.handoverRisk : 1) * handoverFactor(ctx.state, s);
  let next = s;
  const once = (id: string) => !next.lbo!.handover.includes(id);
  const mark = (id: string) => (next = { ...next, lbo: { ...next.lbo!, handover: [...next.lbo!.handover, id] } });
  if (once("patriarch") && r() < HANDOVER_RISK.patriarch * seller * (rollover ? 1.4 : 1) * (search ? 0.8 : 1.2) * steady) {
    mark("patriarch");
    next = applyDelta(next, { trust: -10, morale: -6, axes: { management: -4 } });
    texts.push("Der Altinhaber mischt sich ein: Er gibt Anweisungen am Geschäftsführer vorbei, die Belegschaft weiß nicht, wer entscheidet.");
  }
  const dd = (next.offer?.dd ?? []).includes("commercial");
  if (once("customer") && r() < HANDOVER_RISK.customer * (next.metrics.topCustomer > 0.3 ? 1.5 : 0.6) * (dd ? 0.6 : 1) * seller * steady) {
    mark("customer");
    const loss = Math.max(0.05, next.metrics.topCustomer * 0.6);
    next = applyDelta(next, { revenuePct: -loss, topCustomer: 0.15 - next.metrics.topCustomer, morale: -4 });
    texts.push(`Der größte Kunde geht nach dem Eigentümerwechsel zur Konkurrenz. Rund ${Math.round(loss * 100)} % Umsatz fallen weg.`);
  }
  if (once("keyPerson") && r() < HANDOVER_RISK.keyPerson * (1.3 - operator / 100) * steady) {
    mark("keyPerson");
    next = applyDelta(next, { growth: -0.003, morale: -5, axes: { management: -8 } });
    texts.push("Der Prokurist kündigt. Er kannte jeden Kunden persönlich; ein Teil des Wissens geht mit ihm.");
  }
  if (age === HANDOVER_MONTHS - 1) {
    const rec = mnaOf(ctx.state).record;
    if (annualEbitda(next.metrics) >= lbo.entryEbitda * 0.9) {
      rec.successions += 1;
      texts.push("Das erste Jahr nach der Übergabe ist geschafft. Das Ergebnis hält.");
    } else {
      rec.troubledHandovers += 1;
      texts.push("Das erste Jahr nach der Übergabe war holprig: Das EBITDA liegt deutlich unter dem beim Kauf.");
    }
  }
  return next;
}

/** The searcher earns more of the company every half year the numbers hold. */
function earnIn(ctx: Ctx, s: Startup, month: number, texts: string[]): Startup {
  const lbo = s.lbo!;
  const age = month - lbo.acquired;
  if (!lbo.searchId || age <= 0 || age % 6 !== 0) return s;
  const holder = s.capTable.find((h) => h.id === "searcher");
  if (!holder || holder.pct >= SEARCHER_EARN_IN.max - 0.01) return s;
  if (annualEbitda(s.metrics) < lbo.entryEbitda) {
    texts.push(`${holder.name} verdient sich diesmal keine weiteren Anteile: Das EBITDA liegt unter dem beim Kauf.`);
    return s;
  }
  const step = Math.min(SEARCHER_EARN_IN.step, SEARCHER_EARN_IN.max - holder.pct, s.stake - 51);
  if (step <= 0) return s;
  texts.push(`${holder.name} bekommt weitere ${step.toLocaleString("de-DE")} % für gute Arbeit (Earn-in). Sie hält jetzt ${(holder.pct + step).toLocaleString("de-DE")} %.`);
  return { ...s, stake: s.stake - step, capTable: s.capTable.map((h) => (h.id === "searcher" ? { ...h, pct: h.pct + step } : h)) };
}

// ---------------------------------------------------------------------------
// Nachfolge-Programm (Search Fund)
// ---------------------------------------------------------------------------

const BACKGROUNDS = [
  { text: "Ex-Unternehmensberaterin mit MBA", operator: [45, 65], network: [60, 80], cost: 13_000 },
  { text: "Ingenieur mit zehn Jahren Führungserfahrung", operator: [65, 85], network: [40, 60], cost: 12_000 },
  { text: "Absolventin einer Business School", operator: [35, 55], network: [45, 65], cost: 9_000 },
  { text: "Vertriebsleiter aus dem Mittelstand", operator: [55, 75], network: [55, 75], cost: 12_000 },
] as const;

const FIRST_NAMES = ["Johanna", "Felix", "Lea", "Maximilian", "Charlotte", "Jakob", "Marie", "Konstantin", "Amelie", "Leonard", "Selin", "Emil"];

/** Three people who want to search for a company, this month. */
export function searchCandidates(state: GameState): Searcher[] {
  const r = rand(state, `searchers|${state.month}`);
  const pool = [...BACKGROUNDS];
  const out: Searcher[] = [];
  for (let i = 0; i < 3; i++) {
    const b = pool.splice(Math.floor(r() * pool.length) % pool.length, 1)[0]!;
    out.push({
      name: `${pickOf(r, FIRST_NAMES)} ${pickOf(r, LAST)}`,
      background: b.text,
      operator: Math.round(between(r, b.operator[0], b.operator[1])),
      network: Math.round(between(r, b.network[0], b.network[1])),
      grit: Math.round(between(r, 40, 95)),
      cost: b.cost,
    });
  }
  return out;
}

export function activeSearch(state: GameState): SearchFund | undefined {
  return state.mna?.searches.find((x) => x.status === "searching");
}

/** Why the player cannot fund a search yet, or null. */
export function searchBlocker(state: GameState, worth: number): string | null {
  if (activeSearch(state)) return "Eine Suche läuft schon.";
  if (state.reputation < SEARCH_REPUTATION) return `Suchende vertrauen dir ab ${SEARCH_REPUTATION} Ruf.`;
  if (worth < SEARCH_WORTH) return `Dafür brauchst du ${mio(SEARCH_WORTH)} Vermögen: Suchkapital und später das Eigenkapital für den Kauf.`;
  if ((state.mna?.record.mandatesDone ?? 0) < 1) return "Erst ein M&A-Mandat erfolgreich abschließen: Wer Firmen kaufen will, sollte einen Verkauf von innen kennen.";
  return null;
}

export function startSearch(ctx: Ctx, candidate: number): void {
  const state = ctx.state;
  const why = searchBlocker(state, ctx.worth());
  if (why) ctx.fail(why);
  const searcher = searchCandidates(state)[candidate];
  if (!searcher) ctx.fail("Diese Person gibt es nicht.");
  if (state.cash < searcher!.cost * 6) ctx.fail(`Halte mindestens sechs Monate Suchkapital bereit: ${eur(searcher!.cost * 6)}.`);
  ctx.spend("search", `Auswahl ${searcher!.name}`, SEARCH_START_DAYS);
  const m = mnaOf(state);
  m.searches.push({ id: ctx.id("s"), started: state.month, searcher: searcher!, status: "searching", spent: 0, targets: 0 });
  m.record.searchesStarted += 1;
  ctx.lesson("search_fund");
  ctx.mail({
    kind: "system",
    from: searcher!.name,
    subject: "Die Suche beginnt",
    body: `Danke für Ihr Vertrauen. Ich koste Sie ${eur(searcher!.cost)} im Monat für Gehalt und Reisen, höchstens ${SEARCH_MAX_MONTHS} Monate. In den ersten Monaten baue ich die Liste auf; danach melde ich mich mit jeder Firma, deren Inhaber ernsthaft verkaufen will. Wenn wir kaufen, führe ich die Firma.`,
  });
}

export function stopSearch(ctx: Ctx): void {
  const search = activeSearch(ctx.state);
  if (!search) ctx.fail("Es läuft keine Suche.");
  endSearch(ctx, search!, "stopped", "Du hast die Suche beendet. Das Suchkapital ist ausgegeben.");
}

function endSearch(ctx: Ctx, search: SearchFund, status: "failed" | "stopped", text: string): void {
  search.status = status;
  search.ended = ctx.state.month;
  mnaOf(ctx.state).record.searchesFailed += 1;
  for (const s of ctx.state.startups.filter((x) => x.status === "offered" && x.offer?.searchId === search.id)) s.status = "declined";
  ctx.mail({ kind: "system", from: search.searcher.name, subject: "Die Suche ist vorbei", body: `${text} Insgesamt ${eur(search.spent)} Suchkapital.` });
}

/** Month end: the searcher is paid, may give up, or runs out of time. */
export function searchMonth(ctx: Ctx, month: number, notes: string[], income: IncomeLines): void {
  const search = activeSearch(ctx.state);
  if (!search) return;
  ctx.state.cash -= search.searcher.cost;
  search.spent += search.searcher.cost;
  income.search = (income.search ?? 0) - search.searcher.cost;
  const elapsed = month - search.started + 1;
  const r = rand(ctx.state, `search|${search.id}|${month}`);
  if (elapsed >= SEARCH_MAX_MONTHS) {
    ctx.reputation(-2);
    endSearch(ctx, search, "failed", "Vierundzwanzig Monate, keine Firma gekauft. Die Suchende nimmt eine Stelle in einem Konzern an.");
    notes.push(`Nachfolge-Programm: Die Suche von ${search.searcher.name} ist ohne Kauf zu Ende.`);
    return;
  }
  if (elapsed > 4 && r() < 0.012 + Math.max(0, 70 - search.searcher.grit) / 2500) {
    endSearch(ctx, search, "failed", `${search.searcher.name} gibt auf: zu viele Absagen, zu wenig Fortschritt.`);
    notes.push(`Nachfolge-Programm: ${search.searcher.name} hat aufgegeben.`);
  }
}

/** Month start: after the quiet months, a searcher brings a company now and then. */
export function planSearchTargets(ctx: Ctx): void {
  const state = ctx.state;
  const search = activeSearch(state);
  if (!search) return;
  const elapsed = state.month - search.started;
  if (elapsed < SEARCH_QUIET_MONTHS) return;
  if (state.startups.some((s) => s.status === "offered" && s.offer?.searchId === search.id)) return;
  const r = rand(state, `searchtarget|${search.id}|${state.month}`);
  if (r() > SEARCH_TARGET_CHANCE + search.searcher.network / 500) return;
  search.targets += 1;
  targetDeal(ctx, r, { ev: targetEv(ctx.worth(), r), source: "search", search });
}
