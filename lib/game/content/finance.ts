import {
  axis,
  burn,
  clampChance,
  eur,
  has,
  later,
  months,
  now,
  pct,
  runway,
  valueOf,
  type Template,
} from "../templates";

// Vorlagen rund um Geld: Finanzierung, Kosten, Kredit, Verkauf.

export const FINANCE_TEMPLATES: Template[] = [
  {
    id: "bridge",
    title: "Das Geld reicht nur noch kurz",
    motion: "Die Geschäftsführung beantragt ein Wandeldarlehen der bestehenden Investoren über sechs Monatsverbräuche.",
    pitch: "„Wir brauchen eine Brücke bis zur nächsten Runde. Ohne neues Geld müssen wir in wenigen Wochen Leute entlassen.“",
    context: (s) => `Das Geld reicht noch ${months(runway(s))}. Die Firma verbraucht ${eur(burn(s))} im Monat.`,
    lesson: "runway",
    insight:
      "Eine Brücke kauft Zeit, nicht Erfolg. Sie lohnt sich, wenn die Zeit für einen klaren Meilenstein reicht. Ohne Brücke droht eine Notfinanzierung zu viel schlechteren Bedingungen.",
    when: (s, age) => age >= 1 && runway(s) < 3.5 && !has(s, "round_open"),
    urgent: true,
    repeatAfter: 4,
    pull: { cash: 0.7, growth: 0.3, control: -0.3, team: 0.4 },
    pro: [
      { interest: "cash", text: "Ohne Brücke sind wir in wenigen Wochen zahlungsunfähig." },
      { interest: "team", text: "Wir können das Team nicht einfach fallen lassen." },
      { interest: "growth", text: "Wir sind kurz vor dem nächsten Meilenstein. Jetzt aufzuhören wäre absurd." },
    ],
    contra: [
      { interest: "control", text: "Gutes Geld schlechtem hinterherwerfen? Erst muss sich etwas ändern." },
      { interest: "cash", text: "Eine Brücke ohne Sparplan verschiebt das Problem nur." },
    ],
    arguments: [
      { id: "save", text: "Ohne Brücke verlieren wir alles, was wir aufgebaut haben.", toward: "go", appeals: ["team", "growth", "cash"] },
      { id: "plan", text: "Brücke ja, aber nur mit Sparplan: Kosten um 30 % runter.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "stop", text: "Kein weiteres Geld ohne neue Investoren von außen.", toward: "no", appeals: ["control"] },
    ],
    questions: [
      { id: "milestone", q: "Welcher Meilenstein ist in sechs Monaten erreichbar?", a: (s) => `Mit dem heutigen Wachstum läge der Monatsumsatz dann bei etwa ${eur(s.metrics.revenue * Math.pow(1 + s.metrics.growth, 6))}.` },
      { id: "investors", q: "Gibt es Gespräche mit neuen Investoren?", a: () => "Zwei erste Gespräche, beide wollen erst die nächsten Zahlen sehen." },
    ],
    outcomes: {
      go: {
        label: "Brücke über sechs Monatsverbräuche",
        summary: "Wandeldarlehen der Investoren, wird bei der nächsten Runde in Anteile umgewandelt.",
        resolve: (s) => {
          const amount = burn(s) * 6;
          const dilution = amount / (valueOf(s) * 0.8 + amount);
          return {
            effects: [now("Die Investoren prüfen die Brücke.", {})],
            risk: {
              delay: 0,
              chance: clampChance(0.35 + s.metrics.growth * 6 + (axis(s, "finance") - 50) / 150),
              good: { cash: amount, dilution, morale: 4 },
              bad: { morale: -6 },
              goodText: `Brücke über ${eur(amount)} steht. Dein Anteil wird später verwässert.`,
              badText: "Die Investoren ziehen nicht mit. Die Brücke ist geplatzt.",
            },
          };
        },
      },
      conditions: {
        label: "Kleinere Brücke mit Sparplan",
        summary: "Drei Monatsverbräuche, dazu Kosten um 30 % senken.",
        resolve: (s) => {
          const amount = burn(s) * 3;
          const dilution = amount / (valueOf(s) * 0.8 + amount);
          return {
            effects: [
              now("Sparplan beschlossen: Kosten um 30 % runter.", { opex: -s.metrics.opex * 0.3, morale: -10 }),
              later(1, "Der Sparplan bremst das Wachstum.", { growth: -0.008, axes: { product: -3 } }),
            ],
            risk: {
              delay: 0,
              chance: clampChance(0.6 + s.metrics.growth * 6 + (axis(s, "finance") - 50) / 150),
              good: { cash: amount, dilution },
              bad: {},
              goodText: `Mit Sparplan ziehen die Investoren mit: Brücke über ${eur(amount)}.`,
              badText: "Selbst mit Sparplan gibt es keine Brücke.",
            },
          };
        },
      },
      no: {
        label: "Keine Brücke",
        summary: "Die Gründer müssen allein neues Geld finden.",
        resolve: () => ({ effects: [now("Keine Brücke. Die Gründer suchen auf eigene Faust Geld.", { trust: -6, morale: -6 })] }),
      },
    },
  },

  {
    id: "seed_round",
    title: "Seed-Runde annehmen?",
    motion: "Die Geschäftsführung beantragt, eine Seed-Runde von {vc}s Netzwerk anzunehmen.",
    pitch: "„Wir haben ein Angebot: frisches Geld für 20 % der Firma. Das reicht für anderthalb Jahre Wachstum.“",
    context: (s) => {
      const pre = valueOf(s) * 1.2;
      return `Angebot: ${eur(pre * 0.25)} bei einer Bewertung von ${eur(pre)} vor dem Geld. Neue Anteile werden ausgegeben, alle bisherigen Gesellschafter werden verwässert. Dein Anteil heute: ${pct(s.stake / 100)}.`;
    },
    lesson: "verwaesserung",
    insight:
      "Verwässerung ist kein Verlust, wenn der Kuchen schneller wächst als dein Stück schrumpft. Entscheidend ist, was die Firma mit dem Geld schafft und zu welchem Preis es kommt.",
    when: (s, age) => age >= 3 && !has(s, "seeded") && !has(s, "round_open") && (s.metrics.revenue >= 14_000 || age >= 6),
    pull: { growth: 0.6, cash: 0.6, control: -0.6, team: 0.2 },
    pro: [
      { interest: "growth", text: "Mit dem Geld können wir endlich in Vertrieb und Produkt investieren." },
      { interest: "cash", text: "Anderthalb Jahre Reichweite nehmen den Druck raus." },
    ],
    contra: [
      { interest: "control", text: "20 % abgeben, bevor wir zeigen konnten, was wir wert sind? Zu früh." },
      { interest: "cash", text: "Ein Investor mit Vetorechten redet bei allem mit." },
    ],
    arguments: [
      { id: "fuel", text: "Geld zum richtigen Zeitpunkt ist mehr wert als ein paar Prozent Anteil.", toward: "go", appeals: ["growth", "cash"] },
      { id: "renegotiate", text: "Annehmen, aber zu besseren Bedingungen nachverhandeln.", toward: "conditions", appeals: ["control", "cash"] },
      { id: "later", text: "Erst die Zahlen verbessern, dann zu einer höheren Bewertung aufnehmen.", toward: "no", appeals: ["control", "growth"] },
    ],
    questions: [
      { id: "terms", q: "Was steht sonst im Term Sheet?", a: () => "Einfache Liquidationspräferenz, ein Beiratssitz für den neuen Investor, übliche Vetorechte." },
      { id: "alternatives", q: "Gibt es andere Angebote?", a: () => "Nein. Ein zweiter Fonds wartet auf die Zahlen des nächsten Quartals." },
    ],
    outcomes: {
      go: {
        label: "Seed-Runde annehmen",
        summary: "Frisches Geld für 20 % neue Anteile.",
        resolve: (s) => {
          const pre = valueOf(s) * 1.2;
          const amount = pre * 0.25;
          return {
            effects: [now(`Seed-Runde abgeschlossen: ${eur(amount)} frisches Geld.`, { cash: amount, dilution: amount / (pre + amount), morale: 5, axes: { finance: 8 }, flag: "seeded" })],
          };
        },
      },
      conditions: {
        label: "Nachverhandeln",
        summary: "Höhere Bewertung oder kleinere Runde verlangen.",
        resolve: (s) => {
          const pre = valueOf(s) * 1.45;
          const amount = pre * 0.18;
          return {
            effects: [now("Die Nachverhandlung läuft.", { flag: "seeded" })],
            risk: {
              delay: 1,
              chance: 0.5,
              good: { cash: amount, dilution: amount / (pre + amount), axes: { finance: 8 }, morale: 4 },
              bad: { morale: -4 },
              goodText: `Nachverhandelt: ${eur(amount)} zu besserer Bewertung.`,
              badText: "Der Investor ist abgesprungen. Die Runde ist geplatzt.",
            },
          };
        },
      },
      no: {
        label: "Ablehnen",
        summary: "Ohne neues Geld weiter.",
        resolve: () => ({ effects: [now("Die Runde wird abgelehnt.", { flag: "seeded" })] }),
      },
    },
  },

  {
    id: "cost_cut",
    title: "Kosten um 25 % senken?",
    motion: "Die Geschäftsführung beantragt ein Sparprogramm: Kosten um 25 % senken, auch beim Personal.",
    pitch: "„Ich hasse das, aber die Zahlen sind klar. Wenn wir jetzt nicht sparen, entscheiden in ein paar Monaten andere für uns.“",
    context: (s) => `Das Geld reicht ${months(runway(s))}. Ein Viertel der Kosten wären etwa ${eur(s.metrics.opex * 0.25)} im Monat.`,
    lesson: "fixkosten",
    insight:
      "Sparen verlängert die Reichweite sofort, kostet aber oft Wachstum und Stimmung. Gut ist ein Sparprogramm, wenn es Zeit für einen klaren nächsten Schritt kauft.",
    when: (s, age) => age >= 2 && runway(s) < 6 && runway(s) >= 3.5,
    repeatAfter: 6,
    pull: { cash: 0.8, control: 0.3, team: -0.7, growth: -0.5, product: -0.3 },
    pro: [
      { interest: "cash", text: "Jeder gesparte Euro verlängert unsere Reichweite." },
      { interest: "control", text: "Lieber jetzt selbst sparen als später von Investoren gezwungen." },
    ],
    contra: [
      { interest: "team", text: "Kündigungen zerstören die Stimmung. Die Besten gehen zuerst." },
      { interest: "growth", text: "Wer spart, wächst nicht. Dann werden wir noch weniger wert." },
      { interest: "product", text: "Ohne Entwickler bleibt das Produkt stehen." },
    ],
    arguments: [
      { id: "survive", text: "Überleben kommt vor Wachstum.", toward: "go", appeals: ["cash", "control"] },
      { id: "soft", text: "Sachkosten senken, das Team halten.", toward: "conditions", appeals: ["team", "cash"] },
      { id: "grow", text: "Wir sparen uns nicht zum Erfolg. Wir brauchen Wachstum.", toward: "no", appeals: ["growth", "product"] },
    ],
    questions: [
      { id: "where", q: "Wo genau würde gespart?", a: () => "Zwei Stellen fallen weg, das Büro wird kleiner, Software-Abos werden gekündigt." },
      { id: "who", q: "Wen würde es treffen?", a: () => "Einen Entwickler und eine Person im Kundenservice." },
    ],
    outcomes: {
      go: {
        label: "Kosten um 25 % senken",
        summary: "Zwei Stellen weniger, kleineres Büro.",
        resolve: (s) => ({
          effects: [
            now("Sparprogramm umgesetzt.", { opex: -s.metrics.opex * 0.25 + 2 * 5_500, team: -2, morale: -14, axes: { product: -4 } }),
            later(1, "Das Tempo sinkt.", { growth: -0.01 }),
          ],
        }),
      },
      conditions: {
        label: "Nur Sachkosten senken",
        summary: "Team bleibt, Büro und Software werden günstiger.",
        resolve: (s) => ({ effects: [now("Sachkosten gesenkt.", { opex: -s.metrics.opex * 0.1, morale: -3 })] }),
      },
      no: {
        label: "Nicht sparen",
        summary: "Weiter wie bisher.",
        resolve: () => ({ effects: [now("Kein Sparprogramm.", {})] }),
      },
    },
  },

  {
    id: "bank_loan",
    title: "Bankkredit statt neuer Investoren?",
    motion: "Die Geschäftsführung beantragt einen Bankkredit über 200.000 € zu 9 % Zinsen.",
    pitch: "„Warum Anteile abgeben, wenn die Bank uns Geld leiht? Wir behalten die Firma und zahlen nur Zinsen.“",
    context: (s) => `Ein Kredit muss getilgt werden, auch in schlechten Monaten. Heute verbraucht die Firma ${eur(burn(s))} im Monat.`,
    lesson: "leverage",
    insight:
      "Fremdkapital verwässert nicht, aber es muss bedient werden, egal wie es läuft. Je unsicherer die Einnahmen, desto gefährlicher ist ein Kredit.",
    when: (s, age) => age >= 3 && !has(s, "loan"),
    pull: { control: 0.6, cash: 0.3, growth: 0.2, team: 0 },
    pro: [
      { interest: "control", text: "Ein Kredit kostet keine Anteile. Die Firma bleibt unsere." },
      { interest: "cash", text: "Mehr Reichweite, sofort, ohne monatelange Investorengespräche." },
    ],
    contra: [
      { interest: "cash", text: "Zinsen und Tilgung laufen auch, wenn der Umsatz ausbleibt." },
      { interest: "growth", text: "Ein Startup ohne Gewinn mit Bankschulden? Das macht uns für Investoren unattraktiv." },
    ],
    arguments: [
      { id: "own", text: "Wir behalten unsere Anteile und kaufen trotzdem Zeit.", toward: "go", appeals: ["control", "cash"] },
      { id: "small", text: "Ein kleiner Kredit als Puffer, nicht als Wachstumsmotor.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "risk", text: "Ohne stabile Einnahmen ist ein Kredit ein Risiko für alle.", toward: "no", appeals: ["cash", "growth"] },
    ],
    questions: [
      { id: "security", q: "Welche Sicherheiten will die Bank?", a: () => "Eine persönliche Bürgschaft der Gründerin über die Hälfte des Betrags." },
      { id: "repay", q: "Wie hoch wäre die Belastung im Monat?", a: () => "Anfangs rund 9.500 € für Zinsen und Tilgung, danach sinkend." },
    ],
    outcomes: {
      go: {
        label: "Kredit über 200.000 €",
        summary: "Mehr Geld, keine Verwässerung, monatliche Belastung.",
        resolve: (s) => ({
          effects: [now("Kredit über 200.000 € ausgezahlt.", { cash: 200_000, debt: 200_000, flag: "loan" })],
          risk: {
            delay: 4,
            chance: clampChance(0.4 + s.metrics.growth * 6),
            good: {},
            bad: { cash: -70_000, debt: -70_000, morale: -4 },
            goodText: "Die Umsatzziele aus dem Kreditvertrag sind erfüllt.",
            badText: "Umsatzziele verfehlt: Die Bank stellt 70.000 € sofort fällig.",
          },
        }),
      },
      conditions: {
        label: "Kleiner Kredit über 80.000 €",
        summary: "Puffer statt Wachstumsmotor.",
        resolve: () => ({ effects: [now("Kredit über 80.000 € ausgezahlt.", { cash: 80_000, debt: 80_000, flag: "loan" })] }),
      },
      no: {
        label: "Kein Kredit",
        summary: "Keine Bankschulden.",
        resolve: () => ({ effects: [now("Kein Kredit.", { flag: "loan" })] }),
      },
    },
  },

  {
    id: "acquisition",
    title: "Übernahmeangebot von {acquirer}",
    motion: "{acquirer} bietet an, die Firma vollständig zu kaufen. Die Geschäftsführung empfiehlt, das Angebot anzunehmen.",
    pitch: "„Das ist mehr Geld, als ich je für möglich gehalten habe. Ich bin müde. Lasst uns verkaufen.“",
    context: (s) => `Angebot: ${eur(valueOf(s) * 1.3)} für die ganze Firma. Für deinen Anteil von ${pct(s.stake / 100)} wären das ${eur((valueOf(s) * 1.3 * s.stake) / 100)}.`,
    lesson: "bewertung",
    insight:
      "Ein Angebot ist so gut wie die Alternative. Wer weiter wachsen kann, verkauft zu früh. Wer müde Gründer und wenig Geld hat, bekommt selten ein besseres.",
    when: (s, age) => age >= 6 && !has(s, "offered_exit") && s.metrics.revenue >= 25_000 && s.metrics.growth >= 0.025,
    pull: { cash: 0.6, control: -0.4, growth: -0.4, team: -0.2 },
    pro: [
      { interest: "cash", text: "Ein sicherer Verkauf heute schlägt eine unsichere Zukunft." },
      { interest: "control", text: "Die Gründerin will nicht mehr. Gegen ihren Willen weiterzumachen ist gefährlich." },
    ],
    contra: [
      { interest: "growth", text: "Wir wachsen. In zwei Jahren ist die Firma ein Vielfaches wert." },
      { interest: "team", text: "Das Team will nicht Teil eines Konzerns werden." },
    ],
    arguments: [
      { id: "sell", text: "Ein Vogel in der Hand ist besser als zwei auf dem Dach.", toward: "go", appeals: ["cash", "control"] },
      { id: "more", text: "Nachverhandeln: Wer so ein Angebot macht, zahlt auch mehr.", toward: "conditions", appeals: ["cash", "growth"] },
      { id: "grow", text: "Wir verkaufen nicht, solange wir so wachsen.", toward: "no", appeals: ["growth", "team"] },
    ],
    questions: [
      { id: "why", q: "Warum will {acquirer} kaufen?", a: () => "Sie brauchen unser Produkt, um ein eigenes Projekt zu retten." },
      { id: "founder", q: "Wie ernst ist die Müdigkeit der Gründerin?", a: () => "Sie hat seit zwei Jahren keinen Urlaub gemacht und denkt über eine Auszeit nach." },
    ],
    outcomes: {
      go: {
        label: "Verkaufen",
        summary: "Die Firma geht an {acquirer}, du erhältst deinen Anteil am Kaufpreis.",
        resolve: (s) => ({ effects: [now("Verkauf an {acquirer} unterschrieben.", { exit: valueOf(s) * 1.3, flag: "offered_exit" })] }),
      },
      conditions: {
        label: "Nachverhandeln",
        summary: "Mehr verlangen, mit dem Risiko, dass der Käufer abspringt.",
        resolve: (s) => ({
          effects: [now("Die Nachverhandlung läuft.", { flag: "offered_exit" })],
          risk: {
            delay: 1,
            chance: 0.4,
            good: { exit: valueOf(s) * 1.55 },
            bad: { morale: -4, trust: -4 },
            goodText: "{acquirer} zahlt mehr. Der Verkauf ist unterschrieben.",
            badText: "{acquirer} springt ab. Das Angebot ist vom Tisch.",
          },
        }),
      },
      no: {
        label: "Nicht verkaufen",
        summary: "Die Firma bleibt eigenständig.",
        resolve: () => ({ effects: [now("Das Angebot wird abgelehnt.", { morale: 3, trust: -5, flag: "offered_exit" })] }),
      },
    },
  },

  {
    id: "subsidy",
    title: "Förderprogramm beantragen?",
    motion: "Die Geschäftsführung beantragt, einen großen Förderantrag über 300.000 € zu stellen.",
    pitch: "„Es gibt ein Förderprogramm für genau unser Thema. Viel Papier, aber geschenktes Geld.“",
    context: () => "Der große Antrag bindet die Gründerin vier Monate lang zur Hälfte. Ein kleiner Zuschuss geht schneller.",
    lesson: "opportunitaetskosten",
    insight:
      "Geschenktes Geld ist nie kostenlos: Es kostet Zeit, und diese Zeit fehlt woanders. Lohnend ist es, wenn die Chance hoch und der Aufwand im Verhältnis klein ist.",
    when: (s, age) => age >= 2 && !has(s, "subsidy"),
    pull: { cash: 0.6, control: 0.2, growth: -0.2, team: -0.3 },
    pro: [
      { interest: "cash", text: "300.000 € ohne Anteile abzugeben. Das ist ein Geschenk." },
      { interest: "control", text: "Fördergeld macht uns unabhängiger von Investoren." },
    ],
    contra: [
      { interest: "growth", text: "Vier Monate halbe Gründerin heißt vier Monate halber Vertrieb." },
      { interest: "team", text: "Der Papierkram landet am Ende beim Team." },
    ],
    arguments: [
      { id: "free", text: "Geld ohne Verwässerung sollten wir nie liegen lassen.", toward: "go", appeals: ["cash", "control"] },
      { id: "small", text: "Den kleinen Zuschuss mitnehmen, den großen Antrag lassen.", toward: "conditions", appeals: ["cash", "growth"] },
      { id: "focus", text: "Die Gründerin gehört zu den Kunden, nicht in die Antragsprosa.", toward: "no", appeals: ["growth", "team"] },
    ],
    questions: [
      { id: "odds", q: "Wie gut sind die Chancen?", a: () => "Etwa jeder zweite Antrag wird bewilligt, das Ergebnis kommt nach vier Monaten." },
      { id: "effort", q: "Wer schreibt den Antrag?", a: () => "Die Gründerin, mit Hilfe einer Beraterin, die 8.000 € kostet." },
    ],
    outcomes: {
      go: {
        label: "Großer Antrag über 300.000 €",
        summary: "Vier Monate Arbeit, Chance auf viel Geld.",
        resolve: () => ({
          effects: [now("Der Antrag wird geschrieben. Die Gründerin ist halb gebunden.", { cash: -8_000, growth: -0.006, axes: { management: -3 }, flag: "subsidy" })],
          risk: {
            delay: 4,
            chance: 0.45,
            good: { cash: 300_000, axes: { finance: 4 } },
            bad: {},
            goodText: "Bewilligt: 300.000 € Fördergeld.",
            badText: "Abgelehnt. Vier Monate Arbeit ohne Ergebnis.",
          },
        }),
      },
      conditions: {
        label: "Nur kleiner Zuschuss über 50.000 €",
        summary: "Wenig Aufwand, gute Chancen.",
        resolve: () => ({
          effects: [now("Kleiner Antrag gestellt.", { flag: "subsidy" })],
          risk: {
            delay: 2,
            chance: 0.8,
            good: { cash: 50_000 },
            bad: {},
            goodText: "Bewilligt: 50.000 € Zuschuss.",
            badText: "Leider abgelehnt.",
          },
        }),
      },
      no: {
        label: "Kein Antrag",
        summary: "Volle Konzentration aufs Geschäft.",
        resolve: () => ({ effects: [now("Kein Förderantrag.", { flag: "subsidy" })] }),
      },
    },
  },

  {
    id: "dividend",
    title: "Gewinn ausschütten oder reinvestieren?",
    motion: "Die Geschäftsführung schlägt vor, die Hälfte des Geldes über sechs Monatskosten an die Gesellschafter auszuschütten.",
    pitch: "„Wir verdienen endlich Geld. Die Gesellschafter haben lange gewartet. Zeit, etwas zurückzugeben.“",
    context: (s) => `Die Firma verdient Geld und hat ${eur(s.metrics.cash)} auf dem Konto.`,
    lesson: "bewertung",
    insight:
      "Ausschüttungen machen Gewinne für dich greifbar. Reinvestieren lohnt sich, solange die Firma mit dem Geld mehr verdient, als du anderswo bekommen würdest.",
    when: (s, age) => age >= 4 && s.phase === "profit" && s.metrics.cash > s.metrics.opex * 8,
    repeatAfter: 12,
    pull: { cash: 0.3, control: 0.3, growth: -0.5, team: -0.2 },
    pro: [
      { interest: "cash", text: "Geld auf dem Konto bringt nichts. Ausgeschüttet arbeitet es für die Gesellschafter." },
      { interest: "control", text: "Disziplin: Wer nicht jeden Euro ausgeben kann, investiert sorgfältiger." },
    ],
    contra: [
      { interest: "growth", text: "Jeder ausgeschüttete Euro fehlt beim Wachstum." },
      { interest: "team", text: "Das Team würde lieber in bessere Werkzeuge investieren." },
    ],
    arguments: [
      { id: "pay", text: "Gewinne gehören den Gesellschaftern, die das Risiko getragen haben.", toward: "go", appeals: ["cash", "control"] },
      { id: "half", text: "Ein Viertel ausschütten, der Rest ins Wachstum.", toward: "conditions", appeals: ["cash", "growth"] },
      { id: "grow", text: "Wir sind nicht fertig. Alles zurück ins Wachstum.", toward: "no", appeals: ["growth", "team"] },
    ],
    questions: [{ id: "plans", q: "Was würde die Firma mit dem Geld machen?", a: () => "Zwei neue Stellen im Vertrieb und eine Marketing-Offensive." }],
    outcomes: {
      go: {
        label: "Die Hälfte ausschütten",
        summary: "Die Hälfte des Überschusses geht an die Gesellschafter.",
        resolve: (s) => {
          const amount = Math.max(0, (s.metrics.cash - s.metrics.opex * 6) / 2);
          return { effects: [now(`Ausschüttung über ${eur(amount)}.`, { cash: -amount, playerCash: (amount * s.stake) / 100 })] };
        },
      },
      conditions: {
        label: "Ein Viertel ausschütten",
        summary: "Kleinere Ausschüttung, Rest ins Wachstum.",
        resolve: (s) => {
          const amount = Math.max(0, (s.metrics.cash - s.metrics.opex * 6) / 4);
          return {
            effects: [
              now(`Ausschüttung über ${eur(amount)}.`, { cash: -amount, playerCash: (amount * s.stake) / 100 }),
              later(2, "Investitionen ins Wachstum.", { growth: 0.006 }),
            ],
          };
        },
      },
      no: {
        label: "Alles reinvestieren",
        summary: "Kein Geld an die Gesellschafter.",
        resolve: () => ({ effects: [later(2, "Das Geld fließt ins Wachstum.", { growth: 0.012, team: 1 })] }),
      },
    },
  },
];
