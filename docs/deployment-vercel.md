# Deployment auf Vercel

Diese Anleitung bringt den aktuellen interaktiven Stand (Login per Magic Link, Aufträge annehmen, Wochen abschließen) auf Vercel. Der Code ist dafür vorbereitet; es fehlen nur Konten und Konfiguration, die nur du anlegen kannst.

**Was du brauchst:** ein Vercel-Konto (Hobby reicht), das GitHub-Repo, eine Postgres-Datenbank und einen Resend-Account mit eigener, verifizierter Absender-Domain.

## Wie es zusammenspielt

| Baustein | Lokal | Vercel |
|---|---|---|
| Datenbank | PGlite (`npm run dev`) | Managed Postgres (Neon oder Supabase) |
| Schema | `npm run db:migrate` (versionierte Migrationen) | `prisma migrate deploy` im Production-Build (`scripts/vercel-build.mjs`) |
| Login-Mail | Link in der Dev-Server-Konsole | Resend |
| Rate-Limit | DB-Tabelle `RateLimitBucket` | dieselbe Tabelle (instanzübergreifend) |

Lokal und in Tests laufen dieselben SQL-Migrationen wie in Production, Schema-Abweichungen fallen also früh auf.

## 1. Datenbank anlegen

**Option A – Neon über den Vercel Marketplace (empfohlen):** Im Vercel-Projekt *Storage → Create → Neon (Postgres)*. Die Integration setzt die Variablen automatisch, üblicherweise `DATABASE_URL` (gepoolt) und `DATABASE_URL_UNPOOLED` (direkt). Prüfe die Namen im Dashboard. Das Build-Skript nutzt `DATABASE_URL_UNPOOLED` für Migrationen von selbst.

**Option B – Supabase:** Projekt anlegen, dann
- `DATABASE_URL` = *Transaction Pooler*-URL (Port 6543) plus `?pgbouncer=true&sslmode=require`,
- `MIGRATE_DATABASE_URL` = *Direct connection* (Port 5432).

Region: Wähle die Funktionsregion des Vercel-Projekts (*Settings → Functions*) nah an der Datenbank, sonst wird jede Aktion spürbar langsamer.

## 2. Resend einrichten

1. Account anlegen, unter *Domains* eine eigene Domain hinzufügen und die DNS-Einträge setzen, bis sie „Verified" ist.
2. API-Key erzeugen (*Sending access* genügt).
3. Absender festlegen, z. B. `Business Simulator <login@deine-domain.de>`.

Ohne verifizierte Domain liefert Resend nur an die eigene Account-Adresse (`onboarding@resend.dev`). Das reicht für einen ersten Test, nicht für Mitspieler.

## 3. Vercel-Projekt anlegen

*Add New → Project* → das GitHub-Repo importieren. Framework „Next.js" wird erkannt, Node 22 kommt aus `package.json`. Der Build läuft automatisch über das Skript `vercel-build` (Vercel bevorzugt es vor `build`); Build Command/Output nicht überschreiben.

## 4. Umgebungsvariablen

Unter *Settings → Environment Variables*:

| Variable | Scope | Pflicht | Hinweis |
|---|---|---|---|
| `AUTH_SECRET` | Production, Preview | ja | `openssl rand -base64 32`. Ändern meldet alle Spieler ab. |
| `DATABASE_URL` | Production, Preview | ja | Gepoolte URL (siehe oben). Preview braucht eine **eigene** Datenbank. |
| `MIGRATE_DATABASE_URL` | Production | nur Supabase | Direkte Verbindung für Migrationen. |
| `RESEND_API_KEY` | Production, Preview | ja | Ohne Key schlägt der Login-Versand in Production fehl. |
| `AUTH_EMAIL_FROM` | Production, Preview | ja | Absender auf verifizierter Domain. |

`AUTH_URL` und `AUTH_TRUST_HOST` sind auf Vercel **nicht** nötig (der Host wird automatisch vertraut; Links entstehen aus der aufgerufenen URL). Bei anderem Hosting `AUTH_TRUST_HOST=true` setzen.

## 5. Deployen

Push auf den Production-Branch (bzw. *Deploy* im Dashboard). Der Build wendet zuerst ausstehende Migrationen an (nur `VERCEL_ENV=production`) und baut dann die App. Schlägt die Migration fehl, bricht der Build ab, ein halb migrierter Stand geht nicht live.

> **Achtung, Wirtschaftsmodell v2:** Die Migration `economy_v2` löscht bestehende Spielstände (`DELETE FROM "Company"`), weil sich das Modell grundlegend geändert hat (Stunden statt Auftragszahl, keine Stufen/Meilensteine). Benutzerkonten bleiben bestehen; beim nächsten Besuch startet jeder mit einer frischen Firma. Auf einer frisch angelegten Datenbank hat das keine Folgen.

**Preview-Deployments** migrieren absichtlich nicht, damit ein Branch nie die Produktionsdatenbank anfasst. Für Previews: eigene Datenbank (bei Neon z. B. ein Branch) in den Preview-Variablen eintragen und einmal manuell migrieren:

```bash
DATABASE_URL="<preview-db-url>" npm run db:deploy
```

## 6. Prüfen

1. `https://<deine-domain>/api/health` muss `200` mit `"ok": true` liefern. Bei `503` zeigt `checks`, was fehlt (`databaseUrl`, `authSecret`, `emailProvider`, `database`). Es werden nie Werte ausgegeben.
2. Auf dem Handy `/login` öffnen, E-Mail eingeben, Link aus der Mail öffnen.
3. Aufträge annehmen, im Tab „Betrieb“ eine Investition prüfen, Woche abschließen, Zusammenfassung ansehen.
4. Kontrolle des Limits: Vierter Link für dieselbe Adresse innerhalb von 15 Minuten muss „Zu viele Anfragen" zeigen.

## Schema ändern

`prisma migrate dev` braucht eine Shadow-Datenbank, die PGlite nicht bietet. Stattdessen:

```bash
# 1. prisma/schema.prisma ändern
npm run db:migration -- kurzer_name   # erzeugt prisma/migrations/<zeit>_kurzer_name/migration.sql
# 2. SQL prüfen, committen, pushen -> der nächste Production-Build migriert
```

Das Skript wendet die vorhandenen Migrationen auf eine frische In-Memory-DB an und schreibt nur die Differenz. „Keine Schema-Änderungen" heißt, dass Migrationen und Schema übereinstimmen. Migrationen nie nachträglich ändern, sondern neue anlegen. Destruktive Änderungen (Spalten löschen, Typen ändern) vorher gegen eine Datenbankkopie testen.

## Fehlersuche

| Symptom | Ursache |
|---|---|
| Login zeigt „Der Login-Link konnte nicht gesendet werden" | `RESEND_API_KEY` fehlt/falsch oder Domain nicht verifiziert. Vercel-Logs zeigen `[auth][error]` mit der Resend-Antwort. |
| `MissingSecret` in den Logs | `AUTH_SECRET` fehlt in diesem Scope (Production/Preview). |
| `/api/health` → `database: false` | `DATABASE_URL` falsch, `sslmode=require` fehlt, oder Pooler ohne `?pgbouncer=true`. |
| Build bricht bei „Applying database migrations" ab | Migrations-URL nicht erreichbar oder gepoolt. `MIGRATE_DATABASE_URL` auf die direkte URL setzen. |
| Link aus Mail führt auf eine Preview-URL | Magic Links nutzen den Host der Anfrage. Login immer auf der Ziel-Domain starten. |
| Spiel „hängt" nach Doppeltipp | Kein Fehler: Wochenabschluss ist gegen Doppelausführung gesichert, die Ansicht aktualisiert sich. |

## Bekannte Grenzen dieses Stands

- Das Balancing ist per Simulation kalibriert (`docs/game-economy-design.md`), aber noch nicht mit echten Spielern getestet. Alle Zahlen stehen in `lib/config.ts`.
- Es gibt noch kein Monitoring/Alerting. `/api/health` ist als Ziel für einen Uptime-Check gedacht.
- Rate-Limit pro E-Mail (3/15 min) und IP (10/h) steht in `lib/config.ts`.
