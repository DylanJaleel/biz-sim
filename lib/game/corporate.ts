import { CORPORATE_BOOKS, corporateInterest } from "./corporate-books";
import { annualEbitda } from "./ebitda";
import { phaseOf } from "./sim";
import { clampChance, eur, now, later, type Template } from "./templates";
import type { Startup } from "./types";

// Ein Aufsichtsratsmandat in einem Konzern: keine Anteile, eine feste
// Vergütung, eine Sitzung pro Quartal. Die Summen sind größer, die Fragen
// andere: Dividende oder Investition, Zukauf oder Werk, Vorstand oder Belegschaft.

export const CORPORATE_ID = "nordhafen";

export function corporateStartup(month: number): Startup {
  const metrics = {
    cash: 60_000_000,
    revenue: 25_000_000,
    growth: 0.004,
    grossMargin: 0.34,
    // EBITDA margin about 9.5 %, usual for drives and logistics technology (see corporate-books.ts).
    opex: 6_125_000,
    team: 2_400,
    morale: 58,
    trust: 55,
    axes: { management: 70, product: 35, market: 30, edge: 25, finance: 75 },
    topCustomer: 0.08,
    debt: 0,
  };
  return {
    id: CORPORATE_ID,
    status: "active",
    name: "Nordhafen AG",
    tagline: "Antriebe und Logistiktechnik, 2.400 Beschäftigte",
    sector: "Industrie",
    board: [
      { seat: "ceo", name: "Dr. Klaus Reinhardt", short: "Reinhardt", title: "Vorstandsvorsitzender", personality: "visionary", interests: ["growth", "control"] },
      { seat: "cto", name: "Martina Hollerbach", short: "Hollerbach", title: "Finanzvorständin", personality: "numbers", interests: ["cash", "control"] },
      { seat: "vc", name: "Gerhard Pohl", short: "Pohl", title: "Hafen-Stiftung, Großaktionär", personality: "doer", interests: ["cash", "growth"] },
      { seat: "indep", name: "Prof. Elif Kaya", short: "Kaya", title: "Unabhängige Aufsichtsrätin", personality: "diplomat", interests: ["customer", "product"] },
      { seat: "angel", name: "Sabine Roth", short: "Roth", title: "Arbeitnehmervertreterin", personality: "practical", interests: ["team", "customer"] },
    ],
    metrics,
    phase: phaseOf(metrics),
    stake: 0,
    capTable: [],
    corporate: true,
    corporateModel: CORPORATE_BOOKS.model,
    joined: month,
    flags: [],
    crisisMonths: 0,
    history: [],
    names: { city: "Bremen", competitor: "Voss Antriebe", partner: "die Hansa Logistik", acquirer: "Voss Antriebe", customer: "die Bahn" },
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
      { interest: "cash", text: "Die Stiftung braucht die Ausschüttung für ihre Projekte." },
      { interest: "control", text: "Geld, das nicht in der Kasse liegt, kann der Vorstand nicht verschwenden." },
    ],
    contra: [
      { interest: "growth", text: "Ohne neue Produkte verlieren wir in fünf Jahren den Markt an Voss." },
      { interest: "product", text: "Die Entwicklung arbeitet seit Jahren mit zu wenig Budget." },
    ],
    arguments: [
      { id: "pay", text: "Wer keine bessere Verwendung hat, sollte ausschütten.", toward: "go", appeals: ["cash", "control"] },
      { id: "half", text: "Die Hälfte ausschütten, die Hälfte in die Entwicklung.", toward: "conditions", appeals: ["cash", "product"] },
      { id: "invest", text: "Jeder Euro in neue Antriebe verdient mehr als jede Dividende.", toward: "no", appeals: ["growth", "product"] },
    ],
    questions: [
      { id: "roi", q: "Was bringt das Entwicklungsprogramm?", a: () => "Die Planung rechnet mit 12 % Rendite, die Erfahrung sagt eher 8 %." },
      { id: "foundation", q: "Wie dringend braucht die Stiftung das Geld?", a: () => "Sie kommt ein Jahr ohne Ausschüttung aus, zwei Jahre nicht." },
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
        resolve: (s) => ({ effects: [now("Halbe Dividende, halbes Entwicklungsbudget.", { cash: -profit(s) }), later(3, "Die ersten Prototypen überzeugen.", { growth: 0.002, axes: { product: 4 } })] }),
      },
      no: {
        label: "Investieren",
        summary: "Keine Dividende, das Geld geht in die Entwicklung.",
        resolve: (s) => ({
          effects: [now("Das Entwicklungsprogramm startet, die Stiftung ist verstimmt.", { cash: -profit(s), trust: -4 })],
          risk: { delay: 6, chance: 0.55, good: { growth: 0.006, revenuePct: 0.03, axes: { product: 8, edge: 6 } }, bad: { axes: { product: 3 } }, goodText: "Die neuen Antriebe verkaufen sich besser als geplant.", badText: "Das Programm bleibt hinter dem Plan zurück." },
        }),
      },
    },
  },
  {
    id: "k_zukauf",
    corporate: true,
    title: "Übernahme eines Softwarehauses",
    motion: "Der Vorstand will die Datenwerk GmbH kaufen, ein Softwarehaus für Wartungsdaten.",
    pitch: "„Mit Datenwerk verkaufen wir nicht mehr nur Maschinen, sondern Service. Das ist unsere Zukunft.“",
    context: (s) => `Kaufpreis ${eur(rev(s) * 1.2)}. Datenwerk macht ${eur(rev(s) * 0.02)} Umsatz im Monat und wächst schnell.`,
    lesson: "kapitalallokation",
    insight: "Zukäufe scheitern selten am Preis, sondern an der Integration. Wer kauft, braucht einen Plan für die ersten hundert Tage.",
    when: on,
    repeatAfter: 36,
    pull: { growth: 0.6, control: 0.3, cash: -0.5, team: -0.2 },
    pro: [
      { interest: "growth", text: "Service bringt wiederkehrende Umsätze und bessere Margen." },
      { interest: "control", text: "Wenn wir nicht kaufen, kauft Voss." },
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
      { id: "fit", q: "Passt die Software zu unseren Maschinen?", a: () => "Zu 70 % ja, der Rest braucht ein Jahr Arbeit." },
    ],
    outcomes: {
      go: {
        label: "Kaufen",
        summary: "Datenwerk wird übernommen.",
        resolve: (s) => ({
          effects: [now("Datenwerk gehört jetzt zur Nordhafen AG.", { cash: -rev(s) * 1.2, opex: rev(s) * 0.012 })],
          risk: { delay: 4, chance: 0.5, good: { revenuePct: 0.04, growth: 0.005, axes: { edge: 10, product: 5 } }, bad: { revenuePct: 0.01, morale: -5 }, goodText: "Die Integration gelingt, die Wartungsverträge laufen gut.", badText: "Die Integration hakt, zwei Datenwerk-Gründer gehen." },
        }),
      },
      conditions: {
        label: "Mit Erfolgsprämie",
        summary: "Zwei Drittel sofort, ein Drittel bei Erfolg.",
        resolve: (s) => ({
          effects: [now("Datenwerk wird mit Erfolgsprämie übernommen.", { cash: -rev(s) * 0.8, opex: rev(s) * 0.012 })],
          risk: { delay: 4, chance: clampChance(0.45), good: { revenuePct: 0.035, growth: 0.004, cash: -rev(s) * 0.4, axes: { edge: 8 } }, bad: { revenuePct: 0.01 }, goodText: "Ziele erreicht, die Prämie wird fällig und ist gut angelegt.", badText: "Ziele verfehlt, die Prämie entfällt." },
        }),
      },
      no: {
        label: "Nicht kaufen",
        summary: "Selbst aufbauen.",
        resolve: (s) => ({ effects: [now("Der eigene Aufbau beginnt.", { opex: rev(s) * 0.004, morale: 2 }), later(8, "Der eigene Service kommt langsam in Gang.", { axes: { edge: 3 } })] }),
      },
    },
  },
  {
    id: "k_werk",
    corporate: true,
    title: "Werk in Polen statt Ausbau in Bremen?",
    motion: "Der Vorstand will die neue Fertigungslinie in Polen bauen statt im Stammwerk.",
    pitch: "„Die Lohnkosten in Polen sind halb so hoch. Wir müssen an die Marge denken.“",
    context: (s) => `Neue Linie in Polen: ${eur(rev(s) * 0.5)}, in Bremen: ${eur(rev(s) * 0.7)}. Die Arbeitnehmervertretung ist alarmiert.`,
    lesson: "aufsichtsrat",
    insight: "Im Aufsichtsrat sitzen Kapital und Belegschaft an einem Tisch. Gute Entscheidungen rechnen beides: Kosten und das Vertrauen, ohne das kein Werk läuft.",
    when: on,
    repeatAfter: 18,
    pull: { cash: 0.5, growth: 0.2, team: -0.7, customer: -0.1 },
    pro: [
      { interest: "cash", text: "Die Marge steigt um zwei Punkte." },
      { interest: "growth", text: "Näher an unseren Kunden im Osten." },
    ],
    contra: [
      { interest: "team", text: "Bremen fühlt sich verraten. Die Belegschaft droht mit Streik." },
      { interest: "customer", text: "Die Qualität aus dem Stammwerk ist unser Ruf." },
    ],
    arguments: [
      { id: "poland", text: "Wir müssen dahin, wo wir wettbewerbsfähig produzieren.", toward: "go", appeals: ["cash", "growth"] },
      { id: "guarantee", text: "Polen ja, aber mit Standortgarantie für Bremen.", toward: "conditions", appeals: ["team", "cash"] },
      { id: "home", text: "Das Stammwerk ist unser Qualitätsversprechen.", toward: "no", appeals: ["team", "customer"] },
    ],
    questions: [
      { id: "strike", q: "Wie ernst ist die Streikdrohung?", a: () => "Sehr ernst. Die Gewerkschaft hat die Mitglieder schon befragt." },
      { id: "quality", q: "Was sagen die Kunden?", a: () => "Die Bahn fragt nach Qualitätsgarantien, die anderen eher nach dem Preis." },
    ],
    outcomes: {
      go: {
        label: "Werk in Polen",
        summary: "Neue Linie in Polen, das Stammwerk schrumpft langsam.",
        resolve: (s) => ({
          effects: [now("Der Bau in Polen beginnt.", { cash: -rev(s) * 0.5, morale: -10, trust: -3 })],
          risk: { delay: 3, chance: 0.6, good: { grossMargin: 0.02 }, bad: { revenuePct: -0.03, morale: -5, grossMargin: 0.01 }, goodText: "Das Werk in Polen läuft an, die Marge steigt.", badText: "Ein Warnstreik in Bremen kostet Aufträge." },
        }),
      },
      conditions: {
        label: "Mit Standortgarantie",
        summary: "Polen, aber Bremen bekommt eine Garantie.",
        resolve: (s) => ({ effects: [now("Polen mit Standortgarantie für Bremen.", { cash: -rev(s) * 0.5, morale: -2 }), later(3, "Das Werk läuft an, die Marge steigt etwas.", { grossMargin: 0.012 })] }),
      },
      no: {
        label: "Ausbau in Bremen",
        summary: "Die Linie kommt ins Stammwerk.",
        resolve: (s) => ({ effects: [now("Bremen wird ausgebaut, die Belegschaft feiert.", { cash: -rev(s) * 0.7, morale: 8 }), later(3, "Die neue Linie läuft.", { grossMargin: 0.004 })] }),
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
        resolve: (s) => ({ effects: [now("Der Umsatzbonus ist beschlossen.", { opex: rev(s) * 0.0004, trust: 5 }), later(4, "Der Vertrieb nimmt Aufträge mit schmaler Marge an.", { revenuePct: 0.02, grossMargin: -0.012 })] }),
      },
      conditions: {
        label: "Bonus auf Gewinn",
        summary: "Bonus gekoppelt an Gewinn und Kapitalrendite.",
        resolve: (s) => ({ effects: [now("Der Bonus wird an den Gewinn gekoppelt.", { opex: rev(s) * 0.0003, trust: 1 }), later(4, "Der Vorstand streicht unrentable Aufträge.", { grossMargin: 0.008, axes: { finance: 3 } })] }),
      },
      no: {
        label: "Kein Bonus",
        summary: "Alles bleibt, wie es ist.",
        resolve: () => ({ effects: [now("Der Antrag ist abgelehnt. Reinhardt ist verärgert.", { trust: -8, morale: -2 })] }),
      },
    },
  },
  {
    id: "k_digital",
    corporate: true,
    title: "Digitalprogramm für die Werke",
    motion: "Die Finanzvorständin beantragt ein dreijähriges Programm, um alle Werke zu vernetzen.",
    pitch: "„Wir planen noch mit Tabellen. Unsere Wettbewerber sehen jede Maschine live.“",
    context: (s) => `Kosten: ${eur(rev(s) * 0.02)} im Monat für drei Jahre. Versprochen: weniger Ausschuss, weniger Stillstand.`,
    lesson: "kapitalallokation",
    insight: "Große Programme scheitern, wenn sie alles auf einmal wollen. Wer in einem Werk beginnt und lernt, gibt weniger aus und weiß mehr.",
    when: on,
    repeatAfter: 18,
    pull: { product: 0.5, cash: -0.3, control: 0.3, team: -0.1 },
    pro: [
      { interest: "product", text: "Weniger Ausschuss heißt bessere Qualität." },
      { interest: "control", text: "Endlich wissen wir, was in den Werken passiert." },
    ],
    contra: [
      { interest: "cash", text: "Drei Jahre Kosten, bevor sich etwas zeigt." },
      { interest: "team", text: "Die Meister fürchten die Kontrolle." },
    ],
    arguments: [
      { id: "all", text: "Halbe Digitalisierung ist keine Digitalisierung.", toward: "go", appeals: ["product", "control"] },
      { id: "pilot", text: "Erst ein Werk, dann entscheiden wir über den Rest.", toward: "conditions", appeals: ["cash", "team"] },
      { id: "wait", text: "Das ist ein Projekt für Berater, nicht für uns.", toward: "no", appeals: ["cash", "team"] },
    ],
    questions: [{ id: "pilot", q: "Wo würde ein Pilot starten?", a: () => "In Bremen. Dort ist die Belegschaft offen und die Maschinen sind neu." }],
    outcomes: {
      go: {
        label: "Alle Werke",
        summary: "Das volle Programm startet.",
        resolve: (s) => ({
          effects: [now("Das Digitalprogramm startet in allen Werken.", { opex: rev(s) * 0.02, axes: { management: 3 } })],
          risk: { delay: 6, chance: 0.45, good: { grossMargin: 0.03, opex: -rev(s) * 0.012, axes: { product: 6 } }, bad: { opex: -rev(s) * 0.005, morale: -4 }, goodText: "Die vernetzten Werke sparen mehr als geplant.", badText: "Das Programm verzettelt sich, der Nutzen bleibt klein." },
        }),
      },
      conditions: {
        label: "Pilot in Bremen",
        summary: "Ein Werk zuerst, dann der Rest.",
        resolve: (s) => ({ effects: [now("Der Pilot in Bremen beginnt.", { opex: rev(s) * 0.005 }), later(4, "Der Pilot zeigt, wo sich Vernetzung lohnt.", { grossMargin: 0.012, opex: -rev(s) * 0.003, axes: { product: 3 } })] }),
      },
      no: {
        label: "Abwarten",
        summary: "Kein Programm.",
        resolve: () => ({ effects: [now("Das Programm ist abgelehnt.", { trust: -2 }), later(6, "Voss wirbt mit vernetzten Maschinen Kunden ab.", { revenuePct: -0.015, axes: { edge: -3 } })] }),
      },
    },
  },
  {
    id: "k_auftrag",
    corporate: true,
    title: "Großauftrag mit Preisgarantie",
    motion: "Der Vorstand will einen Fünfjahresvertrag mit der Bahn unterschreiben, zu festen Preisen.",
    pitch: "„Fünf Jahre volle Auslastung. So einen Auftrag bekommt man einmal im Jahrzehnt.“",
    context: (s) => `Der Auftrag bringt ${eur(rev(s) * 0.08)} Umsatz im Monat, die Preise sind fünf Jahre fest. Stahl ist gerade teuer.`,
    lesson: "aufsichtsrat",
    insight: "Ein fester Preis über Jahre ist eine Wette auf die Kosten. Gute Verträge teilen das Risiko: Preisgleitklauseln binden den Preis an Rohstoffe.",
    when: on,
    repeatAfter: 60,
    pull: { growth: 0.5, customer: 0.4, cash: -0.2, control: -0.3 },
    pro: [
      { interest: "growth", text: "Auslastung für fünf Jahre." },
      { interest: "customer", text: "Die Bahn ist unser wichtigster Referenzkunde." },
    ],
    contra: [
      { interest: "control", text: "Feste Preise bei schwankenden Rohstoffen sind ein Glücksspiel." },
      { interest: "cash", text: "Wenn Stahl teurer wird, verlieren wir mit jeder Lieferung." },
    ],
    arguments: [
      { id: "sign", text: "Die Auslastung ist mehr wert als das Preisrisiko.", toward: "go", appeals: ["growth", "customer"] },
      { id: "clause", text: "Unterschreiben, aber mit Preisgleitklausel für Stahl.", toward: "conditions", appeals: ["control", "customer"] },
      { id: "pass", text: "Nicht zu diesen Bedingungen.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [{ id: "clause", q: "Würde die Bahn eine Preisgleitklausel akzeptieren?", a: () => "Wahrscheinlich, wenn wir beim Grundpreis etwas nachgeben." }],
    outcomes: {
      go: {
        label: "Unterschreiben",
        summary: "Fünf Jahre feste Preise.",
        resolve: () => ({
          effects: [now("Der Bahnvertrag ist unterschrieben.", { revenuePct: 0.08, morale: 4 }), later(60, "Der Bahnvertrag läuft nach fünf Jahren aus.", { revenuePct: -0.07 })],
          risk: { delay: 4, chance: 0.5, good: { grossMargin: 0.005 }, bad: { grossMargin: -0.03 }, goodText: "Stahl wird billiger, der Vertrag ist ein Glücksgriff.", badText: "Stahl wird teurer, jede Lieferung kostet Marge." },
        }),
      },
      conditions: {
        label: "Mit Preisgleitklausel",
        summary: "Etwas weniger Preis, dafür kein Rohstoffrisiko.",
        resolve: () => ({
          effects: [
            now("Der Bahnvertrag mit Preisgleitklausel ist unterschrieben.", { revenuePct: 0.07, grossMargin: -0.004, morale: 3 }),
            later(60, "Der Bahnvertrag läuft nach fünf Jahren aus.", { revenuePct: -0.06 }),
          ],
        }),
      },
      no: {
        label: "Ablehnen",
        summary: "Kein Vertrag.",
        resolve: () => ({ effects: [now("Der Auftrag geht an Voss.", { morale: -3, axes: { market: -3 } })] }),
      },
    },
  },
];
