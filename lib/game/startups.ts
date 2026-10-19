import type { BoardMember, Holder, Metrics, SeatId, Startup, StartupNames } from "./types";
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
  /** Who owns the company before the player comes in (adds up to 100). */
  capTable: Holder[];
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
    capTable: [
      { id: "ceo", name: "Lena Hoffmann", kind: "founder", pct: 46 },
      { id: "cto", name: "Jonas Weber", kind: "cofounder", pct: 24 },
      { id: "vc", name: "Nordlicht Ventures", kind: "vc", pct: 18 },
      { id: "angel", name: "Harald Brenner", kind: "angel", pct: 6 },
      { id: "esop", name: "Mitarbeiterpool", kind: "esop", pct: 6 },
    ],
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
    capTable: [
      { id: "ceo", name: "Sven Petersen", kind: "founder", pct: 52 },
      { id: "cto", name: "Aylin Demir", kind: "cofounder", pct: 18 },
      { id: "vc", name: "Rheinkapital", kind: "vc", pct: 20 },
      { id: "angel", name: "Mia Krause", kind: "angel", pct: 4 },
      { id: "esop", name: "Mitarbeiterpool", kind: "esop", pct: 6 },
    ],
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
    capTable: [
      { id: "ceo", name: "Deniz Arslan", kind: "founder", pct: 50 },
      { id: "cto", name: "Paula Richter", kind: "cofounder", pct: 25 },
      { id: "vc", name: "Brückenfonds", kind: "vc", pct: 15 },
      { id: "angel", name: "Werner Scholz", kind: "angel", pct: 5 },
      { id: "esop", name: "Mitarbeiterpool", kind: "esop", pct: 5 },
    ],
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
  {
    id: "gruenblatt",
    name: "Grünblatt",
    tagline: "Frische Kräuter aus der Indoor-Farm für Restaurants",
    sector: "Lebensmittel",
    names: { city: "München", competitor: "GreenStack", partner: "die Gastro-Gruppe Alpenhof", acquirer: "die Frischeland AG", customer: "die Alpenhof Gastro-Gruppe" },
    stake: 10,
    capTable: [
      { id: "ceo", name: "Nora Fischer", kind: "founder", pct: 44 },
      { id: "cto", name: "Ben Okafor", kind: "cofounder", pct: 22 },
      { id: "vc", name: "Saatgut Ventures", kind: "vc", pct: 22 },
      { id: "angel", name: "Ute Hansen", kind: "angel", pct: 6 },
      { id: "esop", name: "Mitarbeiterpool", kind: "esop", pct: 6 },
    ],
    arrives: 6,
    mail: {
      from: "Nora Fischer, Grünblatt",
      subject: "Kräuter vom Dach statt aus Spanien",
      body:
        "Hallo! Grünblatt baut Kräuter und Salate in einer Halle in München an und liefert am selben Tag an Restaurants. 18.000 € Umsatz im Monat, 5 % Wachstum. Wir suchen einen Angel für 10 % und einen Platz in unserem Beirat. Wenn du magst, zeige ich dir die Farm.",
    },
    diligence: [
      { label: "Kunden", text: "Köche lieben die Qualität. Die Alpenhof-Gruppe bringt allein 30 % des Umsatzes.", tone: "warn" },
      { label: "Kosten", text: "Strom ist der größte Kostenblock. Steigt der Preis, schrumpft die Marge sofort.", tone: "bad" },
      { label: "Marge", text: "45 % Rohertrag, mit der zweiten Halle sollen es 55 % werden.", tone: "good" },
      { label: "Kasse", text: "300.000 € auf dem Konto, das reicht knapp zwei Jahre bei heutigem Verbrauch.", tone: "good" },
    ],
    board: [
      { seat: "ceo", name: "Nora Fischer", short: "Nora", title: "Gründerin & CEO", personality: "visionary", interests: ["growth", "product"] },
      { seat: "cto", name: "Ben Okafor", short: "Ben", title: "Mitgründer & Farm-Technik", personality: "doer", interests: ["product", "team"] },
      { seat: "vc", name: "Katharina Roth", short: "Katharina", title: "Saatgut Ventures", personality: "numbers", interests: ["cash", "control"] },
      { seat: "indep", name: "Dr. Peter Lang", short: "Peter", title: "Unabhängiger Beirat", personality: "diplomat", interests: ["team", "customer"] },
      { seat: "angel", name: "Ute Hansen", short: "Ute", title: "Business Angel, Köchin", personality: "practical", interests: ["customer", "cash"] },
    ],
    metrics: {
      cash: 300_000,
      revenue: 18_000,
      growth: 0.05,
      grossMargin: 0.45,
      opex: 21_500,
      team: 8,
      morale: 68,
      trust: 60,
      axes: { management: 55, product: 70, market: 55, edge: 50, finance: 45 },
      topCustomer: 0.3,
      debt: 0,
    },
  },
  {
    id: "lernwerk",
    name: "Lernwerk",
    tagline: "Lern-App für Auszubildende und ihre Betriebe",
    sector: "Bildung",
    names: { city: "Hamburg", competitor: "AzubiPro", partner: "die Handelskammer Nord", acquirer: "der Fachverlag Brandes", customer: "die Handelskammer Nord" },
    stake: 12,
    capTable: [
      { id: "ceo", name: "Jan Petersen", kind: "founder", pct: 42 },
      { id: "cto", name: "Lisa Wagner", kind: "cofounder", pct: 30 },
      { id: "vc", name: "Lernkapital", kind: "vc", pct: 16 },
      { id: "angel", name: "Kemal Yilmaz", kind: "angel", pct: 7 },
      { id: "esop", name: "Mitarbeiterpool", kind: "esop", pct: 5 },
    ],
    arrives: 10,
    mail: {
      from: "Jan Petersen, Lernwerk",
      subject: "Azubis lernen in der Pause: Lernwerk sucht Angel",
      body:
        "Moin aus Hamburg. Lernwerk bereitet Auszubildende mit kurzen Lerneinheiten auf die Prüfung vor, die Betriebe zahlen pro Kopf. 9.000 € Umsatz im Monat, 8 % Wachstum, 82 % Marge. Wir suchen 12 % Angel-Kapital und Erfahrung im Beirat.",
    },
    diligence: [
      { label: "Wachstum", text: "8 % im Monat, getrieben von Empfehlungen zwischen Ausbildungsleitern.", tone: "good" },
      { label: "Saison", text: "Neue Azubis starten im August und September. In den übrigen Monaten wächst wenig.", tone: "warn" },
      { label: "Team", text: "Jan verkauft gut, Lisa hält das Produkt zusammen. Ein Vertrieb fehlt.", tone: "warn" },
      { label: "Kasse", text: "Das Geld reicht etwa 9 Monate. Eine Runde wird bald nötig.", tone: "warn" },
    ],
    board: [
      { seat: "ceo", name: "Jan Petersen", short: "Jan", title: "Gründer & CEO", personality: "doer", interests: ["growth", "customer"] },
      { seat: "cto", name: "Lisa Wagner", short: "Lisa", title: "Mitgründerin & CTO", personality: "numbers", interests: ["product", "cash"] },
      { seat: "vc", name: "Omar Saleh", short: "Omar", title: "Lernkapital", personality: "visionary", interests: ["growth", "control"] },
      { seat: "indep", name: "Gisela Brandt", short: "Gisela", title: "Unabhängige Beirätin", personality: "diplomat", interests: ["team", "customer"] },
      { seat: "angel", name: "Kemal Yilmaz", short: "Kemal", title: "Business Angel, Ausbilder", personality: "practical", interests: ["customer", "team"] },
    ],
    metrics: {
      cash: 180_000,
      revenue: 9_000,
      growth: 0.08,
      grossMargin: 0.82,
      opex: 27_000,
      team: 6,
      morale: 75,
      trust: 64,
      axes: { management: 55, product: 72, market: 62, edge: 58, finance: 45 },
      topCustomer: 0.18,
      debt: 0,
    },
  },
  {
    id: "pfandpilot",
    name: "Pfandpilot",
    tagline: "Mehrwegboxen für Lieferdienste und Kantinen",
    sector: "Logistik",
    names: { city: "Köln", competitor: "ReBox", partner: "die Kreislaufinitiative Rhein", acquirer: "der Verpackungskonzern Hallmann", customer: "der Lieferdienst Schnellteller" },
    stake: 8,
    capTable: [
      { id: "ceo", name: "Svenja Koch", kind: "founder", pct: 40 },
      { id: "cto", name: "Mehmet Aydin", kind: "cofounder", pct: 20 },
      { id: "vc", name: "Kreislauf Fonds", kind: "vc", pct: 28 },
      { id: "angel", name: "Frank Meier", kind: "angel", pct: 5 },
      { id: "esop", name: "Mitarbeiterpool", kind: "esop", pct: 7 },
    ],
    arrives: 14,
    mail: {
      from: "Svenja Koch, Pfandpilot",
      subject: "Mehrweg statt Müll: Pfandpilot sucht einen Angel",
      body:
        "Hallo, Pfandpilot vermietet Mehrwegboxen an Lieferdienste und holt sie wieder ab. 30.000 € Umsatz im Monat, die Pflicht zum Mehrwegangebot hilft uns. Wir geben 8 % an einen Angel, der uns im Beirat hilft, sauber zu wachsen.",
    },
    diligence: [
      { label: "Markt", text: "Die Mehrwegpflicht treibt die Nachfrage. Jeder größere Lieferdienst sucht eine Lösung.", tone: "good" },
      { label: "Kunden", text: "Schnellteller bringt 45 % des Umsatzes und verhandelt hart.", tone: "bad" },
      { label: "Marge", text: "Nur 30 % Rohertrag: Spülen und Transport kosten viel.", tone: "warn" },
      { label: "Team", text: "Svenja hat schon einmal ein Logistik-Startup verkauft. Mehmet folgt ihr in allem.", tone: "warn" },
    ],
    board: [
      { seat: "ceo", name: "Svenja Koch", short: "Svenja", title: "Gründerin & CEO", personality: "visionary", interests: ["growth", "control"] },
      { seat: "cto", name: "Mehmet Aydin", short: "Mehmet", title: "Mitgründer & Betrieb", personality: "loyal", interests: ["team", "product"] },
      { seat: "vc", name: "Robert Klein", short: "Robert", title: "Kreislauf Fonds", personality: "doer", interests: ["growth", "cash"] },
      { seat: "indep", name: "Dr. Hanna Weiß", short: "Hanna", title: "Unabhängige Beirätin", personality: "numbers", interests: ["cash", "control"] },
      { seat: "angel", name: "Frank Meier", short: "Frank", title: "Business Angel, Spediteur", personality: "practical", interests: ["customer", "cash"] },
    ],
    metrics: {
      cash: 260_000,
      revenue: 30_000,
      growth: 0.04,
      grossMargin: 0.3,
      opex: 24_000,
      team: 10,
      morale: 66,
      trust: 56,
      axes: { management: 62, product: 58, market: 66, edge: 45, finance: 50 },
      topCustomer: 0.45,
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
    // Earlier funds put in money with a 1x preference, roughly at today's price.
    capTable: def.capTable.map((h) => (h.kind === "vc" ? { ...h, pref: Math.round((value * h.pct) / 100 / 1000) * 1000 } : { ...h })),
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
