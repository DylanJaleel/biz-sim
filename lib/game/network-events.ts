import { START_MONTH_INDEX } from "./config";
import type { Trait } from "./network";
import { CITIES, garageOf, type City } from "./travel";
import type { GameState } from "./types";

// Der Jahreskalender des Netzwerks: feste Termine, bei denen man viele Leute
// auf einmal trifft. Hingehen kostet Tage, Ticket und Anreise; dafür wärmt es
// mehrere Beziehungen, bringt neue Bekannte und manchmal einen Deal.

export interface EventDef {
  id: string;
  name: string;
  /** Calendar month, 0 = January. */
  month: number;
  city: string;
  days: number;
  ticket: number;
  minReputation: number;
  text: string;
  /** Roles that come every year. */
  guests: string[];
  /** People with these interests come too, and enjoy it more. */
  traits: Trait[];
  /** Chance of a deal: early-stage startups, or a family business for sale. */
  deal?: { chance: number; kind: "early" | "buyout" };
  /** Chance of an M&A mandate offer. */
  mandate?: number;
  /** A talk on stage: from this reputation, for this much reputation. */
  talk?: { from: number; reputation: number; title: string };
}

export const EVENTS: EventDef[] = [
  {
    id: "neujahr",
    name: "Neujahrsempfang der IHK",
    month: 0,
    city: "koeln",
    days: 1,
    ticket: 0,
    minReputation: 0,
    text: "Sekt, kurze Reden, lange Gespräche: Wer in der Region etwas bewegt, ist da.",
    guests: ["steuer", "anwalt", "bank", "vertrieb", "recruiter"],
    traits: ["gesellig"],
    deal: { chance: 0.05, kind: "early" },
  },
  {
    id: "ma_konferenz",
    name: "M&A-Konferenz",
    month: 2,
    city: "frankfurt",
    days: 2,
    ticket: 1_900,
    minReputation: 35,
    text: "Zwei Tage Panels über Bewertungen, Finanzierung und Nachfolge. Die eigentlichen Deals entstehen in den Pausen.",
    guests: ["boutique", "wp", "kanzlei", "levfin", "bank", "kartell"],
    traits: ["zahlen"],
    mandate: 0.25,
    talk: { from: 55, reputation: 2, title: "Panel über Nachfolge im Mittelstand" },
  },
  {
    id: "startup_nacht",
    name: "Startup-Nacht",
    month: 3,
    city: "berlin",
    days: 1,
    ticket: 150,
    minReputation: 0,
    text: "Fünfzig Pitches, ein voller Saal und Investoren, die schnell entscheiden.",
    guests: ["angels", "growth", "recruiter", "vcpartner", "dealflow"],
    traits: ["sport", "gesellig"],
    deal: { chance: 0.3, kind: "early" },
    talk: { from: 30, reputation: 1, title: "Jury beim Pitch-Wettbewerb" },
  },
  {
    id: "golf",
    name: "Golfturnier des Wirtschaftsclubs",
    month: 4,
    city: "wuppertal",
    days: 1,
    ticket: 650,
    minReputation: 30,
    text: "Achtzehn Löcher, vier Stunden pro Flight. Genug Zeit, um über alles zu reden, außer Golf.",
    guests: ["einkauf", "bank", "steuer", "levfin", "foerder"],
    traits: ["golf"],
    deal: { chance: 0.1, kind: "buyout" },
  },
  {
    id: "fo_forum",
    name: "Family Office Forum",
    month: 5,
    city: "luzern",
    days: 2,
    ticket: 2_500,
    minReputation: 60,
    text: "Am See treffen sich Familienvermögen, Fondsmanager und Berater. Wer hier eingeladen ist, gehört dazu.",
    guests: ["vcpartner", "levfin", "boutique", "dealflow", "kartell", "interim"],
    traits: ["kultur"],
    deal: { chance: 0.3, kind: "buyout" },
    talk: { from: 75, reputation: 2, title: "Vortrag über dein Family Office" },
  },
  {
    id: "sommerfest",
    name: "Sommerfest der Sparkasse",
    month: 6,
    city: "koeln",
    days: 1,
    ticket: 0,
    minReputation: 0,
    text: "Grill, Blasmusik und der halbe Mittelstand der Stadt. Die Bank lädt ein, alle kommen.",
    guests: ["bank", "steuer", "foerder", "anwalt", "angels", "vertrieb"],
    traits: ["gesellig", "familie"],
  },
  {
    id: "unternehmertag",
    name: "Unternehmertag Mittelstand",
    month: 8,
    city: "muenchen",
    days: 1,
    ticket: 450,
    minReputation: 40,
    text: "Inhaber, Nachfolger und ihre Berater: ein Tag über Übergaben, Fachkräfte und Finanzierung.",
    guests: ["interim", "wp", "kanzlei", "einkauf", "recruiter", "boutique"],
    traits: ["familie"],
    mandate: 0.2,
    talk: { from: 45, reputation: 2, title: "Vortrag über Beiratsarbeit" },
  },
  {
    id: "gruenderpreis",
    name: "Gründerpreis-Gala",
    month: 10,
    city: "koeln",
    days: 1,
    ticket: 400,
    minReputation: 20,
    text: "Abendkleid und Smoking: Der Landespreis für die besten Gründungen des Jahres.",
    guests: ["angels", "growth", "vcpartner", "foerder", "dealflow", "recruiter"],
    traits: ["kultur"],
    deal: { chance: 0.2, kind: "early" },
    talk: { from: 50, reputation: 1, title: "Laudatio auf die Preisträger" },
  },
  {
    id: "branchendinner",
    name: "Branchendinner",
    month: 11,
    city: "hamburg",
    days: 1,
    ticket: 250,
    minReputation: 20,
    text: "Gans, Rotwein und die Pläne fürs nächste Jahr. Hier wird verabredet, was im Januar unterschrieben wird.",
    guests: ["vertrieb", "recruiter", "einkauf", "growth", "kanzlei"],
    traits: ["gesellig"],
  },
];

export function eventDef(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}

/** Calendar month of a game month (the game starts in October). */
export function calendarMonth(month: number): number {
  return (START_MONTH_INDEX + month - 1) % 12;
}

/** The event of a game month, if there is one. */
export function eventIn(month: number): EventDef | undefined {
  return EVENTS.find((e) => e.month === calendarMonth(month));
}

export interface EventTravel {
  city: City;
  days: number;
  cost: number;
  how: string;
}

/**
 * The trip, simplified: by train, a day more when far away. A fast car of
 * one's own saves the day. Two-day events include the night there.
 */
export function eventTravel(state: GameState, def: EventDef): EventTravel {
  const city = CITIES[def.city] ?? CITIES.koeln!;
  const far = city.distance !== "local";
  const fast = garageOf(state).find((v) => v.kind === "car" && v.fast);
  const train = { local: 30, national: 120, international: 160 }[city.distance];
  if (fast) return { city, days: 0, cost: fast.trip[city.distance], how: fast.name };
  return { city, days: far && def.days < 2 ? 1 : 0, cost: train, how: "Zug" };
}

/** Days and money for going, with or without a talk. */
export function eventCost(state: GameState, def: EventDef, talk: boolean): { days: number; money: number; travel: EventTravel } {
  const travel = eventTravel(state, def);
  return { days: def.days + travel.days + (talk ? 1 : 0), money: def.ticket + travel.cost, travel };
}
