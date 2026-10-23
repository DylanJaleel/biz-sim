import { playerAmount, postMoney, stakeAfter, syndicateAmount, waterfall } from "./captable";
import { outcomeViews, type OutcomeView } from "./cfo";
import {
  ACTION_DAYS,
  BUYOUT_REPUTATION,
  BUYOUT_WORTH,
  CORPORATE_REPUTATION,
  FAMILY_OFFICE_COST,
  FAMILY_OFFICE_REPUTATION,
  FAMILY_OFFICE_WORTH,
  INTRO_COOLDOWN,
  LEAD_REPUTATION,
  RING_REPUTATION,
  SYNDICATE_REPUTATION,
  TEAM_MAX,
  FUND_EXITS,
  FUND_OFFICE_MONTHS,
  FUND_REPUTATION,
  WARMTH_INTRO_MIN,
  monthName,
} from "./config";
import { careerOf } from "./career";
import {
  covenantOptions,
  covenantPrep,
  covenantReview,
  followUpsOf,
  type CovenantOptionView,
  type CovenantPrepView,
  type CovenantReviewView,
  type FollowUpView,
} from "./covenant-views";
import { CONTACTS, RING_LABEL, ringOpen, type ContactDef, type Ring } from "./network";
import { templateOf } from "./content";
import { daysLeft, fundBlocker, fundSize, itemOf, netWorth, previewMeeting, sittingToday, startupOf, syndicateBlocker } from "./engine";
import { lessonOf } from "./lessons";
import { OFFICES, officeOf } from "./office";
import type { MeetingEvent } from "./meeting";
import { monthlyCashFlow, runwayMonths } from "./sim";
import { fill, valueOf as valuationOf } from "./templates";
import type {
  BoardItem,
  BoardMember,
  ExitOffer,
  FundState,
  GameAction,
  GameState,
  Holder,
  Interest,
  ItemStatus,
  Loan,
  Lockup,
  MeetingDecision,
  Payout,
  Round,
  RoundTake,
  ShareOffer,
  Startup,
  TeamMember,
  TeamRole,
  Vote,
  PaceKind,
} from "./types";

// Was eine Seite vom Spielstand braucht, als einfache Daten für den Browser.

export interface MeetingView {
  itemId: string;
  startupId: string;
  startupName: string;
  /** A supervisory board meeting in the corporation. */
  corporate: boolean;
  /** A family business the player bought. */
  family: boolean;
  board: BoardMember[];
  title: string;
  motion: string;
  context: string;
  outcomes: Record<Vote, { label: string; summary: string }>;
  args: { id: string; text: string; toward: Vote; appeals: Interest[] }[];
  /** Opening and statements, up to the moment the player speaks. */
  opening: MeetingEvent[];
  /** The debate after each possible argument; key "none" for staying silent. */
  debates: Record<string, MeetingEvent[]>;
  status: ItemStatus;
  decision?: MeetingDecision;
  result?: BoardItem["result"];
  lesson: { id: string; title: string; summary: string; rule?: string };
  daysLeft: number;
  prepared: { cfo: boolean; asked: number; pretalks: string[] };
  /** This month's agenda of the company, with the current item's position. */
  agenda: { id: string; title: string; status: ItemStatus; current: boolean }[];
  /** The next open item on the agenda, if any. */
  nextItemId: string | null;
  /** The board already met this month: this item costs no extra day. */
  sitting: boolean;
  /** The three conditions on offer. */
  covenants: CovenantOptionView[];
  /** After the decision: which condition fitted and how the options compared (missing in older games). */
  covenantReview?: CovenantReviewView;
  /** Month name until which the chosen condition needs its follow-up meeting. */
  followUp?: string;
}

export function meetingView(state: GameState, itemId: string): MeetingView {
  const item = itemOf(state, itemId);
  const s = startupOf(state, item.startupId);
  const t = templateOf(item.templateId);
  const lesson = lessonOf(t.lesson);
  const outcomes = {} as MeetingView["outcomes"];
  for (const v of ["go", "conditions", "no"] as const) outcomes[v] = { label: fill(t.outcomes[v].label, s), summary: fill(t.outcomes[v].summary, s) };

  // This month's agenda: what is still open and what was decided this month.
  const agendaItems = state.items.filter((i) => i.startupId === s.id && (i.status === "open" || (i.decision && !i.decision.lapsed && i.decision.month === state.month)));
  let opening: MeetingEvent[] = [];
  const debates: Record<string, MeetingEvent[]> = {};
  if (item.status === "open" && s.status === "active") {
    const preview = previewMeeting(state, itemId);
    opening = preview.events;
    for (const key of [...t.arguments.map((a) => a.id), "none"]) {
      const p = previewMeeting(state, itemId, key === "none" ? null : key);
      debates[key] = p.events.slice(p.pauseForArgument);
    }
  }

  return {
    itemId,
    startupId: s.id,
    startupName: s.name,
    corporate: Boolean(s.corporate),
    family: s.flags.includes("mittelstand"),
    board: s.board,
    title: fill(t.title, s),
    motion: fill(t.motion, s),
    context: fill(t.context(s), s),
    outcomes,
    args: t.arguments.map((a) => ({ id: a.id, text: fill(a.text, s), toward: a.toward, appeals: a.appeals })),
    opening,
    debates,
    status: item.status,
    decision: item.decision,
    result: item.result,
    lesson: { id: lesson.id, title: lesson.title, summary: lesson.summary, rule: lesson.rule },
    daysLeft: daysLeft(state),
    prepared: { cfo: item.cfo, asked: item.asked.length, pretalks: item.pretalks },
    agenda: agendaItems.map((i) => ({ id: i.id, title: fill(templateOf(i.templateId).title, s), status: i.status, current: i.id === itemId })),
    nextItemId: agendaItems.find((i) => i.status === "open" && i.id !== itemId)?.id ?? null,
    sitting: sittingToday(state, s),
    covenants: covenantOptions(state, item),
    ...(item.decision ? { covenantReview: covenantReview(state, item, item.decision) } : {}),
    ...(item.followUp && !item.followUp.done && !item.followUp.missed ? { followUp: monthName(item.followUp.until) } : {}),
  };
}

export interface DeskTask {
  text: string;
  href: string;
  tone: "urgent" | "normal" | "calm";
}

export interface DeskView {
  month: number;
  daysLeft: number;
  unread: number;
  offers: number;
  mandates: { id: string; name: string; value: number; open: boolean; pace: PaceKind }[];
  openItems: { id: string; startupId: string; startupName: string; title: string }[];
  lessons: number;
  lessonsTotal: number;
  tasks: DeskTask[];
  calendar: GameState["calendar"];
}

/** What lies on the desk, and what the assistant would point out first. */
export function deskView(state: GameState, lessonsTotal: number): DeskView {
  const active = state.startups.filter((s) => s.status === "active");
  const offered = state.startups.filter((s) => s.status === "offered");
  const open = state.items.filter((i) => i.status === "open");
  const tasks: DeskTask[] = [];
  for (const r of state.rounds.filter((x) => x.status === "open")) {
    const s = startupOf(state, r.startupId);
    tasks.push({
      text: `${s.name}: ${r.label} über ${r.amount.toLocaleString("de-DE")} €. Die Gesellschafterversammlung entscheidet bis Monatsende, ob mit dir oder ohne dich.`,
      href: `/gv/${r.id}`,
      tone: "urgent",
    });
  }
  for (const e of state.exits.filter((x) => x.status === "open")) {
    const s = startupOf(state, e.startupId);
    tasks.push({
      text: `${e.buyer} will ${s.name} für ${e.price.toLocaleString("de-DE")} € kaufen. Die Gesellschafter entscheiden bis Monatsende.`,
      href: `/verkauf/${e.id}`,
      tone: "urgent",
    });
  }
  if (state.corporateSeat === "offered") {
    const m = state.mails.find((x) => x.action === "corporate");
    tasks.push({ text: "Die Nordhafen AG bietet dir einen Sitz im Aufsichtsrat an.", href: m ? `/post?mail=${m.id}` : "/post", tone: "normal" });
  }
  for (const o of state.shareOffers.filter((x) => x.status === "open")) {
    const s = startupOf(state, o.startupId);
    tasks.push({
      text: `${o.sellerName} bietet ${o.pct.toLocaleString("de-DE")} % an ${s.name} für ${o.price.toLocaleString("de-DE")} €.`,
      href: `/firma/${s.id}#anteile`,
      tone: "normal",
    });
  }
  for (const f of followUpsOf(state).filter((x) => x.ready)) {
    tasks.push({
      text: `${f.startupName}: Folgetermin zur Auflage „${f.covenant}“ (${f.title}). Ein Tag, bis Ende ${monthName(f.until)}. Ohne Nachprüfung wirkt die Auflage nur zum Teil.`,
      href: `/firma/${f.startupId}#folgetermine`,
      tone: f.until <= state.month ? "urgent" : "normal",
    });
  }
  for (const s of active.filter((x) => open.some((i) => i.startupId === x.id))) {
    const agenda = open.filter((i) => i.startupId === s.id);
    const board = s.corporate ? "Aufsichtsrat" : "Beirat";
    const urgent = agenda.some((i) => templateOf(i.templateId).urgent);
    const prep = agenda.some((i) => i.cfo || i.asked.length > 0 || i.pretalks.length > 0);
    const titles = agenda.map((i) => `„${fill(templateOf(i.templateId).title, s)}“`).join(", ");
    tasks.push({
      text:
        agenda.length > 1
          ? `${s.name}: ${agenda.length} Punkte auf der Tagesordnung (${titles}).${s.pace?.kind === "busy" ? ` Gerade ist viel los. ${s.pace.reason ?? ""}` : ""} Deine Tage reichen kaum für alles: Was bereitest du vor?`
          : `${s.name}: ${titles} liegt vor. ${prep ? "Wenn du so weit bist, berufe die Sitzung ein." : `Bereite dich vor, bevor der ${board} tagt.`}`,
      href: `/firma/${s.id}`,
      tone: urgent ? "urgent" : "normal",
    });
  }
  for (const s of offered) {
    const expires = s.offer!.expires - state.month;
    tasks.push({
      text: `${s.name} sucht ${s.offer!.buyout ? "eine Nachfolge" : s.stage ? `Geld (${s.stage})` : "einen Angel"}: ${s.offer!.stake} % für ${s.offer!.ticket.toLocaleString("de-DE")} €. ${s.offer!.ddDone ? "Geprüft." : "Noch ungeprüft."} ${expires <= 0 ? "Letzter Monat." : `Noch ${expires + 1} Monate.`}`,
      href: `/post?firma=${s.id}`,
      tone: expires <= 0 ? "urgent" : "normal",
    });
  }
  const step = nextStepView(state);
  if (step?.action) tasks.unshift({ text: `Alles bereit: ${step.action.label}. Das ist dein nächster Karriereschritt.`, href: "/holding", tone: "urgent" });
  const unread = state.mails.filter((m) => !m.read).length;
  if (unread > 0 && offered.length === 0) tasks.push({ text: `${unread} ungelesene Nachrichten in der Post.`, href: "/post", tone: "calm" });
  if (active.length === 0 && offered.length === 0) {
    tasks.push({ text: "Gerade liegt kein Angebot vor. Schließe den Monat ab, neue Anfragen kommen.", href: "/post", tone: "calm" });
  }
  if (tasks.length === 0) {
    tasks.push({
      text: "Alles erledigt. Nutze freie Tage für Gespräche mit den Gründungen oder eine Weiterbildung, dann schließe den Monat ab.",
      href: "/notizbuch",
      tone: "calm",
    });
  }
  return {
    month: state.month,
    daysLeft: daysLeft(state),
    unread,
    offers: offered.length,
    mandates: active
      .filter((s) => !s.corporate)
      .map((s) => ({ id: s.id, name: s.name, value: (s.stake / 100) * valuationOf(s), open: open.some((i) => i.startupId === s.id), pace: s.pace?.kind ?? "normal" })),
    openItems: open.map((i) => {
      const s = startupOf(state, i.startupId);
      return { id: i.id, startupId: s.id, startupName: s.name, title: fill(templateOf(i.templateId).title, s) };
    }),
    lessons: state.lessons.length,
    lessonsTotal,
    tasks,
    calendar: state.calendar,
  };
}

export interface MemberView extends BoardMember {
  pretalked: boolean;
  /** Only after a talk: where the member stands on the open item. */
  leaning?: Vote | "open";
}

export interface CompanyItemView {
  id: string;
  title: string;
  motion: string;
  context: string;
  urgent: boolean;
  questions: { id: string; q: string; a?: string }[];
  cfo: boolean;
  outcomes: (OutcomeView & { summary: string })[] | null;
  outcomeLabels: Record<Vote, string>;
  lesson: string;
  /** Carried over from last month. */
  postponed: boolean;
  /** Who the player can talk to before the meeting, and what they let on. */
  members: { seat: BoardMember["seat"]; short: string; pretalked: boolean; leaning?: Vote | "open" }[];
  /** The three conditions, the risk question, hints and the CFO's numbers for them. */
  covenants: CovenantPrepView;
}

export interface CompanyView {
  startup: Startup;
  valuation: number;
  stakeValue: number;
  cashFlow: number;
  runway: number;
  board: MemberView[];
  /** The first open item (kept for older callers). */
  item: CompanyItemView | null;
  /** Everything on this month's agenda, in order. */
  agenda: CompanyItemView[];
  /** The board already met this month: further items cost no extra day. */
  sitting: boolean;
  past: {
    id: string;
    month: number;
    title: string;
    status: ItemStatus;
    outcome?: Vote;
    vote?: Vote;
    judgment?: MeetingDecision["judgment"];
    outcomeLabel?: string;
    result?: BoardItem["result"];
    delegated?: boolean;
  }[];
  /** The associate who looks after this mandate. */
  associate?: string;
  calledThisMonth: boolean;
  askedThisMonth: boolean;
  daysLeft: number;
  round: Round | null;
  rounds: Round[];
  offers: ShareOffer[];
  exits: ExitOffer[];
  /** An analyst in the office prepares CFO talks and questions. */
  analyst: boolean;
  /** Conditions decided earlier that still need their follow-up meeting. */
  followUps: FollowUpView[];
}

function leaningOf(stance: number): Vote | "open" {
  if (stance >= 0.35) return "go";
  if (stance <= -0.25) return "no";
  return Math.abs(stance) < 0.12 ? "open" : "conditions";
}

export function companyView(state: GameState, startupId: string): CompanyView {
  const s = startupOf(state, startupId);
  const openOnes = s.status === "active" ? state.items.filter((i) => i.startupId === s.id && i.status === "open") : [];
  const agenda: CompanyItemView[] = openOnes.map((open) => {
    const t = templateOf(open.templateId);
    const stances = previewMeeting(state, open.id).stancesBefore;
    const views = open.cfo ? outcomeViews(t, s) : null;
    return {
      id: open.id,
      title: fill(t.title, s),
      motion: fill(t.motion, s),
      context: fill(t.context(s), s),
      urgent: Boolean(t.urgent),
      questions: t.questions.map((q) => ({ id: q.id, q: fill(q.q, s), a: open.asked.includes(q.id) ? fill(q.a(s), s) : undefined })),
      cfo: open.cfo,
      outcomes: views ? views.map((v) => ({ ...v, summary: fill(t.outcomes[v.vote].summary, s) })) : null,
      outcomeLabels: { go: fill(t.outcomes.go.label, s), conditions: fill(t.outcomes.conditions.label, s), no: fill(t.outcomes.no.label, s) },
      lesson: lessonOf(t.lesson).title,
      postponed: Boolean(open.postponed),
      members: s.board.map((m) => {
        const pretalked = open.pretalks.includes(m.seat);
        return { seat: m.seat, short: m.short, pretalked, leaning: pretalked ? leaningOf(stances[m.seat]!) : undefined };
      }),
      covenants: covenantPrep(state, open),
    };
  });
  const item = agenda[0] ?? null;
  const board: MemberView[] = s.board.map((m) => {
    const first = item?.members.find((x) => x.seat === m.seat);
    return { ...m, pretalked: Boolean(first?.pretalked), leaning: first?.leaning };
  });
  const past = state.items
    .filter((i) => i.startupId === s.id && i.status !== "open")
    .sort((a, b) => b.month - a.month)
    .map((i) => {
      const t = templateOf(i.templateId);
      return {
        id: i.id,
        month: i.month,
        title: fill(t.title, s),
        status: i.status,
        outcome: i.decision?.outcome,
        vote: i.decision?.lapsed ? undefined : i.decision?.vote,
        judgment: i.decision?.lapsed ? undefined : i.decision?.judgment,
        outcomeLabel: i.decision ? fill(t.outcomes[i.decision.outcome].label, s) : undefined,
        result: i.result,
        delegated: i.decision?.delegated,
      };
    });
  return {
    startup: s,
    valuation: valuationOf(s),
    stakeValue: (s.stake / 100) * valuationOf(s),
    cashFlow: monthlyCashFlow(s.metrics),
    runway: runwayMonths(s.metrics),
    board,
    item,
    agenda,
    sitting: sittingToday(state, s),
    past,
    calledThisMonth: state.calendar.some((c) => c.kind === "founderCall" && c.label.endsWith(s.name)),
    askedThisMonth: state.calendar.some((c) => c.kind === "askShares" && c.label.endsWith(s.name)),
    daysLeft: daysLeft(state),
    round: state.rounds.find((r) => r.startupId === s.id && r.status === "open") ?? null,
    rounds: state.rounds.filter((r) => r.startupId === s.id && r.amount > 0 && r.status !== "open").sort((a, b) => b.month - a.month),
    offers: state.shareOffers.filter((o) => o.startupId === s.id && o.status === "open"),
    exits: state.exits.filter((e) => e.startupId === s.id),
    associate: state.team.find((m) => m.role === "associate" && m.mandate === s.id)?.name,
    analyst: officeOf(state).analyst,
    followUps: followUpsOf(state, s.id),
  };
}

// ---------------------------------------------------------------------------
// Phase 2: rounds, shares, network
// ---------------------------------------------------------------------------

export interface RoundOption {
  take: RoundTake;
  label: string;
  amount: number;
  stakeAfter: number;
  /** Value of the player's stake right after the round (post-money × stake). */
  valueAfter: number;
  allowed: boolean;
  reason?: string;
  /** Money the syndicate brings on top (syndicate option only). */
  syndicate?: number;
}

export interface RoundView {
  round: Round;
  startupId: string;
  startupName: string;
  stake: number;
  postMoney: number;
  valueNow: number;
  holders: Holder[];
  options: RoundOption[];
  cash: number;
  reputation: number;
  daysLeft: number;
}

const TAKE_LABEL: Record<RoundTake, string> = {
  none: "Nicht mitziehen",
  half: "Halb pro rata",
  prorata: "Pro rata",
  lead: "Runde anführen",
  syndicate: "Mit Syndikat anführen",
};

export function roundView(state: GameState, roundId: string): RoundView | null {
  const round = state.rounds.find((r) => r.id === roundId);
  if (!round || round.amount === 0) return null;
  const s = startupOf(state, round.startupId);
  const stake = round.status === "open" ? s.stake : (round.stakeBefore ?? s.stake);
  const post = postMoney(round);
  const options: RoundOption[] = (["none", "half", "prorata", "lead", "syndicate"] as const).map((take) => {
    const amount = playerAmount(round, stake, take);
    const after = stakeAfter(round, stake, take);
    let reason: string | undefined;
    if (take === "lead" && state.reputation < LEAD_REPUTATION) reason = `Ab ${LEAD_REPUTATION} Ruf`;
    else if (take === "syndicate" && syndicateBlocker(state)) reason = state.reputation < SYNDICATE_REPUTATION ? `Ab ${SYNDICATE_REPUTATION} Ruf` : "Angel-Club zu kühl";
    else if (amount > state.cash) reason = "Zu wenig Kapital";
    const syndicate = take === "syndicate" ? syndicateAmount(round, stake) : undefined;
    return { take, label: TAKE_LABEL[take], amount, stakeAfter: after, valueAfter: (post * after) / 100, allowed: !reason, reason, syndicate };
  });
  return {
    round,
    startupId: s.id,
    startupName: s.name,
    stake,
    postMoney: post,
    valueNow: (valuationOf(s) * stake) / 100,
    holders: s.capTable,
    options,
    cash: state.cash,
    reputation: state.reputation,
    daysLeft: daysLeft(state),
  };
}

export interface ExitView {
  offer: ExitOffer;
  startupId: string;
  startupName: string;
  stake: number;
  /** Today's value of the whole company. */
  value: number;
  holders: Holder[];
  /** Who gets what at the offered price (or what was paid). */
  payouts: Payout[];
  carry: number;
  daysLeft: number;
}

export function exitView(state: GameState, exitId: string): ExitView | null {
  const offer = state.exits.find((e) => e.id === exitId);
  if (!offer) return null;
  const s = startupOf(state, offer.startupId);
  const split = offer.payouts ? { payouts: offer.payouts, carry: offer.carry ?? 0 } : waterfall(s, offer.price);
  return {
    offer,
    startupId: s.id,
    startupName: s.name,
    stake: s.stake,
    value: valuationOf(s),
    holders: s.capTable,
    payouts: split.payouts,
    carry: split.carry,
    daysLeft: daysLeft(state),
  };
}

export interface ContactView extends ContactDef {
  warmth: number;
  met: boolean;
  open: boolean;
  /** Months until the next favour is possible; 0 = now. */
  cooldown: number;
  canIntro: boolean;
}

export interface NetworkView {
  contacts: ContactView[];
  reputation: number;
  mandates: { id: string; name: string }[];
  daysLeft: number;
  rings: { ring: Ring; label: string; open: boolean; needs: number }[];
}

export function networkView(state: GameState): NetworkView {
  const contacts = CONTACTS.map((def) => {
    const c = state.contacts.find((x) => x.id === def.id) ?? { id: def.id, warmth: 0, met: false };
    const open = ringOpen(state, def.ring);
    const cooldown = c.lastIntro === undefined ? 0 : Math.max(0, INTRO_COOLDOWN - (state.month - c.lastIntro));
    return { ...def, warmth: c.warmth, met: c.met, open, cooldown, canIntro: open && c.met && c.warmth >= WARMTH_INTRO_MIN && cooldown === 0 };
  });
  return {
    contacts,
    reputation: state.reputation,
    mandates: state.startups.filter((s) => s.status === "active" && !s.corporate).map((s) => ({ id: s.id, name: s.name })),
    daysLeft: daysLeft(state),
    rings: ([1, 2, 3] as const).map((ring) => ({ ring, label: RING_LABEL[ring], open: ringOpen(state, ring), needs: RING_REPUTATION[ring] })),
  };
}

// ---------------------------------------------------------------------------
// Phase 4: family office, team, fund, loans, lockups
// ---------------------------------------------------------------------------

export interface Requirement {
  label: string;
  done: boolean;
}

export interface HoldingView {
  founded: boolean;
  foundRequirements: Requirement[];
  worth: number;
  cash: number;
  team: (TeamMember & { mandateName?: string })[];
  canHire: Record<TeamRole, boolean>;
  mandates: { id: string; name: string }[];
  fund?: FundState;
  fundBlocker: string | null;
  fundSize: number;
  loans: Loan[];
  lockups: (Lockup & { value: number })[];
  dividendCompanies: { id: string; name: string; stake: number }[];
  daysLeft: number;
}

export function holdingView(state: GameState): HoldingView {
  const worth = netWorth(state);
  const active = state.startups.filter((s) => s.status === "active");
  return {
    founded: state.familyOffice !== undefined,
    foundRequirements: [
      { label: `${FAMILY_OFFICE_REPUTATION} Ruf (du: ${state.reputation})`, done: state.reputation >= FAMILY_OFFICE_REPUTATION },
      { label: `${FAMILY_OFFICE_WORTH.toLocaleString("de-DE")} € Vermögen (du: ${Math.round(worth).toLocaleString("de-DE")} €)`, done: worth >= FAMILY_OFFICE_WORTH },
      { label: "Büroetage mit Analyst oder höher", done: state.office >= 3 },
      { label: `${FAMILY_OFFICE_COST.toLocaleString("de-DE")} € für Gründung und Anwälte`, done: state.cash >= FAMILY_OFFICE_COST },
    ],
    worth,
    cash: state.cash,
    team: state.team.map((m) => ({ ...m, mandateName: m.mandate ? state.startups.find((s) => s.id === m.mandate)?.name : undefined })),
    canHire: {
      associate: state.team.filter((m) => m.role === "associate").length < TEAM_MAX.associate,
      partner: state.team.filter((m) => m.role === "partner").length < TEAM_MAX.partner,
    },
    mandates: active.map((s) => ({ id: s.id, name: s.name })),
    fund: state.fund,
    fundBlocker: fundBlocker(state),
    fundSize: fundSize(state),
    loans: state.loans,
    lockups: state.lockups.map((l) => ({ ...l, value: l.amount * (state.market.prices.tech / l.index) })),
    dividendCompanies: active
      .filter((s) => !s.corporate && s.stake + s.capTable.filter((h) => h.kind === "fund").reduce((sum, h) => sum + h.pct, 0) > 50)
      .map((s) => ({ id: s.id, name: s.name, stake: s.stake })),
    daysLeft: daysLeft(state),
  };
}

// ---------------------------------------------------------------------------
// Nächster Karriereschritt: was fehlt, wie weit du bist, und der Knopf.
// ---------------------------------------------------------------------------

export interface NextStepView {
  title: string;
  text: string;
  requirements: Requirement[];
  /** The move that takes the step, once everything is there. */
  action?: { move: GameAction; label: string; days: number };
  /** Where to go instead, when the step comes from outside (a mail, a round). */
  link?: { href: string; label: string };
  /** A step on the way that the player can take now (e.g. moving offices). */
  side?: { move: GameAction; label: string; text: string; ready: boolean };
}

export function nextStepView(state: GameState): NextStepView | null {
  const worth = netWorth(state);
  const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
  const career = careerOf(state);
  const next = career.steps.find((s) => !s.done && !s.later && !s.side);
  if (!next) return null;
  switch (next.title) {
    case "Business Angel":
      return {
        title: next.title,
        text: "Steig bei einem Startup ein. Angebote liegen in der Post, prüfe sie vorher.",
        requirements: [{ label: "Ein Angebot annehmen", done: false }],
        link: { href: "/post", label: "Zur Post" },
      };
    case "Lead-Investor": {
      const round = state.rounds.find((r) => r.status === "open");
      return {
        title: next.title,
        text: "Führe eine Finanzierungsrunde an. Runden kommen, wenn einer deiner Firmen das Geld ausgeht.",
        requirements: [
          { label: `${LEAD_REPUTATION} Ruf (du: ${state.reputation})`, done: state.reputation >= LEAD_REPUTATION },
          { label: "Eine Runde in deinem Portfolio ist offen", done: !!round },
        ],
        link: round ? { href: `/gv/${round.id}`, label: "Zur Runde" } : undefined,
      };
    }
    case "Mehrheitsgesellschafter":
      return {
        title: next.title,
        text: "Kauf die Mehrheit an einem Familienbetrieb, der eine Nachfolge sucht. Solche Angebote kommen in die Post.",
        requirements: [
          { label: `${BUYOUT_REPUTATION} Ruf (du: ${state.reputation})`, done: state.reputation >= BUYOUT_REPUTATION },
          { label: `${eur(BUYOUT_WORTH)} Vermögen (du: ${eur(worth)})`, done: worth >= BUYOUT_WORTH },
          { label: "Ein Nachfolge-Angebot liegt vor", done: state.startups.some((s) => s.status === "offered" && s.offer?.buyout) },
        ],
        link: { href: "/post", label: "Zur Post" },
      };
    case "Konzern-Aufsichtsrat": {
      const record = state.ledRounds > 0 || state.startups.some((s) => s.stake > 50) || state.exits.some((e) => e.status === "accepted");
      return {
        title: next.title,
        text: "Die Nordhafen AG fragt an, sobald du genug Ruf und Erfolge hast. Die Anfrage kommt per Post.",
        requirements: [
          { label: `${CORPORATE_REPUTATION} Ruf (du: ${state.reputation})`, done: state.reputation >= CORPORATE_REPUTATION },
          { label: "Eine Runde angeführt, eine Mehrheit oder ein Verkauf", done: record },
        ],
        link: state.corporateSeat === "offered" ? { href: "/post", label: "Anfrage beantworten" } : undefined,
      };
    }
    case "Family Office": {
      const requirements: Requirement[] = [
        { label: `${FAMILY_OFFICE_REPUTATION} Ruf (du: ${state.reputation})`, done: state.reputation >= FAMILY_OFFICE_REPUTATION },
        { label: `${eur(FAMILY_OFFICE_WORTH)} Vermögen (du: ${eur(worth)})`, done: worth >= FAMILY_OFFICE_WORTH },
        { label: "Büroetage mit Analyst (Stufe 3) oder höher", done: state.office >= 3 },
        { label: `${eur(FAMILY_OFFICE_COST)} auf dem Konto für Notar und Anwälte`, done: state.cash >= FAMILY_OFFICE_COST },
      ];
      const floor = OFFICES[3]!;
      const side =
        state.office < 3
          ? {
              move: { type: "moveOffice", level: 3 } as GameAction,
              label: `Umziehen: ${floor.name}`,
              text: `Braucht ${floor.reputation} Ruf und ${eur(floor.worth)} Vermögen, ${eur(floor.rent)} Miete im Monat.`,
              ready: state.reputation >= floor.reputation && worth >= floor.worth && state.cash >= floor.rent,
            }
          : undefined;
      return {
        title: next.title,
        text: "Mit einem Family Office arbeitest du nicht mehr allein: Associates übernehmen Mandate, eine Partnerin bringt Zeit und Deals.",
        requirements,
        action: requirements.every((r) => r.done) ? { move: { type: "foundFamilyOffice" }, label: "Family Office gründen", days: ACTION_DAYS.foundFamilyOffice } : undefined,
        side,
      };
    }
    case "Investment-Mogul": {
      const blocker = fundBlocker(state);
      const accepted = state.exits.filter((e) => e.status === "accepted").length;
      return {
        title: next.title,
        text: "Leg einen eigenen Fonds auf. Fremdes Geld investiert neben dir, du bekommst Gebühr und Carry.",
        requirements: [
          { label: `${FUND_REPUTATION} Ruf (du: ${state.reputation})`, done: state.reputation >= FUND_REPUTATION },
          { label: `${FUND_EXITS} erfolgreiche Verkäufe (du: ${accepted})`, done: accepted >= FUND_EXITS },
          { label: `Family Office seit ${FUND_OFFICE_MONTHS} Monaten`, done: state.familyOffice !== undefined && state.month - state.familyOffice >= FUND_OFFICE_MONTHS },
        ],
        action: blocker === null ? { move: { type: "raiseFund" }, label: `Fonds auflegen (${eur(fundSize(state))})`, days: ACTION_DAYS.raiseFund } : undefined,
      };
    }
    default:
      return null;
  }
}
