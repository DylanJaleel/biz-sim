import { BUYOUT_REPUTATION } from "./config";
import { bigFee } from "./mandate-big";
import { annualEbitda, enterpriseValue, fairMultiple, sizeMultiple } from "./ebitda";
import { daysLeft, netWorth } from "./engine";
import { addonEv, activeSearch, lboAllowsDividends, LOW_BID_INFO, netLeverage, searchBlocker, searchCandidates, type PreviewInput } from "./lbo";
import { activeMandates, mandateCapacity, mandateFee, MULTIPLE_CHOICES } from "./mna";
import {
  ACQUIRE_DAYS,
  ADDON_MAX_LEVERAGE,
  BANK_MAX_LEVERAGE,
  BANK_MAX_SHARE,
  COVENANT,
  DD_MODULES,
  DIVIDEND_MAX_LEVERAGE,
  EARNOUT_MAX,
  EARNOUT_MONTHS,
  INTEGRATION,
  MANDATE_BIG_EV,
  MANDATE_DAYS,
  MANDATE_REPUTATION,
  MIN_EQUITY,
  PLATFORM_COST,
  PLATFORM_DAYS,
  PLATFORM_SALE,
  PLATFORM_SALE_DAYS,
  SEARCH_MAX_MONTHS,
  SEARCH_QUIET_MONTHS,
  SEARCH_START_DAYS,
  SEARCHER_EARN_IN,
  SYNERGY_SHARE,
  TRANSACTION_COST,
  VENDOR_MAX,
  VENDOR_MONTHS,
  VENDOR_RATE,
  type DdModule,
} from "./mna-config";
import { DD_LABEL, ddCost, mnaRead } from "./mna-core";
import { platformBlocker, platformOf } from "./platform";
import { valuation } from "./sim";
import type { GameState, Integration, LboState, Mandate, MandateBid, MnaRecord, PlatformState, Startup } from "./types";

// Was die Seiten für Mandate, Nachfolge-Programm und Plattform brauchen. Was
// das Spiel verbirgt (der faire Preis, nicht gefundene Befunde, das
// Durchhaltevermögen der Suchenden), bleibt hier draußen.

export interface FindingView {
  module: DdModule;
  title: string;
  text: string;
  priceCut: number;
}

export interface DdChoice {
  module: DdModule;
  title: string;
  text: string;
  cost: number;
  done: boolean;
}

// ---------------------------------------------------------------------------
// Mandate
// ---------------------------------------------------------------------------

export interface MandateView {
  id: string;
  side: "sell" | "buy";
  client: string;
  company: string;
  sector: string;
  city: string;
  text: string;
  ebitda: number;
  wish: number;
  retainer: number;
  status: Mandate["status"];
  month: number;
  expires: number;
  comps?: [number, number];
  /** Rule of thumb for this size: what the size curve says, without quality. */
  rule: number;
  multiple?: number;
  buyers?: Mandate["buyers"];
  process?: Mandate["process"];
  dd: DdModule[];
  ddChoices: { module: DdModule; title: string; text: string }[];
  found: FindingView[];
  bids: MandateBid[];
  signed?: MandateBid;
  leak: boolean;
  outcome?: Mandate["outcome"];
  multiples: number[];
  days: typeof MANDATE_DAYS;
  /** Fee if it closes at the client's wish. */
  feeAtWish: number;
  blocker: string | null;
  daysLeft: number;
  /** The process still waits for a decision this month. */
  waiting: boolean;
}

export function mandateView(state: GameState, id: string): MandateView | null {
  const m = mnaRead(state).mandates.find((x) => x.id === id);
  if (!m) return null;
  let blocker: string | null = null;
  if (m.status === "offered") {
    if (state.reputation < MANDATE_REPUTATION) blocker = `M&A-Mandate bekommst du ab ${MANDATE_REPUTATION} Ruf.`;
    else if (activeMandates(state).length >= mandateCapacity(state)) blocker = "Du betreust schon so viele Mandate, wie du schaffst.";
    else if (m.ebitda * m.fair > MANDATE_BIG_EV[0] && state.familyOffice === undefined) blocker = "Ein Mandat dieser Größe braucht ein Team (Family Office).";
  }
  return {
    id: m.id,
    side: m.side,
    client: m.client,
    company: m.company,
    sector: m.sector,
    city: m.city,
    text: m.text,
    ebitda: m.ebitda,
    wish: m.wish,
    retainer: m.retainer,
    status: m.status,
    month: m.month,
    expires: m.expires,
    comps: m.comps,
    rule: Math.round(sizeMultiple(m.ebitda) * 10) / 10,
    multiple: m.multiple,
    buyers: m.buyers,
    process: m.process,
    dd: m.dd ?? [],
    ddChoices: DD_MODULES.map((x) => ({ module: x, ...DD_LABEL[x] })),
    found: m.findings.filter((f) => f.found).map(publicFinding),
    // Without the hidden ceiling of each bidder (large mandates).
    bids: (m.bids ?? []).map((b) => ({ buyer: b.buyer, kind: b.kind, ev: b.ev, ...(b.earnout ? { earnout: b.earnout } : {}), ...(b.out ? { out: true } : {}) })),
    signed: m.signed,
    leak: Boolean(m.leak),
    outcome: m.outcome,
    multiples: MULTIPLE_CHOICES,
    days: MANDATE_DAYS,
    feeAtWish: m.big ? bigFee(m.wish) : mandateFee(m.wish),
    blocker,
    daysLeft: daysLeft(state),
    waiting: m.status === "bids",
  };
}

function publicFinding(f: { module: DdModule; title: string; text: string; priceCut: number }): FindingView {
  return { module: f.module, title: f.title, text: f.text, priceCut: f.priceCut };
}

export interface MandateLine {
  id: string;
  company: string;
  side: "sell" | "buy";
  status: Mandate["status"];
  label: string;
  ev: number;
}

const STATUS_LABEL: Record<Mandate["status"], string> = {
  offered: "Anfrage",
  prep: "Vorbereitung",
  marketing: "Käufer angesprochen",
  bids: "Angebote liegen vor",
  signing: "Vertrag unterschrieben",
  closed: "Abgeschlossen",
  failed: "Gescheitert",
  declined: "Abgelehnt",
  expired: "Verfallen",
};

/** Mandates for the office: open requests and running work. */
export function mandateLines(state: GameState): MandateLine[] {
  return mnaRead(state)
    .mandates.filter((m) => ["offered", "prep", "marketing", "bids", "signing"].includes(m.status) || (m.outcome && m.month >= state.month - 2))
    .map((m) => ({ id: m.id, company: m.company, side: m.side, status: m.status, label: STATUS_LABEL[m.status], ev: m.signed?.ev ?? m.wish }));
}

// ---------------------------------------------------------------------------
// Nachfolge-Programm
// ---------------------------------------------------------------------------

export interface TargetLine {
  id: string;
  name: string;
  tagline: string;
  sector: string;
  source: "market" | "search" | "referral";
  ev: number;
  multiple: number;
  ebitda: number;
  stake: number;
  expires: number;
  ddDone: number;
}

export interface OwnedLine {
  id: string;
  name: string;
  platform: boolean;
  stake: number;
  ebitda: number;
  leverage: number;
  status: LboState["status"];
  value: number;
  acquired: number;
}

export interface SuccessionView {
  blocker: string | null;
  worth: number;
  cash: number;
  reputation: number;
  active?: {
    name: string;
    background: string;
    operator: number;
    network: number;
    cost: number;
    started: number;
    elapsed: number;
    left: number;
    spent: number;
    targets: number;
    quiet: boolean;
  };
  candidates: { name: string; background: string; operator: number; network: number; cost: number }[];
  past: { name: string; status: string; spent: number; ended?: number }[];
  targets: TargetLine[];
  owned: OwnedLine[];
  record: MnaRecord;
  daysLeft: number;
  startDays: number;
  buyoutReputation: number;
  earnIn: typeof SEARCHER_EARN_IN;
  maxMonths: number;
}

export function successionView(state: GameState): SuccessionView {
  const worth = netWorth(state);
  const search = activeSearch(state);
  const mna = mnaRead(state);
  const status: Record<string, string> = { acquired: "Firma gekauft", failed: "Gescheitert", stopped: "Abgebrochen", searching: "Sucht" };
  return {
    blocker: searchBlocker(state, worth),
    worth,
    cash: state.cash,
    reputation: state.reputation,
    active: search
      ? {
          name: search.searcher.name,
          background: search.searcher.background,
          operator: search.searcher.operator,
          network: search.searcher.network,
          cost: search.searcher.cost,
          started: search.started,
          elapsed: state.month - search.started,
          left: SEARCH_MAX_MONTHS - (state.month - search.started),
          spent: search.spent,
          targets: search.targets,
          quiet: state.month - search.started < SEARCH_QUIET_MONTHS,
        }
      : undefined,
    candidates: search ? [] : searchCandidates(state).map((c) => ({ name: c.name, background: c.background, operator: c.operator, network: c.network, cost: c.cost })),
    past: mna.searches.filter((x) => x.status !== "searching").map((x) => ({ name: x.searcher.name, status: status[x.status] ?? x.status, spent: x.spent, ended: x.ended })),
    targets: state.startups
      .filter((s) => s.status === "offered" && s.offer?.ev)
      .map((s) => ({
        id: s.id,
        name: s.name,
        tagline: s.tagline,
        sector: s.sector,
        source: s.offer!.source ?? (s.offer!.searchId ? "search" : "market"),
        ev: s.offer!.ev!,
        multiple: s.offer!.multiple ?? 0,
        ebitda: annualEbitda(s.metrics),
        stake: s.offer!.stake,
        expires: s.offer!.expires,
        ddDone: (s.offer!.dd ?? []).length,
      })),
    owned: state.startups.filter((s) => s.status === "active" && s.lbo).map(ownedLine),
    record: mna.record,
    daysLeft: daysLeft(state),
    startDays: SEARCH_START_DAYS,
    buyoutReputation: BUYOUT_REPUTATION,
    earnIn: SEARCHER_EARN_IN,
    maxMonths: SEARCH_MAX_MONTHS,
  };
}

function ownedLine(s: Startup): OwnedLine {
  return {
    id: s.id,
    name: s.name,
    platform: Boolean(s.platform),
    stake: s.stake,
    ebitda: annualEbitda(s.metrics),
    leverage: netLeverage(s),
    status: s.lbo!.status,
    value: (s.stake / 100) * valuation(s.metrics),
    acquired: s.lbo!.acquired,
  };
}

// ---------------------------------------------------------------------------
// Übernahme strukturieren (Firma aus der Post, von der Suchenden, oder Zukauf)
// ---------------------------------------------------------------------------

export interface AcquisitionView {
  kind: "deal" | "addon";
  id: string;
  name: string;
  text: string;
  sector: string;
  owner: string;
  source?: "market" | "search" | "referral";
  revenue: number;
  ebitdaReported: number;
  ebitdaAdjusted: number;
  margin: number;
  ask: number;
  multiple: number;
  /** What companies of this size usually cost. */
  rule: number;
  stake: number;
  dd: DdChoice[];
  found: FindingView[];
  priceNow: number;
  preview: PreviewInput;
  limits: {
    bankLeverage: number;
    bankShare: number;
    vendor: number;
    earnout: number;
    minEquity: number;
    covenant: number;
    vendorRate: number;
    vendorMonths: number;
    earnoutMonths: number;
    fees: number;
  };
  lowBid: { discount: number; chance: number };
  cash: number;
  daysLeft: number;
  acquireDays: number;
  blocker: string | null;
  expires: number;
  platform?: { id: string; name: string; ebitda: number; multiple: number; bank: number; leverage: number; integrations: number; capacity: number; cash: number };
  searcher?: { name: string; operator: number };
  integration: typeof INTEGRATION;
  synergyShare: number;
}

export function acquisitionView(state: GameState, id: string): AcquisitionView | null {
  const deal = state.startups.find((s) => s.id === id && s.status === "offered" && s.offer?.ev);
  const addon = mnaRead(state).addons.find((a) => a.id === id && a.status === "open");
  if (!deal && !addon) return null;
  const findings = deal ? (deal.findings ?? []) : addon!.findings;
  const found = findings.filter((f) => f.found);
  const cutFactor = found.reduce((p, f) => p * (1 - f.priceCut), 1);
  const ask = deal ? deal.offer!.ev! : addonEv(addon!);
  const done = deal ? (deal.offer!.dd ?? []) : addon!.dd;
  const dd = DD_MODULES.map((m) => ({ module: m, ...DD_LABEL[m], cost: ddCost(m, ask), done: done.includes(m) }));
  const limits = {
    bankLeverage: addon ? ADDON_MAX_LEVERAGE : BANK_MAX_LEVERAGE,
    bankShare: BANK_MAX_SHARE,
    vendor: VENDOR_MAX,
    earnout: EARNOUT_MAX,
    minEquity: MIN_EQUITY,
    covenant: COVENANT,
    vendorRate: VENDOR_RATE,
    vendorMonths: VENDOR_MONTHS,
    earnoutMonths: EARNOUT_MONTHS,
    fees: TRANSACTION_COST,
  };
  const base = { cash: state.cash, daysLeft: daysLeft(state), acquireDays: ACQUIRE_DAYS, integration: INTEGRATION, synergyShare: SYNERGY_SHARE, lowBid: LOW_BID_INFO, limits, dd };
  if (deal) {
    const m = deal.metrics;
    let opex = m.opex;
    let revenue = m.revenue;
    for (const f of found) {
      opex += f.opex ?? 0;
      revenue *= 1 + (f.revenuePct ?? 0);
    }
    const reported = annualEbitda(m);
    const adjusted = (revenue * m.grossMargin - opex) * 12;
    const search = deal.offer!.searchId ? mnaRead(state).searches.find((x) => x.id === deal.offer!.searchId) : undefined;
    return {
      ...base,
      kind: "deal",
      id: deal.id,
      name: deal.name,
      text: deal.tagline,
      sector: deal.sector,
      owner: deal.board.find((b) => b.seat === "ceo")?.name ?? "",
      source: deal.offer!.source,
      revenue: m.revenue,
      ebitdaReported: reported,
      ebitdaAdjusted: adjusted,
      margin: reported / Math.max(1, m.revenue * 12),
      ask,
      multiple: deal.offer!.multiple ?? ask / Math.max(1, reported),
      rule: Math.round(sizeMultiple(reported) * 10) / 10,
      stake: deal.offer!.stake,
      found: found.map(publicFinding),
      priceNow: Math.round(ask * cutFactor),
      preview: { ask, cutFactor, ebitda: adjusted, stake: deal.offer!.stake, regime: state.market.regime },
      blocker: state.reputation < BUYOUT_REPUTATION ? `Eine Firma übernehmen kannst du ab ${BUYOUT_REPUTATION} Ruf.` : null,
      expires: deal.offer!.expires,
      searcher: search ? { name: search.searcher.name, operator: search.searcher.operator } : undefined,
    };
  }
  const a = addon!;
  const p = state.startups.find((s) => s.id === a.platformId)!;
  let opex = a.opex;
  let revenue = a.revenue;
  for (const f of found) {
    opex += f.opex ?? 0;
    revenue *= 1 + (f.revenuePct ?? 0);
  }
  const adjusted = (revenue * a.grossMargin - opex) * 12;
  const reported = (a.revenue * a.grossMargin - a.opex) * 12;
  const ep = annualEbitda(p.metrics);
  const bank = p.lbo?.bank ?? 0;
  let blocker: string | null = null;
  if (p.status !== "active" || !p.platform) blocker = "Die Plattform gibt es nicht mehr.";
  else if (p.platform.sale) blocker = "Während des Verkaufs der Plattform kaufst du nichts dazu.";
  else if (p.lbo && p.lbo.status !== "ok") blocker = "Zukaufstopp: Die Bank erlaubt keine Zukäufe, solange der Covenant gebrochen ist.";
  return {
    ...base,
    kind: "addon",
    id: a.id,
    name: a.name,
    text: a.text,
    sector: p.sector,
    owner: a.owner,
    revenue: a.revenue,
    ebitdaReported: reported,
    ebitdaAdjusted: adjusted,
    margin: reported / Math.max(1, a.revenue * 12),
    ask,
    multiple: a.multiple,
    rule: Math.round(sizeMultiple(reported) * 10) / 10,
    stake: 100,
    found: found.map(publicFinding),
    priceNow: Math.round(ask * cutFactor),
    preview: {
      ask,
      cutFactor,
      ebitda: adjusted,
      stake: 100,
      regime: state.market.regime,
      bankRoom: Math.max(0, ADDON_MAX_LEVERAGE * (ep + adjusted) - bank),
      platformCash: Math.max(0, p.metrics.cash - 2 * p.metrics.opex),
    },
    blocker,
    expires: a.expires,
    platform: {
      id: p.id,
      name: p.name,
      ebitda: ep,
      multiple: fairMultiple(p.metrics),
      bank,
      leverage: netLeverage(p),
      integrations: p.platform?.integrations.length ?? 0,
      capacity: integrationCapacity(state, p),
      cash: p.metrics.cash,
    },
  };
}

/**
 * Where an address leads once it no longer shows what it used to: a purchase is
 * signed, an offer expired, an add-on merged into its platform. Saves the
 * player a 404 after a purchase (the page re-renders with the new state) and
 * on old links in mails and tasks. Null when the id never existed.
 */
export function acquisitionRedirect(state: GameState, id: string): string | null {
  const s = state.startups.find((x) => x.id === id);
  if (s) {
    if (s.status === "offered") return s.offer?.ev ? null : `/post?firma=${s.id}`;
    if (s.status === "declined") return s.offer?.searchId ? "/nachfolge" : `/post?firma=${s.id}`;
    return `/firma/${s.id}`;
  }
  const addon = mnaRead(state).addons.find((a) => a.id === id);
  if (addon?.status === "open") return null;
  if (addon) return state.startups.some((x) => x.id === addon.platformId && x.status === "active") ? `/plattform/${addon.platformId}` : `/firma/${addon.platformId}`;
  return null;
}

/** A company page for something that is not (or no longer) a company of yours: where to go instead. */
export function companyRedirect(state: GameState, id: string): string | null {
  const s = state.startups.find((x) => x.id === id);
  if (!s) {
    const addon = mnaRead(state).addons.find((a) => a.id === id);
    if (!addon) return null;
    return addon.status === "open" ? `/uebernahme/${id}` : acquisitionRedirect(state, id);
  }
  if (s.status === "offered") return s.offer?.ev ? `/uebernahme/${s.id}` : `/post?firma=${s.id}`;
  if (s.status === "declined") return `/post?firma=${s.id}`;
  return null;
}

/** A platform page for a company that is not (or no longer) a platform. */
export function platformRedirect(state: GameState, id: string): string | null {
  const s = state.startups.find((x) => x.id === id);
  if (!s) return null;
  return companyRedirect(state, id) ?? `/firma/${s.id}`;
}

export function integrationCapacity(state: GameState, s: Startup): number {
  const partners = state.team.filter((t) => t.role === "partner").length;
  const associate = state.team.some((t) => t.role === "associate" && t.mandate === s.id);
  return 1 + partners + (associate ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Beteiligung und Plattform
// ---------------------------------------------------------------------------

export interface PlatformView {
  id: string;
  name: string;
  sector: string;
  stake: number;
  platform?: PlatformState;
  makeBlocker: string | null;
  makeCost: number;
  makeDays: number;
  revenue: number;
  ebitda: number;
  margin: number;
  ev: number;
  multiple: number;
  equity: number;
  myValue: number;
  cash: number;
  lbo: LboState;
  leverage: number;
  covenant: number;
  dividends: boolean;
  dividendMax: number;
  entryMultiple: number;
  moic: number;
  integrations: (Integration & { left: number })[];
  capacity: number;
  targets: { id: string; name: string; ebitda: number; ev: number; multiple: number; expires: number; dd: number; status: string }[];
  exitId?: string;
  saleDays: typeof PLATFORM_SALE_DAYS;
  saleMonths: { exclusive: number; auction: number };
  searcher?: { name: string; pct: number };
  daysLeft: number;
  playerCash: number;
  active: boolean;
}

export function platformView(state: GameState, id: string): PlatformView | null {
  const s = state.startups.find((x) => x.id === id && x.lbo);
  if (!s) return null;
  const e = annualEbitda(s.metrics);
  const lbo = s.lbo!;
  const value = valuation(s.metrics);
  const myValue = (s.stake / 100) * value;
  const searcher = s.capTable.find((h) => h.id === "searcher");
  return {
    id: s.id,
    name: s.name,
    sector: s.sector,
    stake: s.stake,
    platform: s.platform,
    makeBlocker: s.platform ? null : platformBlocker(state, s),
    makeCost: PLATFORM_COST,
    makeDays: PLATFORM_DAYS,
    revenue: s.metrics.revenue,
    ebitda: e,
    margin: e / Math.max(1, s.metrics.revenue * 12),
    ev: enterpriseValue(s.metrics),
    multiple: fairMultiple(s.metrics),
    equity: value,
    myValue,
    cash: s.metrics.cash,
    lbo,
    leverage: netLeverage(s),
    // A leveraged-finance contact may have negotiated more room (network).
    covenant: COVENANT + (lbo.headroom ?? 0),
    dividends: lboAllowsDividends(s),
    dividendMax: DIVIDEND_MAX_LEVERAGE,
    entryMultiple: lbo.entryEv / Math.max(1, lbo.entryEbitda),
    moic: myValue / Math.max(1, lbo.equity),
    integrations: (s.platform?.integrations ?? []).map((i) => ({ ...i, left: Math.max(0, i.due - state.month + 1) })),
    capacity: integrationCapacity(state, s),
    targets: mnaRead(state)
      .addons.filter((a) => a.platformId === s.id && (a.status === "open" || a.status === "review"))
      .map((a) => ({
        id: a.id,
        name: a.name,
        ebitda: (a.revenue * a.grossMargin - a.opex) * 12,
        ev: addonEv(a),
        multiple: a.multiple,
        expires: a.expires,
        dd: a.dd.length,
        status: a.status,
      })),
    exitId: state.exits.find((x) => x.startupId === s.id && x.status === "open")?.id,
    saleDays: PLATFORM_SALE_DAYS,
    saleMonths: { exclusive: PLATFORM_SALE.exclusive.months, auction: PLATFORM_SALE.auction.months },
    searcher: searcher ? { name: searcher.name, pct: searcher.pct } : undefined,
    daysLeft: daysLeft(state),
    playerCash: state.cash,
    active: s.status === "active",
  };
}

// ---------------------------------------------------------------------------
// Schreibtisch und Holding
// ---------------------------------------------------------------------------

export interface MnaTask {
  text: string;
  href: string;
  tone: "urgent" | "normal" | "calm";
}

/** What the assistant points out: the bank's deadline, offers on the table, decisions due. */
export function mnaTasks(state: GameState): MnaTask[] {
  const out: MnaTask[] = [];
  for (const s of state.startups.filter((x) => x.status === "active" && x.lbo?.status === "cure" && x.lbo.cure)) {
    out.push({
      text: `${s.name}: Die Bank verlangt ${Math.round(s.lbo!.cure!.amount).toLocaleString("de-DE")} € Eigenkapital bis Monatsende, sonst Zwangsverkauf.`,
      href: `/plattform/${s.id}`,
      tone: "urgent",
    });
  }
  for (const m of mnaRead(state).mandates) {
    if (m.status === "offered")
      out.push({ text: `M&A-Mandat angefragt: ${m.client} (${m.side === "sell" ? "Verkauf" : "Kauf"} von ${m.company}).`, href: `/mandat/${m.id}`, tone: "normal" });
    if (m.status === "prep")
      out.push({
        text: `Mandat ${m.company}: Bewertung, Käufer und Prozess festlegen, sonst springt der Mandant ab.`,
        href: `/mandat/${m.id}`,
        tone: m.accepted !== undefined && m.accepted < state.month ? "urgent" : "normal",
      });
    if (m.status === "bids") out.push({ text: `Mandat ${m.company}: Angebote liegen vor. Entscheide bis Monatsende.`, href: `/mandat/${m.id}`, tone: "urgent" });
  }
  for (const s of state.startups.filter((x) => x.status === "offered" && x.offer?.ev && x.offer.source === "search")) {
    out.push({ text: `Deine Suchende hat ${s.name} gefunden. Prüfen und strukturieren.`, href: `/uebernahme/${s.id}`, tone: "normal" });
  }
  const p = platformOf(state);
  if (p) {
    const open = mnaRead(state).addons.filter((a) => a.platformId === p.id && a.status === "open").length;
    if (open > 0) out.push({ text: `${p.name}: ${open === 1 ? "ein Zukauf" : `${open} Zukäufe`} möglich.`, href: `/plattform/${p.id}`, tone: "normal" });
  }
  return out;
}

export interface HoldingMna {
  record: MnaRecord;
  mandates: MandateLine[];
  search: boolean;
  owned: OwnedLine[];
  platformId?: string;
}

export function holdingMna(state: GameState): HoldingMna {
  return {
    record: mnaRead(state).record,
    mandates: mandateLines(state),
    search: Boolean(activeSearch(state)),
    owned: state.startups.filter((s) => s.status === "active" && s.lbo).map(ownedLine),
    platformId: platformOf(state)?.id,
  };
}
