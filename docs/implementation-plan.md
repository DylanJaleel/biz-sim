# Implementierungsplan – Business Simulator MVP

Dieser Plan setzt [`business-sim-game-design.md`](./business-sim-game-design.md) um. Er ist in Phasen gegliedert; jede Phase ist für sich abschließbar und testbar. Phase 0 ist in diesem PR bereits umgesetzt.

## Phase 0 – Fundament (dieser PR)

**Ziel:** Projekt-Skeleton + die komplette, testbare Spiellogik stehen, bevor Persistenz/Auth/Interaktivität dazukommen. Beweist, dass die Kernberechnung (Runde → Bilanz → Meilenstein) korrekt und nachvollziehbar ist.

Umgesetzt:
- `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts` — Next.js 16 + React 19 + TypeScript + Tailwind 4 (via `create-next-app`, analog `jos-assistant`).
- `prisma/schema.prisma` — Datenmodell aus Abschnitt 5 der Spec (User, Company, Loan, Milestone, Round, Order, Employee, Warehouse, GameEvent), `provider = "postgresql"` (lokal später über PGlite-Adapter, produktiv Vercel Postgres/Supabase).
- `lib/config.ts` — alle Balancing-Zahlen aus Abschnitt 4.3 als benannte Konstanten.
- `lib/rng.ts`, `lib/loan.ts`, `lib/orders.ts`, `lib/events.ts`, `lib/stage.ts`, `lib/milestones.ts`, `lib/insolvency.ts`, `lib/round.ts` — reine, seedbare Funktionen für Kredittilgung, Auftragspool-Generierung, Zufallsereignisse, Stufen-Freischaltung, Meilenstein-Check, Insolvenz-Trigger und Rundenabschluss.
- `tests/*.test.ts` — Vitest-Abdeckung für alle `lib/`-Funktionen (23 Tests).
- `lib/demo.ts` + `app/page.tsx` + `components/dashboard/*`, `components/ui/*` — Dashboard, das die echte Spiellogik mit deterministischen Beispieldaten rendert (Cards, Fortschrittsbalken, Wochenbilanz, Auftragspool). Noch ohne Login/Persistenz — "Annehmen"-Buttons sind bewusst deaktiviert.

Offene Punkte aus Abschnitt 8 der Spec, die in dieser Phase entschieden wurden:
- **Zufallsereignis-Wahrscheinlichkeit:** `RANDOM_EVENT_PROBABILITY_PER_WEEK = 1/5` in `lib/config.ts` (≈ 1 Ereignis alle 5 Wochen, innerhalb des vorgeschlagenen 4–6-Wochen-Fensters).
- **Meilenstein-Zwischenziel:** pro-rata des 52-Wochen-Ziels (`TARGET_CUMULATIVE_PROFIT * weekDue / GAME_LENGTH_WEEKS`), siehe `lib/demo.ts`. Muss in Phase 2 in die serverseitige Meilenstein-Erzeugung übernommen werden.

Noch offen (siehe Abschnitt 8): genaue Mengenrabatt-Formel fürs Lager → Phase 4.

## Phase 1 – Persistenz (DB-Anbindung)

**Ziel:** Spielzustand wird statt in `lib/demo.ts` aus der Datenbank gelesen/geschrieben.

1. `lib/db.ts` — Prisma-Client-Singleton, lokal über `@electric-sql/pglite` + `@prisma/adapter-pglite` (Driver Adapter), produktiv über `DATABASE_URL`.
2. `prisma/migrations/` — erste Migration aus dem bestehenden `schema.prisma` generieren (`prisma migrate dev`).
3. `scripts/seed.ts` — legt eine Demo-Firma mit Startkapital/-kredit an (nutzt `lib/config.ts` + `lib/loan.ts`), ersetzt perspektivisch `lib/demo.ts` als Referenzdaten für lokale Entwicklung.
4. `lib/repository/company.ts` — dünne Datenzugriffsschicht (Company inkl. Loan/Warehouse/Employees laden, Round/Order/GameEvent schreiben) — hält Prisma-Aufrufe aus den Route Handlers/Server Actions heraus.
5. Vitest-Tests für die Repository-Schicht gegen eine In-Memory-PGlite-Instanz.

## Phase 2 – Auth (Magic Link)

**Ziel:** Login via Auth.js + Resend, ein Spielstand pro Account.

1. `auth.ts` — Auth.js-Konfiguration mit Email-Provider (Resend), `@auth/prisma-adapter` gegen das bestehende `User`-Modell.
2. `app/api/auth/[...nextauth]/route.ts` — Auth.js-Route-Handler.
3. `app/login/page.tsx` — einfache Login-Seite (E-Mail-Eingabe, "Link senden").
4. `middleware.ts` — schützt `/` (Dashboard) und leitet nicht eingeloggte Nutzer auf `/login` um.
5. Bei erstem Login: Company inkl. Loan automatisch anlegen (Startkapital/-kredit aus `lib/config.ts`) — in der Repository-Schicht aus Phase 1.
6. Env-Vars dokumentieren: `AUTH_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`, `AUTH_RESEND_FROM`.

## Phase 3 – Interaktive Spielschleife

**Ziel:** Aus dem statischen Dashboard wird die echte Spielschleife aus Abschnitt 3.1.

1. `app/actions/orders.ts` — Server Actions `acceptOrder`/`rejectOrder`, prüfen Kapazität (Solo-Zeit bzw. Geselle-Faktor) vor der Annahme.
2. `app/actions/round.ts` — Server Action `closeRound`: sammelt angenommene Aufträge der Woche, ruft `resolveRound` aus `lib/round.ts` auf, würfelt Event über `maybeGenerateRandomEvent`, persistiert `Round.summaryJson` + `GameEvent`, aktualisiert `Company.cash`/`weekNumber`/`Loan.remainingBalance`, generiert den nächsten Auftragspool über `generateOrderPool`.
3. `components/dashboard/OrderPoolCard.tsx` — "Annehmen"-Button aktivieren, an Server Action binden, Kapazitätsanzeige ergänzen.
4. `components/dashboard/RoundCloseButton.tsx` — löst `closeRound` aus, zeigt optimistischen Ladezustand.
5. Vitest/Playwright: Entscheidung → Rundenabschluss → neue Bilanz als End-to-End-Test.

## Phase 4 – Stufen 2 & 3 (Geselle, Lager)

**Ziel:** Freischaltung und Mechanik aus Abschnitt 3.2 Stufen 2–3.

1. `lib/capacity.ts` — Kapazitätsberechnung (Solo-Basiswert, `+ EMPLOYEE_CAPACITY_FACTOR` je Geselle), nutzt `getUnlockedStage` aus `lib/stage.ts`.
2. `app/actions/employee.ts` — `hireEmployee`/`fireEmployee`, nur ab Stufe 2 (`STAGE_2_CASH_THRESHOLD`) erlaubt.
3. `app/actions/warehouse.ts` — `rentWarehouse`/`cancelWarehouse`, nur ab Stufe 3 (`STAGE_3_CASH_THRESHOLD`) erlaubt.
4. **Mengenrabatt-Formel (offener Punkt aus Spec Abschnitt 8), Vorschlag:** gestaffelter Rabatt auf `materialNeed`, wenn Material aus dem Lager statt ad hoc bestellt wird — z. B. 10 % Rabatt bis 50 % Lagerauslastung, 20 % darüber, gedeckelt durch `WAREHOUSE_CAPACITY_KG`. Als `WAREHOUSE_BULK_DISCOUNT_TIERS` in `lib/config.ts` ablegen und in `lib/warehouse.ts` als reine Funktion `applyBulkDiscount(materialNeed, warehouseUtilization)` testen.
5. `components/dashboard/EmployeeCard.tsx`, `components/dashboard/WarehouseCard.tsx`.

## Phase 5 – Meilensteine, Insolvenz, Sieg

**Ziel:** Sichtbare Konsequenzen aus Abschnitt 3.1 Schritt 5 und 4.4.

1. `lib/milestones.ts` erweitern: `generateMilestoneSchedule(gameLengthWeeks, interval)` erzeugt die 4 Meilenstein-Termine (Woche 13/26/39/52) mit pro-rata-Ziel.
2. In `closeRound` (Phase 3): nach Rundenabschluss prüfen, ob `weekNumber` ein Meilenstein-Termin ist → `checkMilestone` aufrufen, `Milestone.achieved` setzen, bei Verfehlen Zähler für `checkGameOver` hochzählen.
3. `app/actions/round.ts`: `checkGameOver` nach jeder Runde aufrufen, `Company.status` auf `insolvent`/`won` setzen, wenn zutreffend.
4. `app/game-over/page.tsx`, `app/won/page.tsx` — Abschluss-Screens.
5. `components/dashboard/MilestoneCard.tsx`: echten Status statt Demo-Werten anzeigen (Fortschritt, Countdown bis nächster Check).

## Phase 6 – Seed, Deployment, Politur

1. `scripts/seed.ts` vervollständigen (Demo-Firma + ein paar Beispiel-Runden) für neue Entwickler:innen/Playtests.
2. Vercel-Projekt anlegen, `DATABASE_URL` (Vercel Postgres oder Supabase Free Tier), `RESEND_API_KEY`, `AUTH_SECRET` als Env-Vars setzen.
3. `README.md` um Setup-/Deploy-Schritte ergänzen (lokal: PGlite, produktiv: Postgres).
4. Playtesting-Runde gegen die Balancing-Werte aus `lib/config.ts`, danach gezielt anpassen (keine Logik-Änderungen nötig, nur Konstanten).
5. Accessibility-/Responsive-Check des Dashboards (Mobilansicht).

## Nicht in diesem MVP-Plan (siehe Spec Abschnitt 4.2 / 3.3 / 3.4)

Firmenübernahme, Stufen 4–6 (LKW, Standortmanager, Flotte), weitere Branchen, Mehrfach-Szenarien, Multiplayer/Leaderboards, mehrere Spielstände pro Account. Diese bleiben Backlog-Punkte für ein Folgeprojekt, sobald das MVP spielbar und ausbalanciert ist.
