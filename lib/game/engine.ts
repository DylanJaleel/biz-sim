import {
  ACTION_DAYS,
  CARRY,
  REPUTATION_FADE_FROM,
  REPUTATION_GAIN_STEPS,
  FIRE_SALE,
  LIVING_COSTS,
  OVERDRAFT_LIMIT,
  OVERDRAFT_RATE,
  TRADE_FEE,
  FOUNDER_CALL,
  JUDGMENT_REPUTATION,
  LAPSED_REPUTATION,
  LAPSED_TRUST,
  OVERRULED_TRUST,
  RESULT_REPUTATION,
  START_CASH,
  START_REPUTATION,
  monthLabel,
  ADVISOR_SHARES,
  ADVISOR_SHARES_MAX,
  INTRO_COOLDOWN,
  INTRO_REPEAT,
  LEAD_REPUTATION,
  LEAD_REPUTATION_GAIN,
  MAJORITY_REPUTATION_GAIN,
  ROUND_COOLDOWN,
  FAILED_SEARCH_COOLDOWN,
  ROUND_RUNWAY,
  SECONDARY_CHANCE,
  SECONDARY_DISCOUNT,
  WARMTH_INTRO_COST,
  WARMTH_INTRO_MIN,
  WARMTH_MEET,
  WARMTH_MEET_FIRST,
  DAYS_PER_MONTH,
  CORPORATE_FEE,
  CORPORATE_REPUTATION,
  EXIT_CHANCE,
  EXIT_MIN_AGE,
  EXIT_MIN_VALUE,
  NEGOTIATE_CHANCE,
  NEGOTIATE_GAIN,
  NEWS_FROM_MONTH,
  SYNDICATE_REPUTATION,
  SYNDICATE_WARMTH,
  SYNDICATE_WARMTH_COST,
  BUYOUT_LOAN_MONTHS,
  BUYOUT_LOAN_RATE,
  BUYOUT_LOAN_SHARE,
  BUYOUT_REPUTATION,
  BUYOUT_WORTH,
  DEALS_FROM_MONTH,
  DEALS_MAX_OPEN,
  DIVIDEND_RESERVE_MONTHS,
  DIVIDEND_SHARE,
  FAMILY_OFFICE_COST,
  FAMILY_OFFICE_REPUTATION,
  FAMILY_OFFICE_WORTH,
  FUND_BASE,
  FUND_EXITS,
  FUND_FEE,
  FUND_MATCH,
  FUND_MAX,
  FUND_MAX_DEAL,
  FUND_OFFICE_MONTHS,
  FUND_PER_EXIT,
  FUND_REPUTATION,
  IPO_CASH_SHARE,
  IPO_CHANCE,
  IPO_LOCKUP,
  IPO_MIN_VALUE,
  AGENDA_MAX,
  AGENDA_THIRD,
  PACE_BUSY_THIRD,
  PACE_CALM_QUARTER,
  PACE_MONTHS,
  PACE_NEXT,
  PACE_NORMAL_BETWEEN,
  CONDITIONS_TEMPO,
  FOLLOW_UP_MISSED,
  FOLLOW_UP_MONTHS,
} from "./config";
import { generateDeal, type DealStage } from "./dealgen";
import {
  applyRound,
  capTableAfterEntry,
  exitVote,
  fundability,
  playerAmount,
  roundTerms,
  sellers,
  shareholderVote,
  grantToPlayer,
  syndicateAmount,
  transferToPlayer,
  waterfall,
} from "./captable";
import { CORPORATE_ID, corporateStartup } from "./corporate";
import { CORPORATE_BOOKS, correctOldCorporate, ebitdaMargin } from "./corporate-books";
import { CYCLE_REVENUE } from "./mna-config";
import { NEWS, targetsOf } from "./news";
import { monthDays, OFFICES, officeOf } from "./office";
import { addBal, contactDef, contactOf, helpStrength, initialContacts, introCooldown, introWarmthCost, personOf, refuses, ringOpen } from "./network";
import { afterAcquire, defuseRivals, networkMonth, planNetwork, playEvent, playFavor, playHint, playSpecialist } from "./network-life";
import { boardFee, drawGigs } from "./gigs";
import { awardTrophies } from "./trophies";
import { cityOf, ensureGigLog, garageUpkeep, garageValue, RESALE, resolveTrip, travelOptions, vehicleBlocker, vehicleOf } from "./travel";
import { assetOf, holdingsValue, initialMarket, sentimentOf, stepMarket } from "./market";
import { templateOf, TEMPLATES } from "./content";
import { judge, bestOf, bestVote, judgmentWeight, outlook, resolveVote, VOTES } from "./judge";
import { COVENANTS, covenantOutlook, covenantSetup, optionValues, RISK_QUESTION, type CovenantOutlook } from "./covenants";
import { CURRICULUM } from "./lessons";
import { baseStances, buildMeeting, type MeetingPlayback } from "./meeting";
import { applyDelta, blendDelta, monthlyCashFlow, runwayMonths, stepMonth, valuation } from "./sim";
import { definitionOf, offerStartup, STARTUPS, type StartupDefinition } from "./startups";
import { fill, type ResolvedOutcome } from "./templates";
import type {
  ActionKind,
  BoardItem,
  CovenantId,
  CovenantSetup,
  Delta,
  ExitOffer,
  GameAction,
  GameState,
  GvVote,
  IncomeLines,
  Mail,
  MonthReport,
  Pace,
  PaceKind,
  Round,
  RoundTake,
  Shares,
  Startup,
  Vote,
} from "./types";
import { voteFromStance } from "./votes";
import type { Ctx } from "./mna-core";
import { mandatesMonth, planMandates, playMandate } from "./mna";
import { afterDuelPurchase, duelBlocker, duelsMonth, planRivalHouses, playDuel } from "./rivals";
import { leagueMonth } from "./league";
import { acquireDeal, cure, examine, lboAllowsDividends, lboMonth, planSearchTargets, searchMonth, startSearch, stopSearch, targetDeal, targetEv } from "./lbo";
import { acquire, makePlatform, planAddons, platformMonth, recordSale, startSale, stopSale } from "./platform";
import { assignOp, delegateFor, fireOp, hireOp, migrateTeam, teamCarry, teamDealFlow, teamMonth } from "./team";
import { dragAlong, foundHoldco, guaranteeClaim, guaranteeText } from "./holdco";
import { estateEquity, officeRent } from "./estate";
import { heirBlocks, heirInCharge } from "./dynasty";
import { playWealth, wealthMonth } from "./wealth";
import { explainValueChange, familyDelta, familyIntroDelta, LBO_EXCLUDED_TEMPLATES, playLever, STARTUP_ONLY_TEMPLATES } from "./family";
import { seedUnlocks } from "./onboarding";

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameRuleError";
  }
}

// ---------------------------------------------------------------------------
// Randomness: every roll is derived from the game seed and a purpose, so a
// month replays identically and the client can preview a meeting.
// ---------------------------------------------------------------------------

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randomFor(seed: number, purpose: string): () => number {
  let a = hash(`${seed}|${purpose}`);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clone = <T>(value: T): T => structuredClone(value);

function nextId(state: GameState, prefix: string): string {
  state.counter += 1;
  return `${prefix}${state.counter}`;
}

function mail(state: GameState, data: Omit<Mail, "id" | "month" | "read">): void {
  state.mails.unshift({ ...data, id: nextId(state, "m"), month: state.month, read: false });
  if (state.mails.length > 80) state.mails.length = 80;
}

// ---------------------------------------------------------------------------
// New game
// ---------------------------------------------------------------------------

export function newGame(seed: number): GameState {
  const state: GameState = {
    version: 6,
    seed,
    month: 1,
    daysUsed: 0,
    cash: START_CASH,
    reputation: START_REPUTATION,
    startups: [],
    items: [],
    effects: [],
    calendar: [],
    mails: [],
    lessons: [],
    reports: [],
    counter: 0,
    rounds: [],
    shareOffers: [],
    contacts: initialContacts(seed),
    ledRounds: 0,
    gigs: [],
    market: initialMarket(),
    office: 0,
    exits: [],
    news: [],
    corporateSeat: "none",
    deals: [],
    team: [],
    lockups: [],
    loans: [],
    yearWorth: START_CASH,
    trophies: [],
    garage: [],
  };
  state.gigs = drawGigs(1, state.reputation, randomFor(seed, "gigs|1"), () => nextId(state, "g"));
  mail(state, {
    kind: "system",
    from: "Boardroom",
    subject: "Willkommen in deinem Büro",
    body: "Du hast 150.000 € Privatkapital und den Wunsch, mehr zu bewegen als ein Sparbuch. Zwei Gründer suchen einen Angel. Prüfe die Angebote, investiere in eines und begleite die Firma im Beirat. Jeder Monat hat 20 Arbeitstage. Davon lebst du auch: Rund 1.800 € kostet dein Leben im Monat, Beratungsaufträge bringen Geld, kosten aber Tage. Was nicht gebraucht wird, kann an der Börse arbeiten.",
  });
  for (const def of STARTUPS.filter((d) => d.arrives === 1)) offer(state, def.id);
  return state;
}

/** Fixed startups and generated deals alike. */
export function definitionIn(state: GameState, id: string): StartupDefinition {
  return state.deals?.find((d) => d.id === id) ?? definitionOf(id);
}

function offer(state: GameState, id: string): void {
  if (state.startups.some((s) => s.id === id)) return;
  const def = definitionIn(state, id);
  const startup = offerStartup(def, state.month);
  state.startups.push(startup);
  mail(state, { kind: "deal", from: def.mail.from, subject: def.mail.subject, body: def.mail.body, startupId: id });
}

/**
 * Brings a stored game up to the current version. Version 1 games (Phase 1)
 * get cap tables, rounds, offers and the network; nothing else changes.
 */
export function upgradeState(input: GameState): GameState {
  let state = input as GameState & { version: number };
  if (state.version >= 6) return migrateTeam(upgradeCorporate(state));
  if (state.version < 5) state = upgradeToV5(state);
  // Version 6: display cabinet and garage. What was earned before shows up quietly.
  const next: GameState = { ...state, version: 6, trophies: state.trophies ?? [], garage: state.garage ?? [] };
  awardTrophies(next, netWorth(next));
  for (const t of next.trophies) t.seen = true;
  return migrateTeam(upgradeCorporate(next));
}

/** Older games ran the Konzern on the startup path, which made it shrink: corrected once on loading. */
function upgradeCorporate(state: GameState): GameState {
  const old = state.startups.find((s) => s.corporate && (s.corporateModel ?? 1) < CORPORATE_BOOKS.model);
  const fixed = old && correctOldCorporate(old);
  if (!old || !fixed) return state;
  const next: GameState = { ...state, startups: state.startups.map((s) => (s === old ? fixed : s)), mails: [...state.mails] };
  if (fixed.metrics !== old.metrics)
    mail(next, {
      kind: "founder",
      from: "Martina Hollerbach, Nordhafen AG",
      subject: "Zahlen der Nordhafen AG neu aufgestellt",
      body: `Unsere Zahlen wurden bisher wie bei einem Startup fortgeschrieben, das ließ den Konzern Monat für Monat schrumpfen. Neu gerechnet: ${Math.round(fixed.metrics.revenue / 1_000_000)} Mio. € Umsatz im Monat, eine EBITDA-Marge von ${Math.round(ebitdaMargin(fixed.metrics) * 100)} % und ${Math.round(fixed.metrics.debt / 1_000_000)} Mio. € Schulden.`,
      startupId: CORPORATE_ID,
    });
  return next;
}

function upgradeToV5(input: GameState): GameState {
  let state = input as GameState & { version: number };
  if (state.version < 2) {
    for (const s of state.startups) {
      if (!s.capTable) s.capTable = capTableAfterEntry(definitionOf(s.id).capTable, s.stake);
    }
    state = {
      ...state,
      version: 2 as number as 6,
      rounds: state.rounds ?? [],
      shareOffers: state.shareOffers ?? [],
      contacts: state.contacts ?? initialContacts(),
      ledRounds: state.ledRounds ?? 0,
    };
  }
  // Version 3: income and the stock market.
  const next: GameState = { ...state, version: 5 as number as 6, market: state.market ?? initialMarket(), gigs: state.gigs ?? [] };
  if (next.gigs.length === 0) next.gigs = drawGigs(next.month, next.reputation, randomFor(next.seed, `gigs|${next.month}`), () => nextId(next, "g"));
  // Version 4: offices, exits, news and the corporate seat.
  next.office = next.office ?? 0;
  next.exits = next.exits ?? [];
  next.news = next.news ?? [];
  next.corporateSeat = next.corporateSeat ?? "none";
  // Version 5: generated deals, family office, fund, IPO lockups, loans.
  next.deals = next.deals ?? [];
  next.team = next.team ?? [];
  next.lockups = next.lockups ?? [];
  next.loans = next.loans ?? [];
  next.yearWorth = next.yearWorth ?? netWorth(next);
  return next;
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function startupOf(state: GameState, id: string): Startup {
  const s = state.startups.find((x) => x.id === id);
  if (!s) throw new GameRuleError("Diese Firma gibt es nicht.");
  return s;
}

export function itemOf(state: GameState, id: string): BoardItem {
  const item = state.items.find((x) => x.id === id);
  if (!item) throw new GameRuleError("Diese Vorlage gibt es nicht.");
  return item;
}

/** The three conditions of an item; older games derive them the same way the agenda would have. */
export function covenantsOf(state: GameState, item: BoardItem): CovenantSetup {
  if (item.covenants) return item.covenants;
  return covenantSetup(templateOf(item.templateId), startupOf(state, item.startupId), randomFor(state.seed, `covenant|${item.id}`));
}

export function openItems(state: GameState): BoardItem[] {
  return state.items.filter((i) => i.status === "open");
}

export function daysLeft(state: GameState): number {
  return monthDays(state) - state.daysUsed;
}

/** Account, depot and stakes together: what an office landlord looks at. */
export function netWorth(state: GameState): number {
  const debt = state.loans.reduce((sum, l) => sum + l.balance, 0);
  const locked = state.lockups.reduce((sum, l) => sum + l.amount * (state.market.prices.tech / l.index), 0);
  return state.cash + holdingsValue(state.market) + portfolioValue(state) + garageValue(state) + locked - debt + estateEquity(state);
}

export function portfolioValue(state: GameState): number {
  return state.startups.filter((s) => s.status === "active").reduce((sum, s) => sum + (s.stake / 100) * valuation(s.metrics), 0);
}

export function meetingRandom(state: GameState, item: BoardItem): () => number {
  return randomFor(state.seed, `meeting|${item.id}`);
}

/** The meeting as the client may preview it before the player speaks or votes. */
export function previewMeeting(state: GameState, itemId: string, argument?: string | null, vote?: Vote): MeetingPlayback {
  const item = itemOf(state, itemId);
  return buildMeeting({
    template: templateOf(item.templateId),
    startup: startupOf(state, item.startupId),
    item,
    reputation: state.reputation,
    random: meetingRandom(state, item),
    argument,
    vote,
  });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type ActionResult =
  | { kind: "none" }
  | { kind: "meeting"; playback: MeetingPlayback; itemId: string }
  | { kind: "report"; report: MonthReport }
  | { kind: "round"; roundId: string }
  | { kind: "exit"; exitId: string };

function spendDays(state: GameState, kind: keyof typeof ACTION_DAYS | ActionKind, label: string, custom?: number): void {
  const days = custom ?? (kind in ACTION_DAYS ? ACTION_DAYS[kind as keyof typeof ACTION_DAYS] : 1);
  if (days === 0) return;
  if (state.daysUsed + days > monthDays(state)) {
    throw new GameRuleError(`Dafür fehlen dir Tage: ${days} nötig, ${daysLeft(state)} frei. Schließe den Monat ab.`);
  }
  state.calendar.push({ day: state.daysUsed + 1, days, kind, label });
  state.daysUsed += days;
}

function requireOpenItem(state: GameState, itemId: string): BoardItem {
  const item = itemOf(state, itemId);
  if (item.status !== "open") throw new GameRuleError("Über diese Vorlage wurde bereits entschieden.");
  return item;
}

export function applyAction(current: GameState, action: GameAction): { state: GameState; result: ActionResult } {
  const out = playAction(current, action);
  // New tombstones for the cabinet; the game announces them until seen.
  if (action.type !== "seenTrophies") awardTrophies(out.state, netWorth(out.state));
  return out;
}

/** What the M&A modules (mandates, succession programme, buy-and-build) may do with the game. */
export function ctxOf(state: GameState): Ctx {
  return {
    state,
    mail: (data) => mail(state, data),
    id: (prefix) => nextId(state, prefix),
    lesson: (id) => unlockLesson(state, id),
    spend: (kind, label, days) => spendDays(state, kind, label, days),
    replace: (s) => replaceStartup(state, s),
    worth: () => netWorth(state),
    reputation: (delta) => {
      state.reputation = Math.min(100, Math.max(0, state.reputation + reputationGain(state, delta)));
    },
    addDeal: (def) => {
      state.deals.push(def);
      offer(state, def.id);
      return startupOf(state, def.id);
    },
    majority: (s, before) => checkMajority(state, s, before),
    fail: (message) => {
      throw new GameRuleError(message);
    },
  };
}

function playAction(current: GameState, action: GameAction): { state: GameState; result: ActionResult } {
  const state = clone(current);
  const heirMove = heirBlocks(state, action);
  if (heirMove) throw new GameRuleError(heirMove);
  switch (action.type) {
    case "estate":
    case "foundation":
    case "dynasty": {
      playWealth(ctxOf(state), action);
      return { state, result: { kind: "none" } };
    }
    case "mandate": {
      playMandate(ctxOf(state), action);
      return { state, result: { kind: "none" } };
    }
    case "search": {
      if (action.move === "start") startSearch(ctxOf(state), action.candidate ?? 0);
      else stopSearch(ctxOf(state));
      return { state, result: { kind: "none" } };
    }
    case "examine": {
      examine(ctxOf(state), action.targetId, action.modules);
      return { state, result: { kind: "none" } };
    }
    case "acquire": {
      // A rival the player has warmed up to steps back before the price is set.
      defuseRivals(ctxOf(state));
      const duel = duelBlocker(state, action.targetId, action.bid);
      if (duel) throw new GameRuleError(duel);
      acquire(ctxOf(state), action.targetId, { bid: action.bid, bank: action.bank, vendor: action.vendor, earnout: action.earnout }, action.integration);
      afterAcquire(state, action.targetId);
      afterDuelPurchase(ctxOf(state), action.targetId);
      return { state, result: { kind: "none" } };
    }
    case "duel": {
      playDuel(ctxOf(state), action.targetId, action.move, action.size);
      return { state, result: { kind: "none" } };
    }
    case "favor": {
      playFavor(ctxOf(state), action.favorId, action.accept);
      return { state, result: { kind: "none" } };
    }
    case "event": {
      playEvent(ctxOf(state), action.eventId, action.move, action.talk ?? false);
      return { state, result: { kind: "none" } };
    }
    case "specialist": {
      playSpecialist(ctxOf(state), action.contactId, action.targetId);
      return { state, result: { kind: "none" } };
    }
    case "contactHint": {
      playHint(ctxOf(state), action.contactId, action.itemId);
      return { state, result: { kind: "none" } };
    }
    case "lever": {
      playLever(ctxOf(state), startupOf(state, action.startupId), action.lever);
      return { state, result: { kind: "none" } };
    }
    case "platform": {
      const s = startupOf(state, action.startupId);
      const ctx = ctxOf(state);
      if (action.move === "make") makePlatform(ctx, s);
      else if (action.move === "sell") startSale(ctx, s, action.process ?? "auction", action.buyers ?? "strategic");
      else if (action.move === "cure") cure(ctx, s);
      else stopSale(ctx, s);
      return { state, result: { kind: "none" } };
    }
    case "dd": {
      const s = startupOf(state, action.startupId);
      if (s.status !== "offered" || !s.offer) throw new GameRuleError("Dieses Angebot liegt nicht mehr vor.");
      if (s.offer.ddDone) throw new GameRuleError("Diese Firma hast du schon geprüft.");
      spendDays(state, "dd", `Prüfung ${s.name}`, officeOf(state).ddDays);
      s.offer.ddDone = true;
      unlockLesson(state, "due_diligence");
      return { state, result: { kind: "none" } };
    }
    case "invest": {
      const s = startupOf(state, action.startupId);
      if (s.status !== "offered" || !s.offer) throw new GameRuleError("Dieses Angebot liegt nicht mehr vor.");
      if (s.offer.buyout) throw new GameRuleError("Eine Nachfolge kaufst du über den Kauf der Mehrheit.");
      const half = action.size === "half";
      const ticket = half ? Math.round(s.offer.ticket / 2 / 1000) * 1000 : s.offer.ticket;
      const stake = half ? s.offer.stake / 2 : s.offer.stake;
      if (state.cash < ticket) throw new GameRuleError("Dafür reicht dein Privatkapital nicht.");
      spendDays(state, "invest", `Beteiligung ${s.name}`);
      state.cash -= ticket;
      s.status = "active";
      s.stake = stake;
      s.capTable = capTableAfterEntry(s.capTable, stake);
      s.joined = state.month;
      s.playerCost = (s.playerCost ?? 0) + ticket;
      if (!s.offer.ddDone) s.flags.push("blind");
      s.history.push({ month: state.month, revenue: s.metrics.revenue, cash: s.metrics.cash, valuation: valuation(s.metrics), stake: s.stake });
      replaceStartup(state, fundCoInvest(state, s, ticket, stake, false));
      const ceo = s.board.find((b) => b.seat === "ceo");
      mail(state, {
        kind: "founder",
        from: ceo ? `${ceo.name}, ${s.name}` : s.name,
        subject: "Willkommen im Beirat!",
        body: `Wir freuen uns sehr. Die erste Beiratssitzung kommt im nächsten Monat. Bis dahin: Ruf jederzeit an, wenn du Fragen hast.`,
        startupId: s.id,
      });
      unlockLesson(state, "governance");
      return { state, result: { kind: "none" } };
    }
    case "decline": {
      const s = startupOf(state, action.startupId);
      if (s.status !== "offered") throw new GameRuleError("Dieses Angebot liegt nicht mehr vor.");
      s.status = "declined";
      return { state, result: { kind: "none" } };
    }
    case "question": {
      const item = requireOpenItem(state, action.itemId);
      const t = templateOf(item.templateId);
      if (!t.questions.some((q) => q.id === action.questionId) && action.questionId !== RISK_QUESTION.id) throw new GameRuleError("Diese Frage gibt es nicht.");
      if (item.asked.includes(action.questionId)) throw new GameRuleError("Diese Frage hast du schon gestellt.");
      spendDays(state, "question", `Rückfrage ${startupOf(state, item.startupId).name}`, officeOf(state).analyst ? 0 : undefined);
      item.asked.push(action.questionId);
      return { state, result: { kind: "none" } };
    }
    case "cfo": {
      const item = requireOpenItem(state, action.itemId);
      if (item.cfo) throw new GameRuleError("Der CFO hat die Vorlage schon durchgerechnet.");
      spendDays(state, "cfo", `CFO-Gespräch ${startupOf(state, item.startupId).name}`, officeOf(state).analyst ? 0 : undefined);
      item.cfo = true;
      return { state, result: { kind: "none" } };
    }
    case "pretalk": {
      const item = requireOpenItem(state, action.itemId);
      const s = startupOf(state, item.startupId);
      const member = s.board.find((b) => b.seat === action.seat);
      if (!member) throw new GameRuleError("Diese Person sitzt nicht im Beirat.");
      if (item.pretalks.includes(action.seat)) throw new GameRuleError("Mit dieser Person hast du schon gesprochen.");
      spendDays(state, "pretalk", `Vorgespräch ${member.short}`);
      item.pretalks.push(action.seat);
      return { state, result: { kind: "none" } };
    }
    case "meeting": {
      const item = requireOpenItem(state, action.itemId);
      const t = templateOf(item.templateId);
      if (action.argument !== null && !t.arguments.some((a) => a.id === action.argument)) {
        throw new GameRuleError("Dieses Argument gibt es nicht.");
      }
      if (!VOTES.includes(action.vote)) throw new GameRuleError("Ungültige Stimme.");
      if (action.covenant !== undefined) {
        if (action.vote !== "conditions") throw new GameRuleError("Eine Auflage gibt es nur zur Stimme „Auflagen“.");
        if (!covenantsOf(state, item).options.includes(action.covenant)) throw new GameRuleError("Diese Auflage steht nicht zur Wahl.");
      }
      const s = startupOf(state, item.startupId);
      // Further items on the same agenda are decided in the same sitting.
      spendDays(state, "meeting", `Beirat ${s.name}`, sittingToday(state, s) ? 0 : undefined);
      const playback = buildMeeting({
        template: t,
        startup: s,
        item,
        reputation: state.reputation,
        random: meetingRandom(state, item),
        argument: action.argument,
        vote: action.vote,
        covenant: action.covenant,
      });
      const further = state.items.some(
        (i) => i.id !== item.id && i.startupId === s.id && i.decision && !i.decision.lapsed && !i.decision.delegated && i.decision.month === state.month,
      );
      decide(state, item, playback.outcome!, action.vote, action.argument, playback.stancesAfter.ceo, playback.shares!, action.covenant);
      item.decision!.ballots = playback.ballots;
      // Reputation comes from the sitting, not from the number of items: further items count half.
      if (further) {
        const d = item.decision!;
        const half = Math.trunc(d.reputationDelta / 2);
        state.reputation = Math.min(100, Math.max(0, state.reputation - d.reputationDelta + half));
        d.reputationDelta = half;
      }
      return { state, result: { kind: "meeting", playback, itemId: item.id } };
    }
    case "followUp": {
      const item = itemOf(state, action.itemId);
      const f = item.followUp;
      if (!f || f.done || f.missed || !item.decision) throw new GameRuleError("Für diese Vorlage steht kein Folgetermin an.");
      if (state.month <= item.decision.month) throw new GameRuleError("Der Folgetermin ist frühestens im nächsten Monat sinnvoll.");
      if (state.month > f.until) throw new GameRuleError("Die Frist für den Folgetermin ist vorbei.");
      const s = startupOf(state, item.startupId);
      if (s.status !== "active") throw new GameRuleError("Du sitzt nicht mehr im Gremium dieser Firma.");
      spendDays(state, "followUp", `Folgetermin ${s.name}`);
      f.done = true;
      const applied = item.decision.applied;
      unlockLesson(state, applied && applied !== "standard" ? COVENANTS[applied].lesson : "covenants");
      return { state, result: { kind: "none" } };
    }
    case "founderCall": {
      const s = startupOf(state, action.startupId);
      if (s.status !== "active") throw new GameRuleError("Du sitzt nicht im Beirat dieser Firma.");
      if (state.calendar.some((c) => c.kind === "founderCall" && c.label.endsWith(s.name))) {
        throw new GameRuleError("Du hast diesen Monat schon mit der Gründung gesprochen.");
      }
      spendDays(state, "founderCall", `Gespräch ${s.name}`);
      replaceStartup(state, applyDelta(s, { trust: FOUNDER_CALL.trust, morale: FOUNDER_CALL.morale }));
      return { state, result: { kind: "none" } };
    }
    case "learn": {
      const next = CURRICULUM.find((id) => !state.lessons.includes(id));
      if (!next) throw new GameRuleError("Du kennst schon alle Lernkarten.");
      spendDays(state, "learn", "Weiterbildung");
      unlockLesson(state, next);
      return { state, result: { kind: "none" } };
    }
    case "readMail": {
      const m = state.mails.find((x) => x.id === action.mailId);
      if (m) m.read = true;
      return { state, result: { kind: "none" } };
    }
    case "closeMonth": {
      const report = closeMonth(state);
      return { state, result: { kind: "report", report } };
    }
    case "round": {
      const round = state.rounds.find((r) => r.id === action.roundId);
      if (!round || round.status !== "open") throw new GameRuleError("Über diese Runde wurde schon entschieden.");
      const s = startupOf(state, round.startupId);
      if (s.status !== "active") throw new GameRuleError("Die Firma ist nicht mehr aktiv.");
      if (action.take === "lead" && state.reputation < LEAD_REPUTATION) {
        throw new GameRuleError(`Eine Runde anführen kannst du ab ${LEAD_REPUTATION} Ruf.`);
      }
      if (action.take === "syndicate") {
        const why = syndicateBlocker(state);
        if (why) throw new GameRuleError(why);
      }
      if (state.cash < playerAmount(round, s.stake, action.take)) throw new GameRuleError("Dafür reicht dein Privatkapital nicht.");
      spendDays(state, "round", `Gesellschafterversammlung ${s.name}`);
      settleRound(state, round, action.take, action.vote, []);
      return { state, result: { kind: "round", roundId: round.id } };
    }
    case "buyShares": {
      const offer = state.shareOffers.find((o) => o.id === action.offerId);
      if (!offer || offer.status !== "open") throw new GameRuleError("Dieses Angebot gilt nicht mehr.");
      const s = startupOf(state, offer.startupId);
      if (s.status !== "active") throw new GameRuleError("Die Firma ist nicht mehr aktiv.");
      const seller = s.capTable.find((h) => h.id === offer.sellerId);
      if (!seller || seller.pct + 0.01 < offer.pct) throw new GameRuleError("Diese Anteile gibt es so nicht mehr.");
      if (state.cash < offer.price) throw new GameRuleError("Dafür reicht dein Privatkapital nicht.");
      spendDays(state, "buyShares", `Anteilskauf ${s.name}`);
      state.cash -= offer.price;
      offer.status = "bought";
      s.playerCost = (s.playerCost ?? 0) + offer.price;
      const before = s.stake;
      replaceStartup(state, transferToPlayer(s, offer.sellerId, Math.min(offer.pct, seller.pct)));
      unlockLesson(state, "secondary");
      checkMajority(state, startupOf(state, s.id), before);
      return { state, result: { kind: "none" } };
    }
    case "askShares": {
      const s = startupOf(state, action.startupId);
      if (s.status !== "active" || s.corporate) throw new GameRuleError("Du bist an dieser Firma nicht beteiligt.");
      if (state.calendar.some((c) => c.kind === "askShares" && c.label.endsWith(s.name))) {
        throw new GameRuleError("Du hast diesen Monat schon nach Anteilen gefragt.");
      }
      spendDays(state, "askShares", `Anteile anfragen ${s.name}`);
      const random = randomFor(state.seed, `ask|${s.id}|${state.month}`);
      const options = sellers(s);
      const chance = Math.min(0.9, 0.35 + s.metrics.trust / 250 + state.reputation / 250);
      if (options.length === 0 || random() > chance) {
        mail(state, {
          kind: "shares",
          from: s.name,
          subject: "Niemand will verkaufen",
          body: "Du hast dich umgehört, aber gerade will niemand Anteile abgeben. Mehr Vertrauen und ein besserer Ruf öffnen Türen.",
          startupId: s.id,
        });
        return { state, result: { kind: "none" } };
      }
      const pick = options[Math.floor(random() * options.length) % options.length]!;
      createShareOffer(state, s, pick.holder.id, pick.pct, pick.factor);
      return { state, result: { kind: "none" } };
    }
    case "meetContact": {
      const c = contactOf(state, action.contactId);
      if (!c) throw new GameRuleError("Diesen Kontakt gibt es nicht.");
      const def = contactDef(c.id);
      const name = personOf(state, c).name;
      if (!ringOpen(state, def.ring)) throw new GameRuleError("Dieser Kreis öffnet sich erst mit mehr Ruf.");
      if (state.calendar.some((e) => e.kind === "meetContact" && e.label.endsWith(name))) {
        throw new GameRuleError("Ihr habt euch diesen Monat schon getroffen.");
      }
      spendDays(state, "meetContact", `Treffen mit ${name}`);
      c.warmth = Math.min(100, c.warmth + (c.met ? WARMTH_MEET : WARMTH_MEET_FIRST));
      c.met = true;
      unlockLesson(state, "netzwerk");
      // Warm enough now, a contact who bid against the player may step back.
      defuseRivals(ctxOf(state));
      return { state, result: { kind: "none" } };
    }
    case "introContact": {
      const c = contactOf(state, action.contactId);
      if (!c) throw new GameRuleError("Diesen Kontakt gibt es nicht.");
      const def = contactDef(c.id);
      const name = personOf(state, c).name;
      if (def.kind === "specialist") throw new GameRuleError(`${name} hilft bei Übernahmen, Mandaten und Plattformen, nicht bei Startups.`);
      if (!c.met || !ringOpen(state, def.ring)) throw new GameRuleError("Diesen Kontakt kennst du noch nicht gut genug.");
      if (refuses(c)) {
        const net = state.network;
        if (net) net.log.refusals += 1;
        throw new GameRuleError(`${name} sagt Nein: Du hast in letzter Zeit nur genommen. Tu erst selbst einen Gefallen.`);
      }
      if (c.warmth < WARMTH_INTRO_MIN) throw new GameRuleError(`Die Beziehung ist zu kühl. Ab ${WARMTH_INTRO_MIN} Wärme kannst du um einen Gefallen bitten.`);
      if (c.lastIntro !== undefined && state.month - c.lastIntro < introCooldown(c, INTRO_COOLDOWN)) {
        throw new GameRuleError(`${name} hat dir gerade erst geholfen. Frag in ein paar Monaten wieder.`);
      }
      const s = startupOf(state, action.startupId);
      if (s.status !== "active" || s.corporate) throw new GameRuleError("Du bist an dieser Firma nicht beteiligt.");
      spendDays(state, "introContact", `${name} für ${s.name}`);
      const strength = helpStrength(c);
      c.warmth = Math.max(0, c.warmth - introWarmthCost(c, WARMTH_INTRO_COST));
      c.lastIntro = state.month;
      addBal(c, -1);
      state.reputation = Math.min(100, state.reputation + reputationGain(state, 1));
      unlockLesson(state, "netzwerk");
      unlockLesson(state, "warm_intro");
      introduce(state, s, def.id, strength, name);
      return { state, result: { kind: "none" } };
    }
    case "gig": {
      const gig = state.gigs.find((g) => g.id === action.gigId);
      if (!gig || gig.status !== "offered") throw new GameRuleError("Dieser Auftrag ist nicht mehr zu haben.");
      // Without a choice: second class by train, done the safe way.
      const options = travelOptions(state, gig);
      const option = options.find((o) => o.id === (action.travel ?? "bahn2"));
      if (!option) throw new GameRuleError("Diese Anreise gibt es für diesen Auftrag nicht.");
      if (option.locked) throw new GameRuleError(`${option.name}: ${option.locked}.`);
      const approach = action.approach ?? "safe";
      const trip = resolveTrip(gig, option, approach, randomFor(state.seed, `trip|${gig.id}`)());
      if (state.cash < option.cost) throw new GameRuleError("Für diese Anreise reicht das Konto nicht.");
      spendDays(state, "gig", `${gig.title} (${gig.client})`, trip.days);
      state.cash -= option.cost;
      gig.trip = {
        travel: option.id,
        travelName: option.name,
        approach,
        travelDays: option.days,
        travelCost: option.cost,
        offeredFee: gig.fee,
        reputation: trip.reputation,
        success: trip.success,
        head: trip.head,
        text: trip.text,
      };
      gig.fee = trip.fee;
      gig.days = trip.days;
      if (trip.warmth && gig.contactId) gig.warmth = (gig.warmth ?? 0) + trip.warmth;
      gig.status = "booked";
      unlockLesson(state, "opportunitaetskosten");
      return { state, result: { kind: "none" } };
    }
    case "buyVehicle": {
      const v = vehicleOf(action.vehicleId);
      if (!v) throw new GameRuleError("Dieses Fahrzeug gibt es nicht.");
      const blocker = vehicleBlocker(state, v);
      if (blocker) throw new GameRuleError(blocker);
      state.cash -= v.price;
      state.garage = [...state.garage, v.id];
      return { state, result: { kind: "none" } };
    }
    case "sellVehicle": {
      const v = vehicleOf(action.vehicleId);
      if (!v || !state.garage.includes(v.id)) throw new GameRuleError("Das hast du nicht.");
      state.cash += Math.round(v.price * RESALE);
      state.garage = state.garage.filter((id) => id !== v.id);
      return { state, result: { kind: "none" } };
    }
    case "seenTrophies": {
      for (const t of state.trophies) t.seen = true;
      return { state, result: { kind: "none" } };
    }
    case "trade": {
      const asset = assetOf(action.assetId);
      const m = state.market;
      const price = m.prices[asset.id];
      if (!Number.isFinite(action.amount) || action.amount === 0) throw new GameRuleError("Bitte einen Betrag angeben.");
      if (action.amount > 0) {
        const fee = Math.max(1, Math.round(action.amount * TRADE_FEE));
        if (state.cash < action.amount + fee) throw new GameRuleError("Dafür reicht dein Privatkapital nicht.");
        state.cash -= action.amount + fee;
        m.holdings[asset.id] += action.amount / price;
        m.invested[asset.id] += action.amount;
        const kinds = Object.values(m.holdings).filter((u) => u > 0).length;
        if (asset.yield > 0) unlockLesson(state, "dividendenrendite");
        if (kinds >= 2) unlockLesson(state, "diversifikation");
      } else {
        const held = m.holdings[asset.id] * price;
        const sell = Math.min(-action.amount, held);
        if (sell <= 0) throw new GameRuleError("Davon hältst du nichts.");
        const fee = Math.max(1, Math.round(sell * TRADE_FEE));
        const share = sell / held;
        m.holdings[asset.id] -= m.holdings[asset.id] * share;
        m.invested[asset.id] -= m.invested[asset.id] * share;
        if (m.holdings[asset.id] < 1e-6) {
          m.holdings[asset.id] = 0;
          m.invested[asset.id] = 0;
        }
        state.cash += sell - fee;
        unlockLesson(state, "liquiditaet");
      }
      return { state, result: { kind: "none" } };
    }
    case "exit": {
      const offer = state.exits.find((e) => e.id === action.exitId);
      if (!offer || offer.status !== "open") throw new GameRuleError("Dieses Kaufangebot liegt nicht mehr vor.");
      const s = startupOf(state, offer.startupId);
      if (s.status !== "active") throw new GameRuleError("Die Firma ist nicht mehr aktiv.");
      if (action.choice === "negotiate") {
        if (offer.choice === "negotiate") throw new GameRuleError("Du hast schon nachverhandelt. Jetzt muss die Versammlung entscheiden.");
        spendDays(state, "negotiate", `Verhandlung ${s.name}`);
        offer.choice = "negotiate";
        negotiate(state, offer, s);
        return { state, result: { kind: "none" } };
      }
      spendDays(state, "exit", `Gesellschafterversammlung ${s.name}`);
      offer.choice = action.choice;
      settleExit(state, offer, action.choice === "accept" ? "go" : "no", []);
      return { state, result: { kind: "exit", exitId: offer.id } };
    }
    case "moveOffice": {
      const target = OFFICES[action.level];
      if (!target) throw new GameRuleError("Dieses Büro gibt es nicht.");
      if (action.level === state.office) throw new GameRuleError("Hier sitzt du schon.");
      if (action.level > state.office) {
        if (state.reputation < target.reputation) throw new GameRuleError(`Für dieses Büro brauchst du ${target.reputation} Ruf.`);
        if (netWorth(state) < target.worth) throw new GameRuleError(`Der Vermieter will ein Vermögen von ${target.worth.toLocaleString("de-DE")} € sehen.`);
        if (state.cash < target.rent) throw new GameRuleError("Für Kaution und Umzug fehlt dir das Geld.");
        // Deposit and moving: one month's rent.
        state.cash -= target.rent;
      }
      if (state.daysUsed > DAYS_PER_MONTH + target.extraDays) throw new GameRuleError("Diesen Monat hast du schon mehr Tage verplant, als das kleinere Büro hergibt.");
      state.office = action.level;
      unlockLesson(state, "fixkosten");
      mail(state, {
        kind: "system",
        from: "Boardroom",
        subject: `Umzug: ${target.name}`,
        body:
          target.rent > 0
            ? `Ab jetzt kostet dein Büro ${target.rent.toLocaleString("de-DE")} € Miete im Monat. ${target.perks.join(". ")}.`
            : "Zurück an den Küchentisch. Keine Miete mehr, aber auch keine Hilfe.",
      });
      return { state, result: { kind: "none" } };
    }
    case "buyout": {
      const s = startupOf(state, action.startupId);
      if (s.status !== "offered" || !s.offer?.buyout) throw new GameRuleError("Dieses Angebot liegt nicht mehr vor.");
      if (state.reputation < BUYOUT_REPUTATION) throw new GameRuleError(`Eine Firma übernehmen kannst du ab ${BUYOUT_REPUTATION} Ruf.`);
      // Family businesses valued by EBITDA: the structured purchase with a bank loan in the company.
      if (s.offer.ev) {
        const duel = duelBlocker(state, s.id, "ask");
        if (duel) throw new GameRuleError(duel);
        acquireDeal(ctxOf(state), s, { bid: "ask", bank: action.leverage ? BUYOUT_LOAN_SHARE : 0, vendor: 0, earnout: 0 });
        afterDuelPurchase(ctxOf(state), s.id);
        return { state, result: { kind: "none" } };
      }
      const price = s.offer.ticket;
      const loan = action.leverage ? Math.round((price * BUYOUT_LOAN_SHARE) / 1000) * 1000 : 0;
      if (state.cash < price - loan) throw new GameRuleError(`Dafür reicht dein Kapital nicht: ${(price - loan).toLocaleString("de-DE")} € nötig.`);
      spendDays(state, "buyout", `Übernahme ${s.name}`);
      state.cash -= price - loan;
      s.playerCost = (s.playerCost ?? 0) + price;
      if (loan > 0) {
        state.loans.push({
          id: nextId(state, "k"),
          startupId: s.id,
          label: `Kaufkredit ${s.name}`,
          balance: loan,
          rate: BUYOUT_LOAN_RATE,
          payment: annuity(loan, BUYOUT_LOAN_RATE, BUYOUT_LOAN_MONTHS),
        });
        unlockLesson(state, "lbo");
      }
      s.status = "active";
      s.stake = s.offer.stake;
      s.capTable = capTableAfterEntry(s.capTable, s.stake);
      s.joined = state.month;
      if (!s.offer.ddDone) s.flags.push("blind");
      s.history.push({ month: state.month, revenue: s.metrics.revenue, cash: s.metrics.cash, valuation: valuation(s.metrics), stake: s.stake });
      replaceStartup(state, fundCoInvest(state, s, price, s.offer.stake, true));
      checkMajority(state, startupOf(state, s.id), 0);
      unlockLesson(state, "ausschuettung");
      mail(state, {
        kind: "founder",
        from: s.board.find((b) => b.seat === "ceo")?.name ?? s.name,
        subject: "Der Vertrag ist unterschrieben",
        body: `${s.name} gehört jetzt mehrheitlich dir. ${loan > 0 ? `Die Bank finanziert ${loan.toLocaleString("de-DE")} € über acht Jahre; die Rate läuft über dein Konto. ` : ""}Was die Firma nicht braucht, schüttet sie jedes Quartal aus.`,
        startupId: s.id,
      });
      return { state, result: { kind: "none" } };
    }
    case "foundFamilyOffice": {
      if (state.familyOffice) throw new GameRuleError("Dein Family Office gibt es schon.");
      if (state.reputation < FAMILY_OFFICE_REPUTATION) throw new GameRuleError(`Ein Family Office gründest du ab ${FAMILY_OFFICE_REPUTATION} Ruf.`);
      if (state.office < 3) throw new GameRuleError("Dafür brauchst du mindestens die Büroetage mit Analyst.");
      if (netWorth(state) < FAMILY_OFFICE_WORTH) throw new GameRuleError(`Dafür brauchst du ${FAMILY_OFFICE_WORTH.toLocaleString("de-DE")} € Vermögen.`);
      if (state.cash < FAMILY_OFFICE_COST) throw new GameRuleError("Für Gründung, Notar und Anwälte fehlt dir das Geld.");
      spendDays(state, "foundFamilyOffice", "Gründung Family Office");
      state.cash -= FAMILY_OFFICE_COST;
      state.familyOffice = state.month;
      mail(state, {
        kind: "system",
        from: "Boardroom",
        subject: "Dein Family Office ist gegründet",
        body: "Ab jetzt arbeitest du nicht mehr allein. Operating Partner betreuen deine Firmen, sparen dir Tage und entscheiden Routine für dich. Und mit genug Erfolgen kannst du einen eigenen Fonds auflegen.",
      });
      return { state, result: { kind: "none" } };
    }
    case "hire": {
      if (!state.familyOffice) throw new GameRuleError("Ein Team stellst du im Family Office ein.");
      if (action.role !== "operating" || !action.profile) throw new GameRuleError("Associates und Partnerin gibt es nicht mehr: Stelle einen Operating Partner ein.");
      hireOp(ctxOf(state), action.profile);
      return { state, result: { kind: "none" } };
    }
    case "fire": {
      fireOp(ctxOf(state), action.memberId);
      return { state, result: { kind: "none" } };
    }
    case "assign": {
      assignOp(ctxOf(state), action.memberId, action.startupId, action.from);
      return { state, result: { kind: "none" } };
    }
    case "holdco": {
      foundHoldco(ctxOf(state));
      return { state, result: { kind: "none" } };
    }
    case "raiseFund": {
      const why = fundBlocker(state);
      if (why) throw new GameRuleError(why);
      spendDays(state, "raiseFund", "Roadshow bei Investoren");
      const size = fundSize(state);
      state.fund = { name: "Dein Fonds I", size, cash: size, invested: 0, returned: 0, raised: state.month };
      unlockLesson(state, "fonds");
      mail(state, {
        kind: "system",
        from: "Boardroom",
        subject: `Fonds geschlossen: ${size.toLocaleString("de-DE")} €`,
        body: `Investoren vertrauen dir ${size.toLocaleString("de-DE")} € an. Der Fonds legt bei jedem neuen Einstieg das Doppelte deines Tickets dazu. Du bekommst 2 % Verwaltungsgebühr im Jahr und 20 % des Gewinns bei jedem Verkauf.`,
      });
      return { state, result: { kind: "none" } };
    }
    case "joinCorporate": {
      if (state.corporateSeat !== "offered") throw new GameRuleError("Dieses Mandat liegt nicht vor.");
      if (!action.accept) {
        state.corporateSeat = "declined";
        state.corporateDeclined = state.month;
        return { state, result: { kind: "none" } };
      }
      spendDays(state, "joinCorporate", "Antrittsbesuch Nordhafen AG");
      state.corporateSeat = "joined";
      state.startups.push(corporateStartup(state.month));
      unlockLesson(state, "aufsichtsrat");
      mail(state, {
        kind: "founder",
        from: "Dr. Klaus Reinhardt, Nordhafen AG",
        subject: "Willkommen im Aufsichtsrat",
        body: `Der Aufsichtsrat tagt einmal im Quartal. Sie bekommen ${CORPORATE_FEE.toLocaleString("de-DE")} € im Monat und keine Anteile. Wir erwarten einen kritischen Blick, auch auf mich.`,
        startupId: CORPORATE_ID,
      });
      return { state, result: { kind: "none" } };
    }
  }
}

/** The board of this company already met this month: further agenda items cost no extra day. */
export function sittingToday(state: GameState, s: Startup): boolean {
  return state.calendar.some((c) => c.kind === "meeting" && c.label === `Beirat ${s.name}`);
}

/** Why the player cannot lead with a syndicate yet, or null. */
export function syndicateBlocker(state: GameState): string | null {
  if (state.reputation < SYNDICATE_REPUTATION) return `Ein Syndikat anführen kannst du ab ${SYNDICATE_REPUTATION} Ruf.`;
  const club = state.contacts.find((c) => c.id === "angels");
  if (!club?.met || club.warmth < SYNDICATE_WARMTH) return `Dafür brauchst du einen warmen Draht zum Angel-Club (ab ${SYNDICATE_WARMTH} Wärme).`;
  return null;
}

/** Monthly payment of a loan paid back in equal instalments. */
export function annuity(amount: number, rate: number, months: number): number {
  const r = rate / 12;
  return Math.round((amount * r) / (1 - Math.pow(1 + r, -months)));
}

export function fundSize(state: GameState): number {
  const exits = state.exits.filter((e) => e.status === "accepted").length;
  return Math.min(FUND_MAX, FUND_BASE + exits * FUND_PER_EXIT + Math.max(0, state.reputation - FUND_REPUTATION) * 100_000);
}

/** Why the player cannot raise a fund yet, or null. */
export function fundBlocker(state: GameState): string | null {
  if (state.fund) return "Dein Fonds ist schon geschlossen.";
  if (!state.familyOffice) return "Einen Fonds legst du aus dem Family Office auf.";
  if (state.reputation < FUND_REPUTATION) return `Investoren geben Geld ab ${FUND_REPUTATION} Ruf.`;
  if (state.exits.filter((e) => e.status === "accepted").length < FUND_EXITS) return `Investoren wollen mindestens ${FUND_EXITS} erfolgreiche Verkäufe sehen.`;
  if (state.month - state.familyOffice < FUND_OFFICE_MONTHS) return `Dein Family Office muss sich erst ${FUND_OFFICE_MONTHS} Monate bewähren.`;
  return null;
}

/**
 * The player's fund invests alongside: twice the player's ticket, at the same
 * price. In a buyout it buys from the seller, otherwise new shares.
 */
function fundCoInvest(state: GameState, s: Startup, ticket: number, pct: number, secondary: boolean): Startup {
  const f = state.fund;
  if (!f || pct <= 0) return s;
  const amount = Math.min(f.cash, f.size * FUND_MAX_DEAL, Math.round((ticket * FUND_MATCH) / 1000) * 1000);
  if (amount < 10_000) return s;
  let fundPct = (amount / ticket) * pct;
  let next: Startup;
  if (secondary) {
    const seller = s.capTable.find((h) => h.kind === "founder");
    if (!seller) return s;
    fundPct = Math.min(fundPct, seller.pct - 2);
    if (fundPct <= 0.5) return s;
    const capTable = s.capTable.map((h) => (h.id === seller.id ? { ...h, pct: h.pct - fundPct } : h));
    capTable.push({ id: "fonds", name: f.name, kind: "fund", pct: fundPct, pref: 0, cost: 0 });
    next = { ...s, capTable };
  } else {
    const d = fundPct / (100 + fundPct);
    next = applyDelta(s, { cash: amount, dilution: d, dilutionTo: { id: "fonds", name: f.name, kind: "fund" } });
  }
  const used = Math.round((fundPct / pct) * ticket);
  const holder = next.capTable.find((h) => h.id === "fonds")!;
  holder.pref = (holder.pref ?? 0) + (secondary ? 0 : used);
  holder.cost = (holder.cost ?? 0) + used;
  f.cash -= used;
  f.invested += used;
  mail(state, {
    kind: "system",
    from: f.name,
    subject: `${f.name} steigt bei ${s.name} mit ein`,
    body: `Der Fonds investiert ${used.toLocaleString("de-DE")} € und hält ${fundPct.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %. Er stimmt wie du; am Gewinn bist du mit 20 % Carry beteiligt.`,
    startupId: s.id,
  });
  return next;
}

/** Loans tied to a company are paid back when it is sold. */
function repayLoans(state: GameState, startupId: string, notes: string[]): void {
  for (const loan of state.loans.filter((l) => l.startupId === startupId)) {
    state.cash -= loan.balance;
    notes.push(`${loan.label}: Restschuld von ${Math.round(loan.balance).toLocaleString("de-DE")} € aus dem Erlös getilgt.`);
  }
  state.loans = state.loans.filter((l) => l.startupId !== startupId);
}

/** The buyer either adds to the price or walks away. */
function negotiate(state: GameState, offer: ExitOffer, s: Startup): void {
  const random = randomFor(state.seed, `negotiate|${offer.id}`);
  const chance = Math.min(0.85, NEGOTIATE_CHANCE + (state.reputation - 50) / 200 + (s.stake > 25 ? 0.1 : 0));
  if (random() < chance) {
    offer.price = Math.round((offer.price * (1 + NEGOTIATE_GAIN)) / 10_000) * 10_000;
    mail(state, {
      kind: "exit",
      from: offer.buyer,
      subject: `${s.name}: ${offer.buyer} legt nach`,
      body: `Neues Angebot: ${offer.price.toLocaleString("de-DE")} €. Mehr gibt es nicht. Jetzt muss die Gesellschafterversammlung entscheiden.`,
      startupId: s.id,
      exitId: offer.id,
    });
  } else {
    offer.status = "withdrawn";
    replaceStartup(state, applyDelta(s, { trust: -4 }));
    mail(state, {
      kind: "exit",
      from: offer.buyer,
      subject: `${s.name}: ${offer.buyer} steigt aus`,
      body: "Der Käufer hat das Interesse verloren. Die Gründung ist enttäuscht, das Geld war zum Greifen nah.",
      startupId: s.id,
      exitId: offer.id,
    });
  }
}

/** The shareholders vote on a sale; if it passes, the money flows through the waterfall. */
function settleExit(state: GameState, offer: ExitOffer, vote: GvVote | "abstain", notes: string[]): void {
  const s = startupOf(state, offer.startupId);
  const result = exitVote(offer, s, vote);
  offer.ballots = result.ballots;
  offer.payouts = result.payouts;
  offer.carry = result.carry;
  unlockLesson(state, "liquidationspraeferenz");
  if (!result.approved) {
    offer.status = "rejected";
    const text = `${s.name}: Die Gesellschafterversammlung lehnt den Verkauf an ${offer.buyer} ab.`;
    notes.push(text);
    mail(state, { kind: "exit", from: s.name, subject: "Verkauf abgelehnt", body: text, startupId: s.id, exitId: offer.id });
    return;
  }
  offer.status = "accepted";
  // Drag-along under the holding: every co-owner sells along.
  if (dragAlong(state, s)) for (const b of offer.ballots) if (b.kind !== "you" && b.kind !== "fund") Object.assign(b, { vote: "go", reason: "Mitverkaufspflicht: verkauft mit." });
  const own = result.payouts.find((p) => p.id === "you")?.amount ?? 0;
  const gross = own + result.carry;
  recordSale(state, offer, s, gross);
  // Operating partners get their carry out of your proceeds.
  const team = teamCarry(state, s, gross);
  if (team.lines.length > 0) offer.teamCarry = team.lines;
  const mine = gross - team.amount;
  // The fund keeps its proceeds minus the player's carry on its gain.
  const fundCost = (id: string) => s.capTable.find((h) => h.id === id)?.cost ?? 0;
  const fundMoney = result.payouts.filter((p) => p.kind === "fund").reduce((sum, p) => sum + p.amount - Math.max(0, p.amount - fundCost(p.id)) * CARRY, 0);
  if (state.fund && fundMoney > 0) {
    state.fund.cash += fundMoney;
    state.fund.returned += fundMoney;
  }
  if (offer.ipo) {
    // Listed shares: half now, the rest after the lockup at the market's price.
    const later = own * (1 - IPO_CASH_SHARE);
    state.cash += mine - later;
    state.lockups.push({ id: nextId(state, "l"), name: s.name, amount: later, index: state.market.prices.tech, due: state.month + IPO_LOCKUP });
    unlockLesson(state, "ipo");
  } else state.cash += mine;
  repayLoans(state, s.id, notes);
  state.reputation = Math.min(100, state.reputation + reputationGain(state, 6));
  if (result.carry > 0) unlockLesson(state, "carry");
  replaceStartup(state, { ...s, status: "exited", exitValue: offer.price, flags: [...s.flags.filter((f) => f !== "round_open"), "offered_exit"] });
  state.items = state.items.filter((i) => !(i.startupId === s.id && i.status === "open"));
  const text = offer.ipo
    ? `${s.name} geht an die Börse, bewertet mit ${offer.price.toLocaleString("de-DE")} €. Du erhältst ${Math.round(mine).toLocaleString("de-DE")} €; die Hälfte deiner Aktien ist ${IPO_LOCKUP} Monate gesperrt und folgt bis dahin dem Markt.`
    : `${s.name} ist an ${offer.buyer} verkauft, für ${offer.price.toLocaleString("de-DE")} €. Du erhältst ${Math.round(mine).toLocaleString("de-DE")} €${result.carry > 0 ? `, davon ${Math.round(result.carry).toLocaleString("de-DE")} € Carry` : ""}.`;
  const teamText = team.lines.length > 0 ? ` Carry für dein Team: ${team.lines.map((l) => `${l.name} ${Math.round(l.amount).toLocaleString("de-DE")} €`).join(", ")}.` : "";
  notes.push(text + teamText);
  mail(state, { kind: "exit", from: s.name, subject: offer.ipo ? "Börsengang geglückt" : `Verkauft an ${offer.buyer}`, body: text + teamText, startupId: s.id, exitId: offer.id });
}

/** A contact helps a company. Career level and a generous trust account make the help stronger. */
function introduce(state: GameState, s: Startup, contactId: string, strength = 1, name = contactDef(contactId).name): void {
  const def = contactDef(contactId);
  const result = def.result.replace("{name}", name);
  switch (def.kind) {
    case "delta":
    case "loan": {
      // A second favour for the same company helps less: the easy wins are taken.
      const times = s.helped?.[contactId] ?? 0;
      const factor = (def.kind === "delta" ? Math.pow(INTRO_REPEAT, times) : 1) * strength;
      const extra = def.kind === "loan" ? ` Betrag: ${Math.round(((def.delta?.cash ?? 0) * strength) / 1000).toLocaleString("de-DE")}.000 €.` : "";
      const text = times > 0 && def.kind === "delta" ? `${result} Beim ${times + 1}. Mal für dieselbe Firma wirkt es schwächer.` : `${result}${extra}`;
      // In a family business the same help works on its scale (EBITDA, not a startup's few thousand euros).
      const base = (s.metrics.valuedOn === "ebitda" ? familyIntroDelta(contactId, s) : null) ?? def.delta ?? {};
      state.effects.push({ delay: 1, text, delta: scaleDelta(base, factor), startupId: s.id, due: state.month + 1, itemId: `intro-${contactId}-${state.month}` });
      replaceStartup(state, { ...s, helped: { ...s.helped, [contactId]: times + 1 } });
      break;
    }
    case "investor":
      replaceStartup(state, { ...s, flags: s.flags.includes("investor_intro") ? s.flags : [...s.flags, "investor_intro"] });
      mail(state, { kind: "network", from: name, subject: `${s.name}: gern beim nächsten Mal`, body: result, startupId: s.id });
      break;
    case "shares": {
      const options = sellers({ ...s, metrics: { ...s.metrics, trust: 0 } });
      const pick = options[0];
      if (pick) createShareOffer(state, s, pick.holder.id, pick.pct, SECONDARY_DISCOUNT);
      else mail(state, { kind: "network", from: name, subject: "Gerade niemand", body: "Bei dieser Firma will gerade niemand verkaufen.", startupId: s.id });
      break;
    }
    case "deal": {
      const fresh = STARTUPS.find((d) => !state.startups.some((x) => x.id === d.id));
      if (fresh) offer(state, fresh.id);
      else {
        const random = randomFor(state.seed, `intro-deal|${state.month}|${state.counter}`);
        newDeal(state, random, dealStage(state, random), new Set(state.startups.map((x) => x.name)));
      }
      break;
    }
  }
}

/** A delta with every number scaled; flags and exits stay as they are. */
function scaleDelta(d: Delta, factor: number): Delta {
  if (factor === 1) return d;
  const out: Delta = { ...d };
  for (const key of ["cash", "revenuePct", "growth", "grossMargin", "opex", "team", "morale", "trust", "topCustomer", "debt", "playerCash", "reputation"] as const) {
    if (d[key] !== undefined) out[key] = d[key]! * factor;
  }
  if (d.axes) out.axes = Object.fromEntries(Object.entries(d.axes).map(([k, v]) => [k, (v ?? 0) * factor]));
  return out;
}

function createShareOffer(state: GameState, s: Startup, sellerId: string, pct: number, factor: number): void {
  const seller = s.capTable.find((h) => h.id === sellerId);
  if (!seller) return;
  const share = Math.round(Math.min(pct, seller.pct) * 10) / 10;
  if (share < 0.5) return;
  const price = Math.round((((valuation(s.metrics) * share) / 100) * factor) / 1000) * 1000;
  const id = nextId(state, "a");
  state.shareOffers.push({ id, startupId: s.id, sellerId, sellerName: seller.name, pct: share, price, expires: state.month + 1, status: "open" });
  mail(state, {
    kind: "shares",
    from: seller.name,
    subject: `${s.name}: ${share.toLocaleString("de-DE")} % zu verkaufen`,
    body: `${seller.name} bietet dir ${share.toLocaleString("de-DE")} % an ${s.name} für ${price.toLocaleString("de-DE")} € an. ${factor > 1 ? "Gründer verkaufen nur mit Aufschlag." : factor < 1 ? "Mit Abschlag auf die heutige Bewertung, weil Geld gebraucht wird." : "Zur heutigen Bewertung."} Das Angebot gilt bis Ende nächsten Monats.`,
    startupId: s.id,
    offerId: id,
  });
}

function checkMajority(state: GameState, s: Startup, before: number): void {
  if (before <= 50 && s.stake > 50) {
    state.reputation = Math.min(100, state.reputation + reputationGain(state, MAJORITY_REPUTATION_GAIN));
    unlockLesson(state, "stimmrechte");
    mail(state, {
      kind: "system",
      from: "Boardroom",
      subject: `Mehrheit an ${s.name}`,
      body: `Du hältst jetzt ${s.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % an ${s.name}. In der Gesellschafterversammlung entscheidest du ab sofort die meisten Fragen allein.`,
      startupId: s.id,
    });
  }
}

const FUNDING_TEMPLATES = ["bridge", "seed_round"];

/** Closes a round: the shareholders vote, money and shares move if it passes. */
function settleRound(state: GameState, round: Round, take: RoundTake, vote: GvVote | "abstain", notes: string[]): void {
  let s = startupOf(state, round.startupId);
  const { ballots, approved } = shareholderVote(round, s, vote);
  round.ballots = ballots;
  round.take = take;
  round.stakeBefore = s.stake;
  unlockLesson(state, "pre_post_money");
  if (round.down) unlockLesson(state, "down_round");
  if (take === "prorata" || take === "half") unlockLesson(state, "pro_rata");
  if (!approved) {
    round.status = "failed";
    round.playerAmount = 0;
    round.stakeAfter = s.stake;
    s = { ...s, flags: s.flags.filter((f) => f !== "round_open") };
    if (vote === "no") s = applyDelta(s, { trust: -6 });
    replaceStartup(state, s);
    const text = `${s.name}: Die Gesellschafterversammlung lehnt die ${round.label} ab. Kein neues Geld.`;
    notes.push(text);
    mail(state, { kind: "round", from: s.name, subject: `${round.label} abgelehnt`, body: text, startupId: s.id, roundId: round.id });
    return;
  }
  const invested = playerAmount(round, s.stake, take);
  const syndicate = take === "syndicate" ? syndicateAmount(round, s.stake) : 0;
  state.cash -= invested;
  // New money makes bridge loans and seed offers on the agenda obsolete.
  const obsolete = state.items.filter((i) => i.startupId === s.id && i.status === "open" && FUNDING_TEMPLATES.includes(i.templateId));
  if (obsolete.length > 0) {
    state.items = state.items.filter((i) => !obsolete.includes(i));
    notes.push(`${s.name}: Die Vorlage zur Finanzierung ist mit der Runde erledigt.`);
  }
  const before = s.stake;
  s = applyRound(s, round, invested, syndicate);
  if (vote === "go") s = applyDelta(s, { trust: 3 });
  replaceStartup(state, s);
  round.status = "closed";
  round.playerAmount = invested;
  round.stakeAfter = s.stake;
  if (take === "lead" || take === "syndicate") {
    state.ledRounds += 1;
    state.reputation = Math.min(100, state.reputation + reputationGain(state, LEAD_REPUTATION_GAIN));
  }
  if (take === "syndicate") {
    const club = state.contacts.find((c) => c.id === "angels");
    if (club) club.warmth = Math.max(0, club.warmth - SYNDICATE_WARMTH_COST);
    notes.push(`${s.name}: Dein Syndikat bringt ${syndicate.toLocaleString("de-DE")} € mit. An seinem Gewinn bist du mit Carry beteiligt.`);
  }
  const text = `${s.name}: ${round.label} über ${round.amount.toLocaleString("de-DE")} € abgeschlossen. Dein Anteil: ${before.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % → ${s.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %.`;
  notes.push(text);
  mail(state, { kind: "round", from: s.name, subject: `${round.label} abgeschlossen`, body: text, startupId: s.id, roundId: round.id });
  checkMajority(state, s, before);
}

function replaceStartup(state: GameState, next: Startup): void {
  const index = state.startups.findIndex((s) => s.id === next.id);
  state.startups[index] = next;
}

function unlockLesson(state: GameState, id: string): void {
  if (!state.lessons.includes(id)) state.lessons.push(id);
}

/** Applies a delta that may touch the player too (cash, reputation, exit). */
function applyFull(state: GameState, s: Startup, input: Delta, texts: string[], text?: string): Startup {
  const delta = input.dilutionTo ? { ...input, dilutionTo: { ...input.dilutionTo, name: fill(input.dilutionTo.name, s) } } : input;
  if (text) texts.push(fill(text, s));
  state.cash += delta.playerCash ?? 0;
  state.reputation = Math.min(100, Math.max(0, state.reputation + reputationGain(state, delta.reputation ?? 0)));
  if (delta.exit !== undefined && s.status === "active") {
    const split = waterfall(s, delta.exit);
    const gross = (split.payouts.find((p) => p.id === "you")?.amount ?? 0) + split.carry;
    const payout = gross - teamCarry(state, s, gross).amount;
    state.cash += payout;
    unlockLesson(state, "liquidationspraeferenz");
    state.reputation = Math.min(100, state.reputation + reputationGain(state, 6));
    texts.push(`Verkauf abgeschlossen. Dein Anteil bringt dir ${Math.round(payout).toLocaleString("de-DE")} €.`);
    return { ...applyDelta(s, delta), status: "exited", exitValue: delta.exit };
  }
  return applyDelta(s, delta);
}

function decide(
  state: GameState,
  item: BoardItem,
  outcome: Vote,
  vote: Vote,
  argument: string | null,
  ceoStance: number,
  shares: Shares,
  covenant?: CovenantId,
  delegated = false,
  planned?: CovenantOutlook,
): void {
  const t = templateOf(item.templateId);
  let s = startupOf(state, item.startupId);
  const setup = covenantsOf(state, item);
  const co = planned ?? covenantOutlook(t, s, setup);
  // Judged against every option on the table: yes, no and the three conditions.
  const options = optionValues(co);
  const choice = vote === "conditions" ? (covenant ?? "standard") : vote;
  const judged = choice === "standard" ? { ...options, standard: co.standard.value } : options;
  const judgment = judge(judged, choice, co.floor);
  const weight = judgmentWeight(judged, co.floor);
  const bestOption = bestOf(options);
  const best: Vote = bestOption === "go" || bestOption === "no" ? bestOption : "conditions";
  const values: Record<Vote, number> = { go: co.go.value, conditions: vote === "conditions" ? judged[choice]! : co.standard.value, no: co.no.value };
  const ceoVote = voteFromStance(ceoStance);
  const trustDelta = outcome === ceoVote ? 2 : outcome === "no" ? OVERRULED_TRUST.no : OVERRULED_TRUST.conditions;
  const reputationDelta = reputationGain(state, Math.round(JUDGMENT_REPUTATION[judgment] * weight));
  state.reputation = Math.min(100, Math.max(0, state.reputation + reputationDelta));
  s = applyDelta(s, { trust: trustDelta });
  const applied: CovenantId | "standard" | undefined = outcome === "conditions" ? (vote === "conditions" && covenant ? covenant : "standard") : undefined;
  // The management wanted a plain yes and the player asked for conditions: it loses some drive.
  if (applied && vote === "conditions" && ceoVote === "go") s = applyDelta(s, { morale: CONDITIONS_TEMPO.morale });
  replaceStartup(state, s);
  item.status = "decided";
  const covenantValues: Partial<Record<CovenantId | "standard", number>> = { standard: co.standard.value };
  for (const p of co.plans) covenantValues[p.id] = p.outlook.value;
  item.decision = {
    argument,
    vote,
    outcome,
    shares,
    judgment,
    best,
    values,
    reputationDelta,
    trustDelta,
    month: state.month,
    ...(covenant && vote === "conditions" ? { covenant } : {}),
    ...(applied ? { applied } : {}),
    fit: setup.fit,
    covenantValues,
    bestOption,
    weight: Math.round(weight * 100) / 100,
  };
  // A chosen condition needs one follow-up meeting to work in full; the board's standard condition runs by itself.
  if (applied && applied !== "standard") item.followUp = { until: state.month + FOLLOW_UP_MONTHS, done: delegated };
  unlockLesson(state, t.lesson);
  if (covenant && vote === "conditions") unlockLesson(state, COVENANTS[covenant].lesson);
  const plan = applied && applied !== "standard" ? co.plans.find((p) => p.id === applied)?.resolved : undefined;
  scheduleOutcome(state, item, outcome, plan);
}

/**
 * The one place where gains of reputation are weighed: the higher the
 * reputation, the smaller the share that counts (REPUTATION_GAIN_STEPS).
 * Fractions are carried over in `reputationRest`, so the result must be applied.
 * A known name still opens doors; it just doesn't keep growing by itself.
 */
export function reputationGain(state: GameState, delta: number): number {
  if (delta <= 0) return delta;
  const step = [...REPUTATION_GAIN_STEPS].reverse().find((s) => state.reputation >= s.from) ?? REPUTATION_GAIN_STEPS[0];
  const raw = delta * step.factor + (state.reputationRest ?? 0);
  let whole = Math.floor(raw + 1e-9);
  state.reputationRest = Math.round((raw - whole) * 1000) / 1000;
  const month = state.reputationMonth?.month === state.month ? state.reputationMonth : { month: state.month, gained: 0 };
  if (whole > step.cap - month.gained) {
    whole = Math.max(0, step.cap - month.gained);
    state.reputationRest = 0;
  }
  month.gained += whole;
  state.reputationMonth = month;
  return whole;
}

function mapValues(o: ReturnType<typeof outlook>): Record<Vote, number> {
  return { go: o.go.value, conditions: o.conditions.value, no: o.no.value };
}

/** Immediate effects now, the rest into the queue. Conditions start later; a chosen condition brings its own plan. */
function scheduleOutcome(state: GameState, item: BoardItem, outcome: Vote, plan?: ResolvedOutcome): void {
  const t = templateOf(item.templateId);
  let s = startupOf(state, item.startupId);
  const resolved = plan ?? resolveVote(t, outcome, s);
  const texts: string[] = [];
  for (const effect of resolved.effects) {
    if (effect.delay === 0) s = applyFull(state, s, effect.delta, texts);
    else state.effects.push({ ...effect, startupId: s.id, due: state.month + effect.delay, itemId: item.id });
  }
  if (resolved.risk) {
    const r = resolved.risk;
    state.effects.push({
      delay: r.delay,
      text: "",
      delta: {},
      startupId: s.id,
      due: state.month + Math.max(0, r.delay),
      itemId: item.id,
      risk: { chance: r.chance, good: r.good, bad: r.bad, goodText: r.goodText, badText: r.badText },
    });
  }
  replaceStartup(state, s);
}

// ---------------------------------------------------------------------------
// Month close
// ---------------------------------------------------------------------------

function lapseItems(state: GameState, notes: string[]): void {
  for (const item of openItems(state)) {
    const t = templateOf(item.templateId);
    let s = startupOf(state, item.startupId);
    if (s.status !== "active") {
      item.status = "lapsed";
      continue;
    }
    // A board that did not get to an item puts it on next month's agenda, once.
    if (!t.urgent && !item.postponed) {
      item.postponed = true;
      notes.push(`${s.name}: „${fill(t.title, s)}“ ist vertagt und steht im nächsten Monat wieder auf der Tagesordnung.`);
      continue;
    }
    const stances = baseStances(t, s, meetingRandom(state, item));
    const outcome = voteFromStance(stances.ceo);
    const values = mapValues(outlook(t, s));
    s = applyDelta(s, { trust: LAPSED_TRUST });
    replaceStartup(state, s);
    state.reputation = Math.max(0, state.reputation + LAPSED_REPUTATION);
    item.status = "lapsed";
    item.decision = {
      argument: null,
      vote: outcome,
      outcome,
      shares: { go: 0, conditions: 0, no: 0, abstain: 0 },
      judgment: "weak",
      best: bestVote(values),
      values,
      reputationDelta: LAPSED_REPUTATION,
      trustDelta: LAPSED_TRUST,
      month: state.month,
      lapsed: true,
    };
    notes.push(`${s.name}: Der Beirat hat nicht getagt. Die Gründung hat allein entschieden: ${fill(t.outcomes[outcome].label, s)}.`);
    scheduleOutcome(state, item, outcome);
  }
}

const eurText = (v: number) => `${(Math.round(v / 1000) * 1000).toLocaleString("de-DE")} €`;

/** Conditions nobody followed up in time: partly lost, and the management takes them less seriously. */
function missFollowUps(state: GameState, month: number, notes: string[]): void {
  for (const item of state.items) {
    const f = item.followUp;
    if (!f || f.done || f.missed || f.until > month) continue;
    f.missed = true;
    const s = state.startups.find((x) => x.id === item.startupId);
    if (!s || s.status !== "active") continue;
    replaceStartup(state, applyDelta(s, { trust: FOLLOW_UP_MISSED.trust }));
    const applied = item.decision?.applied;
    const name = applied && applied !== "standard" ? `„${COVENANTS[applied].name}“` : "des Gremiums";
    notes.push(`${s.name}: Niemand hat die Auflage ${name} nachgeprüft. Sie wirkt nur zum Teil, und die Geschäftsführung nimmt Auflagen weniger ernst.`);
  }
}

function resolveEffects(state: GameState, month: number, lines: Map<string, string[]>): void {
  const due = state.effects.filter((e) => e.due <= month);
  state.effects = state.effects.filter((e) => e.due > month);
  for (const effect of due) {
    let s = startupOf(state, effect.startupId);
    if (s.status !== "active") continue;
    const texts = lines.get(s.id) ?? [];
    if (effect.risk) {
      const rand = randomFor(state.seed, `risk|${effect.itemId}`);
      const chance = Math.min(0.95, effect.risk.chance * (0.85 + (0.3 * s.metrics.trust) / 100));
      const good = rand() < chance;
      const delta = good ? effect.risk.good : effect.risk.bad;
      const text = good ? effect.risk.goodText : effect.risk.badText;
      s = applyFull(state, s, delta, texts, text);
      const item = state.items.find((i) => i.id === effect.itemId);
      if (item) {
        item.result = { good, text: fill(text, s), month };
        if (item.decision && !item.decision.lapsed && item.decision.vote === item.decision.outcome) {
          state.reputation = Math.min(100, Math.max(0, state.reputation + reputationGain(state, good ? RESULT_REPUTATION.good : RESULT_REPUTATION.bad)));
        }
      }
    } else if (effect.review && state.items.find((i) => i.id === effect.itemId)?.followUp?.done === false) {
      // Nobody checked: the condition only works in part.
      const part = blendDelta(effect.delta, {}, 1 - FOLLOW_UP_MISSED.share);
      s = applyFull(state, s, part, texts, `Ohne Nachprüfung verpufft die Auflage zum Teil: Statt ${eurText(effect.delta.cash ?? 0)} bleiben rund ${eurText(part.cash ?? 0)}.`);
    } else {
      s = applyFull(state, s, effect.delta, texts, effect.text);
    }
    replaceStartup(state, s);
    lines.set(s.id, texts);
  }
}

/** Templates that may come up for this company now, ignoring chance. */
function candidatesFor(state: GameState, s: Startup) {
  const age = state.month - s.joined;
  const used = state.items.filter((i) => i.startupId === s.id);
  const family = s.metrics.valuedOn === "ebitda";
  return TEMPLATES.filter((t) => {
    if (!!t.corporate !== !!s.corporate) return false;
    // A family business gets the generic and the Mittelstand topics, not rounds, options or pivots.
    if (family && STARTUP_ONLY_TEMPLATES.has(t.id)) return false;
    if (s.lbo && LBO_EXCLUDED_TEMPLATES.has(t.id)) return false;
    if (!t.when(s, age)) return false;
    const last = used.filter((i) => i.templateId === t.id).sort((a, b) => b.month - a.month)[0];
    if (!last) return true;
    return t.repeatAfter !== undefined && state.month - last.month >= t.repeatAfter;
  });
}

function hasUrgent(state: GameState, s: Startup): boolean {
  if (s.corporate) return false;
  return candidatesFor(state, s).some((t) => t.urgent);
}

function pickTemplate(state: GameState, s: Startup, random: () => number): string | null {
  const age = state.month - s.joined;
  // The supervisory board meets once a quarter.
  if (s.corporate && age % 3 !== 1) return null;
  const candidates = candidatesFor(state, s);
  const urgent = candidates.filter((t) => t.urgent);
  if (urgent.length > 0) return urgent[0]!.id;
  if (candidates.length === 0) return null;
  // Two items of one meeting should not be the same.
  const taken = new Set(
    openItems(state)
      .filter((i) => i.startupId === s.id)
      .map((i) => i.templateId),
  );
  const fresh = candidates.filter((t) => !taken.has(t.id));
  if (fresh.length === 0) return null;
  return fresh[Math.floor(random() * fresh.length) % fresh.length]!.id;
}

/**
 * What makes a company busy right now, if anything. Money trouble, a round or
 * a buyer always do; news and unrest only sometimes.
 */
function busyReason(state: GameState, s: Startup, random: () => number): { text: string; hard: boolean } | null {
  if (s.crisisMonths > 0 || s.metrics.cash < 0) return { text: "Die Kasse ist knapp.", hard: true };
  if (runwayMonths(s.metrics) < 2) return { text: "Das Geld reicht nur noch wenige Monate.", hard: true };
  if (state.rounds.some((r) => r.startupId === s.id && r.status === "open")) return { text: "Eine Finanzierungsrunde läuft.", hard: true };
  if (state.exits.some((e) => e.startupId === s.id && (e.status === "open" || e.status === "negotiating"))) return { text: "Ein Käufer klopft an.", hard: true };
  const soft = random() < 0.12;
  if (soft && state.news.some((n) => n.month === state.month - 1 && n.startupIds.includes(s.id))) return { text: "Die Nachrichten bewegen die Firma.", hard: false };
  if (soft && s.metrics.morale < 35) return { text: "Im Team rumort es.", hard: false };
  if (soft && s.metrics.trust < 30) return { text: "Das Vertrauen im Beirat bröckelt.", hard: false };
  return null;
}

/**
 * Companies have calm and busy stretches. A phase lasts a few months; a
 * crisis, a round, a buyer or a news story makes a company busy at once.
 */
export function updatePace(state: GameState, s: Startup): Pace {
  const random = randomFor(state.seed, `pace|${s.id}|${state.month}`);
  const length = (kind: PaceKind) => {
    const [lo, hi] = PACE_MONTHS[kind];
    return lo + Math.floor(random() * (hi - lo + 1));
  };
  const reason = busyReason(state, s, random);
  let pace: Pace = s.pace ?? { kind: "normal", until: state.month + length("normal") };
  if (reason && pace.kind !== "busy") {
    pace = { kind: "busy", until: state.month + length("busy"), reason: reason.text };
  } else if (state.month >= pace.until) {
    let next: PaceKind;
    if (reason?.hard) next = random() < 0.5 ? "busy" : "normal";
    else {
      // A healthy company calms down more often than a shaky one.
      const stable = runwayMonths(s.metrics) > 6 && s.metrics.morale >= 45;
      const [calm, normal] = PACE_NEXT[pace.kind];
      const calmChance = calm * (stable ? 1.3 : 0.8);
      const roll = random();
      next = roll < calmChance ? "calm" : roll < calmChance + normal ? "normal" : "busy";
    }
    pace = { kind: next, until: state.month + length(next), ...(next === "busy" ? { reason: reason?.text ?? "Viele Themen kommen auf einmal." } : {}) };
  } else if (pace.kind === "busy" && reason) {
    pace = { ...pace, reason: reason.text };
  }
  return pace;
}

/**
 * Puts new items on the agenda of each mandate, following the company's
 * rhythm: calm phases bring little or nothing, normal ones an item every month
 * or two and a fuller quarterly meeting, busy ones two or three. Urgent items
 * always come. At most three are open.
 */
export function planAgenda(state: GameState): void {
  for (const active of state.startups.filter((x) => x.status === "active")) {
    const age = state.month - active.joined;
    if (age < 1) continue;
    let s = active;
    if (!s.corporate) {
      s = { ...s, pace: updatePace(state, s) };
      replaceStartup(state, s);
    }
    const open = openItems(state).filter((i) => i.startupId === s.id).length;
    if (open >= AGENDA_MAX) continue;
    const random = randomFor(state.seed, `agenda|${s.id}|${state.month}`);
    const quarterly = s.corporate ? age % 3 === 1 : state.month % 3 === 0;
    const pace = s.pace?.kind ?? "normal";
    let wanted: number;
    if (s.corporate) wanted = quarterly ? 2 + (random() < AGENDA_THIRD ? 1 : 0) : 0;
    else if (pace === "busy") wanted = Math.max(0, 2 + (random() < PACE_BUSY_THIRD ? 1 : 0) - open);
    else if (pace === "calm") wanted = quarterly && open === 0 && random() < PACE_CALM_QUARTER ? 1 : 0;
    else if (quarterly) wanted = 2 + (random() < AGENDA_THIRD ? 1 : 0);
    // The first month of a new mandate always brings something to decide.
    else wanted = open === 0 && (age === 1 || random() < PACE_NORMAL_BETWEEN) ? 1 : 0;
    const added: BoardItem[] = [];
    const slots = Math.min(Math.max(wanted, hasUrgent(state, s) ? 1 : 0), AGENDA_MAX - open);
    for (let k = 0; k < slots; k++) {
      const templateId = pickTemplate(state, s, random);
      if (!templateId) break;
      const item: BoardItem = { id: nextId(state, "v"), startupId: s.id, templateId, month: state.month, status: "open", asked: [], pretalks: [], cfo: false };
      item.covenants = covenantSetup(templateOf(templateId), s, randomFor(state.seed, `covenant|${item.id}`));
      state.items.push(item);
      added.push(item);
    }
    if (added.length === 0) continue;
    const ceo = s.board.find((b) => b.seat === "ceo");
    const agenda = openItems(state).filter((i) => i.startupId === s.id);
    const first = templateOf(added[0]!.templateId);
    mail(state, {
      kind: "founder",
      from: ceo ? `${ceo.name}, ${s.name}` : s.name,
      subject: agenda.length > 1 ? `Tagesordnung für den ${s.corporate ? "Aufsichtsrat" : "Beirat"}: ${agenda.length} Punkte` : `Vorlage für den Beirat: ${fill(first.title, s)}`,
      body:
        agenda.length > 1
          ? `${s.pace?.kind === "busy" && s.pace.reason ? `Gerade ist viel los. ${s.pace.reason} ` : ""}${agenda.map((i, n) => `TOP ${n + 1}: ${fill(templateOf(i.templateId).title, s)}${i.postponed ? " (vertagt)" : ""}`).join(". ")}. ${fill(first.pitch, s)} Alle Punkte werden in einer Sitzung beraten. Was bis Monatsende nicht entschieden ist, wird einmal vertagt; Dringendes entscheide ich sonst allein.`
          : `${fill(first.pitch, s)} Bitte entscheidet bis Monatsende. Sonst wird der Punkt einmal vertagt${first.urgent ? ", und weil es dringend ist, entscheide ich allein" : ""}.`,
      startupId: s.id,
    });
  }
}

export function closeMonth(state: GameState): MonthReport {
  const month = state.month;
  seedUnlocks(state);
  const notes: string[] = [];
  const cashBefore = state.cash;
  const reputationBefore = state.reputation;
  const worthBefore = netWorth(state);
  const valueBefore = portfolioValue(state);
  const before = new Map(state.startups.map((s) => [s.id, { revenue: s.metrics.revenue, cash: s.metrics.cash, valuation: valuation(s.metrics), metrics: s.metrics }]));
  const payouts = new Map<string, number>();

  // Rounds the player let run: the meeting votes without them.
  for (const round of state.rounds.filter((r) => r.status === "open")) {
    if (startupOf(state, round.startupId).status === "active") settleRound(state, round, "none", "abstain", notes);
    else round.status = "failed";
  }
  // Sale offers the player did not answer: the meeting decides without them.
  for (const offer of state.exits.filter((e) => e.status === "open")) {
    if (startupOf(state, offer.startupId).status === "active") settleExit(state, offer, "abstain", notes);
    else offer.status = "withdrawn";
  }
  heirItems(state, notes);
  delegateItems(state, notes);
  lapseItems(state, notes);
  missFollowUps(state, month, notes);
  const lines = new Map<string, string[]>();
  resolveEffects(state, month + 1, lines);
  const income: IncomeLines = { consulting: 0, boardFees: 0, payouts: 0, living: 0, interest: 0, rent: 0, salaries: 0, fundFee: 0, dividends: 0, loans: 0, lockups: 0 };

  // Consulting booked this month is invoiced now.
  for (const gig of state.gigs.filter((g) => g.status === "booked" && g.month === month)) {
    const log = ensureGigLog(state);
    log.done += 1;
    const city = cityOf(gig).id;
    if (!log.cities.includes(city)) log.cities.push(city);
    state.cash += gig.fee;
    income.consulting += gig.fee;
    if (gig.reputation) state.reputation = Math.min(100, state.reputation + reputationGain(state, gig.reputation));
    if (gig.trip?.reputation) state.reputation = Math.max(0, Math.min(100, state.reputation + reputationGain(state, gig.trip.reputation)));
    if (gig.contactId && gig.warmth) {
      const c = state.contacts.find((x) => x.id === gig.contactId);
      if (c) {
        c.met = true;
        c.warmth = Math.min(100, c.warmth + gig.warmth);
      }
    }
  }

  for (const current of state.startups.filter((x) => x.status === "active")) {
    let s = current;
    // A Konzern feels the business cycle; when money runs short it draws on its credit line (see stepMonth).
    if (s.corporate) s = applyDelta(s, { revenuePct: CYCLE_REVENUE[state.market.regime] });
    const step = stepMonth(s, randomFor(state.seed, `step|${s.id}|${month}`));
    const texts = lines.get(s.id) ?? [];
    texts.push(...step.events);
    lines.set(s.id, texts);
    let next = step.startup;
    if (next.status === "dead") {
      state.reputation = Math.max(0, state.reputation - 3);
      // A bought company: without a holding the bank calls in your personal guarantee.
      const claim = next.lbo ? guaranteeClaim(state, next.lbo.bank, next.lbo.bank) : 0;
      state.cash -= claim;
      notes.push(`${s.name} ist insolvent. Dein Anteil ist verloren.${next.lbo ? guaranteeText(state, claim) : ""}`);
    } else {
      const fee = next.corporate ? CORPORATE_FEE : boardFee(next.metrics);
      state.cash += fee;
      income.boardFees += fee;
    }
    next = {
      ...next,
      history: [...next.history, { month: month + 1, revenue: next.metrics.revenue, cash: next.metrics.cash, valuation: valuation(next.metrics), stake: next.stake }].slice(-36),
    };
    replaceStartup(state, next);
  }

  // Succession programme and buy-and-build: business cycle, debt, covenants, integrations, mandates.
  const mna = ctxOf(state);
  lboMonth(mna, month, notes, lines);
  platformMonth(mna, month, notes, lines);
  mandatesMonth(mna, month, notes, income);
  duelsMonth(mna, month, notes);
  searchMonth(mna, month, notes, income);

  if (month >= NEWS_FROM_MONTH) publishNews(state, month, lines, notes);

  // Private side: living costs, rent, the stock market, the overdraft.
  state.cash -= LIVING_COSTS;
  income.living = -LIVING_COSTS;
  const rent = officeRent(state);
  state.cash -= rent;
  income.rent = -rent;
  const upkeep = garageUpkeep(state);
  state.cash -= upkeep;
  income.vehicles = -upkeep;
  holdingMonth(state, month, income, notes, payouts);
  wealthMonth(mna, month, income, notes);
  const regimeBefore = state.market.regime;
  const market = stepMarket(state.market, month, randomFor(state.seed, `market|${month}`));
  state.market = market.market;
  state.cash += market.payout;
  income.payouts = market.payout;
  if (market.market.regime !== regimeBefore || month % 3 === 0) notes.push(`Börse: ${market.market.headline}.`);
  if (state.cash < 0) {
    const interest = -state.cash * OVERDRAFT_RATE;
    state.cash -= interest;
    income.interest = -interest;
    notes.push(`Dein Konto ist im Minus. Die Bank berechnet ${Math.round(interest).toLocaleString("de-DE")} € Dispozinsen.`);
  }
  if (state.cash < -OVERDRAFT_LIMIT) forceLiquidity(state, notes);

  // Deal flow: expired offers, new offers, and a fallback when nothing is left.
  state.month = month + 1;
  for (const s of state.startups.filter((x) => x.status === "offered")) {
    if (s.offer && s.offer.expires < state.month) {
      s.status = "declined";
      notes.push(`Das Angebot von ${s.name} ist abgelaufen.`);
    }
  }
  for (const def of STARTUPS.filter((d) => d.arrives === state.month)) offer(state, def.id);
  const busy = state.startups.some((s) => s.status === "active" || s.status === "offered");
  if (!busy) {
    const fresh = STARTUPS.find((d) => !state.startups.some((s) => s.id === d.id));
    if (fresh) offer(state, fresh.id);
  }

  for (const o of state.shareOffers.filter((x) => x.status === "open" && x.expires < state.month)) o.status = "expired";
  // The network: warmth fades by ring, favours run out, careers move on.
  networkMonth(mna, month, notes);
  if (month % 3 === 0) grantAdvisorShares(state, month, notes);
  for (const s of state.startups.filter((x) => x.status === "active")) {
    const random = randomFor(state.seed, `secondary|${s.id}|${state.month}`);
    if (random() < SECONDARY_CHANCE) {
      const pick = s.capTable.find((h) => h.kind === "angel" && h.pct >= 1.5);
      if (pick) createShareOffer(state, s, pick.id, pick.pct / 2, SECONDARY_DISCOUNT);
    }
  }
  planRounds(state);
  planExits(state);
  // Fame fades a little at the very top: a big name needs to keep delivering.
  if (state.reputation > REPUTATION_FADE_FROM && !(state.reputationMonth?.month === month && state.reputationMonth.gained > 0)) state.reputation -= 1;
  offerCorporateSeat(state);
  announceNextStep(state);
  pruneDeals(state);
  planDeals(state);
  planMandates(mna);
  planSearchTargets(mna);
  planAddons(mna);
  for (const g of state.gigs.filter((x) => x.status === "offered")) g.status = "expired";
  state.gigs = [
    ...state.gigs.filter((g) => g.month > state.month - 6),
    ...drawGigs(state.month, state.reputation, randomFor(state.seed, `gigs|${state.month}`), () => nextId(state, "g"), officeOf(state).extraGigs),
  ];

  state.daysUsed = 0;
  state.calendar = [];
  // Favours asked, invitations sent, events accepted earlier now in the calendar.
  planNetwork(mna);
  planRivalHouses(mna);
  leagueMonth(mna);
  planAgenda(state);

  // Family businesses: one line on why the value moved, so a drop is never a riddle.
  const whyOf = new Map<string, string>();
  for (const s of state.startups) {
    const b = before.get(s.id);
    if (s.status === "active" && s.metrics.valuedOn === "ebitda" && !s.corporate && b) whyOf.set(s.id, explainValueChange(b.metrics, s.metrics, { payout: payouts.get(s.id) }));
  }
  const why = (s: Startup) => whyOf.get(s.id) ?? null;
  if (whyOf.size > 0) {
    unlockLesson(state, "werttreiber");
    unlockLesson(state, "ltm_ebitda");
  }
  const report: MonthReport = {
    month,
    worth: netWorth(state),
    worthBefore,
    lines: state.startups
      .filter((s) => s.joined > 0 && (s.status === "active" || lines.has(s.id)))
      .map((s) => {
        const b = before.get(s.id);
        return {
          startupId: s.id,
          name: s.name,
          revenue: s.metrics.revenue,
          revenueBefore: b?.revenue ?? s.metrics.revenue,
          cash: s.metrics.cash,
          cashBefore: b?.cash ?? s.metrics.cash,
          valuation: valuation(s.metrics),
          valuationBefore: b?.valuation ?? valuation(s.metrics),
          stake: s.stake,
          status: s.status,
          events: lines.get(s.id) ?? [],
          corporate: s.corporate,
          ...(why(s) ? { valueWhy: why(s)! } : {}),
        };
      }),
    playerCash: state.cash,
    playerCashBefore: cashBefore,
    reputation: state.reputation,
    reputationBefore,
    portfolioValue: portfolioValue(state),
    portfolioValueBefore: valueBefore,
    notes,
    income,
  };
  state.reports.unshift(report);
  if (state.reports.length > 24) state.reports.length = 24;
  return report;
}

/**
 * The bank calls the overdraft: first the depot is sold, then the smallest
 * stake goes to another investor at a discount.
 */
function forceLiquidity(state: GameState, notes: string[]): void {
  const m = state.market;
  const depot = holdingsValue(m);
  if (depot > 0) {
    state.cash += depot;
    for (const key of Object.keys(m.holdings) as (keyof typeof m.holdings)[]) {
      m.holdings[key] = 0;
      m.invested[key] = 0;
    }
    notes.push(`Die Bank hat den Dispo gekündigt. Dein Depot wurde für ${Math.round(depot).toLocaleString("de-DE")} € verkauft.`);
  }
  if (state.cash >= -OVERDRAFT_LIMIT) return;
  const stakes = state.startups
    .filter((s) => s.status === "active" && s.stake > 0)
    .map((s) => ({ s, value: (s.stake / 100) * valuation(s.metrics) }))
    .sort((a, b) => a.value - b.value);
  const pick = stakes[0];
  if (!pick) return;
  const price = pick.value * FIRE_SALE;
  state.cash += price;
  const capTable = [...pick.s.capTable, { id: "buyer", name: "Käufer deines Anteils", kind: "investor" as const, pct: pick.s.stake }];
  replaceStartup(state, { ...pick.s, status: "sold", capTable, stake: 0, exitValue: price });
  state.reputation = Math.max(0, state.reputation - 4);
  notes.push(`Notverkauf: Deinen Anteil an ${pick.s.name} hast du mit 30 % Abschlag für ${Math.round(price).toLocaleString("de-DE")} € verkauft. Liquidität geht vor.`);
  unlockLesson(state, "liquiditaet");
}

/** Every quarter, strong board work earns a few new shares. */
function grantAdvisorShares(state: GameState, month: number, notes: string[]): void {
  for (const s of state.startups.filter((x) => x.status === "active" && !x.corporate)) {
    const strong = state.items.filter((i) => i.startupId === s.id && i.decision && !i.decision.lapsed && i.decision.judgment === "strong" && i.decision.month > month - 3).length;
    const granted = s.advisorShares ?? 0;
    if (strong === 0 || s.metrics.trust < 60 || granted >= ADVISOR_SHARES_MAX) continue;
    replaceStartup(state, { ...grantToPlayer(s, ADVISOR_SHARES), advisorShares: granted + ADVISOR_SHARES });
    const last = granted + ADVISOR_SHARES >= ADVISOR_SHARES_MAX;
    const text = `${s.name}: Für deine Arbeit im Beirat bekommst du ${ADVISOR_SHARES.toLocaleString("de-DE")} % Leistungsanteile${last ? `. Mehr als ${ADVISOR_SHARES_MAX.toLocaleString("de-DE")} % gibt es dafür nicht` : ""}.`;
    notes.push(text);
    mail(state, { kind: "founder", from: s.name, subject: "Leistungsanteile für dich", body: `${text} Gute Beiräte binden Firmen gern mit Anteilen.`, startupId: s.id });
  }
}

/** Companies running short of money raise a round; the shareholders' meeting decides. */
function planRounds(state: GameState): void {
  for (const s of state.startups.filter((x) => x.status === "active" && !x.corporate)) {
    if (state.month - s.joined < 2) continue;
    const blocked = state.rounds.some((r) => r.startupId === s.id && (r.status === "open" || state.month - r.month < (r.amount === 0 ? FAILED_SEARCH_COOLDOWN : ROUND_COOLDOWN)));
    if (blocked) continue;
    const runway = runwayMonths(s.metrics);
    if (!(runway < ROUND_RUNWAY && runway >= 1)) continue;
    const random = randomFor(state.seed, `round|${s.id}|${state.month}`);
    const mood = sentimentOf(state.market.regime);
    if (random() > fundability(s, mood)) {
      // Nobody wants in: the founders keep looking, the money keeps running out.
      state.rounds.push({
        id: nextId(state, "r"),
        startupId: s.id,
        month: state.month,
        status: "failed",
        label: "Investorensuche",
        amount: 0,
        preMoney: 0,
        leadId: "",
        lead: "",
        down: false,
      });
      mail(state, {
        kind: "round",
        from: s.name,
        subject: "Investoren winken ab",
        body: `Das Geld reicht noch etwa ${Math.floor(runway)} Monate, aber kein Investor will gerade einsteigen. Wachstum, saubere Zahlen und Kontakte zu Investoren machen die Firma attraktiver.`,
        startupId: s.id,
      });
      continue;
    }
    const done = state.rounds.filter((r) => r.startupId === s.id && r.status === "closed").length;
    const terms = roundTerms(s, done, random, mood);
    const round: Round = { id: nextId(state, "r"), startupId: s.id, month: state.month, status: "open", ...terms };
    state.rounds.push(round);
    replaceStartup(state, { ...s, flags: [...s.flags.filter((f) => f !== "round_open"), "round_open"] });
    const ceo = s.board.find((b) => b.seat === "ceo");
    mail(state, {
      kind: "round",
      from: ceo ? `${ceo.name}, ${s.name}` : s.name,
      subject: `${terms.label}: ${terms.amount.toLocaleString("de-DE")} € von ${terms.lead}`,
      body: `Das Geld reicht noch etwa ${Math.floor(runway)} Monate. ${terms.lead} bietet ${terms.amount.toLocaleString("de-DE")} € bei einer Bewertung von ${terms.preMoney.toLocaleString("de-DE")} € vor dem Geld.${terms.down ? " Das ist weniger, als die Firma zuletzt wert war." : ""} Die Gesellschafterversammlung muss zustimmen. Ziehst du mit?`,
      startupId: s.id,
      roundId: round.id,
    });
  }
}

const BUYERS = ["Alpenblick Private Equity", "Hanse Capital Partners", "Brückner Holding"];

/**
 * Now and then someone wants to buy a grown-up company. Good markets bring
 * more buyers and better prices; the shareholders decide.
 */
function planExits(state: GameState): void {
  const mood = sentimentOf(state.market.regime);
  for (const s of state.startups.filter((x) => x.status === "active" && !x.corporate)) {
    if (state.month - s.joined < EXIT_MIN_AGE || s.flags.includes("round_open") || s.platform?.sale) continue;
    const value = valuation(s.metrics);
    if (value < EXIT_MIN_VALUE) continue;
    if (state.exits.some((e) => e.startupId === s.id && (e.status === "open" || state.month - e.month < 6))) continue;
    if (openItems(state).some((i) => i.startupId === s.id && i.templateId === "acquisition")) continue;
    if (planIpo(state, s, value, mood)) continue;
    const random = randomFor(state.seed, `exit|${s.id}|${state.month}`);
    const chance = EXIT_CHANCE * (1 + mood * 0.6) * (s.metrics.growth > 0.03 ? 1.4 : 1);
    if (random() > chance) continue;
    const buyers = [s.names.acquirer, ...BUYERS];
    const buyer = buyers[Math.floor(random() * buyers.length) % buyers.length]!;
    // Buyers pay a premium for growth; for a company that barely grows the offers stay close to its value.
    const spread = 0.45 + Math.min(0.05, Math.max(0, s.metrics.growth)) * 5;
    const price = Math.round((value * (0.8 + random() * spread + mood * 0.1)) / 10_000) * 10_000;
    const offer: ExitOffer = { id: nextId(state, "x"), startupId: s.id, month: state.month, buyer, price, status: "open" };
    state.exits.push(offer);
    const mine = waterfall(s, price).payouts.find((p) => p.id === "you")?.amount ?? 0;
    mail(state, {
      kind: "exit",
      from: buyer,
      subject: `Kaufangebot für ${s.name}: ${price.toLocaleString("de-DE")} €`,
      body: `${buyer} will ${s.name} vollständig kaufen. Heute ist die Firma etwa ${(Math.round(value / 10_000) * 10_000).toLocaleString("de-DE")} € wert. Nach der Liquidationspräferenz bekämst du rund ${(Math.round(mine / 1000) * 1000).toLocaleString("de-DE")} €. Die Gesellschafterversammlung entscheidet bis Monatsende.`,
      startupId: s.id,
      exitId: offer.id,
    });
  }
}

/** Big, growing companies can list on the stock exchange instead of being sold. */
function planIpo(state: GameState, s: Startup, value: number, mood: number): boolean {
  if (value < IPO_MIN_VALUE || state.month - s.joined < 12 || s.metrics.growth < 0.012) return false;
  const random = randomFor(state.seed, `ipo|${s.id}|${state.month}`);
  if (random() > IPO_CHANCE * (1 + mood)) return false;
  const price = Math.round((value * (1 + random() * 0.35 + mood * 0.15)) / 100_000) * 100_000;
  const offer: ExitOffer = { id: nextId(state, "x"), startupId: s.id, month: state.month, buyer: "Börsengang in Frankfurt", price, status: "open", ipo: true };
  state.exits.push(offer);
  mail(state, {
    kind: "exit",
    from: "Konsortium der Emissionsbanken",
    subject: `${s.name} kann an die Börse: ${price.toLocaleString("de-DE")} €`,
    body: `Die Banken trauen sich eine Bewertung von ${price.toLocaleString("de-DE")} € zu. Bei einem Börsengang bekommst du die Hälfte deines Erlöses sofort; die andere Hälfte deiner Aktien ist ${IPO_LOCKUP} Monate gesperrt und schwankt mit dem Markt. Die Gesellschafterversammlung entscheidet bis Monatsende.`,
    startupId: s.id,
    exitId: offer.id,
  });
  return true;
}

/** Operating partners decide for the companies they look after: how well depends on the fit. */
function delegateItems(state: GameState, notes: string[]): void {
  for (const item of openItems(state)) {
    const lead = delegateFor(state, item.startupId);
    const s = state.startups.find((x) => x.id === item.startupId);
    if (!lead || !s || s.status !== "active") continue;
    const member = lead.member;
    const t = templateOf(item.templateId);
    const planned = covenantOutlook(t, s, covenantsOf(state, item));
    const random = randomFor(state.seed, `associate|${item.id}`);
    // A partner who fits the company finds the best option more often, a fitting condition included; otherwise the board's standard condition.
    const pick = random() < lead.skill ? bestOf(optionValues(planned)) : "standard";
    const vote: Vote = pick === "go" || pick === "no" ? pick : "conditions";
    const covenant = vote === "conditions" && pick !== "standard" ? (pick as CovenantId) : undefined;
    const stances = baseStances(t, s, meetingRandom(state, item));
    decide(state, item, vote, vote, null, stances.ceo, { go: 0, conditions: 0, no: 0, abstain: 0 }, covenant, true, planned);
    // The credit goes mostly to the partner.
    const d = item.decision!;
    const half = Math.trunc(d.reputationDelta / 2);
    state.reputation = Math.min(100, Math.max(0, state.reputation - d.reputationDelta + half));
    d.reputationDelta = half;
    d.delegated = true;
    notes.push(`${s.name}: ${member.name} hat für dich im Beirat entschieden: ${covenant ? `Auflage „${COVENANTS[covenant].name}“` : fill(t.outcomes[vote].label, s)}.`);
  }
}

/** Generation 2: the heir decides every open board item, like an associate with the heir's own skill. */
function heirItems(state: GameState, notes: string[]): void {
  const heir = heirInCharge(state);
  if (!heir) return;
  for (const item of openItems(state)) {
    const s = state.startups.find((x) => x.id === item.startupId);
    if (!s || s.status !== "active") continue;
    const t = templateOf(item.templateId);
    const planned = covenantOutlook(t, s, covenantsOf(state, item));
    const random = randomFor(state.seed, `heir|${item.id}`);
    const pick = random() < heir.skill ? bestOf(optionValues(planned)) : "standard";
    const vote: Vote = pick === "go" || pick === "no" ? pick : "conditions";
    const covenant = vote === "conditions" && pick !== "standard" ? (pick as CovenantId) : undefined;
    const stances = baseStances(t, s, meetingRandom(state, item));
    decide(state, item, vote, vote, null, stances.ceo, { go: 0, conditions: 0, no: 0, abstain: 0 }, covenant, true, planned);
    const d = item.decision!;
    const half = Math.trunc(d.reputationDelta / 2);
    state.reputation = Math.min(100, Math.max(0, state.reputation - d.reputationDelta + half));
    d.reputationDelta = half;
    d.delegated = true;
    notes.push(`${s.name}: ${heir.name} hat im Beirat entschieden: ${covenant ? `Auflage „${COVENANTS[covenant].name}“` : fill(t.outcomes[vote].label, s)}.`);
  }
}

/**
 * The private holding's month: team salaries, fund fee, loan instalments,
 * shares coming out of lockup, quarterly dividends, the yearly balance.
 */
function holdingMonth(state: GameState, month: number, income: IncomeLines, notes: string[], payouts?: Map<string, number>): void {
  const salaries = state.team.reduce((sum, m) => sum + m.salary, 0);
  state.cash -= salaries;
  income.salaries = -salaries;
  teamMonth(state, month, income, notes);
  if (state.fund) {
    const fee = Math.round((state.fund.size * FUND_FEE) / 12);
    state.cash += fee;
    income.fundFee = fee;
  }
  for (const loan of state.loans) {
    const interest = (loan.balance * loan.rate) / 12;
    const pay = Math.min(loan.payment, loan.balance + interest);
    loan.balance = Math.max(0, loan.balance + interest - pay);
    state.cash -= pay;
    income.loans = (income.loans ?? 0) - pay;
  }
  state.loans = state.loans.filter((l) => l.balance > 1);
  for (const lock of state.lockups.filter((l) => l.due <= month + 1)) {
    const amount = lock.amount * (state.market.prices.tech / lock.index);
    state.cash += amount;
    income.lockups = (income.lockups ?? 0) + amount;
    notes.push(`${lock.name}: Die Sperrfrist ist vorbei. Deine restlichen Aktien bringen ${Math.round(amount).toLocaleString("de-DE")} €.`);
  }
  state.lockups = state.lockups.filter((l) => l.due > month + 1);
  if (month % 3 === 0) payDividends(state, income, notes, payouts);
  if (month % 12 === 0) yearBalance(state, month);
}

/** Majority-owned companies that earn money pay out what they do not need. */
function payDividends(state: GameState, income: IncomeLines, notes: string[], payouts?: Map<string, number>): void {
  for (const s of state.startups.filter((x) => x.status === "active" && !x.corporate)) {
    const fundPct = s.capTable.filter((h) => h.kind === "fund").reduce((sum, h) => sum + h.pct, 0);
    if (s.stake + fundPct <= 50 || monthlyCashFlow(s.metrics) <= 0) continue;
    // Lenders of a bought company allow payouts only well below the covenant.
    if (!lboAllowsDividends(s)) continue;
    const excess = s.metrics.cash - DIVIDEND_RESERVE_MONTHS * s.metrics.opex;
    if (excess < 5_000) continue;
    const total = excess * DIVIDEND_SHARE;
    const mine = (total * s.stake) / 100;
    const fund = (total * fundPct) / 100;
    state.cash += mine;
    income.dividends = (income.dividends ?? 0) + mine;
    if (state.fund) {
      state.fund.cash += fund;
      state.fund.returned += fund;
    }
    replaceStartup(state, applyDelta(s, { cash: -total }));
    payouts?.set(s.id, total);
    notes.push(`${s.name} schüttet ${Math.round(total).toLocaleString("de-DE")} € aus. Dein Anteil: ${Math.round(mine).toLocaleString("de-DE")} €.`);
    unlockLesson(state, "ausschuettung");
  }
}

function yearBalance(state: GameState, month: number): void {
  const worth = netWorth(state);
  const before = state.yearWorth || START_CASH;
  const change = (worth - before) / Math.max(1, before);
  const year = Math.floor((month + 8) / 12);
  const sold = state.exits.filter((e) => e.status === "accepted" && e.month > month - 12).length;
  const dead = state.startups.filter((s) => s.status === "dead").length;
  mail(state, {
    kind: "system",
    from: "Boardroom",
    subject: `Jahresbilanz, Jahr ${year}`,
    body: `Dein Vermögen ist von ${Math.round(before).toLocaleString("de-DE")} € auf ${Math.round(worth).toLocaleString("de-DE")} € ${change >= 0 ? "gestiegen" : "gefallen"} (${(change * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %). ${sold > 0 ? `${sold} Verkauf${sold > 1 ? "e" : ""} in diesem Jahr. ` : ""}${dead > 0 ? `Insolvenzen bisher: ${dead}. ` : ""}Ruf: ${state.reputation}. Ein neues Jahr, neue Gründungen.`,
  });
  state.yearWorth = worth;
}

/** Generated offers nobody took disappear, so the save stays small. */
function pruneDeals(state: GameState): void {
  const gone = new Set(state.startups.filter((s) => s.status === "declined" && state.deals.some((d) => d.id === s.id)).map((s) => s.id));
  if (gone.size === 0) return;
  state.startups = state.startups.filter((s) => !gone.has(s.id));
  state.deals = state.deals.filter((d) => !gone.has(d.id));
}

/** Which kind of company knocks: early on small rounds, later growth rounds and family businesses. */
function dealStage(state: GameState, random: () => number): DealStage {
  const worth = netWorth(state);
  const weights: [DealStage, number][] = [
    ["preseed", worth < 300_000 ? 6 : 3],
    ["seed", worth < 150_000 ? 1 : 4],
    ["growth", worth > 500_000 ? 3 : 0],
    ["buyout", state.reputation >= BUYOUT_REPUTATION && worth >= BUYOUT_WORTH ? 2 : 0],
  ];
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = random() * total;
  for (const [stage, w] of weights) {
    roll -= w;
    if (roll < 0) return stage;
  }
  return "preseed";
}

/**
 * After the first companies, new ones keep coming: every few months, more
 * often with a warm deal-flow contact, and every month with a partner.
 */
function planDeals(state: GameState): void {
  if (state.month < DEALS_FROM_MONTH) return;
  const open = state.startups.filter((s) => s.status === "offered").length;
  const random = randomFor(state.seed, `deals|${state.month}`);
  const warm = state.contacts.some((c) => c.id === "dealflow" && c.met && c.warmth >= 40);
  const idle = !state.startups.some((s) => s.status === "active" && !s.corporate) && open === 0;
  let count = idle || random() < 0.4 + (warm ? 0.15 : 0) + (state.office >= 1 ? 0.05 : 0) ? 1 : 0;
  count += teamDealFlow(state);
  const taken = new Set(state.startups.map((s) => s.name));
  for (let i = 0; i < count && open + i < DEALS_MAX_OPEN; i++) {
    const name = newDeal(state, random, dealStage(state, random), taken);
    taken.add(name);
  }
}

/** A generated offer; family businesses come valued by EBITDA, sized to what the player can carry. */
function newDeal(state: GameState, random: () => number, stage: DealStage, taken: Set<string>): string {
  if (stage === "buyout") return targetDeal(ctxOf(state), random, { ev: targetEv(netWorth(state) * 0.8, random), source: "market" }).name;
  const def = generateDeal(random, stage, nextId(state, "d"), state.month, taken);
  state.deals.push(def);
  offer(state, def.id);
  return def.name;
}

/** World news hits sectors or single companies. Rare at first, more often later. */
function publishNews(state: GameState, month: number, lines: Map<string, string[]>, notes: string[]): void {
  const random = randomFor(state.seed, `news|${month}`);
  const count = month < 9 ? (random() < 0.4 ? 1 : 0) : random() < 0.6 ? (random() < 0.3 ? 2 : 1) : 0;
  const pool = state.startups.filter((s) => s.status === "active" && !s.corporate);
  const recent = new Set(state.news.filter((n) => n.month > month - 8).map((n) => n.title));
  for (let i = 0; i < count; i++) {
    const candidates = NEWS.filter((n) => !recent.has(n.title) && targetsOf(n, pool, () => 0).length > 0);
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(random() * candidates.length) % candidates.length]!;
    recent.add(pick.title);
    const targets = targetsOf(pick, pool, random);
    for (const t of targets) {
      const hit = startupOf(state, t.id);
      // News move a family business less than a startup, like board decisions do.
      replaceStartup(state, applyDelta(hit, hit.metrics.valuedOn === "ebitda" ? familyDelta(pick.delta) : pick.delta));
      const texts = lines.get(t.id) ?? [];
      texts.push(pick.effect);
      lines.set(t.id, texts);
    }
    state.news.unshift({ month, title: pick.title, text: pick.text, startupIds: targets.map((t) => t.id) });
    notes.push(`Nachrichten: ${pick.title}. Betrifft ${targets.map((t) => t.name).join(", ")}.`);
    mail(state, { kind: "news", from: "Wirtschaftsblatt", subject: pick.title, body: `${pick.text} Betrifft: ${targets.map((t) => t.name).join(", ")}.` });
  }
  if (state.news.length > 24) state.news.length = 24;
}

/** With a strong reputation and a real track record, a corporation calls. */
/** One letter each when the Family Office, or later the fund, is within reach. */
function announceNextStep(state: GameState): void {
  const sent = new Set(state.notices ?? []);
  const notice = (id: string, subject: string, body: string) => {
    if (sent.has(id)) return;
    state.notices = [...(state.notices ?? []), id];
    mail(state, { kind: "system", from: "Boardroom", subject, body });
  };
  if (state.familyOffice === undefined && state.reputation >= FAMILY_OFFICE_REPUTATION && netWorth(state) >= FAMILY_OFFICE_WORTH) {
    if (state.office < 3) {
      notice(
        "familyOffice-office",
        "Fast bereit für ein Family Office",
        `Ruf und Vermögen reichen. Es fehlt nur die Büroetage mit Analyst: Zieh um, dann kannst du dein Family Office gründen. Den Umzug findest du im Büro unter „Nächster Schritt“.`,
      );
    } else {
      notice(
        "familyOffice",
        "Du kannst jetzt ein Family Office gründen",
        `Ruf, Vermögen und Büro reichen. Gründung, Notar und Anwälte kosten ${FAMILY_OFFICE_COST.toLocaleString("de-DE")} € und zwei Tage. Den Knopf findest du im Büro unter „Nächster Schritt“ und in der Holding.`,
      );
    }
  }
  if (fundBlocker(state) === null) {
    notice("fund", "Investoren warten auf deinen Fonds", "Dein Ruf und dein erster Verkauf überzeugen Geldgeber. In der Holding kannst du jetzt einen eigenen Fonds auflegen.");
  }
}

function offerCorporateSeat(state: GameState): void {
  // A seat turned down is offered again a year later.
  if (state.corporateSeat === "declined" && state.month >= (state.corporateDeclined ?? 0) + 12) state.corporateSeat = "none";
  if (state.corporateSeat !== "none" || state.reputation < CORPORATE_REPUTATION) return;
  const record = state.ledRounds > 0 || state.startups.some((s) => s.stake > 50) || state.exits.some((e) => e.status === "accepted");
  if (!record) return;
  state.corporateSeat = "offered";
  mail(state, {
    kind: "system",
    from: "Prof. Elif Kaya, Nordhafen AG",
    subject: "Anfrage: Mandat im Aufsichtsrat",
    body: `Die Nordhafen AG, 2.400 Beschäftigte, sucht ein Aufsichtsratsmitglied mit Erfahrung in jungen Firmen. Vergütung ${CORPORATE_FEE.toLocaleString("de-DE")} € im Monat, eine Sitzung pro Quartal, keine Anteile. Hätten Sie Interesse?`,
    action: "corporate",
  });
}

export function describeMonth(state: GameState): string {
  return monthLabel(state.month);
}
