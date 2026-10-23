import { DD_COST, FINDING_COUNT_CHANCE, type DdModule } from "./mna-config";
import type { StartupDefinition } from "./startups";
import type { ActionKind, Finding, FindingKind, GameState, Mail, MnaRecord, MnaState, Startup } from "./types";

// Gemeinsame Bausteine für Mandate, Nachfolge-Programm und Buy-and-Build:
// der Zugriff auf die Engine, der Zustand mit seinen Zählern und die
// versteckten Befunde, die eine Due Diligence finden kann.

/** What the M&A modules may do with the game; the engine provides it. */
export interface Ctx {
  state: GameState;
  mail(data: Omit<Mail, "id" | "month" | "read">): void;
  id(prefix: string): string;
  lesson(id: string): void;
  /** Spends working days or throws a rule error. */
  spend(kind: ActionKind, label: string, days: number): void;
  replace(s: Startup): void;
  worth(): number;
  /** Adds reputation (soft cap above 80 applies to gains). */
  reputation(delta: number): void;
  /** Registers a generated company and sends its offer mail. */
  addDeal(def: StartupDefinition): Startup;
  /** Announces a new majority to the player (reputation, mail). */
  majority(s: Startup, before: number): void;
  fail(message: string): never;
}

export function emptyRecord(): MnaRecord {
  return {
    mandatesDone: 0,
    mandatesFailed: 0,
    mandateFees: 0,
    happyClients: 0,
    searchesStarted: 0,
    searchesFailed: 0,
    acquisitions: 0,
    successions: 0,
    troubledHandovers: 0,
    addons: 0,
    synergies: 0,
    integrationFailures: 0,
    antitrustBlocks: 0,
    covenantBreaches: 0,
    forcedSales: 0,
    platformExits: [],
  };
}

/** The M&A part of a game; older games get an empty one. */
export function mnaOf(state: GameState): MnaState {
  if (!state.mna) state.mna = { mandates: [], searches: [], addons: [], record: emptyRecord() };
  return state.mna;
}

/** Read-only view for pages and bots: never writes into the state. */
export function mnaRead(state: GameState): MnaState {
  return state.mna ?? { mandates: [], searches: [], addons: [], record: emptyRecord() };
}

export const between = (r: () => number, a: number, b: number) => a + r() * (b - a);
export const pickOf = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length]!;
export const roundTo = (v: number, step: number) => Math.round(v / step) * step;
export const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
export const mio = (n: number) => `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €`;
export const times = (n: number) => `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×`;

export const DD_LABEL: Record<DdModule, { title: string; text: string }> = {
  financial: { title: "Financial", text: "Zahlen und Bilanz: Ist das EBITDA bereinigt richtig, gibt es versteckte Schulden?" },
  legal: { title: "Legal", text: "Verträge und Rechtsstreit: Was passiert bei einem Eigentümerwechsel?" },
  tax: { title: "Tax", text: "Steuern: Offene Prüfungen, Nachzahlungen, Risiken aus der Vergangenheit." },
  commercial: { title: "Commercial", text: "Markt und Kunden: Wächst der Markt, wie treu sind die Kunden?" },
};

export function ddCost(module: DdModule, price: number): number {
  const c = DD_COST[module];
  return roundTo(Math.max(c.min, price * c.share), 500);
}

interface FindingInput {
  ev: number;
  /** Monthly EBITDA as the books show it. */
  ebitda: number;
  topCustomer: number;
  /** Monthly revenue and gross margin: lost revenue hits EBITDA with leverage, the costs stay. */
  revenue: number;
  grossMargin: number;
}

/** Share of EBITDA lost when this share of revenue goes away and the running costs stay. */
function ebitdaHit(x: FindingInput, revenueLoss: number): number {
  return Math.min(0.45, Math.round(((revenueLoss * x.revenue * x.grossMargin) / Math.max(1, x.ebitda)) * 100) / 100);
}

const FINDING_DEFS: Record<FindingKind, (r: () => number, x: FindingInput) => Finding> = {
  ebitda: (r, x) => {
    const share = Math.round(between(r, 0.12, 0.2) * 100) / 100;
    return {
      kind: "ebitda",
      module: "financial",
      title: "Das EBITDA ist geschönt",
      text: `Das Gehalt des Inhabers fehlt in den Kosten, ein Einmalertrag ist als laufend verbucht. Bereinigt verdient die Firma rund ${Math.round(share * 100)} % weniger.`,
      priceCut: share,
      opex: roundTo(x.ebitda * share, 100),
    };
  },
  pension: (r, x) => {
    const share = Math.round(between(r, 0.03, 0.06) * 100) / 100;
    return {
      kind: "pension",
      module: "financial",
      title: "Pensionszusagen ohne Rückstellung",
      text: `Alten Mitarbeitern wurde eine Betriebsrente versprochen, Geld dafür ist nicht da. Rund ${eur(roundTo(x.ev * share, 1000))} fehlen.`,
      priceCut: share,
      cash: -roundTo(x.ev * share, 1000),
    };
  },
  changeOfControl: (_r, x) => {
    const loss = Math.round(Math.max(0.15, x.topCustomer) * 0.5 * 100) / 100;
    return {
      kind: "changeOfControl",
      module: "legal",
      title: "Change-of-Control-Klausel",
      text: `Der größte Kunde darf kündigen, wenn die Firma den Eigentümer wechselt. Er macht etwa ${Math.round(Math.max(0.15, x.topCustomer) * 100)} % des Umsatzes aus.`,
      priceCut: ebitdaHit(x, loss),
      revenuePct: -loss,
    };
  },
  lawsuit: (r, x) => {
    const share = Math.round(between(r, 0.02, 0.05) * 100) / 100;
    return {
      kind: "lawsuit",
      module: "legal",
      title: "Laufender Rechtsstreit",
      text: `Ein früherer Lieferant klagt auf Schadenersatz. Ein Vergleich wird etwa ${eur(roundTo(x.ev * share, 1000))} kosten.`,
      priceCut: share,
      cash: -roundTo(x.ev * share, 1000),
    };
  },
  taxAudit: (r, x) => {
    const share = Math.round(between(r, 0.02, 0.05) * 100) / 100;
    return {
      kind: "taxAudit",
      module: "tax",
      title: "Offene Betriebsprüfung",
      text: `Das Finanzamt prüft die letzten vier Jahre. Private Ausgaben liefen über die Firma; eine Nachzahlung um ${eur(roundTo(x.ev * share, 1000))} ist wahrscheinlich.`,
      priceCut: share,
      cash: -roundTo(x.ev * share, 1000),
    };
  },
  market: (r, x) => {
    const loss = Math.round(between(r, 0.03, 0.06) * 100) / 100;
    return {
      kind: "market",
      module: "commercial",
      title: "Der Markt schrumpft",
      text: `Zwei große Kunden bestellen weniger, ein Billiganbieter drängt in die Region. Der Umsatz dürfte um rund ${Math.round(loss * 100)} % sinken und langsamer wachsen.`,
      priceCut: Math.min(0.45, ebitdaHit(x, loss) + 0.04),
      revenuePct: -loss,
      growth: -0.003,
    };
  },
};

const FINDING_KINDS: FindingKind[] = ["ebitda", "pension", "changeOfControl", "lawsuit", "taxAudit", "market"];

/** Zero to two hidden problems; a family business rarely has none worth knowing. */
export function generateFindings(r: () => number, x: FindingInput): Finding[] {
  const roll = r();
  const count = roll < FINDING_COUNT_CHANCE[0] ? 0 : roll < FINDING_COUNT_CHANCE[0] + FINDING_COUNT_CHANCE[1] ? 1 : 2;
  const kinds = [...FINDING_KINDS];
  const out: Finding[] = [];
  for (let i = 0; i < count; i++) {
    const k = kinds.splice(Math.floor(r() * kinds.length) % kinds.length, 1)[0]!;
    out.push(FINDING_DEFS[k](r, x));
  }
  return out;
}

/** Price after the problems the buyer knows about. */
export function priceAfterFindings(price: number, findings: Finding[]): number {
  return findings.filter((f) => f.found).reduce((p, f) => p * (1 - f.priceCut), price);
}
