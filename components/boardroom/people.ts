import { SEAT_ORDER } from "@/lib/game/startups";
import type { BoardMember, Interest, Personality, SeatId, SpeakerId } from "@/lib/game/types";

// Wie die Leute am Tisch erscheinen: Kürzel, Farbe, Rolle. Du sitzt am Pult an der offenen Seite.

export interface Person {
  id: SpeakerId;
  name: string;
  full: string;
  title: string;
  role: string;
  initials: string;
  color: string;
}

export const ROLE: Record<SpeakerId, string> = {
  ceo: "CEO",
  cto: "CTO",
  vc: "Investor",
  indep: "Unabhängig",
  angel: "Angel",
  you: "Du",
};

/** In a corporation the seats stand for other roles. */
const CORPORATE_ROLE: Record<SpeakerId, string> = {
  ceo: "Vorstand",
  cto: "Finanzen",
  vc: "Großaktionär",
  indep: "Unabhängig",
  angel: "Belegschaft",
  you: "Du",
};

/** In a family business the seats are owner, proxy, bank, adviser and works council. */
const FAMILY_ROLE: Record<SpeakerId, string> = {
  ceo: "Inhaber",
  cto: "Prokura",
  vc: "Hausbank",
  indep: "Berater",
  angel: "Betriebsrat",
  you: "Du",
};

/** Seat colours, tuned to read on light and dark surfaces alike. */
const COLOR: Record<SpeakerId, string> = {
  ceo: "#2342f5",
  cto: "#0e9f8e",
  vc: "#7b4dff",
  indep: "#d48a10",
  angel: "#e0457b",
  you: "#11151c",
};

export const PERSONALITY_LABEL: Record<Personality, string> = {
  visionary: "Visionär",
  numbers: "Zahlenmensch",
  doer: "Macher",
  diplomat: "Diplomat",
  loyal: "Loyal",
  practical: "Praktiker",
};

export const INTEREST_LABEL: Record<Interest, string> = {
  growth: "Wachstum",
  cash: "Liquidität",
  team: "Team",
  product: "Produkt",
  customer: "Kunden",
  control: "Kontrolle",
};

function initialsOf(name: string): string {
  const parts = name.replace(/^(Dr\.|Prof\.)\s*/g, "").replace(/^(Dr\.|Prof\.)\s*/g, "").split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export type People = Record<SpeakerId, Person>;

export function peopleOf(board: BoardMember[], corporate = false, family = false): People {
  const roles = corporate ? CORPORATE_ROLE : family ? FAMILY_ROLE : ROLE;
  const people = {
    you: { id: "you", name: "Du", full: "Du", title: corporate ? "Aufsichtsrat" : "Business Angel", role: roles.you, initials: "Du", color: COLOR.you },
  } as People;
  for (const m of board) {
    people[m.seat] = { id: m.seat, name: m.short, full: m.name, title: m.title, role: roles[m.seat], initials: initialsOf(m.name), color: COLOR[m.seat] };
  }
  return people;
}

export function seatedOf(board: BoardMember[]): SeatId[] {
  return SEAT_ORDER.filter((seat) => board.some((m) => m.seat === seat));
}
