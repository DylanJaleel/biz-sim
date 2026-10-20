import { burn, eur, has, later, now, pct, valueOf, type Template } from "../templates";
import type { Startup } from "../types";

// Noch mehr Themen für die Sitzungen: Kunden, die kündigen, Streit an der
// Spitze, Klagen, Lieferanten, KI, Nachhaltigkeit. Nicht jedes Mal ist der
// Mittelweg der beste: Manchmal zahlt sich Mut aus, manchmal ein klares Nein.

const rev = (s: Startup) => s.metrics.revenue;
const startup = (s: Startup) => !has(s, "mittelstand") && !s.corporate;
const family = (s: Startup) => has(s, "mittelstand");
const corporate = (s: Startup) => s.corporate === true;
const software = (s: Startup) => ["Software für Firmen", "Finanzen", "Gesundheit", "Bildung"].includes(s.sector);

export const THEME_TEMPLATES: Template[] = [
  // -------------------------------------------------------------------------
  // Startups
  // -------------------------------------------------------------------------
  {
    id: "kunde_kuendigt",
    title: "{customer} kündigt",
    motion: "{customer}, der größte Kunde, hat zum Quartalsende gekündigt. Die Geschäftsführung will ihn mit 20 % Rabatt halten.",
    pitch: "„Ohne {customer} fehlt uns ein großer Teil des Umsatzes. Lieber weniger verdienen als gar nichts.“",
    context: (s) => `{customer} steht für ${pct(s.metrics.topCustomer)} des Umsatzes. Ein Rabatt von 20 % kostet etwa ${eur(rev(s) * s.metrics.topCustomer * 0.2)} im Monat.`,
    lesson: "klumpenrisiko",
    insight:
      "Wer an einem Kunden hängt, verhandelt aus Schwäche. Einen großen Kunden zu halten ist richtig, wenn die Kündigung ein Preissignal ist. Dauerhaft hilft nur, die Abhängigkeit zu senken.",
    when: (s, age) => startup(s) && age >= 3 && s.metrics.topCustomer >= 0.18,
    pull: { customer: 0.6, cash: -0.2, growth: 0.2, control: -0.3 },
    pro: [
      { interest: "customer", text: "{customer} hat uns groß gemacht." },
      { interest: "growth", text: "Ohne den Umsatz wackelt unser Wachstum." },
    ],
    contra: [
      { interest: "control", text: "Wer einmal Rabatt bekommt, kündigt nächstes Jahr wieder." },
      { interest: "cash", text: "Der Rabatt frisst unsere Marge." },
    ],
    arguments: [
      { id: "keep", text: "Den Kunden halten, koste es, was es wolle.", toward: "go", appeals: ["customer", "growth"] },
      { id: "talk", text: "Erst verstehen, warum: ein Gespräch auf Chefebene, ohne Rabatt.", toward: "conditions", appeals: ["customer", "control"] },
      { id: "let", text: "Gehen lassen und den Vertrieb breiter aufstellen.", toward: "no", appeals: ["control", "cash"] },
    ],
    questions: [
      {
        id: "why",
        q: "Warum hat {customer} gekündigt?",
        a: () => "Ein neuer Einkaufsleiter vergleicht alle Lieferanten. Der Preis ist ein Grund, die Qualität war nie ein Thema.",
      },
      { id: "others", q: "Welche Kunden kämen als Ersatz infrage?", a: () => "Drei mittelgroße Firmen sind im Gespräch, zusammen etwa halb so groß wie {customer}." },
    ],
    outcomes: {
      go: {
        label: "Mit Rabatt halten",
        summary: "20 % Rabatt für drei Jahre.",
        resolve: (s) => ({
          effects: [now("Das Rabattangebot ist raus.", { grossMargin: -0.025 })],
          risk: {
            delay: 1,
            chance: 0.5,
            good: { trust: 2 },
            bad: { revenuePct: -s.metrics.topCustomer * 0.8, topCustomer: -s.metrics.topCustomer * 0.5 },
            goodText: "{customer} bleibt, zu schlechteren Preisen.",
            badText: "{customer} nimmt den Rabatt als Anfang und geht trotzdem.",
          },
        }),
      },
      conditions: {
        label: "Gespräch ohne Rabatt",
        summary: "Die Gründerin fährt hin und hört zu.",
        resolve: (s) => ({
          effects: [now("Ein Termin bei {customer} steht.", {})],
          risk: {
            delay: 1,
            chance: 0.45,
            good: { axes: { market: 2 } },
            bad: { revenuePct: -s.metrics.topCustomer * 0.85, topCustomer: -s.metrics.topCustomer * 0.55, morale: -2 },
            goodText: "{customer} bleibt, ein neuer Servicevertrag überzeugt.",
            badText: "Das Gespräch ist freundlich, die Kündigung bleibt.",
          },
        }),
      },
      no: {
        label: "Gehen lassen",
        summary: "Kein Rabatt, dafür neue Kunden suchen.",
        resolve: (s) => ({
          effects: [
            now("{customer} geht zum Quartalsende.", { revenuePct: -s.metrics.topCustomer * 0.85, topCustomer: -s.metrics.topCustomer * 0.55 }),
            later(3, "Neue Kunden ersetzen einen guten Teil des Umsatzes.", { revenuePct: s.metrics.topCustomer * 0.55, growth: 0.003, axes: { market: 2 } }),
          ],
        }),
      },
    },
  },
  {
    id: "gruenderstreit",
    title: "Streit an der Spitze",
    motion: "{ceo} und {cto} sind sich über die Richtung uneins. {ceo} bittet den Beirat um Rückendeckung.",
    pitch: "„Wir drehen uns im Kreis. Einer muss am Ende entscheiden, und das sollte die Geschäftsführung sein.“",
    context: (s) => `Das Team mit ${s.metrics.team} Leuten bekommt den Streit mit. Die Stimmung liegt bei ${Math.round(s.metrics.morale)} von 100.`,
    lesson: "governance",
    insight: "Ein Beirat, der Partei ergreift, verliert einen der beiden. Klare Rollen und ein Weg, Streit zu lösen, sind mehr wert als ein Sieger.",
    when: (s, age) => startup(s) && age >= 4 && s.metrics.team >= 5,
    repeatAfter: 20,
    pull: { control: 0.5, team: 0.2, product: -0.3, cash: -0.1 },
    pro: [
      { interest: "control", text: "Am Ende braucht eine Firma eine Stimme." },
      { interest: "team", text: "Das Team will Klarheit, nicht Dauerstreit." },
    ],
    contra: [
      { interest: "product", text: "Ohne {cto} fehlt das Herz des Produkts." },
      { interest: "team", text: "Die Entwickler halten zu {cto}." },
    ],
    arguments: [
      { id: "mediate", text: "Eine Mediation und klare Rollen: Wer entscheidet was?", toward: "go", appeals: ["team", "control"] },
      { id: "budget", text: "{cto} bekommt ein eigenes Budget für die Technik.", toward: "conditions", appeals: ["product", "team"] },
      { id: "back", text: "Der Beirat stellt sich hinter die Geschäftsführung.", toward: "no", appeals: ["control"] },
    ],
    questions: [{ id: "core", q: "Worum geht es im Kern?", a: () => "{ceo} will schneller verkaufen, {cto} will erst die Technik umbauen. Beide haben gute Gründe." }],
    outcomes: {
      go: {
        label: "Mediation und Rollen",
        summary: "Eine Mediatorin, danach klare Zuständigkeiten.",
        resolve: () => ({
          effects: [now("Die Mediation beginnt.", { cash: -10_000, morale: 2 })],
          risk: {
            delay: 2,
            chance: 0.5,
            good: { morale: 5, axes: { management: 5 } },
            bad: { morale: -4, growth: -0.004, axes: { product: -2 } },
            goodText: "Die Rollen sind geklärt, das Team atmet auf.",
            badText: "Die Mediation bringt Waffenstillstand, keinen Frieden.",
          },
        }),
      },
      conditions: {
        label: "Eigenes Technikbudget",
        summary: "{cto} entscheidet über die Technik.",
        resolve: () => ({
          effects: [now("{cto} bekommt ein eigenes Budget.", { opex: 3_000, morale: 2 })],
          risk: {
            delay: 3,
            chance: 0.5,
            good: { axes: { product: 4 }, growth: 0.002 },
            bad: { morale: -5, growth: -0.002 },
            goodText: "Die Technik wird stabiler, der Streit leiser.",
            badText: "Jetzt gibt es zwei Firmen in einer.",
          },
        }),
      },
      no: {
        label: "Hinter die Geschäftsführung",
        summary: "{ceo} entscheidet, {cto} muss folgen.",
        resolve: () => ({
          effects: [now("Der Beirat stärkt {ceo} den Rücken.", { axes: { management: 2 } })],
          risk: {
            delay: 2,
            chance: 0.6,
            good: { growth: 0.006, axes: { management: 3 } },
            bad: { morale: -8, axes: { product: -6 }, growth: -0.004 },
            goodText: "{cto} zieht mit, die Firma wird schneller.",
            badText: "{cto} kündigt innerlich, zwei Entwickler gehen.",
          },
        }),
      },
    },
  },
  {
    id: "ki_service",
    title: "KI im Kundenservice",
    motion: "Die Geschäftsführung will den Kundenservice weitgehend auf KI umstellen.",
    pitch: "„Die Hälfte der Anfragen ist immer dieselbe. Eine KI beantwortet sie in Sekunden, rund um die Uhr.“",
    context: (s) => `Die Einführung kostet ${eur(15_000)}. Der Service kostet heute etwa ${eur(Math.max(6_000, s.metrics.opex * 0.12))} im Monat.`,
    lesson: "opportunitaetskosten",
    insight: "Neue Technik spart nur, wenn die Abläufe dazu passen. Wer erst die einfachen Fälle automatisiert und misst, lernt billig, wo die Grenzen liegen.",
    when: (s, age) => startup(s) && age >= 3 && s.metrics.team >= 4,
    pull: { cash: 0.4, product: 0.3, customer: -0.3, team: -0.4 },
    pro: [
      { interest: "cash", text: "Weniger Kosten bei jedem neuen Kunden." },
      { interest: "product", text: "Antworten in Sekunden statt Stunden." },
    ],
    contra: [
      { interest: "customer", text: "Unsere Kunden schätzen echte Menschen." },
      { interest: "team", text: "Das Serviceteam fürchtet um seine Stellen." },
    ],
    arguments: [
      { id: "all", text: "Wer jetzt nicht automatisiert, ist morgen zu teuer.", toward: "go", appeals: ["cash", "product"] },
      { id: "pilot", text: "Erst die einfachen Fragen, ein Mensch bleibt erreichbar.", toward: "conditions", appeals: ["customer", "team"] },
      { id: "wait", text: "Unser Service ist ein Grund, warum Kunden bleiben.", toward: "no", appeals: ["customer", "team"] },
    ],
    questions: [{ id: "share", q: "Wie viele Anfragen sind Standardfragen?", a: () => "Etwa 60 %: Passwort, Rechnung, Lieferstatus." }],
    outcomes: {
      go: {
        label: "Volle Umstellung",
        summary: "Die KI übernimmt, das Serviceteam schrumpft.",
        resolve: (s) => ({
          effects: [now("Die KI geht live.", { cash: -20_000, morale: -4 })],
          risk: {
            delay: 2,
            chance: 0.4,
            good: { opex: -Math.max(4_000, s.metrics.opex * 0.06), grossMargin: 0.01 },
            bad: { trust: -6, revenuePct: -0.1, growth: -0.004, morale: -3 },
            goodText: "Die KI löst die meisten Fragen, die Kosten sinken.",
            badText: "Kunden ärgern sich über falsche Antworten.",
          },
        }),
      },
      conditions: {
        label: "Erst die einfachen Fragen",
        summary: "Ein Pilot, Menschen bleiben erreichbar.",
        resolve: (s) => ({
          effects: [now("Der Pilot startet.", { cash: -5_000 }), later(3, "Der Pilot spart Zeit im Service.", { opex: -Math.max(1_500, s.metrics.opex * 0.025) })],
        }),
      },
      no: {
        label: "Menschen bleiben",
        summary: "Kein KI-Service.",
        resolve: () => ({ effects: [now("Der Service bleibt, wie er ist.", { morale: 2 }), later(6, "Die Konkurrenz antwortet schneller und billiger.", { axes: { edge: -3 } })] }),
      },
    },
  },
  {
    id: "patentklage",
    title: "{competitor} klagt wegen eines Patents",
    motion: "{competitor} wirft der Firma vor, ein Patent zu verletzen, und fordert Schadenersatz. Die Geschäftsführung will einen Vergleich.",
    pitch: "„Ein Prozess dauert Jahre und lähmt uns. Ein Vergleich kostet Geld, aber wir haben Ruhe.“",
    context: (s) => `Der Vergleich kostet ${eur(Math.max(30_000, burn(s) * 0.8))}. Ein Prozess kostet etwa ${eur(25_000)} an Anwälten, verloren deutlich mehr.`,
    lesson: "erwartungswert",
    insight: "Bei einer Klage zählt der Erwartungswert: Chance mal Ergebnis, plus Zeit und Nerven. Ein Gutachten vorab kostet wenig und macht die Chancen ehrlich.",
    when: (s, age) => startup(s) && age >= 5 && valueOf(s) > 1_500_000,
    pull: { control: 0.4, cash: -0.3, product: 0.2, growth: 0.1 },
    pro: [
      { interest: "control", text: "Ein Prozess macht uns für Investoren unberechenbar." },
      { interest: "product", text: "Wir wollen bauen, nicht streiten." },
    ],
    contra: [
      { interest: "cash", text: "Wer zahlt, gibt zu und lädt zur nächsten Klage ein." },
      { interest: "growth", text: "Das Geld fehlt im Vertrieb." },
    ],
    arguments: [
      { id: "settle", text: "Ruhe ist mehr wert als Recht.", toward: "go", appeals: ["control", "product"] },
      { id: "expert", text: "Erst ein Gutachten, dann eine Lizenz verhandeln.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "fight", text: "Wir haben nichts kopiert. Wir kämpfen.", toward: "no", appeals: ["cash", "growth"] },
    ],
    questions: [
      { id: "odds", q: "Wie stehen unsere Chancen vor Gericht?", a: () => "Unser Anwalt sagt: eher gut. Das Patent ist breit formuliert und wackelig." },
      { id: "motive", q: "Warum klagt {competitor} gerade jetzt?", a: () => "Sie suchen Geld für ihre nächste Runde und wollen uns ausbremsen." },
    ],
    outcomes: {
      go: {
        label: "Vergleich",
        summary: "Zahlen, und die Sache ist erledigt.",
        resolve: (s) => ({
          effects: [
            now("Der Vergleich ist unterschrieben.", { cash: -Math.max(45_000, burn(s) * 1.2), morale: -2, axes: { edge: -3 } }),
            later(2, "{competitor} erzählt jedem Kunden vom Vergleich.", { revenuePct: -0.05, growth: -0.003 }),
          ],
        }),
      },
      conditions: {
        label: "Gutachten und Lizenz",
        summary: "Erst prüfen, dann eine kleine Lizenz anbieten.",
        resolve: () => ({ effects: [now("Ein Gutachten ist beauftragt.", { cash: -8_000 }), later(2, "Eine kleine Lizenzgebühr beendet den Streit.", { opex: 1_500 })] }),
      },
      no: {
        label: "Vor Gericht",
        summary: "Kein Cent ohne Urteil.",
        resolve: (s) => ({
          effects: [now("Die Anwälte bereiten den Prozess vor.", { cash: -20_000 })],
          risk: {
            delay: 4,
            chance: 0.7,
            good: { axes: { edge: 6 }, trust: 3, growth: 0.002 },
            bad: { cash: -Math.max(60_000, burn(s) * 1.5), revenuePct: -0.03 },
            goodText: "Das Gericht kippt das Patent. {competitor} steht blamiert da.",
            badText: "Das Urteil geht gegen uns. Schadenersatz und eine Pause im Vertrieb.",
          },
        }),
      },
    },
  },
  {
    id: "dienstleister_pleite",
    title: "Ein wichtiger Dienstleister ist pleite",
    motion: "Der Anbieter, über den alle Zahlungen laufen, ist insolvent. Die Geschäftsführung will sofort zu einem teuren Ersatz wechseln.",
    pitch: "„Der Insolvenzverwalter verspricht viel. Ich will nicht, dass unsere Kunden nicht mehr zahlen können.“",
    context: () => `Der Ersatz kostet ${eur(4_000)} mehr im Monat. Der Wechsel dauert zwei Wochen.`,
    lesson: "klumpenrisiko",
    insight: "Ein einzelner Dienstleister ist ein Klumpenrisiko wie ein einzelner Kunde. Wer kritische Teile doppelt absichert, zahlt etwas mehr und schläft besser.",
    when: (s, age) => startup(s) && age >= 2 && rev(s) > 15_000,
    pull: { customer: 0.5, control: 0.3, cash: -0.4 },
    pro: [
      { interest: "customer", text: "Wenn Zahlungen ausfallen, verlieren wir Kunden." },
      { interest: "control", text: "Wir wollen nicht vom Insolvenzverwalter abhängen." },
    ],
    contra: [{ interest: "cash", text: "Der neue Anbieter ist deutlich teurer." }],
    arguments: [
      { id: "switch", text: "Sofort wechseln, kein Risiko.", toward: "go", appeals: ["customer", "control"] },
      { id: "two", text: "Einen zweiten Anbieter parallel anbinden.", toward: "conditions", appeals: ["control", "cash"] },
      { id: "wait", text: "Der Verwalter führt den Betrieb fort. Abwarten.", toward: "no", appeals: ["cash"] },
    ],
    questions: [{ id: "admin", q: "Was sagt der Insolvenzverwalter?", a: () => "Der Betrieb läuft vorerst weiter, ein Käufer wird gesucht. Garantien gibt er keine." }],
    outcomes: {
      go: {
        label: "Sofort wechseln",
        summary: "Der teure Ersatz, ab nächster Woche.",
        resolve: () => ({ effects: [now("Der Wechsel ist beauftragt.", { opex: 4_000, cash: -3_000 })] }),
      },
      conditions: {
        label: "Zwei Anbieter",
        summary: "Ein zweiter Anbieter als Absicherung.",
        resolve: () => ({ effects: [now("Ein zweiter Anbieter wird angebunden.", { opex: 2_000, cash: -6_000, axes: { product: 2 } })] }),
      },
      no: {
        label: "Abwarten",
        summary: "Beim alten Anbieter bleiben.",
        resolve: () => ({
          effects: [],
          risk: {
            delay: 1,
            chance: 0.4,
            good: { axes: { finance: 1 } },
            bad: { revenuePct: -0.07, trust: -4, morale: -3 },
            goodText: "Ein Käufer übernimmt den Anbieter, alles läuft weiter.",
            badText: "Zwei Wochen lang gehen keine Zahlungen durch.",
          },
        }),
      },
    },
  },
  {
    id: "teilverkauf",
    title: "{acquirer} will einen Produktbereich kaufen",
    motion: "{acquirer} bietet an, einen kleineren Produktbereich zu übernehmen, samt Kunden und zwei Leuten.",
    pitch: "„Der Bereich lenkt uns ab. Mit dem Geld konzentrieren wir uns auf das, was wächst.“",
    context: (s) => `Angebot: ${eur(rev(s) * 3)}. Der Bereich bringt etwa ${eur(rev(s) * 0.12)} Umsatz im Monat und kostet ${eur(s.metrics.opex * 0.08)}.`,
    lesson: "kapitalallokation",
    insight: "Ein Teilverkauf lohnt, wenn der Käufer mehr bezahlt, als der Bereich bei dir je bringen würde, und wenn dadurch Aufmerksamkeit frei wird. Fokus ist eine Ressource.",
    when: (s, age) => startup(s) && age >= 6 && rev(s) > 40_000,
    pull: { cash: 0.5, product: 0.3, growth: -0.4, customer: -0.2 },
    pro: [
      { interest: "cash", text: "Geld ohne Verwässerung." },
      { interest: "product", text: "Endlich ein Produkt, ein Team, ein Ziel." },
    ],
    contra: [
      { interest: "growth", text: "Wir verkaufen Umsatz, den wir mühsam aufgebaut haben." },
      { interest: "customer", text: "Die Kunden des Bereichs sind auch unsere Kunden." },
    ],
    arguments: [
      { id: "sell", text: "Gutes Geld für einen Nebenschauplatz.", toward: "go", appeals: ["cash", "product"] },
      { id: "license", text: "Statt Verkauf: eine Lizenz, wir behalten die Kunden.", toward: "conditions", appeals: ["customer", "cash"] },
      { id: "keep", text: "Jeder Umsatz zählt in der nächsten Runde.", toward: "no", appeals: ["growth", "customer"] },
    ],
    questions: [{ id: "growth", q: "Wie wächst der Bereich?", a: () => "Kaum. Seit einem Jahr fast flach." }],
    outcomes: {
      go: {
        label: "Verkaufen",
        summary: "Der Bereich geht an {acquirer}.",
        resolve: (s) => ({
          effects: [
            now("Der Bereich ist verkauft.", { cash: rev(s) * 3, revenuePct: -0.12, opex: -s.metrics.opex * 0.08, team: -2, axes: { product: 3 } }),
            later(3, "Der Fokus zahlt sich aus.", { growth: 0.003 }),
          ],
        }),
      },
      conditions: {
        label: "Lizenz",
        summary: "{acquirer} vertreibt, wir behalten die Kunden.",
        resolve: (s) => ({
          effects: [now("Die Lizenz ist verhandelt.", { cash: rev(s) * 0.6 })],
          risk: {
            delay: 3,
            chance: 0.5,
            good: { revenuePct: 0.03 },
            bad: { morale: -3, axes: { product: -2 } },
            goodText: "Die Lizenz bringt zusätzliche Einnahmen.",
            badText: "Die Abstimmung mit {acquirer} frisst Zeit.",
          },
        }),
      },
      no: {
        label: "Behalten",
        summary: "Alles bleibt im Haus.",
        resolve: () => ({ effects: [now("Das Angebot ist abgelehnt.", {})] }),
      },
    },
  },
  {
    id: "esg_nachweis",
    title: "{customer} verlangt eine CO₂-Bilanz",
    motion: "{customer} verlangt von allen Lieferanten bis Jahresende eine geprüfte CO₂-Bilanz. Die Geschäftsführung will sie vollständig erstellen lassen.",
    pitch: "„Große Kunden fragen das jetzt alle. Wer es kann, gewinnt Ausschreibungen.“",
    context: () => `Eine geprüfte Bilanz kostet ${eur(12_000)}, eine einfache Selbstauskunft ${eur(4_000)}.`,
    lesson: "burggraben",
    insight: "Nachweise wie Zertifikate oder Bilanzen sind lästig, aber sie sind auch Markteintrittshürden. Wer sie früh hat, sitzt bei großen Kunden mit am Tisch.",
    when: (s, age) => startup(s) && age >= 4 && s.metrics.topCustomer >= 0.1,
    pull: { customer: 0.5, growth: 0.2, cash: -0.4 },
    pro: [
      { interest: "customer", text: "Ohne Bilanz fliegen wir aus der Lieferantenliste." },
      { interest: "growth", text: "Andere Konzerne fragen bald dasselbe." },
    ],
    contra: [{ interest: "cash", text: "Bürokratie statt Produkt." }],
    arguments: [
      { id: "full", text: "Richtig oder gar nicht: geprüft und veröffentlicht.", toward: "go", appeals: ["customer", "growth"] },
      { id: "basic", text: "Eine Selbstauskunft reicht fürs Erste.", toward: "conditions", appeals: ["cash", "customer"] },
      { id: "no", text: "Wir sind zu klein dafür.", toward: "no", appeals: ["cash"] },
    ],
    questions: [{ id: "strict", q: "Wie streng prüft {customer}?", a: () => "Bisher reicht eine Selbstauskunft. Ab nächstem Jahr soll es geprüft sein." }],
    outcomes: {
      go: {
        label: "Geprüfte Bilanz",
        summary: "Vollständig und extern geprüft.",
        resolve: () => ({
          effects: [now("Die Bilanz ist beauftragt.", { cash: -28_000, axes: { product: -2 } })],
          risk: {
            delay: 4,
            chance: 0.45,
            good: { revenuePct: 0.015, axes: { market: 3 } },
            bad: { axes: { market: 1 } },
            goodText: "Zwei Konzerne laden zu Ausschreibungen ein.",
            badText: "Die Bilanz liegt vor, aber die Konzerne fragen noch nicht danach.",
          },
        }),
      },
      conditions: {
        label: "Selbstauskunft",
        summary: "Das Nötigste, ohne Prüfung.",
        resolve: () => ({
          effects: [now("Die Selbstauskunft ist verschickt.", { cash: -4_000 })],
          risk: {
            delay: 5,
            chance: 0.5,
            good: { revenuePct: 0.01 },
            bad: { revenuePct: -0.02 },
            goodText: "{customer} ist zufrieden.",
            badText: "Im nächsten Jahr reicht es nicht mehr, ein Auftrag geht verloren.",
          },
        }),
      },
      no: {
        label: "Keine Bilanz",
        summary: "Wir lassen es.",
        resolve: (s) => ({
          effects: [now("Keine Bilanz.", {})],
          risk: {
            delay: 5,
            chance: 0.6,
            good: {},
            bad: { revenuePct: -Math.min(0.06, s.metrics.topCustomer * 0.25) },
            goodText: "{customer} fragt nicht mehr nach.",
            badText: "{customer} kürzt die Bestellungen.",
          },
        }),
      },
    },
  },
  {
    id: "remote_first",
    title: "Das Büro aufgeben?",
    motion: "Der Mietvertrag läuft aus. Die Geschäftsführung will kein Büro mehr, sondern ganz auf Arbeit von zu Hause setzen.",
    pitch: "„Das Büro ist halb leer. Mit dem Geld bezahlen wir zwei Entwickler.“",
    context: (s) => `Die Miete kostet ${eur(Math.max(5_000, s.metrics.opex * 0.08))} im Monat. Das Team hat ${s.metrics.team} Leute.`,
    lesson: "fixkosten",
    insight:
      "Fixkosten sind ein Hebel in beide Richtungen. Gespart ist nur, was die Zusammenarbeit nicht kostet; ein paar feste Tage im Monat halten oft das Beste aus beiden Welten.",
    when: (s, age) => startup(s) && age >= 6 && s.metrics.team >= 8,
    pull: { cash: 0.6, team: -0.2, product: -0.2, control: -0.1 },
    pro: [
      { interest: "cash", text: "Die Miete ist unser zweitgrößter Kostenblock." },
      { interest: "team", text: "Viele wohnen weit weg und pendeln ungern." },
    ],
    contra: [
      { interest: "product", text: "Gute Ideen entstehen in der Kaffeeküche." },
      { interest: "team", text: "Neue Leute lernen nichts, wenn keiner da ist." },
    ],
    arguments: [
      { id: "remote", text: "Ganz von zu Hause, dafür zwei Leute mehr.", toward: "go", appeals: ["cash", "team"] },
      { id: "small", text: "Ein kleiner Raum für feste Teamtage.", toward: "conditions", appeals: ["team", "product"] },
      { id: "stay", text: "Verlängern, wie es ist.", toward: "no", appeals: ["product", "control"] },
    ],
    questions: [{ id: "usage", q: "Wie voll ist das Büro heute?", a: () => "Dienstags und donnerstags voll, sonst ein Drittel." }],
    outcomes: {
      go: {
        label: "Ohne Büro",
        summary: "Alle arbeiten von zu Hause.",
        resolve: (s) => ({
          effects: [now("Das Büro ist gekündigt.", { opex: -Math.max(5_000, s.metrics.opex * 0.08) })],
          risk: {
            delay: 3,
            chance: 0.5,
            good: { morale: 3 },
            bad: { morale: -6, axes: { product: -3, management: -2 } },
            goodText: "Das Team arbeitet konzentriert, auch ohne Büro.",
            badText: "Abstimmungen dauern, Neue fühlen sich verloren.",
          },
        }),
      },
      conditions: {
        label: "Kleiner Raum",
        summary: "Feste Teamtage, kleinerer Vertrag.",
        resolve: (s) => ({ effects: [now("Ein kleiner Raum ist gemietet.", { opex: -Math.max(2_500, s.metrics.opex * 0.04), morale: 2 })] }),
      },
      no: {
        label: "Verlängern",
        summary: "Alles bleibt.",
        resolve: () => ({ effects: [now("Der Vertrag ist verlängert.", {})] }),
      },
    },
  },
  {
    id: "strategischer_investor",
    title: "{partner} will einsteigen",
    motion: "{partner} bietet an, sich mit 8 % an der Firma zu beteiligen, und will dafür einen Sitz im Beirat.",
    pitch: "„Mit {partner} im Rücken öffnen sich Türen, an die wir allein nie klopfen könnten.“",
    context: (s) => `{partner} zahlt ${eur(valueOf(s) * 0.085)} für 8 %. Ein Beiratssitz bedeutet Einblick in alle Zahlen, auch für Wettbewerber von {partner}.`,
    lesson: "stimmrechte",
    insight: "Strategisches Geld bringt Zugang, aber auch Interessen. Ein Investor, der zugleich Kunde oder Partner ist, will nicht immer dasselbe wie die anderen Gesellschafter.",
    when: (s, age) => startup(s) && age >= 5 && valueOf(s) > 1_000_000,
    pull: { growth: 0.5, cash: 0.4, control: -0.6 },
    pro: [
      { interest: "growth", text: "{partner} kann uns zu großen Kunden bringen." },
      { interest: "cash", text: "Frisches Geld zu einer fairen Bewertung." },
    ],
    contra: [{ interest: "control", text: "Ein Partner im Beirat sieht alles, auch was seine Konkurrenten bei uns kaufen." }],
    arguments: [
      { id: "yes", text: "Zugang ist mehr wert als Kontrolle.", toward: "go", appeals: ["growth", "cash"] },
      { id: "observer", text: "Einsteigen ja, aber nur als Gast im Beirat, ohne Stimme.", toward: "conditions", appeals: ["control", "cash"] },
      { id: "no", text: "Wir bleiben unabhängig.", toward: "no", appeals: ["control"] },
    ],
    questions: [{ id: "others", q: "Was sagen andere Kunden dazu?", a: () => "Zwei Kunden sind Wettbewerber von {partner}. Einer hat schon nachgefragt." }],
    outcomes: {
      go: {
        label: "Mit Beiratssitz",
        summary: "8 % und ein Sitz für {partner}.",
        resolve: (s) => ({
          effects: [now("{partner} steigt ein.", { cash: valueOf(s) * 0.085, dilution: 0.08, dilutionTo: { id: "partner", name: "{partner}", kind: "investor" } })],
          risk: {
            delay: 3,
            chance: 0.4,
            good: { revenuePct: 0.05, axes: { market: 4 } },
            bad: { revenuePct: -0.06, trust: -4 },
            goodText: "{partner} öffnet Türen zu drei Großkunden.",
            badText: "Zwei Kunden, die mit {partner} konkurrieren, kündigen.",
          },
        }),
      },
      conditions: {
        label: "Als Gast ohne Stimme",
        summary: "Einstieg, aber kein Stimmrecht im Beirat.",
        resolve: (s) => ({
          effects: [
            now("{partner} steigt ein, ohne Stimme im Beirat.", { cash: valueOf(s) * 0.07, dilution: 0.08, dilutionTo: { id: "partner", name: "{partner}", kind: "investor" } }),
          ],
          risk: {
            delay: 3,
            chance: 0.5,
            good: { revenuePct: 0.02 },
            bad: { revenuePct: -0.03 },
            goodText: "{partner} empfiehlt die Firma weiter.",
            badText: "Ein Kunde misstraut dem neuen Gesellschafter.",
          },
        }),
      },
      no: {
        label: "Unabhängig bleiben",
        summary: "Kein Einstieg.",
        resolve: () => ({ effects: [now("Das Angebot ist abgelehnt. Die Kunden danken es.", { trust: 2, axes: { edge: 1 } })] }),
      },
    },
  },
  {
    id: "zertifizierung",
    title: "Sicherheitszertifikat für Konzernkunden",
    motion: "Mehrere Konzerne verlangen ein anerkanntes Sicherheitszertifikat. Die Geschäftsführung will es in sechs Monaten erreichen.",
    pitch: "„Ohne Zertifikat kommen wir bei Konzernen nicht über den Einkauf hinaus.“",
    context: () => `Berater, Prüfung und Umbauten kosten zusammen ${eur(20_000)}. Zwei Entwickler sind ein Vierteljahr gebunden.`,
    lesson: "burggraben",
    insight: "Zertifikate sind teuer und langweilig, und genau deshalb ein Burggraben: Wer sie hat, ist für große Kunden einkaufbar, wer nicht, bleibt draußen.",
    when: (s, age) => startup(s) && software(s) && age >= 4,
    pull: { customer: 0.5, growth: 0.4, cash: -0.4, product: -0.2 },
    pro: [
      { interest: "growth", text: "Konzernkunden zahlen das Zehnfache." },
      { interest: "customer", text: "Die Einkäufer fragen immer zuerst danach." },
    ],
    contra: [
      { interest: "cash", text: "Viel Geld, bevor ein einziger Vertrag steht." },
      { interest: "product", text: "Zwei Entwickler fehlen bei neuen Funktionen." },
    ],
    arguments: [
      { id: "go", text: "Das Zertifikat ist unsere Eintrittskarte.", toward: "go", appeals: ["growth", "customer"] },
      { id: "core", text: "Nur die Kernsysteme, das reicht für die ersten Kunden.", toward: "conditions", appeals: ["cash", "customer"] },
      { id: "later", text: "Erst wenn ein Konzern unterschreibt.", toward: "no", appeals: ["cash", "product"] },
    ],
    questions: [{ id: "deals", q: "Wie viele Konzernaufträge hängen daran?", a: () => "Zwei konkrete Ausschreibungen, eine davon mit großem Volumen." }],
    outcomes: {
      go: {
        label: "Volles Zertifikat",
        summary: "Alle Systeme, sechs Monate Arbeit.",
        resolve: () => ({
          effects: [
            now("Die Zertifizierung beginnt.", { cash: -20_000, axes: { product: -2 } }),
            later(4, "Das Zertifikat ist da. Zwei Konzerne unterschreiben.", { revenuePct: 0.06, growth: 0.004, axes: { edge: 4 } }),
          ],
        }),
      },
      conditions: {
        label: "Nur die Kernsysteme",
        summary: "Ein kleineres Zertifikat.",
        resolve: () => ({ effects: [now("Die Kernsysteme werden geprüft.", { cash: -8_000 }), later(3, "Ein Konzern akzeptiert das kleine Zertifikat.", { revenuePct: 0.02 })] }),
      },
      no: {
        label: "Später",
        summary: "Erst ein Vertrag, dann das Zertifikat.",
        resolve: () => ({
          effects: [
            now("Das Zertifikat wird verschoben.", {}),
            later(5, "Eine Ausschreibung geht an {competitor}, die zertifiziert sind.", { revenuePct: -0.02, axes: { market: -2 } }),
          ],
        }),
      },
    },
  },
  {
    id: "vertrieb_abwerbung",
    title: "Die Vertriebsleiterin hat ein Angebot",
    motion: "{competitor} will die Vertriebsleiterin abwerben. Die Geschäftsführung will mit 25 % mehr Gehalt kontern.",
    pitch: "„Sie hat die Hälfte unserer Kunden gewonnen. Wenn sie geht, nimmt sie Beziehungen mit.“",
    context: () => `25 % mehr Gehalt kosten ${eur(2_000)} im Monat. Eine Nachfolge zu finden dauert erfahrungsgemäß vier Monate.`,
    lesson: "schluesselpersonen",
    insight: "Gegenangebote halten oft nur ein Jahr: Wer einmal gehen wollte, geht häufig doch. Bindung entsteht eher durch Verantwortung und Anteile als durch Gehalt allein.",
    when: (s, age) => startup(s) && age >= 4 && s.metrics.team >= 6 && rev(s) > 20_000,
    pull: { growth: 0.4, customer: 0.4, cash: -0.3, control: -0.2 },
    pro: [
      { interest: "customer", text: "Die Kunden kennen nur sie." },
      { interest: "growth", text: "Ohne sie steht der Vertrieb ein halbes Jahr still." },
    ],
    contra: [
      { interest: "cash", text: "Wer droht, bekommt mehr? Das spricht sich herum." },
      { interest: "control", text: "Niemand sollte unersetzlich sein." },
    ],
    arguments: [
      { id: "match", text: "Sie ist es wert. Wir kontern.", toward: "go", appeals: ["customer", "growth"] },
      { id: "shares", text: "Weniger Gehalt, dafür Anteile und mehr Verantwortung.", toward: "conditions", appeals: ["control", "team"] },
      { id: "let", text: "Gehen lassen und den Vertrieb breiter aufstellen.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [{ id: "why", q: "Warum will sie wechseln?", a: () => "Vor allem wegen des Titels: Bei {competitor} würde sie Geschäftsführerin." }],
    outcomes: {
      go: {
        label: "Gehalt kontern",
        summary: "25 % mehr Gehalt.",
        resolve: () => ({
          effects: [now("Sie bleibt, für mehr Geld.", { opex: 2_000 })],
          risk: {
            delay: 6,
            chance: 0.5,
            good: { growth: 0.002 },
            bad: { revenuePct: -0.04, growth: -0.003 },
            goodText: "Sie bleibt und gewinnt zwei Großkunden.",
            badText: "Ein Jahr später geht sie doch, mitten im Quartal.",
          },
        }),
      },
      conditions: {
        label: "Anteile und Verantwortung",
        summary: "Bereichsleitung und ein kleiner Anteil.",
        resolve: () => ({
          effects: [now("Sie wird Bereichsleiterin mit Anteilen.", { opex: 800, dilution: 0.01, dilutionTo: { id: "esop", name: "Mitarbeiterpool", kind: "esop" }, morale: 3 })],
          risk: {
            delay: 3,
            chance: 0.7,
            good: { growth: 0.003, axes: { management: 3 } },
            bad: { revenuePct: -0.04 },
            goodText: "Die neue Rolle spornt sie an.",
            badText: "Der Titel bei {competitor} war doch verlockender.",
          },
        }),
      },
      no: {
        label: "Gehen lassen",
        summary: "Eine Nachfolge suchen.",
        resolve: () => ({
          effects: [
            now("Sie geht zu {competitor}.", { revenuePct: -0.05, morale: -4 }),
            later(4, "Die Nachfolgerin ist eingearbeitet.", { revenuePct: 0.02, axes: { management: 2 } }),
          ],
        }),
      },
    },
  },

  // -------------------------------------------------------------------------
  // Mittelstand
  // -------------------------------------------------------------------------
  {
    id: "m_betriebsrat",
    title: "Die Belegschaft will einen Tarifvertrag",
    motion: "Der neue Betriebsrat fordert die Bindung an den Flächentarif. Die Geschäftsführung will ihn übernehmen.",
    pitch: "„Wir finden keine Fachkräfte mehr. Mit Tarif sind wir endlich vergleichbar.“",
    context: (s) => `Der Tarif kostet etwa ${eur(rev(s) * 0.03)} mehr im Monat. Ein Haustarif mit Erfolgsbeteiligung läge bei etwa der Hälfte.`,
    lesson: "governance",
    insight: "In Familienfirmen ist der Betriebsrat oft der wichtigste Gesprächspartner nach dem Kunden. Ein fairer Kompromiss kostet weniger als ein Jahr Misstrauen.",
    when: (s, age) => family(s) && age >= 3,
    pull: { team: 0.7, cash: -0.5, control: -0.3 },
    pro: [
      { interest: "team", text: "Faire Löhne halten die Leute." },
      { interest: "customer", text: "Zufriedene Mitarbeiter liefern pünktlich." },
    ],
    contra: [
      { interest: "cash", text: "Das frisst die halbe Marge." },
      { interest: "control", text: "Wir verlieren jede Flexibilität bei den Löhnen." },
    ],
    arguments: [
      { id: "yes", text: "Tarif ist fair und macht uns attraktiv.", toward: "go", appeals: ["team", "customer"] },
      { id: "house", text: "Ein Haustarif mit Erfolgsbeteiligung.", toward: "conditions", appeals: ["team", "cash"] },
      { id: "no", text: "Wir zahlen schon über dem Durchschnitt.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [{ id: "mood", q: "Wie ernst ist es dem Betriebsrat?", a: () => "Sehr. Die Gewerkschaft hat schon einen Warnstreik angekündigt, falls nichts kommt." }],
    outcomes: {
      go: {
        label: "Flächentarif",
        summary: "Bindung an den Tarif ab nächstem Monat.",
        resolve: (s) => ({
          effects: [now("Der Tarif gilt.", { opex: rev(s) * 0.03, morale: 10, axes: { management: 2 } }), later(4, "Bewerbungen kommen wieder.", { revenuePct: 0.02 })],
        }),
      },
      conditions: {
        label: "Haustarif",
        summary: "Weniger fest, mehr Erfolgsbeteiligung.",
        resolve: (s) => ({
          effects: [now("Ein Haustarif ist verhandelt.", { opex: rev(s) * 0.014, morale: 5 })],
          risk: {
            delay: 3,
            chance: 0.6,
            good: { morale: 4, grossMargin: 0.01 },
            bad: { morale: -6 },
            goodText: "Die Erfolgsbeteiligung spornt an.",
            badText: "Die Gewerkschaft nennt es Mogelpackung.",
          },
        }),
      },
      no: {
        label: "Ablehnen",
        summary: "Kein Tarif.",
        resolve: () => ({
          effects: [now("Die Forderung ist abgelehnt.", { morale: -8 })],
          risk: {
            delay: 1,
            chance: 0.4,
            good: { axes: { finance: 2 } },
            bad: { revenuePct: -0.05, morale: -5, trust: -3 },
            goodText: "Der Betriebsrat lenkt ein.",
            badText: "Ein Warnstreik legt die Produktion eine Woche lahm.",
          },
        }),
      },
    },
  },
  {
    id: "m_covenant",
    title: "Die Bank meldet sich: Kreditbedingung verletzt",
    motion: "Die Hausbank meldet, dass eine Kreditbedingung verletzt ist, und verlangt zusätzliche Sicherheiten. Die Geschäftsführung will die Betriebsimmobilie verpfänden.",
    pitch: "„Wenn die Bank kündigt, ist alles vorbei. Wir geben ihr, was sie will.“",
    context: (s) => `Offene Kredite: ${eur(s.metrics.debt)}. In der Kasse liegen ${eur(s.metrics.cash)}. Die Bank kann den Kredit sofort fällig stellen.`,
    lesson: "leverage",
    insight:
      "Kreditbedingungen (Covenants) sind Frühwarnsysteme der Bank. Wer früh mit ihr redet und einen Plan zeigt, bekommt meist Zeit. Wer schweigt, verliert die Verhandlungsmacht.",
    when: (s, age) => family(s) && age >= 2 && s.metrics.debt > rev(s) * 1.2 && s.metrics.cash < rev(s) * 0.8,
    urgent: true,
    repeatAfter: 12,
    pull: { control: 0.3, cash: 0.3, team: 0.1 },
    pro: [{ interest: "control", text: "Die Bank darf nicht kündigen." }],
    contra: [
      { interest: "control", text: "Mit der Immobilie verpfänden wir das letzte Polster." },
      { interest: "cash", text: "Wir sollten uns nicht erpressen lassen." },
    ],
    arguments: [
      { id: "pledge", text: "Sicherheiten geben, Ruhe haben.", toward: "go", appeals: ["control", "team"] },
      { id: "plan", text: "Mit einem Sanierungsplan zur Bank, Tilgung für ein halbes Jahr aussetzen.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "switch", text: "Umschulden zu einer anderen Bank.", toward: "no", appeals: ["cash"] },
    ],
    questions: [{ id: "bank", q: "Wie gesprächsbereit ist die Bank?", a: () => "Der Firmenkundenbetreuer ist seit 15 Jahren derselbe. Er will einen Plan sehen." }],
    outcomes: {
      go: {
        label: "Sicherheiten geben",
        summary: "Die Immobilie wird verpfändet.",
        resolve: () => ({ effects: [now("Die Bank ist beruhigt, die Immobilie verpfändet.", { trust: 2, axes: { finance: -2 } })] }),
      },
      conditions: {
        label: "Plan und Aussetzung",
        summary: "Ein Sanierungsplan, Tilgung pausiert.",
        resolve: (s) => ({
          effects: [
            now("Die Bank akzeptiert den Plan, gegen eine Gebühr.", { cash: -rev(s) * 0.02, axes: { finance: 4, management: 2 } }),
            later(3, "Der Plan greift, die Kennzahlen erholen sich.", { grossMargin: 0.01 }),
          ],
        }),
      },
      no: {
        label: "Umschulden",
        summary: "Eine andere Bank suchen.",
        resolve: (s) => ({
          effects: [now("Gespräche mit anderen Banken laufen.", { cash: -rev(s) * 0.01 })],
          risk: {
            delay: 2,
            chance: 0.35,
            good: { axes: { finance: 5 } },
            bad: { cash: -rev(s) * 0.3, morale: -6, trust: -4 },
            goodText: "Eine Förderbank übernimmt zu besseren Zinsen.",
            badText: "Keine Bank will. Die Hausbank kürzt die Linie.",
          },
        }),
      },
    },
  },
  {
    id: "m_lieferant",
    title: "Der wichtigste Lieferant fällt aus",
    motion: "Der Hauptlieferant für Vorprodukte in Asien liefert monatelang nicht. Die Geschäftsführung will sofort teurer in Europa kaufen.",
    pitch: "„Unsere Kunden warten nicht. Lieber weniger Marge als leere Regale.“",
    context: (s) => `Der europäische Lieferant ist etwa 15 % teurer. Ein zweiter Lieferant aufzubauen kostet ${eur(rev(s) * 0.05)} und dauert drei Monate.`,
    lesson: "klumpenrisiko",
    insight:
      "Billig einkaufen bei einem einzigen Lieferanten ist Effizienz, bis er ausfällt. Ein zweiter Lieferant kostet laufend etwas und ist trotzdem oft das billigste Risiko.",
    when: (s, age) => family(s) && age >= 2,
    repeatAfter: 24,
    pull: { customer: 0.5, cash: -0.4, control: 0.2 },
    pro: [{ interest: "customer", text: "Wer nicht liefert, verliert Kunden." }],
    contra: [{ interest: "cash", text: "Die Marge bricht ein." }],
    arguments: [
      { id: "europe", text: "Sofort in Europa kaufen.", toward: "go", appeals: ["customer"] },
      { id: "second", text: "Einen zweiten Lieferanten aufbauen, bis dahin rationieren.", toward: "conditions", appeals: ["control", "cash"] },
      { id: "wait", text: "Abwarten, der Lieferant fängt sich.", toward: "no", appeals: ["cash"] },
    ],
    questions: [{ id: "how_long", q: "Wie lange dauert der Ausfall?", a: () => "Der Lieferant sagt drei Monate. Die Branche munkelt von sechs." }],
    outcomes: {
      go: {
        label: "In Europa kaufen",
        summary: "Teurer, aber sofort.",
        resolve: () => ({
          effects: [now("Die Ware kommt aus Europa.", { grossMargin: -0.02 }), later(6, "Der alte Lieferant liefert wieder, die Preise sinken.", { grossMargin: 0.015 })],
        }),
      },
      conditions: {
        label: "Zweiter Lieferant",
        summary: "Langfristig absichern, kurzfristig knapp.",
        resolve: (s) => ({
          effects: [
            now("Ein zweiter Lieferant wird aufgebaut.", { cash: -rev(s) * 0.05, revenuePct: -0.03 }),
            later(3, "Zwei Lieferanten: Die Firma ist weniger verwundbar.", { revenuePct: 0.03, grossMargin: 0.005, axes: { management: 3 } }),
          ],
        }),
      },
      no: {
        label: "Abwarten",
        summary: "Nichts tun.",
        resolve: () => ({
          effects: [],
          risk: {
            delay: 1,
            chance: 0.35,
            good: {},
            bad: { revenuePct: -0.08, morale: -3, trust: -2 },
            goodText: "Der Lieferant liefert früher als gedacht.",
            badText: "Die Regale bleiben leer, Kunden wandern ab.",
          },
        }),
      },
    },
  },
  {
    id: "m_seniorchef",
    title: "Der Seniorchef mischt sich ein",
    motion: "Der frühere Inhaber kommt wieder täglich in die Firma und gibt Anweisungen. Die Geschäftsführung will ihm einen Beiratssitz anbieten, damit er Ruhe gibt.",
    pitch: "„Er meint es gut. Aber die Leute wissen nicht mehr, wer entscheidet.“",
    context: () => "Der Seniorchef ist 74, kennt jeden Kunden persönlich und hält noch einen kleinen Anteil.",
    lesson: "governance",
    insight: "Bei der Nachfolge in Familienfirmen ist das Loslassen schwerer als das Übergeben. Eine klare, ehrenvolle Rolle mit Grenzen schützt beide Seiten.",
    when: (s, age) => family(s) && age >= 4,
    pull: { team: 0.3, customer: 0.3, control: -0.4 },
    pro: [
      { interest: "customer", text: "Die alten Kunden vertrauen ihm." },
      { interest: "team", text: "Ein Bruch mit ihm würde die Belegschaft spalten." },
    ],
    contra: [{ interest: "control", text: "Ein Beiratssitz macht ihn noch mächtiger." }],
    arguments: [
      { id: "seat", text: "Ein Sitz im Beirat, dort gehört er hin.", toward: "go", appeals: ["customer", "team"] },
      { id: "honor", text: "Ehrenvorsitz und Kundenpflege, aber kein Wort ins Tagesgeschäft.", toward: "conditions", appeals: ["control", "customer"] },
      { id: "clear", text: "Ein klares Gespräch: Die Firma hat jetzt eine Geschäftsführung.", toward: "no", appeals: ["control"] },
    ],
    questions: [{ id: "family", q: "Was sagt die Familie?", a: () => "Seine Tochter bittet darum, ihm eine Aufgabe zu geben. Er langweilt sich zu Hause." }],
    outcomes: {
      go: {
        label: "Beiratssitz",
        summary: "Er sitzt künftig mit am Tisch.",
        resolve: () => ({ effects: [now("Der Seniorchef zieht in den Beirat ein.", { trust: 4, morale: 2, axes: { management: -3 } })] }),
      },
      conditions: {
        label: "Ehrenrolle mit Grenzen",
        summary: "Kundenpflege ja, Tagesgeschäft nein.",
        resolve: () => ({
          effects: [
            now("Der Seniorchef pflegt die alten Kunden.", { morale: 2 }),
            later(3, "Die Rollen sind klar, die Kunden zufrieden.", { revenuePct: 0.02, axes: { management: 3 } }),
          ],
        }),
      },
      no: {
        label: "Klare Kante",
        summary: "Er zieht sich ganz zurück.",
        resolve: () => ({
          effects: [now("Das Gespräch war hart.", { morale: -4 })],
          risk: {
            delay: 2,
            chance: 0.5,
            good: { axes: { management: 5 } },
            bad: { revenuePct: -0.04, trust: -4 },
            goodText: "Er akzeptiert. Die Geschäftsführung gewinnt an Autorität.",
            badText: "Er ist gekränkt, zwei alte Kunden gehen mit ihm.",
          },
        }),
      },
    },
  },
  {
    id: "m_ausbildung",
    title: "Eine eigene Lehrwerkstatt",
    motion: "Die Geschäftsführung will eine Lehrwerkstatt einrichten und jedes Jahr acht Auszubildende einstellen.",
    pitch: "„In fünf Jahren gehen zwölf Facharbeiter in Rente. Kaufen können wir die nicht, nur selbst ausbilden.“",
    context: (s) => `Die Lehrwerkstatt kostet ${eur(rev(s) * 0.15)} einmalig und ${eur(rev(s) * 0.01)} im Monat für Ausbilder und Vergütungen.`,
    lesson: "opportunitaetskosten",
    insight: "Ausbildung ist eine Investition mit langer Laufzeit. Sie rechnet sich nicht im nächsten Quartal, aber oft gegen die Alternative: keine Leute mehr zu finden.",
    when: (s, age) => family(s) && age >= 3,
    pull: { team: 0.6, growth: 0.2, cash: -0.5 },
    pro: [
      { interest: "team", text: "Junge Leute bringen frischen Wind." },
      { interest: "growth", text: "Ohne Fachkräfte können wir keine Aufträge mehr annehmen." },
    ],
    contra: [{ interest: "cash", text: "Viel Geld, das sich erst in Jahren auszahlt." }],
    arguments: [
      { id: "build", text: "Wer ausbildet, hat Leute.", toward: "go", appeals: ["team", "growth"] },
      { id: "coop", text: "Mit anderen Betrieben eine gemeinsame Werkstatt.", toward: "conditions", appeals: ["cash", "team"] },
      { id: "hire", text: "Lieber fertige Fachkräfte abwerben.", toward: "no", appeals: ["cash"] },
    ],
    questions: [{ id: "market", q: "Wie schwer ist es, Fachkräfte einzustellen?", a: () => "Die letzte Stelle war elf Monate offen." }],
    outcomes: {
      go: {
        label: "Eigene Lehrwerkstatt",
        summary: "Acht Auszubildende pro Jahr.",
        resolve: (s) => ({
          effects: [
            now("Die Lehrwerkstatt wird eingerichtet.", { cash: -rev(s) * 0.15, opex: rev(s) * 0.01, morale: 5 }),
            later(8, "Die ersten Azubis arbeiten mit, Aufträge müssen nicht mehr warten.", { revenuePct: 0.05, axes: { management: 3 } }),
          ],
        }),
      },
      conditions: {
        label: "Gemeinsam mit anderen",
        summary: "Eine Werkstatt im Verbund.",
        resolve: (s) => ({
          effects: [
            now("Der Ausbildungsverbund startet.", { cash: -rev(s) * 0.05, opex: rev(s) * 0.004, morale: 3 }),
            later(8, "Drei Azubis bleiben im Betrieb.", { revenuePct: 0.02 }),
          ],
        }),
      },
      no: {
        label: "Abwerben",
        summary: "Keine Ausbildung.",
        resolve: (s) => ({ effects: [now("Keine Lehrwerkstatt.", {}), later(6, "Fachkräfte fehlen, Aufträge bleiben liegen.", { revenuePct: -0.03, opex: rev(s) * 0.005 })] }),
      },
    },
  },

  // -------------------------------------------------------------------------
  // Aufsichtsrat im Konzern
  // -------------------------------------------------------------------------
  {
    id: "k_cyber",
    corporate: true,
    title: "Ein Cyberangriff legt das Werk Bremen lahm",
    motion: "Erpresser haben die Systeme im Werk Bremen verschlüsselt. Der Vorstand will das Lösegeld zahlen, um schnell wieder zu produzieren.",
    pitch: "„Jeder Tag Stillstand kostet uns mehr als das Lösegeld.“",
    context: (s) => `Gefordert sind ${eur(rev(s) * 0.02)}. Ein Tag Stillstand in Bremen kostet etwa ${eur(rev(s) * 0.008)} Umsatz.`,
    lesson: "erwartungswert",
    insight:
      "Lösegeld kauft nur eine Chance, nicht die Daten: Viele Zahler bekommen nicht alles zurück und werden wieder angegriffen. Wer vorher in Sicherungen investiert, muss diese Rechnung nie machen.",
    when: corporate,
    repeatAfter: 30,
    pull: { growth: 0.3, customer: 0.4, control: -0.4, cash: -0.3 },
    pro: [
      { interest: "customer", text: "Die Bahn wartet auf ihre Antriebe." },
      { interest: "growth", text: "Jeder Tag kostet Aufträge." },
    ],
    contra: [
      { interest: "control", text: "Wer zahlt, wird wieder erpresst." },
      { interest: "cash", text: "Niemand garantiert, dass die Daten zurückkommen." },
    ],
    arguments: [
      { id: "pay", text: "Zahlen und schnell weiter produzieren.", toward: "go", appeals: ["customer", "growth"] },
      { id: "rebuild", text: "Nicht zahlen, mit Spezialisten aus den Sicherungen neu aufsetzen.", toward: "conditions", appeals: ["control", "cash"] },
      { id: "police", text: "Nicht zahlen, Behörden einschalten und alles neu aufbauen.", toward: "no", appeals: ["control"] },
    ],
    questions: [{ id: "backup", q: "Wie gut sind die Sicherungen?", a: () => "Die Daten der Produktion sind gesichert, die der Verwaltung nur teilweise." }],
    outcomes: {
      go: {
        label: "Zahlen",
        summary: "Das Lösegeld wird überwiesen.",
        resolve: (s) => ({
          effects: [now("Das Lösegeld ist bezahlt.", { cash: -rev(s) * 0.02 })],
          risk: {
            delay: 1,
            chance: 0.6,
            good: { revenuePct: -0.005 },
            bad: { revenuePct: -0.03, trust: -3 },
            goodText: "Die Schlüssel funktionieren, Bremen läuft nach drei Tagen wieder.",
            badText: "Nur ein Teil der Daten kommt zurück. Zwei Wochen Stillstand.",
          },
        }),
      },
      conditions: {
        label: "Neu aufsetzen mit Spezialisten",
        summary: "Kein Lösegeld, Wiederherstellung aus den Sicherungen.",
        resolve: (s) => ({ effects: [now("Spezialisten setzen die Systeme neu auf.", { cash: -rev(s) * 0.006, revenuePct: -0.012, axes: { management: 3 } })] }),
      },
      no: {
        label: "Behörden und Neuaufbau",
        summary: "Alles neu, ohne Kompromisse.",
        resolve: (s) => ({
          effects: [
            now("Die Ermittler sind im Haus, alles wird neu aufgebaut.", { cash: -rev(s) * 0.01, revenuePct: -0.02 }),
            later(3, "Die neue Technik ist sicherer als je zuvor.", { axes: { product: 3, management: 2 } }),
          ],
        }),
      },
    },
  },
  {
    id: "k_sparte",
    corporate: true,
    title: "Die Kransparte verkaufen?",
    motion: "Ein Finanzinvestor bietet für die Sparte Hafenkräne. Der Vorstand empfiehlt den Verkauf.",
    pitch: "„Kräne sind nicht unser Kern. Mit dem Erlös bauen wir die Antriebe aus.“",
    context: (s) => `Angebot: ${eur(rev(s) * 5)}. Die Sparte macht 8 % des Umsatzes bei einer Marge unter dem Konzernschnitt.`,
    lesson: "kapitalallokation",
    insight: "Konzerne werden oft wertvoller, wenn sie Randbereiche an Besitzer verkaufen, die mehr daraus machen. Entscheidend ist, was mit dem Erlös passiert.",
    when: corporate,
    repeatAfter: 36,
    pull: { cash: 0.5, growth: 0.2, team: -0.6, customer: -0.2 },
    pro: [
      { interest: "cash", text: "Ein fairer Preis für eine schwache Sparte." },
      { interest: "growth", text: "Das Geld fließt in unser Kerngeschäft." },
    ],
    contra: [
      { interest: "team", text: "Achthundert Beschäftigte bekommen einen Finanzinvestor als Chef." },
      { interest: "customer", text: "Viele Häfen kaufen Kräne und Antriebe zusammen." },
    ],
    arguments: [
      { id: "sell", text: "Verkaufen und in den Kern investieren.", toward: "go", appeals: ["cash", "growth"] },
      { id: "jv", text: "Ein Gemeinschaftsunternehmen mit dem Investor, wir behalten 49 %.", toward: "conditions", appeals: ["team", "customer"] },
      { id: "keep", text: "Die Sparte gehört zur Geschichte der Firma.", toward: "no", appeals: ["team", "customer"] },
    ],
    questions: [{ id: "jobs", q: "Was passiert mit den Arbeitsplätzen?", a: () => "Der Investor garantiert drei Jahre lang alle Stellen." }],
    outcomes: {
      go: {
        label: "Verkaufen",
        summary: "Die Sparte geht an den Investor.",
        resolve: (s) => ({
          effects: [
            now("Die Kransparte ist verkauft.", { cash: rev(s) * 5, revenuePct: -0.08, grossMargin: 0.01, morale: -4 }),
            later(6, "Der Erlös stärkt das Antriebsgeschäft.", { growth: 0.002, axes: { product: 3 } }),
          ],
        }),
      },
      conditions: {
        label: "Gemeinschaftsunternehmen",
        summary: "51 % an den Investor, 49 % bleiben.",
        resolve: (s) => ({ effects: [now("Das Gemeinschaftsunternehmen ist gegründet.", { cash: rev(s) * 2.4, revenuePct: -0.04, morale: -1 })] }),
      },
      no: {
        label: "Behalten",
        summary: "Die Sparte bleibt.",
        resolve: () => ({ effects: [now("Die Sparte bleibt im Konzern.", { morale: 2 })] }),
      },
    },
  },
  {
    id: "k_ki",
    corporate: true,
    title: "KI für Verwaltung und Vertrieb",
    motion: "Der Vorstand will ein Programm, das Verwaltung und Angebotswesen mit KI automatisiert. Die Arbeitnehmerseite ist skeptisch.",
    pitch: "„Angebote dauern bei uns drei Wochen. Mit KI drei Tage.“",
    context: (s) => `Kosten: ${eur(rev(s) * 0.004)} im Monat. Versprochen: ${eur(rev(s) * 0.01)} Ersparnis pro Monat nach einem Jahr.`,
    lesson: "opportunitaetskosten",
    insight: "Automatisierung verschiebt Arbeit, bevor sie sie spart. Wer die Belegschaft früh einbindet, bekommt die Ersparnis schneller und mit weniger Widerstand.",
    when: corporate,
    repeatAfter: 24,
    pull: { cash: 0.4, growth: 0.3, team: -0.5 },
    pro: [
      { interest: "growth", text: "Schnellere Angebote gewinnen mehr Aufträge." },
      { interest: "cash", text: "Die Verwaltung ist zu teuer." },
    ],
    contra: [{ interest: "team", text: "Hunderte Stellen in der Verwaltung stehen infrage." }],
    arguments: [
      { id: "all", text: "Jetzt oder nie.", toward: "go", appeals: ["growth", "cash"] },
      { id: "together", text: "Mit dem Betriebsrat: Weiterbildung statt Kündigungen.", toward: "conditions", appeals: ["team", "growth"] },
      { id: "no", text: "Das Risiko für den Betriebsfrieden ist zu groß.", toward: "no", appeals: ["team"] },
    ],
    questions: [{ id: "council", q: "Was sagt der Betriebsrat?", a: () => "Er stimmt zu, wenn niemand gekündigt wird und alle eine Weiterbildung bekommen." }],
    outcomes: {
      go: {
        label: "Volles Programm",
        summary: "Automatisieren, wo es geht.",
        resolve: (s) => ({
          effects: [now("Das KI-Programm startet.", { opex: rev(s) * 0.004, morale: -5 })],
          risk: {
            delay: 5,
            chance: 0.5,
            good: { opex: -rev(s) * 0.012, growth: 0.001 },
            bad: { morale: -4, opex: -rev(s) * 0.003 },
            goodText: "Angebote in drei Tagen, die Verwaltung schrumpft.",
            badText: "Widerstand im Haus, das Programm stockt.",
          },
        }),
      },
      conditions: {
        label: "Mit dem Betriebsrat",
        summary: "Langsamer, aber ohne Kündigungen.",
        resolve: (s) => ({
          effects: [
            now("Programm und Weiterbildung starten.", { opex: rev(s) * 0.005, morale: 2 }),
            later(6, "Die Verwaltung arbeitet schneller, ohne Streit.", { opex: -rev(s) * 0.008 }),
          ],
        }),
      },
      no: {
        label: "Kein Programm",
        summary: "Alles bleibt.",
        resolve: () => ({ effects: [now("Das Programm ist abgelehnt.", { morale: 2 }), later(8, "Voss bietet schneller an und gewinnt Ausschreibungen.", { revenuePct: -0.01 })] }),
      },
    },
  },
];
