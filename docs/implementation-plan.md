# Implementierungsplan – Business Simulator MVP

Dieser Plan setzt [`business-sim-game-design.md`](./business-sim-game-design.md) um. Er ist in Phasen gegliedert; jede Phase ist für sich abschließbar und testbar. Phase 0, 1 und 2 sind umgesetzt.

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

**Balancing-Auffälligkeit (für den ersten Playtest):** Startkapital 5.000 € liegt über der Stufe-2-Schwelle (3.000 €), die Stufe-„Geselle" ist damit ab Woche 1 freigeschaltet und das Dashboard zeigt „Stufe 2". Das folgt direkt aus den Platzhalterwerten in `lib/config.ts` (Spec 4.3) — entweder Schwelle anheben (z. B. 8.000 € / 15.000 €) oder die Freischaltung an das *Kapital nach Kredittilgung/Gewinn* koppeln. Entscheidung vor Phase 4.

## Phase 1 – Persistenz (DB-Anbindung, umgesetzt)

**Ziel:** Spielzustand wird aus der Datenbank gelesen/geschrieben statt aus Beispieldaten.

Umgesetzt:
- `lib/db.ts` — Prisma-Client-Singleton. **Keine** Driver-Adapter-Abhängigkeit: `provider = "postgresql"` im Schema reicht, weil PGlite lokal über einen echten Postgres-Wire-Protocol-Socket angesprochen wird (siehe unten) — das hält lokal und produktiv denselben Codepfad. Der Client wird lazy erzeugt (`getDb()`), damit allein das Importieren des Moduls (z. B. beim `next build`) nie `DATABASE_URL` braucht.
- **Lokale DB:** `@electric-sql/pglite` + `@electric-sql/pglite-socket` (offizielle Pakete, kein Community-Adapter nötig). Das `pglite-server`-CLI aus `pglite-socket` startet PGlite und exponiert es als Postgres-Server auf `127.0.0.1:5433`; `npm run dev` / `db:push` / `db:studio` wrappen den jeweiligen Befehl darüber (`package.json`). Zwei Stolpersteine, die beim Einrichten aufgetreten sind und die man beim Ändern dieser Scripts im Kopf behalten sollte:
  - **`?sslmode=disable` ist Pflicht** in der `DATABASE_URL` — `pglite-socket` unterstützt kein TLS; ohne den Parameter verhandelt Prismas Postgres-Connector eine SSL-Session, die nie beantwortet wird, und der Aufruf hängt. Die Scripts setzen `DATABASE_URL` deshalb selbst, nicht über die eingebaute `--include-database-url`-Flag (die hängt den Parameter nicht an).
  - **`--max-connections` hochsetzen** (Scripts nutzen `5`): `pglite-socket` erlaubt standardmäßig nur eine gleichzeitige Verbindung; Prisma öffnet beim Schreiben regelmäßig mehrere, was sonst mit `P1017`/`P1001` fehlschlägt.
- **Kein `prisma migrate dev`:** PGlite unterstützt die Shadow-Database/Advisory-Lock-Mechanik des Migrate-Workflows nicht zuverlässig (reproduzierbar mit `P1017`). Stattdessen `prisma db push` für Schema-Sync — für die MVP-Phase mit noch instabilem Schema die pragmatischere Wahl. Sobald das Schema sich stabilisiert (vor dem ersten Produktiv-Release gegen echtes Postgres), sollte das auf versionierte Migrationen umgestellt werden (`prisma migrate dev` gegen eine echte Postgres-Instanz, nicht gegen PGlite).
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
- **Kein Rate-Limit** für Link-Anforderungen (Auth.js bringt keins mit): Vor dem Produktiv-Start pro E-Mail/IP drosseln, sonst lässt sich das Resend-Kontingent (3.000/Monat) leerlaufen.
- **Veraltetes JWT bei gelöschtem User:** `ensureCompanyForUser` würde an der Fremdschlüssel-Constraint scheitern (500 statt Redirect). Relevant erst, wenn Accounts gelöscht werden können.
- **PGlite-Testgrenze:** Der PGlite-Socket-Server erholt sich nicht von echten DB-Fehlern (z. B. Unique-Verletzung) — die Rust-Engine paniciert danach. Tests dürfen solche Fehler daher nicht provozieren, sondern mocken (siehe Race-Test in `tests/repository.test.ts`).

## Phase 3 – Interaktive Spielschleife

**Ziel:** Aus dem lesenden Dashboard wird die echte Spielschleife aus Abschnitt 3.1. Die Persistenz-Logik (`resolveRound`, `closeRound`, Pool-Generierung) steht bereits aus Phase 1 — diese Phase ist primär UI + die fehlende "Annehmen/Ablehnen"-Mutation.

1. `app/actions/orders.ts` — Server Actions `acceptOrder`/`rejectOrder` (setzen `Order.status`), prüfen Kapazität (Solo-Zeit bzw. Geselle-Faktor, `lib/capacity.ts` aus Phase 4) vor der Annahme; danach `updateTag`/`revalidatePath`, damit die Seite den neuen Stand sofort zeigt (siehe Cache-Components-Hinweis in Phase 1 — Server Actions laufen immer zur Request-Zeit, aber die gecachte Seite muss explizit invalidiert werden).
2. `app/actions/round.ts` — dünner Wrapper um das bestehende `closeRound` aus `lib/repository/company.ts`, der nach Abschluss `updateTag`/`revalidatePath` aufruft.
3. `components/dashboard/OrderPoolCard.tsx` — "Annehmen"-Button aktivieren, an `acceptOrder` binden, Kapazitätsanzeige ergänzen.
4. `components/dashboard/RoundCloseButton.tsx` — löst die `closeRound`-Action aus, zeigt Ladezustand über `useActionState`/`useTransition`; Ergebnis als Wochenzusammenfassungs-Bottom-Sheet (siehe Mobile-first-Abschnitt). Der Button sitzt in der Daumenzone (fixiert über der Tab-Bar).
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

## Phase 6 – Deployment, Politur

1. Optional: Seed-Skript für Playtests (Firma mit ein paar vorgespielten Runden), falls manuelles Durchklicken zu lange dauert.
2. Vercel-Projekt anlegen, `DATABASE_URL` (Vercel Postgres oder Supabase Free Tier), `RESEND_API_KEY`, `AUTH_SECRET` als Env-Vars setzen.
3. `README.md` um Setup-/Deploy-Schritte ergänzen (lokal: PGlite, produktiv: Postgres).
4. Playtesting-Runde gegen die Balancing-Werte aus `lib/config.ts`, danach gezielt anpassen (keine Logik-Änderungen nötig, nur Konstanten).
5. Accessibility-/Responsive-Check des Dashboards (Mobilansicht).

## Nicht in diesem MVP-Plan (siehe Spec Abschnitt 4.2 / 3.3 / 3.4)

Firmenübernahme, Stufen 4–6 (LKW, Standortmanager, Flotte), weitere Branchen, Mehrfach-Szenarien, Multiplayer/Leaderboards, mehrere Spielstände pro Account. Diese bleiben Backlog-Punkte für ein Folgeprojekt, sobald das MVP spielbar und ausbalanciert ist.
