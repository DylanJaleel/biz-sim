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
    summary: "Burn ist das Geld, das eine Firma pro Monat mehr ausgibt, als sie einnimmt. Runway (Reichweite) sagt, wie viele Monate das vorhandene Geld noch reicht.",
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
    summary: "Junge Firmen werden selten nach Gewinn bewertet, sondern nach Umsatz und Wachstum. Schnell wachsende Firmen bekommen ein höheres Vielfaches ihres Jahresumsatzes.",
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
    id: "reziprozitaet",
    title: "Beziehungskapital und Gegenseitigkeit",
    summary:
      "Ein Netzwerk ist kein Automat, sondern ein Konto: Wer Gefallen tut, darf später um Gefallen bitten. Wer nur nimmt, bekommt irgendwann ein Nein. Beziehungskapital wächst langsam und ist schnell verbraucht.",
    rule: "Erst geben, dann nehmen. Eine abgelehnte Bitte kostet weniger als eine, die man unbeantwortet liegen lässt.",
    example: "Die Steuerberaterin bittet dich, einen Mandanten anzusehen. Zwei Tage später hilft sie deiner Firma doppelt so gern und fragt nicht, was es kostet.",
    inGame:
      "Kontakte bitten per Post um Gefallen. Zusagen kostet Tage, Geld oder ein kleines Risiko und füllt das Vertrauenskonto. Ist es gut gefüllt, helfen sie stärker und öfter; ist es leer, sagen sie Nein.",
  },
  {
    id: "warm_intro",
    title: "Warm Intro",
    summary:
      "Eine Empfehlung von jemandem, dem beide Seiten vertrauen, öffnet Türen, an denen kalte Anfragen abprallen. Investoren, Einkäufer und Banken lesen eine warme Empfehlung zuerst.",
    rule: "Die Empfehlung ist so viel wert wie das Vertrauen in den, der empfiehlt.",
    example: "Eine kalte E-Mail an eine VC-Partnerin wird in einem von hundert Fällen beantwortet. Eine Empfehlung ihres Lieblingsgründers fast immer.",
    inGame: "„Einbringen“ und der Hinweis vor einer Sitzung sind Warm Intros: Sie kosten Wärme, nicht Tage. Je höher die Person aufgestiegen ist, desto mehr wiegt ihre Hilfe.",
  },
  {
    id: "deal_sourcing",
    title: "Deal Sourcing",
    summary:
      "Gute Investoren warten nicht auf Angebote, sie finden sie. Deals aus dem eigenen Netzwerk (proprietär) sind oft günstiger als Auktionen, in denen viele Bieter den Preis treiben.",
    rule: "Jeder zusätzliche Bieter kostet Rendite. Wer die Inhaberin zuerst kennt, verhandelt allein.",
    example: "Eine Nachfolge über eine Empfehlung kostet 4,5 × EBITDA, dieselbe Firma in der Auktion einer Boutique 5,2 ×.",
    inGame:
      "Gefallen, Veranstaltungen und Spezialisten bringen Deals und Mandate. Bietet ein Kontakt bei derselben Firma mit, steigt der Preis, bis die Beziehung warm genug ist, dass er zurückzieht.",
  },
  {
    id: "berater_mna",
    title: "Berater im M&A-Prozess",
    summary:
      "Bei einem Firmenkauf arbeiten viele mit: Wirtschaftsprüfer prüfen Zahlen und Steuern, Anwälte die Verträge, Banken strukturieren den Kredit, Kartellrechtler melden den Zusammenschluss an, Interim-Manager halten den Betrieb in der Übergabe zusammen.",
    rule: "Berater kosten Geld, Fehler ohne sie meist mehr.",
    example: "Die Legal DD findet eine Change-of-Control-Klausel des größten Kunden. Ohne Prüfung hätte der Käufer 20 % Umsatz verloren.",
    inGame:
      "Spezialisten aus Ring 2 und 3 helfen bei Übernahmen, Mandaten und Plattformen: günstigere Prüfung, mehr Spielraum beim Covenant, weniger Kartellrisiko, ruhigere Übergaben.",
  },
  {
    id: "netzwerk_events",
    title: "Netzwerk-Veranstaltungen",
    summary:
      "Konferenzen, Galas und Empfänge sind teuer und kosten Zeit, aber man trifft viele auf einmal und lernt neue Leute kennen. Wer auf der Bühne steht, wird angesprochen, statt selbst ansprechen zu müssen.",
    rule: "Ein Abend mit fünf Bekannten ersetzt fünf Einzeltermine, aber nur, wenn die Richtigen da sind.",
    example: "Auf der M&A-Konferenz triffst du die Wirtschaftsprüferin, den Anwalt und die Bankerin, und in der Kaffeepause fragt jemand nach einem Mandat.",
    inGame: "Einladungen kommen einen Monat vorher in die Post. Wer zusagt, steht im Kalender. Manche Termine gibt es erst ab einem gewissen Ruf, Vorträge bringen Ruf.",
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
    inGame: "Ab 50 Ruf und mit einem warmen Draht zum Angel-Club kannst du Runden mit einem Syndikat anführen.",
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
    inGame:
      "Familienbetriebe kaufst du mit Bankkredit bis 3× EBITDA. Der Kredit liegt in der Firma: Sie zahlt Zins und Tilgung aus ihrem Ertrag, und die Bank achtet auf den Covenant. Ältere Nachfolgen laufen mit einem Kaufkredit über dein Konto.",
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
    inGame:
      "Mit 85 Ruf, zwei erfolgreichen Verkäufen und einem Family Office, das seit einem Jahr läuft, kannst du einen Fonds auflegen. Er investiert bei jedem neuen Einstieg das Doppelte deines Tickets.",
  },
  {
    id: "ipo",
    title: "Börsengang und Lock-up",
    summary:
      "Beim Börsengang (IPO) werden Aktien einer Firma öffentlich handelbar. Bisherige Eigentümer dürfen meist nicht sofort alles verkaufen: Eine Sperrfrist (Lock-up) von sechs bis zwölf Monaten soll den Kurs schützen. Bis dahin schwankt der Wert mit dem Markt.",
    rule: "Erlös = sofort verkaufter Teil + gesperrter Teil × (Kurs nach der Sperrfrist ÷ Kurs beim Börsengang)",
    example: "Dein Anteil ist beim Börsengang 1 Mio. € wert. 500.000 € bekommst du sofort; fällt der Markt bis zum Ende der Sperrfrist um 20 %, bringt der Rest 400.000 €.",
    inGame: "Große, wachsende Firmen (ab 12 Mio. € Wert) bekommen manchmal das Angebot eines Börsengangs. Die gesperrte Hälfte ist zwölf Monate gesperrt und folgt dem Tech-Index.",
  },
  {
    id: "covenants",
    title: "Auflagen und Covenants",
    summary:
      "Investoren und Banken sagen selten einfach Ja. Sie knüpfen ihr Geld an Bedingungen: Covenants sind vereinbarte Kennzahlen, etwa eine Mindestkasse oder eine Höchstverschuldung. Reißt eine, darf der Geldgeber nachverhandeln oder kündigen.",
    rule: "Eine gute Auflage trifft das eigentliche Risiko. Eine Auflage, die nichts absichert, kostet nur Zeit und Vertrauen.",
    example: "Ein Kredit über 500.000 € mit der Auflage: Die Kasse darf nie unter drei Monatskosten fallen. Fällt sie darunter, muss die Firma der Bank einen Sparplan vorlegen.",
    inGame:
      "Wer im Beirat „Auflagen“ wählt, sagt auch welche. Jedes Themenfeld (Finanzierung, Team, Produkt, Ausschüttung, Zukauf, Vertrieb, Führung, Krise) hat drei eigene Auflagen, eine davon passt. Welche, verrät die Rückfrage zum Risiko, der CFO oder ein Vorgespräch. Eine Auflage wirkt einen Monat später und nur ganz, wenn du sie im Folgetermin nachprüfst.",
  },
  {
    id: "stage_gate",
    title: "Stage-Gate und Meilensteinfinanzierung",
    summary:
      "Geld kommt nicht auf einmal, sondern in Tranchen. Die nächste Tranche gibt es erst, wenn ein vorher vereinbarter Meilenstein erreicht ist, etwa ein Umsatzziel oder ein fertiges Produkt. So begrenzt der Geldgeber seinen Schaden, wenn ein Vorhaben scheitert.",
    rule: "Lohnt sich bei großem Einsatz und unsicherem Ausgang. Bei einem sicheren Vorhaben kostet es nur Tempo.",
    example: "Statt 300.000 € für ein neues Produkt: 100.000 € jetzt, der Rest nach 50 zahlenden Testkunden. Scheitert der Test, sind 200.000 € gerettet.",
    inGame:
      "Auflagen mit Stufen („Freigabe nach Meilenstein“, „Auszahlung in Tranchen“, „Übernahme in Stufen“) passen zu großen Wetten mit offenem Ausgang, etwa einem zweiten Produkt oder einem Zukauf.",
  },
  {
    id: "zustimmungsvorbehalt",
    title: "Zustimmungsvorbehalt",
    summary:
      "Bestimmte Geschäfte darf die Geschäftsführung nur mit Zustimmung des Beirats oder Aufsichtsrats abschließen, etwa große Einstellungen, Kredite oder Verträge über einer Wertgrenze. Das steht in der Satzung oder Geschäftsordnung.",
    rule: "Ein Vetorecht schützt, wo Vertrauen oder Erfahrung fehlen. Wo die Führung es im Griff hat, wirkt es wie Misstrauen und bremst.",
    example: "Einstellungen über 80.000 € Jahresgehalt und alle Verträge über 50.000 € brauchen die Zustimmung des Beirats.",
    inGame: "Der „Zustimmungskatalog“ und der „Stellenplan mit Freigabe“ passen, wenn das Vertrauen in die Steuerung angeschlagen ist oder der Plan schnell Personal aufbaut.",
  },
  {
    id: "pilotprojekt",
    title: "Pilotprojekt und Testmarkt",
    summary:
      "Bevor eine Firma etwas groß ausrollt, testet sie es im Kleinen: in einer Stadt, mit wenigen Kunden, für ein paar Monate. Der Pilot liefert den Beleg, dass Kunden wirklich kaufen, bevor das große Geld fließt.",
    rule: "Ein Pilot lohnt sich, wenn die Nachfrage die offene Frage ist. Ist sie belegt, verschenkt er nur Zeit.",
    example:
      "Ein Lieferdienst startet erst in Köln-Ehrenfeld. Nach drei Monaten zeigt sich: Nur ein Drittel der Kunden bestellt ein zweites Mal. Der große Start wird verschoben und das Angebot verbessert.",
    inGame:
      "Auflagen wie „Erst ein Testmarkt“, „Erst mit einem Teil der Kunden“ oder „Testphase mit Zielen“ passen zu Expansionen, neuen Preisen und neuen Angeboten, besonders bei schwacher Marktstellung.",
  },
  {
    id: "budgetdeckel",
    title: "Budgetdeckel",
    summary: "Ein Vorhaben bekommt eine feste Obergrenze für Ausgaben (Cap). Was darüber hinausgeht, muss neu genehmigt werden. Das schützt die Kasse, wenn Kosten davonlaufen.",
    rule: "Der Deckel passt, wenn das Geld knapp ist. Ist genug da, bremst er nur.",
    example: "Die Werbekampagne darf höchstens 40.000 € kosten statt der geplanten 60.000 €. Bringen die ersten 40.000 € genug Kunden, wird nachgelegt.",
    inGame: "Auflagen mit Deckel („Fester Projektdeckel“, „Krisenbudget mit Deckel“, „Kreditrahmen mit Deckel“) passen bei kurzer Reichweite und teuren Plänen.",
  },
  {
    id: "kreditrahmen",
    title: "Kreditrahmen (Kreditlinie)",
    summary:
      "Statt eines festen Darlehens, das auf einmal ausgezahlt wird, bekommt die Firma einen Rahmen, aus dem sie bei Bedarf Geld abruft. Zinsen fallen nur auf den genutzten Teil an. Ein Deckel begrenzt, wie viel pro Monat abgerufen werden darf.",
    rule: "Ein gedeckelter Rahmen passt, wenn das Geld knapp ist und die Kosten sonst mitwachsen würden.",
    example: "Die Bank sagt 200.000 € zu, abrufbar höchstens 30.000 € im Monat. Die Firma zahlt Zinsen nur auf das, was sie wirklich braucht.",
    inGame: "Die Auflage „Kreditrahmen mit Deckel“ gehört zum Themenfeld Finanzierung und passt bei kurzer Reichweite.",
  },
  {
    id: "mindestkasse",
    title: "Mindestkasse (Liquiditätsreserve)",
    summary:
      "Eine Firma hält immer einen Puffer an Geld, der nicht verteilt und nicht investiert wird. Er fängt schwache Monate, späte Zahlungen und Überraschungen ab. Ausgeschüttet wird nur, was darüber liegt.",
    rule: "Faustregel: drei bis sechs Monatskosten als Reserve, mehr bei schwankendem Geschäft.",
    example: "Monatskosten 80.000 €, Mindestkasse 480.000 €. Liegen 700.000 € auf dem Konto, dürfen höchstens 220.000 € ausgeschüttet werden.",
    inGame: "Die Auflage „Mindestkasse halten“ gehört zum Themenfeld Ausschüttung und passt, wenn die Reichweite nach der Ausschüttung zu kurz würde.",
  },
  {
    id: "garantien",
    title: "Garantien im Kaufvertrag",
    summary:
      "Beim Kauf einer Firma sichert der Verkäufer im Vertrag zu, dass bestimmte Angaben stimmen, etwa Umsatz, Schulden oder laufende Verträge (Representations & Warranties). Stellt sich eine Angabe als falsch heraus, muss er den Schaden ersetzen.",
    rule: "Je weniger man vor der Unterschrift prüfen kann, desto wichtiger sind Garantien.",
    example: "Der Verkäufer garantiert ein EBITDA von 1,2 Mio. €. Es waren nur 1,0 Mio. €: Er zahlt einen Teil des Kaufpreises zurück.",
    inGame: "Die Auflage „Garantien im Kaufvertrag“ gehört zum Themenfeld Zukauf und passt, wenn die Zahlen unsicher sind.",
  },
  {
    id: "margenuntergrenze",
    title: "Margen-Untergrenze",
    summary:
      "Eine Firma legt fest, unter welcher Marge sie keine Aufträge annimmt. So verhindert sie, dass der Vertrieb Umsatz mit Rabatten kauft, der am Ende kein Geld verdient.",
    rule: "Rohmarge = (Preis − direkte Kosten) ÷ Preis. Liegt sie unter dem, was die Fixkosten brauchen, kostet jeder Auftrag Geld.",
    example: "Mindestmarge 35 %. Ein Großkunde will 30 % Rabatt, die Marge fiele auf 20 %: Der Auftrag geht zurück ins Gremium.",
    inGame: "Die Auflage „Margen-Untergrenze“ gehört zum Themenfeld Preis und Vertrieb und passt, wenn die Zahlen schwach sind.",
  },
  {
    id: "reporting",
    title: "Reporting-Pflicht",
    summary:
      "Die Geschäftsführung legt dem Gremium regelmäßig feste Kennzahlen vor: Umsatz, Kasse, Marge, Abweichungen vom Plan. Wer früh sieht, dass eine Zahl kippt, kann gegensteuern, bevor es teuer wird.",
    rule: "Wenige Kennzahlen, jeden Monat, immer gleich gerechnet. Ein Bericht, den keiner liest, ist nur Aufwand.",
    example: "Jeden Monat eine Seite: Umsatz gegen Plan, Kasse, Reichweite, größter Kunde. Fällt die Reichweite unter sechs Monate, gibt es eine Sondersitzung.",
    inGame: "Auflagen wie „Monatsbericht an das Gremium“, „Krisenstab mit Wochenbericht“ und „Erst nach dem Quartalsabschluss“ passen, wenn die Finanzsteuerung schwach ist.",
  },
  {
    id: "stellenplan",
    title: "Stellenplan",
    summary:
      "Ein Stellenplan legt fest, wie viele Stellen eine Firma hat und was sie kosten dürfen. Neue Stellen, Gehaltssprünge oder Beteiligungen außerhalb des Plans brauchen eine Freigabe.",
    rule: "Personal ist die schwerste Kosten-Entscheidung: leicht zugesagt, schwer zurückgenommen.",
    example: "Der Plan sieht 24 Stellen vor. Für zwei zusätzliche Vertriebler braucht die Geschäftsführung die Zustimmung des Beirats.",
    inGame: "Die Auflage „Stellenplan mit Freigabe“ gehört zum Themenfeld Team und passt, wenn das Vertrauen in die Steuerung angeschlagen ist.",
  },
  {
    id: "ebitda_multiple",
    title: "EBITDA-Multiple",
    summary:
      "Familienunternehmen werden nach dem bewertet, was sie verdienen: EBITDA, also Gewinn vor Zinsen, Steuern und Abschreibungen. Der Unternehmenswert ist ein Vielfaches (Multiple) davon. Kleine Firmen kosten wenig, große mehr, weil sie sicherer sind und mehr Käufer sie bezahlen können.",
    rule: "Unternehmenswert = EBITDA × Multiple; Eigenkapitalwert = Unternehmenswert + Kasse − Schulden",
    example: "Eine Firma verdient 600.000 € EBITDA. Bei 5,5× ist sie 3,3 Mio. € wert. Hat sie 1 Mio. € Schulden, gehören den Eigentümern 2,3 Mio. €.",
    inGame:
      "Firmen aus dem Nachfolge-Programm werden so bewertet: Das Vielfache steigt mit der Größe und dem Wachstum, ein Klumpenkunde drückt es. In Mandaten setzt du das Multiple selbst.",
  },
  {
    id: "multiple_arbitrage",
    title: "Multiple-Arbitrage",
    summary:
      "Kleine Firmen werden mit einem niedrigen Vielfachen gehandelt, große mit einem höheren. Wer viele kleine kauft und zu einer großen Gruppe zusammenfügt, kann sie am Ende teurer verkaufen, als die Teile gekostet haben. Das ist der Kern von Buy-and-Build.",
    rule: "Wertgewinn = EBITDA des Zukaufs × (Multiple der Gruppe − bezahltes Multiple) − Integrationskosten",
    example:
      "Ein Zukauf mit 200.000 € EBITDA kostet 4,5×, also 900.000 €. In einer Gruppe, die mit 7× bewertet wird, ist er 1,4 Mio. € wert. Kommen Kunden abhanden, ist der Vorteil schnell weg.",
    inGame: "Deine Plattform kauft Firmen derselben Branche. Je größer das EBITDA der Gruppe, desto höher ihr Multiple beim Verkauf.",
  },
  {
    id: "covenant",
    title: "Covenant: was die Bank verlangt",
    summary:
      "Ein Covenant ist eine Bedingung im Kreditvertrag, meist eine Obergrenze für die Verschuldung im Verhältnis zum Ertrag. Wird sie gebrochen, darf die Bank den Zins erhöhen, Ausschüttungen sperren, frisches Eigenkapital verlangen und im äußersten Fall den Kredit kündigen.",
    rule: "Nettoverschuldung ÷ EBITDA ≤ vereinbarte Grenze (im Spiel 3,5×)",
    example: "3 Mio. € Bankschulden, 1 Mio. € EBITDA: 3,0×, alles gut. Fällt das EBITDA in der Krise auf 800.000 €, sind es 3,75×: Covenant gebrochen.",
    inGame:
      "Die Bank prüft jedes Quartal. Erster Bruch: Zinsaufschlag, keine Ausschüttung, kein Zukauf. Zweiter Bruch: Du musst Geld nachschießen, sonst verkauft die Bank die Firma.",
  },
  {
    id: "earn_out",
    title: "Earn-out",
    summary:
      "Ein Teil des Kaufpreises wird erst später gezahlt, und nur, wenn die Firma ein Ziel erreicht. So teilen Käufer und Verkäufer das Risiko, dass die Zahlen schöner aussehen, als sie sind. Der Verkäufer bleibt motiviert, die Übergabe gut zu machen.",
    rule: "Kaufpreis = fester Teil + bedingter Teil (fällig, wenn das Ziel erreicht ist)",
    example: "3 Mio. € Kaufpreis, davon 300.000 € als Earn-out nach zwei Jahren, wenn das EBITDA mindestens so hoch ist wie beim Kauf.",
    inGame:
      "Bis 15 % des Preises. Nach 24 Monaten zahlt die Firma, wenn das EBITDA das Ziel erreicht; sonst entfällt der Betrag und der Verkäufer ist verärgert. Ein Earn-out senkt das Risiko einer holprigen Übergabe.",
  },
  {
    id: "verkaeuferdarlehen",
    title: "Verkäuferdarlehen",
    summary:
      "Der Verkäufer bekommt nicht den ganzen Preis sofort, sondern leiht dem Käufer einen Teil. Das ist günstiger als Eigenkapital, steht aber hinter der Bank. Ein Verkäufer, der noch Geld in der Firma hat, hilft eher bei der Übergabe.",
    rule: "Im Spiel bis 20 % des Preises, 4 % Zins, Rückzahlung in einer Summe nach vier Jahren",
    example: "Von 2 Mio. € Kaufpreis bleiben 300.000 € als Darlehen stehen. Die Firma zahlt 1.000 € Zinsen im Monat und nach vier Jahren die 300.000 €.",
    inGame: "Ist das Darlehen fällig und die Kasse zu knapp, finanziert die Bank nur, wenn die Verschuldung es zulässt. Sonst wird es eng.",
  },
  {
    id: "search_fund",
    title: "Search Fund: Nachfolge mit fremder Hilfe",
    summary:
      "Eine junge Unternehmerin sucht mit dem Geld von Investoren ein bis zwei Jahre nach einem Familienbetrieb ohne Nachfolge. Findet sie einen, kaufen die Investoren ihn, und sie wird Geschäftsführerin mit einem wachsenden Anteil. Viele Suchen scheitern; dann ist das Suchkapital weg.",
    rule: "Suchkapital (Gehalt, Reisen) → Kauf mit Eigenkapital und Kredit → Earn-in der Suchenden bis etwa 25 %",
    example: "18 Monate Suche à 12.000 € kosten 216.000 €. Die gefundene Firma kostet 5× EBITDA statt 6× im Bieterverfahren, weil der Inhaber nur mit ihr spricht.",
    inGame: "Im Nachfolge-Programm wählst du eine Suchende. Nach drei Monaten kommen Zielfirmen; nach 24 Monaten ohne Kauf endet die Suche.",
  },
  {
    id: "pmi",
    title: "Integration nach dem Kauf (PMI)",
    summary:
      "Post-Merger-Integration heißt: zwei Firmen werden eine. Einkauf, IT, Verwaltung und Standorte werden zusammengelegt, das spart Geld (Synergien). Dabei gehen oft Kunden und gute Leute verloren. Synergien kommen langsamer und seltener als im Plan.",
    rule: "Schnell integrieren: früher fertig, mehr Unruhe. Behutsam: teurer und länger, aber weniger Verluste.",
    example: "Zwei Speditionen legen ihre Disposition zusammen und sparen 120.000 € im Jahr. Drei Fahrer und ein Großkunde gehen zur Konkurrenz.",
    inGame:
      "Jeder Zukauf deiner Plattform wird integriert. Allein schaffst du eine Integration gleichzeitig, mit Team und einem Operating Partner auf der Plattform mehr. Zu viele auf einmal kosten Einsparungen und Kunden.",
  },
  {
    id: "bieterverfahren",
    title: "Bieterverfahren",
    summary:
      "Statt mit einem Käufer zu verhandeln, lädt der Verkäufer mehrere ein. Erst kommen unverbindliche Angebote, dann prüfen die besten Bieter und geben ein verbindliches Angebot ab. Wettbewerb treibt den Preis, aber der Prozess dauert länger und es spricht sich herum.",
    rule: "Exklusiv: schnell, diskret, der Preis orientiert sich an deiner Forderung. Bieterverfahren: höherer Preis, mehr Aufwand, Risiko von Indiskretionen.",
    example: "Ein Konzern bietet exklusiv 5 Mio. €. Im Bieterverfahren zahlt ein Finanzinvestor 5,6 Mio. €, weil zwei andere mitbieten.",
    inGame: "In Verkaufsmandaten und beim Verkauf deiner Plattform wählst du den Prozess. Bei Konzernen am Tisch kann der Verkauf durchsickern.",
  },
  {
    id: "dd_bausteine",
    title: "Due Diligence: die vier Bausteine",
    summary:
      "Eine gründliche Prüfung vor dem Kauf hat vier Teile. Financial: Stimmt das EBITDA, wenn man Einmaleffekte und das fehlende Gehalt des Inhabers bereinigt? Legal: Verträge, Klagen, Klauseln beim Eigentümerwechsel. Tax: offene Prüfungen und Nachzahlungen. Commercial: Markt, Kunden, Wettbewerb.",
    rule: "Jeder Befund vor der Unterschrift senkt den Preis; jeder übersehene Befund trifft nach dem Kauf den neuen Eigentümer.",
    example: "Die Financial DD zeigt, dass das EBITDA 15 % niedriger ist. Bei 5× sind das 450.000 € weniger Kaufpreis für eine Firma mit 600.000 € EBITDA.",
    inGame: "Beim Kauf von Firmen und in Mandaten wählst du die Bausteine. Jeder kostet einen Tag und Beraterhonorar.",
  },
  {
    id: "operating_partner",
    title: "Operating Partner",
    summary:
      "Operating Partner sind erfahrene Manager in einer Beteiligungsgesellschaft. Sie sitzen nicht nur im Beirat, sondern arbeiten in den Firmen mit: Vertrieb aufbauen, Kosten senken, Zukäufe integrieren. Bezahlt werden sie mit Gehalt und einer Beteiligung am Erfolg, meist als Carry beim Verkauf.",
    rule: "Vergütung = Grundgehalt + kleiner laufender Anteil am Wertzuwachs + Carry auf den Gewinn beim Exit",
    example:
      "Eine Sanierungsexpertin betreut zwei Familienbetriebe. Sie bekommt 9.500 € im Monat und 6 % deines Gewinns, wenn die Firmen verkauft werden: bei 2 Mio. € Gewinn 120.000 €.",
    inGame:
      "Unter Holding › Operating Partner stellst du sie ein und gibst ihnen Firmen. Passt die Stärke zum Firmentyp, sparen sie mehr Tage, entscheiden besser und bereiten auf der Plattform Zukäufe vor.",
  },
  {
    id: "zwischenholding",
    title: "Zwischenholding und Haftungstrennung",
    summary:
      "Eine Zwischenholding ist eine eigene Gesellschaft zwischen dem Eigentümer und seinen Firmen. Geht eine Tochter pleite, haftet die Holding mit ihrem Anteil, nicht der Eigentümer privat. Banken verlangen ohne diese Trennung oft eine persönliche Bürgschaft.",
    rule: "Privatvermögen → Family Office → Zwischenholding → Töchter; jede GmbH haftet nur mit ihrem eigenen Vermögen",
    example:
      "Ohne Holding bürgt der Käufer für ein Viertel des Bankkredits von 4 Mio. €. Fällt die Firma aus, zahlt er bis zu 1 Mio. € privat. Mit Holding verliert er nur, was er in die Firma gesteckt hat.",
    inGame:
      "Unter Holding › Struktur gründest du sie für 12.000 € Notar und Steuerberatung. Ohne sie greift bei Insolvenz oder Zwangsverkauf einer gekauften Firma deine Bürgschaft.",
  },
  {
    id: "vetorecht",
    title: "Vetorecht der Mitgesellschafter",
    summary:
      "Minderheitsgesellschafter lassen sich im Gesellschaftervertrag Zustimmungsrechte geben: Bei wichtigen Entscheidungen, etwa großen Zukäufen, brauchen sie ihr Ja. So schützen sie sich davor, dass die Mehrheit Geld in schlechte Deals steckt.",
    rule: "Vetorecht = Zustimmungsvorbehalt für festgelegte Entscheidungen, unabhängig von der Mehrheit",
    example: "Der alte Inhaber hält noch 10 %. Er blockiert einen Zukauf, der die Gruppe halb so groß macht, bis eine Prüfung zeigt, dass beide Firmen zusammenpassen.",
    inGame: "Mitgesellschafter deiner Plattform mit mindestens 5 % stimmen großen Zukäufen nur mit geprüfter Passung zu und legen bei schlecht passenden ein Veto ein.",
  },
  {
    id: "mitverkaufspflicht",
    title: "Mitverkaufspflicht (Drag-along)",
    summary:
      "Käufer wollen meist 100 % einer Firma. Die Mitverkaufspflicht zwingt Minderheitsgesellschafter, zu denselben Bedingungen mitzuverkaufen, wenn die Mehrheit verkauft. Im Gegenzug schützt ein Mitverkaufsrecht (Tag-along) die Minderheit davor, zurückzubleiben.",
    rule: "Drag-along: Mehrheit verkauft, alle verkaufen mit. Ohne sie zahlt der Käufer weniger oder springt ab.",
    example: "Ein Investor bietet 30 Mio. € für 100 %. Ohne Drag-along könnte die Suchende mit 8 % ihre Anteile behalten; der Käufer zieht deshalb 5 % vom Preis ab.",
    inGame: "Die Gesellschaftervereinbarung deiner Zwischenholding enthält sie. Ohne Zwischenholding ziehen Käufer deiner Plattform 5 % ab.",
  },
  {
    id: "passung",
    title: "Passung von Zukäufen",
    summary:
      "Ob ein Zukauf Wert schafft, hängt an der Passung: gleiches Geschäft, ähnliche Kultur, nahe Standorte und Kunden, die auch beim anderen kaufen. Passt es, kommen Synergien. Passt es nicht, entstehen Dis-Synergien: Integrationskosten, Kündigungen, Kundenverluste.",
    rule: "Wert des Zukaufs = Kaufpreis-Vorteil (Multiple) + Synergien − Integrationskosten − Dis-Synergien",
    example: "Zwei Bäckereien in derselben Stadt bündeln Einkauf und Auslieferung. Ein Großhändler am anderen Ende des Landes bringt nur doppelte Verwaltung.",
    inGame:
      "Die Passung siehst du nach einer Commercial Due Diligence oder wenn ein Operating Partner den Zukauf vorbereitet. Gute Passung bringt extra Einsparungen, schlechte kostet Leute und Marge.",
  },
  {
    id: "zinsbindung",
    title: "Zinsbindung und Anschlusszins",
    summary:
      "Bei einer Hypothek legt die Bank den Zins für eine feste Zeit fest, meist 5, 10 oder 15 Jahre. Danach gilt für die Restschuld der Zins, den der Markt dann verlangt: der Anschlusszins. Lange Bindung kostet etwas mehr, schützt aber vor einer Zinswende.",
    rule: "Rate = Darlehen × (Zins + anfängliche Tilgung) ÷ 12; nach der Bindung: Restschuld × (Anschlusszins + Tilgung) ÷ 12",
    example:
      "2 Mio. € zu 3,4 % mit 2 % Tilgung kosten 9.000 € im Monat. Nach zehn Jahren sind noch gut 1,5 Mio. € offen. Bei 5,4 % Anschlusszins steigt die Rate auf 9.400 €, obwohl die Schuld kleiner ist.",
    inGame:
      "Bei jedem Immobilienkauf wählst du die Bindung. Die Wirtschaftsnachrichten kündigen eine Zinswende neun Monate vorher an; sechs Monate vor Ablauf schreibt dir die Bank.",
  },
  {
    id: "beleihungsauslauf",
    title: "Beleihungsauslauf",
    summary:
      "Der Beleihungsauslauf (Loan to Value, LTV) sagt, welcher Teil des Objektwerts mit Kredit bezahlt ist. Je höher er ist, desto weniger eigenes Geld steckt drin, desto teurer der Zins und desto schneller wird es eng, wenn der Wert fällt.",
    rule: "Beleihungsauslauf = Darlehen ÷ Marktwert",
    example:
      "Haus für 3 Mio. €, Darlehen 2,1 Mio. €: 70 %. Fällt der Wert nach einer Zinswende auf 2,6 Mio. €, sind es 81 %. Verlangt die Bank höchstens 75 %, musst du 150.000 € nachschießen.",
    inGame:
      "Wohnungen beleiht die Bank bis 80 %, Mehrfamilienhäuser bis 75 %, Gewerbe bis 65 %, ein Penthouse bis 60 %. Über 60 % kostet jeder angefangene 5-Punkte-Schritt 0,1 Prozentpunkte Zins. Bei der Anschlussfinanzierung prüft die Bank neu.",
  },
  {
    id: "mietrendite",
    title: "Mietrendite und Kaufpreisfaktor",
    summary:
      "Die Bruttomietrendite setzt die Jahresmiete ins Verhältnis zum Kaufpreis. Der Kaufpreisfaktor ist der Kehrwert: wie viele Jahresmieten das Objekt kostet. Netto bleibt weniger: Leerstand, Instandhaltung und Nebenkosten beim Kauf gehen ab.",
    rule: "Bruttomietrendite = Jahresmiete ÷ Kaufpreis; Faktor = Kaufpreis ÷ Jahresmiete",
    example: "Ein Mehrfamilienhaus für 2,4 Mio. € bringt 115.000 € Miete: 4,8 % brutto, Faktor 20,9. Nach 3 % Leerstand und 1,4 % Instandhaltung bleiben etwa 3,3 %.",
    inGame: "Jedes Angebot im Immobilienmarkt zeigt Faktor und Rendite. Gewerbe bringt mehr, schwankt aber beim Leerstand mit der Konjunktur.",
  },
  {
    id: "gemeinnuetzigkeit",
    title: "Gemeinnützige Stiftung",
    summary:
      "Eine Stiftung ist Vermögen mit einem festen Zweck, das niemandem mehr gehört. Das Grundstockvermögen bleibt für immer erhalten, nur der Ertrag fließt in den Zweck. Dient der Zweck der Allgemeinheit, ist die Stiftung gemeinnützig: Zuwendungen mindern die Steuer.",
    rule: "Im Spiel vereinfacht: Zustiftungen bis 1 Mio. € in zehn Jahren werden zu 42 % erstattet. Was einmal gestiftet ist, kommt nie zurück.",
    example:
      "Du stiftest 1 Mio. €. Das Finanzamt erstattet 420.000 €, die Stiftung schüttet jedes Jahr etwa 30.000 € für Stipendien aus. Dein Vermögen sinkt um 580.000 €, dein Ruf steigt.",
    inGame:
      "Unter Stiftung & Dynastie errichtest du die Stiftung ab 70 Ruf und 5 Mio. € Vermögen. Sie zählt zum Lebenswerk und zum verwalteten Vermögen, nicht mehr zu deinem eigenen.",
  },
  {
    id: "aum",
    title: "Verwaltetes Vermögen (AuM)",
    summary:
      "Assets under Management (AuM) ist alles Geld, über dessen Anlage du entscheidest, egal wem es gehört. Bei Fondsmanagern zählt das zugesagte Kapital aller Fonds, also auch das Geld der Investoren. Davon hängen Gebühren und Ansehen ab.",
    rule: "AuM = Familienvermögen im Family Office + Größe aller eigenen Fonds (mit Investorengeld) + Stiftungskapital",
    example:
      "20 Mio. € Familienvermögen, ein Fonds über 15 Mio. € und 2 Mio. € in der Stiftung: 37 Mio. € AuM. Bei 2 % Verwaltungsgebühr bringt allein der Fonds 300.000 € im Jahr.",
    inGame: "Die Stufe Fondsfamilie verlangt 1 Mrd. € AuM. Der Wert steht unter Stiftung & Dynastie.",
  },
  {
    id: "family_governance",
    title: "Family Governance",
    summary:
      "Familienvermögen zerfällt selten an schlechten Anlagen, öfter an Streit. Family Governance sind die Regeln, mit denen eine Familie gemeinsam entscheidet: eine Familiencharta, ein Familienrat und eine geplante Nachfolge, lange vor dem Ernstfall.",
    rule: "Regeln vereinbaren, solange alle sich einig sind; Nachfolge über Jahre aufbauen, nicht an einem Tag übergeben.",
    example:
      "Die Charta legt fest: Familienmitglieder arbeiten erst nach fünf Jahren außerhalb im Family Office. Als die Cousine einsteigen will, ist die Antwort klar und niemand fühlt sich übergangen.",
    inGame:
      "Unter Stiftung & Dynastie wählst du eine Nachfolge, begleitest sie mit Mentoring-Tagen und ordnest die Familie mit Charta und Familienrat. Übergeben kannst du ab Reife 80 und Zusammenhalt 60.",
  },
  {
    id: "werttreiber",
    title: "Werttreiber: woher der Wert einer Firma kommt",
    summary:
      "Der Wert eines Familienbetriebs für die Eigentümer hat vier Treiber: das EBITDA, das Multiple, die Schulden und die freie Kasse. Steigt das EBITDA um 10 %, steigt der Unternehmenswert um etwa 10 %; der Eigenkapitalwert steigt stärker, weil die Schulden gleich bleiben. Das ist der Hebel, in beide Richtungen.",
    rule: "Eigenkapitalwert = EBITDA × Multiple + freie Kasse − Bankkredit − Verkäuferdarlehen − erwarteter Earn-out",
    example:
      "2 Mio. € EBITDA × 6 = 12 Mio. € Unternehmenswert, 5 Mio. € Schulden: 7 Mio. € für die Eigentümer. Fällt das EBITDA auf 1,6 Mio. € und das Multiple auf 5,5, sind es 8,8 − 5 = 3,8 Mio. €: −20 % Ertrag, −46 % Eigenkapital.",
    inGame:
      "Auf der Firmenseite siehst du die Treiber und ihren Verlauf, im Monatsbericht steht bei jeder größeren Wertänderung, woher sie kommt. Ein Earn-out zählt nur so weit, wie sein Ziel erreichbar ist.",
  },
  {
    id: "interim_management",
    title: "Interim-Management und Führungswechsel",
    summary:
      "Läuft eine Firma über Monate schlecht, liegt es oft an der Führung. Eine Interim-Managerin kommt für einige Monate, ordnet Abläufe und Kosten und entlastet die Geschäftsführung. Reicht das nicht, tauscht der Gesellschafter die Geschäftsführung aus: teuer, riskant, aber manchmal der einzige Weg.",
    rule: "Erst verstehen (Zahlen, Gespräch), dann stützen (Interim), erst zuletzt austauschen.",
    example: "Nach dem Abgang des Prokuristen fällt das EBITDA zwei Quartale. Eine Interim-Managerin für sechs Monate kostet 45.000 € und bringt die Kosten wieder zum Umsatz.",
    inGame:
      "Bei eigenen Mittelstandsfirmen mit Mehrheit findest du unter „Eingreifen“ das Interim-Management (sechs Monate, die Firma zahlt). Über das Netzwerk bekommst du die Interim-Managerin günstiger.",
  },
  {
    id: "ltm_ebitda",
    title: "LTM-EBITDA: die letzten zwölf Monate",
    summary:
      "Käufer und Banken bewerten eine Firma nicht nach einem einzelnen Monat, sondern nach dem Ergebnis der letzten zwölf Monate (englisch: last twelve months, LTM). Ein schlechter Monat zieht den Wert nur ein wenig nach unten; hält die Schwäche an, sinkt der Wert Monat für Monat weiter, bis der Zwölfmonatswert das neue Niveau erreicht hat.",
    rule: "Wert = LTM-EBITDA × Multiple − Nettoschulden. Ein Monat zählt etwa ein Sechstel.",
    example:
      "Ein Großkunde geht, das laufende EBITDA fällt von 160.000 € auf 90.000 € im Jahr. Im ersten Monat sinkt das LTM-EBITDA nur auf 148.000 €, nach einem halben Jahr liegt es bei etwa 113.000 €.",
    inGame: "Auf der Firmenseite siehst du neben dem Zwölfmonatswert auch das laufende EBITDA. Auch der Covenant der Bank rechnet mit dem Zwölfmonatswert.",
  },
  {
    id: "refinanzierung",
    title: "Refinanzierung",
    summary:
      "Ein laufender Kredit wird durch einen neuen ersetzt, meist mit längerer Laufzeit oder besserem Zins. Die monatliche Rate sinkt, die Firma hat mehr Luft. Der Preis: Die Schulden bleiben länger, insgesamt zahlt man oft mehr Zinsen. Banken refinanzieren nur, solange die Kreditbedingungen eingehalten sind.",
    rule: "Niedrigere Rate = mehr freier Cashflow heute, mehr Zinsen über die Laufzeit",
    example: "3 Mio. € Restschuld, noch drei Jahre: 90.000 € Rate im Monat. Neu über sieben Jahre zu 6,5 %: 44.500 €. Die Firma behält jeden Monat 45.500 € mehr.",
    inGame:
      "Unter „Eingreifen“ refinanzierst du den Bankkredit einer gekauften Firma, auch fällige Verkäuferdarlehen kann die Bank übernehmen. Bei gebrochenem Covenant verhandelt sie nicht.",
  },
  {
    id: "teaser",
    title: "Teaser",
    summary:
      "Der Teaser ist das erste Blatt, das mögliche Käufer sehen: ein anonymes Kurzprofil auf ein bis zwei Seiten, ohne den Namen des Verkäufers. Wer interessiert ist, unterschreibt eine Geheimhaltungsvereinbarung und bekommt erst dann das ausführliche Infomemo.",
    rule: "Mehr verraten bringt mehr Bieter und höhere Gebote, aber das Risiko, dass etwas durchsickert. Wesentliche Probleme gehören hinein: Was verschwiegen wird, findet die Due Diligence trotzdem.",
    example: "Ein Konzern verkauft eine Sparte mit 84 Mio. € Umsatz. Der Teaser nennt „Umsatz 80 bis 90 Mio. €“ statt der genauen Zahl und lässt den Namen des Konzerns weg.",
    inGame: "Bei großen Mandaten (Carve-outs ab Ruf 80 mit Family Office) wählst du in der Vorbereitung, welche Angaben in den Teaser kommen.",
  },
  {
    id: "batna",
    title: "BATNA und Verhandlungsmacht",
    summary:
      "BATNA heißt „Best Alternative to a Negotiated Agreement“: die beste Alternative, wenn die Verhandlung scheitert. Wer eine glaubwürdige Alternative hat, etwa einen zweiten Bieter, kann mehr fordern. Exklusivität gibt diese Macht für einen kleinen Aufschlag aus der Hand.",
    rule: "Je mehr ernsthafte Bieter noch am Tisch sitzen, desto stärker wirkt der Hinweis auf Konkurrenzgebote. Ein Earn-out hebt die Schlagzeile, nicht den sicheren Barpreis.",
    example: "Zwei Bieter liegen bei 68 und 74 Mio. €. Du nennst dem Zweiten das bessere Gebot, er legt auf 76 Mio. € nach.",
    inGame: "In großen Mandaten verhandelst du nach den ersten Geboten drei Runden mit vier Hebeln. Dein Erfolgshonorar steigt mit dem Preis.",
  },
  {
    id: "league_table",
    title: "League Table",
    summary:
      "Eine League Table ist die Rangliste der Berater: Wer hat im Jahr die meisten oder die größten Deals begleitet? Banken und Boutiquen werben damit, Mandanten schauen darauf.",
    rule: "Gezählt wird das Volumen (Summe der Unternehmenswerte) oder die Anzahl der Deals. Ein großer Deal bewegt das Volumen, viele kleine die Anzahl.",
    example: "Ein Haus berät zwölf Verkäufe mit zusammen 380 Mio. €. Ein anderes nur drei, darunter einen Carve-out über 250 Mio. €: nach Volumen liegt es fast gleichauf.",
    inGame: "Unter „Rangliste“ siehst du dich, die übrigen Häuser und deine Rivalen. Wer zum Jahresende unter den ersten fünf steht, bekommt mehr und größere Anfragen.",
  },
  {
    id: "bietgefecht",
    title: "Bietgefecht und Gewinnerfluch",
    summary:
      "Bieten zwei Käufer um dieselbe Firma, entscheidet nicht nur der Preis. Ein Inhaber im Mittelstand fragt auch: Was wird aus meinen Leuten, meinem Standort, meinem Namen? Wer dafür ein gutes Konzept hat, kann einen höheren Preis schlagen.",
    rule: "Gewinnerfluch: Wer im Bietgefecht gewinnt, hat oft zu viel bezahlt. Jeder Euro über dem fairen Wert senkt die Rendite. Aussteigen ist manchmal der beste Zug.",
    example: "Ein Fonds bietet 8,6 Mio. €, du 8,0 Mio. € und sicherst den Standort fünf Jahre. Dem Inhaber ist das 0,9 Mio. € wert: Du bekommst den Zuschlag.",
    inGame: "Ab Ruf 50 bieten drei Rivalen um Familienbetriebe mit. Du erhöhst, legst ein Nachfolge-Konzept vor oder steigst aus, höchstens drei Runden.",
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
  "covenants",
  "budgetdeckel",
  "pilotprojekt",
  "stage_gate",
  "zustimmungsvorbehalt",
  "stellenplan",
  "reporting",
  "kreditrahmen",
  "mindestkasse",
  "margenuntergrenze",
  "garantien",
  "down_round",
  "secondary",
  "netzwerk",
  "reziprozitaet",
  "warm_intro",
  "deal_sourcing",
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
  "ebitda_multiple",
  "dd_bausteine",
  "bieterverfahren",
  "verkaeuferdarlehen",
  "earn_out",
  "covenant",
  "search_fund",
  "multiple_arbitrage",
  "pmi",
  "berater_mna",
  "netzwerk_events",
  "operating_partner",
  "zwischenholding",
  "passung",
  "vetorecht",
  "mitverkaufspflicht",
  "mietrendite",
  "zinsbindung",
  "beleihungsauslauf",
  "aum",
  "gemeinnuetzigkeit",
  "family_governance",
  "werttreiber",
  "ltm_ebitda",
  "interim_management",
  "refinanzierung",
  "teaser",
  "batna",
  "league_table",
  "bietgefecht",
];

export function lessonOf(id: string): Lesson {
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) throw new Error(`Unknown lesson ${id}`);
  return lesson;
}
