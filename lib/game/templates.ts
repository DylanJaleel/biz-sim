import { monthlyCashFlow, runwayMonths, valuation } from "./sim";
import type { Delta, Effect, Interest, Startup, Vote } from "./types";

// A board item ("Vorlage") is data: who wants what, which reasons exist for and
// against, which arguments the player can bring, what each outcome does.

export interface Reason {
  interest: Interest;
  text: string;
}

export interface Argument {
  id: string;
  text: string;
  /** The outcome this argument argues for. */
  toward: Vote;
  /** Members with one of these interests listen. */
  appeals: Interest[];
}

export interface Question {
  id: string;
  q: string;
  a: (s: Startup) => string;
}

export interface RiskDef {
  delay: number;
  chance: number;
  good: Delta;
  bad: Delta;
  goodText: string;
  badText: string;
}

export interface ResolvedOutcome {
  effects: Effect[];
  risk?: RiskDef;
}

export interface OutcomeDef {
  label: string;
  summary: string;
  resolve: (s: Startup) => ResolvedOutcome;
}

export interface Template {
  id: string;
  title: string;
  motion: string;
  pitch: string;
  context: (s: Startup) => string;
  lesson: string;
  insight: string;
  /** Months since the player joined are passed in as `age`. */
  when: (s: Startup, age: number) => boolean;
  urgent?: boolean;
  /** Only for the corporate supervisory board (and only there). */
  corporate?: boolean;
  /** Cooldown in months; without it a template appears once per company. */
  repeatAfter?: number;
  /** How attractive approving the motion is to each interest (-1..1). */
  pull: Partial<Record<Interest, number>>;
  pro: Reason[];
  contra: Reason[];
  arguments: [Argument, Argument, Argument];
  questions: Question[];
  outcomes: Record<Vote, OutcomeDef>;
}

// ---------------------------------------------------------------------------
// Helpers for writing templates
// ---------------------------------------------------------------------------

export const burn = (s: Startup) => Math.max(0, -monthlyCashFlow(s.metrics));
export const runway = (s: Startup) => runwayMonths(s.metrics);
export const valueOf = (s: Startup) => valuation(s.metrics);
export const axis = (s: Startup, key: keyof Startup["metrics"]["axes"]) => s.metrics.axes[key];
export const clampChance = (p: number) => Math.min(0.9, Math.max(0.1, p));
export const has = (s: Startup, flag: string) => s.flags.includes(flag);

export function eur(value: number): string {
  const rounded = Math.round(value / 1000) * 1000;
  return `${rounded.toLocaleString("de-DE")} €`;
}

export function months(value: number): string {
  if (!Number.isFinite(value)) return "unbegrenzt, die Firma verdient Geld";
  const m = Math.round(value);
  return m === 1 ? "etwa 1 Monat" : `etwa ${m} Monate`;
}

export function pct(value: number): string {
  return `${(Math.round(value * 1000) / 10).toLocaleString("de-DE")} %`;
}

export const now = (text: string, delta: Delta): Effect => ({ delay: 0, text, delta });
export const later = (delay: number, text: string, delta: Delta): Effect => ({ delay, text, delta });

/** Replaces {ceo}, {cto}, {vc}, {indep}, {angel}, {name}, {city}, {competitor}, {partner}, {acquirer}, {customer}. */
export function fill(text: string, s: Startup): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const member = s.board.find((b) => b.seat === key);
    if (member) return member.short;
    if (key === "name") return s.name;
    if (key in s.names) return s.names[key as keyof Startup["names"]];
    return match;
  });
}
