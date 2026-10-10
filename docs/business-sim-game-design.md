# Business Simulator – Konzept & MVP-Spec

**Status:** genehmigt, bereit für Implementierungsplanung
**Datum:** 2026-10-10
**Arbeitstitel Repo:** `biz-sim` (frei umbenennbar)

## 1. Zusammenfassung

Rundenbasiertes Browser-Strategiespiel: Spieler gründen mit wenig Eigenkapital + Bankkredit eine Handwerksfirma und müssen innerhalb eines festen Zeitfensters finanzielle Ziele erreichen (Kredit tilgen, Mindestgewinn), während operative Komplexität (Personal, Lagerhaltung, später Logistik/Flotte) mit dem Firmenwachstum freigeschaltet wird. Ziel: vereinfachtes, aber strategisch lehrreiches Spielerlebnis – kein Vollzeit-Tycoon-Grind, aber auch kein triviales Klick-Spiel.

Dieses Dokument ist die Grundlage für die Implementierungsplanung (nächster Schritt: `writing-plans`-Skill). Es deckt das **volle Konzept** ab und grenzt explizit den **MVP-Scope** ab.

## 2. Zielgruppe & Zweck

Einzelspieler-Lernspiel für jemanden, der simplifiziert nachvollziehen will, wie unternehmerische Entscheidungen (Kapazität, Kapitalbindung, Kreditdruck, Risikopuffer) zusammenwirken. Kein Multiplayer, kein Leaderboard im MVP.

## 3. Volles Spielkonzept

### 3.1 Spielschleife (Grundprinzip für alle Stufen)

Eine Runde = **1 Woche**. Pro Runde:

1. **Auftrags-Pool anzeigen**: 3–6 verfügbare Aufträge mit Umfang, Material-Bedarf, Frist, Bezahlung.
2. **Aufträge auswählen**: Spieler nimmt Aufträge an, die seine aktuelle Kapazität (Solo-Zeit, Mitarbeiter-Kapazität, Lagerbestand) zulässt. Nicht angenommene Aufträge verfallen nach Ablauf der Frist.
3. **Operative Entscheidungen**: Material bestellen (ad hoc oder aus Lager entnehmen), Preise/Angebote anpassen, Personal einstellen/entlassen, Lager mieten/kündigen (ab Stufe 3).
4. **Runde abschließen**: Server berechnet Einnahmen, Ausgaben (Material, Löhne, Miete, Kreditrate), würfelt ggf. ein Zufallsereignis, erzeugt eine Wochenbilanz.
5. **Meilenstein-Check** (alle n Runden, siehe 4.3): Ziel erreicht → Fortschritt / neue Freischaltung. Ziel verpasst → Warnung, bei wiederholtem Verfehlen → Insolvenz (Game Over).

### 3.2 Progressions-Leiter (volle Vision, Stufen 1–6)

| Stufe | Freischaltung (Startwert, anpassbar) | Neue Mechanik |
|---|---|---|
| 1 | Start | Solo-Handwerker, Material ad hoc pro Auftrag, keine Lagerung |
| 2 | verfügbares Kapital ≥ 3.000 € | + Geselle einstellen: mehr Kapazität, feste Lohnkosten, Produktivitätsfaktor |
| 3 | verfügbares Kapital ≥ 8.000 € | + Lager mieten/kaufen: Material auf Vorrat, Mengenrabatte, Kapitalbindung, Lagerkosten |
| 4 | *(nach MVP)* | + eigener LKW + Fahrer: eigene Logistik statt teurer Fremdlieferung, Kapazitätsgrenze pro LKW |
| 5 | *(nach MVP)* | + Standortmanager: Delegation, zweiter Standort |
| 6 | *(nach MVP)* | + Flotte/mehrere Standorte, granulare Personalführung (Zufriedenheit, Fluktuation, Schulung) |

**Wichtiges Designprinzip:** operative Komplexität korreliert mit Firmengröße/Kapital – der Spieler lernt neue Systeme genau dann, wenn sie relevant werden, statt am Anfang überfordert zu sein.

### 3.3 Zweiter Einstiegsweg: Firmenübernahme (nach MVP)

Statt Neugründung: Spieler kauft eine generierte Bestandsfirma (vorhandener Umsatz, Personal, Ausstattung, ggf. Altschulden). Benötigt zusätzlich:
- Firmen-Generator (plausible Startzustände mit Bewertung)
- Bankangebots-System: mehrere Finanzierungsangebote (Zins, Tilgungsplan, Eigenkapitalanteil) zur Auswahl
- Kaufpreis-/Konditionen-Verhandlung (vereinfacht, kein freies Haggling nötig)

Nutzt dieselbe Firmen-Engine wie die Neugründung – nur anderer Startzustand. Kein Teil des MVP.

### 3.4 Weitere Ausbaustufen (Backlog, nicht MVP)

- Mehrere vordefinierte Szenarien/Levels statt einem festen Ziel (z.B. "Überlebe 6 Monate" / "Werde Marktführer") – Ausbau aus dem MVP-Szenario-Modell heraus.
- Weitere Branchen als eigene Mechanik-Module (z.B. SaaS-Startup: Server/Entwickler/Features; Einzelhandel: Inventar/Filialen).
- Account-übergreifende Spielstände, mehrere parallele Spielstände pro Account.
- Zufallsereignis-Katalog erweitern.

## 4. MVP-Scope (das, was zuerst gebaut wird)

Das MVP muss beweisen: **Die Kernschleife (Runde → Entscheidung → Ergebnis → Zieldruck) ist spielbar, verständlich und macht strategisch Sinn.**

### 4.1 Enthalten

- Nur **Neugründung** (keine Firmenübernahme)
- Nur Branche **Handwerk**, nur **Stufen 1–3** (Solo → Geselle → Lager)
- **Login via Magic Link** (Auth.js + Resend Free Tier), ein Spielstand pro Account, kein Passwort
- **Ein festes Szenario**: Startkapital + Kredit, 12-Monats-Zielfenster (52 Runden), periodische Meilenstein-Checks
- **Auftrags-Pool-Mechanik** wie in 3.1 beschrieben
- **Einfache Zufallsereignisse**: 1–2 Typen (Materialpreis-Spitze, Mitarbeiter krank)
- **UI**: Dashboard-Look (Cards, Icons, Fortschrittsbalken) im Stil von `jos-assistant` (Next.js + Tailwind), kein Pixel-Art/Vollgrafik

### 4.2 Explizit NICHT enthalten

- Firmenübernahme-Pfad
- Stufen 4–6 (LKW, Standortmanager, Flotte)
- Weitere Branchen
- Mehrere Szenarien/Levels (nur 1 festes Szenario)
- Multiplayer/Leaderboards
- Account-übergreifende Mehrfach-Spielstände

### 4.3 Startwerte für Balancing (anpassbar im Playtesting)

Diese Zahlen sind **Platzhalter mit plausibler Größenordnung**, keine endgültige Balance – im Code als benannte Konstanten/Config ablegen, nicht hartcodiert verstreuen:

- Startkapital: 5.000 €
- Kredit: 15.000 €, Zinssatz 6 % p.a., lineare Tilgung über 52 Wochen
- Ziel nach 52 Wochen: Kredit vollständig getilgt **und** kumulierter Gewinn ≥ 10.000 €
- Meilenstein-Check: alle 13 Runden (quartalsweise Zwischenbewertung innerhalb der wöchentlichen Spielschleife)
- Geselle: Lohnkosten ca. 450 €/Woche, erhöht Auftragskapazität um einen festen Faktor
- Lager: Miete ca. 150 €/Woche, feste Kapazität (z. B. 5 t), ermöglicht Mengenrabatt beim Materialeinkauf
- Auftragspool: 3–6 generierte Aufträge/Woche, Bezahlung/Material/Frist aus sinnvollen Zufallsbereichen
- Game-Over-Trigger (beide Bedingungen führen zur Insolvenz): Kapital < 0 für 2 aufeinanderfolgende Runden, **oder** ein Meilenstein-Check (siehe 3.1/4.4) wird 2x in Folge verpasst

### 4.4 Akzeptanzkriterien MVP ("echt spielbar")

- Spieler kann sich registrieren/einloggen (Magic Link), landet im Dashboard mit Startzustand.
- Spieler sieht pro Runde einen Auftragspool, kann Aufträge annehmen/ablehnen basierend auf Kapazität.
- Spieler kann Mitarbeiter einstellen (Stufe 2) und Lager mieten (Stufe 3), sobald Kapitalschwelle erreicht ist.
- Rundenabschluss berechnet korrekt Einnahmen/Ausgaben/Kreditrate und zeigt eine nachvollziehbare Wochenbilanz.
- Zufallsereignisse treten gelegentlich auf und werden in der Bilanz erklärt.
- Meilenstein-Checks lösen sichtbare Konsequenzen aus (Fortschritt, Warnung, Insolvenz/Game Over).
- Spielstand bleibt über Sessions hinweg erhalten (DB-Persistenz pro Account).

## 5. Datenmodell (Entitäten, Prisma-Schema-Skizze)

```
User        { id, email }
Company     { id, userId, cash, loanId, reputation, stage (1-3), weekNumber, status (active/insolvent/won) }
Loan        { id, companyId, principal, interestRate, weeklyRate, remainingBalance }
Milestone   { id, companyId, weekDue, targetCumulativeProfit, achieved }
Round       { id, companyId, weekNumber, status (open/resolved), summaryJson }
Order       { id, companyId, weekOffered, type, materialNeed, deadlineWeeks, payout, status (available/accepted/rejected/expired) }
Employee    { id, companyId, role (geselle), weeklyWage, productivityFactor, hiredWeek }
Warehouse   { id, companyId, capacity, weeklyRent, currentStock }
GameEvent   { id, companyId, weekNumber, type, effectJson }
```

Hinweis: Dieses Schema ist eine Ausgangsskizze für die Implementierungsplanung, keine finale Migration – Feldtypen/Indizes werden im Plan konkretisiert.

## 6. Technik & Architektur

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 — identisch zu `jos-assistant`, bewährter Stack ohne neue Lernkurve.
- **ORM/DB:** Prisma; lokal PGlite (wie in `jos-assistant`), produktiv kostenloses Postgres (Vercel Postgres oder Supabase Free Tier) — kein Abo nötig.
- **Auth:** Auth.js (NextAuth) mit Email-Provider (Magic Link) über **Resend Free Tier** (bis 3.000 Mails/Monat, keine Kreditkarte nötig).
- **Testing:** Vitest (wie `jos-assistant`), Schwerpunkt auf der Rundenberechnungs-Logik (reine Funktionen, gut testbar).
- **Hosting:** Vercel Free Tier.
- **Projektstruktur (Vorschlag, analog `jos-assistant`):**
  ```
  app/            Next.js App Router Routes (Dashboard, Login, Runde)
  components/     UI-Komponenten (Cards, Auftragsliste, Bilanz-Anzeige)
  lib/            Spiellogik (Rundenberechnung, Zufallsereignisse, Meilenstein-Check) — als reine, testbare Funktionen
  prisma/         Schema + Migrationen
  scripts/        Seed-Skripte (Demo-Firma, Beispielaufträge)
  tests/          Vitest-Tests, Fokus auf lib/
  docs/           Specs/Pläne (dieses Dokument liegt hier)
  ```

## 7. Repo & Deployment-Plan

1. Neues, eigenständiges Verzeichnis `biz-sim/` (lokal bereits angelegt, `git init` erfolgt), getrennt von `jos-assistant`.
2. Lokale Entwicklung mit `next dev`, PGlite als lokale DB.
3. Privates GitHub-Repo erstellen und pushen (noch ausstehend, auf Nutzer-Bestätigung).
4. Deployment über Vercel Free Tier, analog `jos-nu.vercel.app`.
5. Resend-Account anlegen (Free Tier) für Magic-Link-Versand, API-Key als Vercel-Env-Var.

## 8. Offene Punkte / Risiken für die Implementierungsplanung

- Genaue Formel für Mengenrabatt im Lager (Stufe 3) muss im Plan konkretisiert werden.
- Zufallsereignis-Wahrscheinlichkeiten müssen grob festgelegt werden (Vorschlag: ca. 1 Ereignis alle 4–6 Wochen).
- UI-Detailgestaltung (genaue Komponenten/Seiten) wird im Implementierungsplan verfeinert, nicht hier.
- Balancing-Zahlen aus 4.3 sind Startwerte, keine endgültige Spielbalance — nach erstem Playtest anpassen.

## 9. Nächster Schritt

Dieses Dokument geht in den `writing-plans`-Skill, um einen konkreten Implementierungsplan (Schritte, Dateien, Reihenfolge) für das MVP zu erstellen.
