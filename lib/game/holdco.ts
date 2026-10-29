import { annualEbitda, enterpriseValue } from "./ebitda";
import { COVENANT } from "./mna-config";
import { eur, type Ctx } from "./mna-core";
import { valuation } from "./sim";
import { leadOf, platformPrep } from "./team";
import type { AddonTarget, GameState, Holder, Startup } from "./types";

// Holding-Struktur: Zwischenholding als bewusste Entscheidung, Rechte der
// Mitgesellschafter (Vetorecht, Mitverkaufspflicht) und die Passung von
// Zukäufen, die erst die Due Diligence aufdeckt.

export const HOLDCO = {
  /** Notary and tax adviser. */
  cost: 12_000,
  days: 1,
  /** Without a holding the bank wants a personal guarantee for this share of its loan. */
  guarantee: 0.25,
  /** Without drag-along buyers knock this much off the price of a group with co-owners. */
  holdout: 0.05,
  /** Co-owners from this share have a veto on big add-ons. */
  vetoMin: 5,
  /** An add-on is big from this share of the platform's enterprise value. */
  vetoSize: 0.4,
} as const;

export function holdcoBlocker(state: GameState): string | null {
  if (state.holdco) return "Deine Zwischenholding gibt es schon.";
  if (state.familyOffice === undefined) return "Eine Zwischenholding gründest du unter deinem Family Office.";
  if (state.cash < HOLDCO.cost) return `Notar und Steuerberatung kosten ${eur(HOLDCO.cost)}.`;
  return null;
}

export function foundHoldco(ctx: Ctx): void {
  const state = ctx.state;
  const why = holdcoBlocker(state);
  if (why) ctx.fail(why);
  ctx.spend("holdco", "Notar: Zwischenholding", HOLDCO.days);
  state.cash -= HOLDCO.cost;
  state.holdco = { since: state.month, name: "Mittelstand Holding GmbH" };
  ctx.lesson("zwischenholding");
  ctx.lesson("mitverkaufspflicht");
  ctx.mail({
    kind: "system",
    from: "Notariat Dr. Albers",
    subject: "Zwischenholding eingetragen",
    body: `Die Mittelstand Holding GmbH ist gegründet (${eur(HOLDCO.cost)} für Notar und Steuerberatung). Deine gekauften Firmen hängen ab jetzt darunter. Fällt eine aus, haftet die Holding mit ihrem Geld, nicht du privat: Die Bank verzichtet auf deine persönliche Bürgschaft. Mit beurkundet ist eine Gesellschaftervereinbarung mit Mitverkaufspflicht (Drag-along) für alle Mitgesellschafter.`,
  });
}

// ---------------------------------------------------------------------------
// Haftung und Rechte
// ---------------------------------------------------------------------------

/** What the bank takes from your private account when a bought company fails: nothing under a holding. */
export function guaranteeClaim(state: GameState, bank: number, shortfall: number): number {
  if (state.holdco || bank <= 0 || shortfall <= 0) return 0;
  return Math.round(Math.min(shortfall, bank * HOLDCO.guarantee));
}

export function guaranteeText(state: GameState, claim: number): string {
  if (state.holdco) return " Die Zwischenholding trennt die Haftung: Dein Privatvermögen und deine anderen Firmen bleiben unberührt.";
  return claim > 0 ? ` Ohne Zwischenholding greift deine persönliche Bürgschaft: Die Bank holt sich ${eur(claim)} von deinem Konto.` : "";
}

/** Co-owners besides you and your fund. */
export function coOwners(s: Startup): Holder[] {
  return s.capTable.filter((h) => h.kind !== "fund" && h.pct >= 0.5);
}

function vetoHolders(s: Startup): Holder[] {
  return s.capTable.filter((h) => (h.kind === "founder" || h.kind === "cofounder") && h.pct >= HOLDCO.vetoMin);
}

/** Drag-along: under the holding's shareholders' agreement all co-owners must sell along. */
export function dragAlong(state: GameState, s: Startup): boolean {
  return Boolean(state.holdco && s.lbo);
}

/** Price cut of a platform sale when co-owners cannot be dragged along. */
export function holdoutDiscount(state: GameState, s: Startup): number {
  if (dragAlong(state, s) || !s.lbo) return 0;
  return coOwners(s).length > 0 ? HOLDCO.holdout : 0;
}

/** A co-owner with a veto blocks an add-on that is big without a checked fit, or that clearly does not fit. */
export function addonVeto(state: GameState, platform: Startup, a: AddonTarget): string | null {
  const holder = vetoHolders(platform).sort((x, y) => y.pct - x.pct)[0];
  if (!holder) return null;
  const who = `${holder.name} (${holder.pct.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %, Vetorecht)`;
  const fit = fitKnown(state, a) ? addonFit(state, a) : null;
  if (fit?.level === "bad") return `${who} legt ein Veto ein: Die Prüfung zeigt, dass ${a.name} nicht zu ${platform.name} passt.`;
  const ev = enterpriseValue(platform.metrics);
  const size = (a.revenue * a.grossMargin - a.opex) * 12 * a.multiple;
  if (!fit && size > ev * HOLDCO.vetoSize) return `${who} stimmt einem so großen Zukauf nur zu, wenn eine Commercial Due Diligence die Passung zeigt.`;
  return null;
}

// ---------------------------------------------------------------------------
// Passung von Zukäufen
// ---------------------------------------------------------------------------

export type FitCriterion = "branche" | "kultur" | "standort" | "kunden";
export const FIT_CRITERIA: { id: FitCriterion; label: string; good: string; bad: string }[] = [
  { id: "branche", label: "Branche", good: "gleiches Kerngeschäft, Einkauf lässt sich bündeln", bad: "anderes Geschäft, kaum gemeinsamer Einkauf" },
  { id: "kultur", label: "Kultur", good: "ähnliche Führung, Leute wollen mitziehen", bad: "Inhabergeführt und stolz, Widerstand gegen die Gruppe" },
  { id: "standort", label: "Standort", good: "nah genug für gemeinsame Touren und Lager", bad: "weit weg, doppelte Verwaltung bleibt" },
  { id: "kunden", label: "Kunden", good: "Kunden kaufen auch bei der Plattform (Cross-Selling)", bad: "Kunden überschneiden sich, sie wechseln zur Konkurrenz" },
];

export type AddonFitLevel = "good" | "ok" | "bad";
export interface AddonFit {
  level: AddonFitLevel;
  score: number;
  criteria: Record<FitCriterion, -1 | 0 | 1>;
}

/** Odds per criterion: good, average (the rest), bad. */
const ODDS: Record<FitCriterion, [number, number]> = { branche: [0.5, 0.15], kultur: [0.3, 0.3], standort: [0.35, 0.25], kunden: [0.3, 0.3] };

export const FIT_EFFECT = {
  /** Extra chance that the savings come, and the share of the add-on's EBITDA saved on top. */
  good: { synergy: 0.15, churn: -0.05, extra: 0.1, cost: 1 },
  ok: { synergy: 0, churn: 0, extra: 0, cost: 1 },
  /** Dis-synergies: costlier integration, people leave, lasting double costs. */
  bad: { synergy: -0.2, churn: 0.2, extra: -0.1, cost: 1.5 },
} as const;
/** A bad fit: share of the add-on's team that resigns at closing. */
export const FIT_LEAVERS = 0.15;

/** Fixed by the seed: the same add-on always fits the same way. */
export function addonFit(state: GameState, a: AddonTarget): AddonFit {
  const r = rand(state.seed, `fit|${a.id}`);
  const criteria = {} as Record<FitCriterion, -1 | 0 | 1>;
  let sum = 0;
  for (const c of FIT_CRITERIA) {
    const x = r();
    const [good, bad] = ODDS[c.id];
    const v = x < good ? 1 : x > 1 - bad ? -1 : 0;
    criteria[c.id] = v;
    sum += v;
  }
  return { level: sum >= 2 ? "good" : sum <= -1 ? "bad" : "ok", score: sum / 4, criteria };
}

/** The fit shows after a commercial due diligence, or when a partner on the platform prepared the add-on. */
export function fitKnown(state: GameState, a: AddonTarget): boolean {
  if (a.dd.includes("commercial")) return true;
  const p = state.startups.find((s) => s.id === a.platformId);
  return Boolean(p && platformPrep(state, p).reveal);
}

/** At closing: with a bad fit key people resign right away. */
export function fitAtClose(state: GameState, a: AddonTarget): { level: AddonFitLevel; leavers: number } {
  const fit = addonFit(state, a);
  return { level: fit.level, leavers: fit.level === "bad" ? Math.max(1, Math.round(a.team * FIT_LEAVERS)) : 0 };
}

/** Extra yearly savings (or double costs) of a finished integration, a term of its own next to the regular synergies. */
export function fitSynergy(level: AddonFitLevel | undefined, ebitda: number): number {
  return FIT_EFFECT[level ?? "ok"].extra * Math.max(0, ebitda);
}

function rand(seed: number, purpose: string): () => number {
  // Same generator as the engine; kept local so this module needs no engine import.
  let h = 2166136261;
  const text = `${seed}|${purpose}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Ansicht: Gesellschaftsstruktur
// ---------------------------------------------------------------------------

export interface StructureCompany {
  id: string;
  name: string;
  kind: "startup" | "buyout" | "platform";
  label: string;
  stake: number;
  fundPct: number;
  value: number;
  lead?: string;
  coOwners: { name: string; pct: number; veto: boolean }[];
  bank?: { amount: number; leverage: number; limit: number };
  addons: number;
  rights: string[];
}

export interface StructureView {
  founded: boolean;
  holdco?: { name: string; since: number };
  blocker: string | null;
  cost: number;
  days: number;
  worth: number;
  cash: number;
  fund?: { name: string; size: number };
  direct: StructureCompany[];
  bought: StructureCompany[];
  viaFund: StructureCompany[];
  corporate?: { id: string; name: string };
  /** Bank loans in bought companies that you guarantee personally without a holding. */
  guarantee: number;
  guaranteeShare: number;
  holdout: number;
  vetoMin: number;
  vetoSize: number;
}

export function structureView(state: GameState, worth: number): StructureView {
  const active = state.startups.filter((s) => s.status === "active");
  const node = (s: Startup): StructureCompany => {
    const fundPct = s.capTable.filter((h) => h.kind === "fund").reduce((sum, h) => sum + h.pct, 0);
    // Veto and drag-along are rules of the bought companies; startups have their own board (see the company page).
    const vetoes = new Set(s.lbo ? vetoHolders(s).map((h) => h.id) : []);
    const rights: string[] = [];
    if (s.lbo) {
      if (vetoes.size > 0) rights.push(`Vetorecht bei großen Zukäufen (ab ${Math.round(HOLDCO.vetoSize * 100)} % des Firmenwerts) und bei Zukäufen, die nicht passen`);
      if (coOwners(s).length > 0)
        rights.push(
          dragAlong(state, s) ? "Mitverkaufspflicht: Beim Verkauf verkaufen alle mit" : `Keine Mitverkaufspflicht: Käufer ziehen ${Math.round(HOLDCO.holdout * 100)} % ab`,
        );
    }
    return {
      id: s.id,
      name: s.name,
      kind: s.platform ? "platform" : s.lbo ? "buyout" : "startup",
      label: s.platform ? "Plattform" : s.lbo ? "Gekaufter Familienbetrieb" : s.sector,
      stake: s.stake,
      fundPct,
      value: (valuation(s.metrics) * s.stake) / 100,
      lead: leadOf(state, s)?.member.name,
      coOwners: coOwners(s)
        .sort((a, b) => Number(vetoes.has(b.id)) - Number(vetoes.has(a.id)) || b.pct - a.pct)
        .map((h) => ({ name: h.name, pct: h.pct, veto: vetoes.has(h.id) })),
      bank: s.lbo && s.lbo.bank > 0 ? { amount: s.lbo.bank, leverage: s.lbo.bank / Math.max(1, annualEbitda(s.metrics)), limit: COVENANT + (s.lbo.headroom ?? 0) } : undefined,
      addons: s.platform?.addons.length ?? 0,
      rights,
    };
  };
  const companies = active.filter((s) => !s.corporate);
  const bought = companies.filter((s) => s.lbo).map(node);
  const corp = active.find((s) => s.corporate);
  return {
    founded: state.familyOffice !== undefined,
    holdco: state.holdco,
    blocker: holdcoBlocker(state),
    cost: HOLDCO.cost,
    days: HOLDCO.days,
    worth,
    cash: state.cash,
    fund: state.fund ? { name: state.fund.name, size: state.fund.size } : undefined,
    direct: companies.filter((s) => !s.lbo && s.stake > 0).map(node),
    bought,
    viaFund: companies.filter((s) => !s.lbo && s.stake <= 0).map(node),
    corporate: corp ? { id: corp.id, name: corp.name } : undefined,
    guarantee: state.holdco ? 0 : Math.round(bought.reduce((sum, c) => sum + (c.bank?.amount ?? 0), 0) * HOLDCO.guarantee),
    guaranteeShare: HOLDCO.guarantee,
    holdout: HOLDCO.holdout,
    vetoMin: HOLDCO.vetoMin,
    vetoSize: HOLDCO.vetoSize,
  };
}
