# Implementierungsplan – Business Simulator MVP

Dieser Plan setzt [`business-sim-game-design.md`](./business-sim-game-design.md) um. Er ist in Phasen gegliedert; jede Phase ist für sich abschließbar und testbar. Phase 0 und Phase 1 sind umgesetzt.

## Phase 0 – Fundament (dieser PR)

**Ziel:** Projekt-Skeleton + die komplette, testbare Spiellogik stehen, bevor Persistenz/Auth/Interaktivität dazukommen. Beweist, dass die Kernberechnung (Runde → Bilanz → Meilenstein) korrekt und nachvollziehbar ist.

Umgesetzt:
- `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts` — Next.js 16 + React 19 + TypeScript + Tailwind 4 (via `create-next-app`, analog `jos-assistant`).
- `prisma/schema.prisma` — Datenmodell aus Abschnitt 5 der Spec (User, Company, Loan, Milestone, Round, Order, Employee, Warehouse, GameEvent), `provider = "postgresql"` (lokal später über PGlite-Adapter, produktiv Vercel Postgres/Supabase).
- `lib/config.ts` — alle Balancing-Zahlen aus Abschnitt 4.3 als benannte Konstanten.
- `lib/rng.ts`, `lib/loan.ts`, `lib/orders.ts`, `lib/events.ts`, `lib/stage.ts`, `lib/milestones.ts`, `lib/insolvency.ts`, `lib/round.ts` — reine, seedbare Funktionen für Kredittilgung, Auftragspool-Generierung, Zufallsereignisse, Stufen-Freischaltung, Meilenstein-Check, Insolvenz-Trigger und Rundenabschluss.
- `tests/*.test.ts` — Vitest-Abdeckung für alle `lib/`-Funktionen (23 Tests).
- `app/page.tsx` + `components/dashboard/*`, `components/ui/*` — Dashboard, das die echte Spiellogik rendert (Cards, Fortschrittsbalken, Wochenbilanz, Auftragspool). Noch ohne Login — "Annehmen"-Buttons sind bewusst deaktiviert.

Offene Punkte aus Abschnitt 8 der Spec, die in dieser Phase entschieden wurden:
- **Zufallsereignis-Wahrscheinlichkeit:** `RANDOM_EVENT_PROBABILITY_PER_WEEK = 1/5` in `lib/config.ts` (≈ 1 Ereignis alle 5 Wochen, innerhalb des vorgeschlagenen 4–6-Wochen-Fensters).
- **Meilenstein-Zwischenziel:** pro-rata des 52-Wochen-Ziels (`TARGET_CUMULATIVE_PROFIT * weekDue / GAME_LENGTH_WEEKS`), siehe `lib/demo.ts`. Muss in Phase 2 in die serverseitige Meilenstein-Erzeugung übernommen werden.

Noch offen (siehe Abschnitt 8): genaue Mengenrabatt-Formel fürs Lager → Phase 4.

## Phase 1 – Persistenz (DB-Anbindung, umgesetzt)

**Ziel:** Spielzustand wird aus der Datenbank gelesen/geschrieben statt aus Beispieldaten.

Umgesetzt:
- `lib/db.ts` — Prisma-Client-Singleton. **Keine** Driver-Adapter-Abhängigkeit: `provider = "postgresql"` im Schema reicht, weil PGlite lokal über einen echten Postgres-Wire-Protocol-Socket angesprochen wird (siehe unten) — das hält lokal und produktiv denselben Codepfad. Der Client wird lazy erzeugt (`getDb()`), damit allein das Importieren des Moduls (z. B. beim `next build`) nie `DATABASE_URL` braucht.
- **Lokale DB:** `@electric-sql/pglite` + `@electric-sql/pglite-socket` (offizielle Pakete, kein Community-Adapter nötig). Das `pglite-server`-CLI aus `pglite-socket` startet PGlite und exponiert es als Postgres-Server auf `127.0.0.1:5433`; `npm run dev` / `db:push` / `db:seed` / `db:studio` wrappen den jeweiligen Befehl darüber (`package.json`). Zwei Stolpersteine, die beim Einrichten aufgetreten sind und die man beim Ändern dieser Scripts im Kopf behalten sollte:
  - **`?sslmode=disable` ist Pflicht** in der `DATABASE_URL` — `pglite-socket` unterstützt kein TLS; ohne den Parameter verhandelt Prismas Postgres-Connector eine SSL-Session, die nie beantwortet wird, und der Aufruf hängt. Die Scripts setzen `DATABASE_URL` deshalb selbst, nicht über die eingebaute `--include-database-url`-Flag (die hängt den Parameter nicht an).
  - **`--max-connections` hochsetzen** (Scripts nutzen `5`): `pglite-socket` erlaubt standardmäßig nur eine gleichzeitige Verbindung; Prisma öffnet beim Schreiben regelmäßig mehrere, was sonst mit `P1017`/`P1001` fehlschlägt.
- **Kein `prisma migrate dev`:** PGlite unterstützt die Shadow-Database/Advisory-Lock-Mechanik des Migrate-Workflows nicht zuverlässig (reproduzierbar mit `P1017`). Stattdessen `prisma db push` für Schema-Sync — für die MVP-Phase mit noch instabilem Schema die pragmatischere Wahl. Sobald das Schema sich stabilisiert (vor dem ersten Produktiv-Release gegen echtes Postgres), sollte das auf versionierte Migrationen umgestellt werden (`prisma migrate dev` gegen eine echte Postgres-Instanz, nicht gegen PGlite).
- `scripts/seed.ts` — legt die Demo-Firma an (`DEMO_USER_EMAIL` aus `lib/config.ts`) mit Startkapital/-kredit (`lib/loan.ts`) und dem ersten Auftragspool (`lib/orders.ts`); idempotent (überspringt, wenn die Firma schon existiert).
- `lib/repository/company.ts` — Datenzugriffsschicht: `getDemoCompanyId` (Platzhalter für Phase-2-Session-Lookup), `loadCompanyState` (Company+Loan+aktueller Auftragspool, generiert den Pool einer Woche bei Bedarf lazy), `getLatestRoundSummary`, `closeRound` (wertet angenommene Aufträge über `resolveRound` aus `lib/round.ts` aus, würfelt ein Zufallsereignis, persistiert `Round`/`GameEvent` atomar in einer `$transaction`, aktualisiert `Company`/`Loan`, verfällt nicht angenommene Aufträge, erzeugt den Pool der nächsten Woche). Die UI zum Annehmen von Aufträgen fehlt noch (Phase 3) — `closeRound` wertet schon jetzt aus, was zufällig als `ACCEPTED` markiert ist.
- `app/page.tsx` + `components/dashboard/Dashboard.tsx` — die Seite ist jetzt ein statischer Rahmen mit einer `<Suspense>`-umschlossenen async Server-Komponente, die `loadCompanyState` aufruft. Das ist unter **Cache Components** (in Next 16 per Default aktiv, siehe `next.config.ts`) nötig: ungecachte, pro Request unterschiedliche Daten (hier: DB-Lesen) dürfen nicht direkt in der obersten Seitenkomponente gelesen werden, sonst schlägt die Instant-Navigation-Validierung fehl. Mit dem Suspense-Pattern rendert `next build` die Seite korrekt als Partial Prerender (statische Hülle + dynamisch gestreamter Dashboard-Teil) — bestätigt im Build-Output (`◐ (Partial Prerender)`).
- `tests/repository.test.ts` — Integrationstest gegen eine im Testprozess laufende PGlite-Instanz (`PGLiteSocketServer` auf einem Testport). Wichtig: `prisma db push` muss **asynchron** (`execFile`, nicht `execFileSync`) aus dem Testprozess heraus aufgerufen werden — ein synchroner Aufruf blockiert den Node-Event-Loop und damit auch den In-Prozess-Socket-Server, der die eingehende Verbindung bedienen müsste (reproduzierbar als `P1001`).

Offene Punkte aus Abschnitt 8 der Spec, die in Phase 0 entschieden wurden:
- **Zufallsereignis-Wahrscheinlichkeit:** `RANDOM_EVENT_PROBABILITY_PER_WEEK = 1/5` in `lib/config.ts` (≈ 1 Ereignis alle 5 Wochen, innerhalb des vorgeschlagenen 4–6-Wochen-Fensters).
- **Meilenstein-Zwischenziel:** pro-rata des 52-Wochen-Ziels (`TARGET_CUMULATIVE_PROFIT * weekDue / GAME_LENGTH_WEEKS`), via `lib/milestones.ts#nextMilestoneWeek`; in `components/dashboard/Dashboard.tsx` verwendet. `cumulativeProfit` wird in dieser Phase als `cash - STARTING_CASH` angenähert (korrekt, solange nur `closeRound` das Kapital verändert) — Phase 4/5 sollte das durch eine echte kumulierte Summe ersetzen, sobald Löhne/Miete dazukommen.

Noch offen (siehe Abschnitt 8): genaue Mengenrabatt-Formel fürs Lager → Phase 4.

## Phase 2 – Auth (Magic Link)

**Ziel:** Login via Auth.js + Resend, ein Spielstand pro Account.

1. `auth.ts` — Auth.js-Konfiguration mit Email-Provider (Resend), `@auth/prisma-adapter` gegen das bestehende `User`-Modell.
2. `app/api/auth/[...nextauth]/route.ts` — Auth.js-Route-Handler.
3. `app/login/page.tsx` — einfache Login-Seite (E-Mail-Eingabe, "Link senden").
4. `middleware.ts` — schützt `/` (Dashboard) und leitet nicht eingeloggte Nutzer auf `/login` um.
5. Bei erstem Login: Company inkl. Loan automatisch anlegen (Startkapital/-kredit aus `lib/config.ts`) — Logik dafür existiert bereits in `scripts/seed.ts`, in diese Phase als wiederverwendbare Funktion in `lib/repository/company.ts` extrahieren (z. B. `createCompanyForUser(userId)`).
6. `lib/repository/company.ts#getDemoCompanyId` ersetzen durch echten Session-Lookup (`auth()` → `company.findFirst({ where: { user: { id: session.user.id } } })`); `DEMO_USER_EMAIL` und das zugehörige Seed-Verhalten können danach entfernt werden.
7. Env-Vars dokumentieren: `AUTH_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`, `AUTH_RESEND_FROM`.

## Phase 3 – Interaktive Spielschleife

**Ziel:** Aus dem lesenden Dashboard wird die echte Spielschleife aus Abschnitt 3.1. Die Persistenz-Logik (`resolveRound`, `closeRound`, Pool-Generierung) steht bereits aus Phase 1 — diese Phase ist primär UI + die fehlende "Annehmen/Ablehnen"-Mutation.

1. `app/actions/orders.ts` — Server Actions `acceptOrder`/`rejectOrder` (setzen `Order.status`), prüfen Kapazität (Solo-Zeit bzw. Geselle-Faktor, `lib/capacity.ts` aus Phase 4) vor der Annahme; danach `updateTag`/`revalidatePath`, damit die Seite den neuen Stand sofort zeigt (siehe Cache-Components-Hinweis in Phase 1 — Server Actions laufen immer zur Request-Zeit, aber die gecachte Seite muss explizit invalidiert werden).
2. `app/actions/round.ts` — dünner Wrapper um das bestehende `closeRound` aus `lib/repository/company.ts`, der nach Abschluss `updateTag`/`revalidatePath` aufruft.
3. `components/dashboard/OrderPoolCard.tsx` — "Annehmen"-Button aktivieren, an `acceptOrder` binden, Kapazitätsanzeige ergänzen.
4. `components/dashboard/RoundCloseButton.tsx` — löst die `closeRound`-Action aus, zeigt Ladezustand über `useActionState`/`useTransition`.
5. `tests/repository.test.ts` um einen Accept-Flow erweitern (Order annehmen → `closeRound` → Bilanz enthält den Auftrag); Playwright-Smoke-Test für Klick → neue Bilanz sichtbar.

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
