import { outcomeViews, type OutcomeView } from "./cfo";
import { templateOf } from "./content";
import { daysLeft, itemOf, previewMeeting, startupOf } from "./engine";
import { lessonOf } from "./lessons";
import type { MeetingEvent } from "./meeting";
import { monthlyCashFlow, runwayMonths } from "./sim";
import { fill, valueOf as valuationOf } from "./templates";
import type { BoardItem, BoardMember, GameState, Interest, ItemStatus, MeetingDecision, Startup, Vote } from "./types";

// Was eine Seite vom Spielstand braucht, als einfache Daten für den Browser.

export interface MeetingView {
  itemId: string;
  startupId: string;
  startupName: string;
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
}

export function meetingView(state: GameState, itemId: string): MeetingView {
  const item = itemOf(state, itemId);
  const s = startupOf(state, item.startupId);
  const t = templateOf(item.templateId);
  const lesson = lessonOf(t.lesson);
  const outcomes = {} as MeetingView["outcomes"];
  for (const v of ["go", "conditions", "no"] as const) outcomes[v] = { label: fill(t.outcomes[v].label, s), summary: fill(t.outcomes[v].summary, s) };

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
  mandates: { id: string; name: string; value: number; open: boolean }[];
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
  for (const item of open) {
    const s = startupOf(state, item.startupId);
    const t = templateOf(item.templateId);
    const prep = item.cfo || item.asked.length > 0 || item.pretalks.length > 0;
    tasks.push({
      text: `${s.name}: „${fill(t.title, s)}“ liegt vor. ${prep ? "Wenn du so weit bist, berufe die Sitzung ein." : "Bereite dich vor, bevor der Beirat tagt."}`,
      href: `/firma/${s.id}`,
      tone: t.urgent ? "urgent" : "normal",
    });
  }
  for (const s of offered) {
    const expires = s.offer!.expires - state.month;
    tasks.push({
      text: `${s.name} sucht einen Angel: ${s.offer!.stake} % für ${s.offer!.ticket.toLocaleString("de-DE")} €. ${s.offer!.ddDone ? "Geprüft." : "Noch ungeprüft."} ${expires <= 0 ? "Letzter Monat." : `Noch ${expires + 1} Monate.`}`,
      href: `/post?firma=${s.id}`,
      tone: expires <= 0 ? "urgent" : "normal",
    });
  }
  const unread = state.mails.filter((m) => !m.read).length;
  if (unread > 0 && offered.length === 0) tasks.push({ text: `${unread} ungelesene Nachrichten in der Post.`, href: "/post", tone: "calm" });
  if (active.length === 0 && offered.length === 0) {
    tasks.push({ text: "Gerade liegt kein Angebot vor. Schließe den Monat ab, neue Anfragen kommen.", href: "/post", tone: "calm" });
  }
  if (tasks.length === 0) {
    tasks.push({ text: "Alles erledigt. Nutze freie Tage für Gespräche mit den Gründungen oder eine Weiterbildung, dann schließe den Monat ab.", href: "/notizbuch", tone: "calm" });
  }
  return {
    month: state.month,
    daysLeft: daysLeft(state),
    unread,
    offers: offered.length,
    mandates: active.map((s) => ({ id: s.id, name: s.name, value: (s.stake / 100) * valuationOf(s), open: open.some((i) => i.startupId === s.id) })),
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
}

export interface CompanyView {
  startup: Startup;
  valuation: number;
  stakeValue: number;
  cashFlow: number;
  runway: number;
  board: MemberView[];
  item: CompanyItemView | null;
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
  }[];
  calledThisMonth: boolean;
  daysLeft: number;
}

function leaningOf(stance: number): Vote | "open" {
  if (stance >= 0.35) return "go";
  if (stance <= -0.25) return "no";
  return Math.abs(stance) < 0.12 ? "open" : "conditions";
}

export function companyView(state: GameState, startupId: string): CompanyView {
  const s = startupOf(state, startupId);
  const open = state.items.find((i) => i.startupId === s.id && i.status === "open");
  let item: CompanyItemView | null = null;
  let stances: Record<string, number> | null = null;
  if (open && s.status === "active") {
    const t = templateOf(open.templateId);
    stances = previewMeeting(state, open.id).stancesBefore;
    const views = open.cfo ? outcomeViews(t, s) : null;
    item = {
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
    };
  }
  const board: MemberView[] = s.board.map((m) => {
    const pretalked = Boolean(open?.pretalks.includes(m.seat));
    return { ...m, pretalked, leaning: pretalked && stances ? leaningOf(stances[m.seat]!) : undefined };
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
    past,
    calledThisMonth: state.calendar.some((c) => c.kind === "founderCall" && c.label.endsWith(s.name)),
    daysLeft: daysLeft(state),
  };
}
