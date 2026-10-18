// Lernkarten: kurze, richtige Erklärungen der Begriffe, die im Spiel vorkommen.
// Sie werden durch Entscheidungen oder per Weiterbildung im Kalender freigeschaltet.

export interface Lesson {
  id: string;
  title: string;
  /** Two or three sentences, plain language. */
  summary: string;
  /** Optional rule of thumb or formula. */
  rule?: string;
  example: string;
  /** Where the concept shows up in the game. */
  inGame: string;
}

export const LESSONS: Lesson[] = [
  {
    id: "runway",
    title: "Runway und Burn",
    summary:
      "Burn ist das Geld, das eine Firma pro Monat mehr ausgibt, als sie einnimmt. Runway (Reichweite) sagt, wie viele Monate das vorhandene Geld noch reicht.",
    rule: "Reichweite = Kasse ÷ monatlicher Verbrauch",
    example: "240.000 € Kasse und 30.000 € Verbrauch im Monat: Das Geld reicht 8 Monate.",
    inGame: "Fällt die Reichweite unter drei Monate, kommen Krisen-Vorlagen. Ist die Kasse leer, droht eine Notfinanzierung oder die Insolvenz.",
  },
  {
    id: "unit_economics",
    title: "Unit Economics",
    summary:
      "Was bringt ein einzelner Kunde über seine Lebensdauer, und was kostet es, ihn zu gewinnen? Nur wenn der Wert eines Kunden die Kosten seiner Gewinnung deutlich übersteigt, lohnt sich Wachstum.",
    rule: "Kundenwert (LTV) = Rohertrag pro Monat × Kundenlaufzeit; gesund ist LTV ≥ 3 × Gewinnungskosten (CAC)",
    example: "Ein Abo bringt 18 € Rohertrag im Monat und läuft 14 Monate: 252 € Kundenwert. Kostet ein Kunde 300 € Werbung, verliert die Firma mit jedem Neukunden Geld.",
    inGame: "Werbekampagnen und Gratis-Angebote lohnen sich nur mit guter Produktqualität und Marktstärke.",
  },
  {
    id: "verwaesserung",
    title: "Verwässerung",
    summary:
      "Bei einer Finanzierungsrunde gibt die Firma neue Anteile aus. Alle bisherigen Gesellschafter halten danach einen kleineren Prozentsatz, an einer hoffentlich wertvolleren Firma.",
    rule: "Neuer Anteil = alter Anteil × Bewertung vor dem Geld ÷ Bewertung nach dem Geld",
    example: "Du hältst 12 %. 600.000 € kommen bei 2,4 Mio. € Bewertung vor dem Geld: danach 12 % × 2,4 ÷ 3,0 = 9,6 %.",
    inGame: "Runden, Mitarbeiterbeteiligung und Notfinanzierungen verwässern deinen Anteil. Entscheidend ist, ob der Wert deines Anteils steigt.",
  },
  {
    id: "bewertung",
    title: "Wie eine Firma bewertet wird",
    summary:
      "Junge Firmen werden selten nach Gewinn bewertet, sondern nach Umsatz und Wachstum. Schnell wachsende Firmen bekommen ein höheres Vielfaches ihres Jahresumsatzes.",
    rule: "Bewertung ≈ Jahresumsatz × Multiple; das Multiple steigt mit dem Wachstum",
    example: "150.000 € Jahresumsatz und 6 % Wachstum im Monat: Multiple etwa 6, Bewertung um 0,9 Mio. €.",
    inGame: "Im Spiel steigt das Multiple mit der monatlichen Wachstumsrate. Wachstum ist deshalb oft mehr wert als kurzfristiger Gewinn.",
  },
  {
    id: "due_diligence",
    title: "Due Diligence: Warnsignale finden",
    summary:
      "Bevor du investierst, prüfst du: Zahlen, Kunden, Verträge, Team. Gesucht wird nicht das Positive, das zeigt dir der Gründer ohnehin, sondern das, was er nicht erzählt.",
    example: "Typische Warnsignale: ein Kunde mit mehr als 30 % Umsatz, steigende offene Rechnungen, Gründer, die sich nie widersprechen.",
    inGame: "Die Prüfung eines Deals kostet drei Tage und zeigt die Stärken und Schwächen der Firma.",
  },
  {
    id: "governance",
    title: "Beirat und Gesellschafter: Wer entscheidet was",
    summary:
      "Der Beirat berät und kontrolliert die Geschäftsführung, abgestimmt wird nach Köpfen. Über Kapital, Anteile und die Satzung entscheiden die Gesellschafter, abgestimmt wird nach Anteilen.",
    example: "Als Angel mit 12 % hast du im Beirat eine von sechs Stimmen. Um etwas durchzusetzen, brauchst du Verbündete.",
    inGame: "In der Sitzung zählen Argumente und Vorgespräche. Ein Beirat, der die Gründerin oft überstimmt, verliert ihr Vertrauen.",
  },
  {
    id: "fixkosten",
    title: "Fixkosten und Operating Leverage",
    summary:
      "Fixkosten wie Gehälter und Miete fallen an, egal wie viel verkauft wird. Hohe Fixkosten machen eine Firma in guten Zeiten sehr profitabel und in schlechten sehr verletzlich.",
    example: "Zwei neue Mitarbeiter kosten ab Tag eins 11.000 € im Monat. Ihr Umsatz kommt vielleicht in drei Monaten.",
    inGame: "Einstellungen, Büros und Sparprogramme ändern die Fixkosten und damit die Reichweite sofort.",
  },
  {
    id: "preiselastizitaet",
    title: "Preise und Nachfrage",
    summary:
      "Wie stark Kunden auf Preisänderungen reagieren, heißt Preiselastizität. Weil die Kosten pro Kunde gleich bleiben, wirkt eine Preiserhöhung fast vollständig auf den Rohertrag.",
    example: "Bei 35 % Marge und 20 % höherem Preis steigt der Rohertrag pro Kunde um mehr als die Hälfte. Selbst wenn 10 % der Kunden gehen, bleibt mehr übrig.",
    inGame: "Preiserhöhungen verbessern die Marge, können aber Wachstum und Kunden kosten. Ein Vorsprung im Produkt macht Kunden weniger preisempfindlich.",
  },
  {
    id: "klumpenrisiko",
    title: "Klumpenrisiko",
    summary:
      "Hängt ein großer Teil des Umsatzes an einem Kunden oder Partner, hängt die Firma an dessen Entscheidungen. Käufer und Investoren ziehen dafür einen Abschlag von der Bewertung ab.",
    rule: "Faustregel: Kein Kunde sollte mehr als 20–30 % des Umsatzes bringen.",
    example: "Ein Kunde mit 58 % Umsatz kündigt: Die Firma verliert über die Hälfte ihrer Einnahmen auf einmal.",
    inGame: "Exklusivverträge und große Partner steigern den Umsatz, erhöhen aber den Anteil des größten Kunden.",
  },
  {
    id: "working_capital",
    title: "Working Capital: Gewinn ist nicht Geld",
    summary:
      "Eine Firma kann profitabel sein und trotzdem zahlungsunfähig werden, wenn Kunden spät zahlen und Lieferanten früh Geld wollen. Das gebundene Geld heißt Working Capital.",
    example: "Ein Kunde mit 10.000 € Umsatz im Monat zahlt nach 90 statt 14 Tagen: Rund 25.000 € fehlen dauerhaft in der Kasse.",
    inGame: "Längere Zahlungsziele bringen mehr Umsatz, kosten aber sofort Kasse.",
  },
  {
    id: "leverage",
    title: "Eigenkapital oder Kredit",
    summary:
      "Eigenkapital kostet Anteile, muss aber nicht zurückgezahlt werden. Ein Kredit kostet keine Anteile, muss aber in jedem Monat bedient werden. Mehr Kredit heißt mehr Hebel: Gute Zeiten werden besser, schlechte gefährlicher.",
    rule: "Je unsicherer die Einnahmen, desto mehr Eigenkapital braucht eine Firma.",
    example: "200.000 € Kredit zu 9 % kosten anfangs rund 9.500 € im Monat für Zinsen und Tilgung, auch wenn der Umsatz ausbleibt.",
    inGame: "Der CFO-Forecast zeigt beides nebeneinander: Eigenkapital verwässert, Kredit belastet die Reichweite.",
  },
  {
    id: "erwartungswert",
    title: "Risiko und Erwartungswert",
    summary:
      "Riskante Entscheidungen vergleicht man über den Erwartungswert: Wahrscheinlichkeit mal Ergebnis. Eine gute Entscheidung kann schlecht ausgehen, eine schlechte gut. Bewertet wird die Entscheidung mit dem Wissen von damals.",
    rule: "Erwartungswert = Σ Wahrscheinlichkeit × Ergebnis",
    example: "60 % Chance auf einen Schaden von 60.000 € sind im Schnitt 36.000 €. Ein Audit für 25.000 € ist dann die günstigere Wahl.",
    inGame: "Nach jeder Sitzung siehst du Urteil und Ergebnis getrennt. Deine Reputation wächst vor allem mit gutem Urteil.",
  },
  {
    id: "opportunitaetskosten",
    title: "Opportunitätskosten und Fokus",
    summary:
      "Jede Entscheidung für etwas ist eine Entscheidung gegen etwas anderes. Die Kosten einer Sache sind auch das, was man mit derselben Zeit und demselben Geld sonst hätte erreichen können.",
    example: "Vier Monate Förderantrag heißt vier Monate weniger Vertrieb durch die Gründerin.",
    inGame: "Auch deine Zeit hat Opportunitätskosten: 20 Arbeitstage im Monat reichen nie für alles.",
  },
  {
    id: "esop",
    title: "Mitarbeiterbeteiligung",
    summary:
      "Mit Optionen werden Mitarbeiter zu Mitbesitzern. Das schont die Kasse und bindet Talente, verwässert aber alle Gesellschafter. Optionen werden meist über vier Jahre verdient.",
    example: "Ein Pool von 8 % kostet dich bei 12 % Anteil knapp einen Prozentpunkt.",
    inGame: "Optionspools heben Stimmung und Management, kosten aber Anteil.",
  },
  {
    id: "pmf",
    title: "Product-Market-Fit und Pivot",
    summary:
      "Product-Market-Fit heißt: Kunden wollen das Produkt so sehr, dass es sich fast von selbst verkauft. Fehlt er, hilft kein Marketing. Dann kann ein Schwenk auf andere Kunden oder ein anderes Produkt nötig sein.",
    example: "Wächst eine Firma trotz Werbung kaum, während eine kleine Kundengruppe begeistert ist, liegt der Fit vielleicht genau dort.",
    inGame: "Ein Schwenk kostet erst Umsatz und Stimmung, kann aber die Wachstumsrate dauerhaft heben.",
  },
  {
    id: "burggraben",
    title: "Burggraben: Was dich schützt",
    summary:
      "Ein Burggraben ist das, was Konkurrenten schwer kopieren können: ein besseres Produkt, Kundenbeziehungen, Daten, eine Marke. Ohne ihn bleibt im Preiskampf nur, wer am meisten Geld hat.",
    example: "Eine Firma mit treuen Kunden verliert kaum jemanden, wenn ein Konkurrent die Preise senkt.",
    inGame: "Der Vorsprung im Benchmark entscheidet, wie stark Preissenkungen der Konkurrenz wirken.",
  },
  {
    id: "schluesselpersonen",
    title: "Schlüsselpersonen-Risiko",
    summary:
      "Hängt wichtiges Wissen an einer einzigen Person, ist das ein Risiko für die ganze Firma. Gute Firmen verteilen Wissen bewusst, auch wenn das kurzfristig langsamer macht.",
    example: "Kündigt der einzige Entwickler, der den Code versteht, stehen neue Funktionen monatelang still.",
    inGame: "Kündigungen von Schlüsselpersonen senken die Produktstärke deutlich.",
  },
];

/** Order in which "Weiterbildung" unlocks cards. */
export const CURRICULUM = [
  "runway",
  "unit_economics",
  "verwaesserung",
  "bewertung",
  "due_diligence",
  "governance",
  "fixkosten",
  "preiselastizitaet",
  "klumpenrisiko",
  "working_capital",
  "leverage",
  "erwartungswert",
  "opportunitaetskosten",
  "esop",
  "pmf",
  "burggraben",
  "schluesselpersonen",
];

export function lessonOf(id: string): Lesson {
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) throw new Error(`Unknown lesson ${id}`);
  return lesson;
}
