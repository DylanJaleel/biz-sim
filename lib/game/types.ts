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

export type StartupStatus = "offered" | "declined" | "active" | "dead" | "exited" | "sold";

export type HolderKind = "founder" | "cofounder" | "vc" | "angel" | "esop" | "investor" | "advisor" | "syndicate";

/** One line of the cap table. The player is not in the list: their share is Startup.stake. */
export interface Holder {
  id: string;
  name: string;
  kind: HolderKind;
  /** Percent of the company (0..100). */
  pct: number;
  /** Liquidation preference: paid back first in an exit (1× non-participating). */
  pref?: number;
  /** Money a syndicate put in; the player earns carry on its gains. */
  cost?: number;
}

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
  /** Everyone else; together with stake it adds up to 100. */
  capTable: Holder[];
  /** Preference the player holds from money put into rounds. */
  playerPref?: number;
  /** A corporate supervisory board seat: no shares, a fee, quarterly meetings. */
  corporate?: boolean;
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
  /** Who receives the new shares of a dilution (default: new investors). */
  dilutionTo?: { id: string; name: string; kind: HolderKind };
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

export type MailKind = "deal" | "news" | "founder" | "system" | "round" | "shares" | "network" | "exit";

export interface Mail {
  id: string;
  month: number;
  kind: MailKind;
  from: string;
  subject: string;
  body: string;
  startupId?: string;
  roundId?: string;
  offerId?: string;
  exitId?: string;
  /** The mail carries a decision (the corporate seat). */
  action?: "corporate";
  read: boolean;
}

export type RoundTake = "none" | "half" | "prorata" | "lead" | "syndicate";
export type GvVote = "go" | "no";

export interface GvBallot {
  id: string;
  name: string;
  kind: HolderKind | "you";
  pct: number;
  vote: GvVote | "abstain";
  reason: string;
}

/** A financing round. It needs the shareholders' meeting (votes by shares). */
export interface Round {
  id: string;
  startupId: string;
  month: number;
  label: string;
  amount: number;
  preMoney: number;
  leadId: string;
  lead: string;
  /** Priced below the last value: early holders lose more. */
  down: boolean;
  status: "open" | "closed" | "failed";
  take?: RoundTake;
  playerAmount?: number;
  ballots?: GvBallot[];
  stakeBefore?: number;
  stakeAfter?: number;
}

/** Someone wants to sell shares to the player. */
export interface ShareOffer {
  id: string;
  startupId: string;
  sellerId: string;
  sellerName: string;
  pct: number;
  price: number;
  expires: number;
  status: "open" | "bought" | "expired";
}

/** A paid job outside the portfolio: consulting, talks, interim roles. */
export interface Gig {
  id: string;
  month: number;
  kind: string;
  client: string;
  title: string;
  text: string;
  days: number;
  fee: number;
  reputation?: number;
  contactId?: string;
  warmth?: number;
  status: "offered" | "booked" | "expired";
}

export type AssetId = "tagesgeld" | "anleihen" | "dividenden" | "tech";
export type Regime = "boom" | "normal" | "weak" | "crash";

export interface MarketState {
  regime: Regime;
  headline: string;
  prices: Record<AssetId, number>;
  /** Units held per asset. */
  holdings: Record<AssetId, number>;
  /** Money put in per asset, for the gain shown to the player. */
  invested: Record<AssetId, number>;
  history: { month: number; prices: Record<AssetId, number>; regime: Regime }[];
}

export interface IncomeLines {
  consulting: number;
  boardFees: number;
  payouts: number;
  living: number;
  interest: number;
  /** Office rent (from Phase 3). */
  rent?: number;
}

export type ExitChoice = "accept" | "negotiate" | "reject";

export interface Payout {
  id: string;
  name: string;
  kind: HolderKind | "you";
  pct: number;
  pref: number;
  amount: number;
}

/** A buyer wants the whole company; the shareholders decide. */
export interface ExitOffer {
  id: string;
  startupId: string;
  month: number;
  buyer: string;
  price: number;
  status: "open" | "accepted" | "rejected" | "negotiating" | "withdrawn";
  choice?: ExitChoice;
  ballots?: GvBallot[];
  payouts?: Payout[];
  carry?: number;
}

export interface NewsItem {
  month: number;
  title: string;
  text: string;
  startupIds: string[];
}

export interface ContactState {
  id: string;
  /** 0..100: how much a favour is still possible. */
  warmth: number;
  met: boolean;
  lastIntro?: number;
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
  /** Supervisory board seat: no stake. */
  corporate?: boolean;
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
  income?: IncomeLines;
}

export interface GameState {
  version: 4;
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
  rounds: Round[];
  shareOffers: ShareOffer[];
  contacts: ContactState[];
  /** Rounds the player led (career). */
  ledRounds: number;
  gigs: Gig[];
  market: MarketState;
  /** Office level, 0 = kitchen table. */
  office: number;
  exits: ExitOffer[];
  news: NewsItem[];
  /** The supervisory board seat in the corporation. */
  corporateSeat: "none" | "offered" | "joined" | "declined";
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
  | "closeMonth"
  | "round"
  | "buyShares"
  | "askShares"
  | "meetContact"
  | "introContact"
  | "gig"
  | "trade"
  | "exit"
  | "negotiate"
  | "moveOffice"
  | "joinCorporate";

export type GameAction =
  | { type: "dd"; startupId: string }
  | { type: "invest"; startupId: string; size?: "full" | "half" }
  | { type: "decline"; startupId: string }
  | { type: "question"; itemId: string; questionId: string }
  | { type: "cfo"; itemId: string }
  | { type: "pretalk"; itemId: string; seat: SeatId }
  | { type: "meeting"; itemId: string; argument: string | null; vote: Vote }
  | { type: "founderCall"; startupId: string }
  | { type: "learn" }
  | { type: "readMail"; mailId: string }
  | { type: "closeMonth" }
  | { type: "round"; roundId: string; take: RoundTake; vote: GvVote }
  | { type: "buyShares"; offerId: string }
  | { type: "askShares"; startupId: string }
  | { type: "meetContact"; contactId: string }
  | { type: "introContact"; contactId: string; startupId: string }
  | { type: "gig"; gigId: string }
  | { type: "trade"; assetId: AssetId; amount: number }
  | { type: "exit"; exitId: string; choice: ExitChoice }
  | { type: "moveOffice"; level: number }
  | { type: "joinCorporate"; accept: boolean };
