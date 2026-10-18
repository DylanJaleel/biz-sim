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
} from "./config";
import { templateOf, TEMPLATES } from "./content";
import { judge, bestVote, outlook, VOTES } from "./judge";
import { CURRICULUM } from "./lessons";
import { baseStances, buildMeeting, type MeetingPlayback } from "./meeting";
import { applyDelta, stepMonth, valuation } from "./sim";
import { definitionOf, offerStartup, STARTUPS } from "./startups";
import { fill } from "./templates";
import type {
  ActionKind,
  BoardItem,
  Delta,
  GameAction,
  GameState,
  Mail,
  MonthReport,
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
    version: 1,
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
  | { kind: "report"; report: MonthReport };

function spendDays(state: GameState, kind: Exclude<ActionKind, "decline" | "readMail" | "closeMonth">, label: string): void {
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
      if (state.cash < s.offer.ticket) throw new GameRuleError("Dafür reicht dein Privatkapital nicht.");
      spendDays(state, "invest", `Beteiligung ${s.name}`);
      state.cash -= s.offer.ticket;
      s.status = "active";
      s.stake = s.offer.stake;
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
  }
}

function replaceStartup(state: GameState, next: Startup): void {
  const index = state.startups.findIndex((s) => s.id === next.id);
  state.startups[index] = next;
}

function unlockLesson(state: GameState, id: string): void {
  if (!state.lessons.includes(id)) state.lessons.push(id);
}

/** Applies a delta that may touch the player too (cash, reputation, exit). */
function applyFull(state: GameState, s: Startup, delta: Delta, texts: string[], text?: string): Startup {
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

export function describeMonth(state: GameState): string {
  return monthLabel(state.month);
}
