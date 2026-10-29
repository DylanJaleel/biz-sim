import { monthName } from "./config";
import type { PaceKind, StartupPhase } from "./types";

// Reine Datentypen, Sortierung und Summen des Portfolio-Cockpits. Bewusst ohne Spiellogik,
// damit die Oberfläche (Client) sie laden kann; die Ampel selbst steht in cockpit.ts.

export type Light = "green" | "yellow" | "red";

/** Welche Spielregeln für die Ampel gelten. */
export type CockpitKind = "startup" | "buyout" | "platform" | "corporate";

/** Unter welcher Überschrift die Beteiligung im Cockpit steht. */
export type CockpitGroup = "direct" | "own" | "fund" | "mandate";

export const GROUP_ORDER: CockpitGroup[] = ["direct", "own", "fund", "mandate"];

export const GROUP_LABEL: Record<CockpitGroup, string> = {
  direct: "Direktbeteiligungen",
  own: "Eigene Firmen",
  fund: "Fonds",
  mandate: "Mandate im Aufsichtsrat",
};

export const GROUP_HINT: Record<CockpitGroup, string> = {
  direct: "Minderheitsbeteiligungen mit Sitz im Beirat.",
  own: "Gekaufte Familienbetriebe und Plattformen, die du führst.",
  fund: "Beteiligungen, bei denen dein eigener Fonds mitinvestiert hat.",
  mandate: "Sitze im Aufsichtsrat eines Konzerns, ohne Anteile.",
};

/** Die Schwellen der Ampel. Rot gilt, sobald der Wert die rote Grenze erreicht, Gelb ab der gelben. */
export const COCKPIT_RULES = {
  /** Startups brauchen Luft zum Wachsen: Runway in Monaten. */
  startup: { runwayRed: 6, runwayYellow: 12, shrinkYellow: -0.02, topCustomerYellow: 0.5, moraleYellow: 35, crisisRed: 1 },
  /** Familienbetriebe und Plattformen: Gewinn, Schulden und Zinsen. */
  buyout: {
    /** EBITDA-Marge (Anteil am Umsatz). */
    marginRed: 0.04,
    marginYellow: 0.08,
    /** Zinsdeckung: EBITDA geteilt durch die Zinsen pro Jahr. */
    coverRed: 1.5,
    coverYellow: 2.5,
    /** Abstand zur Covenant-Grenze, als Anteil der Grenze. */
    covenantGapYellow: 0.1,
    /** Kasse in Monatskosten. */
    cashMonthsYellow: 1,
  },
  /** Konzern-Aufsichtsrat: Die Kasse ist groß, entscheidend sind Marge, Schulden und Stimmung. */
  corporate: { marginRed: 0, marginYellow: 0.03, leverageRed: 4, leverageYellow: 3, shrinkYellow: -0.01, moraleYellow: 35 },
} as const;

export const RANK: Record<Light, number> = { green: 0, yellow: 1, red: 2 };

/** Facts the ampel is built from; also what the cockpit shows as numbers. */
export interface Facts {
  revenue: number;
  growth: number;
  cash: number;
  /** Monate bis die Kasse leer ist; null = die Firma verdient Geld. */
  runway: number | null;
  ebitda: number;
  margin: number;
  /** Nettoverschuldung geteilt durch EBITDA; null = keine Bankschulden. */
  leverage: number | null;
  /** Erlaubtes Maximum laut Covenant (sonst null). */
  limit: number | null;
  /** EBITDA geteilt durch die Zinsen pro Jahr; null = keine Zinsen. */
  cover: number | null;
  debt: number;
}

export interface NextDate {
  /** Spielmonat, in dem es passiert. */
  month: number;
  /** 0 = beim Abschluss dieses Monats. */
  inMonths: number;
  text: string;
}

export interface CockpitRow {
  id: string;
  name: string;
  tagline: string;
  kind: CockpitKind;
  group: CockpitGroup;
  /** Beschriftung der Pille: Phase, Nachfolge, Plattform oder Mandat. */
  tag: string;
  pace?: PaceKind;
  phase: StartupPhase;
  light: Light;
  reason: string;
  reasons: string[];
  /** Ampel je Kennzahl (Schlüssel wie in Facts), für die Färbung der Zahlen. */
  tones: Partial<Record<keyof Facts, Light>>;
  facts: Facts;
  stake: number;
  fundPct: number;
  /** Dein Anteil am Firmenwert; bei Mandaten 0. */
  value: number;
  companyValue: number;
  /** Veränderung des Werts zum Vormonat (0.05 = +5 %); null ohne Vormonat. */
  change: number | null;
  /** Verlauf der letzten Monate (dein Wert, bei Mandaten der Firmenwert). */
  trend: number[];
  next: NextDate | null;
  /** Was von dir gebraucht wird, kurz. */
  actions: string[];
  openItems: number;
  /** Punkte für die Sortierung „Handlungsbedarf“. */
  needs: number;
  fee?: number;
  /** Zuständig: der Operating Partner, der die Firma betreut (team.ts). */
  lead?: { name: string; initials: string; color: string; fit: "good" | "mid" | "weak" };
}

// ---------------------------------------------------------------------------
// Sortierung und Summe
// ---------------------------------------------------------------------------

export type SortKey = "needs" | "risk" | "value" | "change" | "name";

export const SORT_KEYS: SortKey[] = ["needs", "risk", "value", "change", "name"];
export const SORT_LABEL: Record<SortKey, string> = { needs: "Handlungsbedarf", risk: "Ampel", value: "Wert", change: "Veränderung", name: "Name" };
export const DEFAULT_SORT: SortKey = "needs";

export function isSortKey(v: unknown): v is SortKey {
  return typeof v === "string" && (SORT_KEYS as string[]).includes(v);
}

const byName = (a: CockpitRow, b: CockpitRow) => a.name.localeCompare(b.name, "de");

export function sortRows(rows: CockpitRow[], key: SortKey): CockpitRow[] {
  const cmp: Record<SortKey, (a: CockpitRow, b: CockpitRow) => number> = {
    needs: (a, b) => b.needs - a.needs || RANK[b.light] - RANK[a.light] || b.value - a.value,
    risk: (a, b) => RANK[b.light] - RANK[a.light] || b.needs - a.needs || b.value - a.value,
    value: (a, b) => b.value - a.value || b.companyValue - a.companyValue,
    change: (a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity),
    name: byName,
  };
  return [...rows].sort((a, b) => cmp[key](a, b) || byName(a, b));
}

/** Zeilen je Gruppe, in fester Reihenfolge der Gruppen, leere Gruppen fehlen. */
export function groupRows(rows: CockpitRow[], key: SortKey): { group: CockpitGroup; rows: CockpitRow[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    rows: sortRows(
      rows.filter((r) => r.group === group),
      key,
    ),
  })).filter((g) => g.rows.length > 0);
}

export interface CockpitSummary {
  count: number;
  green: number;
  yellow: number;
  red: number;
  /** Summe deiner Anteile. */
  value: number;
  /** Veränderung der Summe zum Vormonat; null, wenn es keinen Vergleich gibt. */
  change: number | null;
  /** Beteiligungen, bei denen etwas auf dich wartet. */
  needing: number;
}

export function summarize(rows: CockpitRow[]): CockpitSummary {
  const held = rows.filter((r) => r.group !== "mandate");
  const value = held.reduce((sum, r) => sum + r.value, 0);
  const before = held.reduce((sum, r) => sum + (r.change === null ? r.value : r.value / (1 + r.change)), 0);
  return {
    count: rows.length,
    green: rows.filter((r) => r.light === "green").length,
    yellow: rows.filter((r) => r.light === "yellow").length,
    red: rows.filter((r) => r.light === "red").length,
    value,
    change: before > 0 && held.some((r) => r.change !== null) ? value / before - 1 : null,
    needing: rows.filter((r) => r.actions.length > 0).length,
  };
}

/** „Dezember“, „in 2 Monaten“ für die Anzeige. */
export function whenText(n: NextDate): string {
  const month = monthName(n.month);
  if (n.inMonths <= 0) return `${month} (jetzt)`;
  return n.inMonths === 1 ? `${month} (nächster Monat)` : `${month} (in ${n.inMonths} Monaten)`;
}
