# Business Simulator

Rundenbasiertes Browser-Strategiespiel: Spieler gründen mit wenig Eigenkapital + Bankkredit eine Handwerksfirma und müssen innerhalb von 52 Wochen den Kredit tilgen und einen Mindestgewinn erreichen, während operative Komplexität (Personal, Lagerhaltung) mit dem Firmenwachstum freigeschaltet wird.

Vollständige Konzept- und MVP-Spec: [`docs/business-sim-game-design.md`](./docs/business-sim-game-design.md).
Phasenplan für die weitere Umsetzung: [`docs/implementation-plan.md`](./docs/implementation-plan.md).

## Aktueller Stand

Dieser Stand entspricht Phase 0 des Implementierungsplans: Projekt-Skeleton + die vollständige, getestete Spiellogik (Kredittilgung, Auftragspool, Zufallsereignisse, Meilenstein-Check, Insolvenz-Trigger, Stufen-Freischaltung). Das Dashboard unter `/` rendert diese Logik bereits mit deterministischen Beispieldaten — noch **ohne** Login, Datenbank-Persistenz oder interaktive Entscheidungen (siehe Phase 1–3 im Implementierungsplan).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4
- Prisma (Schema in `prisma/schema.prisma`, Provider `postgresql`; lokale Anbindung via PGlite folgt in Phase 1)
- Vitest für die Spiellogik in `lib/`

## Projektstruktur

```
app/            Next.js App Router Routes (aktuell: Dashboard)
components/     UI-Komponenten (Cards, Auftragspool, Wochenbilanz, Fortschrittsbalken)
lib/            Spiellogik — reine, testbare Funktionen (Rundenberechnung, Kredit, Zufallsereignisse, Meilensteine)
prisma/         Schema (Migrationen folgen mit der DB-Anbindung)
tests/          Vitest-Tests, Fokus auf lib/
docs/           Spec + Implementierungsplan
```

## Entwicklung

```bash
npm install
npm run dev     # Dev-Server auf http://localhost:3000
npm test        # Vitest-Suite (lib/-Logik)
npm run lint     # ESLint
npm run build    # Produktions-Build (inkl. Typecheck)
```
