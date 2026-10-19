import { burn, clampChance, eur, has, later, now, pct, runway, valueOf, type Template } from "../templates";
import type { Startup } from "../types";

// Mehr Abwechslung für lange Spiele: neue Themen für Startups und eigene
// Vorlagen für Mittelstandsfirmen, die du als Nachfolger führst.

const rev = (s: Startup) => s.metrics.revenue;
const startup = (s: Startup) => !has(s, "mittelstand");
const family = (s: Startup) => has(s, "mittelstand");

export const MORE_TEMPLATES: Template[] = [
  {
    id: "influencer",
    title: "Kampagne mit Influencern",
    motion: "Die Geschäftsführung will einen Monatsverbrauch in eine Kampagne mit bekannten Influencern stecken.",
    pitch: "„Unsere Zielgruppe schaut keine Werbung mehr, sie schaut Creator. Eine große Kampagne und wir sind bekannt.“",
    context: (s) => `Die Kampagne kostet ${eur(Math.max(25_000, burn(s)))}, so viel wie ein Monat Verbrauch. Ob sie wirkt, weiß niemand vorher.`,
    lesson: "unit_economics",
    insight: "Reichweite ist nicht dasselbe wie Kunden. Eine kleine Testkampagne mit gemessenen Kosten pro Kunde zeigt, ob sich die große lohnt.",
    when: (s, age) => startup(s) && age >= 2 && runway(s) > 6,
    pull: { growth: 0.6, customer: 0.3, cash: -0.5, control: -0.2 },
    pro: [
      { interest: "growth", text: "Ohne Bekanntheit wachsen wir nur langsam." },
      { interest: "customer", text: "Die Leute vertrauen Creatorn mehr als Werbung." },
    ],
    contra: [
      { interest: "cash", text: "Ein Monat Reichweite für eine unsichere Wette." },
      { interest: "control", text: "Wir wissen nicht einmal, was uns ein Kunde heute kostet." },
    ],
    arguments: [
      { id: "go_big", text: "Wer zögert, wird übersehen.", toward: "go", appeals: ["growth", "customer"] },
      { id: "test", text: "Erst ein Test mit einem Zehntel des Budgets, dann entscheiden.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "skip", text: "Unser Geld gehört ins Produkt.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [{ id: "cac", q: "Was kostet uns heute ein neuer Kunde?", a: () => "Etwa 180 €. Die Kampagne müsste deutlich darunter liegen, um sich zu lohnen." }],
    outcomes: {
      go: {
        label: "Große Kampagne",
        summary: "Das volle Budget für Influencer.",
        resolve: (s) => ({
          effects: [now("Die Kampagne läuft.", { cash: -Math.max(25_000, burn(s)) })],
          risk: { delay: 2, chance: 0.4, good: { revenuePct: 0.14, growth: 0.012, axes: { market: 6 } }, bad: { revenuePct: 0.02, morale: -3 }, goodText: "Die Kampagne zündet, viele neue Kunden.", badText: "Viele Klicks, kaum Käufe." },
        }),
      },
      conditions: {
        label: "Erst testen",
        summary: "Ein kleiner Test, gemessen an den Kosten pro Kunde.",
        resolve: (s) => ({ effects: [now("Ein kleiner Test läuft.", { cash: -Math.max(3_000, burn(s) * 0.1) }), later(2, "Der Test zeigt, welche Creator sich lohnen.", { revenuePct: 0.04, axes: { market: 3, finance: 2 } })] }),
      },
      no: {
        label: "Keine Kampagne",
        summary: "Das Geld bleibt im Produkt.",
        resolve: () => ({ effects: [now("Keine Kampagne.", { morale: -1 })] }),
      },
    },
  },
  {
    id: "viertagewoche",
    title: "Vier-Tage-Woche?",
    motion: "Das Team schlägt vor, auf eine Vier-Tage-Woche bei gleichem Gehalt umzustellen.",
    pitch: "„Wir finden keine Leute mehr. Mit der Vier-Tage-Woche wären wir der attraktivste Arbeitgeber der Stadt.“",
    context: (s) => `Das Team hat ${s.metrics.team} Leute, die Stimmung liegt bei ${Math.round(s.metrics.morale)} von 100.`,
    lesson: "opportunitaetskosten",
    insight: "Weniger Stunden sind nicht automatisch weniger Arbeit. Entscheidend ist, ob die Arbeit dichter wird oder liegen bleibt. Ein befristeter Versuch mit klaren Zielen beantwortet das.",
    when: (s, age) => startup(s) && age >= 4 && s.metrics.team >= 6,
    pull: { team: 0.8, growth: -0.3, cash: -0.2, control: -0.2 },
    pro: [
      { interest: "team", text: "Wir halten die Guten und finden neue." },
      { interest: "product", text: "Ausgeruhte Leute machen weniger Fehler." },
    ],
    contra: [
      { interest: "growth", text: "Unsere Kunden warten nicht bis Montag." },
      { interest: "control", text: "Was passiert, wenn es nicht funktioniert? Zurück geht nicht." },
    ],
    arguments: [
      { id: "yes", text: "Wer Talente will, muss etwas bieten.", toward: "go", appeals: ["team", "product"] },
      { id: "trial", text: "Ein halbes Jahr Versuch mit klaren Zielen.", toward: "conditions", appeals: ["control", "team"] },
      { id: "no", text: "Erst muss die Firma stabil sein.", toward: "no", appeals: ["growth", "cash"] },
    ],
    questions: [{ id: "others", q: "Wie haben es andere Firmen gemacht?", a: () => "Die meisten mit einem Versuch über sechs Monate. Etwa zwei Drittel sind dabei geblieben." }],
    outcomes: {
      go: {
        label: "Sofort umstellen",
        summary: "Vier Tage, gleiches Gehalt, für alle.",
        resolve: () => ({
          effects: [now("Die Vier-Tage-Woche gilt ab sofort.", { morale: 12 })],
          risk: { delay: 3, chance: 0.55, good: { axes: { management: 4 }, growth: 0.002 }, bad: { growth: -0.008, revenuePct: -0.03 }, goodText: "Das Team ist konzentrierter, Bewerbungen kommen in Massen.", badText: "Projekte verzögern sich, zwei Kunden beschweren sich." },
        }),
      },
      conditions: {
        label: "Versuch mit Zielen",
        summary: "Sechs Monate Versuch, danach Entscheidung nach Zahlen.",
        resolve: () => ({ effects: [now("Der Versuch beginnt, die Ziele sind klar.", { morale: 7 }), later(3, "Der Versuch läuft, das Team hat die Abläufe gestrafft.", { axes: { management: 3 } })] }),
      },
      no: {
        label: "Ablehnen",
        summary: "Fünf Tage wie bisher.",
        resolve: () => ({ effects: [now("Abgelehnt. Im Team grummelt es.", { morale: -7 })] }),
      },
    },
  },
  {
    id: "ausland",
    title: "Expansion nach Österreich und in die Schweiz",
    motion: "Die Geschäftsführung will einen Vertrieb in Wien und Zürich aufbauen.",
    pitch: "„Der Markt dort ist reif, und kein Wettbewerber ist da. Wer zuerst kommt, gewinnt.“",
    context: (s) => `Zwei Vertriebsleute kosten zusammen ${eur(14_000)} im Monat. Die Reichweite liegt bei ${Math.round(runway(s))} Monaten.`,
    lesson: "pmf",
    insight: "Expansion multipliziert, was schon da ist: ein Produkt, das funktioniert, wächst schneller; eines, das wackelt, scheitert in drei Ländern statt in einem.",
    when: (s, age) => startup(s) && age >= 5 && s.metrics.growth > 0.02,
    pull: { growth: 0.7, control: -0.3, cash: -0.5, customer: 0.1 },
    pro: [
      { interest: "growth", text: "Ein doppelt so großer Markt." },
      { interest: "customer", text: "Österreichische Kunden fragen schon nach uns." },
    ],
    contra: [
      { interest: "cash", text: "Zwei Länder gleichzeitig sind teuer." },
      { interest: "control", text: "Wir haben zu Hause noch genug zu tun." },
    ],
    arguments: [
      { id: "both", text: "Jetzt oder nie, bevor andere kommen.", toward: "go", appeals: ["growth", "customer"] },
      { id: "one", text: "Erst Wien, Zürich nur, wenn es dort läuft.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "home", text: "Erst den Heimatmarkt gewinnen.", toward: "no", appeals: ["control", "cash"] },
    ],
    questions: [{ id: "demand", q: "Wie viele Anfragen kommen schon aus dem Ausland?", a: () => "Etwa acht pro Monat, die meisten aus Österreich." }],
    outcomes: {
      go: {
        label: "Beide Länder",
        summary: "Wien und Zürich gleichzeitig.",
        resolve: () => ({
          effects: [now("Der Vertrieb in Wien und Zürich startet.", { opex: 14_000, team: 0 })],
          risk: { delay: 4, chance: 0.45, good: { revenuePct: 0.15, growth: 0.01 }, bad: { revenuePct: 0.03, morale: -4 }, goodText: "Beide Märkte ziehen an.", badText: "Zürich kommt nicht in Gang, Wien nur langsam." },
        }),
      },
      conditions: {
        label: "Erst Wien",
        summary: "Ein Land, dann entscheiden.",
        resolve: () => ({ effects: [now("Der Vertrieb in Wien startet.", { opex: 7_000 }), later(4, "Wien läuft ordentlich an.", { revenuePct: 0.06, growth: 0.004 })] }),
      },
      no: {
        label: "Zu Hause bleiben",
        summary: "Keine Expansion.",
        resolve: () => ({ effects: [now("Keine Expansion. Der Fokus bleibt zu Hause.", { axes: { market: 1 } })] }),
      },
    },
  },
  {
    id: "rahmenvertrag",
    title: "Großkunde will 30 % Rabatt",
    motion: "{customer} bietet einen Dreijahresvertrag an, verlangt dafür aber 30 % Rabatt auf alle Preise.",
    pitch: "„Drei Jahre Planungssicherheit! Das ist mehr wert als jeder Rabatt.“",
    context: (s) => `Der Vertrag würde den Umsatz um etwa ${eur(rev(s) * 0.25)} im Monat erhöhen. Schon heute macht der größte Kunde ${pct(s.metrics.topCustomer)} des Umsatzes.`,
    lesson: "klumpenrisiko",
    insight: "Große Verträge mit kleinen Margen machen abhängig. Wenn ein Kunde zu groß wird, diktiert er die Preise, und eine Kündigung trifft die ganze Firma.",
    when: (s, age) => age >= 3 && s.metrics.revenue >= 15_000,
    repeatAfter: 14,
    pull: { growth: 0.5, customer: 0.5, cash: 0.2, control: -0.5 },
    pro: [
      { interest: "growth", text: "Drei Jahre gesicherter Umsatz." },
      { interest: "customer", text: "{customer} als Referenz öffnet Türen." },
    ],
    contra: [
      { interest: "control", text: "Danach können wir nicht mehr Nein sagen." },
      { interest: "cash", text: "Mit 30 % Rabatt verdienen wir an dem Kunden fast nichts." },
    ],
    arguments: [
      { id: "sign", text: "Sicherheit ist mehr wert als Marge.", toward: "go", appeals: ["growth", "customer"] },
      { id: "counter", text: "Gegenangebot: 15 % Rabatt, dafür nur zwei Jahre.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "decline", text: "Wir verkaufen nicht unter Wert.", toward: "no", appeals: ["control", "cash"] },
    ],
    questions: [{ id: "alt", q: "Wie viele andere Großkunden sind in Sicht?", a: () => "Zwei Gespräche laufen, beide noch unsicher." }],
    outcomes: {
      go: {
        label: "Unterschreiben",
        summary: "30 % Rabatt, drei Jahre Vertrag.",
        resolve: () => ({ effects: [now("Der Rahmenvertrag ist unterschrieben.", { revenuePct: 0.25, grossMargin: -0.06, topCustomer: 0.15, trust: 3 })] }),
      },
      conditions: {
        label: "Nachverhandeln",
        summary: "Weniger Rabatt, kürzere Laufzeit.",
        resolve: () => ({
          effects: [],
          risk: { delay: 1, chance: 0.55, good: { revenuePct: 0.2, grossMargin: -0.025, topCustomer: 0.12 }, bad: { trust: -2 }, goodText: "{customer} akzeptiert das Gegenangebot.", badText: "{customer} lehnt ab und sucht sich einen anderen Anbieter." },
        }),
      },
      no: {
        label: "Ablehnen",
        summary: "Keine Rabatte.",
        resolve: () => ({ effects: [now("Abgelehnt. Die Preise bleiben.", { morale: 1 })] }),
      },
    },
  },
  {
    id: "foerderkredit",
    title: "Förderkredit statt Investoren?",
    motion: "Die Geschäftsführung beantragt einen Förderkredit der KfW über fünf Monatsverbräuche.",
    pitch: "„Billiges Geld vom Staat, keine Anteile abgeben. Warum zögern wir?“",
    context: (s) => `Der Kredit über ${eur(Math.max(50_000, burn(s) * 5))} kostet 4 % Zinsen, die Tilgung beginnt sofort. Die Firma verbraucht ${eur(burn(s))} im Monat.`,
    lesson: "leverage",
    insight: "Schulden kosten keine Anteile, aber jeden Monat Geld, auch in schlechten Monaten. Für Firmen mit sicheren Einnahmen ist ein Kredit günstig, für Firmen ohne Gewinn kann er gefährlich werden.",
    when: (s, age) => startup(s) && age >= 3 && s.metrics.debt === 0 && burn(s) > 0,
    pull: { control: 0.5, cash: 0.4, growth: 0.2, team: 0 },
    pro: [
      { interest: "control", text: "Keine Anteile für neue Investoren." },
      { interest: "cash", text: "Mehr Reichweite zu günstigen Zinsen." },
    ],
    contra: [
      { interest: "cash", text: "Die Rate kommt jeden Monat, egal wie es läuft." },
      { interest: "growth", text: "Ein Kredit macht uns bei der nächsten Runde unattraktiver." },
    ],
    arguments: [
      { id: "take", text: "Billigeres Geld gibt es nicht.", toward: "go", appeals: ["control", "cash"] },
      { id: "half", text: "Die Hälfte, als Puffer, nicht als Treibstoff.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "equity", text: "Ohne Gewinn sind Schulden ein Risiko.", toward: "no", appeals: ["growth", "cash"] },
    ],
    questions: [{ id: "terms", q: "Wann beginnt die Tilgung?", a: () => "Sofort, 4 % des Restbetrags pro Monat." }],
    outcomes: {
      go: {
        label: "Voller Kredit",
        summary: "Fünf Monatsverbräuche als Kredit.",
        resolve: (s) => ({ effects: [now("Der Förderkredit ist ausgezahlt.", { cash: Math.max(50_000, burn(s) * 5), debt: Math.max(50_000, burn(s) * 5), axes: { finance: 2 } })] }),
      },
      conditions: {
        label: "Halber Kredit",
        summary: "Zweieinhalb Monatsverbräuche als Puffer.",
        resolve: (s) => ({ effects: [now("Ein kleinerer Förderkredit ist ausgezahlt.", { cash: Math.max(25_000, burn(s) * 2.5), debt: Math.max(25_000, burn(s) * 2.5), axes: { finance: 3 } })] }),
      },
      no: {
        label: "Kein Kredit",
        summary: "Weiter mit Eigenkapital.",
        resolve: () => ({ effects: [now("Kein Kredit.", {})] }),
      },
    },
  },
  {
    id: "datenpanne",
    title: "Datenpanne: Melden oder nicht?",
    motion: "Durch einen Fehler waren Kundendaten zwei Tage offen im Netz. Die Geschäftsführung will den Vorfall still beheben.",
    pitch: "„Niemand hat es bemerkt. Wenn wir es melden, ist unser Ruf ruiniert.“",
    context: () => "Das Gesetz verlangt eine Meldung innerhalb von 72 Stunden. Fliegt eine verschwiegene Panne auf, wird es teuer.",
    lesson: "governance",
    insight: "Gute Governance zeigt sich in schlechten Momenten. Wer Fehler offen meldet, verliert kurz, aber behält das Vertrauen. Wer vertuscht, setzt die ganze Firma aufs Spiel.",
    when: (s, age) => startup(s) && age >= 4 && (s.sector === "Software für Firmen" || s.sector === "Finanzen" || s.sector === "Gesundheit" || s.sector === "Bildung"),
    pull: { control: 0.4, customer: -0.5, cash: 0.2, product: -0.1 },
    pro: [
      { interest: "control", text: "Wir haben es im Griff, warum Unruhe stiften?" },
      { interest: "cash", text: "Eine Meldung kostet Kunden und Anwälte." },
    ],
    contra: [
      { interest: "customer", text: "Unsere Kunden haben ein Recht darauf." },
      { interest: "product", text: "Wer vertuscht, lernt nichts aus dem Fehler." },
    ],
    arguments: [
      { id: "quiet", text: "Kein Schaden entstanden, kein Grund für Lärm.", toward: "go", appeals: ["control", "cash"] },
      { id: "report", text: "Melden, Kunden informieren, Fehler öffentlich beheben.", toward: "conditions", appeals: ["customer", "product"] },
      { id: "audit", text: "Melden und eine externe Prüfung beauftragen.", toward: "no", appeals: ["customer", "control"] },
    ],
    questions: [{ id: "who", q: "Wer wusste davon?", a: () => "Drei Entwickler und die Geschäftsführung. Einer der Entwickler hat Bedenken geäußert." }],
    outcomes: {
      go: {
        label: "Still beheben",
        summary: "Keine Meldung.",
        resolve: () => ({
          effects: [now("Die Lücke ist still geschlossen.", {})],
          risk: { delay: 3, chance: 0.6, good: {}, bad: { revenuePct: -0.12, trust: -10, cash: -40_000, axes: { product: -6 } }, goodText: "Niemand hat etwas gemerkt. Diesmal.", badText: "Ein Entwickler hat geredet. Bußgeld, Presse, Kündigungen." },
        }),
      },
      conditions: {
        label: "Melden und informieren",
        summary: "Meldung an die Behörde, Brief an alle Kunden.",
        resolve: () => ({ effects: [now("Die Panne ist gemeldet, die Kunden sind informiert.", { revenuePct: -0.02, trust: 4, axes: { product: 2 } })] }),
      },
      no: {
        label: "Melden und prüfen lassen",
        summary: "Meldung plus externe Sicherheitsprüfung.",
        resolve: () => ({ effects: [now("Meldung und externe Prüfung beauftragt.", { cash: -15_000, revenuePct: -0.02, trust: 3, axes: { product: 5 } })] }),
      },
    },
  },

  // -------------------------------------------------------------------------
  // Mittelstand
  // -------------------------------------------------------------------------
  {
    id: "m_preise",
    title: "Preise für Stammkunden erhöhen?",
    motion: "Der Prokurist schlägt vor, die Preise für alle Stammkunden um 8 % zu erhöhen.",
    pitch: "„Unsere Preise sind seit fünf Jahren gleich, die Kosten nicht. Die Kunden bleiben trotzdem.“",
    context: (s) => `Die Rohmarge liegt bei ${pct(s.metrics.grossMargin)}. Viele Kunden sind seit Jahrzehnten dabei.`,
    lesson: "preiselastizitaet",
    insight: "Treue Kunden kaufen nicht wegen des Preises, sondern wegen Verlässlichkeit. Eine angekündigte, begründete Erhöhung kostet weniger Kunden als gedacht; eine plötzliche verärgert.",
    when: (s, age) => family(s) && age >= 2,
    repeatAfter: 18,
    pull: { cash: 0.6, customer: -0.5, control: 0.2, team: 0 },
    pro: [
      { interest: "cash", text: "Jeder Prozentpunkt geht direkt in den Gewinn." },
      { interest: "control", text: "Wir können nicht ewig die Kosten schlucken." },
    ],
    contra: [
      { interest: "customer", text: "Unsere Kunden kommen wegen fairer Preise." },
      { interest: "team", text: "Der Außendienst muss das ausbaden." },
    ],
    arguments: [
      { id: "all", text: "Acht Prozent für alle, ab sofort.", toward: "go", appeals: ["cash", "control"] },
      { id: "staged", text: "Angekündigt, begründet und in zwei Stufen.", toward: "conditions", appeals: ["customer", "cash"] },
      { id: "keep", text: "Wir halten die Preise, die Treue ist mehr wert.", toward: "no", appeals: ["customer", "team"] },
    ],
    questions: [{ id: "competitor", q: "Was verlangt {competitor}?", a: () => "Etwa 10 % mehr als wir." }],
    outcomes: {
      go: {
        label: "Sofort 8 %",
        summary: "Alle Preise steigen ab dem nächsten Monat.",
        resolve: () => ({
          effects: [now("Die Preiserhöhung ist verschickt.", {})],
          risk: { delay: 1, chance: 0.6, good: { revenuePct: 0.06, grossMargin: 0.04 }, bad: { revenuePct: -0.04, grossMargin: 0.03, trust: -3 }, goodText: "Kaum ein Kunde springt ab.", badText: "Einige Stammkunden wechseln zu {competitor}." },
        }),
      },
      conditions: {
        label: "In zwei Stufen",
        summary: "Angekündigt, begründet, verteilt.",
        resolve: () => ({ effects: [now("Die erste Stufe ist angekündigt.", { revenuePct: 0.03, grossMargin: 0.02 }), later(4, "Die zweite Stufe greift.", { revenuePct: 0.02, grossMargin: 0.015 })] }),
      },
      no: {
        label: "Preise halten",
        summary: "Alles bleibt.",
        resolve: () => ({ effects: [now("Die Preise bleiben.", { grossMargin: -0.01 })] }),
      },
    },
  },
  {
    id: "m_geschaeftsfuehrung",
    title: "Wer führt, wenn der Inhaber geht?",
    motion: "Der Inhaber will Ende des Jahres ausscheiden. Zur Wahl stehen der langjährige Prokurist und eine externe Managerin.",
    pitch: "„Mein Prokurist kennt jeden Kunden. Aber vielleicht braucht die Firma frischen Wind.“",
    context: () => "Die externe Managerin kostet 60.000 € mehr im Jahr und hat eine größere Firma digitalisiert. Der Prokurist ist seit 22 Jahren im Haus.",
    lesson: "schluesselpersonen",
    insight: "Nachfolge ist die gefährlichste Phase eines Familienunternehmens. Kontinuität hält Kunden und Mitarbeiter, frischer Wind bringt Wachstum. Eine Übergabe mit beiden verbindet das, kostet aber Geduld.",
    when: (s, age) => family(s) && age >= 3,
    pull: { team: 0.4, customer: 0.3, growth: -0.4, control: 0.2 },
    pro: [
      { interest: "team", text: "Die Belegschaft vertraut dem Prokuristen." },
      { interest: "customer", text: "Die Kunden kennen ihn seit Jahrzehnten." },
    ],
    contra: [
      { interest: "growth", text: "Mit ihm bleibt alles, wie es ist, auch das Schlechte." },
      { interest: "product", text: "Die Firma ist digital zwanzig Jahre zurück." },
    ],
    arguments: [
      { id: "inside", text: "Kontinuität schlägt Experimente.", toward: "go", appeals: ["team", "customer"] },
      { id: "tandem", text: "Beide: die Managerin als Chefin, der Prokurist für die Kunden.", toward: "conditions", appeals: ["growth", "team"] },
      { id: "outside", text: "Nur frischer Wind bringt die Firma voran.", toward: "no", appeals: ["growth", "product"] },
    ],
    questions: [{ id: "mood", q: "Was sagt die Belegschaft?", a: () => "Sie mag den Prokuristen, hat aber Angst, dass die Firma den Anschluss verliert." }],
    outcomes: {
      go: {
        label: "Der Prokurist",
        summary: "Interne Nachfolge.",
        resolve: () => ({ effects: [now("Der Prokurist übernimmt.", { morale: 6, trust: 4, axes: { management: 2 } }), later(6, "Alles läuft weiter wie bisher, im Guten wie im Schlechten.", { growth: -0.002 })] }),
      },
      conditions: {
        label: "Als Tandem",
        summary: "Externe Chefin, interner Kundenmann.",
        resolve: () => ({
          effects: [now("Das Tandem startet.", { opex: 7_500 })],
          risk: { delay: 4, chance: 0.6, good: { growth: 0.006, axes: { management: 8, product: 5 } }, bad: { morale: -6, axes: { management: -3 } }, goodText: "Das Tandem harmoniert. Die Firma modernisiert sich.", badText: "Die beiden kommen nicht miteinander klar." },
        }),
      },
      no: {
        label: "Die Managerin",
        summary: "Externe Nachfolge.",
        resolve: () => ({
          effects: [now("Die externe Managerin übernimmt.", { opex: 5_000, morale: -6 })],
          risk: { delay: 4, chance: 0.5, good: { growth: 0.008, axes: { management: 10, product: 6 } }, bad: { revenuePct: -0.05, morale: -5 }, goodText: "Die Managerin bringt die Firma auf Kurs.", badText: "Zwei wichtige Kunden gehen mit dem Prokuristen." },
        }),
      },
    },
  },
  {
    id: "m_onlineshop",
    title: "Ein Online-Shop für die Firma",
    motion: "Die Geschäftsführung will einen Online-Shop und digitale Bestellungen für alle Kunden einführen.",
    pitch: "„Jüngere Kunden bestellen nicht mehr per Telefon. Wer das verschläft, verliert die nächste Generation.“",
    context: (s) => `Die Einführung kostet ${eur(rev(s) * 0.35)} und bindet ein halbes Jahr lang zwei Leute.`,
    lesson: "opportunitaetskosten",
    insight: "Digitalisierung kostet nicht nur Geld, sondern Aufmerksamkeit. Ein klar begrenztes erstes Ziel hilft mehr als ein großes Programm.",
    when: (s, age) => family(s) && age >= 2,
    pull: { growth: 0.5, product: 0.4, cash: -0.4, team: -0.2 },
    pro: [
      { interest: "growth", text: "Neue Kunden, die uns heute nicht finden." },
      { interest: "product", text: "Bestellungen ohne Telefonzettel, weniger Fehler." },
    ],
    contra: [
      { interest: "cash", text: "Viel Geld für ungewissen Nutzen." },
      { interest: "team", text: "Die Leute haben ohnehin genug zu tun." },
    ],
    arguments: [
      { id: "full", text: "Ganz oder gar nicht.", toward: "go", appeals: ["growth", "product"] },
      { id: "step", text: "Erst digitale Bestellungen für Stammkunden, der Shop später.", toward: "conditions", appeals: ["cash", "team"] },
      { id: "wait", text: "Unsere Kunden wollen uns am Telefon.", toward: "no", appeals: ["team", "cash"] },
    ],
    questions: [{ id: "share", q: "Wie viele Kunden bestellen schon per E-Mail?", a: () => "Etwa ein Drittel, Tendenz steigend." }],
    outcomes: {
      go: {
        label: "Volles Programm",
        summary: "Shop und digitale Bestellungen.",
        resolve: (s) => ({
          effects: [now("Das Digitalprojekt startet.", { cash: -rev(s) * 0.35 })],
          risk: { delay: 5, chance: 0.55, good: { revenuePct: 0.08, growth: 0.005, axes: { product: 8 } }, bad: { revenuePct: 0.01, morale: -3 }, goodText: "Der Shop bringt neue Kunden und spart Arbeit.", badText: "Der Shop läuft, aber kaum einer nutzt ihn." },
        }),
      },
      conditions: {
        label: "Schritt für Schritt",
        summary: "Erst digitale Bestellungen für Stammkunden.",
        resolve: (s) => ({ effects: [now("Digitale Bestellungen starten.", { cash: -rev(s) * 0.12 }), later(4, "Die Stammkunden bestellen digital, die Fehler werden weniger.", { revenuePct: 0.03, grossMargin: 0.01, axes: { product: 4 } })] }),
      },
      no: {
        label: "Abwarten",
        summary: "Alles bleibt analog.",
        resolve: () => ({ effects: [now("Abgelehnt.", {}), later(8, "Junge Kunden wandern ab.", { revenuePct: -0.03, growth: -0.002 })] }),
      },
    },
  },
  {
    id: "m_zukauf",
    title: "Den kleinen Wettbewerber kaufen",
    motion: "Ein kleiner Wettbewerber aus der Region steht zum Verkauf. Die Geschäftsführung will ihn übernehmen.",
    pitch: "„Gleiche Kunden, gleiche Produkte, aber ohne Nachfolger. Wir bekommen ihn günstig.“",
    context: (s) => `Kaufpreis ${eur(rev(s) * 2.5)}, er macht ${eur(rev(s) * 0.3)} Umsatz im Monat. In der Kasse liegen ${eur(s.metrics.cash)}.`,
    lesson: "kapitalallokation",
    insight: "Zukäufe in der eigenen Nische (Buy and Build) sind ein bewährter Weg, Mittelstandsfirmen wertvoller zu machen. Größere Firmen werden zu höheren Vielfachen bewertet, wenn die Integration gelingt.",
    when: (s, age) => family(s) && age >= 4 && s.metrics.cash > rev(s) * 1.5,
    pull: { growth: 0.6, control: 0.3, cash: -0.5, team: -0.2 },
    pro: [
      { interest: "growth", text: "Ein Drittel mehr Umsatz auf einen Schlag." },
      { interest: "control", text: "Wenn wir nicht kaufen, kauft {competitor}." },
    ],
    contra: [
      { interest: "cash", text: "Unsere Reserve ist danach weg." },
      { interest: "team", text: "Zwei Belegschaften zusammenzuführen, ist harte Arbeit." },
    ],
    arguments: [
      { id: "buy", text: "So günstig wird es nie wieder.", toward: "go", appeals: ["growth", "control"] },
      { id: "loan", text: "Kaufen, aber die Hälfte über die Hausbank finanzieren.", toward: "conditions", appeals: ["cash", "growth"] },
      { id: "pass", text: "Wir sollten erst das eigene Haus ordnen.", toward: "no", appeals: ["team", "cash"] },
    ],
    questions: [{ id: "people", q: "Bleiben die Mitarbeiter des Wettbewerbers?", a: () => "Die meisten ja, der Meister ist aber 63." }],
    outcomes: {
      go: {
        label: "Aus eigener Kasse",
        summary: "Kaufen, bar bezahlt.",
        resolve: (s) => ({
          effects: [now("Der Wettbewerber gehört jetzt dazu.", { cash: -rev(s) * 2.5, opex: rev(s) * 0.22, team: 0 })],
          risk: { delay: 3, chance: 0.6, good: { revenuePct: 0.32, topCustomer: -0.03 }, bad: { revenuePct: 0.2, morale: -6 }, goodText: "Die Integration gelingt, Kunden bleiben.", badText: "Ein Teil der Kunden geht zu {competitor}." },
        }),
      },
      conditions: {
        label: "Mit Bankkredit",
        summary: "Halb aus der Kasse, halb über die Bank.",
        resolve: (s) => ({
          effects: [now("Der Wettbewerber ist gekauft, die Hälfte finanziert die Bank.", { cash: -rev(s) * 1.25, debt: rev(s) * 1.25, opex: rev(s) * 0.22 })],
          risk: { delay: 3, chance: 0.6, good: { revenuePct: 0.32, topCustomer: -0.03 }, bad: { revenuePct: 0.2, morale: -6 }, goodText: "Die Integration gelingt, Kunden bleiben.", badText: "Ein Teil der Kunden geht zu {competitor}." },
        }),
      },
      no: {
        label: "Nicht kaufen",
        summary: "Der Wettbewerber geht an jemand anderen.",
        resolve: () => ({ effects: [now("{competitor} kauft den Wettbewerber.", { axes: { market: -3 } })] }),
      },
    },
  },
  {
    id: "m_halle",
    title: "Eigene Halle bauen oder mieten?",
    motion: "Die Firma platzt aus allen Nähten. Die Geschäftsführung will eine eigene Halle bauen.",
    pitch: "„Miete ist rausgeworfenes Geld. Mit einer eigenen Halle gehört uns etwas.“",
    context: (s) => `Bau: ${eur(rev(s) * 1.5)}, finanziert über die Bank. Miete einer gleich großen Halle: ${eur(rev(s) * 0.04)} im Monat. Der Firmenwert liegt bei ${eur(valueOf(s))}.`,
    lesson: "fixkosten",
    insight: "Eigentum bindet Kapital, Miete hält flexibel. Für eine Firma, deren Zukunft unsicher ist, ist Flexibilität oft mehr wert als die gesparte Miete.",
    when: (s, age) => family(s) && age >= 5,
    pull: { control: 0.6, cash: -0.4, growth: 0.2, team: 0.2 },
    pro: [
      { interest: "control", text: "Kein Vermieter kann uns rauswerfen." },
      { interest: "team", text: "Endlich vernünftige Arbeitsplätze." },
    ],
    contra: [
      { interest: "cash", text: "Ein großer Kredit für Beton, nicht fürs Geschäft." },
      { interest: "growth", text: "Was, wenn wir in fünf Jahren eine andere Halle brauchen?" },
    ],
    arguments: [
      { id: "build", text: "Eigentum schlägt Miete auf lange Sicht.", toward: "go", appeals: ["control", "team"] },
      { id: "rent", text: "Mieten, mit Option auf späteren Kauf.", toward: "conditions", appeals: ["cash", "growth"] },
      { id: "squeeze", text: "Erst die Abläufe verbessern, dann über Platz reden.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [{ id: "rates", q: "Welchen Zins bietet die Bank?", a: () => "Etwa 5 %, mit 15 Jahren Laufzeit." }],
    outcomes: {
      go: {
        label: "Bauen",
        summary: "Eigene Halle, über die Bank finanziert.",
        resolve: (s) => ({ effects: [now("Der Bau beginnt.", { debt: rev(s) * 1.5, morale: 4 }), later(6, "Die neue Halle ist bezogen.", { revenuePct: 0.05, morale: 4 })] }),
      },
      conditions: {
        label: "Mieten",
        summary: "Halle mieten, Kaufoption sichern.",
        resolve: (s) => ({ effects: [now("Die Halle ist gemietet.", { opex: rev(s) * 0.04, morale: 3 }), later(2, "Mehr Platz, mehr Aufträge.", { revenuePct: 0.05 })] }),
      },
      no: {
        label: "Abläufe verbessern",
        summary: "Kein neuer Platz.",
        resolve: () => ({
          effects: [],
          risk: { delay: 3, chance: clampChance(0.45), good: { grossMargin: 0.02, axes: { management: 4 } }, bad: { morale: -6, revenuePct: -0.02 }, goodText: "Bessere Abläufe schaffen Platz.", badText: "Es bleibt eng, Aufträge gehen verloren." },
        }),
      },
    },
  },
];
