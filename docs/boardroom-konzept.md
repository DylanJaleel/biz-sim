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
- **Offen für Phase 3:** Exit-Verhandlungen in der Gesellschafterversammlung, Liquidationspräferenzen, Büro-Stufen, Konzern-Pfad, mehrere offene Vorlagen pro Firma.
