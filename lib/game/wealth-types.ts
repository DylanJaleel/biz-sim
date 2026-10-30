// Datentypen für Vermögen und Vermächtnis: Immobilien, Stiftung, Dynastie und
// der Verlauf des Lebenswerk-Werts. Alles liegt optional unter GameState.wealth,
// ältere Spielstände haben das Feld nicht.

export type EstateKind = "wohnung" | "mfh" | "gewerbe" | "penthouse";
/** Fixed-rate period of a mortgage, in years. */
export type Binding = 5 | 10 | 15;

/** A property on the market this quarter. */
export interface EstateOffer {
  id: string;
  kind: EstateKind;
  name: string;
  city: string;
  district: string;
  price: number;
  /** Annual net cold rent at full occupancy (penthouse: rental value, never paid). */
  rent: number;
  /** 1 (run down) .. 5 (as new). */
  condition: number;
  /** Flats or tenants. */
  units: number;
  /** Floor area in m². */
  area: number;
  /** Last month the offer stands. */
  expires: number;
}

export interface Mortgage {
  balance: number;
  /** Fixed rate per year, e.g. 0.037. */
  rate: number;
  /** Monthly annuity (interest and repayment) while the rate is fixed. */
  payment: number;
  binding: Binding;
  /** Last month of the fixed rate; the follow-up rate starts after it. */
  until: number;
  /** The bank warned about the end of the fixed rate. */
  warned?: boolean;
}

export interface Property {
  id: string;
  kind: EstateKind;
  name: string;
  city: string;
  district: string;
  /** Purchase price (without transaction costs). */
  price: number;
  /** Transaction costs paid at purchase. */
  costs: number;
  bought: number;
  /** Annual rent at full occupancy, today. */
  rent: number;
  condition: number;
  units: number;
  area: number;
  /** Market rate (10 years) in the month of purchase: the value moves against it. */
  rate0: number;
  /** Annual rent and condition at purchase: the value follows rent and condition from there. */
  rent0: number;
  condition0: number;
  loan?: Mortgage;
  /** Renovation under way until the end of this month. */
  renovating?: number;
  /** Last month the condition dropped by wear. */
  worn?: number;
  /** Last month's occupancy (0..1), for the page. */
  occupancy?: number;
  /** Own money put in: equity, costs, renovations, extra repayments. */
  invested: number;
}

export interface EstateRecord {
  bought: number;
  sold: number;
  refinanced: number;
  /** Times the bank asked for an extra repayment at refinancing. */
  topUps: number;
  /** Sum of gains (sale proceeds minus own money) of all sales. */
  gains: number;
}

export interface EstateState {
  offers: EstateOffer[];
  /** Month the offers were drawn. */
  offersMonth: number;
  owned: Property[];
  record: EstateRecord;
  /** The one-time reputation for the penthouse was granted. */
  prestige?: boolean;
  /** Announcements of rate turns already published (month of the turn). */
  announced?: number[];
}

export type FoundationPurpose = "bildung" | "gruenderinnen" | "nachfolge";

export interface FoundationGift {
  month: number;
  amount: number;
  /** Part of the gift counted for the tax rule (endowment allowance). */
  deductible: number;
}

export interface FoundationState {
  purpose: FoundationPurpose;
  founded: number;
  /** Endowment: stays forever, only the yield is spent. */
  capital: number;
  gifts: FoundationGift[];
  /** People supported so far. */
  people: number;
  /** Money paid out to the programme so far. */
  granted: number;
  /** Tax refund paid with the next month's close. */
  refundDue?: number;
}

export type HeirKind = "kind" | "schuetzling";
export type CharterId = "ausschuettung" | "eintritt" | "streit" | "werte" | "nachfolge";
export type WealthStrategy = "bewahren" | "ausgewogen" | "wachstum";

export interface Heir {
  kind: HeirKind;
  chosen: number;
  /** 0..100; ready to take over from 80. */
  maturity: number;
  /** Mentoring days in the current month. */
  days: number;
  /** All mentoring days so far. */
  totalDays: number;
  /** Maturity stagnates until the end of this month. */
  stalled?: number;
  /** Mentoring days during the current stagnation. */
  stallDays?: number;
}

export interface Council {
  month: number;
  /** Question id (see dynasty.ts). */
  question: string;
  choice?: number;
}

export interface DynastyState {
  heir?: Heir;
  /** Candidates who dropped out. */
  lost: HeirKind[];
  /** Family cohesion 0..100. */
  cohesion: number;
  charter: CharterId[];
  council?: Council;
  councils: number;
  generation: 1 | 2;
  handedOver?: number;
  strategy?: WealthStrategy;
}

export interface LegacyPoint {
  month: number;
  value: number;
}

export interface WealthState {
  estate?: EstateState;
  foundation?: FoundationState;
  dynasty?: DynastyState;
  /** Lebenswerk-Wert, one point per quarter. */
  legacy?: LegacyPoint[];
  /** Highest assets under management at a month end (career step "Fondsfamilie"). */
  aumPeak?: number;
}

export type WealthAction =
  | { type: "estate"; move: "buy"; offerId: string; ltv: number; binding: Binding }
  | { type: "estate"; move: "sell" | "renovate"; propertyId: string }
  | { type: "foundation"; move: "found"; amount: number; purpose: FoundationPurpose }
  | { type: "foundation"; move: "give"; amount: number }
  | { type: "dynasty"; move: "choose"; heir: HeirKind }
  | { type: "dynasty"; move: "mentor" | "handover" }
  | { type: "dynasty"; move: "charter"; article: CharterId }
  | { type: "dynasty"; move: "council"; choice: number }
  | { type: "dynasty"; move: "strategy"; strategy: WealthStrategy | "none" };
