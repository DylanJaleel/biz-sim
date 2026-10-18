# Wirtschaftsmodell – Design und Balancing

> **Historisch.** Beschreibt das abgelöste Handwerksspiel. Aktuell: [`boardroom-konzept.md`](./boardroom-konzept.md).


Dieses Dokument beschreibt, wie die Wirtschaft des Spiels funktioniert und **warum** die Zahlen so gewählt sind. Alle Zahlen stehen in `lib/config.ts` (einzige Quelle); die Rechenlogik ist rein und getestet (`lib/economy.ts`, `lib/investments.ts`), die Balance wird per Simulation geprüft (`lib/simulation.ts`, `tests/economy-balance.test.ts`, `npm run simulate`).

## 1. Leitgedanken

1. **Keine Ziellinie.** Es gibt kein Gewinnziel, keinen Sieg und kein Zeitlimit. Eine Firma läuft weiter, bis sie insolvent geht. Fortschritt zeigt der *Firmenwert* (Eigenkapital: Kapital + Zeitwert der Ausstattung − Restschuld), nicht ein Ziel.
2. **Aufträge allein tragen den Betrieb.** Ein sauber geplanter Solo-Handwerker kommt mit den Aufträgen knapp über den Break-even (rund +250 €/Woche nach Lebenshaltung und Kreditzinsen). Wer schlampig plant, rutscht ins Minus.
3. **Gewinn wird reinvestiert.** Wachstum kostet Geld *und* erhöht die Fixkosten. Jede Investition ist erst eine Last und zahlt sich nur aus, wenn man sie auch auslasten kann. Zu früh oder zu schnell zu wachsen ist der häufigste Weg in die Insolvenz.
4. **Realistische Hürden statt künstlicher Zufälle.** Fixkosten, Saison, Ausfälle, Materialpreise, Reklamationen, Einarbeitung, Kündigungsfristen, Platz in der Werkstatt, Fahrzeuge. Zufall gibt es nur als Wochenereignis, das *vor* der Planung bekannt ist.

## 2. Die Wochenschleife

1. Zu Wochenbeginn sind die **Angebote** (nach Marktsegment, Saison und Ruf) und das **Wochenereignis** (falls eines eintritt) bereits da.
2. Der Spieler wählt Aufträge, bis seine **Stunden** aufgebraucht sind. Aufträge, die nicht passen, bleiben bis zur Frist im Markt.
3. Er kann **investieren** (einstellen, Fahrzeug kaufen, Werkzeug aufrüsten, Werkstatt wechseln). Die Kosten werden sofort gebucht und stehen in der Wochenbilanz.
4. **Woche abschließen:** Aufträge werden bezahlt, Material und alle Fixkosten abgebucht, Reklamationen ausgewürfelt, Ruf aktualisiert, Kreditrate gezahlt, Insolvenz geprüft; die nächste Woche wird vorbereitet.

Ein Jahr hat 52 Wochen; die Saison folgt `1 + 0,2·sin(2π(w−1)/52)` (Hochsaison im Sommer, Flaute im Winter, ±20 % Nachfrage).

## 3. Kapazität: Stunden statt Auftragsanzahl

Jede Person hat `40 Std. × Werkzeugwirkungsgrad` abrechenbare Zeit pro Woche. Der Rest geht für Suchen, Nacharbeit, Fahrten und Büro drauf.

| Faktor | Wirkung |
|---|---|
| Werkzeug Stufe 1 / 2 / 3 | 70 % / 76 % / 82 % nutzbare Zeit |
| Geselle | 85 % der Inhaber-Fähigkeit, in den ersten 2 Wochen nur die Hälfte |
| Inhaber-Verwaltung | −2,5 Prozentpunkte Zeit je Mitarbeiter (Planen, Anleiten, Papierkram) |
| Fahrzeug fehlt | die Person arbeitet nur mit 70 % der Zeit |
| Krankheit (Ereignis) | betroffene Person nur 40 % |

Der Solo-Handwerker hat 28 Std./Woche. Ein Auftrag blockiert seine Stunden; angenommen werden kann er nur, wenn sie frei sind.

## 4. Markt: drei Segmente

Angebote entstehen je Segment, bis dessen Stundenbudget für die Woche gefüllt ist. Das Budget hängt von Saison und Ruf ab (`Basis · Saison · max(0, Sockel + Steigung·Ruf/100)`).

| Segment | Werkzeug nötig | Std./Woche (Basis) | Ruf-Einfluss | Stundensatz (Arbeit) | Aufträge |
|---|---|---|---|---|---|
| 1 Privatkunden & Kleinaufträge | Stufe 1 | 52 | gering (0,9 + 0,2·Ruf) | 40–60 € | Reparatur, Standardarbeit, Einbau |
| 2 Gewerbe & Renovierung | Stufe 2 | 40 | stark (0,2 + 1,3·Ruf) | 51–68 € | Standard, Einbau, Sonderanfertigung |
| 3 Premium & Objekt | Stufe 3 | 20 | sehr stark (−0,1 + 1,2·Ruf) | 64–86 € | Einbau, Sonderanfertigung |

Material wird zusätzlich vergütet (Aufschlag 8–18 %), ist aber ein Vorschuss: Es wird bei Wochenabschluss abgebucht. Mit steigendem Ruf wächst vor allem die Nachfrage nach den teureren Segmenten, die aber bessere Werkzeuge verlangen. **Das ist der Grund, Werkzeuge aufzurüsten**: Stufe 1 hat auf Dauer zu wenig Nachfrage, Stufe 2/3 haben mehr und besser bezahlte Stunden.

**Ruf** (0–100, Start 40): `+0,045 je abgerechneter Stunde − 2,5 je Reklamation − 1,2 % Verfall pro Woche`. Er steigt nur mit sauberer, regelmäßiger Arbeit und sinkt, wenn man ihn vernachlässigt.

## 5. Kosten

Fixkosten laufen jede Woche, auch ohne Aufträge:

| Posten | Betrag |
|---|---|
| Werkstattmiete | 290 € (Stufe 1) / 640 € / 1.200 € |
| Fahrzeuge | 110 € je Fahrzeug |
| Versicherung | 65 € + 20 € je Mitarbeiter |
| Verwaltung & Büro | 60 € + 15 € je Mitarbeiter |
| Werkzeugpflege | 25 € / 40 € / 70 € je Person |
| Lohn Geselle | 1.000 € pro Woche |
| Lebenshaltung Inhaber | 500 € pro Woche (kein Gewinn, sondern Entnahme) |

Variabel: Material, Reklamationen (Preisnachlass 30 % des Auftragswerts), Fahrzeugreparatur (500–1.400 €, Ereignis), Dispozinsen (12 % p. a. bei negativem Kapital) und Kreditzinsen.

**Gewinn** = Einnahmen − Material − Fixkosten − Reklamationen − Ereignis − Zinsen. Die **Kredittilgung** ist kein Aufwand und zählt nicht zum Gewinn, sie reduziert aber das Kapital. **Investitionen** sind ebenfalls kein Aufwand (Ausstattung behält Wert), stehen aber in der Wochenbilanz unter „Kapital“.

Reklamationen: Ausfallwahrscheinlichkeit je Auftrag 8 % / 5 % / 3 % (Werkzeug 1/2/3), bei Auslastung über 85 % bis zu +60 % relativ mehr. Überlastung rächt sich also.

## 6. Start und Insolvenz

Start: 10.000 € Kapital (5.000 € Eigenkapital + 15.000 € Kredit − 10.000 € Erstausstattung), ein Fahrzeug, Werkzeug Stufe 1, kleine Werkstatt (3 Plätze), Ruf 40. Kredit: 15.000 € zu 6 % über 104 Wochen, lineare Tilgung (ca. 144 € + Zinsen pro Woche).

**Insolvenz**, wenn das Kapital am Wochenende unter −3.000 € (Dispo-Rahmen) fällt oder 3 Wochen in Folge negativ ist. Danach ist das Spiel beendet (Ergebnis-Karte, „Neues Spiel starten“).

## 7. Die Expansionsleiter

Jede Stufe hat Kosten, die sich erst mit höherer Auslastung lohnen.

| Schritt | Kosten | Effekt | Warum die Hürde sinnvoll ist |
|---|---|---|---|
| **Werkzeug Stufe 2** | 9.000 € | 76 % Nutzzeit, weniger Reklamationen, Segment 2 frei | Erst nach einem Polster sinnvoll; Pflege kostet 15 €/Person mehr |
| **Fahrzeug + Geselle** | 8.000 € + 2.500 € Vermittlung | +ca. 24 Std./Woche (nach 2 Wochen Einarbeitung), −2,5 pp Inhaberzeit | Lohn und Nebenkosten ≈ 1.100 €/Woche laufen sofort; wer die Stunden nicht füllen kann, verliert Geld |
| **Zweiter Geselle** | 2.500 € (+ Fahrzeug) | nochmal ca. +24 Std. | Werkstatt Stufe 1 hat nur 3 Plätze |
| **Meister-Ausstattung (Stufe 3)** | 20.000 € | 82 % Nutzzeit, 3 % Reklamationen, Premium-Segment frei | Braucht Ruf ab ca. 60, sonst fehlt die Nachfrage für das Premium-Segment |
| **Werkstatt Stufe 2** | 12.000 € | 6 Plätze, Miete 640 € | Fixkosten verdoppeln sich fast |
| **Werkstatt Stufe 3** | 30.000 € | 10 Plätze, Miete 1.200 € | nur mit größerem Team und starker Nachfrage |
| **Entlassen** | – | Kündigungsfrist 2 Wochen, Lohn läuft weiter; vor Dienstbeginn: Absage, Gebühr verloren | macht Personal zu einer echten Entscheidung |

## 8. Ergebnisse der Simulation

`npm run simulate` spielt 200 zufällige Spielverläufe à 104 Wochen mit festen Strategien (Stand der aktuellen Werte):

| Strategie | Pleite | Ø Gewinn/Woche J1 | Ø Gewinn/Woche J2 | Firmenwert (Median, Woche 104) | Team (Ende) |
|---|---|---|---|---|---|
| passiv (nichts annehmen) | 100 % (Woche 11) | −1.117 € | – | negativ | 1 |
| unbedacht (greift wahllos zu) | 8 % | 107 € | 115 € | 11.700 € | 1 |
| Solo, optimal gewählt | 0 % | 234 € | 245 € | 24.500 € | 1 |
| wachsend (bis 2 Gesellen) | 0 % | 450 € | 1.341 € | 72.700 € | 3 |
| wachsend (bis 5 Gesellen) | 0 % | 450 € | 1.266 € | 53.000 € | 5 |
| waghalsig (sofort hohe Investitionen) | 100 % (Woche 11) | −451 € | – | negativ | 3 |

Verlauf des „wachsenden“ Spielers (Median): Woche 13 allein mit Polster → Woche 26 erstes Team-Mitglied → Woche 52 Ruf 69 → Woche 78 dritte Person → Woche 104 ca. 2.150 € Gewinn/Woche.

Tests (`tests/economy-balance.test.ts`) halten fest: Nichtstun und blinde Großinvestitionen führen sicher in die Pleite; ein sorgfältiger Solo-Spieler überlebt zu ≥ 95 % bei kleinem Gewinn; der Wachstumspfad ist sicher und lohnt sich deutlich (> 3× Firmenwert); fünf Mitarbeiter an *einem* Standort lohnen sich nicht mehr gegenüber dreien – der Standort ist **gesättigt** (Nachfrage, Plätze, Verwaltung). Genau diese Sättigung ist der Anlass für den zweiten Standort.

## 9. Spielgefühl in der Praxis

- **Woche 1–10:** Solo, 28 Std. pro Woche, bei sorgfältiger Auswahl +100…+450 € Gewinn. Fehler sind nicht sofort tödlich, aber der Dispo-Rahmen setzt eine Grenze.
- **Erste Entscheidung:** Polster aufbauen oder früh investieren. Zu früh einstellen ist der klassische Fehler.
- **Ab ca. Woche 20–60:** Werkzeug, Fahrzeug, erster Geselle. Die Aufträge werden besser (Ruf), Kapazität wächst.
- **Danach:** 3 Personen sind der gesunde Zustand für eine kleine Werkstatt; für mehr braucht man Werkstatt Stufe 2 und Premium-Nachfrage. Am Ende eines Standorts stehen Sättigung und der Wunsch nach Filiale.

## 10. Roadmap

Nicht umgesetzt, aber vorbereitet bzw. geplant:

1. **Zweiter Standort** (nächster großer Schritt). Vorschlag für die Freischaltung: Werkstatt Stufe 2+, Werkzeug Stufe 2+, Ruf ≥ 65–75, Kapital ≥ 25–40.000 €, Team ≥ 4. Eigener Markt (neue Stadt, Ruf startet bei ca. 30), eigener **Betriebsleiter** (Lohn deutlich höher, Fixkosten + Miete + Fahrzeuge), Einrichtung ca. 12–15.000 €. Standorte konkurrieren um die Aufmerksamkeit des Inhabers: Verwaltungslast je Standort.
2. **Lager und Zahlungsziele:** Material auf Vorrat (Mengenrabatt), Kunden zahlen mit Verzug, Forderungen und Liquiditätslücken.
3. **Marketing:** Werbung erhöht kurzfristig Nachfrage/Ruf, kostet laufend.
4. **Steuern & Jahresabschluss:** Einkommensteuer auf Jahresgewinn, Jahresrückblick, Erfolge.
5. **Weitere Kredite** (Investitionskredit, Dispo-Erhöhung) und **Fahrzeugtypen** (Transporter, LKW mit mehr Material/Kapazität).
6. **Gehalts- und Qualifikationssystem:** Gesellen mit unterschiedlichem Können, Weiterbildung, Azubis.

## 11. Änderungsregeln

Zahlen werden **nur in `lib/config.ts`** angepasst. Danach `npm run simulate` und `npm test` ausführen; die Balance-Tests schlagen an, wenn die Spielidee kippt (Solo zu leicht/zu schwer, Wachstum lohnt nicht mehr, Standort nicht mehr gesättigt).
