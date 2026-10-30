import {
  BUYOUT_REPUTATION,
  BUYOUT_WORTH,
  CARRY,
  CORPORATE_REPUTATION,
  FAMILY_OFFICE_REPUTATION,
  FAMILY_OFFICE_WORTH,
  FUND_EXITS,
  FUND_OFFICE_MONTHS,
  FUND_REPUTATION,
  LEAD_REPUTATION,
  START_REPUTATION,
  SYNDICATE_REPUTATION,
} from "./config";
import { MANDATE_REPUTATION, PLATFORM_REPUTATION } from "./mna-config";
import type { GameState, OnboardingState } from "./types";

// Einführung für neue Spieler: wann sie von selbst startet und welche Freischaltungen
// einen einmaligen Hinweis bekommen. Nur reine Funktionen und Konstanten aus der
// Spielkonfiguration, damit die Oberfläche (Client) sie laden kann. Gespeichert wird
// im Spielstand (state.onboarding), geschrieben nur beim Beenden der Einführung und
// beim Quittieren eines Hinweises.

export { START_REPUTATION };

export interface Unlock {
  id: string;
  /** Ruf, ab dem die Funktion offen ist. */
  reputation: number;
  title: string;
  /** Eine Zeile: was jetzt geht und was sonst noch gebraucht wird. */
  text: string;
  href: string;
}

const mio = (n: number) => `${(n / 1_000_000).toLocaleString("de-DE")} Mio. €`;

/** Die Leiter der Freischaltungen, aufsteigend nach Ruf. Alle Zahlen stammen aus der Spielkonfiguration. */
export const UNLOCKS: Unlock[] = [
  {
    id: "mandate",
    reputation: MANDATE_REPUTATION,
    title: "Nachfolge & Übernahmen",
    text: "Firmen beim Kauf oder Verkauf beraten (M&A-Mandate). Anfragen liegen bei den Aufträgen im Büro.",
    href: "/nachfolge",
  },
  {
    id: "lead",
    reputation: LEAD_REPUTATION,
    title: "Runden anführen",
    text: "Bei Finanzierungsrunden kannst du die Führung übernehmen und nimmst die Hälfte der Runde.",
    href: "/portfolio",
  },
  {
    id: "syndicate",
    reputation: SYNDICATE_REPUTATION,
    title: "Syndikat",
    text: `Du führst ein Syndikat mit Mitinvestoren und behältst ${Math.round(CARRY * 100)} % des Gewinns als Carry.`,
    href: "/portfolio",
  },
  {
    id: "buyout",
    reputation: BUYOUT_REPUTATION,
    title: "Firmen kaufen",
    text: `Familienbetriebe bieten sich zum Kauf an, sobald dein Vermögen ${mio(BUYOUT_WORTH)} erreicht.`,
    href: "/nachfolge",
  },
  {
    id: "corporate",
    reputation: CORPORATE_REPUTATION,
    title: "Aufsichtsrat im Konzern",
    text: "Mit einer geführten Runde oder einer Mehrheit fragt ein Konzern per Post nach einem Mandat.",
    href: "/post",
  },
  {
    id: "holding",
    reputation: FAMILY_OFFICE_REPUTATION,
    title: "Holding & Family Office",
    text: `Du kannst ein Family Office gründen, sobald Vermögen (${mio(FAMILY_OFFICE_WORTH)}) und Büroetage stimmen.`,
    href: "/holding",
  },
  {
    id: "platform",
    reputation: PLATFORM_REPUTATION,
    title: "Plattform-Investor",
    text: "Mit Family Office kannst du Firmen zu einer Plattform bündeln und mit Zukäufen ausbauen.",
    href: "/nachfolge",
  },
  {
    id: "fund",
    reputation: FUND_REPUTATION,
    title: "Eigener Fonds",
    text: `Du brauchst noch ${FUND_EXITS} erfolgreiche Verkäufe und ein Family Office, das ${FUND_OFFICE_MONTHS} Monate läuft.`,
    href: "/holding",
  },
].sort((a, b) => a.reputation - b.reputation);

const KNOWN = new Set(UNLOCKS.map((u) => u.id));

/** Die Einführung startet von selbst nur in einem neuen Spiel: Monat 1 und noch nicht beendet. Ältere Stände gelten als erledigt. */
export function shouldAutoStartTour(state: Pick<GameState, "month" | "onboarding">): boolean {
  return state.month <= 1 && !state.onboarding?.done;
}

/** Freischaltungen, die der Ruf schon erreicht hat. */
export function reachedUnlocks(reputation: number): Unlock[] {
  return UNLOCKS.filter((u) => reputation >= u.reputation);
}

/**
 * Freischaltungen, die erreicht und noch nicht quittiert sind. Solange der Stand keine Liste hat
 * (neues Spiel vor dem ersten Abschluss, ältere Stände), gibt es keine Hinweise: Beim ersten
 * Monatsabschluss wird die Liste mit dem damaligen Stand angelegt (seedUnlocks).
 */
export function pendingUnlocks(state: Pick<GameState, "reputation" | "onboarding">): Unlock[] {
  const seen = state.onboarding?.seen;
  if (!seen) return [];
  return reachedUnlocks(state.reputation).filter((u) => !seen.includes(u.id));
}

/** Legt beim Monatsabschluss die Liste bekannter Freischaltungen an, damit nur Neues gemeldet wird. */
export function seedUnlocks(state: GameState): void {
  if (state.onboarding?.seen) return;
  state.onboarding = { ...state.onboarding, seen: reachedUnlocks(state.reputation).map((u) => u.id) };
}

export interface OnboardingPatch {
  done?: boolean;
  step?: number;
  seen?: string[];
}

/** Prüft eine Eingabe aus dem Browser und lässt nur bekannte Felder und Werte durch. */
export function parseOnboardingPatch(input: unknown): OnboardingPatch | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;
  const patch: OnboardingPatch = {};
  if (raw.done !== undefined) {
    if (typeof raw.done !== "boolean") return null;
    patch.done = raw.done;
  }
  if (raw.step !== undefined) {
    if (typeof raw.step !== "number" || !Number.isInteger(raw.step) || raw.step < 0 || raw.step > 20) return null;
    patch.step = raw.step;
  }
  if (raw.seen !== undefined) {
    if (!Array.isArray(raw.seen) || raw.seen.length > 20 || raw.seen.some((id) => typeof id !== "string" || !KNOWN.has(id))) return null;
    patch.seen = raw.seen as string[];
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

/** Übernimmt einen Eintrag in den Stand; gesehene Hinweise werden vereinigt, nie entfernt. */
export function applyOnboardingPatch(current: OnboardingState | undefined, patch: OnboardingPatch): OnboardingState {
  const next: OnboardingState = { ...current };
  if (patch.done !== undefined) next.done = patch.done;
  if (patch.step !== undefined) next.step = patch.step;
  if (patch.seen) next.seen = Array.from(new Set([...(current?.seen ?? []), ...patch.seen]));
  return next;
}
