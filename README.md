# Boardroom

Browser-Strategiespiel mit Lerneffekt: Du startest als Business Angel mit 150.000 € Privatkapital, steigst mit 12 % bei einem Startup ein und sitzt in dessen Beirat. Jeder Monat hat 20 Arbeitstage. Du prüfst Angebote, stellst Rückfragen, rechnest mit dem CFO, führst Vorgespräche und stimmst in Beiratssitzungen ab. Die Firmen laufen in einer Simulation weiter; was du entscheidest, zeigt sich Monate später im Monatsbericht. Fernziel: vom Angel über Mehrheitsgesellschafter und Konzern-Beirat zur eigenen PE-Firma.

Konzept und Entscheidungen: [`docs/boardroom-konzept.md`](./docs/boardroom-konzept.md). Deployment: Das Vercel-Projekt `biz-sim` ist mit dem Repo verbunden, jeder Push auf den Branch geht automatisch in Produktion. Details: [`docs/deployment-vercel.md`](./docs/deployment-vercel.md).

## Stand: Phase 2 (Wachsen)

- **Cap Table:** Jede Firma zeigt, wem sie gehört (Gründung, Fonds, Angels, Mitarbeiterpool, neue Investoren, du). Verwässerung durch Runden, Optionspools und Halteprämien landet beim richtigen Gesellschafter.
- **Finanzierungsrunden:** Wird das Geld knapp, suchen die Gründer Investoren. Finanzierbare Firmen bekommen ein Angebot (Seed, Serie A, Brückenrunde bei niedrigem Preis), schwache nicht. Du entscheidest: nicht mitziehen, halb pro rata, pro rata oder die Runde anführen (ab 40 Ruf).
- **Gesellschafterversammlung:** Hier zählt jedes Prozent. Ein Halbrund aus 100 Anteilen füllt sich Stimme für Stimme; bei einer Down Round stimmen frühe Angels und Fonds dagegen.
- **Weg zur Mehrheit:** Anteile kaufen, wenn jemand verkauft, oder selbst anfragen (Gründer verkaufen nur mit Vertrauen und Aufschlag); Leistungsanteile für starke Beiratsarbeit; über 50 % macht dich zum Mehrheitsgesellschafter.
- **Netzwerk in drei Ringen:** persönliche Kontakte, Branchenprofis (ab 35 Ruf), Entscheider (ab 55 Ruf). Treffen wärmt, ein Gefallen kühlt ab. Kontakte bringen Kunden, Personal, Kredite, Zuschüsse, bessere Rundenpreise, Anteilsangebote oder neue Deals.
- **Mehr Deal-Flow:** drei weitere Startups (Grünblatt, Lernwerk, Pfandpilot), halbe Tickets für kleines Budget.
- **Karriereleiter** im Büro: Business Angel → Lead-Investor → Mehrheitsgesellschafter, die oberen Stufen folgen in Phase 3 und 4.
- Sechs neue Lernkarten: Pre-/Post-Money, Pro rata, Stimmrechte, Down Round, Secondaries, Netzwerk.
- Alte Spielstände aus Phase 1 werden beim Laden automatisch ergänzt.

## Phase 1 (spielbares erstes Jahr)

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
app/(app)/            Büro (/), portfolio, firma/[id], sitzung/[itemId], gv/[roundId], netzwerk, post, kalender, notizbuch, konto; actions.ts (eine Server Action für alle Züge)
app/login/            Magic-Link-Login
components/boardroom/ Ratstisch (RoundTable), 3D-Raum (BoardRoom3D), Sprechkarte, Protokoll, Phasen, Endabstimmung, Sitzungsablauf
components/office/    Schreibtisch mit Karriereleiter
components/shares/    Cap Table, Gesellschafterversammlung
components/network/   Netzwerk-Ringe
components/company/   Portfolio, Firma, CFO-Rechner
components/post/      Posteingang und Angebote
components/shell/     Kopfzeile, Monatsabschluss, Monatsbericht, Dreh-Hinweis
lib/game/             Spiellogik: engine, sim, meeting, votes, judge, cfo, captable, network, career, startups, content (Vorlagen), lessons, views, validate, bots
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
