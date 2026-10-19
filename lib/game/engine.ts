import {
  ACTION_DAYS,
  BOARD_FEE,
  DAYS_PER_MONTH,
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
} from "./config";
import { applyRound, capTableAfterEntry, fundability, playerAmount, roundTerms, sellers, shareholderVote, grantToPlayer, transferToPlayer } from "./captable";
import { contactDef, initialContacts, ringOpen } from "./network";
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
  GameAction,
  GameState,
  GvVote,
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
    version: 2,
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
  };
  mail(state, {
    kind: "system",
    from: "Boardroom",
    subject: "Willkommen in deinem Büro",
    body:
      "Du hast 150.000 € Privatkapital und den Wunsch, mehr zu bewegen als ein Sparbuch. Zwei Gründer suchen einen Angel. Prüfe die Angebote, investiere in eines und begleite die Firma im Beirat. Jeder Monat hat 20 Arbeitstage. Wofür du sie nutzt, entscheidest du.",
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
  const state = input as GameState & { version: number };
  if (state.version >= 2) return state;
  for (const s of state.startups) {
    if (!s.capTable) s.capTable = capTableAfterEntry(definitionOf(s.id).capTable, s.stake);
  }
  return {
    ...state,
    version: 2,
    rounds: state.rounds ?? [],
    shareOffers: state.shareOffers ?? [],
    contacts: state.contacts ?? initialContacts(),
    ledRounds: state.ledRounds ?? 0,
  };
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
  return DAYS_PER_MONTH - state.daysUsed;
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
  | { kind: "round"; roundId: string };

function spendDays(state: GameState, kind: keyof typeof ACTION_DAYS, label: string): void {
  const days = ACTION_DAYS[kind];
  if (state.daysUsed + days > DAYS_PER_MONTH) {
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
      spendDays(state, "dd", `Prüfung ${s.name}`);
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
      s.capTable = capTableAfterEntry(definitionOf(s.id).capTable, stake);
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
      spendDays(state, "question", `Rückfrage ${startupOf(state, item.startupId).name}`);
      item.asked.push(action.questionId);
      return { state, result: { kind: "none" } };
    }
    case "cfo": {
      const item = requireOpenItem(state, action.itemId);
      if (item.cfo) throw new GameRuleError("Der CFO hat die Vorlage schon durchgerechnet.");
      spendDays(state, "cfo", `CFO-Gespräch ${startupOf(state, item.startupId).name}`);
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
      if (s.status !== "active") throw new GameRuleError("Du bist an dieser Firma nicht beteiligt.");
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
      if (s.status !== "active") throw new GameRuleError("Du bist an dieser Firma nicht beteiligt.");
      spendDays(state, "introContact", `${def.name} für ${s.name}`);
      c.warmth = Math.max(0, c.warmth - WARMTH_INTRO_COST);
      c.lastIntro = state.month;
      state.reputation = Math.min(100, state.reputation + 1);
      unlockLesson(state, "netzwerk");
      introduce(state, s, def.id);
      return { state, result: { kind: "none" } };
    }
  }
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
  state.cash -= invested;
  // New money makes bridge loans and seed offers on the agenda obsolete.
  const obsolete = state.items.filter((i) => i.startupId === s.id && i.status === "open" && FUNDING_TEMPLATES.includes(i.templateId));
  if (obsolete.length > 0) {
    state.items = state.items.filter((i) => !obsolete.includes(i));
    notes.push(`${s.name}: Die Vorlage zur Finanzierung ist mit der Runde erledigt.`);
  }
  const before = s.stake;
  s = applyRound(s, round, invested);
  if (vote === "go") s = applyDelta(s, { trust: 3 });
  replaceStartup(state, s);
  round.status = "closed";
  round.playerAmount = invested;
  round.stakeAfter = s.stake;
  if (take === "lead") {
    state.ledRounds += 1;
    state.reputation = Math.min(100, state.reputation + LEAD_REPUTATION_GAIN);
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
    const payout = (s.stake / 100) * delta.exit;
    state.cash += payout;
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
  const candidates = TEMPLATES.filter((t) => {
    if (!t.when(s, age)) return false;
    const last = used.filter((i) => i.templateId === t.id).sort((a, b) => b.month - a.month)[0];
    if (!last) return true;
    return t.repeatAfter !== undefined && state.month - last.month >= t.repeatAfter;
  });
  const urgent = candidates.filter((t) => t.urgent);
  if (urgent.length > 0) return urgent[0]!.id;
  if (candidates.length === 0) return null;
  const quarterly = state.month % 3 === 0;
  if (age > 1 && !quarterly && random() > 0.6) return null;
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
  lapseItems(state, notes);
  const lines = new Map<string, string[]>();
  resolveEffects(state, month + 1, lines);

  for (const s of state.startups.filter((x) => x.status === "active")) {
    const step = stepMonth(s, randomFor(state.seed, `step|${s.id}|${month}`));
    const texts = lines.get(s.id) ?? [];
    texts.push(...step.events);
    lines.set(s.id, texts);
    let next = step.startup;
    if (next.status === "dead") {
      state.reputation = Math.max(0, state.reputation - 3);
      notes.push(`${s.name} ist insolvent. Dein Anteil ist verloren.`);
    } else {
      state.cash += BOARD_FEE;
    }
    next = { ...next, history: [...next.history, { month: month + 1, revenue: next.metrics.revenue, cash: next.metrics.cash, valuation: valuation(next.metrics), stake: next.stake }].slice(-36) };
    replaceStartup(state, next);
  }

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
        };
      }),
    playerCash: state.cash,
    playerCashBefore: cashBefore,
    reputation: state.reputation,
    reputationBefore,
    portfolioValue: portfolioValue(state),
    portfolioValueBefore: valueBefore,
    notes,
  };
  state.reports.unshift(report);
  if (state.reports.length > 24) state.reports.length = 24;
  return report;
}

/** Every quarter, strong board work earns a few new shares. */
function grantAdvisorShares(state: GameState, month: number, notes: string[]): void {
  for (const s of state.startups.filter((x) => x.status === "active")) {
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
  for (const s of state.startups.filter((x) => x.status === "active")) {
    if (state.month - s.joined < 2) continue;
    const blocked = state.rounds.some(
      (r) => r.startupId === s.id && (r.status === "open" || state.month - r.month < (r.amount === 0 ? FAILED_SEARCH_COOLDOWN : ROUND_COOLDOWN)),
    );
    if (blocked) continue;
    const runway = runwayMonths(s.metrics);
    if (!(runway < ROUND_RUNWAY && runway >= 1)) continue;
    const random = randomFor(state.seed, `round|${s.id}|${state.month}`);
    if (random() > fundability(s)) {
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
    const terms = roundTerms(s, done, random);
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

export function describeMonth(state: GameState): string {
  return monthLabel(state.month);
}
