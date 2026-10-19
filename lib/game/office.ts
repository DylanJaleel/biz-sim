import { DAYS_PER_MONTH, PARTNER_DAYS } from "./config";
import type { GameState } from "./types";

// Vom Küchentisch in die oberste Etage. Jedes Büro kostet Miete und bringt
// etwas, das Zeit spart: Assistenz, Analysten, mehr Aufträge, mehr Deals.

export interface OfficeLevel {
  level: number;
  name: string;
  rent: number;
  reputation: number;
  /** Net worth (account, depot, stakes) needed to move in. */
  worth: number;
  perks: string[];
  extraDays: number;
  extraGigs: number;
  ddDays: number;
  /** An analyst prepares CFO talks and questions: no days. */
  analyst: boolean;
}

export const OFFICES: OfficeLevel[] = [
  { level: 0, name: "Küchentisch", rent: 0, reputation: 0, worth: 0, perks: ["Kostet nichts", "Alles machst du selbst"], extraDays: 0, extraGigs: 0, ddDays: 3, analyst: false },
  { level: 1, name: "Platz im Coworking", rent: 500, reputation: 25, worth: 0, perks: ["Ein Beratungsauftrag mehr pro Monat", "Leute aus der Szene am Nebentisch"], extraDays: 0, extraGigs: 1, ddDays: 3, analyst: false },
  { level: 2, name: "Eigenes Büro mit Assistenz", rent: 2_500, reputation: 40, worth: 300_000, perks: ["Prüfungen dauern 2 statt 3 Tage", "Ein Beratungsauftrag mehr pro Monat"], extraDays: 0, extraGigs: 1, ddDays: 2, analyst: false },
  { level: 3, name: "Büroetage mit Analyst", rent: 6_000, reputation: 60, worth: 750_000, perks: ["Der Analyst übernimmt CFO-Gespräche und Rückfragen", "Zwei Arbeitstage mehr im Monat", "Prüfungen in 2 Tagen"], extraDays: 2, extraGigs: 1, ddDays: 2, analyst: true },
  { level: 4, name: "Oberste Etage", rent: 12_000, reputation: 80, worth: 2_000_000, perks: ["Vier Arbeitstage mehr im Monat", "Ein Team erledigt die Vorbereitung", "Voraussetzung für das Family Office"], extraDays: 4, extraGigs: 2, ddDays: 1, analyst: true },
];

export function officeOf(state: GameState): OfficeLevel {
  return OFFICES[Math.max(0, Math.min(OFFICES.length - 1, state.office ?? 0))]!;
}

export function monthDays(state: GameState): number {
  const partners = (state.team ?? []).filter((m) => m.role === "partner").length;
  return DAYS_PER_MONTH + officeOf(state).extraDays + partners * PARTNER_DAYS;
}
