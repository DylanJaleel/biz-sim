# Business Simulator

Rundenbasiertes Browser-Strategiespiel: Spieler gründen mit wenig Eigenkapital + Bankkredit eine Handwerksfirma. Es gibt keine Ziellinie – die Aufträge tragen den Betrieb gerade so, der Gewinn fließt in Wachstum (Mitarbeiter, Werkzeugqualität, Fahrzeuge, größere Werkstatt, später ein zweiter Standort). Wer zu schnell wächst oder schlampig plant, geht insolvent.

Vollständige Konzept- und MVP-Spec: [`docs/business-sim-game-design.md`](./docs/business-sim-game-design.md).
Wirtschaftsmodell: [`docs/game-economy-design.md`](./docs/game-economy-design.md).
Phasenplan für die weitere Umsetzung: [`docs/implementation-plan.md`](./docs/implementation-plan.md).

## Aktueller Stand

Phase 0–4 des Implementierungsplans sind umgesetzt: getestete Spiellogik, Datenbank, **Login per Magic Link** (mit Rate-Limit) und die **spielbare, offene Wochenschleife**: Aufträge nach Stunden-Kapazität annehmen, Team einstellen/kündigen, Fahrzeuge kaufen, Werkzeug und Werkstatt ausbauen, Woche abschließen mit Bilanz-Sheet, Insolvenz und Neustart. Die Oberfläche ist mobile-first (Tabs: Übersicht, Betrieb, Bank, Konto). Das Wirtschaftsmodell ist in [`docs/game-economy-design.md`](./docs/game-economy-design.md) hergeleitet und per Simulation abgesichert. Noch **nicht** vorhanden: zweiter Standort, Lager, Marketing, Steuern (Roadmap im Design-Dokument).

Auf Vercel deployen: [`docs/deployment-vercel.md`](./docs/deployment-vercel.md).

## Stack

- Next.js 16 (App Router, Cache Components) + React 19 + TypeScript + Tailwind 4
- Auth.js (`next-auth` v5) mit Magic Link über Resend, JWT-Sessions, Prisma-Adapter
- Prisma (Schema in `prisma/schema.prisma`, Provider `postgresql`); lokal läuft die DB als PGlite hinter einem Postgres-Wire-Protocol-Socket (`@electric-sql/pglite-socket`), produktiv ein verwaltetes Postgres (Vercel Postgres/Supabase)
- Vitest für die Spiellogik in `lib/` und einen DB-Integrationstest in `tests/repository.test.ts`

## Projektstruktur

```
app/               Next.js App Router: `(app)/` = eingeloggter Bereich mit Tab-Bar (Übersicht, Betrieb, Bank, Konto), `login/`, `api/auth/`
auth.ts            Auth.js-Konfiguration (Magic Link, Dev-Fallback ohne Resend-Key)
proxy.ts           Optimistischer Redirect auf /login (echte Prüfung in lib/session.ts)
components/        UI-Komponenten (Cards, Auftragsmarkt, Betrieb/Investitionen, Wochenbilanz)
lib/               Spiellogik — reine, testbare Funktionen (economy: Wochenberechnung/Markt/Kosten, investments, loan, outcome, simulation)
lib/repository/    Datenzugriffsschicht (Company/Loan/Order laden & Runden persistieren)
prisma/            Schema + versionierte Migrationen (gleiche SQL-Dateien lokal, in Tests und auf Vercel)
scripts/           create-migration.mjs (Migrationen ohne Shadow-DB), vercel-build.mjs
tests/             Vitest-Tests, lib/-Logik + Repository-Integrationstest
docs/              Spec, Wirtschafts-Design, Implementierungsplan
```

## Entwicklung

```bash
npm install
cp .env.example .env.local   # dann AUTH_SECRET setzen: openssl rand -base64 32
npm run db:migrate  # versionierte Migrationen auf die lokale PGlite-DB anwenden
npm run dev      # startet die lokale PGlite-DB + Dev-Server auf http://localhost:3000
npm test         # Vitest-Suite (lib/, Balance-Simulation, DB-Integrationstests gegen PGlite)
npm run simulate # Balance-Report: Skript-Spieler × 200 Zufallsverläufe
npm run db:migration -- name   # neue Migration aus Änderungen an schema.prisma erzeugen
npm run lint     # ESLint
npm run build    # Produktions-Build (inkl. Typecheck)
```

`npm run dev`, `db:migrate` und `db:studio` starten jeweils selbst eine lokale PGlite-Instanz (Daten in `.pglite-data/`, gitignored) — es ist keine separate Datenbank-Installation nötig. Für ein Produktiv-Deployment `DATABASE_URL` auf ein echtes Postgres setzen (siehe `.env.example`).

**Login lokal testen:** Ohne `RESEND_API_KEY` schickt die App keine E-Mail, sondern gibt den Magic Link in der Konsole des Dev-Servers aus (`[auth] Magic link for …`). Link öffnen → eingeloggt; die Firma wird beim ersten Besuch angelegt. Für echte E-Mails `RESEND_API_KEY` und `AUTH_EMAIL_FROM` (verifizierte Absender-Domain) setzen.
