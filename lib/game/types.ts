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
/** Kinds of conditions ("Auflagen") the player can attach to an approval. */
export type CovenantId = "budget" | "stagegate" | "pilot" | "second" | "kpi" | "veto";

/** The three conditions offered for a board item; exactly one fits the situation. */
export interface CovenantSetup {
  options: CovenantId[];
  fit: CovenantId;
  /** How far the fitting condition beats the better plain decision, as share of the spread (may be negative). */
  edge: number;
  /** How far each unfitting condition falls below a plain decision, as share of the spread. */
  miss: Partial<Record<CovenantId, number>>;
}
export type ShareOption = Vote | "abstain";
export type Shares = Record<ShareOption, number>;

export type StartupPhase = "beta" | "launch" | "scale" | "profit";

/** How much is going on at a company: calm months bring few items, busy ones several. */
export type PaceKind = "calm" | "normal" | "busy";
export interface Pace {
  kind: PaceKind;
  /** First month of the next phase. */
  until: number;
  /** Why it is busy, for the UI. */
  reason?: string;
}

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
  /** Family businesses from the succession programme are valued by EBITDA × multiple (see ebitda.ts). */
  valuedOn?: "ebitda";
  /** Acquisition debt at company level: bank loan, vendor loans, open earn-outs (see LboState). */
  acqDebt?: number;
  /** Family businesses: EBITDA of about the last twelve months (smoothed), the basis of value and covenant. */
  ebitdaLtm?: number;
}

export interface StartupHistoryPoint {
  month: number;
  revenue: number;
  cash: number;
  valuation: number;
  stake: number;
  /** Family businesses: annual EBITDA, effective multiple and debt at month end (for the value trend). */
  ebitda?: number;
  multiple?: number;
  netDebt?: number;
}

export type StartupStatus = "offered" | "declined" | "active" | "dead" | "exited" | "sold";

export type HolderKind = "founder" | "cofounder" | "vc" | "angel" | "esop" | "investor" | "advisor" | "syndicate" | "fund";

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
  offer?: {
    ticket: number;
    stake: number;
    expires: number;
    ddDone: boolean;
    buyout?: boolean;
    /** Enterprise value asked for the whole company (EBITDA deals). */
    ev?: number;
    /** Asked multiple of EBITDA. */
    multiple?: number;
    /** Found by a searcher of the succession programme. */
    searchId?: string;
    /** Where the target came from: open market (adviser), searcher, referral. */
    source?: "market" | "search" | "referral";
    /** Modules of the due diligence already done. */
    dd?: import("./mna-config").DdModule[];
    /** A contact bids for the same company (see network-life.ts). */
    rival?: Rival;
    /** Specialists from the network already working on this deal (contact ids). */
    spec?: string[];
  };
  /** Stage label of a generated deal (Pre-Seed, Seed, Wachstum, Nachfolge). */
  stage?: string;
  flags: string[];
  /** Months in a row with negative cash. */
  crisisMonths: number;
  history: StartupHistoryPoint[];
  exitValue?: number;
  /** Everything the player paid for the stake (ticket, rounds, bought shares). */
  playerCost?: number;
  /** Names used in the texts of board items. */
  names: StartupNames;
  /** Current rhythm of the board; missing in older games (= normal). */
  pace?: Pace;
  /** How often each network contact has already helped this company. */
  helped?: Record<string, number>;
  /** Shares granted to the player for board work so far, in percent. */
  advisorShares?: number;
  /** Hidden problems a due diligence can find (EBITDA deals). */
  findings?: Finding[];
  /** Bought with acquisition debt: terms, covenant, earn-outs. */
  lbo?: LboState;
  /** The company is the platform of a buy-and-build. */
  platform?: PlatformState;
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
  /** The benefit of a condition: only fully there when the player followed it up. */
  review?: boolean;
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
  /** An associate of the family office decided in the player's place. */
  delegated?: boolean;
  /** The condition the player voted for (with vote "conditions"). */
  covenant?: CovenantId;
  /** The condition that applies when the outcome is "conditions": the player's, or the board's standard. */
  applied?: CovenantId | "standard";
  /** The condition that fitted the situation. */
  fit?: CovenantId;
  /** Planned value of each offered condition and of the board's standard condition. */
  covenantValues?: Partial<Record<CovenantId | "standard", number>>;
  /** The best option overall: "go", "no" or a condition. */
  bestOption?: string;
  /** How much the decision mattered for the reputation (0..1). */
  weight?: number;
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
  /** Not decided in its month and carried over once (non-urgent items only). */
  postponed?: boolean;
  /** A contact gave a hint on the fitting condition (contact id). */
  tip?: string;
  decision?: MeetingDecision;
  /** Filled when the risky part of the outcome has been rolled. */
  result?: { good: boolean; text: string; month: number };
  /** The conditions on offer; missing in older games (then derived from the template). */
  covenants?: CovenantSetup;
  /** After a decision with conditions: one follow-up meeting until the end of month `until`. */
  followUp?: { until: number; done: boolean; missed?: boolean };
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
  /** The mail carries a decision (the corporate seat, a favour asked, an invitation). */
  action?: "corporate" | "favor" | "event";
  favorId?: string;
  eventId?: string;
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
  /** Where the job takes place (missing in older games: derived from the kind). */
  city?: string;
  /** How you got there and how it went; set when booked with a trip. */
  trip?: GigTrip;
}

export type GigApproach = "safe" | "thorough" | "bold";

export interface GigTrip {
  travel: string;
  travelName: string;
  approach: GigApproach;
  travelDays: number;
  travelCost: number;
  /** Fee before the outcome; the gig's fee is the final one. */
  offeredFee: number;
  reputation: number;
  success: boolean;
  head: string;
  text: string;
}

/** A tombstone in the display cabinet. */
export interface TrophyRecord {
  id: string;
  month: number;
  /** The player saw the announcement. */
  seen: boolean;
  /** A detail engraved on it, e.g. the sale price. */
  detail?: string;
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
  /** Phase 4: team salaries, fund fee, dividends, loan payments. */
  salaries?: number;
  fundFee?: number;
  dividends?: number;
  loans?: number;
  lockups?: number;
  /** Phase 5: upkeep of cars, driver and jet. */
  vehicles?: number;
  /** M&A mandates: retainers and success fees. */
  mandates?: number;
  /** Search capital paid to searchers of the succession programme. */
  search?: number;
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
  /** A listing on the stock exchange instead of a sale. */
  ipo?: boolean;
  /** Sale of a buy-and-build platform from a sale process; ev is the enterprise value offered. */
  platform?: boolean;
  ev?: number;
}

export type TeamRole = "associate" | "partner";

export interface TeamMember {
  id: string;
  role: TeamRole;
  name: string;
  salary: number;
  hired: number;
  /** The mandate an associate looks after. */
  mandate?: string;
}

export interface FundState {
  name: string;
  /** Money the investors (LPs) committed. */
  size: number;
  /** Not invested yet. */
  cash: number;
  invested: number;
  returned: number;
  raised: number;
}

/** Shares from an IPO that may only be sold after the lockup. */
export interface Lockup {
  id: string;
  name: string;
  amount: number;
  /** Tech index when the lockup started: the payout follows the market. */
  index: number;
  due: number;
}

/** A loan the player took to buy a company. */
export interface Loan {
  id: string;
  startupId: string;
  label: string;
  balance: number;
  payment: number;
  rate: number;
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
  /** Trust account: favours given minus favours taken (see network.ts). Missing = 0. */
  bal?: number;
  /** Who holds the role: a person drawn from the pool; missing = the classic cast of older games. */
  p?: number;
  /** Organisation (index in the role's list); missing = the first one. */
  org?: number;
  /** Career level 0..2 (title and strength of help). */
  lv?: number;
  /** Month the current person took the role. */
  since?: number;
  /** Month the contact last asked the player for a favour. */
  lastAsk?: number;
  /** The last career step, for the network page. */
  ev?: { month: number; kind: CareerKind };
}

export type CareerKind = "up" | "move" | "new";

/** A contact bidding for the same company: the price is higher until the relationship is warm enough. */
export interface Rival {
  contactId: string;
  /** Price before the rival pushed it up (EV of a deal, multiple of an add-on). */
  base: number;
  premium: number;
  defused?: boolean;
}

export type FavorKind = "mandant" | "vortrag" | "neffe" | "buergschaft" | "treffen" | "praktikum" | "spende" | "zweitmeinung" | "jury";

/** A contact asks the player for something; it expires at the end of `expires`. */
export interface Favor {
  id: string;
  contactId: string;
  kind: FavorKind;
  month: number;
  expires: number;
  /** For "treffen": whom to introduce. For "praktikum": which company. */
  via?: string;
}

export interface NetEvent {
  id: string;
  /** Id of the event in the yearly calendar (network-events.ts). */
  def: string;
  month: number;
  status: "invited" | "accepted" | "declined" | "attended";
  talk?: boolean;
}

/** Network beyond the contact list: open favours, invitations, ties and running counters (missing in older games). */
export interface NetworkState {
  favors: Favor[];
  events: NetEvent[];
  /** Pairs of contacts introduced by the player ("a~b"); at most a few dozen. */
  ties: string[];
  log: { given: number; declined: number; lapsed: number; events: number; talks: number; refusals: number; specialists: number; hints: number };
}

/** What the majority owner of a family business can do when things go badly (see family.ts). */
export type LeverId = "interim" | "costs" | "pricing" | "workingCapital" | "refinance";

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
  /** Family businesses: why the value moved (EBITDA, multiple, debt, cash). */
  valueWhy?: string;
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
  /** Net worth at month end (from Phase 5). */
  worth?: number;
  notes: string[];
  income?: IncomeLines;
}

export interface GameState {
  version: 6;
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
  /** Phase 4: generated deals (definitions of companies not in the fixed list). */
  deals: import("./startups").StartupDefinition[];
  /** Month the family office was founded. */
  familyOffice?: number;
  team: TeamMember[];
  fund?: FundState;
  lockups: Lockup[];
  loans: Loan[];
  /** Net worth at the start of the current game year. */
  yearWorth: number;
  /** Tombstones earned so far. */
  trophies: TrophyRecord[];
  /** Ids of owned vehicles (see travel.ts). */
  garage: string[];
  /** Month the corporate seat was turned down; it is offered again a year later. */
  corporateDeclined?: number;
  /** One-time hints already sent (e.g. "familyOffice", "fund"). */
  notices?: string[];
  /** M&A mandates, succession programme, buy-and-build (missing in older games). */
  mna?: MnaState;
  /** Paid jobs done so far and the cities they took place in (for tombstones; the gig list itself is cleared after six months). */
  gigLog?: { done: number; cities: string[] };
  /** Favours, invitations and counters of the network (missing in older games). */
  network?: NetworkState;
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
  | "joinCorporate"
  | "foundFamilyOffice"
  | "hire"
  | "buyout"
  | "raiseFund"
  | "followUp"
  | "mandate"
  | "search"
  | "acquire"
  | "platform"
  | "favor"
  | "event"
  | "specialist";

export type GameAction =
  | { type: "dd"; startupId: string }
  | { type: "invest"; startupId: string; size?: "full" | "half" }
  | { type: "decline"; startupId: string }
  | { type: "question"; itemId: string; questionId: string }
  | { type: "cfo"; itemId: string }
  | { type: "pretalk"; itemId: string; seat: SeatId }
  | { type: "meeting"; itemId: string; argument: string | null; vote: Vote; covenant?: CovenantId }
  | { type: "followUp"; itemId: string }
  | { type: "founderCall"; startupId: string }
  | { type: "learn" }
  | { type: "readMail"; mailId: string }
  | { type: "closeMonth" }
  | { type: "round"; roundId: string; take: RoundTake; vote: GvVote }
  | { type: "buyShares"; offerId: string }
  | { type: "askShares"; startupId: string }
  | { type: "meetContact"; contactId: string }
  | { type: "introContact"; contactId: string; startupId: string }
  | { type: "favor"; favorId: string; accept: boolean }
  | { type: "event"; eventId: string; move: "accept" | "decline"; talk?: boolean }
  | { type: "specialist"; contactId: string; targetId?: string }
  | { type: "contactHint"; contactId: string; itemId: string }
  | { type: "gig"; gigId: string; travel?: string; approach?: GigApproach }
  | { type: "buyVehicle"; vehicleId: string }
  | { type: "sellVehicle"; vehicleId: string }
  | { type: "seenTrophies" }
  | { type: "trade"; assetId: AssetId; amount: number }
  | { type: "exit"; exitId: string; choice: ExitChoice }
  | { type: "moveOffice"; level: number }
  | { type: "joinCorporate"; accept: boolean }
  | { type: "foundFamilyOffice" }
  | { type: "hire"; role: TeamRole }
  | { type: "fire"; memberId: string }
  | { type: "assign"; memberId: string; startupId: string | null }
  | { type: "buyout"; startupId: string; leverage: boolean }
  | { type: "raiseFund" }
  | {
      type: "mandate";
      mandateId: string;
      move: MandateMove;
      multiple?: number;
      buyers?: BuyerFocus;
      process?: ProcessKind;
      dd?: import("./mna-config").DdModule[];
    }
  | { type: "search"; move: "start" | "stop"; candidate?: number }
  | { type: "examine"; targetId: string; modules: import("./mna-config").DdModule[] }
  | { type: "acquire"; targetId: string; bid: "ask" | "low"; bank: number; vendor: number; earnout: number; integration?: IntegrationKind }
  | { type: "platform"; startupId: string; move: "make" | "sell" | "cure" | "stopSale"; process?: ProcessKind; buyers?: "strategic" | "financial" }
  | { type: "lever"; startupId: string; lever: LeverId };

// ---------------------------------------------------------------------------
// M&A-Mandate, Nachfolge-Programm (Search Fund) und Buy-and-Build
// ---------------------------------------------------------------------------

export type FindingKind = "ebitda" | "changeOfControl" | "lawsuit" | "taxAudit" | "market" | "pension";

/** A problem hidden in a company; the matching due diligence module finds it. */
export interface Finding {
  kind: FindingKind;
  module: import("./mna-config").DdModule;
  title: string;
  text: string;
  /** Share of the price a buyer knocks off once it is known. */
  priceCut: number;
  /** Effects when it surfaces: more monthly costs, one-off cash, lost revenue, slower growth. */
  opex?: number;
  cash?: number;
  revenuePct?: number;
  growth?: number;
  found?: boolean;
}

export type BuyerFocus = "strategic" | "financial" | "mixed";
export type ProcessKind = "exclusive" | "auction";
export type MandateMove = "accept" | "decline" | "comps" | "launch" | "accept_bid" | "final" | "negotiate";
export type MandateStatus = "offered" | "prep" | "marketing" | "bids" | "signing" | "closed" | "failed" | "declined" | "expired";

export interface MandateBid {
  buyer: string;
  kind: "strategic" | "financial";
  ev: number;
}

/** Sell-side or buy-side advice for a family business: the investment banking part of the game. */
export interface Mandate {
  id: string;
  month: number;
  side: "sell" | "buy";
  client: string;
  company: string;
  sector: string;
  city: string;
  text: string;
  /** Annual EBITDA as the books show it. */
  ebitda: number;
  /** What the market would really pay, as a multiple of EBITDA (hidden). */
  fair: number;
  /** The client's expectation: enterprise value (sell side) or highest price (buy side). */
  wish: number;
  retainer: number;
  /** Month the client signed; the retainer is invoiced at its end. */
  accepted?: number;
  status: MandateStatus;
  expires: number;
  findings: Finding[];
  /** Specialists from the network working on the mandate (contact ids). */
  spec?: string[];
  /** Range of comparable deals once analysed. */
  comps?: [number, number];
  multiple?: number;
  buyers?: BuyerFocus;
  process?: ProcessKind;
  dd?: import("./mna-config").DdModule[];
  bids?: MandateBid[];
  /** Month the current step resolves (at month end). */
  due?: number;
  leak?: boolean;
  /** Price agreed at signing, before the buyer's own review. */
  signed?: MandateBid;
  outcome?: { ev: number; fee: number; reputation: number; mood: "happy" | "ok" | "unhappy" | "failed"; text: string };
}

export interface Searcher {
  name: string;
  background: string;
  /** 0..100: how well they will run a company. */
  operator: number;
  /** 0..100: how many owners they reach. */
  network: number;
  /** Hidden: how long they keep going. */
  grit: number;
  /** Salary and travel per month. */
  cost: number;
}

export interface SearchFund {
  id: string;
  started: number;
  searcher: Searcher;
  status: "searching" | "acquired" | "failed" | "stopped";
  spent: number;
  targets: number;
  startupId?: string;
  ended?: number;
}

export type IntegrationKind = "fast" | "careful";

export interface Integration {
  name: string;
  start: number;
  due: number;
  kind: IntegrationKind;
  /** Annual EBITDA and monthly revenue of the add-on at closing. */
  ebitda: number;
  revenue: number;
  /** Integration cost per month, paid by the platform. */
  cost: number;
}

/** A smaller company the platform could buy. */
export interface AddonTarget {
  id: string;
  platformId: string;
  month: number;
  expires: number;
  name: string;
  city: string;
  owner: string;
  text: string;
  revenue: number;
  grossMargin: number;
  opex: number;
  team: number;
  growth: number;
  topCustomer: number;
  /** Asked multiple of EBITDA. */
  multiple: number;
  findings: Finding[];
  dd: import("./mna-config").DdModule[];
  status: "open" | "review" | "bought" | "blocked" | "expired" | "lost";
  /** A contact bids too (see network-life.ts). */
  rival?: Rival;
  /** Specialists from the network working on this add-on (contact ids). */
  spec?: string[];
  /** Competition authority: closing waits until this month. */
  reviewDue?: number;
  /** Signed terms while the authority reviews; the player's money sits in escrow. */
  pending?: { ev: number; bank: number; vendor: number; earnout: number; fromPlatform: number; fromPlayer: number; integration: IntegrationKind };
}

export interface LboState {
  acquired: number;
  entryEv: number;
  entryEbitda: number;
  /** All own money the player put in (equity, fees, cures). */
  equity: number;
  bank: number;
  rate: number;
  payment: number;
  vendors: { amount: number; due: number; label: string }[];
  earnouts: { amount: number; due: number; target: number; label: string }[];
  /** Quarters in a row above the covenant. */
  breach: number;
  status: "ok" | "watch" | "cure";
  /** "cash": the company ran out of cash (lifted when the cash is back), otherwise the covenant. */
  cure?: { amount: number; due: number; reason?: "cash" | "covenant" };
  /** The searcher who runs the company, if any. */
  searchId?: string;
  /** Handover risks already happened (once each). */
  handover: string[];
  /** Revenue the running costs were last matched to: costs follow revenue in part. */
  refRevenue?: number;
  /** EBITDA margin the business can sustain (at purchase, plus realised synergies). */
  margin?: number;
  /** Gross margin of the business at purchase: price wars and windfalls fade back towards it. */
  grossMargin?: number;
  /** A leveraged-finance contact negotiated more room: added to the covenant limit (net debt / EBITDA). */
  headroom?: number;
  /** An interim manager from the network steadies handover and integrations until this month. */
  interim?: number;
  /** Levers of the owner (family.ts): month each was last pulled, plus `wcUses`. */
  levers?: Record<string, number>;
  /** Valuation model of this company: 2 after the fix of the startup growth path (old games are corrected once). */
  model?: number;
}

export interface PlatformState {
  since: number;
  addons: { name: string; month: number; ev: number; ebitda: number; multiple: number }[];
  integrations: Integration[];
  sale?: { process: ProcessKind; buyers: "strategic" | "financial"; started: number; due: number };
}

export interface PlatformExitRecord {
  name: string;
  month: number;
  ev: number;
  ebitda: number;
  multiple: number;
  entryMultiple: number;
  /** Player's proceeds ÷ player's own money in. */
  moic: number;
  addons: number;
  /** The bank sold it (covenant): a failure. */
  forced?: boolean;
}

/** Counters for career steps and tombstones. */
export interface MnaRecord {
  mandatesDone: number;
  mandatesFailed: number;
  mandateFees: number;
  happyClients: number;
  searchesStarted: number;
  searchesFailed: number;
  acquisitions: number;
  /** Bought companies that came through the first year with their EBITDA intact. */
  successions: number;
  troubledHandovers: number;
  addons: number;
  synergies: number;
  integrationFailures: number;
  antitrustBlocks: number;
  covenantBreaches: number;
  forcedSales: number;
  platformExits: PlatformExitRecord[];
  /** Sell-side auctions closed at or above the family's wish (missing in older games). */
  auctionWins?: number;
  /** Covenant breaches that ended without a forced sale: back under the limit, or cured with fresh equity. */
  covenantRecovered?: number;
}

export interface MnaState {
  mandates: Mandate[];
  searches: SearchFund[];
  addons: AddonTarget[];
  record: MnaRecord;
}
