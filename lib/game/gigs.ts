import { BOARD_FEES, DAY_RATE_BASE, DAY_RATE_PER_REPUTATION } from "./config";
import { valuation } from "./sim";
import type { Gig, Metrics } from "./types";

// Bezahlte Arbeit neben dem Portfolio: Beratung, Vorträge, Interim-Rollen.
// Jeder Auftrag kostet Tage, die im Beirat fehlen.

interface GigDef {
  kind: string;
  client: string;
  title: string;
  text: string;
  days: number;
  /** Multiplier on the day rate. */
  rate: number;
  minReputation: number;
  /** First month it can appear; early months stay simple. */
  fromMonth: number;
  reputation?: number;
  contactId?: string;
  warmth?: number;
}

const GIGS: GigDef[] = [
  { kind: "workshop", client: "Metallbau Kröger", title: "Strategie-Workshop", text: "Ein Tag mit der Geschäftsführung: Wohin soll der Betrieb in fünf Jahren?", days: 1, rate: 1, minReputation: 0, fromMonth: 1 },
  { kind: "pitch", client: "Gründerzentrum Nord", title: "Pitch-Training", text: "Zehn Gründerteams üben ihren Auftritt vor Investoren.", days: 1, rate: 0.8, minReputation: 0, fromMonth: 1 },
  { kind: "expert", client: "Expertennetzwerk Atlas", title: "Expertengespräche", text: "Investoren zahlen für eine Stunde deiner Einschätzung zu Startups, gesammelt an einem Tag.", days: 1, rate: 1.2, minReputation: 0, fromMonth: 1 },
  { kind: "mentor", client: "Accelerator Hafenstart", title: "Mentoring-Tage", text: "Zwei Tage mit jungen Teams. Wenig Geld, aber Sophie Brandt vom Angel-Netzwerk ist auch da.", days: 2, rate: 0.6, minReputation: 0, fromMonth: 2, contactId: "angels", warmth: 15 },
  { kind: "dd", client: "Family Office Thalberg", title: "Gutachten zur Due Diligence", text: "Ein Family Office will vor einem Einstieg eine zweite Meinung.", days: 3, rate: 1.2, minReputation: 0, fromMonth: 2 },
  { kind: "bank", client: "Stadtsparkasse", title: "Kreditgutachten", text: "Die Sparkasse bittet um eine Einschätzung zu einem Firmenkunden. Ralf Becker leitet das Projekt.", days: 2, rate: 1.1, minReputation: 20, fromMonth: 3, contactId: "bank", warmth: 15 },
  { kind: "lecture", client: "Hochschule Rhein", title: "Gastdozentur", text: "Zwei Vorlesungstage zu Startup-Finanzierung. Bringt Ansehen, kaum Geld.", days: 2, rate: 0.5, minReputation: 20, fromMonth: 3, reputation: 1 },
  { kind: "talk", client: "Mittelstandstag", title: "Vortrag auf der Bühne", text: "Dreißig Minuten über Beiratsarbeit vor fünfhundert Unternehmern.", days: 1, rate: 1.4, minReputation: 30, fromMonth: 4, reputation: 1 },
  { kind: "interim", client: "Feinguss Weber", title: "Interim-CFO", text: "Ein Familienbetrieb braucht für einen Monat jemanden, der die Finanzen sortiert.", days: 6, rate: 1.3, minReputation: 30, fromMonth: 4 },
  { kind: "turnaround", client: "Insolvenzverwalter Dr. Haas", title: "Sanierungsgutachten", text: "Lohnt sich die Rettung eines insolventen Zulieferers? Viel Arbeit, gut bezahlt.", days: 5, rate: 1.5, minReputation: 45, fromMonth: 6 },
  { kind: "corporate", client: "Brenner Konzern", title: "Innovationsprojekt im Konzern", text: "Der Konzern sucht Startups für die Zusammenarbeit. Stefan Krämer aus dem Einkauf sitzt mit am Tisch.", days: 4, rate: 1.6, minReputation: 55, fromMonth: 6, contactId: "einkauf", warmth: 15 },
  { kind: "board", client: "Familienunternehmen Lorenz", title: "Beirat auf Zeit", text: "Drei Sitzungstage in einem Familienunternehmen, das die Nachfolge regelt.", days: 3, rate: 1.4, minReputation: 40, fromMonth: 5, reputation: 1 },
];

export function dayRate(reputation: number): number {
  return Math.round((DAY_RATE_BASE + reputation * DAY_RATE_PER_REPUTATION) / 10) * 10;
}

/** This month's offers: two simple ones at the start, three later, drawn from what fits the reputation. */
export function drawGigs(month: number, reputation: number, random: () => number, nextId: () => string, extra = 0): Gig[] {
  const pool = GIGS.filter((g) => g.fromMonth <= month && g.minReputation <= reputation);
  // Early months stay simple; later the offers vary in number and size.
  const count = (month <= 2 ? 2 : random() < 0.35 ? 3 : 2) + extra;
  const picked: GigDef[] = [];
  while (picked.length < count && picked.length < pool.length) {
    const g = pool[Math.floor(random() * pool.length) % pool.length]!;
    if (!picked.includes(g)) picked.push(g);
  }
  const rate = dayRate(reputation);
  return picked.map((g) => ({
    id: nextId(),
    month,
    kind: g.kind,
    client: g.client,
    title: g.title,
    text: g.text,
    days: g.days,
    // Some months pay better than others.
    fee: Math.round((g.days * rate * g.rate * (0.9 + random() * 0.25)) / 50) * 50,
    reputation: g.reputation,
    contactId: g.contactId,
    warmth: g.warmth,
    status: "offered" as const,
  }));
}

export function boardFee(m: Metrics): number {
  const value = valuation(m);
  return BOARD_FEES.find((t) => value <= t.upTo)!.fee;
}
