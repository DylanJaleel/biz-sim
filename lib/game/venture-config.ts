// Zahlen für Fondsfamilie (Fonds II und III, LPAC), Venture Studio und den
// Wachstumspfad bis zum Unicorn. Nur Konstanten, damit Menü und Seiten sie
// ohne Spiellogik laden können.

// ---------------------------------------------------------------------------
// Fondsfamilie
// ---------------------------------------------------------------------------

/** The next fund can be raised once the newest fund has invested this share of its commitments. */
export const FUND_NEXT_INVESTED = 0.7;
/** Funds after Fund I: II and III. */
export const FUND_FAMILY_MAX = 3;
/** Investment period and term of a fund, in months. */
export const FUND_INVEST_MONTHS = 60;
export const FUND_TERM_MONTHS = 120;
export const FUND_EXTENSION_MONTHS = 12;
export const FUND_HURDLE = 0.08;
/** Target size of the next fund: previous size × this factor (more with a good TVPI), within limits. */
export const FUND_TARGET_FACTOR = 2.5;
export const FUND_TARGET_LIMITS: Record<number, [number, number]> = { 2: [10_000_000, 60_000_000], 3: [25_000_000, 150_000_000] };
/** First close from this share of the target; hard cap at this share. */
export const FUND_FIRST_CLOSE = 0.5;
export const FUND_HARD_CAP = 1.25;
export const ROADSHOW_MONTHS = 12;
export const ROADSHOW_DAYS = { launch: 2, pitch: 1, close: 1 } as const;
/** Auditor, custodian bank and reporting of Fund II and III: share of the commitments per year, paid from the fee. */
export const FUND_ADMIN_COST = 0.004;
export const CONCESSION_COST = { esg: 40_000, keyPerson: 9_000 } as const;
/** Fee cut granted to an investor who asks for it (2 % → 1,75 %). */
export const FEE_CUT = 0.0025;
/** Days of an LPAC meeting each quarter once investors hold seats. */
export const LPAC_SEAT_DAYS = 2;
export const LPAC_DAYS = 1;
export const LP_TRUST_START = 60;
/** Fund I may sell a stake to a later fund (conflict for the LPAC) once it is this old. */
export const CROSS_FUND_AGE = 72;
/** Secondary buyers pay this share of the value when a fund sells what is left. */
export const SECONDARY_SALE = { offered: 0.85, forced: 0.75 } as const;
export const FAIRNESS_OPINION_COST = 15_000;

export const CONCESSION_LABEL: Record<"esg" | "fee" | "lpacSeat" | "keyPerson", { title: string; text: string }> = {
  esg: { title: "ESG-Bericht", text: "Jährlicher Bericht zu Umwelt, Sozialem und Unternehmensführung: 40.000 € im Jahr." },
  fee: { title: "Niedrigere Gebühr", text: "Verwaltungsgebühr 1,75 % statt 2 % im Jahr, für alle Investoren." },
  lpacSeat: { title: "Sitz im LPAC", text: "Der Investorenbeirat tagt jedes Quartal: 2 Tage im Quartal." },
  keyPerson: { title: "Zweiter Partner", text: "Schlüsselpersonen-Klausel: Ohne Operating Partner im Team kostet ein zweiter Partner 9.000 € im Monat." },
};

// ---------------------------------------------------------------------------
// Venture Studio
// ---------------------------------------------------------------------------

export const STUDIO_REPUTATION = 75;
export const STUDIO_EXITS = 2;
/** Studio companies in the building phase at the same time. */
export const STUDIO_MAX = 2;
/** Working days per month each company in the building phase takes. */
export const STUDIO_DAYS = 2;
export const STUDIO_FOUND_DAYS = 2;
export const STUDIO_TRANCHE_DAYS = 1;
/** The idea pool is drawn anew every six months. */
export const STUDIO_POOL_MONTHS = 6;
/** After this many months the company stands on its own: no more studio days. */
export const STUDIO_BUILD_MONTHS = 24;
/** Founding capital, then tranches at milestones (shares of the planned capital). */
export const STUDIO_TRANCHES = [
  { label: "Gründung", share: 0.15 },
  { label: "Prototyp", share: 0.2 },
  { label: "100 Kunden", share: 0.3 },
  { label: "1 Mio. € ARR", share: 0.35 },
] as const;
/** Milestones: monthly revenue (or product strength for the prototype). */
export const STUDIO_MILESTONE = { prototypeProduct: 62, prototypeRevenue: 6_000, customers: 15_000, arr: 83_400 } as const;
/** Player's starting share: the more they keep, the more they put in. */
export const STUDIO_KEEP = [60, 70, 80] as const;
export const STUDIO_ESOP = 10;
/** Below this share the CEO gets restless. */
export const STUDIO_CEO_MIN = 12;
/** Negotiated tranches: money factor and shares moved between player and CEO (percentage points). */
export const TRANCHE_SIZE = {
  lean: { money: 0.6, shift: -4, label: "Weniger Geld, mehr Anteil fürs Team" },
  plan: { money: 1, shift: 0, label: "Wie geplant" },
  big: { money: 1.4, shift: 4, label: "Mehr Geld, mehr Anteil für dich" },
} as const;

// ---------------------------------------------------------------------------
// Wachstumspfad bis zum Unicorn
// ---------------------------------------------------------------------------

export interface VentureStage {
  label: string;
  /** Valuation after the money of this stage's round. */
  post: number;
  /** Share of the company the round's new investors take. */
  dilution: number;
  /** Monthly growth investors want to see before this round (big companies grow slower). */
  growth: number;
}

export const VENTURE_STAGES: VentureStage[] = [
  { label: "Seed", post: 5_000_000, dilution: 0.2, growth: 0.03 },
  { label: "Serie A", post: 22_000_000, dilution: 0.22, growth: 0.04 },
  { label: "Serie B", post: 70_000_000, dilution: 0.18, growth: 0.035 },
  { label: "Serie C", post: 210_000_000, dilution: 0.15, growth: 0.024 },
  { label: "Serie D", post: 520_000_000, dilution: 0.12, growth: 0.018 },
  { label: "Unicorn", post: 1_050_000_000, dilution: 0.08, growth: 0.014 },
];
export const UNICORN_STAGE = VENTURE_STAGES.length - 1;
/** A venture company enters the path (Seed level) at this valuation and growth. */
export const VENTURE_ENTRY = { value: 6_000_000, growth: 0.04, age: 6 } as const;
/** Months between two tries for the next round. */
export const VENTURE_GAP: [number, number] = [8, 13];
/** Chance of the next round: base + span × fulfilment (0..1), then times the market mood. */
export const VENTURE_CHANCE = { base: 0.16, span: 0.4, min: 0.05, max: 0.6 } as const;
/** The Pre-IPO round to the unicorn is the rarest: its chance counts only this much (keeps the unicorn near one in 25 games). */
export const UNICORN_ROUND_FACTOR = 0.45;
export const VENTURE_MOOD: Record<"boom" | "normal" | "weak" | "crash", number> = { boom: 1.15, normal: 1, weak: 0.85, crash: 0.6 };
/** A failed try is a down round: the paper value falls by this share; most of them end the path. */
export const DOWN_ROUND_CUT = 0.35;
export const DOWN_ROUND_END = 0.75;
/** Trade buyers pay the numbers plus this share of the paper premium (a listing pays the full last round). */
export const SALE_PAPER_SHARE = 0.6;
/** Paper value of an ended path fades towards the fundamental value each month. */
export const PAPER_FADE = 0.97;
/** Until the exit only this share of the paper gain counts towards net worth, at most PAPER_CAP per company. */
export const PAPER_CREDIT = 0.3;
export const PAPER_CAP = 5_000_000;
/** Companies on the path list from Serie D on (or once the path is over). */
export const VENTURE_IPO_STAGE = 4;
export const GROWTH_INVESTORS = ["Atlas Growth", "Kranich Capital", "Elbtal Growth Partners", "Silberhorn Ventures", "Vierwald Capital", "Brückentor Partners"];

// ---------------------------------------------------------------------------
// Finanzierungsrunden vorbereiten und verhandeln (siehe rounds.ts)
// ---------------------------------------------------------------------------

/** From this reputation the player prepares Serie A and B and negotiates term sheets. */
export const ROUND_PREP_REPUTATION = 45;
/** Serie C, D and the Pre-IPO round: growth and crossover funds only talk to known names. */
export const LATE_ROUND_REPUTATION = 60;
/** Preparing the listing with the banks. */
export const IPO_PREP_REPUTATION = 72;
/** Up to this stage (Serie A) the player may lead a growth round; later the growth funds lead. */
export const VENTURE_LEAD_MAX_STAGE = 1;

export type GoalId = "revenue" | "growth" | "product" | "customers" | "margin" | "market" | "management" | "burn" | "finance" | "board";

export interface StageGoals {
  /** What investors of this round want to see, in two words. */
  theme: string;
  text: string;
  /** Targets: revenue per month in €, growth and margins as shares, axes 0..100, burn as cash flow ÷ revenue, customers as largest share. */
  goals: [GoalId, number][];
}

/**
 * Milestones per round (index = stage the round leads to; the last entry is
 * the listing). Derived from the company model: SCALE_REVENUE 150.000 € per
 * month, growth that drags with every doubling above it, and the entry to the
 * path at 6 Mio. € value (about 100.000 € revenue per month at 4 % growth).
 */
export const STAGE_GOALS: StageGoals[] = [
  {
    theme: "Erste Zugkraft",
    text: "Umsatz und Wachstum zeigen, dass Kunden das Produkt wollen.",
    goals: [
      ["revenue", 60_000],
      ["growth", 0.04],
      ["board", 0.7],
    ],
  },
  {
    theme: "Product-Market-Fit",
    text: "Kunden bleiben und empfehlen weiter, der Umsatz hängt nicht an einem Großkunden.",
    goals: [
      ["revenue", 100_000],
      ["growth", 0.04],
      ["product", 65],
      ["customers", 0.3],
      ["board", 0.7],
    ],
  },
  {
    theme: "Wiederholbarer Vertrieb",
    text: "Neue Kunden kommen planbar, jeder Kunde verdient genug Rohertrag (Unit Economics).",
    goals: [
      ["revenue", 200_000],
      ["growth", 0.035],
      ["margin", 0.55],
      ["market", 65],
      ["board", 0.7],
    ],
  },
  {
    theme: "Skalierung",
    text: "Die Firma wächst über Länder und Produkte, die Marge hält, die Führung trägt die Größe.",
    goals: [
      ["revenue", 380_000],
      ["growth", 0.024],
      ["margin", 0.6],
      ["management", 65],
      ["board", 0.7],
    ],
  },
  {
    theme: "Weg zur Profitabilität",
    text: "Der Verlust schrumpft im Verhältnis zum Umsatz, die Zahlen sind prüfbar wie bei einer AG.",
    goals: [
      ["revenue", 600_000],
      ["growth", 0.018],
      ["burn", -0.2],
      ["finance", 65],
      ["board", 0.7],
    ],
  },
  {
    theme: "Größe und Gewinn",
    text: "Fast profitabel, groß genug für die Börse: Crossover-Fonds kaufen vor dem Börsengang.",
    goals: [
      ["revenue", 900_000],
      ["growth", 0.014],
      ["burn", -0.05],
      ["management", 70],
      ["board", 0.7],
    ],
  },
  {
    theme: "Börsenreife",
    text: "Prüfbare Zahlen, eine Geschichte für Fondsmanager und ein Gewinn in Sichtweite.",
    goals: [
      ["revenue", 700_000],
      ["growth", 0.012],
      ["burn", -0.1],
      ["finance", 70],
      ["board", 0.7],
    ],
  },
];
export const IPO_GOALS = STAGE_GOALS.length - 1;

/** Timetable choices in months; a round goes out at the earliest this long after the last one. */
export const PREP_MONTHS = [3, 6, 9] as const;
export const PREP_MIN_GAP = 6;
export const PREP_DAYS = 1;
export const PITCH_DAYS = 1;
export const NEGOTIATE_DAYS = 1;
export const PITCH_MAX = 3;
/** Chance bonus per pitched investor and for a warm introduction; warmth the introduction costs. */
export const PITCH_BONUS = 0.03;
export const INTRO_BONUS = 0.06;
export const INTRO_WARMTH = 15;
export const INTRO_WARMTH_MIN = 40;
/** With a prepared round the chance may climb this high. */
export const PREP_CHANCE_MAX = 0.72;

export const AMBITION: Record<"cautious" | "market" | "bold", { label: string; text: string; price: number; chance: number; pref: number }> = {
  cautious: { label: "Vorsichtig", text: "Etwas unter Markt: mehr Investoren sagen zu.", price: 0.9, chance: 0.08, pref: 1 },
  market: { label: "Marktpreis", text: "Was vergleichbare Firmen bekommen.", price: 1, chance: 0, pref: 1 },
  bold: { label: "Ambitioniert", text: "Hoher Preis: weniger Zusagen, der Lead verlangt meist 1,5× Präferenz.", price: 1.2, chance: -0.08, pref: 1.5 },
};

/** A round that misses but comes close: insiders bridge with this many months of burn, the next try follows soon. */
export const BRIDGE_FULFIL = 0.75;
export const BRIDGE_MONTHS = 6;

/** Negotiation of a term sheet: base chance per lever plus this much per competing term sheet. */
export const NEGOTIATE_CHANCE = { price: 0.3, pref: 0.4, seat: 0.35, rival: 0.2, max: 0.85 } as const;
export const NEGOTIATE_PRICE_STEP = 0.1;
/** Giving up the 1,5× preference costs a little price. */
export const PREF_TRADE = 0.05;
/** Without the lead's board seat the price falls a little. */
export const SEAT_TRADE = 0.03;

/** Who leads which round: venture funds early, growth funds in the middle, crossover funds before the listing. */
export const ROUND_INVESTORS: { kind: "vc" | "growth" | "crossover"; label: string; names: string[] }[] = [
  { kind: "vc", label: "Venture-Fonds", names: ["Isar Capital", "Hafenwerk Ventures", "Elbe Growth", "Westpark Partners"] },
  { kind: "growth", label: "Growth-Fonds", names: GROWTH_INVESTORS },
  {
    kind: "crossover",
    label: "Crossover-Investoren",
    names: ["Meridian Crossover", "Nordkap Public Equity", "Helvetia Global Growth", "Atlantik Asset Management", "Rheingold Tech Opportunities"],
  },
];
/** Index into ROUND_INVESTORS for the round that leads to a stage. */
export function investorGroup(stage: number | "ipo"): number {
  if (stage === "ipo" || stage >= 4) return 2;
  return stage >= 2 ? 1 : 0;
}
/** Board partners of the leads who take a seat. */
export const LEAD_PARTNERS = ["Dr. Carola Wendt", "Maximilian Sauer", "Ayşe Korkmaz", "Henrik Lund", "Sophie Albers", "Jakob Reiter"];
