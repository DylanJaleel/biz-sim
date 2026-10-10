# Business Simulator

Rundenbasiertes Browser-Strategiespiel: Spieler gründen mit wenig Eigenkapital + Bankkredit eine Handwerksfirma und müssen innerhalb von 52 Wochen den Kredit tilgen und einen Mindestgewinn erreichen, während operative Komplexität (Personal, Lagerhaltung) mit dem Firmenwachstum freigeschaltet wird.

Vollständige Konzept- und MVP-Spec: [`docs/business-sim-game-design.md`](./docs/business-sim-game-design.md).
Phasenplan für die weitere Umsetzung: [`docs/implementation-plan.md`](./docs/implementation-plan.md).

## Aktueller Stand

Phase 0 und Phase 1 des Implementierungsplans sind umgesetzt: die vollständige, getestete Spiellogik (Kredittilgung, Auftragspool, Zufallsereignisse, Meilenstein-Check, Insolvenz-Trigger, Stufen-Freischaltung) plus eine echte Datenbank-Anbindung. Das Dashboard unter `/` liest den Stand einer seedbaren Demo-Firma aus der DB — noch **ohne** Login oder interaktive Auftragsannahme (siehe Phase 2–3 im Implementierungsplan).

## Stack

- Next.js 16 (App Router, Cache Components) + React 19 + TypeScript + Tailwind 4
- Prisma (Schema in `prisma/schema.prisma`, Provider `postgresql`); lokal läuft die DB als PGlite hinter einem Postgres-Wire-Protocol-Socket (`@electric-sql/pglite-socket`), produktiv ein verwaltetes Postgres (Vercel Postgres/Supabase)
- Vitest für die Spiellogik in `lib/` und einen DB-Integrationstest in `tests/repository.test.ts`

## Projektstruktur

```
app/               Next.js App Router Routes (aktuell: Dashboard)
components/        UI-Komponenten (Cards, Auftragspool, Wochenbilanz, Fortschrittsbalken)
lib/               Spiellogik — reine, testbare Funktionen (Rundenberechnung, Kredit, Zufallsereignisse, Meilensteine)
lib/repository/    Datenzugriffsschicht (Company/Loan/Order laden & Runden persistieren)
prisma/            Schema (siehe docs/implementation-plan.md Phase 1 zur Migrations-Strategie)
scripts/           Seed-Skript für die lokale Demo-Firma
tests/             Vitest-Tests, lib/-Logik + Repository-Integrationstest
docs/              Spec + Implementierungsplan
```

## Entwicklung

```bash
npm install
npm run db:push  # Schema einmalig gegen die lokale PGlite-DB synchronisieren
npm run db:seed  # Demo-Firma anlegen (idempotent)
npm run dev      # startet die lokale PGlite-DB + Dev-Server auf http://localhost:3000
npm test         # Vitest-Suite (lib/ + Repository-Integrationstest)
npm run lint     # ESLint
npm run build    # Produktions-Build (inkl. Typecheck)
```

`npm run dev`, `db:push`, `db:seed` und `db:studio` starten jeweils selbst eine lokale PGlite-Instanz (Daten in `.pglite-data/`, gitignored) — es ist keine separate Datenbank-Installation nötig. Für ein Produktiv-Deployment `DATABASE_URL` auf ein echtes Postgres setzen (siehe `.env.example`).
