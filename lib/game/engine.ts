import {
  ACTION_DAYS,
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
  INTRO_COOLDOWN,
  LEAD_REPUTATION,
  LEAD_REPUTATION_GAIN,
  MAJORITY_REPUTATION_GAIN,
  ROUND_COOLDOWN,
  FAILED_SEARCH_COOLDOWN,
  ROUND_RUNWAY,
  SECONDARY_CHANCE,
  SECONDARY_DISCOUNT,
  WARMTH_DECAY,
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
} from "./config";
import { applyRound, capTableAfterEntry, exitVote, fundability, playerAmount, roundTerms, sellers, shareholderVote, grantToPlayer, syndicateAmount, transferToPlayer, waterfall } from "./captable";
import { CORPORATE_ID, corporateStartup } from "./corporate";
import { NEWS, targetsOf } from "./news";
import { monthDays, OFFICES, officeOf } from "./office";
import { contactDef, initialContacts, ringOpen } from "./network";
import { boardFee, drawGigs } from "./gigs";
import { assetOf, holdingsValue, initialMarket, sentimentOf, stepMarket } from "./market";
import { templateOf, TEMPLATES } from "./content";
import { judge, bestVote, outlook, VOTES } from "./judge";
import { CURRICULUM } from "./lessons";
import { baseStances, buildMeeting, type MeetingPlayback } from "./meeting";
import { applyDelta, runwayMonths, stepMonth, valuation } from "./sim";
import { definitionOf, offerStartup, STARTUPS } from "./startups";
import { fill } from "./templates";
import type {
  BoardItem,
  Delta,
  ExitOffer,
  GameAction,
  GameState,
  GvVote,
  IncomeLines,
  Mail,
  MonthReport,
  Round,
  RoundTake,
  Shares,
  Startup,
  Vote,
} from "./types";
import { voteFromStance } from "./votes";

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
    version: 4,
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
    contacts: initialContacts(),
    ledRounds: 0,
    gigs: [],
    market: initialMarket(),
    office: 0,
    exits: [],
    news: [],
    corporateSeat: "none",
  };
  state.gigs = drawGigs(1, state.reputation, randomFor(seed, "gigs|1"), () => nextId(state, "g"));
  mail(state, {
    kind: "system",
    from: "Boardroom",
    subject: "Willkommen in deinem Büro",
    body:
      "Du hast 150.000 € Privatkapital und den Wunsch, mehr zu bewegen als ein Sparbuch. Zwei Gründer suchen einen Angel. Prüfe die Angebote, investiere in eines und begleite die Firma im Beirat. Jeder Monat hat 20 Arbeitstage. Davon lebst du auch: Rund 1.800 € kostet dein Leben im Monat, Beratungsaufträge bringen Geld, kosten aber Tage. Was nicht gebraucht wird, kann an der Börse arbeiten.",
  });
  for (const def of STARTUPS.filter((d) => d.arrives === 1)) offer(state, def.id);
  return state;
}

function offer(state: GameState, id: string): void {
  if (state.startups.some((s) => s.id === id)) return;
  const def = definitionOf(id);
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
  if (state.version >= 4) return state;
  if (state.version < 2) {
    for (const s of state.startups) {
      if (!s.capTable) s.capTable = capTableAfterEntry(definitionOf(s.id).capTable, s.stake);
    }
    state = {
      ...state,
      version: 2 as number as 4,
      rounds: state.rounds ?? [],
      shareOffers: state.shareOffers ?? [],
      contacts: state.contacts ?? initialContacts(),
      ledRounds: state.ledRounds ?? 0,
    };
  }
  // Version 3: income and the stock market.
  const next: GameState = { ...state, version: 4, market: state.market ?? initialMarket(), gigs: state.gigs ?? [] };
  if (next.gigs.length === 0) next.gigs = drawGigs(next.month, next.reputation, randomFor(next.seed, `gigs|${next.month}`), () => nextId(next, "g"));
  // Version 4: offices, exits, news and the corporate seat.
  next.office = next.office ?? 0;
  next.exits = next.exits ?? [];
  next.news = next.news ?? [];
  next.corporateSeat = next.corporateSeat ?? "none";
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

export function openItems(state: GameState): BoardItem[] {
  return state.items.filter((i) => i.status === "open");
}

export function daysLeft(state: GameState): number {
  return monthDays(state) - state.daysUsed;
}

/** Account, depot and stakes together: what an office landlord looks at. */
export function netWorth(state: GameState): number {
  return state.cash + holdingsValue(state.market) + portfolioValue(state);
}

export function portfolioValue(state: GameState): number {
  return state.startups
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.stake / 100) * valuation(s.metrics), 0);
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

function spendDays(state: GameState, kind: keyof typeof ACTION_DAYS | "gig", label: string, custom?: number): void {
  const days = custom ?? (kind === "gig" ? 1 : ACTION_DAYS[kind]);
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
  const state = clone(current);
  switch (action.type) {
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
      if (!s.offer.ddDone) s.flags.push("blind");
      s.history.push({ month: state.month, revenue: s.metrics.revenue, cash: s.metrics.cash, valuation: valuation(s.metrics), stake: s.stake });
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
      if (!t.questions.some((q) => q.id === action.questionId)) throw new GameRuleError("Diese Frage gibt es nicht.");
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
      const s = startupOf(state, item.startupId);
      spendDays(state, "meeting", `Beirat ${s.name}`);
      const playback = buildMeeting({
        template: t,
        startup: s,
        item,
        reputation: state.reputation,
        random: meetingRandom(state, item),
        argument: action.argument,
        vote: action.vote,
      });
      decide(state, item, playback.outcome!, action.vote, action.argument, playback.stancesAfter.ceo, playback.shares!);
      item.decision!.ballots = playback.ballots;
      return { state, result: { kind: "meeting", playback, itemId: item.id } };
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
        mail(state, { kind: "shares", from: s.name, subject: "Niemand will verkaufen", body: "Du hast dich umgehört, aber gerade will niemand Anteile abgeben. Mehr Vertrauen und ein besserer Ruf öffnen Türen.", startupId: s.id });
        return { state, result: { kind: "none" } };
      }
      const pick = options[Math.floor(random() * options.length) % options.length]!;
      createShareOffer(state, s, pick.holder.id, pick.pct, pick.factor);
      return { state, result: { kind: "none" } };
    }
    case "meetContact": {
      const c = state.contacts.find((x) => x.id === action.contactId);
      if (!c) throw new GameRuleError("Diesen Kontakt gibt es nicht.");
      const def = contactDef(c.id);
      if (!ringOpen(state, def.ring)) throw new GameRuleError("Dieser Kreis öffnet sich erst mit mehr Ruf.");
      if (state.calendar.some((e) => e.kind === "meetContact" && e.label.endsWith(def.name))) {
        throw new GameRuleError("Ihr habt euch diesen Monat schon getroffen.");
      }
      spendDays(state, "meetContact", `Treffen mit ${def.name}`);
      c.warmth = Math.min(100, c.warmth + (c.met ? WARMTH_MEET : WARMTH_MEET_FIRST));
      c.met = true;
      unlockLesson(state, "netzwerk");
      return { state, result: { kind: "none" } };
    }
    case "introContact": {
      const c = state.contacts.find((x) => x.id === action.contactId);
      if (!c) throw new GameRuleError("Diesen Kontakt gibt es nicht.");
      const def = contactDef(c.id);
      if (!c.met || !ringOpen(state, def.ring)) throw new GameRuleError("Diesen Kontakt kennst du noch nicht gut genug.");
      if (c.warmth < WARMTH_INTRO_MIN) throw new GameRuleError(`Die Beziehung ist zu kühl. Ab ${WARMTH_INTRO_MIN} Wärme kannst du um einen Gefallen bitten.`);
      if (c.lastIntro !== undefined && state.month - c.lastIntro < INTRO_COOLDOWN) {
        throw new GameRuleError(`${def.name} hat dir gerade erst geholfen. Frag in ein paar Monaten wieder.`);
      }
      const s = startupOf(state, action.startupId);
      if (s.status !== "active" || s.corporate) throw new GameRuleError("Du bist an dieser Firma nicht beteiligt.");
      spendDays(state, "introContact", `${def.name} für ${s.name}`);
      c.warmth = Math.max(0, c.warmth - WARMTH_INTRO_COST);
      c.lastIntro = state.month;
      state.reputation = Math.min(100, state.reputation + 1);
      unlockLesson(state, "netzwerk");
      introduce(state, s, def.id);
      return { state, result: { kind: "none" } };
    }
    case "gig": {
      const gig = state.gigs.find((g) => g.id === action.gigId);
      if (!gig || gig.status !== "offered") throw new GameRuleError("Dieser Auftrag ist nicht mehr zu haben.");
      spendDays(state, "gig", `${gig.title} (${gig.client})`, gig.days);
      gig.status = "booked";
      unlockLesson(state, "opportunitaetskosten");
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
        body: target.rent > 0 ? `Ab jetzt kostet dein Büro ${target.rent.toLocaleString("de-DE")} € Miete im Monat. ${target.perks.join(". ")}.` : "Zurück an den Küchentisch. Keine Miete mehr, aber auch keine Hilfe.",
      });
      return { state, result: { kind: "none" } };
    }
    case "joinCorporate": {
      if (state.corporateSeat !== "offered") throw new GameRuleError("Dieses Mandat liegt nicht vor.");
      if (!action.accept) {
        state.corporateSeat = "declined";
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

/** Why the player cannot lead with a syndicate yet, or null. */
export function syndicateBlocker(state: GameState): string | null {
  if (state.reputation < SYNDICATE_REPUTATION) return `Ein Syndikat anführen kannst du ab ${SYNDICATE_REPUTATION} Ruf.`;
  const club = state.contacts.find((c) => c.id === "angels");
  if (!club?.met || club.warmth < SYNDICATE_WARMTH) return `Dafür brauchst du einen warmen Draht zum Angel-Club (ab ${SYNDICATE_WARMTH} Wärme).`;
  return null;
}

/** The buyer either adds to the price or walks away. */
function negotiate(state: GameState, offer: ExitOffer, s: Startup): void {
  const random = randomFor(state.seed, `negotiate|${offer.id}`);
  const chance = Math.min(0.85, NEGOTIATE_CHANCE + (state.reputation - 50) / 200 + (s.stake > 25 ? 0.1 : 0));
  if (random() < chance) {
    offer.price = Math.round((offer.price * (1 + NEGOTIATE_GAIN)) / 10_000) * 10_000;
    mail(state, { kind: "exit", from: offer.buyer, subject: `${s.name}: ${offer.buyer} legt nach`, body: `Neues Angebot: ${offer.price.toLocaleString("de-DE")} €. Mehr gibt es nicht. Jetzt muss die Gesellschafterversammlung entscheiden.`, startupId: s.id, exitId: offer.id });
  } else {
    offer.status = "withdrawn";
    replaceStartup(state, applyDelta(s, { trust: -4 }));
    mail(state, { kind: "exit", from: offer.buyer, subject: `${s.name}: ${offer.buyer} steigt aus`, body: "Der Käufer hat das Interesse verloren. Die Gründung ist enttäuscht, das Geld war zum Greifen nah.", startupId: s.id, exitId: offer.id });
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
  const mine = (result.payouts.find((p) => p.id === "you")?.amount ?? 0) + result.carry;
  state.cash += mine;
  state.reputation = Math.min(100, state.reputation + 6);
  if (result.carry > 0) unlockLesson(state, "carry");
  replaceStartup(state, { ...s, status: "exited", exitValue: offer.price, flags: [...s.flags.filter((f) => f !== "round_open"), "offered_exit"] });
  state.items = state.items.filter((i) => !(i.startupId === s.id && i.status === "open"));
  const text = `${s.name} ist an ${offer.buyer} verkauft, für ${offer.price.toLocaleString("de-DE")} €. Du erhältst ${Math.round(mine).toLocaleString("de-DE")} €${result.carry > 0 ? `, davon ${Math.round(result.carry).toLocaleString("de-DE")} € Carry aus dem Syndikat` : ""}.`;
  notes.push(text);
  mail(state, { kind: "exit", from: s.name, subject: `Verkauft an ${offer.buyer}`, body: text, startupId: s.id, exitId: offer.id });
}

function introduce(state: GameState, s: Startup, contactId: string): void {
  const def = contactDef(contactId);
  switch (def.kind) {
    case "delta":
    case "loan":
      state.effects.push({ delay: 1, text: def.result, delta: def.delta ?? {}, startupId: s.id, due: state.month + 1, itemId: `intro-${contactId}-${state.month}` });
      break;
    case "investor":
      replaceStartup(state, { ...s, flags: s.flags.includes("investor_intro") ? s.flags : [...s.flags, "investor_intro"] });
      mail(state, { kind: "network", from: def.name, subject: `${s.name}: gern beim nächsten Mal`, body: def.result, startupId: s.id });
      break;
    case "shares": {
      const options = sellers({ ...s, metrics: { ...s.metrics, trust: 0 } });
      const pick = options[0];
      if (pick) createShareOffer(state, s, pick.holder.id, pick.pct, SECONDARY_DISCOUNT);
      else mail(state, { kind: "network", from: def.name, subject: "Gerade niemand", body: "Bei dieser Firma will gerade niemand verkaufen.", startupId: s.id });
      break;
    }
    case "deal": {
      const fresh = STARTUPS.find((d) => !state.startups.some((x) => x.id === d.id));
      if (fresh) offer(state, fresh.id);
      else mail(state, { kind: "network", from: def.name, subject: "Gerade nichts Passendes", body: "Ich melde mich, wenn ich etwas sehe.", startupId: s.id });
      break;
    }
  }
}

function createShareOffer(state: GameState, s: Startup, sellerId: string, pct: number, factor: number): void {
  const seller = s.capTable.find((h) => h.id === sellerId);
  if (!seller) return;
  const share = Math.round(Math.min(pct, seller.pct) * 10) / 10;
  if (share < 0.5) return;
  const price = Math.round(((valuation(s.metrics) * share) / 100) * factor / 1000) * 1000;
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
    state.reputation = Math.min(100, state.reputation + MAJORITY_REPUTATION_GAIN);
    unlockLesson(state, "stimmrechte");
    mail(state, { kind: "system", from: "Boardroom", subject: `Mehrheit an ${s.name}`, body: `Du hältst jetzt ${s.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % an ${s.name}. In der Gesellschafterversammlung entscheidest du ab sofort die meisten Fragen allein.`, startupId: s.id });
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
    state.reputation = Math.min(100, state.reputation + LEAD_REPUTATION_GAIN);
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
  state.reputation = Math.min(100, Math.max(0, state.reputation + (delta.reputation ?? 0)));
  if (delta.exit !== undefined && s.status === "active") {
    const split = waterfall(s, delta.exit);
    const payout = (split.payouts.find((p) => p.id === "you")?.amount ?? 0) + split.carry;
    state.cash += payout;
    unlockLesson(state, "liquidationspraeferenz");
    state.reputation = Math.min(100, state.reputation + 6);
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
): void {
  const t = templateOf(item.templateId);
  let s = startupOf(state, item.startupId);
  const values = mapValues(outlook(t, s));
  const best = bestVote(values);
  const judgment = judge(values, vote);
  const ceoVote = voteFromStance(ceoStance);
  const trustDelta = outcome === ceoVote ? 2 : outcome === "no" ? OVERRULED_TRUST.no : OVERRULED_TRUST.conditions;
  const reputationDelta = JUDGMENT_REPUTATION[judgment];
  state.reputation = Math.min(100, Math.max(0, state.reputation + reputationDelta));
  s = applyDelta(s, { trust: trustDelta });
  replaceStartup(state, s);
  item.status = "decided";
  item.decision = { argument, vote, outcome, shares, judgment, best, values, reputationDelta, trustDelta, month: state.month };
  unlockLesson(state, t.lesson);
  scheduleOutcome(state, item, outcome);
}

function mapValues(o: ReturnType<typeof outlook>): Record<Vote, number> {
  return { go: o.go.value, conditions: o.conditions.value, no: o.no.value };
}

/** Immediate effects now, the rest into the queue. */
function scheduleOutcome(state: GameState, item: BoardItem, outcome: Vote): void {
  const t = templateOf(item.templateId);
  let s = startupOf(state, item.startupId);
  const resolved = t.outcomes[outcome].resolve(s);
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
          state.reputation = Math.min(100, Math.max(0, state.reputation + (good ? RESULT_REPUTATION.good : RESULT_REPUTATION.bad)));
        }
      }
    } else {
      s = applyFull(state, s, effect.delta, texts, effect.text);
    }
    replaceStartup(state, s);
    lines.set(s.id, texts);
  }
}

function pickTemplate(state: GameState, s: Startup, random: () => number): string | null {
  const age = state.month - s.joined;
  const used = state.items.filter((i) => i.startupId === s.id);
  // The supervisory board meets once a quarter.
  if (s.corporate && age % 3 !== 1) return null;
  const candidates = TEMPLATES.filter((t) => {
    if (!!t.corporate !== !!s.corporate) return false;
    if (!t.when(s, age)) return false;
    const last = used.filter((i) => i.templateId === t.id).sort((a, b) => b.month - a.month)[0];
    if (!last) return true;
    return t.repeatAfter !== undefined && state.month - last.month >= t.repeatAfter;
  });
  const urgent = candidates.filter((t) => t.urgent);
  if (urgent.length > 0) return urgent[0]!.id;
  if (candidates.length === 0) return null;
  const quarterly = state.month % 3 === 0;
  if (!s.corporate && age > 1 && !quarterly && random() > 0.6) return null;
  return candidates[Math.floor(random() * candidates.length)]!.id;
}

/** Puts new items on the agenda of each mandate, at most one open item per company. */
export function planAgenda(state: GameState): void {
  for (const s of state.startups.filter((x) => x.status === "active")) {
    if (state.month - s.joined < 1) continue;
    if (openItems(state).some((i) => i.startupId === s.id)) continue;
    const templateId = pickTemplate(state, s, randomFor(state.seed, `agenda|${s.id}|${state.month}`));
    if (!templateId) continue;
    const item: BoardItem = { id: nextId(state, "v"), startupId: s.id, templateId, month: state.month, status: "open", asked: [], pretalks: [], cfo: false };
    state.items.push(item);
    const t = templateOf(templateId);
    const ceo = s.board.find((b) => b.seat === "ceo");
    mail(state, {
      kind: "founder",
      from: ceo ? `${ceo.name}, ${s.name}` : s.name,
      subject: `Vorlage für den Beirat: ${fill(t.title, s)}`,
      body: `${fill(t.pitch, s)} Bitte entscheidet bis Monatsende. Wenn der Beirat nicht tagt, entscheide ich allein.`,
      startupId: s.id,
    });
  }
}

export function closeMonth(state: GameState): MonthReport {
  const month = state.month;
  const notes: string[] = [];
  const cashBefore = state.cash;
  const reputationBefore = state.reputation;
  const valueBefore = portfolioValue(state);
  const before = new Map(state.startups.map((s) => [s.id, { revenue: s.metrics.revenue, cash: s.metrics.cash, valuation: valuation(s.metrics) }]));

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
  lapseItems(state, notes);
  const lines = new Map<string, string[]>();
  resolveEffects(state, month + 1, lines);
  const income: IncomeLines = { consulting: 0, boardFees: 0, payouts: 0, living: 0, interest: 0, rent: 0 };

  // Consulting booked this month is invoiced now.
  for (const gig of state.gigs.filter((g) => g.status === "booked" && g.month === month)) {
    state.cash += gig.fee;
    income.consulting += gig.fee;
    if (gig.reputation) state.reputation = Math.min(100, state.reputation + gig.reputation);
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
    // A corporation does not go bust over one decision: it draws on its credit line.
    if (s.corporate && s.metrics.cash < 5_000_000) s = applyDelta(s, { cash: 20_000_000, debt: 20_000_000 });
    const step = stepMonth(s, randomFor(state.seed, `step|${s.id}|${month}`));
    const texts = lines.get(s.id) ?? [];
    texts.push(...step.events);
    lines.set(s.id, texts);
    let next = step.startup;
    if (next.status === "dead") {
      state.reputation = Math.max(0, state.reputation - 3);
      notes.push(`${s.name} ist insolvent. Dein Anteil ist verloren.`);
    } else {
      const fee = next.corporate ? CORPORATE_FEE : boardFee(next.metrics);
      state.cash += fee;
      income.boardFees += fee;
    }
    next = { ...next, history: [...next.history, { month: month + 1, revenue: next.metrics.revenue, cash: next.metrics.cash, valuation: valuation(next.metrics), stake: next.stake }].slice(-36) };
    replaceStartup(state, next);
  }

  if (month >= NEWS_FROM_MONTH) publishNews(state, month, lines, notes);

  // Private side: living costs, rent, the stock market, the overdraft.
  state.cash -= LIVING_COSTS;
  income.living = -LIVING_COSTS;
  const rent = officeOf(state).rent;
  state.cash -= rent;
  income.rent = -rent;
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
  for (const c of state.contacts.filter((x) => x.met)) c.warmth = Math.max(0, c.warmth - WARMTH_DECAY);
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
  offerCorporateSeat(state);
  for (const g of state.gigs.filter((x) => x.status === "offered")) g.status = "expired";
  state.gigs = [
    ...state.gigs.filter((g) => g.month > state.month - 6),
    ...drawGigs(state.month, state.reputation, randomFor(state.seed, `gigs|${state.month}`), () => nextId(state, "g"), officeOf(state).extraGigs),
  ];

  state.daysUsed = 0;
  state.calendar = [];
  planAgenda(state);

  const report: MonthReport = {
    month,
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
    const strong = state.items.filter(
      (i) => i.startupId === s.id && i.decision && !i.decision.lapsed && i.decision.judgment === "strong" && i.decision.month > month - 3,
    ).length;
    if (strong === 0 || s.metrics.trust < 60) continue;
    replaceStartup(state, grantToPlayer(s, ADVISOR_SHARES));
    const text = `${s.name}: Für deine Arbeit im Beirat bekommst du ${ADVISOR_SHARES.toLocaleString("de-DE")} % Leistungsanteile.`;
    notes.push(text);
    mail(state, { kind: "founder", from: s.name, subject: "Leistungsanteile für dich", body: `${text} Gute Beiräte binden Firmen gern mit Anteilen.`, startupId: s.id });
  }
}

/** Companies running short of money raise a round; the shareholders' meeting decides. */
function planRounds(state: GameState): void {
  for (const s of state.startups.filter((x) => x.status === "active" && !x.corporate)) {
    if (state.month - s.joined < 2) continue;
    const blocked = state.rounds.some(
      (r) => r.startupId === s.id && (r.status === "open" || state.month - r.month < (r.amount === 0 ? FAILED_SEARCH_COOLDOWN : ROUND_COOLDOWN)),
    );
    if (blocked) continue;
    const runway = runwayMonths(s.metrics);
    if (!(runway < ROUND_RUNWAY && runway >= 1)) continue;
    const random = randomFor(state.seed, `round|${s.id}|${state.month}`);
    const mood = sentimentOf(state.market.regime);
    if (random() > fundability(s, mood)) {
      // Nobody wants in: the founders keep looking, the money keeps running out.
      state.rounds.push({ id: nextId(state, "r"), startupId: s.id, month: state.month, status: "failed", label: "Investorensuche", amount: 0, preMoney: 0, leadId: "", lead: "", down: false });
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
    if (state.month - s.joined < EXIT_MIN_AGE || s.flags.includes("round_open")) continue;
    const value = valuation(s.metrics);
    if (value < EXIT_MIN_VALUE) continue;
    if (state.exits.some((e) => e.startupId === s.id && (e.status === "open" || state.month - e.month < 6))) continue;
    if (openItems(state).some((i) => i.startupId === s.id && i.templateId === "acquisition")) continue;
    const random = randomFor(state.seed, `exit|${s.id}|${state.month}`);
    const chance = EXIT_CHANCE * (1 + mood * 0.6) * (s.metrics.growth > 0.03 ? 1.4 : 1);
    if (random() > chance) continue;
    const buyers = [s.names.acquirer, ...BUYERS];
    const buyer = buyers[Math.floor(random() * buyers.length) % buyers.length]!;
    const price = Math.round((value * (0.8 + random() * 0.7 + mood * 0.1)) / 10_000) * 10_000;
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
      replaceStartup(state, applyDelta(startupOf(state, t.id), pick.delta));
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
function offerCorporateSeat(state: GameState): void {
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
