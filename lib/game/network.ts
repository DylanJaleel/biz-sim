import { RING_REPUTATION } from "./config";
import type { DdModule } from "./mna-config";
import { BAL_GENEROUS, BAL_MAX, BAL_MIN, BAL_REFUSE, GENEROUS, LEVEL_STRENGTH } from "./network-config";
import type { ContactState, CovenantId, Delta, GameState, NetworkState } from "./types";

// Das Netzwerk in drei Ringen: persönlich, Branchenprofis, Entscheider. Jede
// Rolle bleibt in jedem Spiel gleich (Steuerberaterin, Bank, Angel-Club ...),
// aber wer sie ausfüllt, zieht jedes neue Spiel aus einem Pool. Beziehungen
// haben zwei Seiten: Wärme (wie nah man sich ist) und ein Vertrauenskonto
// (wer wem zuletzt einen Gefallen getan hat).

export type Ring = 1 | 2 | 3;

export type HelpKind = "delta" | "loan" | "investor" | "shares" | "deal" | "specialist";

/** What a specialist does in M&A and private equity (see network-life.ts). */
export type SpecialistKind = "dd" | "levfin" | "interim" | "kartell" | "boutique";

export type Trait = "golf" | "kultur" | "familie" | "sport" | "zahlen" | "gesellig";

export const TRAIT_LABEL: Record<Trait, string> = {
  golf: "spielt Golf",
  kultur: "liebt Oper und Kunst",
  familie: "Familienmensch",
  sport: "läuft Marathon",
  zahlen: "Zahlenmensch",
  gesellig: "geht gern aus",
};
const TRAITS = Object.keys(TRAIT_LABEL) as Trait[];

export interface ContactDef {
  id: string;
  /** The classic person (older games, and pool member 0). */
  name: string;
  role: string;
  org: string;
  ring: Ring;
  /** How they know you or what they do, in one sentence. */
  bio: string;
  /** What an introduction does for a company. */
  help: string;
  kind: HelpKind;
  delta?: Delta;
  /** Text in the monthly report when the help arrives; {name} is the current person. */
  result: string;
  /** Classic person: gender for titles, and what they like. */
  female: boolean;
  trait: Trait;
  /** Titles by career level, "{m|f}" picks the form. */
  titles: [string, string, string];
  /** Employers; the first one is the classic. "{m|f}" picks the form. */
  orgs: string[];
  /** Bios for people drawn from the pool. */
  bios: string[];
  /** Specialists: what they do for deals, mandates and platforms. */
  spec?: SpecialistKind;
  ddModules?: DdModule[];
  /** Conditions this contact knows well enough to give a hint before a board meeting. */
  hint?: CovenantId[];
  /** Shown on the network page: what a specialist does. */
  specText?: string;
}

export const CONTACTS: ContactDef[] = [
  {
    id: "steuer",
    name: "Katrin Albers",
    role: "Steuerberaterin",
    org: "Albers & Partner",
    ring: 1,
    bio: "Ihr habt zusammen studiert. Sie sieht in jeder Bilanz, was nicht stimmt.",
    help: "Bringt Buchhaltung und Controlling in Ordnung.",
    kind: "delta",
    delta: { axes: { finance: 10 }, opex: -600 },
    result: "{name} hat die Buchhaltung aufgeräumt. Die Zahlen sind sauberer, ein paar Kosten fallen weg.",
    female: true,
    trait: "zahlen",
    titles: ["Steuerberater{|in}", "Partner{|in} der Kanzlei", "Seniorpartner{|in}"],
    orgs: ["Albers & Partner", "Kanzlei am Ring", "Rheinische Treuhand", "Steuerbüro Lindenhof"],
    bios: [
      "Ihr kennt euch aus dem Studium. Liest Bilanzen wie andere Krimis.",
      "Hat deine erste Steuererklärung gemacht und seitdem jede.",
      "Berät Gründer und Familienbetriebe gleichermaßen.",
    ],
    hint: ["budget", "kpi"],
  },
  {
    id: "vertrieb",
    name: "Tobias Lenz",
    role: "Vertriebsleiter",
    org: "Ex-Kollege",
    ring: 1,
    bio: "Ihr habt früher zusammen verkauft. Er kennt Einkäufer in halb Deutschland.",
    help: "Öffnet Türen zu neuen Kunden.",
    kind: "delta",
    delta: { revenuePct: 0.06, topCustomer: -0.05, axes: { market: 4 } },
    result: "{name} hat zwei neue Kunden vermittelt. Der Umsatz steigt, das Klumpenrisiko sinkt.",
    female: false,
    trait: "gesellig",
    titles: ["Vertriebsleiter{|in}", "Vertriebsdirektor{|in}", "Geschäftsführer{|in} Vertrieb"],
    orgs: ["Ex-Kolleg{e|in}", "Hansewerk Industrie", "Weser Logistik", "Brückner Maschinenbau"],
    bios: [
      "Ihr habt früher zusammen verkauft. Kennt Einkäufer in halb Deutschland.",
      "Saß im Studium neben dir und verkauft heute alles an jeden.",
      "Hat dir den ersten großen Kunden gebracht und nie eine Rechnung geschickt.",
    ],
    hint: ["second", "pilot"],
  },
  {
    id: "anwalt",
    name: "Dr. Miriam Ost",
    role: "Anwältin für Gesellschaftsrecht",
    org: "Nachbarin",
    ring: 1,
    bio: "Sie wohnt nebenan und liest Verträge schneller als andere die Zeitung.",
    help: "Ordnet Verträge und Zuständigkeiten, das schafft Vertrauen.",
    kind: "delta",
    delta: { trust: 6, axes: { management: 5 } },
    result: "{name} hat die Verträge der Gründer geordnet. Klare Regeln schaffen Vertrauen.",
    female: true,
    trait: "kultur",
    titles: ["Anwält{|in} für Gesellschaftsrecht", "Partner{|in} der Sozietät", "Managing Partner{|in}"],
    orgs: ["Nachbar{|in}", "Ost & Kollegen", "Sozietät am Dom", "Kanzlei Rheinufer"],
    bios: [
      "Wohnt nebenan und liest Verträge schneller als andere die Zeitung.",
      "Ihr spielt seit Jahren im selben Tennisclub.",
      "Hat dir einmal einen schlechten Vertrag ausgeredet. Seitdem fragst du immer.",
    ],
    hint: ["veto", "second"],
  },
  {
    id: "recruiter",
    name: "Jana Wolff",
    role: "Personalberaterin",
    org: "Wolff Executive Search",
    ring: 2,
    bio: "Besetzt Führungsrollen in Startups und weiß, wer gerade wechseln will.",
    help: "Findet eine erfahrene Führungskraft.",
    kind: "delta",
    delta: { axes: { management: 10 }, morale: 6, team: 1 },
    result: "{name} hat eine erfahrene Führungskraft vermittelt. Das Team wirkt sortierter.",
    female: true,
    trait: "sport",
    titles: ["Personalberater{|in}", "Partner{|in}", "Inhaber{|in}"],
    orgs: ["Wolff Executive Search", "Talentkontor", "Rhein Search Partners", "Kopf & Kragen Personal"],
    bios: [
      "Besetzt Führungsrollen und weiß, wer gerade wechseln will.",
      "Kennt jede gute CFO im Umkreis von 200 Kilometern.",
      "Hat drei Gründerteams vor dem Zerfall bewahrt, mit den richtigen Leuten.",
    ],
    hint: ["veto", "stagegate"],
  },
  {
    id: "bank",
    name: "Ralf Becker",
    role: "Firmenkundenberater",
    org: "Stadtsparkasse",
    ring: 2,
    bio: "Vergibt Kredite an junge Firmen, wenn jemand Erfahrenes im Beirat sitzt.",
    help: "Verschafft einen Bankkredit über 60.000 €.",
    kind: "loan",
    delta: { cash: 60_000, debt: 60_000, axes: { finance: 3 } },
    result: "{name} hat einen Kredit bewilligt. Zinsen und Tilgung laufen ab sofort.",
    female: false,
    trait: "golf",
    titles: ["Firmenkundenberater{|in}", "Bereichsleiter{|in} Firmenkunden", "Kreditvorstand"],
    orgs: ["Stadtsparkasse", "Volksbank Rhein-Ruhr", "Kreissparkasse Bergland", "Rheinische Handelsbank"],
    bios: [
      "Vergibt Kredite an junge Firmen, wenn jemand Erfahrenes im Beirat sitzt.",
      "Hat mehr Bilanzen gelesen als du Zeitungen.",
      "Glaubt an Mittelstand, Handschlag und gute Sicherheiten.",
    ],
  },
  {
    id: "angels",
    name: "Sophie Brandt",
    role: "Leiterin",
    org: "Business-Angel-Netzwerk Süd",
    ring: 2,
    bio: "Kennt jeden Angel im Land und weiß, wer Anteile loswerden will.",
    help: "Findet jemanden, der dir Anteile verkauft.",
    kind: "shares",
    result: "{name} hat einen Gesellschafter gefunden, der verkaufen will. Das Angebot liegt in deiner Post.",
    female: true,
    trait: "gesellig",
    titles: ["Leiter{|in} des Angel-Clubs", "Vorstand des Angel-Netzwerks", "Präsident{|in} des Angel-Verbands"],
    orgs: ["Business-Angel-Netzwerk Süd", "Angel Club Rheinland", "Gründerkreis West", "Business Angels Nord"],
    bios: [
      "Kennt jeden Angel im Land und weiß, wer Anteile loswerden will.",
      "Hat selbst zwei Firmen verkauft und investiert jetzt in andere.",
      "Organisiert jeden Monat einen Pitch-Abend.",
    ],
  },
  {
    id: "growth",
    name: "Malik Haddad",
    role: "Growth-Berater",
    org: "selbstständig",
    ring: 2,
    bio: "Hat drei Startups beim Marketing geholfen, zwei davon sind heute groß.",
    help: "Schärft Marketing und Vertrieb, das Wachstum zieht an.",
    kind: "delta",
    delta: { growth: 0.01, axes: { market: 6 } },
    result: "{name} hat Marketing und Vertrieb neu aufgestellt. Das Wachstum zieht an.",
    female: false,
    trait: "sport",
    titles: ["Growth-Berater{|in}", "Partner{|in} einer Agentur", "Chief Growth Officer"],
    orgs: ["selbstständig", "Wachstumswerk", "Signal & Funnel", "Agentur Nordlicht"],
    bios: [
      "Hat drei Startups beim Marketing geholfen, zwei davon sind heute groß.",
      "Misst alles, was sich bewegt, und testet den Rest.",
      "Weiß, warum Kunden kaufen, und warum nicht.",
    ],
    hint: ["pilot", "budget"],
  },
  {
    id: "vcpartner",
    name: "Dr. Eva Lindqvist",
    role: "Partnerin",
    org: "Isar Capital",
    ring: 3,
    bio: "Investiert in Serie-A-Runden und vertraut Empfehlungen aus ihrem Netzwerk.",
    help: "Bei der nächsten Runde gibt es einen besseren Preis.",
    kind: "investor",
    result: "{name} kennt die Firma jetzt. Bei der nächsten Runde wird der Preis besser.",
    female: true,
    trait: "kultur",
    titles: ["Partner{|in}", "Managing Partner{|in}", "Gründer{|in} eines eigenen Fonds"],
    orgs: ["Isar Capital", "Spree Ventures", "Elbkapital Partners", "Main Growth Fund"],
    bios: [
      "Investiert in Serie-A-Runden und vertraut Empfehlungen aus dem Netzwerk.",
      "Sagt zu neun von zehn Firmen nein, und meistens zu Recht.",
      "War selbst Gründer{|in}, bevor das Investieren begann.",
    ],
    hint: ["stagegate", "pilot"],
  },
  {
    id: "einkauf",
    name: "Stefan Krämer",
    role: "Einkaufschef",
    org: "Brenner Konzern",
    ring: 3,
    bio: "Entscheidet über Rahmenverträge in Millionenhöhe.",
    help: "Ein Großkunde: viel Umsatz, aber auch Abhängigkeit.",
    kind: "delta",
    delta: { revenuePct: 0.18, topCustomer: 0.15, axes: { market: 5 } },
    result: "{name} hat einen Rahmenvertrag unterschrieben. Viel Umsatz, aber der Konzern ist jetzt ein Klumpen.",
    female: false,
    trait: "golf",
    titles: ["Einkaufschef{|in}", "Bereichsvorstand Einkauf", "Vorstand Einkauf"],
    orgs: ["Brenner Konzern", "Hofmann Industrie", "Nordwerk Holding", "Vogel Konzern"],
    bios: ["Entscheidet über Rahmenverträge in Millionenhöhe.", "Hat ein Budget so groß wie eine Kleinstadt und wenig Zeit.", "Kauft lieber bei Leuten, die man kennt."],
  },
  {
    id: "foerder",
    name: "Annette Schulz",
    role: "Bereichsleiterin",
    org: "Landesförderbank",
    ring: 3,
    bio: "Vergibt Zuschüsse für Innovation, wenn der Antrag sauber ist.",
    help: "Ein Zuschuss über 40.000 €, der nicht zurückgezahlt wird.",
    kind: "delta",
    delta: { cash: 40_000, axes: { finance: 2 } },
    result: "Über {name} hat die Förderbank einen Zuschuss bewilligt.",
    female: true,
    trait: "familie",
    titles: ["Bereichsleiter{|in}", "Abteilungsdirektor{|in}", "Vorstand der Förderbank"],
    orgs: ["Landesförderbank", "Innovationsfonds des Landes", "Förderbank West", "Technologiestiftung"],
    bios: [
      "Vergibt Zuschüsse für Innovation, wenn der Antrag sauber ist.",
      "Kennt jedes Förderprogramm, auch die, die niemand findet.",
      "Will Arbeitsplätze im Land sehen, keine Folien.",
    ],
  },
  {
    id: "dealflow",
    name: "Henrik Bauer",
    role: "Leiter Corporate Venture",
    org: "Nordhafen Holding",
    ring: 3,
    bio: "Sieht jede Woche zwanzig Startups und gibt die besten weiter.",
    help: "Vermittelt dir einen neuen Deal.",
    kind: "deal",
    result: "{name} hat dir ein Startup empfohlen. Das Angebot liegt in deiner Post.",
    female: false,
    trait: "zahlen",
    titles: ["Leiter{|in} Corporate Venture", "Leiter{|in} Konzernstrategie", "Vorstand für Beteiligungen"],
    orgs: ["Nordhafen Holding", "Brenner Ventures", "Hansewerk Beteiligungen", "Rheinstahl Invest"],
    bios: ["Sieht jede Woche zwanzig Startups und gibt die besten weiter.", "Sucht für den Konzern die Firmen von morgen.", "Kauft für den Konzern zu, wenn der Preis stimmt."],
  },
  // Spezialisten für M&A und Private Equity: Sie helfen bei Übernahmen, Mandaten und Plattformen.
  {
    id: "wp",
    name: "Dr. Claudia Reuter",
    role: "Wirtschaftsprüferin",
    org: "Reuter Transaction Services",
    ring: 2,
    bio: "Prüft seit zwanzig Jahren, ob Zahlen halten, was Verkäufer versprechen.",
    help: "Prüft Zahlen und Steuern einer Zielfirma (Financial und Tax DD) zum halben Honorar.",
    kind: "specialist",
    result: "{name} hat Zahlen und Steuern geprüft.",
    female: true,
    trait: "zahlen",
    titles: ["Wirtschaftsprüfer{|in}", "Partner{|in}", "Leiter{|in} Transaction Services"],
    orgs: ["Reuter Transaction Services", "Prüfgesellschaft Hanse", "Rheinische Revision", "Audit & Deal Partners"],
    bios: ["Prüft, ob Zahlen halten, was Verkäufer versprechen.", "Findet die Pensionszusage, die keiner erwähnt hat.", "Hat schon hundert Firmenverkäufe von innen gesehen."],
    spec: "dd",
    ddModules: ["financial", "tax"],
    specText: "Financial und Tax Due Diligence an einem Tag, zum halben Honorar. Auch für die Verkäuferprüfung in einem Mandat.",
    hint: ["kpi", "budget"],
  },
  {
    id: "kanzlei",
    name: "Jonas Hellwig",
    role: "Rechtsanwalt für M&A",
    org: "Hellwig Rechtsanwälte",
    ring: 2,
    bio: "Verhandelt Kaufverträge und weiß, wo Klauseln zum Eigentümerwechsel versteckt sind.",
    help: "Prüft Verträge und Klagen einer Zielfirma (Legal DD) zum halben Honorar.",
    kind: "specialist",
    result: "{name} hat die Verträge geprüft.",
    female: false,
    trait: "golf",
    titles: ["Rechtsanw{alt|ältin} für M&A", "Partner{|in}", "Managing Partner{|in}"],
    orgs: ["Hellwig Rechtsanwälte", "Sozietät Brückner & Vogt", "Kanzlei am Hafen", "Rhein Legal"],
    bios: [
      "Verhandelt Kaufverträge und kennt jede Change-of-Control-Klausel.",
      "Hat noch nie einen Vertrag unterschreiben lassen, ohne ihn zweimal zu lesen.",
      "Kennt die Gerichte und die Gegenseite.",
    ],
    spec: "dd",
    ddModules: ["legal"],
    specText: "Legal Due Diligence an einem Tag, zum halben Honorar. Auch für die Verkäuferprüfung in einem Mandat.",
    hint: ["veto", "second"],
  },
  {
    id: "boutique",
    name: "Felix Morgenroth",
    role: "Managing Director",
    org: "Morgenroth & Cie. Corporate Finance",
    ring: 2,
    bio: "Berät Familienunternehmer beim Verkauf und gibt Mandate weiter, die zu klein für ihn sind.",
    help: "Vermittelt dir ein M&A-Mandat.",
    kind: "specialist",
    result: "{name} hat dir ein Mandat vermittelt.",
    female: false,
    trait: "gesellig",
    titles: ["Associate Director", "Managing Director", "Gründer{|in} einer eigenen Boutique"],
    orgs: ["Morgenroth & Cie. Corporate Finance", "Elbe Corporate Finance", "Rheintal M&A Partners", "Mittelstand Advisory"],
    bios: [
      "Berät Familienunternehmer beim Verkauf und gibt kleine Mandate weiter.",
      "Kennt jeden Inhaber über sechzig in der Region.",
      "Hat mehr Auktionen geführt als jede{r|} andere im Land.",
    ],
    spec: "boutique",
    specText: "Gibt dir ein M&A-Mandat weiter (ab 35 Ruf). Ist die Beziehung warm, kommen auch so öfter Anfragen.",
  },
  {
    id: "levfin",
    name: "Nadine Okafor",
    role: "Leveraged-Finance-Bankerin",
    org: "Rheinische Handelsbank",
    ring: 3,
    bio: "Strukturiert Kredite für Übernahmen und weiß, wie viel Schulden eine Firma trägt.",
    help: "Verhandelt mehr Spielraum beim Covenant und einen niedrigeren Zins.",
    kind: "specialist",
    result: "{name} hat die Finanzierung nachverhandelt.",
    female: true,
    trait: "sport",
    titles: ["Leveraged-Finance-Banker{|in}", "Direktor{|in} Leveraged Finance", "Leiter{|in} Akquisitionsfinanzierung"],
    orgs: ["Rheinische Handelsbank", "Hanse Kreditbank", "Bank am Main", "Alpenländische Bank"],
    bios: [
      "Strukturiert Kredite für Übernahmen.",
      "Weiß auf die Nachkommastelle, wie viel Schulden eine Firma trägt.",
      "Hat in der Finanzkrise gelernt, was ein Covenant wert ist.",
    ],
    spec: "levfin",
    specText: "Bei einer Übernahme oder einer eigenen Firma mit Bankkredit: 0,5 × EBITDA mehr Spielraum beim Covenant (auch für Zukäufe) und 0,5 Prozentpunkte weniger Zins.",
  },
  {
    id: "interim",
    name: "Birgit Hansen",
    role: "Interim-Managerin",
    org: "Hansen Interim",
    ring: 3,
    bio: "Springt ein, wenn eine Übergabe oder Integration zu kippen droht.",
    help: "Übernimmt sechs Monate lang die Übergabe oder Integration vor Ort.",
    kind: "specialist",
    result: "{name} ist vor Ort.",
    female: true,
    trait: "familie",
    titles: ["Interim-Manager{|in}", "Partner{|in}", "Gründer{|in}"],
    orgs: ["Hansen Interim", "Brücke Interim Management", "Turnaround Partner Nord", "Mittelstand Interim"],
    bios: ["Springt ein, wenn eine Übergabe zu kippen droht.", "Hat zwölf Firmen durch die Übergabe begleitet.", "Bleibt sechs Monate und geht, wenn es läuft."],
    spec: "interim",
    specText: "Sechs Monate vor Ort in einer gekauften Firma: weniger Risiken bei der Übergabe, Integrationen gelingen öfter. Honorar 30.000 € aus der Kasse der Firma.",
    hint: ["veto", "stagegate"],
  },
  {
    id: "kartell",
    name: "Prof. Dr. Lea Winter",
    role: "Kartellrechtlerin",
    org: "Winter Wettbewerbsrecht",
    ring: 3,
    bio: "Kennt das Kartellamt von innen und weiß, wie man einen Zusammenschluss anmeldet.",
    help: "Meldet einen Zukauf beim Kartellamt so an, dass er selten scheitert.",
    kind: "specialist",
    result: "{name} hat die Anmeldung beim Kartellamt vorbereitet.",
    female: true,
    trait: "kultur",
    titles: ["Kartellrechtler{|in}", "Partner{|in} für Wettbewerbsrecht", "Leiter{|in} der Kartellrechtspraxis"],
    orgs: ["Winter Wettbewerbsrecht", "Kanzlei Markt & Macht", "Sozietät am Kaiserplatz", "Wettbewerbsrecht Partners"],
    bios: ["Kennt das Kartellamt von innen.", "Hat zehn Jahre in Bonn Zusammenschlüsse geprüft.", "Weiß, wie man einen Markt so beschreibt, dass er groß genug ist."],
    spec: "kartell",
    specText: "Für einen Zukauf der Plattform: Das Kartellamt untersagt dann nur noch selten (4 % statt 12 %). Honorar 8.000 €.",
  },
];

export const RING_LABEL: Record<Ring, string> = { 1: "Persönlich", 2: "Branchenprofis", 3: "Entscheider" };

export function contactDef(id: string): ContactDef {
  const c = CONTACTS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown contact ${id}`);
  return c;
}

export function isContact(id: string): boolean {
  return CONTACTS.some((x) => x.id === id);
}

/** "{m|f}" → the form for this person. */
export function gendered(text: string, female: boolean): string {
  return text.replace(/\{([^|}]*)\|([^}]*)\}/g, (_m, a: string, b: string) => (female ? b : a));
}

// ---------------------------------------------------------------------------
// Besetzung aus dem Pool
// ---------------------------------------------------------------------------

const FIRST_F = [
  "Anna",
  "Clara",
  "Elif",
  "Greta",
  "Ida",
  "Katja",
  "Mira",
  "Olga",
  "Rosa",
  "Tilda",
  "Vera",
  "Leonie",
  "Sophie",
  "Nora",
  "Hanna",
  "Jasmin",
  "Pia",
  "Lena",
  "Selma",
  "Yasemin",
];
const FIRST_M = [
  "Ben",
  "David",
  "Finn",
  "Hannes",
  "Jonas",
  "Luca",
  "Nico",
  "Paul",
  "Samir",
  "Umut",
  "Yusuf",
  "Moritz",
  "Kerem",
  "Tobias",
  "Jan",
  "Arne",
  "Till",
  "Matteo",
  "Ole",
  "Karim",
];
const LAST = [
  "Albrecht",
  "Behrens",
  "Cramer",
  "Dahl",
  "Eckert",
  "Falk",
  "Gerlach",
  "Hollmann",
  "Iversen",
  "Jansen",
  "Keller",
  "Lindner",
  "Mertens",
  "Neumann",
  "Oberle",
  "Petersen",
  "Richter",
  "Seidel",
  "Thalmann",
  "Urban",
  "Voss",
  "Westphal",
  "Zander",
  "Brandl",
  "Demir",
  "Kowalski",
  "Nguyen",
  "Rossi",
  "Schäfer",
  "Wagner",
];
const DOCTOR: Partial<Record<string, number>> = { anwalt: 0.5, vcpartner: 0.4, wp: 0.4, kanzlei: 0.3, kartell: 0.7, foerder: 0.2 };

function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same generator as the engine's randomFor; kept here so this module needs no engine import. */
export function netRandom(seed: number, purpose: string): () => number {
  let a = hashOf(`${seed}|${purpose}`);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length]!;

export interface Person {
  name: string;
  female: boolean;
  /** Current title (career level). */
  role: string;
  org: string;
  bio: string;
  trait: Trait;
}

/** The person drawn for a role: derived from the game seed and the pool number, so only the number is stored. */
function poolPerson(seed: number, def: ContactDef, p: number): Omit<Person, "role" | "org"> {
  const r = netRandom(seed, `person|${def.id}|${p}`);
  const female = r() < 0.5;
  const first = pick(r, female ? FIRST_F : FIRST_M);
  const last = pick(r, LAST);
  const dr = r() < (DOCTOR[def.id] ?? 0.1) ? (def.id === "kartell" && r() < 0.5 ? "Prof. Dr. " : "Dr. ") : "";
  return { name: `${dr}${first} ${last}`, female, bio: gendered(pick(r, def.bios), female), trait: pick(r, TRAITS) };
}

/** Who fills a role in this game right now: the classic cast in older games, a person from the pool otherwise. */
export function personOf(state: Pick<GameState, "seed">, c: Pick<ContactState, "id" | "p" | "org" | "lv">): Person {
  const def = contactDef(c.id);
  const base = c.p === undefined ? { name: def.name, female: def.female, bio: def.bio, trait: def.trait } : poolPerson(state.seed, def, c.p);
  const level = c.lv ?? 0;
  const org = gendered(def.orgs[c.org ?? 0] ?? def.org, base.female);
  // The classic person at the start keeps the classic title and organisation exactly.
  const classic = c.p === undefined && level === 0 && (c.org ?? 0) === 0;
  return { ...base, role: classic ? def.role : gendered(def.titles[level]!, base.female), org: classic ? def.org : org };
}

/** A fresh pool number for a role whose person's name is not used by another contact yet. */
export function castPerson(state: Pick<GameState, "seed" | "contacts">, id: string, start: number): number {
  const taken = new Set(state.contacts.filter((c) => c.id !== id).map((c) => personOf(state, c).name.replace(/^(Prof\. )?Dr\. /, "")));
  for (let p = start; p < start + 40; p++) {
    const name = poolPerson(state.seed, contactDef(id), p).name.replace(/^(Prof\. )?Dr\. /, "");
    if (!taken.has(name)) return p;
  }
  return start;
}

/** The contact list of a new game: personal ring known, everyone else still to meet, each role cast from the pool. */
export function initialContacts(seed?: number): ContactState[] {
  const list: ContactState[] = CONTACTS.map((c) => (c.ring === 1 ? { id: c.id, warmth: 50, met: true } : { id: c.id, warmth: 0, met: false }));
  if (seed === undefined) return list;
  const state = { seed, contacts: [] as ContactState[] };
  for (const c of list) {
    const r = netRandom(seed, `cast|${c.id}`);
    c.p = castPerson(state, c.id, 1 + Math.floor(r() * 50));
    c.org = Math.floor(r() * contactDef(c.id).orgs.length);
    c.lv = 0;
    state.contacts.push(c);
  }
  return list;
}

/** The stored contact, created when an older game does not know the role yet (the new specialists). */
export function contactOf(state: GameState, id: string): ContactState | undefined {
  if (!isContact(id)) return undefined;
  let c = state.contacts.find((x) => x.id === id);
  if (!c) {
    c = { id, warmth: 0, met: false, lv: 0 };
    // Older games had the classic cast; the new roles are drawn from the pool.
    c.p = castPerson(state, id, 1 + Math.floor(netRandom(state.seed, `cast|${id}`)() * 50));
    state.contacts.push(c);
  }
  return c;
}

/** Read-only: the stored contact or a stranger. */
export function contactRead(state: GameState, id: string): ContactState {
  return state.contacts.find((x) => x.id === id) ?? { id, warmth: 0, met: false };
}

export function ringOpen(state: GameState, ring: Ring): boolean {
  return state.reputation >= RING_REPUTATION[ring];
}

// ---------------------------------------------------------------------------
// Gegenseitigkeit
// ---------------------------------------------------------------------------

export function balOf(c: ContactState): number {
  return c.bal ?? 0;
}

export function addBal(c: ContactState, delta: number): void {
  c.bal = Math.max(BAL_MIN, Math.min(BAL_MAX, balOf(c) + delta));
}

/** Only takes and never gives: says no. */
export function refuses(c: ContactState): boolean {
  return balOf(c) <= BAL_REFUSE;
}

export function generous(c: ContactState): boolean {
  return balOf(c) >= BAL_GENEROUS;
}

/** How strong a contact's help is: career level and a generous trust account. */
export function helpStrength(c: ContactState): number {
  return (1 + LEVEL_STRENGTH * (c.lv ?? 0)) * (generous(c) ? GENEROUS.strength : 1);
}

export function introCooldown(c: ContactState, base: number): number {
  return generous(c) ? Math.max(1, base - (3 - GENEROUS.cooldown)) : base;
}

export function introWarmthCost(c: ContactState, base: number): number {
  return generous(c) ? GENEROUS.warmthCost : base;
}

/** In words, for the network page. */
export function balLabel(c: ContactState): { label: string; tone: "good" | "neutral" | "warn" | "bad" } {
  const b = balOf(c);
  if (b <= BAL_REFUSE) return { label: "Sagt Nein: Du hast nur genommen", tone: "bad" };
  if (b < 0) return { label: "Du schuldest einen Gefallen", tone: "warn" };
  if (b >= BAL_GENEROUS) return { label: "Hilft gern und großzügig", tone: "good" };
  if (b > 0) return { label: "Du hast etwas gut", tone: "good" };
  return { label: "Ausgeglichen", tone: "neutral" };
}

/** The network part of the state; older games get an empty one. */
export function networkOf(state: GameState): NetworkState {
  if (!state.network) state.network = { favors: [], events: [], ties: [], log: { given: 0, declined: 0, lapsed: 0, events: 0, talks: 0, refusals: 0, specialists: 0, hints: 0 } };
  return state.network;
}

export function networkRead(state: GameState): NetworkState {
  return state.network ?? { favors: [], events: [], ties: [], log: { given: 0, declined: 0, lapsed: 0, events: 0, talks: 0, refusals: 0, specialists: 0, hints: 0 } };
}

/** "a~b" with the ids sorted, so each pair is stored once. */
export function tieKey(a: string, b: string): string {
  return a < b ? `${a}~${b}` : `${b}~${a}`;
}

/** Who knows whom without the player: fixed ties of the trade. */
export const BASE_TIES: [string, string][] = [
  ["steuer", "wp"],
  ["steuer", "bank"],
  ["anwalt", "kanzlei"],
  ["bank", "levfin"],
  ["bank", "foerder"],
  ["angels", "vcpartner"],
  ["angels", "growth"],
  ["vcpartner", "dealflow"],
  ["einkauf", "vertrieb"],
  ["einkauf", "dealflow"],
  ["recruiter", "growth"],
  ["recruiter", "interim"],
  ["boutique", "levfin"],
  ["boutique", "kanzlei"],
  ["boutique", "wp"],
  ["kartell", "kanzlei"],
  ["interim", "wp"],
];
