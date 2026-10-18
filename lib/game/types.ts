// Shared types of the Boardroom game. Everything here is plain data so a game
// can be stored as one JSON document and replayed deterministically.

export type Axis = "management" | "product" | "market" | "edge" | "finance";
export type Axes = Record<Axis, number>;

/** What a board member cares about. Motions and arguments appeal to interests. */
export type Interest = "growth" | "cash" | "team" | "product" | "customer" | "control";

export type Personality = "visionary" | "numbers" | "doer" | "diplomat" | "loyal" | "practical";

/** Seats around the hemicycle; the player sits at the desk on the open side. */
export type SeatId = "ceo" | "cto" | "vc" | "indep" | "angel";
export type SpeakerId = SeatId | "you";

export type Vote = "go" | "conditions" | "no";
export type ShareOption = Vote | "abstain";
export type Shares = Record<ShareOption, number>;

export type StartupPhase = "beta" | "launch" | "scale" | "profit";

export interface BoardMember {
  seat: SeatId;
  name: string;
  /** Short label on the name plate, e.g. "Lena". */
  short: string;
  title: string;
  personality: Personality;
  interests: Interest[];
}

/** The numbers of a company. Money in euros, growth as monthly fraction. */
export interface Metrics {
  cash: number;
  revenue: number;
  growth: number;
  grossMargin: number;
  opex: number;
  team: number;
  morale: number;
  trust: number;
  axes: Axes;
  /** Share of revenue with the largest customer (0..1). */
  topCustomer: number;
  /** Outstanding bank debt. */
  debt: number;
}

export interface StartupHistoryPoint {
  month: number;
  revenue: number;
  cash: number;
  valuation: number;
  stake: number;
}

export type StartupStatus = "offered" | "declined" | "active" | "dead" | "exited";

export interface Startup {
  id: string;
  status: StartupStatus;
  name: string;
  tagline: string;
  sector: string;
  board: BoardMember[];
  metrics: Metrics;
  phase: StartupPhase;
  /** Player's stake in percent (0..100). */
  stake: number;
  /** Month the player joined; 0 while only offered. */
  joined: number;
  offer?: { ticket: number; stake: number; expires: number; ddDone: boolean };
  flags: string[];
  /** Months in a row with negative cash. */
  crisisMonths: number;
  history: StartupHistoryPoint[];
  exitValue?: number;
  /** Names used in the texts of board items. */
  names: StartupNames;
}

export interface StartupNames {
  city: string;
  competitor: string;
  partner: string;
  acquirer: string;
  customer: string;
}

/** A change to a company or to the player. Every field is optional and additive. */
export interface Delta {
  cash?: number;
  /** Relative change of monthly revenue, e.g. 0.1 = +10 %. */
  revenuePct?: number;
  growth?: number;
  grossMargin?: number;
  opex?: number;
  team?: number;
  morale?: number;
  trust?: number;
  topCustomer?: number;
  debt?: number;
  axes?: Partial<Axes>;
  /** Player stake is multiplied by (1 - dilution). */
  dilution?: number;
  playerCash?: number;
  reputation?: number;
  flag?: string;
  /** The company is sold for this price; the player receives the stake share. */
  exit?: number;
}

export interface Effect {
  /** Months after the decision; 0 = immediately. */
  delay: number;
  text: string;
  delta: Delta;
}

export interface PendingEffect extends Effect {
  startupId: string;
  due: number;
  itemId: string;
  /** Risky effects are rolled when they are due; good/bad replace delta. */
  risk?: { chance: number; good: Delta; bad: Delta; goodText: string; badText: string };
}

export interface MeetingDecision {
  argument: string | null;
  vote: Vote;
  outcome: Vote;
  shares: Shares;
  /** Each member's vote and conviction shares, for the hemicycle in the review. */
  ballots?: { member: SpeakerId; vote: Vote; shares: Shares }[];
  judgment: Judgment;
  best: Vote;
  values: Record<Vote, number>;
  reputationDelta: number;
  trustDelta: number;
  month: number;
  /** Set when the board never met and the founder decided alone. */
  lapsed?: boolean;
}

export type Judgment = "strong" | "fair" | "weak";

export type ItemStatus = "open" | "decided" | "lapsed";

export interface BoardItem {
  id: string;
  startupId: string;
  templateId: string;
  month: number;
  status: ItemStatus;
  asked: string[];
  pretalks: SeatId[];
  cfo: boolean;
  decision?: MeetingDecision;
  /** Filled when the risky part of the outcome has been rolled. */
  result?: { good: boolean; text: string; month: number };
}

export interface CalendarEntry {
  day: number;
  days: number;
  kind: ActionKind;
  label: string;
}

export type MailKind = "deal" | "news" | "founder" | "system";

export interface Mail {
  id: string;
  month: number;
  kind: MailKind;
  from: string;
  subject: string;
  body: string;
  startupId?: string;
  read: boolean;
}

export interface ReportLine {
  startupId: string;
  name: string;
  revenue: number;
  revenueBefore: number;
  cash: number;
  cashBefore: number;
  valuation: number;
  valuationBefore: number;
  stake: number;
  status: StartupStatus;
  events: string[];
}

export interface MonthReport {
  month: number;
  lines: ReportLine[];
  playerCash: number;
  playerCashBefore: number;
  reputation: number;
  reputationBefore: number;
  portfolioValue: number;
  portfolioValueBefore: number;
  notes: string[];
}

export interface GameState {
  version: 1;
  seed: number;
  month: number;
  daysUsed: number;
  cash: number;
  reputation: number;
  startups: Startup[];
  items: BoardItem[];
  effects: PendingEffect[];
  calendar: CalendarEntry[];
  mails: Mail[];
  lessons: string[];
  reports: MonthReport[];
  counter: number;
}

export type ActionKind =
  | "dd"
  | "invest"
  | "decline"
  | "question"
  | "cfo"
  | "pretalk"
  | "meeting"
  | "founderCall"
  | "learn"
  | "readMail"
  | "closeMonth";

export type GameAction =
  | { type: "dd"; startupId: string }
  | { type: "invest"; startupId: string }
  | { type: "decline"; startupId: string }
  | { type: "question"; itemId: string; questionId: string }
  | { type: "cfo"; itemId: string }
  | { type: "pretalk"; itemId: string; seat: SeatId }
  | { type: "meeting"; itemId: string; argument: string | null; vote: Vote }
  | { type: "founderCall"; startupId: string }
  | { type: "learn" }
  | { type: "readMail"; mailId: string }
  | { type: "closeMonth" };
