import { axis, clampChance, eur, has, later, months, now, runway, type Template } from "../templates";

// Vorlagen rund um Menschen, Organisation, Produkt und Risiko.

export const PEOPLE_TEMPLATES: Template[] = [
  {
    id: "cto_leaves",
    title: "{cto} will gehen",
    motion: "Die Geschäftsführung beantragt, {cto} mit 3 % zusätzlichem Anteil zum Bleiben zu bewegen.",
    pitch: "„{cto} hat ein Angebot von {competitor}. Ohne {cto} versteht niemand mehr unseren Code. Wir müssen etwas tun.“",
    context: () => "Neue Anteile für {cto} verwässern alle bisherigen Gesellschafter, auch dich.",
    lesson: "schluesselpersonen",
    insight:
      "Wenn eine Person das ganze Wissen trägt, ist das ein Risiko für die Firma. Halten ist oft richtig, aber erst danach beginnt die eigentliche Arbeit: Wissen verteilen.",
    when: (s, age) => age >= 3 && !has(s, "cto"),
    pull: { team: 0.6, product: 0.7, control: -0.4, cash: -0.2 },
    pro: [
      { interest: "product", text: "Ohne {cto} steht die Entwicklung für Monate still." },
      { interest: "team", text: "Wenn {cto} geht, folgen andere." },
    ],
    contra: [
      { interest: "control", text: "Wer mit Kündigung droht, bekommt Anteile? Das spricht sich rum." },
      { interest: "cash", text: "3 % Verwässerung für eine Person, die vielleicht trotzdem in einem Jahr geht." },
    ],
    arguments: [
      { id: "keep", text: "Das Wissen in einem Kopf ist unser größtes Risiko. Halten, sofort.", toward: "go", appeals: ["product", "team"] },
      { id: "handover", text: "Ein Interims-CTO und eine saubere Übergabe machen uns unabhängiger.", toward: "conditions", appeals: ["control", "product"] },
      { id: "let", text: "Niemand ist unersetzlich. Wir lassen uns nicht erpressen.", toward: "no", appeals: ["control", "cash"] },
    ],
    questions: [
      { id: "why", q: "Warum will {cto} wirklich gehen?", a: () => "Mehr Geld, aber vor allem: zu viele Nachtschichten und wenig Mitsprache." },
      { id: "docs", q: "Wie gut ist der Code dokumentiert?", a: () => "Kaum. Zwei Entwickler sind seit weniger als sechs Monaten dabei." },
    ],
    outcomes: {
      go: {
        label: "Gegenangebot mit 3 % Anteil",
        summary: "{cto} bleibt, alle anderen werden um 3 % verwässert.",
        resolve: () => ({ effects: [now("{cto} bleibt und bekommt 3 % Anteil.", { dilution: 0.03, dilutionTo: { id: "cto_shares", name: "{cto} (Halteprämie)", kind: "cofounder" }, morale: 6, axes: { product: 2 }, flag: "cto" })] }),
      },
      conditions: {
        label: "Interims-CTO und Übergabe",
        summary: "{cto} geht geordnet, ein erfahrener Interims-CTO kommt.",
        resolve: () => ({
          effects: [
            now("Ein Interims-CTO übernimmt.", { opex: 7_000, axes: { product: -6 }, flag: "cto" }),
            later(2, "Das Wissen ist jetzt auf mehrere Köpfe verteilt.", { axes: { product: 4, management: 3 } }),
          ],
        }),
      },
      no: {
        label: "Ziehen lassen",
        summary: "{cto} geht zu {competitor}.",
        resolve: () => ({
          effects: [
            now("{cto} geht. Die Entwicklung stockt.", { axes: { product: -14 }, morale: -10, flag: "cto" }),
            later(1, "Neue Funktionen verzögern sich.", { growth: -0.01 }),
          ],
        }),
      },
    },
  },

  {
    id: "esop",
    title: "Mitarbeiterbeteiligung einführen?",
    motion: "Die Geschäftsführung beantragt einen Mitarbeiter-Optionspool von 8 % der Firma.",
    pitch: "„Gute Leute bekommen woanders mehr Gehalt. Wir können nur mit Anteilen mithalten.“",
    context: () => "Ein Optionspool bindet Mitarbeiter, ohne die Kasse zu belasten. Er verwässert aber alle Gesellschafter.",
    lesson: "esop",
    insight:
      "Mitarbeiterbeteiligung ist billig für die Kasse und teuer für die Gesellschafter. Sie wirkt am besten, wenn sie über mehrere Jahre verteilt wird und an Leistung geknüpft ist.",
    when: (s, age) => age >= 3 && s.metrics.team >= 5 && !has(s, "esop"),
    pull: { team: 0.8, control: -0.5, cash: 0.2, product: 0.2 },
    pro: [
      { interest: "team", text: "Wer mitbesitzt, denkt mit. Und bleibt." },
      { interest: "cash", text: "Anteile statt Gehaltserhöhungen schonen die Kasse." },
    ],
    contra: [
      { interest: "control", text: "8 % sind viel. Das zahlen wir alle." },
      { interest: "cash", text: "Optionen motivieren nur, wenn die Leute an einen Verkauf glauben." },
    ],
    arguments: [
      { id: "own", text: "Wer mitbesitzt, bleibt. Das ist günstiger als jede Fluktuation.", toward: "go", appeals: ["team", "product"] },
      { id: "key", text: "4 % für Schlüsselpersonen, verteilt über vier Jahre.", toward: "conditions", appeals: ["control", "team"] },
      { id: "salary", text: "Lieber faire Gehälter als Papier, das nie etwas wert wird.", toward: "no", appeals: ["control", "cash"] },
    ],
    questions: [
      { id: "market", q: "Was zahlen andere Startups?", a: () => "Übliche Pools liegen zwischen 5 und 15 %, verteilt über vier Jahre." },
      { id: "risk", q: "Wer könnte als Nächstes gehen?", a: () => "Zwei Entwickler haben Angebote. Beide sind für das Produkt wichtig." },
    ],
    outcomes: {
      go: {
        label: "8 % Optionspool",
        summary: "Alle Mitarbeiter bekommen Optionen.",
        resolve: () => ({ effects: [now("Optionspool eingeführt: 8 % Verwässerung.", { dilution: 0.08, dilutionTo: { id: "esop", name: "Mitarbeiterpool", kind: "esop" }, morale: 14, axes: { management: 4 }, flag: "esop" })] }),
      },
      conditions: {
        label: "4 % für Schlüsselpersonen",
        summary: "Kleiner Pool, gezielt vergeben.",
        resolve: () => ({ effects: [now("Kleiner Optionspool: 4 % Verwässerung.", { dilution: 0.04, dilutionTo: { id: "esop", name: "Mitarbeiterpool", kind: "esop" }, morale: 6, flag: "esop" })] }),
      },
      no: {
        label: "Kein Optionspool",
        summary: "Keine Beteiligung.",
        resolve: () => ({
          effects: [now("Kein Optionspool.", { flag: "esop" }), later(2, "Die Stimmung leidet.", { morale: -6 })],
          risk: {
            delay: 2,
            chance: 0.6,
            good: {},
            bad: { axes: { product: -5 }, team: -1 },
            goodText: "Das Team bleibt trotzdem zusammen.",
            badText: "Ein wichtiger Entwickler kündigt.",
          },
        }),
      },
    },
  },

  {
    id: "founder_salary",
    title: "{ceo} will mehr Gehalt",
    motion: "{ceo} beantragt, das eigene Gehalt von 3.000 € auf 6.000 € im Monat zu erhöhen.",
    pitch: "„Ich arbeite seit drei Jahren für ein halbes Gehalt. Ich kann so meine Miete nicht mehr zahlen.“",
    context: (s) => `Die Firma verbraucht heute ${eur(Math.max(0, -1 * (s.metrics.revenue * s.metrics.grossMargin - s.metrics.opex)))} im Monat. Das Geld reicht ${months(runway(s))}.`,
    lesson: "governance",
    insight:
      "Gründergehälter sind ein Signal: zu hoch wirkt gierig, zu niedrig macht Gründer erpressbar und müde. Der Beirat entscheidet über die Geschäftsführung, nicht die Geschäftsführung über sich selbst.",
    when: (s, age) => age >= 4 && !has(s, "salary"),
    pull: { control: -0.2, cash: -0.5, team: 0.3 },
    pro: [
      { interest: "team", text: "Eine Gründerin mit Geldsorgen trifft schlechte Entscheidungen." },
      { interest: "control", text: "Wir wollen, dass sie bleibt. Dann müssen wir sie anständig bezahlen." },
    ],
    contra: [
      { interest: "cash", text: "3.000 € mehr im Monat sind Reichweite, die wir nicht haben." },
      { interest: "control", text: "Gehalt sollte an Meilensteine geknüpft sein." },
    ],
    arguments: [
      { id: "fair", text: "Eine Gründerin mit Geldsorgen ist ein Risiko für alle.", toward: "go", appeals: ["team", "control"] },
      { id: "bonus", text: "4.500 € jetzt, Rest als Bonus bei einem klaren Meilenstein.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "later", text: "Erst wenn die Firma Geld verdient.", toward: "no", appeals: ["cash"] },
    ],
    questions: [{ id: "market", q: "Was verdienen Gründer in vergleichbaren Firmen?", a: () => "In dieser Phase meist 4.000 bis 6.000 € im Monat." }],
    outcomes: {
      go: {
        label: "6.000 € im Monat",
        summary: "Volle Erhöhung.",
        resolve: () => ({ effects: [now("Gehalt erhöht.", { opex: 3_000, trust: 8, flag: "salary" })] }),
      },
      conditions: {
        label: "4.500 € plus Bonus bei Meilenstein",
        summary: "Halbe Erhöhung, Rest an Erfolg geknüpft.",
        resolve: () => ({ effects: [now("Gehalt teilweise erhöht, Bonus vereinbart.", { opex: 1_500, trust: 4, flag: "salary" })] }),
      },
      no: {
        label: "Keine Erhöhung",
        summary: "Alles bleibt.",
        resolve: () => ({ effects: [now("Keine Erhöhung. {ceo} ist enttäuscht.", { trust: -10, morale: -3, flag: "salary" })] }),
      },
    },
  },

  {
    id: "hire_cfo",
    title: "Eine erfahrene Finanzchefin einstellen?",
    motion: "Die Geschäftsführung beantragt, eine Vollzeit-Finanzchefin für 9.000 € im Monat einzustellen.",
    pitch: "„Ich mache die Zahlen nachts nebenbei. Für die nächste Finanzierungsrunde brauchen wir jemanden, der das kann.“",
    context: (s) => `Die Finanzstärke der Firma liegt bei ${axis(s, "finance")} von 100. Investoren schauen genau auf Zahlen und Planung.`,
    lesson: "governance",
    insight:
      "Gute Finanzarbeit macht eine Firma nicht schneller, aber berechenbarer. Investoren zahlen für Berechenbarkeit: bessere Zahlen, bessere Bewertung.",
    when: (s, age) => age >= 3 && s.metrics.team >= 6 && !has(s, "cfo"),
    pull: { control: 0.6, cash: -0.3, growth: 0.1, team: 0.2 },
    pro: [
      { interest: "control", text: "Ohne saubere Zahlen steuern wir blind." },
      { interest: "growth", text: "Investoren wollen eine Finanzplanung sehen." },
    ],
    contra: [
      { interest: "cash", text: "9.000 € im Monat für jemanden, der keinen Umsatz macht." },
      { interest: "growth", text: "Wir sind noch zu klein für eine Vollzeit-Finanzchefin." },
    ],
    arguments: [
      { id: "control", text: "Ohne verlässliche Zahlen entscheidet dieser Beirat im Nebel.", toward: "go", appeals: ["control", "growth"] },
      { id: "part", text: "Eine erfahrene Teilzeit-CFO für zwei Tage pro Woche reicht jetzt.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "wait", text: "Das kommt nach der nächsten Runde.", toward: "no", appeals: ["cash"] },
    ],
    questions: [{ id: "state", q: "Wie gut ist die Buchhaltung heute?", a: () => "Ein Steuerbüro bucht mit drei Monaten Verzug. Eine Planung gibt es nur als Tabelle der Gründerin." }],
    outcomes: {
      go: {
        label: "Vollzeit-Finanzchefin",
        summary: "9.000 € im Monat, deutlich bessere Zahlen.",
        resolve: () => ({ effects: [now("Finanzchefin eingestellt.", { opex: 9_000, axes: { finance: 18, management: 4 }, flag: "cfo" })] }),
      },
      conditions: {
        label: "Teilzeit-CFO",
        summary: "Zwei Tage pro Woche, 4.000 € im Monat.",
        resolve: () => ({ effects: [now("Teilzeit-CFO gestartet.", { opex: 4_000, axes: { finance: 10 }, flag: "cfo" })] }),
      },
      no: {
        label: "Keine Einstellung",
        summary: "Die Gründerin macht es weiter selbst.",
        resolve: () => ({ effects: [later(3, "Die Zahlen bleiben lückenhaft.", { axes: { finance: -3 }, flag: "cfo" })] }),
      },
    },
  },

  {
    id: "office",
    title: "Ein großes Büro in der Innenstadt?",
    motion: "Die Geschäftsführung beantragt, ein großes Büro in der Innenstadt anzumieten.",
    pitch: "„Wir sitzen zu acht in zwei Räumen. Ein schönes Büro hilft beim Einstellen und beeindruckt Kunden.“",
    context: () => "Ein großes Büro kostet 6.000 € mehr im Monat und 20.000 € Kaution.",
    lesson: "fixkosten",
    insight:
      "Ein Büro ist ein Fixkostenblock für Jahre. Es hilft der Stimmung, verdient aber kein Geld. Bei knapper Reichweite ist Flexibilität mehr wert als Glanz.",
    when: (s, age) => age >= 3 && s.metrics.team >= 6 && !has(s, "office"),
    pull: { team: 0.5, cash: -0.6, customer: 0.1, growth: 0.1 },
    pro: [
      { interest: "team", text: "Die Leute sitzen übereinander. Das kostet Produktivität." },
      { interest: "customer", text: "Kunden wollen sehen, dass wir ernst zu nehmen sind." },
    ],
    contra: [
      { interest: "cash", text: "Ein Mietvertrag über fünf Jahre bei unserer Reichweite?" },
      { interest: "control", text: "Glanz zieht die falschen Bewerber an." },
    ],
    arguments: [
      { id: "people", text: "Gute Leute kommen nur, wenn sie gut arbeiten können.", toward: "go", appeals: ["team", "customer"] },
      { id: "small", text: "Kleineres Büro, flexibler Vertrag, zwei Tage Homeoffice.", toward: "conditions", appeals: ["cash", "team"] },
      { id: "no", text: "Erst Geld verdienen, dann Geld ausgeben.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [{ id: "contract", q: "Wie lange läuft der Mietvertrag?", a: () => "Fünf Jahre fest, keine vorzeitige Kündigung." }],
    outcomes: {
      go: {
        label: "Großes Büro",
        summary: "Mehr Platz, mehr Kosten.",
        resolve: () => ({ effects: [now("Großes Büro gemietet.", { cash: -20_000, opex: 6_000, morale: 10, flag: "office" })] }),
      },
      conditions: {
        label: "Kleineres Büro, flexibler Vertrag",
        summary: "Etwas mehr Platz bei überschaubaren Kosten.",
        resolve: () => ({ effects: [now("Kleineres Büro mit flexiblem Vertrag.", { opex: 2_500, morale: 5, flag: "office" })] }),
      },
      no: {
        label: "Kein Umzug",
        summary: "Alles bleibt eng.",
        resolve: () => ({ effects: [now("Kein Umzug.", { morale: -3, flag: "office" })] }),
      },
    },
  },

  {
    id: "feature",
    title: "Neue Funktion oder erst Stabilität?",
    motion: "Die Geschäftsführung beantragt, die nächste große Funktion sofort zu bauen und Stabilitätsarbeiten zu verschieben.",
    pitch: "„Unser größter Interessent unterschreibt nur mit dieser Funktion. Die Ausfälle beheben wir danach.“",
    context: (s) => `Die Produktqualität liegt bei ${axis(s, "product")} von 100. In den letzten Wochen gab es zwei längere Ausfälle.`,
    lesson: "opportunitaetskosten",
    insight:
      "Technische Schulden sind wie ein Kredit: Sie machen heute schneller und kosten später Zinsen in Form von Ausfällen. Wer nie tilgt, wird irgendwann von ihnen eingeholt.",
    when: (s, age) => age >= 2 && !has(s, "feature"),
    pull: { growth: 0.4, customer: 0.2, product: -0.4, team: -0.2 },
    pro: [
      { interest: "growth", text: "Die Funktion bringt einen großen Kunden. Das ist konkreter Umsatz." },
      { interest: "customer", text: "Kunden kaufen Funktionen, nicht Stabilität." },
    ],
    contra: [
      { interest: "product", text: "Noch ein Ausfall, und wir verlieren Bestandskunden." },
      { interest: "team", text: "Das Team löscht seit Wochen Brände. Noch mehr Druck hält es nicht aus." },
    ],
    arguments: [
      { id: "deal", text: "Der Kunde ist konkret. Die Ausfälle sind hypothetisch.", toward: "go", appeals: ["growth", "customer"] },
      { id: "both", text: "Sechs Wochen Stabilität, dann die Funktion. Der Kunde wartet so lange.", toward: "conditions", appeals: ["product", "customer"] },
      { id: "stable", text: "Ein Produkt, das ausfällt, verkauft sich nicht. Erst Stabilität.", toward: "no", appeals: ["product", "team"] },
    ],
    questions: [
      { id: "customer", q: "Würde der Kunde sechs Wochen warten?", a: () => "Vermutlich ja, wenn wir ein festes Datum zusagen." },
      { id: "outages", q: "Wie schlimm waren die Ausfälle?", a: () => "Zweimal je vier Stunden. Drei Kunden haben sich beschwert, einer hat gekündigt." },
    ],
    outcomes: {
      go: {
        label: "Funktion zuerst",
        summary: "Neue Funktion sofort, Stabilität danach.",
        resolve: (s) => ({
          effects: [now("Das Team baut die neue Funktion.", { flag: "feature" }), later(2, "Der Großkunde unterschreibt.", { revenuePct: 0.06 })],
          risk: {
            delay: 2,
            chance: clampChance(0.35 + (axis(s, "product") - 50) / 150),
            good: { axes: { edge: 6 } },
            bad: { morale: -6, revenuePct: -0.06, axes: { product: -5 } },
            goodText: "Die Funktion läuft stabil und hebt das Produkt von der Konkurrenz ab.",
            badText: "Ein großer Ausfall kostet Kunden und Nerven.",
          },
        }),
      },
      conditions: {
        label: "Erst sechs Wochen Stabilität",
        summary: "Stabilität, dann Funktion mit festem Datum.",
        resolve: () => ({
          effects: [
            now("Stabilitätsphase gestartet.", { flag: "feature" }),
            later(1, "Das Produkt läuft stabiler.", { axes: { product: 5 } }),
            later(3, "Die Funktion ist da, der Kunde unterschreibt.", { revenuePct: 0.04 }),
          ],
        }),
      },
      no: {
        label: "Nur Stabilität",
        summary: "Die Funktion wird verschoben.",
        resolve: () => ({
          effects: [now("Volle Konzentration auf Stabilität.", { axes: { product: 6 }, flag: "feature" }), later(2, "Der Interessent springt ab.", { growth: -0.005 })],
        }),
      },
    },
  },

  {
    id: "privacy",
    title: "Datenschutz-Audit vor dem großen Start?",
    motion: "Die Geschäftsführung beantragt, auf ein externes Datenschutz-Audit zu verzichten, um den Start nicht zu verzögern.",
    pitch: "„Ein Audit kostet 25.000 € und sechs Wochen. Wir sind sorgfältig. Das brauchen wir nicht.“",
    context: () => "Die Firma verarbeitet personenbezogene Daten ihrer Kunden. Ein Verstoß kann Bußgelder und Vertrauensverlust bringen.",
    lesson: "erwartungswert",
    insight:
      "Ein seltenes, aber teures Risiko rechnet man mit dem Erwartungswert: Wahrscheinlichkeit mal Schaden. 40 % Risiko für 60.000 € sind im Schnitt 24.000 € – fast genau der Preis des Audits, aber ohne die Ruhe.",
    when: (s, age) => age >= 2 && !has(s, "audit"),
    pull: { growth: 0.4, cash: 0.3, control: -0.6, product: -0.2 },
    pro: [
      { interest: "growth", text: "Sechs Wochen Verzögerung kosten uns den Saisonstart." },
      { interest: "cash", text: "25.000 € für ein Papier, das uns sagt, was wir schon wissen?" },
    ],
    contra: [
      { interest: "control", text: "Ein Datenschutzvorfall kann uns die Firma kosten." },
      { interest: "customer", text: "Firmenkunden fragen nach Zertifikaten. Ohne Audit verlieren wir sie." },
    ],
    arguments: [
      { id: "speed", text: "Tempo ist jetzt unser wichtigster Vorteil.", toward: "go", appeals: ["growth", "cash"] },
      { id: "basic", text: "Ein Basis-Check für 6.000 € deckt das Wichtigste ab.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "audit", text: "Der erwartete Schaden ist so hoch wie das Audit. Ich nehme lieber die Sicherheit.", toward: "no", appeals: ["control", "customer"] },
    ],
    questions: [{ id: "data", q: "Welche Daten verarbeiten wir?", a: () => "Namen, Adressen, Bewegungsdaten und Zahlungsdaten." }],
    outcomes: {
      go: {
        label: "Ohne Audit starten",
        summary: "Kein Audit, voller Start.",
        resolve: () => ({
          effects: [now("Start ohne Audit.", { growth: 0.004, flag: "audit" })],
          risk: {
            delay: 3,
            chance: 0.6,
            good: {},
            bad: { cash: -60_000, axes: { market: -6 }, morale: -5 },
            goodText: "Kein Vorfall. Glück gehabt.",
            badText: "Datenpanne: Bußgeld, Kundenbriefe, schlechte Presse.",
          },
        }),
      },
      conditions: {
        label: "Basis-Check für 6.000 €",
        summary: "Kurzer Check der wichtigsten Punkte.",
        resolve: () => ({
          effects: [now("Basis-Check beauftragt.", { cash: -6_000, flag: "audit" })],
          risk: {
            delay: 3,
            chance: 0.8,
            good: {},
            bad: { cash: -30_000, trust: -4 },
            goodText: "Der Basis-Check hat gereicht.",
            badText: "Eine Lücke blieb unentdeckt. Ein kleineres Bußgeld wird fällig.",
          },
        }),
      },
      no: {
        label: "Vollständiges Audit",
        summary: "Audit für 25.000 €, sechs Wochen später.",
        resolve: () => ({ effects: [now("Vollständiges Audit für 25.000 €.", { cash: -25_000, axes: { management: 3, finance: 2 }, flag: "audit" })] }),
      },
    },
  },

  {
    id: "quality",
    title: "Qualitätsproblem: öffentlich machen?",
    motion: "Die Geschäftsführung beantragt, einen Fehler im Produkt still zu beheben, ohne die Kunden zu informieren.",
    pitch: "„Der Fehler betrifft nur wenige Kunden. Wenn wir das an die große Glocke hängen, verlieren wir mehr, als wir gewinnen.“",
    context: () => "Ein Fehler hat bei einigen Kunden falsche Abrechnungen erzeugt. Noch hat es niemand öffentlich bemerkt.",
    lesson: "erwartungswert",
    insight:
      "Vertrauen ist ein Vermögenswert, der in keiner Bilanz steht. Wer Fehler offen zugibt, verliert kurzfristig etwas und gewinnt langfristig Glaubwürdigkeit.",
    when: (s, age) => age >= 4 && !has(s, "quality"),
    pull: { cash: 0.3, control: 0.2, customer: -0.6, team: -0.1 },
    pro: [
      { interest: "cash", text: "Eine öffentliche Entschuldigung kostet Geld und Kunden." },
      { interest: "control", text: "Wir beheben den Fehler. Mehr muss niemand wissen." },
    ],
    contra: [
      { interest: "customer", text: "Wenn das rauskommt, glaubt uns niemand mehr." },
      { interest: "team", text: "Das Team will nicht für eine Firma arbeiten, die vertuscht." },
    ],
    arguments: [
      { id: "quiet", text: "Wir beheben es leise. Das schützt die Firma.", toward: "go", appeals: ["cash", "control"] },
      { id: "affected", text: "Die Betroffenen direkt anschreiben und entschädigen, ohne große Bühne.", toward: "conditions", appeals: ["customer", "cash"] },
      { id: "open", text: "Offenheit ist das Einzige, was Vertrauen auf Dauer schützt.", toward: "no", appeals: ["customer", "team"] },
    ],
    questions: [{ id: "scope", q: "Wie viele Kunden sind betroffen?", a: () => "Etwa 40, der Schaden liegt im Schnitt bei 120 € pro Kunde." }],
    outcomes: {
      go: {
        label: "Still beheben",
        summary: "Fehler beheben, niemand wird informiert.",
        resolve: () => ({
          effects: [now("Der Fehler wird still behoben.", { flag: "quality" })],
          risk: {
            delay: 2,
            chance: 0.45,
            good: {},
            bad: { axes: { market: -10 }, revenuePct: -0.1, morale: -6 },
            goodText: "Niemand hat etwas bemerkt.",
            badText: "Ein Kunde macht den Fehler öffentlich. Der Vorwurf: Vertuschung.",
          },
        }),
      },
      conditions: {
        label: "Betroffene direkt entschädigen",
        summary: "Persönliche Nachricht und Gutschrift an die Betroffenen.",
        resolve: () => ({
          effects: [now("Betroffene informiert und entschädigt.", { cash: -8_000, flag: "quality" })],
          risk: {
            delay: 2,
            chance: 0.85,
            good: { axes: { edge: 2 } },
            bad: { axes: { market: -4 } },
            goodText: "Die Betroffenen loben die faire Lösung.",
            badText: "Die Geschichte macht trotzdem die Runde.",
          },
        }),
      },
      no: {
        label: "Offen kommunizieren",
        summary: "Öffentliche Erklärung, Entschädigung für alle Betroffenen.",
        resolve: () => ({ effects: [now("Offene Erklärung und Entschädigung.", { cash: -12_000, trust: 3, axes: { edge: 3 }, morale: 2, flag: "quality" })] }),
      },
    },
  },
];
