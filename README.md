# Business Simulator

Rundenbasiertes Browser-Strategiespiel: Spieler gründen mit wenig Eigenkapital + Bankkredit eine Handwerksfirma und müssen innerhalb von 52 Wochen den Kredit tilgen und einen Mindestgewinn erreichen, während operative Komplexität (Personal, Lagerhaltung) mit dem Firmenwachstum freigeschaltet wird.

Vollständige Konzept- und MVP-Spec: [`docs/business-sim-game-design.md`](./docs/business-sim-game-design.md).
Phasenplan für die weitere Umsetzung: [`docs/implementation-plan.md`](./docs/implementation-plan.md).

## Aktueller Stand

Phase 0–3 des Implementierungsplans sind umgesetzt: getestete Spiellogik, Datenbank, **Login per Magic Link** (mit Rate-Limit) und die **spielbare Wochenschleife**: Aufträge annehmen/ablehnen/zurückziehen (Kapazität 2 pro Woche, Fristen mit Übertrag), Woche abschließen mit Zusammenfassungs-Sheet, Spielende (Insolvenz / Sieg / Ziel verfehlt) und Neustart. Die Oberfläche ist mobile-first. Start ist immer Stufe 1. Noch **nicht** vorhanden: Personal und Lager (Phase 4), Meilenstein-Konsequenzen (Phase 5).

Auf Vercel deployen: [`docs/deployment-vercel.md`](./docs/deployment-vercel.md).

## Stack

- Next.js 16 (App Router, Cache Components) + React 19 + TypeScript + Tailwind 4
- Auth.js (`next-auth` v5) mit Magic Link über Resend, JWT-Sessions, Prisma-Adapter
- Prisma (Schema in `prisma/schema.prisma`, Provider `postgresql`); lokal läuft die DB als PGlite hinter einem Postgres-Wire-Protocol-Socket (`@electric-sql/pglite-socket`), produktiv ein verwaltetes Postgres (Vercel Postgres/Supabase)
- Vitest für die Spiellogik in `lib/` und einen DB-Integrationstest in `tests/repository.test.ts`

## Projektstruktur

```
app/               Next.js App Router: `(app)/` = eingeloggter Bereich mit Tab-Bar (Übersicht, Bank, Konto), `login/`, `api/auth/`
auth.ts            Auth.js-Konfiguration (Magic Link, Dev-Fallback ohne Resend-Key)
proxy.ts           Optimistischer Redirect auf /login (echte Prüfung in lib/session.ts)
components/        UI-Komponenten (Cards, Auftragspool, Wochenbilanz, Fortschrittsbalken)
lib/               Spiellogik — reine, testbare Funktionen (Rundenberechnung, Kredit, Zufallsereignisse, Meilensteine)
lib/repository/    Datenzugriffsschicht (Company/Loan/Order laden & Runden persistieren)
prisma/            Schema + versionierte Migrationen (gleiche SQL-Dateien lokal, in Tests und auf Vercel)
scripts/           create-migration.mjs (Migrationen ohne Shadow-DB), vercel-build.mjs
tests/             Vitest-Tests, lib/-Logik + Repository-Integrationstest
docs/              Spec + Implementierungsplan
```

## Entwicklung

```bash
npm install
cp .env.example .env.local   # dann AUTH_SECRET setzen: openssl rand -base64 32
npm run db:migrate  # versionierte Migrationen auf die lokale PGlite-DB anwenden
npm run dev      # startet die lokale PGlite-DB + Dev-Server auf http://localhost:3000
npm test         # Vitest-Suite (lib/, DB-Integrationstests gegen PGlite)
npm run db:migration -- name   # neue Migration aus Änderungen an schema.prisma erzeugen
npm run lint     # ESLint
npm run build    # Produktions-Build (inkl. Typecheck)
```

`npm run dev`, `db:migrate` und `db:studio` starten jeweils selbst eine lokale PGlite-Instanz (Daten in `.pglite-data/`, gitignored) — es ist keine separate Datenbank-Installation nötig. Für ein Produktiv-Deployment `DATABASE_URL` auf ein echtes Postgres setzen (siehe `.env.example`).

**Login lokal testen:** Ohne `RESEND_API_KEY` schickt die App keine E-Mail, sondern gibt den Magic Link in der Konsole des Dev-Servers aus (`[auth] Magic link for …`). Link öffnen → eingeloggt; die Firma wird beim ersten Besuch angelegt. Für echte E-Mails `RESEND_API_KEY` und `AUTH_EMAIL_FROM` (verifizierte Absender-Domain) setzen.
