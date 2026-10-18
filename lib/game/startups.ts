import type { BoardMember, Metrics, SeatId, Startup, StartupNames } from "./types";
import { phaseOf, valuation } from "./sim";

/** Seats as seen from the player's desk, left to right; the founder sits in the middle. */
export const SEAT_ORDER: SeatId[] = ["cto", "vc", "ceo", "indep", "angel"];

export interface StartupDefinition {
  id: string;
  name: string;
  tagline: string;
  sector: string;
  /** Who sends the deal and how it reads in the inbox. */
  mail: { from: string; subject: string; body: string };
  /** Facts the due diligence brings to light, in plain words. */
  diligence: { label: string; text: string; tone: "good" | "warn" | "bad" }[];
  stake: number;
  /** Month the offer arrives (game month). */
  arrives: number;
  board: BoardMember[];
  metrics: Metrics;
  names: StartupNames;
}

export const STARTUPS: StartupDefinition[] = [
  {
    id: "pendelwerk",
    name: "Pendelwerk",
    tagline: "E-Bike-Abos für Pendler",
    sector: "Mobilität",
    names: { city: "Wien", competitor: "Velocity", partner: "die Stadtwerke Nord", acquirer: "Velocity", customer: "Mediwerk Kliniken" },
    stake: 12,
    arrives: 1,
    mail: {
      from: "Lena Hoffmann, Pendelwerk",
      subject: "Angel gesucht: E-Bike-Abos für Pendler",
      body:
        "Hallo, ich bin Lena, Gründerin von Pendelwerk. Wir vermieten E-Bikes im Monatsabo an Pendler und ihre Arbeitgeber. 220 aktive Abos, 6 % Wachstum im Monat. Für unsere Pre-Seed-Runde suchen wir einen Angel, der mehr bringt als Geld: 12 % Anteil und ein Sitz in unserem Beirat. Hast du Zeit für ein Gespräch?",
    },
    diligence: [
      { label: "Wachstum", text: "6 % im Monat, getragen von zwei Arbeitgeber-Verträgen. Die Nachfrage ist echt.", tone: "good" },
      { label: "Kosten", text: "Jedes Rad bindet Kapital. Die Firma verbraucht 31.000 € im Monat, das Geld reicht etwa 8 Monate.", tone: "warn" },
      { label: "Team", text: "Lena verkauft stark, schätzt Kosten aber meist zu optimistisch ein. CTO Jonas widerspricht ihr selten.", tone: "warn" },
      { label: "Wettbewerb", text: "Velocity hat gerade 12 Mio. € eingesammelt und expandiert schnell.", tone: "bad" },
    ],
    board: [
      { seat: "ceo", name: "Lena Hoffmann", short: "Lena", title: "Gründerin & CEO", personality: "visionary", interests: ["growth", "control"] },
      { seat: "cto", name: "Jonas Weber", short: "Jonas", title: "Mitgründer & CTO", personality: "loyal", interests: ["product", "team"] },
      { seat: "vc", name: "Marco Brandt", short: "Marco", title: "Nordlicht Ventures", personality: "doer", interests: ["growth", "cash"] },
      { seat: "indep", name: "Dr. Ines Wahl", short: "Ines", title: "Unabhängige Beirätin", personality: "numbers", interests: ["cash", "control"] },
      { seat: "angel", name: "Harald Brenner", short: "Harald", title: "Business Angel", personality: "practical", interests: ["customer", "team"] },
    ],
    metrics: {
      cash: 240_000,
      revenue: 12_800,
      growth: 0.06,
      grossMargin: 0.35,
      opex: 35_480,
      team: 6,
      morale: 70,
      trust: 60,
      axes: { management: 55, product: 65, market: 70, edge: 40, finance: 35 },
      topCustomer: 0.22,
      debt: 0,
    },
  },
  {
    id: "kantinenkasse",
    name: "Kantinenkasse",
    tagline: "Bestell- und Kassensoftware für Betriebskantinen",
    sector: "Software für Firmen",
    names: { city: "Düsseldorf", competitor: "MenuMax", partner: "der Großhändler Kessler Gastro", acquirer: "die Großküchen AG Westfalen", customer: "Kantinenring West" },
    stake: 12,
    arrives: 1,
    mail: {
      from: "Clara Stein, Rheinkapital",
      subject: "Weiterleitung: Kantinenkasse sucht einen Angel",
      body:
        "Wir sind bei Kantinenkasse investiert und suchen einen zweiten Angel für die Runde. Software für Betriebskantinen, 21.000 € Umsatz im Monat, hohe Marge, ruhiges Wachstum von 3 % im Monat. 12 % Anteil, Sitz im Beirat. Sven, der Gründer, ist ein sehr sorgfältiger Rechner. Schau es dir an.",
    },
    diligence: [
      { label: "Marge", text: "78 % Rohertrag, typisch für Software. Jeder neue Kunde verdient sofort Geld.", tone: "good" },
      { label: "Kunden", text: "Ein Kantinenbetreiber bringt 58 % des Umsatzes. Kündigt er, halbiert sich die Firma.", tone: "bad" },
      { label: "Wachstum", text: "Nur 3 % im Monat. Vertrieb an Konzerne dauert sechs bis neun Monate pro Kunde.", tone: "warn" },
      { label: "Kosten", text: "Etwa 21.600 € Verbrauch im Monat, das Geld reicht knapp 10 Monate.", tone: "warn" },
    ],
    board: [
      { seat: "ceo", name: "Sven Petersen", short: "Sven", title: "Gründer & CEO", personality: "numbers", interests: ["cash", "control"] },
      { seat: "cto", name: "Aylin Demir", short: "Aylin", title: "Mitgründerin & CTO", personality: "doer", interests: ["product", "growth"] },
      { seat: "vc", name: "Clara Stein", short: "Clara", title: "Rheinkapital", personality: "visionary", interests: ["growth", "customer"] },
      { seat: "indep", name: "Prof. Thomas Kühn", short: "Thomas", title: "Unabhängiger Beirat", personality: "diplomat", interests: ["control", "team"] },
      { seat: "angel", name: "Mia Krause", short: "Mia", title: "Business Angel, Gastronomin", personality: "practical", interests: ["customer", "cash"] },
    ],
    metrics: {
      cash: 210_000,
      revenue: 21_000,
      growth: 0.03,
      grossMargin: 0.78,
      opex: 38_000,
      team: 7,
      morale: 64,
      trust: 58,
      axes: { management: 70, product: 60, market: 45, edge: 55, finance: 60 },
      topCustomer: 0.58,
      debt: 0,
    },
  },
  {
    id: "flottenfunk",
    name: "Flottenfunk",
    tagline: "Telematik und Einsatzplanung für Handwerksbetriebe",
    sector: "Software für Firmen",
    names: { city: "Dresden", competitor: "FleetPilot", partner: "die Einkaufsgenossenschaft der Handwerker", acquirer: "FleetPilot", customer: "die Elektro Krüger Gruppe" },
    stake: 10,
    arrives: 3,
    mail: {
      from: "Deniz Arslan, Flottenfunk",
      subject: "Für Handwerker gebaut: Flottenfunk sucht Angel",
      body:
        "Moin! Flottenfunk zeigt Handwerksbetrieben, wo ihre Transporter stehen, und plant die Einsätze. 9 % Wachstum im Monat, noch klein, aber Betriebe lieben es. 10 % Anteil und ein Beiratssitz. Lust auf einen Kaffee in Leipzig?",
    },
    diligence: [
      { label: "Wachstum", text: "9 % im Monat bei kleinem Umsatz. Handwerker empfehlen sich das Produkt gegenseitig.", tone: "good" },
      { label: "Produkt", text: "Sehr gute Bewertungen, aber die App läuft nur mit einem Fahrzeugsender, der eingebaut werden muss.", tone: "warn" },
      { label: "Kosten", text: "Rund 22.000 € Verbrauch im Monat, das Geld reicht gut 7 Monate.", tone: "warn" },
      { label: "Team", text: "Deniz setzt schnell um, manchmal zu schnell. Qualitätsprobleme zeigen sich mit Verzögerung.", tone: "warn" },
    ],
    board: [
      { seat: "ceo", name: "Deniz Arslan", short: "Deniz", title: "Gründer & CEO", personality: "doer", interests: ["growth", "customer"] },
      { seat: "cto", name: "Paula Richter", short: "Paula", title: "Mitgründerin & CTO", personality: "numbers", interests: ["product", "team"] },
      { seat: "vc", name: "Felix Hartmann", short: "Felix", title: "Brückenfonds", personality: "numbers", interests: ["cash", "control"] },
      { seat: "indep", name: "Dr. Sabine Vogt", short: "Sabine", title: "Unabhängige Beirätin", personality: "diplomat", interests: ["team", "customer"] },
      { seat: "angel", name: "Werner Scholz", short: "Werner", title: "Business Angel, Handwerksmeister", personality: "practical", interests: ["customer", "cash"] },
    ],
    metrics: {
      cash: 160_000,
      revenue: 6_500,
      growth: 0.09,
      grossMargin: 0.6,
      opex: 26_000,
      team: 5,
      morale: 74,
      trust: 62,
      axes: { management: 50, product: 70, market: 60, edge: 65, finance: 40 },
      topCustomer: 0.12,
      debt: 0,
    },
  },
];

export function definitionOf(id: string): StartupDefinition {
  const def = STARTUPS.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown startup ${id}`);
  return def;
}

/** A fresh offer for a startup: the ticket follows from the current valuation. */
export function offerStartup(def: StartupDefinition, month: number): Startup {
  const metrics = { ...def.metrics, axes: { ...def.metrics.axes } };
  const value = valuation(metrics);
  const ticket = Math.round((value * def.stake) / 100 / 1000) * 1000;
  return {
    id: def.id,
    status: "offered",
    name: def.name,
    tagline: def.tagline,
    sector: def.sector,
    board: def.board.map((b) => ({ ...b, interests: [...b.interests] })),
    metrics,
    phase: phaseOf(metrics),
    stake: 0,
    joined: 0,
    offer: { ticket, stake: def.stake, expires: month + 2, ddDone: false },
    flags: [],
    crisisMonths: 0,
    history: [],
    names: { ...def.names },
  };
}

export function memberOf(s: Startup, seat: SeatId): BoardMember {
  const m = s.board.find((b) => b.seat === seat);
  if (!m) throw new Error(`Seat ${seat} missing in ${s.id}`);
  return m;
}
