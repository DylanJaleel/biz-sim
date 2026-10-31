import { CORPORATE_BOOKS, corporateInterest, strength } from "./corporate-books";
import { annualEbitda } from "./ebitda";
import { phaseOf } from "./sim";
import { clampChance, eur, now, later, type Template } from "./templates";
import type { BoardMember, Metrics, Startup } from "./types";

// Ein Aufsichtsratsmandat in einem Konzern: keine Anteile, eine feste
// Vergütung, eine Sitzung pro Quartal. Die Summen sind größer, die Fragen
// andere: Dividende oder Investition, Zukauf oder Werk, Vorstand oder Belegschaft.

export const CORPORATE_ID = "nordhafen";

/** A Konzern of the pool: size, trade margins, board and the names the agenda uses. */
export interface CorporateDef {
  id: string;
  name: string;
  tagline: string;
  sector: string;
  /** Monthly revenue, gross margin and the trade's usual EBITDA margin. */
  revenue: number;
  grossMargin: number;
  margin: number;
  team: number;
  /** Fee of an ordinary member per month (the chair gets more, see corporates.ts). */
  fee: number;
  axes: Metrics["axes"];
  /** Who asks for the seat (mail sender). */
  asker: string;
  board: BoardMember[];
  names: Startup["names"];
}

const seat = (s: BoardMember["seat"], name: string, title: string, personality: BoardMember["personality"], interests: BoardMember["interests"]): BoardMember => ({
  seat: s,
  name,
  short: name
    .replace(/^(Dr\.|Prof\.) /, "")
    .replace(/^(Dr\.) /, "")
    .split(" ")
    .slice(-1)[0]!,
  title,
  personality,
  interests,
});

/** All Konzerne; each game deals a pool of them (corporates.ts). The Nordhafen AG always comes first. */
export const CORPORATE_DEFS: CorporateDef[] = [
  {
    id: CORPORATE_ID,
    name: "Nordhafen AG",
    tagline: "Antriebe und Logistiktechnik, 2.400 Beschäftigte",
    sector: "Industrie",
    revenue: 25_000_000,
    grossMargin: 0.34,
    // EBITDA margin about 9.5 %, usual for drives and logistics technology (see corporate-books.ts).
    margin: 0.095,
    team: 2_400,
    fee: 4_000,
    axes: { management: 70, product: 35, market: 30, edge: 25, finance: 75 },
    asker: "Prof. Elif Kaya",
    board: [
      seat("ceo", "Dr. Klaus Reinhardt", "Vorstandsvorsitzender", "visionary", ["growth", "control"]),
      seat("cto", "Martina Hollerbach", "Finanzvorständin", "numbers", ["cash", "control"]),
      seat("vc", "Gerhard Pohl", "Hafen-Stiftung, Großaktionär", "doer", ["cash", "growth"]),
      seat("indep", "Prof. Elif Kaya", "Unabhängige Aufsichtsrätin", "diplomat", ["customer", "product"]),
      seat("angel", "Sabine Roth", "Arbeitnehmervertreterin", "practical", ["team", "customer"]),
    ],
    names: { city: "Bremen", competitor: "Voss Antriebe", partner: "die Hansa Logistik", acquirer: "Voss Antriebe", customer: "die Bahn" },
  },
  {
    id: "rheinwerk",
    name: "Rheinwerk Chemie AG",
    tagline: "Spezialchemie für Lacke und Kunststoffe, 3.800 Beschäftigte",
    sector: "Chemie",
    revenue: 48_000_000,
    grossMargin: 0.31,
    margin: 0.12,
    team: 3_800,
    fee: 5_500,
    axes: { management: 66, product: 40, market: 34, edge: 30, finance: 72 },
    asker: "Dr. Annette Wolff",
    board: [
      seat("ceo", "Dr. Stefan Brückner", "Vorstandsvorsitzender", "visionary", ["growth", "product"]),
      seat("cto", "Katrin Lemke", "Finanzvorständin", "numbers", ["cash", "control"]),
      seat("vc", "Friedrich von Arnim", "Familienstiftung, Ankeraktionär", "loyal", ["cash", "control"]),
      seat("indep", "Dr. Annette Wolff", "Unabhängige Aufsichtsrätin", "diplomat", ["customer", "product"]),
      seat("angel", "Murat Demir", "Betriebsratsvorsitzender", "practical", ["team", "customer"]),
    ],
    names: { city: "Leverkusen", competitor: "Main-Chemie", partner: "die Rheinhafen Logistik", acquirer: "Main-Chemie", customer: "die Autoindustrie" },
  },
  {
    id: "hansekauf",
    name: "Hansekauf AG",
    tagline: "Lebensmittelhandel mit 420 Filialen, 9.500 Beschäftigte",
    sector: "Handel",
    revenue: 85_000_000,
    grossMargin: 0.29,
    margin: 0.055,
    team: 9_500,
    fee: 6_000,
    axes: { management: 64, product: 30, market: 42, edge: 22, finance: 70 },
    asker: "Claudia Behrens",
    board: [
      seat("ceo", "Jens Petersen", "Vorstandsvorsitzender", "doer", ["growth", "customer"]),
      seat("cto", "Dr. Ulrike Sander", "Finanzvorständin", "numbers", ["cash", "control"]),
      seat("vc", "Hendrik Claasen", "Gründerfamilie, Großaktionär", "loyal", ["cash", "team"]),
      seat("indep", "Claudia Behrens", "Unabhängige Aufsichtsrätin", "diplomat", ["customer", "control"]),
      seat("angel", "Petra Kowalski", "Arbeitnehmervertreterin", "practical", ["team", "customer"]),
    ],
    names: { city: "Hamburg", competitor: "Frischmarkt", partner: "die Nordlogistik", acquirer: "Frischmarkt", customer: "die Stammkundschaft" },
  },
  {
    id: "medicor",
    name: "Medicor SE",
    tagline: "Medizintechnik für Kliniken, 1.900 Beschäftigte",
    sector: "Medizintechnik",
    revenue: 16_000_000,
    grossMargin: 0.56,
    margin: 0.17,
    team: 1_900,
    fee: 5_000,
    axes: { management: 72, product: 45, market: 32, edge: 35, finance: 74 },
    asker: "Prof. Dr. Jan Hartmann",
    board: [
      seat("ceo", "Dr. Miriam Falk", "Vorstandsvorsitzende", "visionary", ["product", "growth"]),
      seat("cto", "Oliver Strauß", "Finanzvorstand", "numbers", ["cash", "control"]),
      seat("vc", "Bettina Krämer", "Beteiligungsgesellschaft, Großaktionärin", "doer", ["growth", "cash"]),
      seat("indep", "Prof. Dr. Jan Hartmann", "Unabhängiger Aufsichtsrat, Klinikdirektor", "diplomat", ["customer", "product"]),
      seat("angel", "Andrea Busch", "Arbeitnehmervertreterin", "practical", ["team", "product"]),
    ],
    names: { city: "Erlangen", competitor: "Helvetia Medical", partner: "der Klinikverbund Süd", acquirer: "Helvetia Medical", customer: "die Unikliniken" },
  },
  {
    id: "alpenstrom",
    name: "Alpenstrom AG",
    tagline: "Stromnetze und Erzeugung im Süden, 3.100 Beschäftigte",
    sector: "Energie",
    revenue: 38_000_000,
    grossMargin: 0.3,
    margin: 0.15,
    team: 3_100,
    fee: 5_500,
    axes: { management: 68, product: 32, market: 36, edge: 28, finance: 78 },
    asker: "Dr. Theresa Huber",
    board: [
      seat("ceo", "Markus Gruber", "Vorstandsvorsitzender", "doer", ["growth", "control"]),
      seat("cto", "Dr. Sophie Lechner", "Finanzvorständin", "numbers", ["cash", "control"]),
      seat("vc", "Bürgermeister Anton Wimmer", "Kommunen, Großaktionär", "loyal", ["customer", "team"]),
      seat("indep", "Dr. Theresa Huber", "Unabhängige Aufsichtsrätin", "diplomat", ["product", "customer"]),
      seat("angel", "Florian Mayr", "Arbeitnehmervertreter", "practical", ["team", "cash"]),
    ],
    names: { city: "Rosenheim", competitor: "Isarenergie", partner: "die Stadtwerke Süd", acquirer: "Isarenergie", customer: "die Kommunen" },
  },
  {
    id: "lindwerk",
    name: "Lindwerk Software AG",
    tagline: "Unternehmenssoftware für den Mittelstand, 1.300 Beschäftigte",
    sector: "Software",
    revenue: 11_000_000,
    grossMargin: 0.72,
    margin: 0.19,
    team: 1_300,
    fee: 4_500,
    axes: { management: 66, product: 48, market: 38, edge: 40, finance: 68 },
    asker: "Nadine Albrecht",
    board: [
      seat("ceo", "Tobias Lindner", "Vorstandsvorsitzender, Gründer", "visionary", ["growth", "product"]),
      seat("cto", "Dr. Henrik Vogel", "Finanzvorstand", "numbers", ["cash", "control"]),
      seat("vc", "Carla Esposito", "Wachstumsfonds, Großaktionärin", "doer", ["growth", "cash"]),
      seat("indep", "Nadine Albrecht", "Unabhängige Aufsichtsrätin", "diplomat", ["customer", "control"]),
      seat("angel", "Kevin Scholz", "Arbeitnehmervertreter", "practical", ["team", "product"]),
    ],
    names: { city: "Karlsruhe", competitor: "Datavia", partner: "die Cloudpartner AG", acquirer: "Datavia", customer: "der Mittelstand" },
  },
  {
    id: "elbbau",
    name: "Elbbau AG",
    tagline: "Hoch- und Tiefbau, 4.600 Beschäftigte",
    sector: "Bau",
    revenue: 34_000_000,
    grossMargin: 0.21,
    margin: 0.065,
    team: 4_600,
    fee: 4_500,
    axes: { management: 64, product: 30, market: 34, edge: 22, finance: 70 },
    asker: "Dr. Kerstin Engel",
    board: [
      seat("ceo", "Ralf Köhler", "Vorstandsvorsitzender", "doer", ["growth", "control"]),
      seat("cto", "Simone Hartwig", "Finanzvorständin", "numbers", ["cash", "control"]),
      seat("vc", "Wolfgang Richter", "Gründerfamilie, Großaktionär", "loyal", ["cash", "team"]),
      seat("indep", "Dr. Kerstin Engel", "Unabhängige Aufsichtsrätin", "diplomat", ["customer", "product"]),
      seat("angel", "Dirk Neumann", "Arbeitnehmervertreter", "practical", ["team", "customer"]),
    ],
    names: { city: "Dresden", competitor: "Saalebau", partner: "die Sachsen-Logistik", acquirer: "Saalebau", customer: "die öffentliche Hand" },
  },
];

export function corporateDef(id: string): CorporateDef {
  return CORPORATE_DEFS.find((d) => d.id === id) ?? CORPORATE_DEFS[0]!;
}

export function corporateStartup(month: number, id: string = CORPORATE_ID): Startup {
  const d = corporateDef(id);
  const metrics = {
    cash: Math.round(d.revenue * 2.4),
    revenue: d.revenue,
    growth: 0.004,
    grossMargin: d.grossMargin,
    opex: Math.round(d.revenue * (d.grossMargin - d.margin)),
    team: d.team,
    morale: 58,
    trust: 55,
    axes: { ...d.axes },
    topCustomer: 0.08,
    debt: 0,
  };
  return {
    id: d.id,
    status: "active",
    name: d.name,
    tagline: d.tagline,
    sector: d.sector,
    board: d.board.map((b) => ({ ...b, interests: [...b.interests] })),
    metrics,
    phase: phaseOf(metrics),
    stake: 0,
    capTable: [],
    corporate: true,
    corporateModel: CORPORATE_BOOKS.model,
    ...(d.id === CORPORATE_ID ? {} : { corporateBase: { grossMargin: d.grossMargin, margin: d.margin, strength: strength({ axes: d.axes }) } }),
    joined: month,
    flags: [],
    crisisMonths: 0,
    history: [],
    names: { ...d.names },
  };
}

const rev = (s: Startup) => s.metrics.revenue;
/** The year's profit to distribute: about half of what is left of the EBITDA after interest (depreciation and taxes). */
const profit = (s: Startup) => Math.max(0, (annualEbitda(s.metrics) - 12 * corporateInterest(s.metrics.debt)) * 0.5);
const on = (s: Startup) => s.corporate === true;

export const CORPORATE_TEMPLATES: Template[] = [
  {
    id: "k_dividende",
    corporate: true,
    title: "Dividende oder Investition?",
    motion: "Der Vorstand schlägt vor, den Gewinn vollständig als Dividende auszuschütten.",
    pitch: "„Unsere Aktionäre warten seit zwei Jahren auf eine ordentliche Dividende. Zeit, sie zu belohnen.“",
    context: (s) => `In der Kasse liegen ${eur(s.metrics.cash)}. Die volle Ausschüttung wären ${eur(profit(s))}; die Alternative ist ein Programm für neue Produkte.`,
    lesson: "kapitalallokation",
    insight:
      "Geld gehört dahin, wo es am meisten verdient. Wenn die Firma mit neuen Produkten mehr erwirtschaftet als Aktionäre anderswo, ist Investieren besser als Ausschütten. Wenn nicht, ist die Dividende ehrlicher.",
    when: on,
    repeatAfter: 12,
    pull: { cash: 0.6, control: 0.2, growth: -0.5, product: -0.4 },
    pro: [
      { interest: "cash", text: "Der Großaktionär rechnet fest mit der Ausschüttung." },
      { interest: "control", text: "Geld, das nicht in der Kasse liegt, kann der Vorstand nicht verschwenden." },
    ],
    contra: [
      { interest: "growth", text: "Ohne neue Produkte verlieren wir in fünf Jahren den Markt an {competitor}." },
      { interest: "product", text: "Die Entwicklung arbeitet seit Jahren mit zu wenig Budget." },
    ],
    arguments: [
      { id: "pay", text: "Wer keine bessere Verwendung hat, sollte ausschütten.", toward: "go", appeals: ["cash", "control"] },
      { id: "half", text: "Die Hälfte ausschütten, die Hälfte in die Entwicklung.", toward: "conditions", appeals: ["cash", "product"] },
      { id: "invest", text: "Jeder Euro in neue Produkte verdient mehr als jede Dividende.", toward: "no", appeals: ["growth", "product"] },
    ],
    questions: [
      { id: "roi", q: "Was bringt das Entwicklungsprogramm?", a: () => "Die Planung rechnet mit 12 % Rendite, die Erfahrung sagt eher 8 %." },
      { id: "foundation", q: "Wie dringend braucht der Großaktionär das Geld?", a: () => "Er kommt ein Jahr ohne Ausschüttung aus, zwei Jahre nicht." },
    ],
    outcomes: {
      go: {
        label: "Voll ausschütten",
        summary: "Der Gewinn geht an die Aktionäre.",
        resolve: (s) => ({ effects: [now("Die Dividende wird ausgezahlt.", { cash: -profit(s), trust: 2, axes: { product: -3 } })] }),
      },
      conditions: {
        label: "Halb und halb",
        summary: "Die Hälfte als Dividende, die Hälfte in neue Produkte.",
        resolve: (s) => ({
          effects: [
            now("Halbe Dividende, halbes Entwicklungsbudget.", { cash: -profit(s) }),
            later(3, "Die ersten Prototypen überzeugen.", { growth: 0.002, axes: { product: 4 } }),
          ],
        }),
      },
      no: {
        label: "Investieren",
        summary: "Keine Dividende, das Geld geht in die Entwicklung.",
        resolve: (s) => ({
          effects: [now("Das Entwicklungsprogramm startet, der Großaktionär ist verstimmt.", { cash: -profit(s), trust: -4 })],
          risk: {
            delay: 6,
            chance: 0.55,
            good: { growth: 0.006, revenuePct: 0.03, axes: { product: 8, edge: 6 } },
            bad: { axes: { product: 3 } },
            goodText: "Die neuen Produkte verkaufen sich besser als geplant.",
            badText: "Das Programm bleibt hinter dem Plan zurück.",
          },
        }),
      },
    },
  },
  {
    id: "k_zukauf",
    corporate: true,
    title: "Übernahme eines Softwarehauses",
    motion: "Der Vorstand will die Datenwerk GmbH kaufen, ein Softwarehaus für Wartungsdaten.",
    pitch: "„Mit Datenwerk verkaufen wir nicht mehr nur Produkte, sondern Service. Das ist unsere Zukunft.“",
    context: (s) => `Kaufpreis ${eur(rev(s) * 1.2)}. Datenwerk macht ${eur(rev(s) * 0.02)} Umsatz im Monat und wächst schnell.`,
    lesson: "kapitalallokation",
    insight: "Zukäufe scheitern selten am Preis, sondern an der Integration. Wer kauft, braucht einen Plan für die ersten hundert Tage.",
    when: on,
    repeatAfter: 36,
    pull: { growth: 0.6, control: 0.3, cash: -0.5, team: -0.2 },
    pro: [
      { interest: "growth", text: "Service bringt wiederkehrende Umsätze und bessere Margen." },
      { interest: "control", text: "Wenn wir nicht kaufen, kauft {competitor}." },
    ],
    contra: [
      { interest: "cash", text: "Der Preis ist hoch. Das ist das Dreißigfache des Gewinns." },
      { interest: "team", text: "Unsere Leute fürchten, dass Software sie ersetzt." },
    ],
    arguments: [
      { id: "buy", text: "Ohne Service sind wir in zehn Jahren ein Zulieferer unter vielen.", toward: "go", appeals: ["growth", "control"] },
      { id: "earnout", text: "Kaufen, aber ein Drittel des Preises erst bei Erfolg zahlen.", toward: "conditions", appeals: ["cash", "growth"] },
      { id: "build", text: "Das können wir selbst aufbauen, günstiger und mit unseren Leuten.", toward: "no", appeals: ["cash", "team"] },
    ],
    questions: [
      { id: "team", q: "Bleiben die Gründer von Datenwerk?", a: () => "Zwei Jahre mit Vertrag, danach offen." },
      { id: "fit", q: "Passt die Software zu unserem Geschäft?", a: () => "Zu 70 % ja, der Rest braucht ein Jahr Arbeit." },
    ],
    outcomes: {
      go: {
        label: "Kaufen",
        summary: "Datenwerk wird übernommen.",
        resolve: (s) => ({
          effects: [now("Datenwerk gehört jetzt zur {name}.", { cash: -rev(s) * 1.2, opex: rev(s) * 0.012 })],
          risk: {
            delay: 4,
            chance: 0.5,
            good: { revenuePct: 0.04, growth: 0.005, axes: { edge: 10, product: 5 } },
            bad: { revenuePct: 0.01, morale: -5 },
            goodText: "Die Integration gelingt, die Wartungsverträge laufen gut.",
            badText: "Die Integration hakt, zwei Datenwerk-Gründer gehen.",
          },
        }),
      },
      conditions: {
        label: "Mit Erfolgsprämie",
        summary: "Zwei Drittel sofort, ein Drittel bei Erfolg.",
        resolve: (s) => ({
          effects: [now("Datenwerk wird mit Erfolgsprämie übernommen.", { cash: -rev(s) * 0.8, opex: rev(s) * 0.012 })],
          risk: {
            delay: 4,
            chance: clampChance(0.45),
            good: { revenuePct: 0.035, growth: 0.004, cash: -rev(s) * 0.4, axes: { edge: 8 } },
            bad: { revenuePct: 0.01 },
            goodText: "Ziele erreicht, die Prämie wird fällig und ist gut angelegt.",
            badText: "Ziele verfehlt, die Prämie entfällt.",
          },
        }),
      },
      no: {
        label: "Nicht kaufen",
        summary: "Selbst aufbauen.",
        resolve: (s) => ({
          effects: [now("Der eigene Aufbau beginnt.", { opex: rev(s) * 0.004, morale: 2 }), later(8, "Der eigene Service kommt langsam in Gang.", { axes: { edge: 3 } })],
        }),
      },
    },
  },
  {
    id: "k_werk",
    corporate: true,
    title: "Standort in Polen statt Ausbau in {city}?",
    motion: "Der Vorstand will den neuen Standort in Polen aufbauen statt am Stammsitz.",
    pitch: "„Die Lohnkosten in Polen sind halb so hoch. Wir müssen an die Marge denken.“",
    context: (s) => `Neuer Standort in Polen: ${eur(rev(s) * 0.5)}, Ausbau in ${s.names.city}: ${eur(rev(s) * 0.7)}. Die Arbeitnehmervertretung ist alarmiert.`,
    lesson: "aufsichtsrat",
    insight: "Im Aufsichtsrat sitzen Kapital und Belegschaft an einem Tisch. Gute Entscheidungen rechnen beides: Kosten und das Vertrauen, ohne das kein Betrieb läuft.",
    when: on,
    repeatAfter: 18,
    pull: { cash: 0.5, growth: 0.2, team: -0.7, customer: -0.1 },
    pro: [
      { interest: "cash", text: "Die Marge steigt um zwei Punkte." },
      { interest: "growth", text: "Näher an unseren Kunden im Osten." },
    ],
    contra: [
      { interest: "team", text: "{city} fühlt sich verraten. Die Belegschaft droht mit Streik." },
      { interest: "customer", text: "Die Qualität vom Stammsitz ist unser Ruf." },
    ],
    arguments: [
      { id: "poland", text: "Wir müssen dahin, wo wir wettbewerbsfähig produzieren.", toward: "go", appeals: ["cash", "growth"] },
      { id: "guarantee", text: "Polen ja, aber mit Standortgarantie für {city}.", toward: "conditions", appeals: ["team", "cash"] },
      { id: "home", text: "Der Stammsitz ist unser Qualitätsversprechen.", toward: "no", appeals: ["team", "customer"] },
    ],
    questions: [
      { id: "strike", q: "Wie ernst ist die Streikdrohung?", a: () => "Sehr ernst. Die Gewerkschaft hat die Mitglieder schon befragt." },
      { id: "quality", q: "Was sagen die Kunden?", a: () => "Die wichtigsten Kunden fragen nach Qualitätsgarantien, die anderen eher nach dem Preis." },
    ],
    outcomes: {
      go: {
        label: "Standort in Polen",
        summary: "Neuer Standort in Polen, der Stammsitz schrumpft langsam.",
        resolve: (s) => ({
          effects: [now("Der Bau in Polen beginnt.", { cash: -rev(s) * 0.5, morale: -10, trust: -3 })],
          risk: {
            delay: 3,
            chance: 0.6,
            good: { grossMargin: 0.02 },
            bad: { revenuePct: -0.03, morale: -5, grossMargin: 0.01 },
            goodText: "Der Standort in Polen läuft an, die Marge steigt.",
            badText: "Ein Warnstreik in {city} kostet Aufträge.",
          },
        }),
      },
      conditions: {
        label: "Mit Standortgarantie",
        summary: "Polen, aber {city} bekommt eine Garantie.",
        resolve: (s) => ({
          effects: [
            now("Polen mit Standortgarantie für {city}.", { cash: -rev(s) * 0.5, morale: -2 }),
            later(3, "Der Standort läuft an, die Marge steigt etwas.", { grossMargin: 0.012 }),
          ],
        }),
      },
      no: {
        label: "Ausbau in {city}",
        summary: "Der Ausbau kommt an den Stammsitz.",
        resolve: (s) => ({
          effects: [now("{city} wird ausgebaut, die Belegschaft feiert.", { cash: -rev(s) * 0.7, morale: 8 }), later(3, "Der Ausbau ist fertig.", { grossMargin: 0.004 })],
        }),
      },
    },
  },
  {
    id: "k_verguetung",
    corporate: true,
    title: "Bonus für den Vorstand",
    motion: "Der Vorstandsvorsitzende beantragt ein neues Bonusprogramm, gekoppelt an den Umsatz.",
    pitch: "„Gute Leute wollen am Erfolg beteiligt sein. Sonst gehen sie zur Konkurrenz.“",
    context: (s) => `Der Bonus kann bis zu ${eur(rev(s) * 0.004)} im Jahr betragen. Ziel ist der Umsatz, nicht der Gewinn.`,
    lesson: "aufsichtsrat",
    insight: "Was man belohnt, bekommt man. Ein Bonus auf Umsatz lädt zu teurem Wachstum ein; ein Bonus auf Gewinn und Kapitalrendite zwingt zu guten Investitionen.",
    when: on,
    repeatAfter: 18,
    pull: { growth: 0.4, control: -0.4, cash: -0.4, team: 0.1 },
    pro: [
      { interest: "growth", text: "Ein motivierter Vorstand bringt Wachstum." },
      { interest: "team", text: "Wir halten die Führung im Haus." },
    ],
    contra: [
      { interest: "control", text: "Ein Bonus auf Umsatz belohnt auch Aufträge ohne Gewinn." },
      { interest: "cash", text: "Die Aktionäre zahlen, egal ob es sich lohnt." },
    ],
    arguments: [
      { id: "yes", text: "Wer viel bewegen soll, soll auch viel verdienen.", toward: "go", appeals: ["growth", "team"] },
      { id: "profit", text: "Bonus ja, aber auf Gewinn und Kapitalrendite statt Umsatz.", toward: "conditions", appeals: ["control", "cash"] },
      { id: "no", text: "Das Gehalt ist hoch genug.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [{ id: "peer", q: "Was zahlen vergleichbare Firmen?", a: () => "Etwa das Gleiche, aber fast alle koppeln den Bonus an den Gewinn." }],
    outcomes: {
      go: {
        label: "Bonus auf Umsatz",
        summary: "Der Vorstand wird am Umsatz beteiligt.",
        resolve: (s) => ({
          effects: [
            now("Der Umsatzbonus ist beschlossen.", { opex: rev(s) * 0.0004, trust: 5 }),
            later(4, "Der Vertrieb nimmt Aufträge mit schmaler Marge an.", { revenuePct: 0.02, grossMargin: -0.012 }),
          ],
        }),
      },
      conditions: {
        label: "Bonus auf Gewinn",
        summary: "Bonus gekoppelt an Gewinn und Kapitalrendite.",
        resolve: (s) => ({
          effects: [
            now("Der Bonus wird an den Gewinn gekoppelt.", { opex: rev(s) * 0.0003, trust: 1 }),
            later(4, "Der Vorstand streicht unrentable Aufträge.", { grossMargin: 0.008, axes: { finance: 3 } }),
          ],
        }),
      },
      no: {
        label: "Kein Bonus",
        summary: "Alles bleibt, wie es ist.",
        resolve: () => ({ effects: [now("Der Antrag ist abgelehnt. {ceo} ist verärgert.", { trust: -8, morale: -2 })] }),
      },
    },
  },
  {
    id: "k_digital",
    corporate: true,
    title: "Digitalprogramm für alle Standorte",
    motion: "Der Finanzvorstand beantragt ein dreijähriges Programm, um alle Standorte zu vernetzen.",
    pitch: "„Wir planen noch mit Tabellen. Unsere Wettbewerber sehen jeden Ablauf live.“",
    context: (s) => `Kosten: ${eur(rev(s) * 0.02)} im Monat für drei Jahre. Versprochen: weniger Ausschuss, weniger Stillstand.`,
    lesson: "kapitalallokation",
    insight: "Große Programme scheitern, wenn sie alles auf einmal wollen. Wer an einem Standort beginnt und lernt, gibt weniger aus und weiß mehr.",
    when: on,
    repeatAfter: 18,
    pull: { product: 0.5, cash: -0.3, control: 0.3, team: -0.1 },
    pro: [
      { interest: "product", text: "Weniger Ausschuss heißt bessere Qualität." },
      { interest: "control", text: "Endlich wissen wir, was an den Standorten passiert." },
    ],
    contra: [
      { interest: "cash", text: "Drei Jahre Kosten, bevor sich etwas zeigt." },
      { interest: "team", text: "Die Leute vor Ort fürchten die Kontrolle." },
    ],
    arguments: [
      { id: "all", text: "Halbe Digitalisierung ist keine Digitalisierung.", toward: "go", appeals: ["product", "control"] },
      { id: "pilot", text: "Erst ein Standort, dann entscheiden wir über den Rest.", toward: "conditions", appeals: ["cash", "team"] },
      { id: "wait", text: "Das ist ein Projekt für Berater, nicht für uns.", toward: "no", appeals: ["cash", "team"] },
    ],
    questions: [{ id: "pilot", q: "Wo würde ein Pilot starten?", a: () => "In {city}. Dort ist die Belegschaft offen und die Technik ist neu." }],
    outcomes: {
      go: {
        label: "Alle Standorte",
        summary: "Das volle Programm startet.",
        resolve: (s) => ({
          effects: [now("Das Digitalprogramm startet an allen Standorten.", { opex: rev(s) * 0.02, axes: { management: 3 } })],
          risk: {
            delay: 6,
            chance: 0.45,
            good: { grossMargin: 0.03, opex: -rev(s) * 0.012, axes: { product: 6 } },
            bad: { opex: -rev(s) * 0.005, morale: -4 },
            goodText: "Die vernetzten Standorte sparen mehr als geplant.",
            badText: "Das Programm verzettelt sich, der Nutzen bleibt klein.",
          },
        }),
      },
      conditions: {
        label: "Pilot in {city}",
        summary: "Ein Standort zuerst, dann der Rest.",
        resolve: (s) => ({
          effects: [
            now("Der Pilot in {city} beginnt.", { opex: rev(s) * 0.005 }),
            later(4, "Der Pilot zeigt, wo sich Vernetzung lohnt.", { grossMargin: 0.012, opex: -rev(s) * 0.003, axes: { product: 3 } }),
          ],
        }),
      },
      no: {
        label: "Abwarten",
        summary: "Kein Programm.",
        resolve: () => ({
          effects: [
            now("Das Programm ist abgelehnt.", { trust: -2 }),
            later(6, "{competitor} wirbt mit vernetzten Angeboten Kunden ab.", { revenuePct: -0.015, axes: { edge: -3 } }),
          ],
        }),
      },
    },
  },
  {
    id: "k_auftrag",
    corporate: true,
    title: "Großauftrag mit Preisgarantie",
    motion: "Der Vorstand will einen Fünfjahresvertrag zu festen Preisen unterschreiben. Abnehmer: {customer}.",
    pitch: "„Fünf Jahre volle Auslastung. So einen Auftrag bekommt man einmal im Jahrzehnt.“",
    context: (s) => `Der Auftrag bringt ${eur(rev(s) * 0.08)} Umsatz im Monat, die Preise sind fünf Jahre fest. Rohstoffe sind gerade teuer.`,
    lesson: "aufsichtsrat",
    insight: "Ein fester Preis über Jahre ist eine Wette auf die Kosten. Gute Verträge teilen das Risiko: Preisgleitklauseln binden den Preis an Rohstoffe.",
    when: on,
    repeatAfter: 60,
    pull: { growth: 0.5, customer: 0.4, cash: -0.2, control: -0.3 },
    pro: [
      { interest: "growth", text: "Auslastung für fünf Jahre." },
      { interest: "customer", text: "Ein solcher Referenzkunde öffnet weitere Türen." },
    ],
    contra: [
      { interest: "control", text: "Feste Preise bei schwankenden Rohstoffen sind ein Glücksspiel." },
      { interest: "cash", text: "Wenn Rohstoffe teurer werden, verlieren wir mit jeder Lieferung." },
    ],
    arguments: [
      { id: "sign", text: "Die Auslastung ist mehr wert als das Preisrisiko.", toward: "go", appeals: ["growth", "customer"] },
      { id: "clause", text: "Unterschreiben, aber mit Preisgleitklausel für Rohstoffe.", toward: "conditions", appeals: ["control", "customer"] },
      { id: "pass", text: "Nicht zu diesen Bedingungen.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [{ id: "clause", q: "Würde der Kunde eine Preisgleitklausel akzeptieren?", a: () => "Wahrscheinlich, wenn wir beim Grundpreis etwas nachgeben." }],
    outcomes: {
      go: {
        label: "Unterschreiben",
        summary: "Fünf Jahre feste Preise.",
        resolve: () => ({
          effects: [now("Der Großvertrag ist unterschrieben.", { revenuePct: 0.08, morale: 4 }), later(60, "Der Großvertrag läuft nach fünf Jahren aus.", { revenuePct: -0.07 })],
          risk: {
            delay: 4,
            chance: 0.5,
            good: { grossMargin: 0.005 },
            bad: { grossMargin: -0.03 },
            goodText: "Rohstoffe werden billiger, der Vertrag ist ein Glücksgriff.",
            badText: "Rohstoffe werden teurer, jede Lieferung kostet Marge.",
          },
        }),
      },
      conditions: {
        label: "Mit Preisgleitklausel",
        summary: "Etwas weniger Preis, dafür kein Rohstoffrisiko.",
        resolve: () => ({
          effects: [
            now("Der Großvertrag mit Preisgleitklausel ist unterschrieben.", { revenuePct: 0.07, grossMargin: -0.004, morale: 3 }),
            later(60, "Der Großvertrag läuft nach fünf Jahren aus.", { revenuePct: -0.06 }),
          ],
        }),
      },
      no: {
        label: "Ablehnen",
        summary: "Kein Vertrag.",
        resolve: () => ({ effects: [now("Der Auftrag geht an {competitor}.", { morale: -3, axes: { market: -3 } })] }),
      },
    },
  },
];
