# Implementierungsplan – Business Simulator MVP (Handwerksspiel, abgelöst)

> **Historisch.** Das Handwerksspiel wurde im Oktober 2026 durch Boardroom ersetzt. Aktueller Plan und Stand: [`boardroom-konzept.md`](./boardroom-konzept.md). Die technischen Erkenntnisse unten (PGlite, Migrationen ohne Shadow-DB, Cache Components) gelten weiter.

Dieser Plan setzt [`business-sim-game-design.md`](./business-sim-game-design.md) um. Er ist in Phasen gegliedert; jede Phase ist für sich abschließbar und testbar. Phase 0–3 sind umgesetzt, der Stand ist für Vercel vorbereitet ([`deployment-vercel.md`](./deployment-vercel.md)).

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
- **Meilenstein-Zwischenziel:** pro-rata des 52-Wochen-Ziels (`TARGET_CUMULATIVE_PROFIT * weekDue / GAME_LENGTH_WEEKS`), siehe `components/dashboard/Dashboard.tsx`. Muss in Phase 5 in die serverseitige Meilenstein-Erzeugung übernommen werden.

Noch offen (siehe Abschnitt 8): genaue Mengenrabatt-Formel fürs Lager → Phase 4.

**Entschieden (Phase 3):** Das Spiel startet immer auf Stufe 1. Die Schwellen wurden dafür auf 8.000 € / 15.000 € angehoben und freigeschaltete Stufen bleiben erhalten (siehe Phase 3).

## Phase 1 – Persistenz (DB-Anbindung, umgesetzt)

**Ziel:** Spielzustand wird aus der Datenbank gelesen/geschrieben statt aus Beispieldaten.

Umgesetzt:
- `lib/db.ts` — Prisma-Client-Singleton. **Keine** Driver-Adapter-Abhängigkeit: `provider = "postgresql"` im Schema reicht, weil PGlite lokal über einen echten Postgres-Wire-Protocol-Socket angesprochen wird (siehe unten) — das hält lokal und produktiv denselben Codepfad. Der Client wird lazy erzeugt (`getDb()`), damit allein das Importieren des Moduls (z. B. beim `next build`) nie `DATABASE_URL` braucht.
- **Lokale DB:** `@electric-sql/pglite` + `@electric-sql/pglite-socket` (offizielle Pakete, kein Community-Adapter nötig). Das `pglite-server`-CLI aus `pglite-socket` startet PGlite und exponiert es als Postgres-Server auf `127.0.0.1:5433`; `npm run dev` / `db:migrate` / `db:studio` wrappen den jeweiligen Befehl darüber (`package.json`). Zwei Stolpersteine, die beim Einrichten aufgetreten sind und die man beim Ändern dieser Scripts im Kopf behalten sollte:
  - **`?sslmode=disable` ist Pflicht** in der `DATABASE_URL` — `pglite-socket` unterstützt kein TLS; ohne den Parameter verhandelt Prismas Postgres-Connector eine SSL-Session, die nie beantwortet wird, und der Aufruf hängt. Die Scripts setzen `DATABASE_URL` deshalb selbst, nicht über die eingebaute `--include-database-url`-Flag (die hängt den Parameter nicht an).
  - **`--max-connections` hochsetzen** (Scripts nutzen `5`): `pglite-socket` erlaubt standardmäßig nur eine gleichzeitige Verbindung; Prisma öffnet beim Schreiben regelmäßig mehrere, was sonst mit `P1017`/`P1001` fehlschlägt.
- **Kein `prisma migrate dev`:** PGlite stellt die Shadow-Database nicht zuverlässig bereit (reproduzierbar mit `P1017`). Phase 1 nutzte deshalb vorübergehend `prisma db push`. **Seit Phase 3 gilt ein einheitlicher Weg:** versionierte Migrationen in `prisma/migrations/`, angewendet mit `prisma migrate deploy` (das funktioniert auch gegen PGlite) — lokal (`npm run db:migrate`), in den Tests (`tests/helpers/test-db.ts`) und auf Vercel. Neue Migrationen erzeugt `npm run db:migration -- name` (`scripts/create-migration.mjs`: frische In-Memory-PGlite, vorhandene Migrationen anwenden, Differenz zum Schema schreiben).
- Das ursprüngliche Seed-Skript wurde in Phase 2 durch `ensureCompanyForUser` (Firma beim ersten Login) ersetzt.
- `lib/repository/company.ts` — Datenzugriffsschicht: `loadCompanyState` (Company+Loan+aktueller Auftragspool, generiert den Pool einer Woche bei Bedarf lazy), `getLatestRoundSummary`, `closeRound` (wertet angenommene Aufträge über `resolveRound` aus `lib/round.ts` aus, würfelt ein Zufallsereignis, persistiert `Round`/`GameEvent` atomar in einer `$transaction`, aktualisiert `Company`/`Loan`, verfällt nicht angenommene Aufträge, erzeugt den Pool der nächsten Woche). Die UI zum Annehmen von Aufträgen fehlt noch (Phase 3) — `closeRound` wertet schon jetzt aus, was zufällig als `ACCEPTED` markiert ist.
- `app/page.tsx` + `components/dashboard/Dashboard.tsx` — die Seite ist jetzt ein statischer Rahmen mit einer `<Suspense>`-umschlossenen async Server-Komponente, die `loadCompanyState` aufruft. Das ist unter **Cache Components** (in Next 16 per Default aktiv, siehe `next.config.ts`) nötig: ungecachte, pro Request unterschiedliche Daten (hier: DB-Lesen) dürfen nicht direkt in der obersten Seitenkomponente gelesen werden, sonst schlägt die Instant-Navigation-Validierung fehl. Mit dem Suspense-Pattern rendert `next build` die Seite korrekt als Partial Prerender (statische Hülle + dynamisch gestreamter Dashboard-Teil) — bestätigt im Build-Output (`◐ (Partial Prerender)`).
- `tests/repository.test.ts` — Integrationstest gegen eine im Testprozess laufende PGlite-Instanz (`PGLiteSocketServer` auf einem Testport). Wichtig: `prisma db push` muss **asynchron** (`execFile`, nicht `execFileSync`) aus dem Testprozess heraus aufgerufen werden — ein synchroner Aufruf blockiert den Node-Event-Loop und damit auch den In-Prozess-Socket-Server, der die eingehende Verbindung bedienen müsste (reproduzierbar als `P1001`).

Offene Punkte aus Abschnitt 8 der Spec, die in Phase 0 entschieden wurden:
- **Zufallsereignis-Wahrscheinlichkeit:** `RANDOM_EVENT_PROBABILITY_PER_WEEK = 1/5` in `lib/config.ts` (≈ 1 Ereignis alle 5 Wochen, innerhalb des vorgeschlagenen 4–6-Wochen-Fensters).
- **Meilenstein-Zwischenziel:** pro-rata des 52-Wochen-Ziels (`TARGET_CUMULATIVE_PROFIT * weekDue / GAME_LENGTH_WEEKS`), via `lib/milestones.ts#nextMilestoneWeek`; in `components/dashboard/Dashboard.tsx` verwendet. `cumulativeProfit` wird in dieser Phase als `cash - STARTING_CASH` angenähert (korrekt, solange nur `closeRound` das Kapital verändert) — Phase 4/5 sollte das durch eine echte kumulierte Summe ersetzen, sobald Löhne/Miete dazukommen.

Noch offen (siehe Abschnitt 8): genaue Mengenrabatt-Formel fürs Lager → Phase 4.

## Mobile-first Informationsarchitektur (Leitlinie für alle Phasen)

Das Spiel wird primär auf dem Handy gespielt; Desktop ist nur die breitere Variante derselben einspaltigen Ansicht. Referenz sind Screenshots einer vergleichbaren Business-Sim-App. Daraus abgeleitete Regeln:

- **Eine Spalte, Karten, Daumenzone:** Inhalt in `max-w-lg`-Spalte (ab `lg` `max-w-3xl`), Hauptnavigation als **Bottom-Tab-Bar** (`components/nav/BottomNav.tsx`, `env(safe-area-inset-*)`-aware), Aktionen als volle Breite mit mindestens 44 px Höhe, Eingaben mit ≥ 16 px Schrift (kein iOS-Zoom).
- **Kopf jeder Seite:** Titel + Untertitel links, Status-Chip rechts (z. B. „Woche 6/52"), siehe `PageHeader`/`Chip`.
- **Dienste statt Menüs:** Weitere Funktionen werden als eigene Tab-/Unterseiten pro „Dienst" (Bank, Personalvermittlung, Händler …) mit Listen aus Karten ergänzt, nicht als Dropdowns.
- **Sperren sichtbar machen:** Noch nicht freigeschaltete Dienste erscheinen ausgegraut mit Schloss und Freischalt-Bedingung (Stufe/Kapital) — passt zum Designprinzip „Komplexität wächst mit der Firma" (Spec 3.2).
- **Rundenabschluss als Bottom-Sheet („Tägliche Zusammenfassung" → bei uns „Wochenzusammenfassung"):** Kopf mit Woche + Ereignis-Chip, Kartenblock Einnahmen/Ausgaben, hervorgehobene **Nettogewinn**-Zeile (grün/rot getönt), darunter **Cashflow** (Startkapital → Bargeldänderung → Endbetrag) und eine **Warnungen**-Karte mit Schweregrad-Badges (rot = kritisch, orange = Hinweis). Primärer Button „Fortfahren" fixiert am unteren Rand. Umsetzung in Phase 3 auf Basis von `WeeklyBalanceCard`/`RoundSummary`.
- **Konsequenzen als Dialog:** Warnungen des „Vermieters" in den Screenshots entsprechen bei uns der Bank/Insolvenz-Warnung (negatives Kapital, verpasster Meilenstein) — als Modal beim Wochenwechsel, Phase 5.

Was in den Screenshots vorkommt, aber **nicht** im MVP-Scope der Spec liegt (Backlog, nicht planen): Städte/mehrere Betriebe, Marketingagentur, Steuerbüro/Regierung/Gesetze, Finanzmanager/Aktien, Fahrzeughandel, Luxus-Shop, In-App-Käufe/Werbung.

Heutige Tabs: **Übersicht**, **Bank**, **Konto**. Geplante Erweiterung: **Aufträge** (falls die Übersicht zu lang wird), **Betrieb** (Personal Phase 4, Lager Phase 4), jeweils als zusätzlicher Tab, sobald die Seite Inhalt hat — keine leeren Platzhalter-Tabs.

## Phase 2 – Auth (Magic Link, umgesetzt)

**Ziel:** Login via Auth.js + Resend, ein Spielstand pro Account, mobile-first App-Shell.

Umgesetzt:
- `auth.ts` — Auth.js v5 (`next-auth@beta`), Prisma-Adapter, **JWT-Sessions** (deshalb nur `User` + `VerificationToken` im Schema, keine Session-/Account-Tabellen). Konfiguration ist *lazy* (Funktionsform), damit weder Import noch `next build` `DATABASE_URL` brauchen. Versand über die Resend-HTTP-API (`fetch`, kein SDK). **Dev-Fallback:** ohne `RESEND_API_KEY` wird der Link in die Server-Konsole geschrieben; in Production ohne Key schlägt der Versand mit klarer Fehlermeldung fehl.
- `proxy.ts` (Next 16: Nachfolger von `middleware.ts`) — nur optimistischer Redirect auf `/login`, wenn kein Session-Cookie existiert. **Die eigentliche Prüfung** liegt in `lib/session.ts` (`requireUser`/`requireCompanyId`, Data Access Layer) und wird von jeder geschützten Seite/Action aufgerufen. Wegen Cache Components lesen diese Funktionen das Cookie und müssen daher hinter `<Suspense>` laufen — alle Seiten folgen dem Muster „statische Hülle + Suspense-Inhalt".
- Firma entsteht beim ersten Besuch: `ensureCompanyForUser` (`lib/repository/company.ts`) — idempotent, race-sicher über die Unique-Constraint auf `userId`. Demo-User, `DEMO_USER_EMAIL`, `getDemoCompanyId` und das Seed-Skript sind entfernt.
- Seiten: `/login` (Formular mit `useActionState`, Fehlerbanner), `/login/check-email`, `/` (Übersicht), `/bank` (Kreditdetails: Restschuld, Tilgungsfortschritt, Rate/Tilgung/Zinsen der Woche), `/konto` (E-Mail, Abmelden).
- Server Action `requestMagicLink` nutzt `signIn(..., { redirect: false })` und leitet selbst auf `/login/check-email` weiter (sonst bleibt die Zwischen-URL `/api/auth/verify-request` in der Adresszeile).
- Env-Vars: `AUTH_SECRET` (Pflicht), `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `DATABASE_URL` — dokumentiert in `.env.example`.
- Manuell per Playwright (iPhone-13-Viewport) verifiziert: unauth → Redirect auf `/login`; Link anfordern → Check-Email; Link öffnen → Dashboard; Link-Wiederverwendung → `?error=Verification`; Abmelden → alle geschützten Seiten leiten wieder um.

Bekannte Einschränkungen / Folgearbeit:
- ~~Kein Rate-Limit für Link-Anforderungen~~ — in Phase 3 umgesetzt (siehe dort).
- **Veraltetes JWT bei gelöschtem User:** `ensureCompanyForUser` würde an der Fremdschlüssel-Constraint scheitern (500 statt Redirect). Relevant erst, wenn Accounts gelöscht werden können.
- **PGlite-Testgrenze:** Der PGlite-Socket-Server erholt sich nicht von echten DB-Fehlern (z. B. Unique-Verletzung) — die Rust-Engine paniciert danach. Tests dürfen solche Fehler daher nicht provozieren, sondern mocken (siehe Race-Test in `tests/repository.test.ts`).

## Phase 3 – Interaktive Spielschleife (umgesetzt)

**Ziel:** Aus dem lesenden Dashboard wird die echte Spielschleife aus Abschnitt 3.1.

Die in dieser Phase zuerst umgesetzten Regeln (2 Aufträge pro Woche, Stufen nach Kapital, Sieg/Niederlage nach 52 Wochen) waren im Playtest **zu einfach** und sind durch das Wirtschaftsmodell v2 (Phase 4) ersetzt worden. Erhalten geblieben sind:
- **Fristen mit Übertrag:** Ein Auftrag aus Woche *w* mit Frist *d* ist in den Wochen *w … w+d−1* annehmbar (`lib/orders.ts#isOrderOpen`), danach wird er `EXPIRED`. Angenommene Aufträge werden beim Wochenabschluss ausgezahlt und `COMPLETED` (nie doppelt bezahlt). Annehmen, Ablehnen (endgültig) und Zurückziehen sind bis zum Wochenabschluss möglich.
- **Spielende:** nur noch Insolvenz; danach sind alle Aktionen gesperrt (`GAME_OVER`), die Ergebnis-Karte bietet „Neues Spiel starten“ (`restartGame` löscht das Spiel per Cascade). Zurücksetzen geht auch jederzeit im Tab „Konto“.
- **Kredit-Endstand:** `calculateWeeklyLoanCharge` zahlt in der letzten Rate den Rest vollständig (Gleitkomma-Drift, getestet).

Technik:
- `lib/repository/company.ts`: `acceptOrder`/`rejectOrder`/`withdrawOrder`/`closeRound(companyId, expectedWeek)`. Jede Mutation läuft in einer Transaktion mit `SELECT … FOR UPDATE` auf der Firma. `expectedWeek` macht den Wochenabschluss idempotent: ein Doppeltipp oder ein veralteter Tab bekommt `STALE_WEEK`, statt eine Woche zu überspringen. Regelverletzungen sind `GameActionError`s mit deutscher Meldung.
- `app/(app)/actions.ts`: Server Actions lesen die Session erneut (`requireCompanyId`), leiten die Firma daraus ab (der Client sendet nur Auftrags-IDs) und rufen `revalidatePath("/", "layout")` auf, damit die Seite sich in derselben Roundtrip aktualisiert.
- UI (mobil): `OrderCard` (Gewinn zuerst, Frist-Badge, Ablehnen/Annehmen, „Kapazität voll“), `WeekPlanCard` (Auslastungsbalken, geplante Aufträge, erwartetes Ergebnis nach Kreditrate), `RoundCloseBar` (sticky über der Tab-Bar), `WeekSummarySheet` (natives `<dialog>` als Bottom-Sheet: Bilanz, Kapitalverlauf, Warnungen, Spielende-Hinweis), `GameResultCard`.
- Tests: Repository-Integrationstests (Kapazität, Fremd-Aufträge, Fristen, Doppelabschluss, Stufe, Insolvenz, Sieg/Niederlage, Neustart) gegen PGlite mit den echten Migrationen; reine Logik in `tests/outcome.test.ts`.

Sicherheit/Betrieb in dieser Phase:
- **Login-Rate-Limit** (`lib/rate-limit.ts`): DB-basierter Fixed-Window-Zähler (ein atomarer Upsert, damit es über serverlose Instanzen hinweg exakt zählt): 3 Links pro E-Mail/15 min, 10 pro IP/h (`lib/config.ts`). Der Auth.js-Endpunkt hat bewusst **keinen POST** mehr (`app/api/auth/[...nextauth]/route.ts` exportiert nur `GET`), sonst ließe sich das Limit über `/api/auth/signin/resend` umgehen.
- `/api/health` (Deployment-Check), `scripts/vercel-build.mjs` (Migrationen nur in Production), `lib/mail.ts` (Resend-Versand, getestet inkl. Fehlerfällen). Details: `docs/deployment-vercel.md`.

## Phase 4 – Wirtschaftsmodell v2 (umgesetzt)

**Ziel:** Aus dem „Gewinnziel in 52 Wochen“ wird ein offenes Spiel: Aufträge tragen den Betrieb, der Gewinn wird in Wachstum investiert (Personal, Werkzeug, Fahrzeuge, Werkstatt). Vollständige Herleitung, Zahlen und Simulationsergebnisse: [`docs/game-economy-design.md`](./game-economy-design.md).

- `lib/economy.ts` (rein): Stunden-Kapazität je Person, Fixkosten, Saison, Marktsegmente und Angebote, Wochenereignisse, `resolveWeek`/`previewWeek`, Firmenwert.
- `lib/investments.ts` (rein): Regeln für Einstellen, Fahrzeug, Werkzeug, Werkstatt, Entlassen.
- `lib/simulation.ts`, `scripts/simulate-economy.ts`, `tests/economy-balance.test.ts`: Skript-Spieler mit festen Strategien kalibrieren und bewachen die Balance.
- Datenmodell (Migration `economy_v2`, **setzt bestehende Spielstände zurück**): `Company.weekNumber/reputation/toolLevel/workshopLevel/vehicles`, `Employee {hiredWeek, endsWeek}`, `Order {tier, laborHours}`, `LedgerEntry` für Investitionen, `GameEvent` einmalig je Woche. `Milestone`, Stufen und `FAILED`/`WON` entfallen.
- Repository: `invest`, `fireEmployee`; `closeRound` mit Wochenbilanz inkl. Investitionen. Angebote und Wochenereignis entstehen beim Wochenstart (unter Firmen-Lock, deterministisch aus Firma+Woche gesät).
- UI: Tab **Betrieb** (Fixkosten/Break-even, Team mit Kündigen, Investitionskarten mit zweistufiger Bestätigung), Übersicht mit Stunden-Auslastung, €/Std.-Marge, gesperrten Aufträgen, Wochenereignis-Banner, neuem Wochenblatt (Gewinn, Arbeit, Kapital inkl. Investitionen); Bank mit Dispo.
- Lokal: `connection_limit=3` in der Dev-`DATABASE_URL`, weil der PGlite-Socket nur 5 Verbindungen zulässt.

## Phase 5 – Ausbau der Wirtschaft (offen)

Reihenfolge nach Nutzen für das Spielgefühl (Details in `docs/game-economy-design.md`, Abschnitt Roadmap):

1. **Zweiter Standort** mit Betriebsleiter, eigenem Markt und Verwaltungslast.
2. Lager, Zahlungsziele/Forderungen, Marketing.
3. Steuern/Jahresabschluss, Erfolge, weitere Kredite, Fahrzeugtypen.

## Phase 6 – Betrieb und Politur

1. **Vercel-Deployment:** Code ist vorbereitet, es fehlt die Einrichtung durch den Projekteigentümer (Datenbank, Resend-Domain, Env-Variablen): siehe `docs/deployment-vercel.md`.
2. Playtesting-Runde gegen die Balancing-Werte (siehe Phase 3, „Bewusst offen“); danach gezielt anpassen.
3. Optional: Seed-/Debug-Hilfen für Playtests (z. B. Spielstand vorspulen).
4. Monitoring: Uptime-Check auf `/api/health`, Fehlerberichte (z. B. Vercel-Logs/Sentry).
5. Accessibility-Durchgang (Fokus-Reihenfolge im Sheet, Kontraste im Dark Mode, Screenreader-Labels der Buttons).

## Nicht in diesem MVP-Plan (siehe Spec Abschnitt 4.2 / 3.3 / 3.4)

Firmenübernahme, Stufen 4–6 (LKW, Standortmanager, Flotte), weitere Branchen, Mehrfach-Szenarien, Multiplayer/Leaderboards, mehrere Spielstände pro Account. Diese bleiben Backlog-Punkte für ein Folgeprojekt, sobald das MVP spielbar und ausbalanciert ist.
