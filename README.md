# Boardroom

Browser-Strategiespiel mit Lerneffekt: Du startest als Business Angel mit 150.000 € Privatkapital, steigst mit 12 % bei einem Startup ein und sitzt in dessen Beirat. Jeder Monat hat 20 Arbeitstage. Du prüfst Angebote, stellst Rückfragen, rechnest mit dem CFO, führst Vorgespräche und stimmst in Beiratssitzungen ab. Die Firmen laufen in einer Simulation weiter; was du entscheidest, zeigt sich Monate später im Monatsbericht. Fernziel: vom Angel über Mehrheitsgesellschafter und Konzern-Beirat zur eigenen PE-Firma.

Konzept und Entscheidungen: [`docs/boardroom-konzept.md`](./docs/boardroom-konzept.md). Auf Vercel deployen: [`docs/deployment-vercel.md`](./docs/deployment-vercel.md).

## Stand: Phase 1 (spielbares erstes Jahr)

- **Büro:** Schreibtisch von oben. Laptop (Portfolio), Telefon (Post), Vorlagenmappe, Kalender, Notizbuch; die Assistenz sortiert, was ansteht. Visitenkarten (Netzwerk) folgen in Phase 2.
- **Post:** Beteiligungsangebote mit Konditionen, Due Diligence (3 Tage) deckt Stärken und Risiken auf, Einstieg kostet das Ticket.
- **Firma:** Kennzahlen (Umsatz, Cashflow, Kasse, Runway, Bewertung, Anteil, Team, Vertrauen), offene Vorlage mit Rückfragen, CFO-Gespräch (Kasse, Runway und erwarteter Wert jeder Option), Vorgespräche mit den Beiratsmitgliedern, Rechner „Was wäre, wenn …“ (Einstellungen, Preis, Eigenkapital oder Kredit, schwacher Markt), Entscheidungshistorie.
- **Beiratssitzung:** runde Avatare am Halbrund-Tisch, Spotlight auf wer spricht, **Linien am Tischrand, wenn Leute zueinander sprechen** (Zustimmung durchgezogen, Widerspruch gepunktet), in der Tischmitte ein **Live-Halbrund**, das sich mit Tendenzen und Stimmanteilen füllt. Du bringst ein Argument ein und stimmst ab; 20 Stimmanteile pro Person. Auf großen Bildschirmen gibt es zusätzlich den 3D-Raum aus dem Boardroom-Repo. Danach: Endabstimmung als Parlaments-Halbrund, Rückblick (Urteil nach Planrechnung, nicht nach Glück), neue Lernkarte.
- **Kalender** mit belegten Tagen und Monatsberichten, **Notizbuch** mit 17 Lernkarten.
- **Geräte:** Desktop und Tablet; Handys im Querformat (im Hochformat erscheint ein Dreh-Hinweis).

Alle Zahlen rechnet die Spiellogik in `lib/game` (deterministisch, gesät). Es gibt in Phase 1 keine KI.

## Stack

- Next.js 16 (App Router, Cache Components) + React 19 + TypeScript + Tailwind 4, `motion` für Animationen, `three` für den 3D-Raum
- Auth.js (`next-auth` v5) mit Magic Link über Resend, JWT-Sessions, Prisma-Adapter
- Prisma + Postgres; lokal PGlite hinter einem Postgres-Wire-Socket (`@electric-sql/pglite-socket`). Der ganze Spielstand liegt als JSON-Dokument in `Game.state`, geschützt durch `revision` und eine Zeilensperre.
- Vitest für Spiellogik, Balancing (Skript-Spieler), Ansichten und Repository

## Projektstruktur

```
app/(app)/            Büro (/), portfolio, firma/[id], sitzung/[itemId], post, kalender, notizbuch, konto; actions.ts (eine Server Action für alle Züge)
app/login/            Magic-Link-Login
components/boardroom/ Ratstisch (RoundTable), 3D-Raum (BoardRoom3D), Sprechkarte, Protokoll, Phasen, Endabstimmung, Sitzungsablauf
components/office/    Schreibtisch
components/company/   Portfolio, Firma, CFO-Rechner
components/post/      Posteingang und Angebote
components/shell/     Kopfzeile, Monatsabschluss, Monatsbericht, Dreh-Hinweis
lib/game/             Spiellogik: engine, sim, meeting, votes, judge, cfo, startups, content (Vorlagen), lessons, views, validate, bots
lib/repository/       Spielstand laden, Züge unter Sperre anwenden, zurücksetzen
prisma/               Schema und versionierte Migrationen
scripts/              simulate-game.ts (Balance-Report), create-migration.mjs, vercel-build.mjs
tests/                Engine, Balancing, Ansichten, Repository, Mail, Rate-Limit
docs/                 Konzept, Deployment, ältere Dokumente des Handwerksspiels
```

## Entwicklung

```bash
npm install
cp .env.example .env.local   # dann AUTH_SECRET setzen: openssl rand -base64 32
npm run db:migrate  # Migrationen auf die lokale PGlite-DB anwenden
npm run dev         # lokale DB + Dev-Server auf http://localhost:3000
npm test            # Vitest
npm run simulate    # Balance-Report: Skript-Spieler über 24 Monate
npm run lint
npm run build
```

**Login lokal:** Ohne `RESEND_API_KEY` steht der Magic Link in der Konsole des Dev-Servers (`[auth] Magic link for …`). Link öffnen, das Spiel startet beim ersten Besuch.
