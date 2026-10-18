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
  type Template,
} from "../templates";

// Vorlagen rund um Wachstum, Kunden und Preise.

export const GROWTH_TEMPLATES: Template[] = [
  {
    id: "expansion",
    title: "Expansion nach {city} – jetzt?",
    motion: "Die Geschäftsführung beantragt, sofort einen eigenen Standort in {city} zu eröffnen.",
    pitch: "„{customer} will mit uns nach {city}. Wenn wir jetzt nicht gehen, macht es {competitor}. Ich will nächsten Monat anfangen.“",
    context: (s) =>
      `Ein Großkunde bietet einen Einstieg in {city}. Ein eigener Standort kostet rund 90.000 € plus laufende Kosten. Das Geld reicht im Moment ${months(runway(s))}.`,
    lesson: "runway",
    insight:
      "Wachstum, das die Reichweite auffrisst, ist ein Wettlauf gegen die Zeit. Ein Pilot kauft dieselbe Information für einen Bruchteil des Geldes.",
    when: (s, age) => age >= 1 && (s.phase === "beta" || s.phase === "launch") && !has(s, "expanded"),
    pull: { growth: 0.8, cash: -0.7, team: -0.3, customer: 0.3, product: -0.2 },
    pro: [
      { interest: "growth", text: "{city} ist jetzt offen. In sechs Monaten sitzt {competitor} dort." },
      { interest: "customer", text: "Mit {customer} als Anker haben wir vom ersten Tag an Umsatz in der neuen Stadt." },
      { interest: "control", text: "Wer den Markt zuerst besetzt, bestimmt die Preise." },
    ],
    contra: [
      { interest: "cash", text: "Ein Standort kostet uns mehrere Monate Reichweite. Geht es schief, stehen wir ohne Geld da." },
      { interest: "team", text: "Zwei Standorte mit diesem Team? Das zerreißt uns." },
      { interest: "product", text: "Unser Produkt ist in der ersten Stadt noch nicht fertig." },
    ],
    arguments: [
      { id: "runway", text: "Unsere Reichweite verträgt keinen Fehlschlag.", toward: "no", appeals: ["cash", "control"] },
      { id: "pilot", text: "Ein Pilot mit dem Großkunden liefert belastbare Zahlen für die nächste Finanzierungsrunde.", toward: "conditions", appeals: ["growth", "cash"] },
      { id: "team", text: "Ein zweiter Standort überfordert das Team gerade.", toward: "conditions", appeals: ["team", "product"] },
    ],
    questions: [
      { id: "commitment", q: "Wie verbindlich ist der Großkunde?", a: () => "Nur eine Absichtserklärung. Der Einkauf will erst drei Monate testen, eine feste Abnahme gibt es nicht." },
      { id: "units", q: "Rechnet sich das Geschäft schon in der ersten Stadt?", a: (s) => `Pro Monat bleibt nach direkten Kosten ein Rohertrag von ${pct(s.metrics.grossMargin)}. Insgesamt verbraucht die Firma ${eur(burn(s))} im Monat mehr, als sie einnimmt.` },
      { id: "competition", q: "Was macht {competitor}?", a: () => "{competitor} hat Geld, ist in {city} aber noch nicht aktiv. Geplant ist zuerst eine andere Stadt." },
    ],
    outcomes: {
      go: {
        label: "Standort in {city} sofort eröffnen",
        summary: "Eigenes Lager und Team in {city}, rund 90.000 € Startkosten.",
        resolve: (s) => ({
          effects: [now("Standort eröffnet: 90.000 € Startkosten, eine Person mehr im Team.", { cash: -90_000, opex: 6_000, team: 1, flag: "expanded" })],
          risk: {
            delay: 2,
            chance: clampChance(0.3 + (axis(s, "market") - 50) / 200 + (axis(s, "management") - 50) / 250),
            good: { revenuePct: 0.35, axes: { market: 6 } },
            bad: { revenuePct: 0.06, morale: -8 },
            goodText: "{city} läuft: Der Großkunde übernimmt alle Abos, der Umsatz steigt kräftig.",
            badText: "{city} enttäuscht: Der Kunde testet nur klein, der Standort kostet mehr, als er bringt.",
          },
        }),
      },
      conditions: {
        label: "Erst ein Pilot mit dem Großkunden",
        summary: "Kein eigener Standort, ein Test über einen Partner vor Ort. Rund 25.000 €.",
        resolve: (s) => ({
          effects: [now("Pilot gestartet: 25.000 € für Partner und Material.", { cash: -25_000, flag: "pilot" })],
          risk: {
            delay: 2,
            chance: clampChance(0.65 + (axis(s, "market") - 50) / 300),
            good: { revenuePct: 0.15, axes: { market: 4, edge: 2 } },
            bad: { revenuePct: 0.03 },
            goodText: "Der Pilot überzeugt: Der Kunde übernimmt dauerhaft, die Zahlen helfen bei Investoren.",
            badText: "Der Pilot bleibt klein. Immerhin hat er wenig gekostet.",
          },
        }),
      },
      no: {
        label: "Ablehnen, Fokus auf den Heimatmarkt",
        summary: "Kein Schritt nach {city}, die Energie bleibt im bestehenden Geschäft.",
        resolve: () => ({
          effects: [
            now("Die Gründerin ist enttäuscht.", { morale: -3 }),
            later(2, "{competitor} eröffnet in {city} und gewinnt den Großkunden.", { axes: { edge: -4 } }),
          ],
        }),
      },
    },
  },

  {
    id: "price",
    title: "Preise um 20 % erhöhen?",
    motion: "Die Geschäftsführung beantragt, die Preise für alle Kunden um 20 % zu erhöhen.",
    pitch: "„Wir sind zu billig. Kein Kunde hat sich je über den Preis beschwert. Ich will die Marge endlich gesund machen.“",
    context: (s) =>
      `Der Rohertrag liegt bei ${pct(s.metrics.grossMargin)}. Eine Preiserhöhung wirkt sofort auf die Marge, kann aber Kunden kosten.`,
    lesson: "preiselastizitaet",
    insight:
      "Ein höherer Preis wirkt fast vollständig auf den Gewinn, solange nur wenige Kunden gehen. Bestandskunden sind empfindlicher als neue: Für sie ändert sich etwas, für Neue nicht.",
    when: (s, age) => age >= 2 && !has(s, "priced"),
    pull: { cash: 0.7, growth: -0.4, customer: -0.6, control: 0.1 },
    pro: [
      { interest: "cash", text: "Jeder Euro mehr Preis landet fast vollständig im Gewinn. Das verlängert unsere Reichweite." },
      { interest: "control", text: "Wer seinen Preis nicht verteidigt, lässt sich vom Wettbewerb treiben." },
      { interest: "growth", text: "Mit besserer Marge können wir später mehr in Wachstum stecken." },
    ],
    contra: [
      { interest: "customer", text: "Unsere ersten Kunden vertrauen uns. 20 % auf einen Schlag fühlt sich wie ein Wortbruch an." },
      { interest: "growth", text: "Höhere Preise bremsen das Wachstum genau dann, wenn wir es brauchen." },
      { interest: "team", text: "Der Vertrieb muss das erklären. Das kostet Wochen." },
    ],
    arguments: [
      { id: "margin", text: "Unsere Marge ist zu dünn, um jemals Geld zu verdienen.", toward: "go", appeals: ["cash", "control"] },
      { id: "new", text: "Neue Preise nur für Neukunden: gleicher Effekt auf Dauer, kein Ärger mit Bestandskunden.", toward: "conditions", appeals: ["customer", "growth"] },
      { id: "loyalty", text: "Unsere Bestandskunden sind unser bestes Marketing. Die verärgern wir nicht.", toward: "no", appeals: ["customer", "team"] },
    ],
    questions: [
      { id: "contracts", q: "Wie viele Kunden sind vertraglich gebunden?", a: () => "Etwa die Hälfte hat Jahresverträge. Die andere Hälfte kann monatlich kündigen." },
      { id: "competition", q: "Was kostet die Konkurrenz?", a: () => "{competitor} liegt etwa 10 % über unserem heutigen Preis." },
    ],
    outcomes: {
      go: {
        label: "Für alle Kunden erhöhen",
        summary: "20 % mehr für alle, ab dem nächsten Monat.",
        resolve: (s) => ({
          effects: [now("Neue Preise für alle: mehr Umsatz pro Kunde, etwas weniger Wachstum.", { revenuePct: 0.13, grossMargin: 0.06, growth: -0.008, flag: "priced" })],
          risk: {
            delay: 1,
            chance: clampChance(0.55 + (axis(s, "edge") - 50) / 150),
            good: {},
            bad: { revenuePct: -0.08, axes: { market: -3 } },
            goodText: "Kaum Kündigungen. Die Kunden akzeptieren den Preis.",
            badText: "Mehr Kündigungen als erwartet: Monatskunden wandern ab.",
          },
        }),
      },
      conditions: {
        label: "Nur für Neukunden",
        summary: "Bestandskunden behalten ihren Preis, neue zahlen 20 % mehr.",
        resolve: () => ({
          effects: [
            now("Neue Preise für Neukunden.", { revenuePct: 0.02, grossMargin: 0.02, growth: -0.003, flag: "priced" }),
            later(3, "Der Anteil der Kunden mit neuem Preis wächst.", { revenuePct: 0.05, grossMargin: 0.03 }),
          ],
        }),
      },
      no: {
        label: "Preise bleiben",
        summary: "Alles bleibt, wie es ist.",
        resolve: () => ({ effects: [now("Die Preise bleiben unverändert.", {})] }),
      },
    },
  },

  {
    id: "exclusive",
    title: "{customer} will Exklusivität",
    motion: "Die Geschäftsführung beantragt einen Exklusivvertrag mit {customer}: mehr Umsatz, dafür keine Konkurrenten von {customer} als Kunden.",
    pitch: "„{customer} verdoppelt das Volumen, wenn wir nur noch für sie arbeiten. Das ist der größte Auftrag unserer Geschichte.“",
    context: (s) =>
      `{customer} bringt heute ${pct(s.metrics.topCustomer)} des Umsatzes. Mit Exklusivität wären es deutlich mehr.`,
    lesson: "klumpenrisiko",
    insight:
      "Je größer der Anteil eines Kunden, desto mehr gehört dir die Firma nur noch zum Teil. Ein Klumpenrisiko senkt auch die Bewertung: Käufer zahlen weniger für Umsatz, der an einem Vertrag hängt.",
    when: (s, age) => age >= 2 && !has(s, "exclusive"),
    pull: { cash: 0.5, customer: 0.6, growth: 0.2, control: -0.6, product: -0.1 },
    pro: [
      { interest: "cash", text: "Mehr Umsatz, sofort und planbar. Das löst unser Reichweitenproblem." },
      { interest: "customer", text: "{customer} ist ein Referenzkunde, den jeder kennt." },
      { interest: "growth", text: "Das Volumen bringt uns in die nächste Phase." },
    ],
    contra: [
      { interest: "control", text: "Dann hängt die halbe Firma an einem Vertrag. Kündigen die, sind wir erledigt." },
      { interest: "growth", text: "Exklusivität sperrt uns den Rest des Marktes." },
      { interest: "product", text: "Wir bauen dann ein Produkt für einen Kunden statt für einen Markt." },
    ],
    arguments: [
      { id: "volume", text: "Planbarer Umsatz ist in unserer Lage mehr wert als Optionen.", toward: "go", appeals: ["cash", "customer"] },
      { id: "limit", text: "Ja, aber befristet auf zwölf Monate und mit Ausstiegsklausel.", toward: "conditions", appeals: ["control", "cash"] },
      { id: "risk", text: "Ein Kunde mit diesem Anteil ist kein Erfolg, sondern ein Risiko.", toward: "no", appeals: ["control", "growth"] },
    ],
    questions: [
      { id: "notice", q: "Welche Kündigungsfrist hätte der Vertrag?", a: () => "Drei Monate, ohne Mindestlaufzeit. Der Einkauf will flexibel bleiben." },
      { id: "situation", q: "Wie stabil ist {customer} selbst?", a: () => "Dort wird gerade umstrukturiert. Ein neuer Einkaufsleiter kommt im Frühjahr." },
    ],
    outcomes: {
      go: {
        label: "Exklusivvertrag unterschreiben",
        summary: "Deutlich mehr Umsatz, dafür keine Konkurrenten von {customer} als Kunden.",
        resolve: () => ({
          effects: [now("Exklusivvertrag unterschrieben: Der Umsatz springt.", { revenuePct: 0.3, topCustomer: 0.25, axes: { edge: -5 }, flag: "exclusive" })],
          risk: {
            delay: 4,
            chance: 0.7,
            good: {},
            bad: { revenuePct: -0.35, topCustomer: -0.3, morale: -8 },
            goodText: "{customer} bleibt treu. Der Vertrag läuft weiter.",
            badText: "Der neue Einkaufsleiter kündigt den Vertrag. Ein großer Teil des Umsatzes ist weg.",
          },
        }),
      },
      conditions: {
        label: "Befristet auf zwölf Monate",
        summary: "Mehr Volumen, Ausstiegsklausel für beide Seiten.",
        resolve: () => ({
          effects: [now("Befristeter Vertrag: mehr Umsatz, begrenzte Abhängigkeit.", { revenuePct: 0.18, topCustomer: 0.12, flag: "exclusive" })],
          risk: {
            delay: 4,
            chance: 0.8,
            good: {},
            bad: { revenuePct: -0.15, topCustomer: -0.12 },
            goodText: "Die Zusammenarbeit läuft stabil.",
            badText: "{customer} reduziert das Volumen wieder.",
          },
        }),
      },
      no: {
        label: "Ablehnen",
        summary: "Weiter mit allen Kunden, ohne Exklusivität.",
        resolve: () => ({ effects: [now("{customer} bleibt Kunde wie bisher, ohne Exklusivität.", { morale: -2, flag: "exclusive" })] }),
      },
    },
  },

  {
    id: "hire_sales",
    title: "Zwei Vertriebler einstellen?",
    motion: "Die Geschäftsführung beantragt, zwei Vertriebsmitarbeiter einzustellen.",
    pitch: "„Ich verkaufe alles selbst und schaffe es nicht mehr. Mit zwei Leuten im Vertrieb verdoppeln wir das Tempo.“",
    context: (s) => `Jede Einstellung kostet rund 5.500 € im Monat. Das Geld reicht heute ${months(runway(s))}.`,
    lesson: "fixkosten",
    insight:
      "Gehälter sind Fixkosten: Sie laufen sofort, der Umsatz kommt später. Neue Vertriebler brauchen meist drei bis sechs Monate, bis sie ihre Kosten einspielen.",
    when: (s, age) => age >= 2 && s.metrics.revenue >= 9_000 && runway(s) > 5 && !has(s, "sales"),
    pull: { growth: 0.7, cash: -0.5, team: 0.2, customer: 0.4 },
    pro: [
      { interest: "growth", text: "Die Nachfrage ist da, uns fehlen die Hände, um sie abzuholen." },
      { interest: "customer", text: "Kunden warten heute zwei Wochen auf einen Termin. Das kostet uns Abschlüsse." },
      { interest: "team", text: "Die Gründerin muss raus aus dem Tagesgeschäft." },
    ],
    contra: [
      { interest: "cash", text: "Elf Tausend im Monat mehr, bevor auch nur ein Euro Umsatz zurückkommt." },
      { interest: "product", text: "Mehr Vertrieb verkauft auch die Schwächen des Produkts schneller." },
      { interest: "control", text: "Wir wissen noch nicht, ob jemand außer der Gründerin unser Produkt verkaufen kann." },
    ],
    arguments: [
      { id: "demand", text: "Die Nachfrage ist belegt. Jetzt nicht einzustellen, kostet uns Wachstum.", toward: "go", appeals: ["growth", "customer"] },
      { id: "one", text: "Erst eine Person mit klaren Zielen. Wenn sie liefert, kommt die zweite.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "wait", text: "Erst muss das Produkt rund laufen, dann skalieren wir den Vertrieb.", toward: "no", appeals: ["product", "cash"] },
    ],
    questions: [
      { id: "pipeline", q: "Wie voll ist die Vertriebs-Pipeline?", a: () => "Etwa 40 offene Gespräche, die Hälfte davon seit über einem Monat ohne Rückmeldung." },
      { id: "ramp", q: "Wie lange braucht ein neuer Vertriebler, bis er verkauft?", a: () => "In unserer Branche etwa drei Monate Einarbeitung." },
    ],
    outcomes: {
      go: {
        label: "Zwei Vertriebler einstellen",
        summary: "Zwei Personen mehr, Wirkung nach etwa drei Monaten.",
        resolve: (s) => ({
          effects: [
            now("Zwei Vertriebler eingestellt.", { team: 2, flag: "sales" }),
            later(3, "Der Vertrieb läuft an.", { growth: 0.015, axes: { market: 4 } }),
          ],
          risk: {
            delay: 3,
            chance: clampChance(0.5 + (axis(s, "product") - 50) / 200),
            good: { revenuePct: 0.1 },
            bad: { morale: -5 },
            goodText: "Die neuen Vertriebler schließen schneller ab als gedacht.",
            badText: "Einer der beiden passt nicht und geht wieder.",
          },
        }),
      },
      conditions: {
        label: "Erst eine Person mit Zielvereinbarung",
        summary: "Eine Stelle jetzt, die zweite nur bei Erfolg.",
        resolve: () => ({
          effects: [
            now("Eine Vertrieblerin eingestellt.", { team: 1, flag: "sales" }),
            later(3, "Die neue Vertrieblerin bringt erste Abschlüsse.", { growth: 0.01, revenuePct: 0.04 }),
          ],
        }),
      },
      no: {
        label: "Nicht einstellen",
        summary: "Die Gründerin verkauft weiter selbst.",
        resolve: () => ({ effects: [later(2, "Der Vertrieb bleibt der Engpass.", { growth: -0.004, flag: "sales" })] }),
      },
    },
  },

  {
    id: "marketing",
    title: "Große Werbekampagne für 60.000 €?",
    motion: "Die Geschäftsführung beantragt eine Werbekampagne über 60.000 €.",
    pitch: "„Eine Agentur hat uns eine Kampagne gezeigt, die uns bekannt macht. Plakate, Social Media, Radio. Jetzt oder nie.“",
    context: (s) => `60.000 € sind etwa ${Math.round(60_000 / Math.max(1, burn(s)))} Monatsverbräuche. Wie viel ein neuer Kunde heute kostet, weiß noch niemand genau.`,
    lesson: "unit_economics",
    insight:
      "Werbung lohnt sich, wenn ein Kunde über seine Laufzeit mehr einbringt, als es kostet, ihn zu gewinnen. Wer diese Zahl nicht kennt, sollte erst klein testen.",
    when: (s, age) => age >= 2 && !has(s, "campaign"),
    pull: { growth: 0.6, customer: 0.4, cash: -0.6, control: -0.1 },
    pro: [
      { interest: "growth", text: "Ohne Bekanntheit wachsen wir nur über Empfehlungen. Das ist zu langsam." },
      { interest: "customer", text: "Die Leute kennen uns schlicht nicht." },
    ],
    contra: [
      { interest: "cash", text: "60.000 € ohne zu wissen, was ein Kunde kostet? Das ist Hoffnung, kein Plan." },
      { interest: "control", text: "Agenturen versprechen immer Reichweite. Messbar ist davon wenig." },
      { interest: "product", text: "Wenn neue Kunden kommen, muss das Produkt sie auch halten." },
    ],
    arguments: [
      { id: "awareness", text: "Bekanntheit ist jetzt unser Engpass, nicht das Produkt.", toward: "go", appeals: ["growth", "customer"] },
      { id: "test", text: "Erst ein Test mit 15.000 € und klaren Zielen: Was kostet ein Kunde?", toward: "conditions", appeals: ["cash", "control", "growth"] },
      { id: "no", text: "Das Geld steckt besser im Produkt als in Plakaten.", toward: "no", appeals: ["product", "cash"] },
    ],
    questions: [
      { id: "cac", q: "Was kostet heute ein neuer Kunde?", a: () => "Ehrlich gesagt: Das messen wir noch nicht sauber. Geschätzt zwischen 150 und 400 €." },
      { id: "ltv", q: "Wie lange bleibt ein Kunde im Schnitt?", a: () => "Etwa 14 Monate, Tendenz leicht steigend." },
    ],
    outcomes: {
      go: {
        label: "Kampagne für 60.000 €",
        summary: "Große Kampagne über drei Monate.",
        resolve: (s) => ({
          effects: [now("Kampagne gestartet: 60.000 €.", { cash: -60_000, flag: "campaign" })],
          risk: {
            delay: 1,
            chance: clampChance(0.35 + (axis(s, "market") - 50) / 150 + (axis(s, "product") - 50) / 300),
            good: { revenuePct: 0.22, axes: { market: 5 } },
            bad: { revenuePct: 0.04 },
            goodText: "Die Kampagne zündet: viele neue Kunden zu vernünftigen Kosten.",
            badText: "Viel Aufmerksamkeit, wenige Abschlüsse. Ein Kunde hat am Ende über 900 € gekostet.",
          },
        }),
      },
      conditions: {
        label: "Test mit 15.000 € und klaren Zielen",
        summary: "Kleine Kampagne, gemessen an Kosten pro Kunde.",
        resolve: (s) => ({
          effects: [now("Testkampagne gestartet: 15.000 €.", { cash: -15_000, flag: "campaign" })],
          risk: {
            delay: 1,
            chance: clampChance(0.5 + (axis(s, "market") - 50) / 150),
            good: { revenuePct: 0.07, axes: { market: 2 } },
            bad: { revenuePct: 0.01 },
            goodText: "Der Test zeigt: Ein Kunde kostet 180 €. Jetzt weiß die Firma, wo sich Werbung lohnt.",
            badText: "Der Test zeigt: Werbung bringt hier wenig. Eine teure Kampagne wurde gerade verhindert.",
          },
        }),
      },
      no: {
        label: "Keine Kampagne",
        summary: "Das Geld bleibt in der Kasse.",
        resolve: () => ({ effects: [now("Keine Kampagne.", { flag: "campaign" })] }),
      },
    },
  },

  {
    id: "freemium",
    title: "Eine kostenlose Basisversion einführen?",
    motion: "Die Geschäftsführung beantragt eine dauerhaft kostenlose Basisversion.",
    pitch: "„Alle großen Software-Firmen machen das. Kostenlos rein, später zahlen. Das ist unser Wachstumsmotor.“",
    context: () => "Eine Gratis-Version bringt mehr Nutzer, kostet aber Betrieb und Support. Ob genug davon später zahlen, ist offen.",
    lesson: "unit_economics",
    insight:
      "Ein Gratis-Angebot ist Marketing, das jeden Monat Geld kostet. Es lohnt sich nur, wenn genug Nutzer später zahlen und die Kosten pro Gratis-Nutzer klein sind.",
    when: (s, age) => age >= 3 && s.sector === "Software für Firmen" && !has(s, "freemium"),
    pull: { growth: 0.6, customer: 0.4, cash: -0.4, product: -0.1 },
    pro: [
      { interest: "growth", text: "Gratis senkt die Hürde. Mehr Nutzer heißt mehr zahlende Kunden." },
      { interest: "customer", text: "Kunden wollen erst sehen, dann kaufen." },
    ],
    contra: [
      { interest: "cash", text: "Gratis-Nutzer kosten Server und Support. Die bezahlen wir alle." },
      { interest: "product", text: "Dann bauen wir für Leute, die nie zahlen werden." },
      { interest: "control", text: "Was einmal gratis ist, lässt sich kaum wieder einpreisen." },
    ],
    arguments: [
      { id: "funnel", text: "Mehr Nutzer oben im Trichter bringen unten mehr Kunden.", toward: "go", appeals: ["growth", "customer"] },
      { id: "trial", text: "Eine 30-Tage-Testphase bringt denselben Effekt ohne Dauerkosten.", toward: "conditions", appeals: ["cash", "control"] },
      { id: "focus", text: "Wir sollten zahlende Kunden glücklich machen statt Gratis-Nutzer zu sammeln.", toward: "no", appeals: ["product", "cash"] },
    ],
    questions: [
      { id: "conversion", q: "Wie viele Testnutzer werden heute zahlende Kunden?", a: () => "Etwa 8 % nach einer Demo. Branchenüblich bei Gratis-Versionen sind 2–4 %." },
      { id: "cost", q: "Was kostet ein Gratis-Nutzer im Monat?", a: () => "Etwa 6 € für Server und Support, bei Spitzen mehr." },
    ],
    outcomes: {
      go: {
        label: "Dauerhaft kostenlose Basisversion",
        summary: "Gratis-Version für alle, Bezahlversion mit mehr Funktionen.",
        resolve: () => ({
          effects: [
            now("Gratis-Version gestartet. Die Marge sinkt durch Betriebskosten.", { grossMargin: -0.08, opex: 2_000, flag: "freemium" }),
            later(2, "Viele neue Nutzer, einige zahlen.", { growth: 0.012, axes: { market: 5 } }),
          ],
          risk: {
            delay: 3,
            chance: 0.45,
            good: { revenuePct: 0.08 },
            bad: { grossMargin: -0.05, morale: -3 },
            goodText: "Genug Gratis-Nutzer steigen auf die Bezahlversion um.",
            badText: "Die meisten bleiben gratis. Die Kosten fressen den Effekt auf.",
          },
        }),
      },
      conditions: {
        label: "30 Tage kostenlos testen",
        summary: "Testphase statt Dauer-Gratis.",
        resolve: () => ({
          effects: [
            now("Testphase eingeführt.", { flag: "freemium" }),
            later(2, "Mehr Abschlüsse durch die Testphase.", { growth: 0.008, revenuePct: 0.03 }),
          ],
        }),
      },
      no: {
        label: "Kein Gratis-Angebot",
        summary: "Alles bleibt kostenpflichtig.",
        resolve: () => ({ effects: [now("Kein Gratis-Angebot.", { flag: "freemium" })] }),
      },
    },
  },

  {
    id: "partnership",
    title: "Vertriebspartnerschaft mit {partner}?",
    motion: "Die Geschäftsführung beantragt eine bundesweite Vertriebspartnerschaft mit {partner}, gegen 15 % Provision auf jeden Umsatz.",
    pitch: "„{partner} hat tausende Kunden, die perfekt zu uns passen. Die verkaufen für uns, wir zahlen nur bei Erfolg.“",
    context: () => "Eine Partnerschaft bringt Reichweite ohne eigene Vertriebler, kostet aber Marge und macht abhängig.",
    lesson: "klumpenrisiko",
    insight:
      "Ein großer Vertriebspartner ist ein schneller Hebel, aber er gehört dir nicht. Wer seinen Zugang zum Kunden abgibt, wird austauschbar.",
    when: (s, age) => age >= 3 && !has(s, "partner"),
    pull: { growth: 0.5, customer: 0.3, control: -0.5, cash: 0.1 },
    pro: [
      { interest: "growth", text: "Das ist Reichweite, die wir selbst in Jahren nicht aufbauen." },
      { interest: "cash", text: "Wir zahlen nur bei Erfolg. Kein Risiko für die Kasse." },
    ],
    contra: [
      { interest: "control", text: "Dann gehört der Kontakt zum Kunden {partner}, nicht uns." },
      { interest: "cash", text: "15 % Provision auf alles, für immer? Das frisst unsere Marge." },
      { interest: "product", text: "Der Partner verkauft, was er versteht, nicht was wir können." },
    ],
    arguments: [
      { id: "reach", text: "Reichweite ohne Fixkosten ist genau das, was wir brauchen.", toward: "go", appeals: ["growth", "cash"] },
      { id: "region", text: "Erst eine Region testen, mit Rückgaberecht für die Kundendaten.", toward: "conditions", appeals: ["control", "customer"] },
      { id: "own", text: "Wir bauen den Kundenzugang selbst. Der ist unser Kapital.", toward: "no", appeals: ["control", "product"] },
    ],
    questions: [
      { id: "data", q: "Wem gehören die Kundendaten?", a: () => "Laut Vertragsentwurf {partner}. Wir sehen nur Umsätze." },
      { id: "exit", q: "Wie kommen wir wieder raus?", a: () => "Kündigung mit zwölf Monaten Frist, danach Wettbewerbsverbot für uns bei diesen Kunden." },
    ],
    outcomes: {
      go: {
        label: "Bundesweite Partnerschaft",
        summary: "15 % Provision, mehr Reichweite, Partner hält die Kundendaten.",
        resolve: () => ({
          effects: [
            now("Partnerschaft unterschrieben. Die Provision drückt die Marge.", { grossMargin: -0.09, topCustomer: 0.15, flag: "partner" }),
            later(2, "Der Partner bringt Kunden.", { growth: 0.015, axes: { market: 5, edge: -5 } }),
          ],
        }),
      },
      conditions: {
        label: "Erst eine Region, mit Datenrecht",
        summary: "Test in einer Region, Kundendaten bleiben bei uns.",
        resolve: () => ({
          effects: [
            now("Regionale Partnerschaft gestartet.", { grossMargin: -0.03, flag: "partner" }),
            later(2, "Die Region liefert erste Kunden.", { growth: 0.008, axes: { market: 3 } }),
          ],
        }),
      },
      no: {
        label: "Keine Partnerschaft",
        summary: "Der Vertrieb bleibt in eigener Hand.",
        resolve: () => ({ effects: [now("Keine Partnerschaft.", { flag: "partner" })] }),
      },
    },
  },

  {
    id: "second_product",
    title: "Ein zweites Produkt starten?",
    motion: "Die Geschäftsführung beantragt, ein zweites Produkt zu entwickeln.",
    pitch: "„Unsere Kunden fragen ständig nach einer Erweiterung. Wir könnten das in vier Monaten bauen und doppelt verkaufen.“",
    context: () => "Ein zweites Produkt verspricht mehr Umsatz pro Kunde, bindet aber Entwickler, die am Kernprodukt fehlen.",
    lesson: "opportunitaetskosten",
    insight:
      "Jede Stunde für ein neues Produkt fehlt dem bestehenden. Kleine Firmen gewinnen meist durch ein sehr gutes Produkt, nicht durch zwei mittelmäßige.",
    when: (s, age) => age >= 4 && s.phase !== "beta" && !has(s, "second"),
    pull: { growth: 0.5, product: 0.2, cash: -0.6, team: -0.4, customer: 0.3 },
    pro: [
      { interest: "growth", text: "Mehr Umsatz pro Kunde ist das günstigste Wachstum." },
      { interest: "customer", text: "Die Kunden fragen danach. Wir müssen es nicht erst verkaufen." },
    ],
    contra: [
      { interest: "team", text: "Das Team ist schon jetzt am Limit." },
      { interest: "product", text: "Unser Kernprodukt hat noch zu viele Baustellen." },
      { interest: "cash", text: "Vier Monate Entwicklung ohne Umsatz kosten Reichweite." },
    ],
    arguments: [
      { id: "upsell", text: "Mehr Umsatz pro Kunde ist günstiger als jeder neue Kunde.", toward: "go", appeals: ["growth", "customer"] },
      { id: "prototype", text: "Erst zehn Kunden fragen und einen Prototyp bauen, dann entscheiden.", toward: "conditions", appeals: ["customer", "cash", "product"] },
      { id: "focus", text: "Fokus aufs Kernprodukt. Ein Produkt richtig ist besser als zwei halb.", toward: "no", appeals: ["product", "team"] },
    ],
    questions: [
      { id: "demand", q: "Wie viele Kunden haben konkret gefragt?", a: () => "Vier haben es angesprochen, einer würde sofort einen Vorvertrag unterschreiben." },
      { id: "team", q: "Wer würde das bauen?", a: () => "Zwei der drei Entwickler. Am Kernprodukt bliebe einer." },
    ],
    outcomes: {
      go: {
        label: "Zweites Produkt bauen",
        summary: "Neues Produkt in vier Monaten, eine Stelle mehr.",
        resolve: (s) => ({
          effects: [now("Entwicklung des zweiten Produkts gestartet.", { opex: 4_000, team: 1, flag: "second" })],
          risk: {
            delay: 4,
            chance: clampChance(0.3 + (axis(s, "management") - 50) / 150),
            good: { revenuePct: 0.22, axes: { market: 5 } },
            bad: { morale: -6, axes: { product: -5 } },
            goodText: "Das zweite Produkt verkauft sich an Bestandskunden.",
            badText: "Das zweite Produkt kommt zu spät und halbfertig, das Kernprodukt hat gelitten.",
          },
        }),
      },
      conditions: {
        label: "Erst Kunden befragen, Prototyp in zwei Monaten",
        summary: "Kleiner Test, dann neue Entscheidung.",
        resolve: () => ({
          effects: [
            now("Kundeninterviews und Prototyp: 12.000 €.", { cash: -12_000, flag: "second" }),
            later(2, "Die Interviews schärfen auch das Kernprodukt.", { axes: { product: 3, market: 2 } }),
          ],
        }),
      },
      no: {
        label: "Fokus aufs Kernprodukt",
        summary: "Kein zweites Produkt.",
        resolve: () => ({ effects: [now("Das Team bleibt beim Kernprodukt.", { axes: { product: 4 }, flag: "second" })] }),
      },
    },
  },

  {
    id: "pivot",
    title: "Schwenk auf Firmenkunden?",
    motion: "Die Geschäftsführung beantragt, das Geschäft künftig auf Firmenkunden auszurichten.",
    pitch: "„Unsere besten Kunden sind Firmen, nicht Privatleute. Lasst uns konsequent umschwenken.“",
    context: (s) => `Das Wachstum liegt nur noch bei ${pct(s.metrics.growth)} im Monat. Firmenkunden zahlen mehr, brauchen aber länger zur Entscheidung.`,
    lesson: "pmf",
    insight:
      "Ein Schwenk ist kein Scheitern, sondern Lernen. Er kostet aber erst Umsatz, bevor er welchen bringt. Wer ihn macht, braucht genug Geld für die Durststrecke.",
    when: (s, age) => age >= 4 && s.metrics.growth < 0.035 && !has(s, "pivot"),
    pull: { growth: 0.3, customer: 0.5, product: -0.4, team: -0.3, cash: -0.2 },
    pro: [
      { interest: "customer", text: "Firmenkunden bleiben länger und zahlen mehr." },
      { interest: "growth", text: "So wie jetzt wachsen wir zu langsam, um interessant zu bleiben." },
    ],
    contra: [
      { interest: "cash", text: "Ein Schwenk kostet uns erst Umsatz. Haben wir dafür das Geld?" },
      { interest: "team", text: "Das Team hat für Privatkunden gebaut. Das ist ein halber Neustart." },
      { interest: "product", text: "Firmen brauchen Funktionen, die wir nicht haben." },
    ],
    arguments: [
      { id: "commit", text: "Halbe Schritte bringen nichts. Ganz oder gar nicht.", toward: "go", appeals: ["growth", "customer"] },
      { id: "side", text: "Firmenkunden als zweites Standbein testen, ohne das Bestehende aufzugeben.", toward: "conditions", appeals: ["cash", "team"] },
      { id: "stay", text: "Wir verbessern lieber, was funktioniert, statt neu anzufangen.", toward: "no", appeals: ["product", "team"] },
    ],
    questions: [
      { id: "b2b", q: "Wie viel Umsatz kommt heute schon von Firmen?", a: () => "Etwa ein Drittel, mit steigender Tendenz." },
      { id: "cycle", q: "Wie lange dauert ein Firmenabschluss?", a: () => "Drei bis sechs Monate vom ersten Gespräch bis zum Vertrag." },
    ],
    outcomes: {
      go: {
        label: "Konsequent auf Firmenkunden",
        summary: "Privatkundengeschäft läuft aus, alles für Firmen.",
        resolve: () => ({
          effects: [
            now("Der Schwenk beginnt: Erst sinkt der Umsatz.", { revenuePct: -0.18, morale: -6, flag: "pivot" }),
            later(3, "Erste Firmenkunden unterschreiben.", { growth: 0.03, grossMargin: 0.05, axes: { market: 10 } }),
          ],
        }),
      },
      conditions: {
        label: "Als zweites Standbein testen",
        summary: "Ein kleines Team testet Firmenkunden.",
        resolve: () => ({
          effects: [
            now("Testteam für Firmenkunden.", { opex: 4_000, flag: "pivot" }),
            later(3, "Das Firmengeschäft wächst langsam.", { growth: 0.012, axes: { market: 4 } }),
          ],
        }),
      },
      no: {
        label: "Kein Schwenk",
        summary: "Weiter wie bisher.",
        resolve: () => ({ effects: [later(2, "Das Wachstum bleibt schwach.", { growth: -0.004, flag: "pivot" })] }),
      },
    },
  },

  {
    id: "price_war",
    title: "{competitor} senkt die Preise um 25 %",
    motion: "Die Geschäftsführung beantragt, die eigenen Preise ebenfalls um 15 % zu senken.",
    pitch: "„{competitor} kauft sich den Markt. Wenn wir nicht mitziehen, verlieren wir die Kunden, die gerade überlegen.“",
    context: (s) => `{competitor} hat viel Geld und unterbietet. Der eigene Rohertrag liegt bei ${pct(s.metrics.grossMargin)}.`,
    lesson: "burggraben",
    insight:
      "Gegen einen Konkurrenten mit mehr Geld gewinnt man keinen Preiskampf. Man gewinnt über das, was er nicht kopieren kann: Service, Spezialisierung, Beziehungen.",
    when: (s, age) => age >= 3 && !has(s, "pricewar"),
    pull: { customer: 0.4, growth: 0.2, cash: -0.6, product: -0.2, control: -0.2 },
    pro: [
      { interest: "customer", text: "Kunden vergleichen Preise. Ohne Reaktion verlieren wir die Unentschlossenen." },
      { interest: "growth", text: "Marktanteil ist jetzt wichtiger als Marge." },
    ],
    contra: [
      { interest: "cash", text: "{competitor} hat mehr Geld. Einen Preiskampf verlieren wir sicher." },
      { interest: "product", text: "Wir sind besser. Das sollten wir zeigen, nicht verschenken." },
      { interest: "control", text: "Ein Preis, der einmal unten ist, kommt schwer wieder hoch." },
    ],
    arguments: [
      { id: "match", text: "Wer jetzt Kunden verliert, holt sie nie zurück.", toward: "go", appeals: ["customer", "growth"] },
      { id: "service", text: "Nicht billiger werden, sondern besser: Service-Garantie für Bestandskunden.", toward: "conditions", appeals: ["customer", "product", "cash"] },
      { id: "ignore", text: "Ein Preiskampf gegen mehr Geld ist nicht zu gewinnen. Wir halten still.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [
      { id: "churn", q: "Wie viele Kunden haben schon gekündigt?", a: () => "Bisher drei, alle aus der günstigsten Preisstufe." },
      { id: "theirs", q: "Wie lange hält {competitor} das durch?", a: () => "Nach der letzten Finanzierung vermutlich zwei Jahre." },
    ],
    outcomes: {
      go: {
        label: "Preise um 15 % senken",
        summary: "Mitziehen im Preiskampf.",
        resolve: () => ({
          effects: [
            now("Preise gesenkt: weniger Umsatz pro Kunde, dünnere Marge.", { revenuePct: -0.13, grossMargin: -0.07, flag: "pricewar" }),
            later(2, "Etwas mehr Neukunden.", { growth: 0.005 }),
          ],
        }),
      },
      conditions: {
        label: "Service-Garantie statt Preissenkung",
        summary: "Preise halten, Bestandskunden mit Service binden.",
        resolve: () => ({
          effects: [
            now("Service-Garantie eingeführt: mehr Kosten im Kundenservice.", { opex: 3_000, axes: { edge: 4 }, flag: "pricewar" }),
            later(1, "Einige Preisjäger gehen trotzdem.", { revenuePct: -0.03 }),
          ],
        }),
      },
      no: {
        label: "Stillhalten",
        summary: "Nichts ändern.",
        resolve: (s) => ({
          effects: [now("Die Firma hält still.", { flag: "pricewar" })],
          risk: {
            delay: 2,
            chance: clampChance(0.5 + (axis(s, "edge") - 50) / 120),
            good: {},
            bad: { revenuePct: -0.12, growth: -0.01 },
            goodText: "Die Kunden bleiben. Der Vorsprung im Produkt trägt.",
            badText: "Viele Kunden wechseln zu {competitor}.",
          },
        }),
      },
    },
  },

  {
    id: "payment_terms",
    title: "{customer} will 90 Tage Zahlungsziel",
    motion: "Die Geschäftsführung beantragt, {customer} 90 Tage Zahlungsziel zu gewähren, damit der Vertrag verlängert und ausgeweitet wird.",
    pitch: "„{customer} verlängert und bestellt mehr, wenn sie erst nach 90 Tagen zahlen. Das ist doch nur Papierkram.“",
    context: (s) => `{customer} bringt ${pct(s.metrics.topCustomer)} des Umsatzes. Heute zahlen sie nach 14 Tagen.`,
    lesson: "working_capital",
    insight:
      "Umsatz ist nicht gleich Geld auf dem Konto. Ein langes Zahlungsziel heißt: Du finanzierst deinen Kunden. Bei wenig Reichweite kann das eine profitable Firma zahlungsunfähig machen.",
    when: (s, age) => age >= 2 && s.metrics.topCustomer >= 0.15 && !has(s, "terms"),
    pull: { customer: 0.6, growth: 0.3, cash: -0.6, control: -0.1 },
    pro: [
      { interest: "customer", text: "Großkunden erwarten das. So ist das Spiel." },
      { interest: "growth", text: "Das Zusatzvolumen ist uns sicher." },
    ],
    contra: [
      { interest: "cash", text: "Dann liegen zwei Monatsumsätze von {customer} bei denen statt bei uns. Das spüren wir sofort in der Kasse." },
      { interest: "control", text: "Wer einmal 90 Tage gewährt, bekommt das nie zurück." },
    ],
    arguments: [
      { id: "volume", text: "Das Zusatzvolumen ist es wert.", toward: "go", appeals: ["customer", "growth"] },
      { id: "skonto", text: "60 Tage, dafür 2 % Rabatt bei Zahlung in 14 Tagen.", toward: "conditions", appeals: ["cash", "customer"] },
      { id: "cash", text: "Wir sind keine Bank. Unsere Kasse verträgt das nicht.", toward: "no", appeals: ["cash", "control"] },
    ],
    questions: [
      { id: "amount", q: "Wie viel Geld wäre dann gebunden?", a: (s) => `Etwa ${eur(s.metrics.revenue * s.metrics.topCustomer * 2.5)}, die erst Monate später eingehen.` },
      { id: "alternative", q: "Würde {customer} auch ohne 90 Tage verlängern?", a: () => "Wahrscheinlich ja, aber ohne das zusätzliche Volumen." },
    ],
    outcomes: {
      go: {
        label: "90 Tage Zahlungsziel",
        summary: "Mehr Volumen, Geld kommt drei Monate später.",
        resolve: (s) => ({
          effects: [
            now("90 Tage Zahlungsziel: Geld ist bei {customer} gebunden, dafür mehr Volumen.", {
              cash: -s.metrics.revenue * s.metrics.topCustomer * 2.5,
              revenuePct: 0.1,
              topCustomer: 0.06,
              flag: "terms",
            }),
          ],
        }),
      },
      conditions: {
        label: "60 Tage mit Skonto",
        summary: "Kompromiss mit Anreiz zum schnellen Zahlen.",
        resolve: (s) => ({
          effects: [
            now("60 Tage mit Skonto vereinbart.", {
              cash: -s.metrics.revenue * s.metrics.topCustomer * 1,
              revenuePct: 0.07,
              grossMargin: -0.01,
              flag: "terms",
            }),
          ],
        }),
      },
      no: {
        label: "Beim bisherigen Zahlungsziel bleiben",
        summary: "Keine Zugeständnisse.",
        resolve: () => ({
          effects: [now("Das Zahlungsziel bleibt.", { flag: "terms" })],
          risk: {
            delay: 1,
            chance: 0.55,
            good: {},
            bad: { revenuePct: -0.04 },
            goodText: "{customer} verlängert trotzdem.",
            badText: "{customer} verlagert einen Teil der Bestellungen.",
          },
        }),
      },
    },
  },
];
