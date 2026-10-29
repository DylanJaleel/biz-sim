# Boardroom – Konzept und Entscheidungen

Stand: Oktober 2026. Ausführliche, interaktive Fassung mit Mockups: Artifact „Boardroom Spielkonzept“ (Version 2).

## Entschieden

1. **Boardroom ersetzt das Handwerksspiel.** Login, Datenbank, Runden-Technik (Sperre pro Spieler, Schutz vor Doppelabschluss), gesäter Zufall, Balancing per Skript-Spieler und Vercel-Vorbereitung bleiben. Das Handwerks-Wirtschaftsmodell (`lib/economy.ts`, `lib/investments.ts`) entfällt als Hauptspiel und kann später als Mittelstands-Branche im Konzern-Pfad zurückkommen.
2. **1 Runde = 1 Monat mit Kalender.** Jeder Monat hat 20 Arbeitstage. Aktionen kosten Tage (Due Diligence 2–4, Vorgespräch 1, Board-Meeting 1, CFO-Gespräch 1, Kontaktpflege 1–2, Lernkarte 1, Kontakt einbringen 1, Mails sichten 0–1). Erst beim Monatsabschluss rechnet die Simulation alle Unternehmen weiter. Boards tagen regulär quartalsweise, dazu Sondersitzungen.
3. **Start als Angel ohne Mehrheit** (8–12 %, ein Beiratssitz von fünf). Mehrheit entsteht später durch Nachschüsse, Leistungsanteile und den Kauf von Anteilen.
4. **Ernst mit leichtem Augenzwinkern, Ziel: spielerische Bildung.** CFO-Forecast mit Hebeln (Einstellungen, Preis, Eigenkapital vs. Kredit, Szenarien), Rückblick mit Erklärung nach jeder Entscheidung, Lernkarten und Wissensbaum, Bilanz-Rätsel in der Due Diligence, Term Sheets, Bewertung. Alle Zahlen rechnet die Spiellogik, nie eine KI.
5. **Der ovale Tisch aus `DylanJaleel/boardroom` wird der Boardroom des Spiels**, erweitert um feste Rollen (Gründerin, Mitgründer, VC, unabhängige Beirätin, Spieler), Tendenzen und Interessen, Vorgespräche, Argumente in der Sitzung, Abstimmung nach Köpfen (Beirat) bzw. nach Anteilen (Gesellschafterversammlung). Stil: modern, Apple-inspiriert (Systemschrift, viel Weißraum, ruhige Flächen, ein Akzentblau).

## Spielstruktur

- **Drei Orte:** Büro (Schreibtisch von oben: Laptop mit Projekten, Postfach, Assistenz-Ordner, Kalender, Visitenkarten, Notizbuch) → Unternehmen im Vollbild (Bericht, Kennzahlen, Team, Anteile, CFO) → Boardroom (Debatte, Abstimmung) → zurück ins Büro.
- **Netzwerk in vier Ringen:** persönlich → Branchenprofis → Entscheider → Institutionen (Ministerium, Großbanken, Beratungen, Börse). Beziehungen kühlen ab, Gefallen sind begrenzt, Kontakte lassen sich in Startups einbringen.
- **Karriere:** Angel → Lead-Investor → Mehrheitsgesellschafter → Konzern-Beirat/Aufsichtsrat → Family Office → eigene PE-Firma (Fonds, Team, Buyouts mit Fremdkapital).
- **Büro-Stufen:** Küchentisch → Coworking → eigenes Büro mit Assistenz → Büroetage mit Analysten → oberste Etage (PE-Firma). Teils Status, teils Nutzen (Vorsortieren, schnellere Prüfungen, Delegieren).

## Machbarkeit (Kurzfassung)

| Baustein | Aufwand | Phase |
|---|---|---|
| Unternehmenssimulation, verzögerte Effekte | M | 1 |
| Vorlagen (Inhalt) | L, dauerhaft | ab 1 |
| Boardroom-Port aus dem Vite-Repo | M | 1 |
| Kalender-Monat | M | 1 |
| Schreibtisch 2D von oben | M | 1 |
| Mail/Assistenz | S | 1 |
| CFO-Forecast | M | 1 |
| Lernkarten, Rückblicke | M | 1–2 |
| Anteile, Runden, Stimmrechte | M | 2 |
| Netzwerk | L | 2 |
| Büro in 3. Person mit Einrichtung (Grafik) | XL | 3 |
| Konzern-Pfad | L | 3 |
| KI-Gespräche (Claude, optional) | M | 3+ |
| PE-Firma | XL | 4 |

Größte Risiken: Umfang, Inhaltsaufwand, Grafik für das Büro in 3. Person.

## Plan

- **Phase 1 – spielbares erstes Jahr:** Schreibtisch, zwei Deals zur Wahl, ein Mandat als Angel (12 %), Kalender mit acht Aktionsarten, Boardroom mit Vorgespräch/Argument/Abstimmung, CFO-Forecast, 25–30 Vorlagen, 15 Lernkarten, Rückblicke. Handwerks-UI und -Daten werden entfernt (Migration setzt Spielstände zurück).
- **Phase 2 – Wachsen:** Finanzierungsrunden, Verwässerung, Nachschuss, Leistungsanteile, Gesellschafterversammlung, Netzwerk (Ringe 1–3), mehrere Startups, Exit, Pleite.
- **Phase 3 – Aufsteigen:** Büro-Stufen mit isometrischen Illustrationen, Konzern-Pfad, Börsengang, optional KI-Gespräche.
- **Phase 4 – Endspiel:** Family Office, Mitarbeiter, Fonds, Buyouts.

## Ebenfalls entschieden (Empfehlungen übernommen)

- Desktop und Tablet zuerst; Handys nur im Querformat (Dreh-Hinweis im Hochformat).
- Gebaut in biz-sim, Boardroom-Komponenten übernommen.
- Büro 2D von oben, isometrisch in Phase 3.
- Erfundene Figuren am Tisch; bekannte Blickwinkel höchstens später als gekennzeichnete „Mentoren“.
- Phase 1 ohne KI.
- Die runden Avatare am Halbrund-Tisch mit Linien zwischen Sprechenden und dem Live-Halbrund bleiben das zentrale Bild der Sitzung. Der 3D-Raum ist eine zusätzliche Ansicht auf großen Bildschirmen.

## Umsetzung Phase 1

- **Spiellogik** (`lib/game`): drei Startups (Pendelwerk, Kantinenkasse, Flottenfunk), 26 Vorlagen in drei Themen (Wachstum, Finanzen, Menschen), 17 Lernkarten, Monatssimulation mit Wachstum, Kosten, Klumpenrisiko, Notfinanzierung und Insolvenz, verzögerte und riskante Folgen von Beschlüssen, Urteil nach erwartetem Wert (halb Basisfall, halb schwacher Markt). Balancing ist per Skript-Spieler getestet: Nur zuschauen verliert Geld, gut vorbereitet schlägt Ja-Sagen deutlich.
- **Datenmodell:** ein `Game` pro Spieler mit dem Spielstand als JSON, `revision` gegen veraltete Tabs. Die Migration `boardroom` löscht die Tabellen des Handwerksspiels.
- **Sitzung:** Ablauf Eröffnung, Statements, dein Argument, Debatte (Reaktionen als Linien), Abstimmung, Beschluss. Die Vorschau im Browser ist identisch mit dem, was der Server danach abspielt (gleicher Zufall).

## Umsetzung Phase 2

- **Cap Table** pro Firma (`lib/game/captable.ts`), Verwässerung landet beim richtigen Gesellschafter.
- **Runden:** ausgelöst bei weniger als 6 Monaten Reichweite, nur bei finanzierbaren Firmen (Wachstum, Finanzen, Vertrauen, Investoren-Kontakt). Preis aus heutiger Bewertung mal Faktor; unter 0,9 ist es eine Brückenrunde (Down Round). Optionen: nicht mitziehen, halb pro rata, pro rata, anführen (ab 40 Ruf, halbe Runde).
- **Gesellschafterversammlung** nach Anteilen (Optionspool stimmt nicht). Gründer stimmen zu; bei Down Rounds stimmen Angels und Fonds dagegen, außer das Geld reicht unter 3 Monate. Ohne Teilnahme stimmt sie am Monatsende ohne den Spieler ab.
- **Anteile:** Verkaufsangebote von Angels (10 % Chance pro Monat, 15 % Abschlag), selbst anfragen (2 Tage; Gründer nur ab 70 Vertrauen, 25 % Aufschlag), Leistungsanteile (0,5 % pro Quartal bei starkem Urteil und Vertrauen ab 60). Über 50 % = Mehrheitsgesellschafter.
- **Netzwerk** (`lib/game/network.ts`): 11 Kontakte in drei Ringen mit Wärme, Abkühlung und Pause nach einem Gefallen.
- **Karriere** (`lib/game/career.ts`) und drei weitere Startups.
- Spielstände von Phase 1 werden beim Laden auf Version 2 gehoben (`upgradeState`).
- **Phase 3** hat Exit-Verhandlungen, Liquidationspräferenzen, Büro-Stufen und den Konzern-Pfad gebracht (siehe unten).

## Umsetzung Phase 3

- **Exits** (`planExits`, `settleExit` in `engine.ts`): Chance 2,5 % pro Monat und Firma (Wert ≥ 2 Mio. €, ≥ 8 Monate dabei, keine laufende Runde), mal (1 + 0,6 × Marktklima), × 1,4 bei starkem Wachstum. Preis 0,8–1,5 × Wert. Gründer stimmen ab 1,25 × Wert zu oder wenn das Geld unter 3 Monate reicht; Fonds ab 1,1 × Wert oder 1,5 × ihrer Präferenz; Angels ab 1,1 ×. Nachverhandeln: 55 % Grundchance (+ Ruf, + 10 % ab 25 % Anteil) auf +15 %, sonst zieht der Käufer zurück. Die alte Beiratsvorlage „Übernahmeangebot“ bleibt und zahlt jetzt ebenfalls über den Wasserfall.
- **Wasserfall** (`waterfall` in `captable.ts`): 1× nicht partizipierende Präferenz, iterativ (wer mit seinem Anteil weniger bekäme, nimmt sein Geld zurück). Bestehende Fonds im Cap Table bekommen beim Angebot eine Präferenz in Höhe ihres Anteils am heutigen Wert, neue Runden tragen ihr Geld als Präferenz ein, auch deines.
- **Syndikat:** Rundenoption `syndicate` (ab 50 Ruf, Angel-Club gekannt und ≥ 40 Wärme, kostet 15 Wärme). Das Syndikat ist ein eigener Gesellschafter mit Präferenz und Einstand, stimmt wie der Spieler; Carry 20 % auf den Gewinn beim Verkauf.
- **Büros** (`office.ts`): fünf Stufen mit Miete, Ruf- und Vermögensgrenze, Extra-Aufträgen, kürzerer Prüfung, Analyst (CFO-Gespräch und Rückfragen ohne Tage), Extra-Tagen. Umziehen kostet eine Monatsmiete, kleiner ziehen ist jederzeit möglich.
- **Konzern** (`corporate.ts`): Nordhafen AG als Firma mit `corporate: true`, ohne Anteile, mit eigenen sechs Vorlagen (nur dort), Sitzung im Monat nach dem Einstieg und dann quartalsweise, Kreditlinie statt Insolvenz. Das CFO-Urteil rechnet mit 1 % der Firma, damit Entscheidungen ohne eigene Anteile bewertet werden können.
- **Nachrichten** (`news.ts`): 17 Ereignisse nach Branche oder Einzelfirma; ab Monat 3 mit 40 % Chance, ab Monat 9 mit 60 % (davon 30 % doppelt), kein Ereignis zweimal in acht Monaten. Positive und negative Wirkungen sind so abgestimmt, dass der Median-Wert der Skript-Spieler gegenüber Phase 2 kaum steigt.
- **Balance** (100 Seeds, 24 Monate, Pendelwerk): passiv 81 T€, Ja-Sager 255 T€, Zufall 145 T€, Analyst 422 T€, Profi 510 T€, nur Beratung 171 T€. Der Profi erreicht im Median das eigene Büro mit Assistenz; zwei Drittel bekommen den Aufsichtsrat, wenn sie konsequent stark entscheiden.
- **Phase 4** hat Family Office, Team, Fonds, Buyouts und Börsengang gebracht (siehe unten).

## Umsetzung Phase 4

- **Deal-Generator** (`dealgen.ts`): zehn Branchen mit je drei bis vier Ideen und einer Nachfolge-Idee, Namen-, Personen- und Fondspools, vier Stufen mit eigenen Spannen für Umsatz, Wachstum, Verbrauch, Reichweite und Anteil. Jede Firma bekommt eine echte Stärke und eine echte Schwäche in den Achsen; die Prüfung nennt beide. Ab Monat 4 kommt mit 40 % Chance pro Monat ein neues Angebot (+15 % mit warmem Deal-Flow-Kontakt, +5 % mit Büro, +1 pro Partnerin, immer eines, wenn nichts läuft), höchstens drei offen. Die Stufe hängt vom Vermögen ab, Nachfolgen erst ab 60 Ruf und 1 Mio. € Vermögen. Abgelaufene erzeugte Angebote werden gelöscht, damit der Spielstand klein bleibt.
- **Buyout:** Kauf der Mehrheit (60–80 %) zum heutigen Wert, wahlweise 40 % über einen Kaufkredit (5,5 %, 96 Monate Annuität, Rate über das Privatkonto, Restschuld wird beim Verkauf getilgt). Ausschüttung jedes Quartal, wenn Spieler und Fonds zusammen über 50 % halten und die Firma Geld verdient: 70 % dessen, was über drei Monatskosten in der Kasse liegt, nach Anteilen.
- **Family Office:** ab 75 Ruf, 2 Mio. € Vermögen, Büro-Stufe 3 (65 Ruf, 1,2 Mio. €; Stufe 4: 85 Ruf, 5 Mio. €), 40.000 € Gründung. Associates entscheiden am Monatsende offene Vorlagen ihres Mandats (70 % die beste Option, sonst „mit Auflagen“), die Rufänderung wird halbiert. Die Partnerin gibt drei Tage und einen Deal pro Monat.
- **Fonds:** ab 85 Ruf, zwei Verkäufen und einem Family Office, das seit zwölf Monaten läuft. Größe 3 Mio. € + 1 Mio. € pro Verkauf + 100.000 € pro Ruf über 85, höchstens 15 Mio. €. Er investiert bei neuen Einstiegen das Doppelte des Tickets (höchstens ein Viertel des Fonds pro Firma): bei Startups neue Anteile mit Präferenz, bei Nachfolgen Anteile vom Verkäufer. Gebühr 2 % im Jahr, Carry 20 % auf den Gewinn des Fonds-Gesellschafters im Wasserfall.
- **Börsengang:** ab 12 Mio. € Wert, 12 Monate Haltedauer und 1,2 % Wachstum, 5 % Chance pro Monat (mal Marktklima), Bewertung 1,0–1,35 × Wert (+ Marktklima). Die Hälfte des Erlöses sofort, der Rest nach zwölf Monaten mal Entwicklung des Tech-Index.
- **Vielfalt:** elf neue Vorlagen (sechs für Startups, fünf nur für Mittelstand), 29 Nachrichten, 16 Beratungsaufträge, Aufsichtsratsvorlagen wiederholen sich nach 18 Monaten, Jahresbilanz per Post.
- **Balance im langen Spiel** (60 Monate, Pendelwerk als Einstieg, Median): Ja-Sager etwa 0,8 Mio. €, Zufall 0,2 Mio. €, Analyst mit einer Firma 1,5–1,7 Mio. €, „Mogul“ (breit investieren, Nachfolgen, Family Office, Fonds) 2,5–2,9 Mio. € bei elf Mandaten, aber mit 25 % Wahrscheinlichkeit für mindestens eine Insolvenz. Nur zuschauen endet unter dem Startkapital. Der Test `the long game` hält fest, dass der Mogul den Ja-Sager deutlich schlägt und die oberen Karrierestufen erreicht.
- **Vermögenskurve** (Teilaufgabe C): Ein Experten-Bot (`expertBot` in `bots.ts`: beste Firmen nach Potenzial, jede Sitzung vorbereitet, Syndikat, Anteilskäufe, Netzwerk für die beste Firma, Aufträge mit schneller Anreise, Depot mit Markt-Timing, Family Office und Fonds so früh wie möglich) kam vorher auf 6 Mio. € nach fünf, 30 Mio. € nach sieben und über 100 Mio. € nach zehn Jahren. Ursache: Ein Star-Startup wuchs ohne Grenze mit 5 % im Monat weiter (Umsatz ×200 in sechs Jahren, Kosten fast fest), angeschoben von Kontakten, die alle drei Monate erneut Wachstum brachten. Seitdem: ab 150.000 € Monatsumsatz kostet jede Verdopplung 1 Prozentpunkt Wachstumspotenzial, und Schübe über dem Potenzial verfliegen schneller (`SCALE_*` in `config.ts`); ein Kontakt hilft derselben Firma jedes Mal halb so stark; Leistungsanteile höchstens 2 % pro Firma; Kaufangebote zahlen nur für Wachstum einen großen Aufschlag; Börsengänge mit kleinerem Aufschlag und zwölf Monaten Sperrfrist; Tech-Index etwas weniger Rendite; höhere Hürden für Family Office, Fonds, Büros, Nachfolgen und Konzernmandat. Ziel für sehr gute Spieler: 1 Mio. € nach zwei bis drei, rund 5 Mio. € nach fünf, rund 10 Mio. € nach sieben Jahren; 25–50 Mio. € erst spät über Buy-and-Build. `scripts/wealth-trace.ts` zeigt Vermögen nach Jahren und Einnahmen nach Quelle.
- **Offen:** isometrische Büros, mehrere offene Vorlagen pro Firma, Fonds-Laufzeit mit Rückzahlung an die Investoren, Fonds II.

## Tagesordnung (2A) und Warteschlange

- **Umgesetzt (2A):** bis zu drei offene Punkte pro Firma (`AGENDA_MAX`), in Quartalsmonaten zwei plus 20 % Chance auf einen dritten, sonst einer, wenn keiner offen ist; dringende Vorlagen kommen immer dazu. Weitere Punkte derselben Sitzung kosten keinen Tag und zählen für den Ruf halb. Nicht dringende Punkte werden einmal vertagt (`BoardItem.postponed`), danach entscheidet die Geschäftsführung allein. Die Beiratsvorlage „Übernahmeangebot“ zahlt jetzt das 1,15-Fache (Nachverhandeln 1,35-Fache), weil sie mit mehr Punkten pro Quartal früher auftaucht.
- **Balance nach 2A** (40 Spiele, 24 Monate, Pendelwerk, Median): passiv 86 T€, Ja-Sager 326 T€ (Ruf 79), Zufall 207 T€, Analyst 515 T€, Profi 548 T€. Mehr Entscheidungen heißen mehr Einfluss; der Abstand zwischen sorgfältig und blind bleibt deutlich. Ein Büro zahlt sich nicht mehr automatisch aus, weil die Tage knapper sind.
- **Warteschlange:** 3B (Investoren mit Erwartungen, jährliche Investorenversammlung) kommt, wenn Punkt 3 angegangen wird, dann zusammen mit dem Fondszyklus; derzeit nicht nötig.
- **In Prüfung:** 1A (isometrische Räume) und 1B (begehbares 3D-Büro) als interaktive Visualisierung, Entscheidung vor dem Einbau.


## Umsetzung Phase 5 (Glas-Cockpit)

- Büro als Glas-Cockpit (Variante A), klassischer Schreibtisch bleibt unter Konto wählbar
- Vitrine mit 15 Tombstones und Pop-up beim Erreichen eines Meilensteins
- Fuhrpark-Markt und Aufträge mit Anreise, Bildfolge und Entscheidung vor Ort
- Rhythmus der Tagesordnung (ruhig, normal, viel los) und viele neue Sitzungsthemen
- Due Diligence als Lernpfad mit dem CFO: Entwurf steht, kommt nach dem Test im Spiel

## Fahrplan nach der Durchsicht (Oktober)

- **Entschieden:** Nachfolge-Programm (nach dem Vorbild der Search Funds) statt eigenem Startup. Du kaufst Familienbetriebe, setzt Geschäftsführer ein und baust sie aus.
- **Später, aber spielbar sobald erreicht:** Venture Studio als eigener Zweig im Family Office. Du wählst die Idee, holst einen CEO, finanzierst Meilensteine und hältst am Anfang 60 bis 80 %.
- **Offen:** Reihenfolge bei M&A (Buy-and-Build direkt oder erst Mandate) und die Lösung für „die Mitte gewinnt“ im Beirat (M1/M2/M3).

## Umsetzung: M&A-Mandate, Nachfolge-Programm, Buy-and-Build

- **Bewertung nach EBITDA** (`ebitda.ts`): Familienbetriebe aus dem Nachfolge-Programm (`metrics.valuedOn = "ebitda"`) sind EBITDA × Multiple wert. Größenkurve 4× bei 200.000 € EBITDA, +0,55 je Verdopplung (höchstens 10×), Wachstum bis +0,6, Klumpenkunde und Buchhaltung über den Qualitätsfaktor. Eigenkapitalwert = Unternehmenswert + Kasse über zwei Monatskosten − alle Schulden. 70 % der Kosten folgen dem Umsatz, Wachstum höchstens 0,5 % im Monat, Margen über dem 1,25-Fachen des Kaufs und Rohmargen-Ausschläge laufen zurück. Konjunktur: schwacher Markt −0,5 %, Crash −1,5 % Umsatz im Monat. Ältere Nachfolgen behalten die Umsatzbewertung.
- **M&A-Mandate** (`mna.ts`) ab 35 Ruf und Monat 4: 15 % Chance pro Monat (+10 % mit warmem Bankkontakt), Verkauf (65 %) oder Kauf. Größe nach Ruf (1,5–4 / 4–12 / 6–15 Mio. € Unternehmenswert, mit Family Office bis 30 Mio. €). Ablauf: annehmen, Vergleichsanalyse, Multiple, Käuferkreis (Strategen 0,95–1,25 × fair, Finanzinvestoren 0,85–1,07 × fair × Kreditmarkt), exklusiv oder Bieterverfahren (15 % Indiskretion bei Strategen), Vendor-DD; Angebote unter 85 % der Forderung bleiben aus. Käuferprüfung: nicht gefundene Befunde senken den Preis (50 %) oder lassen den Käufer abspringen (25 %). Honorar 4.000 € + 0,03 % fest, 0,3 % Erfolg (mindestens 10.000 €). Ruf +3/+2/−1/−2, zufriedene Mandanten empfehlen eine Nachfolge (30 %), gescheiterte Verkäufe werden manchmal dir angeboten.
- **Nachfolge-Programm** (`lbo.ts`): ab 55 Ruf, 1 Mio. € Vermögen und einem abgeschlossenen Mandat. Drei Suchende (Führung, Netzwerk, verborgenes Durchhaltevermögen) für 9.000–13.000 € im Monat, höchstens 24 Monate, Vorschläge ab Monat 4 mit 20–29 % pro Monat, zu 0,9–1,0 × fairem Multiple (Post-Angebote über Berater 0,98–1,15 ×). Zielgröße 0,5–1,2 × Vermögen (1,5–30 Mio. €). Due Diligence in vier Bausteinen (je ein Tag, 0,4–0,8 % des Preises); 0–2 versteckte Befunde je Firma. Finanzierung: Bank bis 3× EBITDA und 60 % des Preises (6 % + 0,5 % je Turn über 2, 7 Jahre Annuität, Kredit liegt in der Firma), Verkäuferdarlehen bis 20 % (4 %, vier Jahre endfällig), Earn-out bis 15 % (nach 24 Monaten, wenn das EBITDA hält), mindestens 30 % Eigenkapital, 1,5 % Nebenkosten; 10 % weniger bieten klappt zu 55 % (+10 % je Befund). Suchende wird Geschäftsführerin mit 8 % und +2 % je Halbjahr bis 25 %. Übergabe-Risiken im ersten Jahr (Altinhaber, Großkunde, Prokurist), gemildert durch Earn-out, Verkäuferdarlehen, Commercial-DD und Führungserfahrung.
- **Covenant**: Nettobankschulden ÷ EBITDA höchstens 3,5×, Test jedes Quartal. Erster Bruch: +2 Prozentpunkte Zins, 0,5 % Gebühr, keine Ausschüttung, kein Zukauf. Zweiter Bruch oder leere Kasse: Equity Cure bis Ende des Folgemonats, sonst Zwangsverkauf zu 70 % des Unternehmenswerts (Bank zuerst). Ausschüttungen nur unter 2,5×.
- **Buy-and-Build** (`platform.ts`): ab Family Office, 65 Ruf, Mehrheit und 400.000 € EBITDA; Strategie 30.000 €. Zukaufziele mit 30 % Chance (+10 % Partnerin, +10 % Deal-Flow), 12–40 % des Plattform-EBITDA zu 1,0–1,2 × Größenmultiple. Bank bis 3,25× Gruppen-EBITDA, Kasse der Plattform vor deinem Geld. Integration schnell (4 Monate, 45 % Synergien, 40 % Kundenverlust) oder behutsam (8 Monate, 65 % / 20 %); Synergien 20 % des Zukauf-EBITDA, Kundenverlust 15–35 % des Zukaufumsatzes; mehr Integrationen als Teamkapazität (1 + Partnerin + Associate) kosten zusätzlich. Kartellamt ab 60 Mio. € Gruppenumsatz (2 Monate, 12 % Verbot). Verkauf exklusiv (1 Monat, 0,9–1,0) oder Bieterverfahren (2 Monate, 0,98–1,08), Strategen 0,98–1,1, Finanzinvestoren 0,93–1,03 × Kreditmarkt; der Erlös läuft über die Gesellschafterversammlung und den Wasserfall.
- **Zähler für Tombstones** in `state.mna.record`: Mandate (abgeschlossen, gescheitert, Honorare, zufriedene Mandanten), Suchen und gescheiterte Suchen, Käufe, gelungene und holprige Übergaben, Zukäufe, Synergien, missglückte Integrationen, Kartellamt, Covenant-Brüche, Zwangsverkäufe, Plattform-Exits mit Multiple beim Kauf und Verkauf, MOIC und Zahl der Zukäufe.
- **Karriere**: Nebenziel „M&A-Berater“ (Index 2), neue Stufe „Plattform-Investor“ nach dem Fonds (Plattform mit mindestens zwei Zukäufen mit Gewinn verkauft).

## Umsetzung: Immobilien, Lebenswerk, Stiftung, Dynastie

- **Immobilien** (`estate.ts`, Seite `/immobilien`): ab 400.000 € Vermögen jedes Quartal fünf Angebote (zwei Wohnungen, ein Mehrfamilienhaus, ein Gewerbeobjekt, ein Penthouse) in Berlin, Hamburg, München, Frankfurt, Wien und Luzern; Nebenkosten 4,5–9,5 % je Stadt. Wohnung 280–620 T€, 3,6–4,2 % Bruttorendite, Beleihung bis 80 %; Mehrfamilienhaus 1,4–3,6 Mio. €, 4,3–5,0 %, bis 75 % (ab 1,5 Mio. € Vermögen); Gewerbe 3,5–9 Mio. €, 5,6–6,6 %, bis 65 %, Leerstand 6/10/16/24 % je Konjunktur (ab 4 Mio. €); Penthouse 2,4–4,5 Mio. €, bis 60 %, ab 60 Ruf und 3 Mio. €. Kauf 2 Tage, Sanierung 1 Tag (10 % des Werts, drei Monate 20 % Leerstand, danach Zustand +1 und Miete +6 %), Verkauf 1 Tag (3 % Makler, Vorfälligkeit 1 % je Restjahr der Bindung, höchstens 5 %). Zustand 1–5 sinkt alle 48 Monate, er bewegt Leerstand und Wert. Instandhaltung 1,0–1,6 % des Werts im Jahr, Miete steigt 1–2 % im Jahr.
- **Hypothek**: Annuität mit 2 % Anfangstilgung. Zins = Marktzins der Bindung (5 Jahre −0,4, 15 Jahre +0,3 Punkte zum 10-Jahres-Zins) + Aufschlag der Objektart (0 bis 0,5) + 0,1 je angefangene 5 Punkte Beleihung über 60 %; warmer Bankkontakt (Wärme ab 50) −0,2. Sechs Monate vor Ablauf schreibt die Bank. Anschlusszins zum dann gültigen Marktzins; liegt der Beleihungsauslauf über der Grenze, verlangt die Bank eine Sondertilgung.
- **Zinszyklus** (fest, deterministisch, für alle Spiele gleich): 10 Jahre fest 3,4 % zum Start, erste Wende ab Monat 58 (+2 Punkte in vier Quartalsschritten), dann alle 66 Monate abwechselnd −2 und +2 Punkte. Die Wirtschaftsnachrichten kündigen jede Wende 9 Monate vorher an, eine zweite Meldung kommt zum Beginn. Marktwert = Kaufpreis × Mietentwicklung × (1 − Zinsempfindlichkeit × Zinsänderung seit Kauf) × Zustand; Zinsempfindlichkeit 6–8 % je Punkt, Gewerbe verliert zusätzlich mit hohem Leerstand.
- **Penthouse als Büro-Ersatz**: solange eins im Bestand ist, entfällt die Büromiete, die Vorteile der Büro-Stufe bleiben. Einmalig +3 Ruf, jedes Jahr ein Neujahrsempfang (+1 Ruf, +5 Wärme für die drei wärmsten Kontakte).
- **Nebenziel Immobilien-Magnat**: Marktwert der Anlageobjekte ohne Penthouse; Bronze 2 Mio. €, Silber 8 Mio. €, Gold 20 Mio. €.
- **Verwaltetes Vermögen (AuM)** (`legacy.ts`): Nettovermögen der Familie, sobald es ein Family Office gibt, plus volle Größe aller eigenen Fonds (Geld der Investoren eingeschlossen; Fonds II/III gehören in `managedAssets`) plus Stiftungskapital. Stufe „Fondsfamilie“ ab 1 Mrd. € (Höchststand zum Monatsende, mit eigenem Fonds).
- **Lebenswerk-Wert** (nur Anzeige, Verlauf je Quartal): 1 Punkt je Mio. € Vermögen, 3 je Firmenverkauf, 5 je Plattform-Verkauf, 1,5 je gestifteter Mio. €, 0,05 je geförderter Person, 0,5 je Rufpunkt, 2 je Tombstone.
- **Stiftung**: ab Family Office, 70 Ruf und 5 Mio. € Vermögen, mindestens 1 Mio. € Grundstock, 20.000 € Gründung, 2 Tage; Zustiftungen ab 250.000 € (1 Tag). Unwiderruflich, zählt nicht mehr zum Vermögen. Lokale Steuerregel: Zuwendungen bis 1 Mio. € in zehn Jahren werden mit dem nächsten Monatsabschluss zu 42 % erstattet. Ruf: Gründung +3 (+1 je weitere volle Mio., höchstens +3), Zustiftung +1 je volle Mio. (höchstens +3), jedes Jahr +1. Ertrag 3 % im Jahr fließt in Bildung (2.000 € je Person), Gründerinnen (20.000 €) oder Nachfolge-Werkstatt (10.000 €).
- **Dynastie** (`dynasty.ts`): ab Family Office. Kind (Jonas, Reife 15, +0,2 im Monat, +0,55 je Mentoring-Tag, Übergabe frühestens nach 48 Monaten, im Beirat 70 % Treffer, +1 Ruf im Jahr) oder Schützling (Dr. Nadia Karimi, Reife 40, +0,15 / +0,35, sofort möglich, 80 % Treffer): bei zwei Tagen im Monat etwa 50 bzw. 47 Monate. Höchstens drei Mentoring-Tage im Monat. Jedes Jahr 10 % Chance auf eine Durststrecke (sechs Monate fast ohne Reife); mit mindestens sechs Mentoring-Tagen in dieser Zeit bricht die Nachfolge zu 15 % ab, ohne zu 60 %; dann bleibt die andere Person. Familiencharta (fünf Artikel, je 1 Tag und 2.500 €, +6 Zusammenhalt), Familienrat jeden April mit einer Frage und zwei Antworten (1 Tag; ohne Antwort −3). Übergabe (3 Tage) ab Reife 80, Zusammenhalt 60 und zwei Charta-Artikeln.
- **Generation 2**: Die Nachfolge entscheidet alle Beiratsvorlagen (wie ein Associate mit eigener Trefferquote, halber Ruf); operative Züge (Beteiligungen, Runden, Mandate, Übernahmen, Hebel, Aufträge, Team) sind gesperrt. Der Spieler verwaltet das Familienvermögen: Anlagestrategie des Family Office (Bewahren, Ausgewogen, Wachstum; schichtet jeden Monat das Geld über einer Reserve von 150.000 € plus sechs Monatskosten um), Immobilien, Stiftung, Familienrat. Zusammenhalt unter 40: jedes Jahr lässt sich ein Familienzweig mit 3 % des Vermögens auszahlen.
- **Bots** (`wealth-bots.ts`): Experte kauft ab 3 Mio. € Mehrfamilienhäuser oder Wohnungen (70 %, 10 Jahre, bis 15 % des Vermögens), Mogul ein Penthouse und Mehrfamilienhäuser (60 %, 15 Jahre), Stiftung mit 1 Mio. € ab 8 Mio. € Vermögen und die Dynastie mit Übergabe; PE-Profi Gewerbe mit voller Beleihung und 5 Jahren Bindung. Vor einer angekündigten Zinswende nach oben schreiben alle 15 Jahre fest.

## Später

Vorgemerkt, nicht gebaut:

- **S2 Sammlung**: Kunst, Uhren, Oldtimer und Wein im Tresorraum, mit Wertentwicklung, Versicherung, Fälschungsrisiko und Türen zu Kontakten.
- **F1 Quartalsziele**: Ziele für jedes Quartal mit kleiner Belohnung.
- **F3 Geschichten über Jahre**: Handlungsstränge, die sich über mehrere Spieljahre ziehen.
- **G1 Szenarien**: Startszenarien mit eigenen Bedingungen.
- **Steuerbüro und Steuersystem fürs ganze Spiel**: Einkommen-, Kapitalertrag-, Gewerbe- und Erbschaftsteuer, Spekulationsfrist bei Immobilien, ein Steuerbüro im Netzwerk. Die Stiftung nutzt bis dahin eine einfache lokale Regel (42 % Erstattung auf Zustiftungen bis 1 Mio. € in zehn Jahren, `legacy.ts`); mit dem Steuersystem wandert sie dorthin. Auch die Anleihen an der Börse sollen dann dem Zinszyklus folgen.
