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
- **Offen für Phase 4:** Family Office mit Team, eigener Fonds, Buyouts, Börsengang, isometrische Büros, mehrere offene Vorlagen pro Firma.

