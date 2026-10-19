import { RING_REPUTATION } from "./config";
import type { ContactState, Delta, GameState } from "./types";

// Das Netzwerk in drei Ringen: persönlich, Branchenprofis, Entscheider. Ein
// Kontakt hilft, wenn die Beziehung warm ist; jeder Gefallen kühlt sie ab.

export type Ring = 1 | 2 | 3;

export type HelpKind = "delta" | "loan" | "investor" | "shares" | "deal";

export interface ContactDef {
  id: string;
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
  /** Text in the monthly report when the help arrives. */
  result: string;
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
    result: "Katrin Albers hat die Buchhaltung aufgeräumt. Die Zahlen sind sauberer, ein paar Kosten fallen weg.",
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
    result: "Tobias Lenz hat zwei neue Kunden vermittelt. Der Umsatz steigt, das Klumpenrisiko sinkt.",
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
    result: "Dr. Miriam Ost hat die Verträge der Gründer geordnet. Klare Regeln schaffen Vertrauen.",
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
    result: "Jana Wolff hat eine erfahrene Führungskraft vermittelt. Das Team wirkt sortierter.",
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
    result: "Ralf Becker hat einen Kredit über 60.000 € bewilligt. Zinsen und Tilgung laufen ab sofort.",
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
    result: "Sophie Brandt hat einen Gesellschafter gefunden, der verkaufen will. Das Angebot liegt in deiner Post.",
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
    result: "Malik Haddad hat Marketing und Vertrieb neu aufgestellt. Das Wachstum zieht an.",
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
    result: "Dr. Eva Lindqvist kennt die Firma jetzt. Bei der nächsten Runde wird der Preis besser.",
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
    result: "Stefan Krämer hat einen Rahmenvertrag unterschrieben. Viel Umsatz, aber der Konzern ist jetzt ein Klumpen.",
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
    result: "Die Landesförderbank hat 40.000 € Zuschuss bewilligt.",
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
    result: "Henrik Bauer hat dir ein Startup empfohlen. Das Angebot liegt in deiner Post.",
  },
];

export const RING_LABEL: Record<Ring, string> = { 1: "Persönlich", 2: "Branchenprofis", 3: "Entscheider" };

export function contactDef(id: string): ContactDef {
  const c = CONTACTS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown contact ${id}`);
  return c;
}

export function initialContacts(): ContactState[] {
  return CONTACTS.map((c) => (c.ring === 1 ? { id: c.id, warmth: 50, met: true } : { id: c.id, warmth: 0, met: false }));
}

export function ringOpen(state: GameState, ring: Ring): boolean {
  return state.reputation >= RING_REPUTATION[ring];
}
