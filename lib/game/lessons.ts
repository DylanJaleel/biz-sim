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
  {
    id: "pre_post_money",
    title: "Pre-Money und Post-Money",
    summary:
      "Die Bewertung vor dem Geld (Pre-Money) ist der Preis der Firma, bevor Investoren einzahlen. Dazu kommt das neue Geld, das ergibt die Bewertung nach dem Geld (Post-Money). Der Anteil der Investoren ist ihr Geld geteilt durch Post-Money.",
    rule: "Post-Money = Pre-Money + neues Geld; Anteil neuer Investoren = neues Geld ÷ Post-Money",
    example: "2 Mio. € Pre-Money und 500.000 € frisches Geld: 2,5 Mio. € Post-Money. Die neuen Investoren halten 20 %.",
    inGame: "Jede Finanzierungsrunde zeigt Pre-Money, Post-Money und was mit deinem Anteil passiert.",
  },
  {
    id: "pro_rata",
    title: "Pro-rata-Recht",
    summary:
      "Wer schon beteiligt ist, darf in einer neuen Runde meist so viel nachlegen, dass sein Anteil gleich bleibt. Das kostet Geld, schützt aber vor Verwässerung. Wer nicht mitzieht, behält seine Anteile, aber einen kleineren Prozentsatz.",
    rule: "Nachschuss für gleichen Anteil = dein Anteil × Rundengröße",
    example: "Du hältst 10 %, die Runde ist 400.000 € groß: Mit 40.000 € bleibst du bei 10 %.",
    inGame: "In jeder Runde kannst du nicht mitziehen, pro rata nachlegen oder die Runde anführen.",
  },
  {
    id: "down_round",
    title: "Down Round",
    summary:
      "Eine Runde zu einem niedrigeren Preis als zuvor heißt Down Round. Frühe Gesellschafter verlieren dabei besonders viel. Trotzdem kann sie richtig sein: Ein kleineres Stück einer lebenden Firma ist mehr wert als ein großes Stück einer insolventen.",
    example: "Die Firma war 2 Mio. € wert und bekommt Geld nur zu 1,4 Mio. €. Alte Angels werden deutlich stärker verwässert als geplant.",
    inGame: "Brückenrunden mit niedrigem Preis stoßen in der Gesellschafterversammlung auf Widerstand der frühen Investoren.",
  },
  {
    id: "stimmrechte",
    title: "Stimmrechte und Mehrheit",
    summary:
      "Im Beirat zählt jede Stimme gleich. In der Gesellschafterversammlung zählt das Kapital: Wer mehr Anteile hat, hat mehr Stimmen. Über 50 % entscheidest du die meisten Fragen allein, für Satzungsänderungen braucht es oft 75 %.",
    rule: "Einfache Mehrheit: mehr als die Hälfte der abgegebenen Stimmen; qualifizierte Mehrheit: meist 75 %",
    example: "Gründerin 45 %, Fonds 30 %, du 15 %, Angels 10 %: Gründerin und Fonds zusammen setzen alles durch.",
    inGame: "Finanzierungsrunden brauchen die Zustimmung der Gesellschafterversammlung. Ab über 50 % bist du Mehrheitsgesellschafter.",
  },
  {
    id: "secondary",
    title: "Anteile kaufen (Secondary)",
    summary:
      "Nicht jede Beteiligung entsteht in einer Runde. Bestehende Gesellschafter können ihre Anteile verkaufen, meist mit Abschlag, weil sie Liquidität wollen. Für Käufer ist das ein Weg zu mehr Einfluss, ohne dass die Firma Geld bekommt.",
    example: "Ein Angel will nach fünf Jahren aussteigen und verkauft seine 4 % mit 15 % Abschlag auf die letzte Bewertung.",
    inGame: "Angebote kommen von selbst oder über dein Netzwerk. Mit genug Vertrauen verkaufen auch Gründer einen Teil.",
  },
  {
    id: "netzwerk",
    title: "Netzwerk als Kapital",
    summary:
      "Ein guter Kontakt bringt Kunden, Personal, Kredite oder Investoren schneller als jede Anzeige. Beziehungen brauchen Pflege: Wer nur anruft, wenn er etwas will, verbraucht sein Netzwerk.",
    example: "Eine Empfehlung an den richtigen Einkäufer verkürzt einen Verkauf von neun Monaten auf sechs Wochen.",
    inGame: "Kontakte pflegen kostet einen Tag. Einen Kontakt in eine Firma einbringen kostet Wärme, und erst ab einem guten Ruf öffnen sich die äußeren Ringe.",
  },
  {
    id: "liquiditaet",
    title: "Liquidität",
    summary:
      "Vermögen ist nicht gleich verfügbares Geld. Startup-Anteile lassen sich oft jahrelang nicht verkaufen, Aktien an einem Tag. Wer alles in Unverkäufliches steckt, muss im Notfall mit Abschlag verkaufen.",
    rule: "Reserve für 6 bis 12 Monate Lebenshaltung plus geplante Nachschüsse liquide halten",
    example: "Ein Angel hält 400.000 € in Startup-Anteilen und 5.000 € auf dem Konto. Kommt eine Runde, kann er nicht mitziehen und wird verwässert.",
    inGame: "Lebenshaltung kostet jeden Monat Geld. Rutscht das Konto zu tief ins Minus, verkauft die Bank erst dein Depot und dann deinen kleinsten Anteil mit Abschlag.",
  },
  {
    id: "diversifikation",
    title: "Diversifikation",
    summary:
      "Wer sein Geld auf verschiedene Anlagen verteilt, deren Werte sich nicht im Gleichschritt bewegen, senkt das Risiko, ohne viel Rendite aufzugeben. Startups, Aktien und Anleihen reagieren unterschiedlich auf das Marktklima.",
    example: "Im Crash fällt der Tech-Index um 20 %, der Anleihen-Fonds kaum. Ein gemischtes Depot verliert deutlich weniger als ein reines Tech-Depot.",
    inGame: "Vier Anlagen an der Börse, alle am selben Marktklima, aber unterschiedlich stark. Im schwachen Markt werden auch Startup-Runden schwieriger und billiger.",
  },
  {
    id: "dividendenrendite",
    title: "Dividenden- und Zinsrendite",
    summary:
      "Die laufende Rendite zeigt, wie viel eine Anlage jedes Jahr ausschüttet, gemessen am Preis. Sie ist planbar, aber nicht alles: Fällt der Kurs, kann ein Jahr Dividende in einem Monat weg sein.",
    rule: "Dividendenrendite = Ausschüttung pro Jahr ÷ Kurs",
    example: "50.000 € in Dividenden-Aktien mit 3,2 % Rendite bringen 1.600 € im Jahr, also 400 € pro Quartal.",
    inGame: "Tagesgeld und Anleihen zahlen monatlich, Dividenden-Aktien jedes Quartal, der Tech-Index gar nicht.",
  },
  {
    id: "liquidationspraeferenz",
    title: "Liquidationspräferenz",
    summary:
      "Investoren, die in einer Runde Geld geben, bekommen beim Verkauf der Firma zuerst ihr Geld zurück. Erst danach wird der Rest nach Anteilen verteilt. Bei einer einfachen, nicht partizipierenden Präferenz wählt der Investor das Bessere: Geld zurück oder seinen Anteil am Kaufpreis.",
    rule: "Erlös = max(eingezahltes Geld, Anteil × Restkaufpreis)",
    example: "Ein Fonds hat 1 Mio. € für 20 % gegeben. Bei 3 Mio. € Kaufpreis nimmt er 1 Mio. € zurück statt 600.000 €; die anderen teilen 2 Mio. €.",
    inGame: "Bei jedem Verkauf zeigt die Gesellschafterversammlung den Wasserfall: wer zuerst bezahlt wird und was für dich übrig bleibt.",
  },
  {
    id: "carry",
    title: "Syndikat und Carry",
    summary:
      "Wer ein Syndikat anführt, bündelt das Geld anderer Angels und investiert es gemeinsam. Dafür bekommt er einen Anteil am Gewinn des Syndikats, den Carry. Verliert das Syndikat Geld, gibt es keinen Carry.",
    rule: "Carry = 20 % × (Erlös des Syndikats − eingezahltes Geld)",
    example: "Das Syndikat gibt 200.000 € und erhält beim Verkauf 600.000 €. Der Gewinn beträgt 400.000 €, dein Carry 80.000 €.",
    inGame: "Ab 45 Ruf und mit einem warmen Draht zum Angel-Club kannst du Runden mit einem Syndikat anführen.",
  },
  {
    id: "aufsichtsrat",
    title: "Aufsichtsrat",
    summary:
      "Der Aufsichtsrat bestellt und kontrolliert den Vorstand einer Aktiengesellschaft. In großen deutschen Firmen sitzen dort auch Vertreter der Belegschaft. Er führt nicht selbst, aber er entscheidet über große Investitionen, Zukäufe und die Vergütung des Vorstands.",
    rule: "Der Vorstand führt, der Aufsichtsrat kontrolliert.",
    example: "Der Vorstand will ein Werk verlagern. Der Aufsichtsrat wägt Marge gegen Streikrisiko ab und stimmt mit Auflagen zu.",
    inGame: "Mit hohem Ruf bietet dir die Nordhafen AG ein Mandat an: feste Vergütung, eine Sitzung pro Quartal, keine Anteile.",
  },
  {
    id: "kapitalallokation",
    title: "Kapitalallokation",
    summary:
      "Jeder Euro Gewinn kann ausgeschüttet, investiert, für Zukäufe genutzt oder zur Schuldentilgung verwendet werden. Gute Kapitalallokation gibt Geld dorthin, wo es am meisten verdient, und schüttet aus, wenn es nichts Besseres gibt.",
    rule: "Investieren lohnt, wenn die erwartete Rendite höher ist als das, was die Eigentümer anderswo bekämen.",
    example: "Ein Programm verspricht 12 % Rendite, erfahrungsgemäß werden es 8 %. Bekommen Aktionäre am Markt 6 %, lohnt es sich knapp.",
    inGame: "Im Aufsichtsrat und bei deinem eigenen Geld: Börse, Startups und Büro konkurrieren um dasselbe Kapital.",
  },
  {
    id: "lbo",
    title: "Kauf mit Kredit (Leveraged Buyout)",
    summary:
      "Wer eine Firma kauft, muss nicht alles selbst bezahlen: Eine Bank leiht einen Teil des Kaufpreises. Das hebt die Rendite auf das eigene Geld, solange die Gewinne die Raten tragen. Läuft es schlecht, frisst die Rate das Eigenkapital.",
    rule: "Lohnt sich, wenn Ausschüttungen und Wertzuwachs größer sind als Zins und Tilgung.",
    example: "Kaufpreis 2 Mio. €, davon 800.000 € Kredit zu 5,5 %: Die Rate liegt bei rund 10.000 € im Monat. Schüttet die Firma 15.000 € im Monat aus, bleibt Geld übrig.",
    inGame: "Bei einer Nachfolge kannst du 40 % des Kaufpreises über die Bank finanzieren. Die Rate läuft acht Jahre über dein Konto.",
  },
  {
    id: "ausschuettung",
    title: "Ausschüttung",
    summary:
      "Eine Firma, die Geld verdient, kann es behalten und investieren oder an die Eigentümer auszahlen. Wer die Mehrheit hält, entscheidet darüber. Eine gesunde Firma behält eine Reserve für schlechte Monate.",
    rule: "Ausschüttung = (Kasse − Reserve) × Ausschüttungsquote, verteilt nach Anteilen.",
    example: "Kasse 500.000 €, Reserve drei Monatskosten von je 100.000 €: Von 200.000 € Überschuss werden 70 % ausgeschüttet, bei 70 % Anteil bekommst du 98.000 €.",
    inGame: "Firmen, an denen du (mit deinem Fonds) die Mehrheit hältst und die Geld verdienen, schütten jedes Quartal aus.",
  },
  {
    id: "fonds",
    title: "Fonds: LPs, Gebühr, Carry",
    summary:
      "Ein Fonds sammelt Geld von Investoren (Limited Partners) ein und legt es in Firmen an. Der Manager bekommt eine jährliche Verwaltungsgebühr und einen Anteil am Gewinn, den Carry. Die Investoren bekommen ihr Geld zurück, wenn Beteiligungen verkauft werden.",
    rule: "Üblich: 2 % Gebühr pro Jahr, 20 % Carry auf den Gewinn.",
    example: "Ein Fonds über 5 Mio. € bringt 100.000 € Gebühr im Jahr. Verkauft er eine Beteiligung für 3 Mio. €, die 1 Mio. € gekostet hat, gehen 400.000 € Carry an den Manager.",
    inGame: "Mit Family Office, 80 Ruf und einem erfolgreichen Verkauf kannst du einen Fonds auflegen. Er investiert bei jedem neuen Einstieg das Doppelte deines Tickets.",
  },
  {
    id: "ipo",
    title: "Börsengang und Lock-up",
    summary:
      "Beim Börsengang (IPO) werden Aktien einer Firma öffentlich handelbar. Bisherige Eigentümer dürfen meist nicht sofort alles verkaufen: Eine Sperrfrist (Lock-up) von sechs bis zwölf Monaten soll den Kurs schützen. Bis dahin schwankt der Wert mit dem Markt.",
    rule: "Erlös = sofort verkaufter Teil + gesperrter Teil × (Kurs nach der Sperrfrist ÷ Kurs beim Börsengang)",
    example: "Dein Anteil ist beim Börsengang 1 Mio. € wert. 500.000 € bekommst du sofort; fällt der Markt in sechs Monaten um 20 %, bringt der Rest 400.000 €.",
    inGame: "Große, wachsende Firmen (ab 12 Mio. € Wert) bekommen manchmal das Angebot eines Börsengangs. Die gesperrte Hälfte folgt dem Tech-Index.",
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
  "pre_post_money",
  "pro_rata",
  "stimmrechte",
  "down_round",
  "secondary",
  "netzwerk",
  "liquiditaet",
  "diversifikation",
  "dividendenrendite",
  "liquidationspraeferenz",
  "carry",
  "aufsichtsrat",
  "kapitalallokation",
  "lbo",
  "ausschuettung",
  "fonds",
  "ipo",
];

export function lessonOf(id: string): Lesson {
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) throw new Error(`Unknown lesson ${id}`);
  return lesson;
}
