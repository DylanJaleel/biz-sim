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
- **Syndikat:** Rundenoption `syndicate` (ab 45 Ruf, Angel-Club gekannt und ≥ 40 Wärme, kostet 15 Wärme). Das Syndikat ist ein eigener Gesellschafter mit Präferenz und Einstand, stimmt wie der Spieler; Carry 20 % auf den Gewinn beim Verkauf.
- **Büros** (`office.ts`): fünf Stufen mit Miete, Ruf- und Vermögensgrenze, Extra-Aufträgen, kürzerer Prüfung, Analyst (CFO-Gespräch und Rückfragen ohne Tage), Extra-Tagen. Umziehen kostet eine Monatsmiete, kleiner ziehen ist jederzeit möglich.
- **Konzern** (`corporate.ts`): Nordhafen AG als Firma mit `corporate: true`, ohne Anteile, mit eigenen sechs Vorlagen (nur dort), Sitzung im Monat nach dem Einstieg und dann quartalsweise, Kreditlinie statt Insolvenz. Das CFO-Urteil rechnet mit 1 % der Firma, damit Entscheidungen ohne eigene Anteile bewertet werden können.
- **Nachrichten** (`news.ts`): 17 Ereignisse nach Branche oder Einzelfirma; ab Monat 3 mit 40 % Chance, ab Monat 9 mit 60 % (davon 30 % doppelt), kein Ereignis zweimal in acht Monaten. Positive und negative Wirkungen sind so abgestimmt, dass der Median-Wert der Skript-Spieler gegenüber Phase 2 kaum steigt.
- **Balance** (100 Seeds, 24 Monate, Pendelwerk): passiv 81 T€, Ja-Sager 255 T€, Zufall 145 T€, Analyst 422 T€, Profi 510 T€, nur Beratung 171 T€. Der Profi erreicht im Median das eigene Büro mit Assistenz; zwei Drittel bekommen den Aufsichtsrat, wenn sie konsequent stark entscheiden.
- **Phase 4** hat Family Office, Team, Fonds, Buyouts und Börsengang gebracht (siehe unten).

## Umsetzung Phase 4

- **Deal-Generator** (`dealgen.ts`): zehn Branchen mit je drei bis vier Ideen und einer Nachfolge-Idee, Namen-, Personen- und Fondspools, vier Stufen mit eigenen Spannen für Umsatz, Wachstum, Verbrauch, Reichweite und Anteil. Jede Firma bekommt eine echte Stärke und eine echte Schwäche in den Achsen; die Prüfung nennt beide. Ab Monat 4 kommt mit 40 % Chance pro Monat ein neues Angebot (+15 % mit warmem Deal-Flow-Kontakt, +5 % mit Büro, +1 pro Partnerin, immer eines, wenn nichts läuft), höchstens drei offen. Die Stufe hängt vom Vermögen ab, Nachfolgen erst ab 55 Ruf und 600.000 € Vermögen. Abgelaufene erzeugte Angebote werden gelöscht, damit der Spielstand klein bleibt.
- **Buyout:** Kauf der Mehrheit (60–80 %) zum heutigen Wert, wahlweise 40 % über einen Kaufkredit (5,5 %, 96 Monate Annuität, Rate über das Privatkonto, Restschuld wird beim Verkauf getilgt). Ausschüttung jedes Quartal, wenn Spieler und Fonds zusammen über 50 % halten und die Firma Geld verdient: 70 % dessen, was über drei Monatskosten in der Kasse liegt, nach Anteilen.
- **Family Office:** ab 70 Ruf, 1 Mio. € Vermögen, Büro-Stufe 3, 40.000 € Gründung. Associates entscheiden am Monatsende offene Vorlagen ihres Mandats (70 % die beste Option, sonst „mit Auflagen“), die Rufänderung wird halbiert. Die Partnerin gibt drei Tage und einen Deal pro Monat.
- **Fonds:** ab Family Office, 80 Ruf und einem Verkauf. Größe 3 Mio. € + 1,5 Mio. € pro Verkauf + 100.000 € pro Ruf über 80, höchstens 15 Mio. €. Er investiert bei neuen Einstiegen das Doppelte des Tickets (höchstens ein Viertel des Fonds pro Firma): bei Startups neue Anteile mit Präferenz, bei Nachfolgen Anteile vom Verkäufer. Gebühr 2 % im Jahr, Carry 20 % auf den Gewinn des Fonds-Gesellschafters im Wasserfall.
- **Börsengang:** ab 12 Mio. € Wert, 12 Monate Haltedauer und 1,2 % Wachstum, 5 % Chance pro Monat (mal Marktklima), Bewertung 1,1–1,6 × Wert. Die Hälfte des Erlöses sofort, der Rest nach sechs Monaten mal Entwicklung des Tech-Index.
- **Vielfalt:** elf neue Vorlagen (sechs für Startups, fünf nur für Mittelstand), 29 Nachrichten, 16 Beratungsaufträge, Aufsichtsratsvorlagen wiederholen sich nach 18 Monaten, Jahresbilanz per Post.
- **Balance im langen Spiel** (60 Monate, Pendelwerk als Einstieg, Median): Ja-Sager etwa 0,8 Mio. €, Zufall 0,2 Mio. €, Analyst mit einer Firma 1,5–1,7 Mio. €, „Mogul“ (breit investieren, Nachfolgen, Family Office, Fonds) 2,5–2,9 Mio. € bei elf Mandaten, aber mit 25 % Wahrscheinlichkeit für mindestens eine Insolvenz. Nur zuschauen endet unter dem Startkapital. Der Test `the long game` hält fest, dass der Mogul den Ja-Sager deutlich schlägt und die oberen Karrierestufen erreicht.
- **Offen:** isometrische Büros, mehrere offene Vorlagen pro Firma, Fonds-Laufzeit mit Rückzahlung an die Investoren, Fonds II.

## Tagesordnung (2A) und Warteschlange

- **Umgesetzt (2A):** bis zu drei offene Punkte pro Firma (`AGENDA_MAX`), in Quartalsmonaten zwei plus 20 % Chance auf einen dritten, sonst einer, wenn keiner offen ist; dringende Vorlagen kommen immer dazu. Weitere Punkte derselben Sitzung kosten keinen Tag und zählen für den Ruf halb. Nicht dringende Punkte werden einmal vertagt (`BoardItem.postponed`), danach entscheidet die Geschäftsführung allein. Die Beiratsvorlage „Übernahmeangebot“ zahlt jetzt das 1,15-Fache (Nachverhandeln 1,35-Fache), weil sie mit mehr Punkten pro Quartal früher auftaucht.
- **Balance nach 2A** (40 Spiele, 24 Monate, Pendelwerk, Median): passiv 86 T€, Ja-Sager 326 T€ (Ruf 79), Zufall 207 T€, Analyst 515 T€, Profi 548 T€. Mehr Entscheidungen heißen mehr Einfluss; der Abstand zwischen sorgfältig und blind bleibt deutlich. Ein Büro zahlt sich nicht mehr automatisch aus, weil die Tage knapper sind.
- **Warteschlange:** 3B (Investoren mit Erwartungen, jährliche Investorenversammlung) kommt, wenn Punkt 3 angegangen wird, dann zusammen mit dem Fondszyklus; derzeit nicht nötig.
- **In Prüfung:** 1A (isometrische Räume) und 1B (begehbares 3D-Büro) als interaktive Visualisierung, Entscheidung vor dem Einbau.

