import { CONDITION_DELAY, OPEX_PER_HIRE } from "./config";
import { delayOutcome, judgedStartup, outcomeValue, resolveVote, type OutcomeOutlook } from "./judge";
import { fill, months, runway, type ResolvedOutcome, type Template } from "./templates";
import type { BoardMember, CovenantId, CovenantRisk, CovenantSetup, Delta, Effect, Interest, Startup, ThemedCovenantId } from "./types";

// Auflagen: Wer "Ja, aber" sagt, muss sagen, welches Aber. Jede Vorlage gehört
// zu einem Themenfeld (Finanzierung, Team, Produkt, ...), und jedes Themenfeld
// hat drei eigene Auflagen. Jede davon schützt vor einer anderen Art von Risiko;
// genau eine trifft das eigentliche Risiko der Lage. Die passende ist oft besser
// als ein klares Ja oder Nein, die anderen kosten Zeit, Geld und Vertrauen und
// sind schlechter als eine klare Entscheidung. Welche passt, erfährt man über
// die Rückfrage zum Risiko, den CFO oder ein Vorgespräch.
// Die sechs allgemeinen Auflagen (Budgetdeckel, Stage-Gate, ...) stehen für die
// Risikoarten und laufen in älteren Spielständen weiter.

export interface CovenantDef {
  id: CovenantId;
  /** The kind of risk it guards against: decides when it fits. */
  risk: CovenantRisk;
  /** Short name on the button. */
  name: string;
  /** The term used in venture capital and private equity. */
  term: string;
  /** What the condition does, one sentence. */
  short: string;
  /** Which risk it guards against. */
  guards: string;
  lesson: string;
  /** Board members with these interests notice this risk first. */
  interests: Interest[];
  /** Further months until the plan takes effect (on top of the general delay of conditions). */
  extraDelay: number;
  /** Answer to "Woran könnte das scheitern?" when this condition fits. */
  diagnosis: (s: Startup) => string;
  fitWhy: string;
  missWhy: string;
  fitDelta: Delta;
  missDelta: Delta;
  /** Text of the benefit when it fits; {amount} is replaced. */
  saved: string;
}

const pctOf = (v: number) => `${Math.round(v * 100)} %`;

const LEGACY: Record<CovenantRisk, CovenantDef> = {
  budget: {
    id: "budget",
    risk: "budget",
    name: "Budgetdeckel",
    term: "Budgetdeckel (Cap)",
    short: "Die Ausgaben bekommen eine feste Obergrenze. Was darüber geht, braucht ein neues Okay.",
    guards: "Kosten, die davonlaufen, bei knapper Reichweite",
    lesson: "budgetdeckel",
    interests: ["cash"],
    extraDelay: 0,
    diagnosis: (s) =>
      `Das Geld reicht ${months(runway(s))}. Wird das Vorhaben teurer als geplant, ist die Kasse leer, bevor es wirkt. Die Gefahr sind nicht die Ziele, sondern die Kosten.`,
    fitWhy: "Das Geld war knapp. Ein Deckel schützt die Reichweite, ohne das Vorhaben zu stoppen.",
    missWhy: "Geld war hier nicht das Problem. Der Deckel bremst nur, was ohnehin finanziert war.",
    fitDelta: { axes: { finance: 3 } },
    missDelta: { growth: -0.003, morale: -3 },
    saved: "Der Budgetdeckel zwingt zu Prioritäten: Das Geld fließt nur in das, was wirkt. Umsatz {amount}.",
  },
  stagegate: {
    id: "stagegate",
    risk: "stagegate",
    name: "Meilenstein zuerst",
    term: "Stage-Gate (Meilensteinfinanzierung)",
    short: "Geld und Freigabe kommen in Tranchen. Die nächste gibt es erst, wenn ein vereinbarter Meilenstein erreicht ist.",
    guards: "eine große Zusage mit unsicherem Ausgang",
    lesson: "stage_gate",
    interests: ["cash", "control"],
    extraDelay: 1,
    diagnosis: () => "Das Vorhaben bindet viel auf einmal, und ob es aufgeht, ist offen. Scheitert es, ist alles schon ausgegeben. Die Gefahr ist der Alles-oder-nichts-Einsatz.",
    fitWhy: "Viel Einsatz, unsicherer Ausgang: Tranchen begrenzen den Schaden, wenn es schiefgeht.",
    missWhy: "Der Ausgang war nicht das Problem. Die Tranchen kosten hier nur Zeit.",
    fitDelta: { axes: { management: 2 } },
    missDelta: { growth: -0.003 },
    saved: "Am Meilenstein wird nachgesteuert, der zweite Teil sitzt besser. Umsatz {amount}.",
  },
  pilot: {
    id: "pilot",
    risk: "pilot",
    name: "Pilot zuerst",
    term: "Pilotprojekt (Testmarkt)",
    short: "Erst im Kleinen beweisen, etwa in {city} oder mit wenigen Kunden, dann ausrollen.",
    guards: "eine Nachfrage, die noch niemand belegt hat",
    lesson: "pilotprojekt",
    interests: ["customer", "product", "growth"],
    extraDelay: 1,
    diagnosis: (s) =>
      `Ob die Kunden das wirklich wollen, ist nicht belegt. Die Marktstärke liegt bei ${Math.round(s.metrics.axes.market)} von 100. Die Gefahr ist, im großen Stil etwas auszurollen, das keiner kauft.`,
    fitWhy: "Die Nachfrage war unbewiesen. Ein Pilot liefert den Beleg, bevor es teuer wird.",
    missWhy: "Die Nachfrage war nicht die offene Frage. Der Pilot verschenkt nur Monate.",
    fitDelta: { axes: { market: 3 } },
    missDelta: { growth: -0.004 },
    saved: "Der Pilot zeigt, was die Kunden wirklich wollen, der Rollout trifft besser. Umsatz {amount}.",
  },
  second: {
    id: "second",
    risk: "second",
    name: "Zweiter Anbieter",
    term: "Dual Sourcing (Klumpenrisiko senken)",
    short: "Nicht alles auf einen Partner, Kunden oder Lieferanten setzen: Eine zweite Quelle wird vertraglich aufgebaut.",
    guards: "die Abhängigkeit von einem einzigen Partner oder Kunden",
    lesson: "klumpenrisiko",
    interests: ["customer", "control"],
    extraDelay: 0,
    diagnosis: (s) =>
      `Die Firma hängt an wenigen: Der größte Kunde bringt ${pctOf(s.metrics.topCustomer)} des Umsatzes, und auch {partner} wäre schwer zu ersetzen. Die Gefahr ist, dass einer allein die Bedingungen diktiert.`,
    fitWhy: "Die Abhängigkeit war das Risiko. Eine zweite Quelle macht die Firma verhandlungsstark.",
    missWhy: "Es gab keine gefährliche Abhängigkeit. Der zweite Anbieter kostet nur Geld und Aufmerksamkeit.",
    fitDelta: { topCustomer: -0.04, axes: { edge: 2 } },
    missDelta: { grossMargin: -0.01 },
    saved: "Der zweite Anbieter macht die Firma verhandlungsstark. Umsatz {amount}.",
  },
  kpi: {
    id: "kpi",
    risk: "kpi",
    name: "Kennzahl-Auflage",
    term: "Covenant (Financial Covenant)",
    short: "Die Freigabe gilt nur, solange vereinbarte Kennzahlen halten, etwa Marge oder Mindestkasse. Reißt eine, wird neu beraten.",
    guards: "Zahlen, die kippen, ohne dass es jemand rechtzeitig merkt",
    lesson: "covenants",
    interests: ["cash", "control"],
    extraDelay: 0,
    diagnosis: (s) =>
      `Die Finanzsteuerung ist schwach (${Math.round(s.metrics.axes.finance)} von 100)${s.metrics.debt > 0 ? ", dazu laufen Kredite" : ""}. Kippt eine Zahl, merkt es niemand rechtzeitig. Die Gefahr ist der Blindflug.`,
    fitWhy: "Die Zahlen waren das Risiko. Eine Kennzahl als Frühwarnung zwingt zu sauberem Berichten.",
    missWhy: "Die Finanzsteuerung war in Ordnung. Die Kennzahl erzeugt nur Berichtsaufwand.",
    fitDelta: { axes: { finance: 5 } },
    missDelta: { morale: -2, axes: { management: -2 } },
    saved: "Die Kennzahl schlägt früh an, es wird rechtzeitig gegengesteuert. Umsatz {amount}.",
  },
  veto: {
    id: "veto",
    risk: "veto",
    name: "Vetorecht des Beirats",
    term: "Zustimmungsvorbehalt",
    short: "Größere Einstellungen und Ausgaben brauchen vorher die Zustimmung des Gremiums.",
    guards: "Personalaufbau ohne Kontrolle und eine Führung, der man noch nicht ganz traut",
    lesson: "zustimmungsvorbehalt",
    interests: ["control", "team"],
    extraDelay: 0,
    diagnosis: (s) =>
      `Das Vertrauen in die Steuerung ist angeschlagen (${Math.round(s.metrics.trust)} von 100), und der Plan baut Personal und Verpflichtungen auf. Die Gefahr ist, dass niemand prüft, wer eingestellt wird und was es kostet.`,
    fitWhy: "Wachstum ohne Kontrolle war das Risiko. Der Zustimmungsvorbehalt hält es im Rahmen.",
    missWhy: "Die Führung hatte das im Griff. Das Vetorecht wirkt wie Misstrauen und bremst.",
    fitDelta: { trust: 2, axes: { management: 3 } },
    missDelta: { trust: -5, morale: -3 },
    saved: "Der Zustimmungsvorbehalt verhindert teure Fehlentscheidungen. Umsatz {amount}.",
  },
};

/** What the risk kinds share across topic areas: who notices them, how long they take, what they do besides. */
function base(risk: CovenantRisk): Pick<CovenantDef, "risk" | "interests" | "extraDelay" | "fitDelta" | "missDelta"> {
  const l = LEGACY[risk];
  return { risk, interests: l.interests, extraDelay: l.extraDelay, fitDelta: l.fitDelta, missDelta: l.missDelta };
}

type ThemedDef = Omit<CovenantDef, "id" | "risk" | "interests" | "extraDelay" | "fitDelta" | "missDelta"> & { risk: CovenantRisk };

const finance = (s: Startup) => Math.round(s.metrics.axes.finance);
const debtNote = (s: Startup) => (s.metrics.debt > 0 ? ", und es laufen schon Kredite" : "");

const THEMED_DEFS: Record<ThemedCovenantId, ThemedDef> = {
  // Finanzierung und Kredit
  kreditdeckel: {
    risk: "budget",
    name: "Kreditrahmen mit Deckel",
    term: "Kreditlinie mit Obergrenze",
    short: "Das Geld kommt nicht auf einmal aufs Konto, sondern als Rahmen. Abgerufen wird nur bis zu einer festen Obergrenze im Monat.",
    guards: "frisches Geld, das schneller weg ist als geplant",
    lesson: "kreditrahmen",
    diagnosis: (s) =>
      `Das Geld reicht ${months(runway(s))}. Fließt die ganze Summe sofort in neue Ausgaben, ist sie weg, bevor sie wirkt. Die Gefahr ist nicht das Geld selbst, sondern dass die Kosten mitwachsen.`,
    fitWhy: "Die Kasse war knapp. Ein gedeckelter Rahmen hält die Ausgaben im Zaum, das Geld reicht länger.",
    missWhy: "Die Reichweite war nicht das Problem. Der Deckel macht jeden Abruf nur umständlicher.",
    saved: "Der Kreditrahmen zwingt zu Prioritäten: Abgerufen wird nur, was wirkt. Umsatz {amount}.",
  },
  tranchen: {
    risk: "stagegate",
    name: "Auszahlung in Tranchen",
    term: "Tranchen nach Meilenstein (Stage-Gate)",
    short: "Das Geld kommt in Teilen. Die nächste Tranche gibt es erst, wenn ein vereinbarter Meilenstein erreicht ist.",
    guards: "eine große Summe für einen Plan, dessen Ausgang offen ist",
    lesson: "stage_gate",
    diagnosis: () =>
      "Mit dem Geld soll viel auf einmal passieren, und ob der Plan aufgeht, ist offen. Geht er schief, ist alles schon ausgegeben. Die Gefahr ist der Alles-oder-nichts-Einsatz.",
    fitWhy: "Viel Geld, unsicherer Ausgang: Tranchen begrenzen den Schaden, wenn der Plan nicht aufgeht.",
    missWhy: "Der Ausgang war nicht unsicher. Die Tranchen verzögern nur, was ohnehin klappt.",
    saved: "Am Meilenstein wird nachgesteuert, die zweite Tranche sitzt besser. Umsatz {amount}.",
  },
  geldgeberkennzahl: {
    risk: "kpi",
    name: "Covenant-Kennzahl für die Geldgeber",
    term: "Financial Covenant",
    short: "Die Firma meldet Bank oder Investoren jeden Monat vereinbarte Kennzahlen, etwa Mindestkasse oder Verschuldung. Reißt eine, wird sofort nachverhandelt.",
    guards: "Zahlen, die kippen, ohne dass die Geldgeber es rechtzeitig merken",
    lesson: "covenants",
    diagnosis: (s) =>
      `Die Finanzsteuerung ist schwach (${finance(s)} von 100)${debtNote(s)}. Mit neuem Geld kommen Zinsen und Pflichten. Die Gefahr ist der Blindflug, bis die Geldgeber selbst die Reißleine ziehen.`,
    fitWhy: "Die Zahlen waren das Risiko. Eine Kennzahl für die Geldgeber zwingt zu sauberem Berichten und warnt früh.",
    missWhy: "Die Finanzen waren im Griff. Die Kennzahl erzeugt nur Berichtsaufwand.",
    saved: "Die Kennzahl schlägt früh an, es wird rechtzeitig gegengesteuert. Umsatz {amount}.",
  },
  // Team und Einstellungen
  stellenplan: {
    risk: "veto",
    name: "Stellenplan mit Freigabe",
    term: "Zustimmungsvorbehalt für Personal",
    short: "Neue Stellen, Gehaltssprünge und Beteiligungszusagen brauchen vorher das Okay des Gremiums.",
    guards: "Personalaufbau, den niemand prüft",
    lesson: "stellenplan",
    diagnosis: (s) =>
      `Das Vertrauen in die Steuerung liegt bei ${Math.round(s.metrics.trust)} von 100, und der Plan schafft feste Zusagen an Menschen. Was einmal zugesagt ist, lässt sich kaum zurücknehmen. Die Gefahr ist, dass niemand prüft, wer was bekommt.`,
    fitWhy: "Personal ohne Kontrolle war das Risiko. Mit dem Stellenplan bleibt jede Zusage im Rahmen.",
    missWhy: "Die Führung hatte das Personal im Griff. Die Freigabe wirkt wie Misstrauen und bremst.",
    saved: "Der Stellenplan verhindert teure Fehlbesetzungen. Umsatz {amount}.",
  },
  testphase: {
    risk: "pilot",
    name: "Testphase mit Zielen",
    term: "Pilotphase mit Erfolgskriterien",
    short: "Erst ein Team oder ein Standort für drei Monate, mit vorher vereinbarten Zielen. Danach für alle.",
    guards: "eine Wirkung, die noch niemand belegt hat",
    lesson: "pilotprojekt",
    diagnosis: (s) =>
      `Ob die Maßnahme wirkt, ist nicht belegt. Die Marktstärke liegt bei ${Math.round(s.metrics.axes.market)} von 100, die Stimmung im Team bei ${Math.round(s.metrics.morale)}. Die Gefahr ist, für alle etwas einzuführen, das man später nur mit Ärger zurücknimmt.`,
    fitWhy: "Die Wirkung war unbewiesen. Die Testphase liefert den Beleg, bevor es für alle gilt.",
    missWhy: "Die Wirkung war nicht die offene Frage. Die Testphase verschenkt nur Monate.",
    saved: "Die Testphase zeigt, was wirkt, die Einführung für alle trifft besser. Umsatz {amount}.",
  },
  vertretung: {
    risk: "second",
    name: "Vertretung für Schlüsselleute",
    term: "Key-Person-Absicherung",
    short: "Wissen und Kundenkontakte werden auf zwei Köpfe verteilt, mit Übergabeplan und fester Vertretung.",
    guards: "die Abhängigkeit von wenigen einzelnen Personen",
    lesson: "schluesselpersonen",
    diagnosis: (s) =>
      `Die Firma hängt an wenigen: Der größte Kunde bringt ${pctOf(s.metrics.topCustomer)} des Umsatzes, und die Kontakte liegen bei einzelnen Leuten. Geht eine Person, gehen Wissen und Kunden mit. Die Gefahr ist das Klumpenrisiko bei Menschen.`,
    fitWhy: "Die Abhängigkeit von Einzelnen war das Risiko. Mit einer Vertretung übersteht die Firma jeden Abgang.",
    missWhy: "Es gab keine gefährliche Abhängigkeit von Einzelnen. Die Doppelbesetzung kostet nur Geld.",
    saved: "Die Vertretung hält Kunden und Wissen in der Firma. Umsatz {amount}.",
  },
  // Produkt und Expansion
  testmarkt: {
    risk: "pilot",
    name: "Erst ein Testmarkt",
    term: "Pilotprojekt (Testmarkt)",
    short: "Erst im Kleinen beweisen, etwa in {city} oder mit wenigen Kunden, dann ausrollen.",
    guards: "eine Nachfrage, die noch niemand belegt hat",
    lesson: "pilotprojekt",
    diagnosis: (s) =>
      `Ob die Kunden das wirklich wollen, ist nicht belegt. Die Marktstärke liegt bei ${Math.round(s.metrics.axes.market)} von 100. Die Gefahr ist, im großen Stil etwas auszurollen, das keiner kauft.`,
    fitWhy: "Die Nachfrage war unbewiesen. Ein Testmarkt liefert den Beleg, bevor es teuer wird.",
    missWhy: "Die Nachfrage war nicht die offene Frage. Der Testmarkt verschenkt nur Monate.",
    saved: "Der Testmarkt zeigt, was die Kunden wirklich wollen, der Rollout trifft besser. Umsatz {amount}.",
  },
  meilenstein: {
    risk: "stagegate",
    name: "Freigabe nach Meilenstein",
    term: "Stage-Gate (Meilensteinfinanzierung)",
    short: "Das Projekt wird in Abschnitten freigegeben. Den nächsten gibt es erst, wenn ein vereinbarter Meilenstein erreicht ist.",
    guards: "eine große Zusage mit unsicherem Ausgang",
    lesson: "stage_gate",
    diagnosis: () => "Das Projekt bindet viel auf einmal, und ob es aufgeht, ist offen. Scheitert es, ist alles schon ausgegeben. Die Gefahr ist der Alles-oder-nichts-Einsatz.",
    fitWhy: "Viel Einsatz, unsicherer Ausgang: Abschnitte begrenzen den Schaden, wenn es schiefgeht.",
    missWhy: "Der Ausgang war nicht das Problem. Die Abschnitte kosten hier nur Zeit.",
    saved: "Am Meilenstein wird nachgesteuert, der zweite Abschnitt sitzt besser. Umsatz {amount}.",
  },
  projektdeckel: {
    risk: "budget",
    name: "Fester Projektdeckel",
    term: "Budgetdeckel (Cap)",
    short: "Das Vorhaben bekommt eine feste Kostenobergrenze. Was darüber geht, braucht ein neues Okay.",
    guards: "Projektkosten, die davonlaufen, bei knapper Reichweite",
    lesson: "budgetdeckel",
    diagnosis: (s) =>
      `Das Geld reicht ${months(runway(s))}. Wird das Projekt teurer als geplant, ist die Kasse leer, bevor es wirkt. Die Gefahr sind nicht die Ziele, sondern die Kosten.`,
    fitWhy: "Das Geld war knapp. Ein Deckel schützt die Reichweite, ohne das Vorhaben zu stoppen.",
    missWhy: "Geld war hier nicht das Problem. Der Deckel bremst nur, was ohnehin finanziert war.",
    saved: "Der Projektdeckel zwingt zu Prioritäten: Das Geld fließt nur in das, was wirkt. Umsatz {amount}.",
  },
  // Ausschüttung und Dividende
  mindestkasse: {
    risk: "budget",
    name: "Mindestkasse halten",
    term: "Liquiditätsreserve",
    short: "Ausgeschüttet wird nur, was über einer festen Mindestkasse liegt, etwa sechs Monatskosten.",
    guards: "eine Kasse, die nach der Ausschüttung zu dünn ist",
    lesson: "mindestkasse",
    diagnosis: (s) =>
      `Das Geld reicht ${months(runway(s))}. Fließt jetzt viel an die Gesellschafter, fehlt es, wenn ein schwacher Monat kommt. Die Gefahr ist eine Firma, die sich nach der Ausschüttung Geld leihen muss.`,
    fitWhy: "Die Reserve war dünn. Mit der Mindestkasse bekommen die Gesellschafter Geld, ohne die Firma zu gefährden.",
    missWhy: "Die Kasse war ohnehin dick genug. Die Mindestkasse hält nur Geld fest, das niemand braucht.",
    saved: "Die Reserve fängt einen schwachen Monat ab, ohne dass gespart werden muss. Umsatz {amount}.",
  },
  haelfte: {
    risk: "stagegate",
    name: "Nur die Hälfte ausschütten",
    term: "Ausschüttungsquote",
    short: "Die Hälfte geht jetzt an die Gesellschafter, der Rest bleibt in der Firma, bis klar ist, ob der Plan aufgeht.",
    guards: "ein Gewinn, der noch nicht sicher ist",
    lesson: "ausschuettung",
    diagnosis: () =>
      "Es steht viel Geld auf einmal zur Verteilung, und ob der Gewinn sich hält, ist offen. Ist das Geld erst draußen, kommt es nicht zurück. Die Gefahr ist eine Ausschüttung auf einen Gewinn, der wieder verschwindet.",
    fitWhy: "Der Ausgang war offen. Die halbe Ausschüttung belohnt die Gesellschafter und hält Geld für den Rückschlag.",
    missWhy: "Der Gewinn war sicher. Die halbe Ausschüttung hält nur Geld zurück, das den Gesellschaftern zusteht.",
    saved: "Das zurückbehaltene Geld arbeitet in der Firma weiter. Umsatz {amount}.",
  },
  quartal: {
    risk: "kpi",
    name: "Erst nach dem Quartalsabschluss",
    term: "Ausschüttung nach bestätigten Zahlen",
    short: "Ausgeschüttet wird erst, wenn der Quartalsabschluss die Zahlen bestätigt hat.",
    guards: "Zahlen, auf die man sich noch nicht verlassen kann",
    lesson: "reporting",
    diagnosis: (s) =>
      `Die Finanzsteuerung liegt bei ${finance(s)} von 100${debtNote(s)}. Ob der Gewinn so hoch ist wie gedacht, weiß niemand genau. Die Gefahr ist, Geld auszuschütten, das es in Wahrheit nicht gibt.`,
    fitWhy: "Die Zahlen waren unsicher. Der Abschluss bestätigt sie, bevor Geld die Firma verlässt.",
    missWhy: "Die Zahlen waren sauber. Das Warten auf den Abschluss verzögert nur.",
    saved: "Der Abschluss deckt Schwachstellen auf, die rechtzeitig behoben werden. Umsatz {amount}.",
  },
  // Zukauf und Verkauf (M&A)
  stufen: {
    risk: "stagegate",
    name: "Übernahme in Stufen",
    term: "Earn-out (gestaffelter Kaufpreis)",
    short: "Erst ein Teil, der Rest des Preises folgt erst, wenn vereinbarte Ziele erreicht sind.",
    guards: "ein großer Preis für eine Zukunft, die niemand garantiert",
    lesson: "earn_out",
    diagnosis: () =>
      "Bei dem Geschäft geht viel Geld auf einmal über den Tisch, und ob die Firma danach hält, was versprochen ist, ist offen. Die Gefahr ist, den vollen Preis für Hoffnungen zu zahlen.",
    fitWhy: "Der Wert war unsicher. In Stufen hängt ein Teil des Preises am echten Erfolg.",
    missWhy: "Der Wert war klar. Die Staffelung kostet nur Zeit und Verhandlungsgeduld.",
    saved: "Die zweite Stufe passt besser zu dem, was die Zahlen wirklich zeigen. Umsatz {amount}.",
  },
  garantien: {
    risk: "kpi",
    name: "Garantien im Kaufvertrag",
    term: "Garantien (Representations & Warranties)",
    short: "Der Vertrag sichert die wichtigsten Zahlen ab. Stimmen sie nicht, gibt es Geld zurück.",
    guards: "Zahlen, die nach dem Abschluss nicht halten",
    lesson: "garantien",
    diagnosis: (s) =>
      `Die Finanzsteuerung liegt bei ${finance(s)} von 100${debtNote(s)}. Ob alle Zahlen stimmen, lässt sich vor der Unterschrift nur begrenzt prüfen. Die Gefahr sind böse Überraschungen nach dem Abschluss.`,
    fitWhy: "Die Zahlen waren das Risiko. Garantien machen falsche Angaben teuer für die andere Seite.",
    missWhy: "Die Zahlen waren geprüft und sauber. Die Garantien kosten nur Anwaltszeit.",
    saved: "Die Garantien decken eine Lücke auf, die ausgeglichen wird. Umsatz {amount}.",
  },
  schluesselkunden: {
    risk: "second",
    name: "Schlüsselkunden vorher sichern",
    term: "Change-of-Control-Absicherung",
    short: "Vor dem Abschluss werden die wichtigsten Kunden und Leute mit Verträgen gebunden.",
    guards: "Kunden und Leute, die nach dem Eigentümerwechsel abspringen",
    lesson: "klumpenrisiko",
    diagnosis: (s) =>
      `Der größte Kunde bringt ${pctOf(s.metrics.topCustomer)} des Umsatzes. Wechselt der Eigentümer, prüfen große Kunden ihre Verträge neu. Die Gefahr ist, dass mit einem Kunden ein großer Teil des Werts geht.`,
    fitWhy: "Die Abhängigkeit war das Risiko. Gebundene Schlüsselkunden halten den Wert über den Wechsel.",
    missWhy: "Kein Kunde war gefährlich groß. Die Bindungsverträge kosten nur Rabatte.",
    saved: "Die gebundenen Kunden bleiben, der Umsatz hält. Umsatz {amount}.",
  },
  // Preis und Vertrieb
  testkunden: {
    risk: "pilot",
    name: "Erst mit einem Teil der Kunden",
    term: "Pilotprojekt (Testgruppe)",
    short: "Die Änderung gilt erst für eine Gruppe von Kunden oder in {city}. Wirkt sie, kommt sie für alle.",
    guards: "eine Kundenreaktion, die niemand kennt",
    lesson: "pilotprojekt",
    diagnosis: (s) =>
      `Wie die Kunden reagieren, ist nicht belegt. Die Marktstärke liegt bei ${Math.round(s.metrics.axes.market)} von 100. Die Gefahr ist, mit einem Schlag alle Kunden zu verprellen.`,
    fitWhy: "Die Kundenreaktion war unbekannt. Der Test liefert den Beleg, bevor alle betroffen sind.",
    missWhy: "Die Kunden waren nicht die offene Frage. Der Test verschenkt nur Monate.",
    saved: "Der Test zeigt, was die Kunden mitmachen, die Einführung trifft besser. Umsatz {amount}.",
  },
  zweiterweg: {
    risk: "second",
    name: "Zweiten Vertriebsweg halten",
    term: "Klumpenrisiko begrenzen",
    short: "Kein einzelner Kunde oder Partner darf mehr als ein Drittel des Umsatzes bringen; ein zweiter Weg zum Kunden bleibt offen.",
    guards: "die Abhängigkeit von einem einzigen Kunden oder Partner",
    lesson: "klumpenrisiko",
    diagnosis: (s) =>
      `Die Firma hängt an wenigen: Der größte Kunde bringt ${pctOf(s.metrics.topCustomer)} des Umsatzes, und auch {partner} wäre schwer zu ersetzen. Die Gefahr ist, dass einer allein die Bedingungen diktiert.`,
    fitWhy: "Die Abhängigkeit war das Risiko. Ein zweiter Weg zum Kunden macht die Firma verhandlungsstark.",
    missWhy: "Es gab keine gefährliche Abhängigkeit. Der zweite Vertriebsweg kostet nur Geld und Aufmerksamkeit.",
    saved: "Der zweite Vertriebsweg macht die Firma verhandlungsstark. Umsatz {amount}.",
  },
  margenboden: {
    risk: "kpi",
    name: "Margen-Untergrenze",
    term: "Preisuntergrenze (Mindestmarge)",
    short: "Kein Auftrag und kein Preis unter einer festen Mindestmarge. Wird sie gerissen, entscheidet das Gremium neu.",
    guards: "Umsatz, der am Ende kein Geld verdient",
    lesson: "margenuntergrenze",
    diagnosis: (s) =>
      `Die Rohmarge liegt bei ${pctOf(s.metrics.grossMargin)}, die Finanzsteuerung bei ${finance(s)} von 100. Wer über den Preis verkauft, merkt oft erst spät, dass jeder Auftrag Geld kostet. Die Gefahr ist Wachstum ohne Ertrag.`,
    fitWhy: "Die Zahlen waren das Risiko. Die Untergrenze verhindert Umsatz, der Geld verbrennt.",
    missWhy: "Die Marge war nicht in Gefahr. Die Untergrenze verhindert nur gute Abschlüsse.",
    saved: "Die Mindestmarge hält die Preise sauber. Umsatz {amount}.",
  },
  // Governance und Führung
  zustimmungskatalog: {
    risk: "veto",
    name: "Zustimmungskatalog",
    term: "Zustimmungsvorbehalt",
    short: "Größere Einstellungen, Verträge und Ausgaben brauchen vorher die Zustimmung des Gremiums.",
    guards: "eine Führung, der man noch nicht ganz traut",
    lesson: "zustimmungsvorbehalt",
    diagnosis: (s) =>
      `Das Vertrauen in die Steuerung ist angeschlagen (${Math.round(s.metrics.trust)} von 100), die Führungsstärke liegt bei ${Math.round(s.metrics.axes.management)}. Die Gefahr ist, dass niemand prüft, was die Führung zusagt und was es kostet.`,
    fitWhy: "Führung ohne Kontrolle war das Risiko. Der Zustimmungskatalog hält sie im Rahmen.",
    missWhy: "Die Führung hatte das im Griff. Der Katalog wirkt wie Misstrauen und bremst.",
    saved: "Der Zustimmungskatalog verhindert teure Fehlentscheidungen. Umsatz {amount}.",
  },
  zielstufen: {
    risk: "stagegate",
    name: "Zusage in Stufen nach Zielen",
    term: "Stufenplan mit Zielvereinbarung",
    short: "Was beantragt ist, kommt in Stufen: die zweite erst, wenn vereinbarte Ziele erreicht sind.",
    guards: "eine große Zusage an Personen, bevor sie sich bewährt haben",
    lesson: "stage_gate",
    diagnosis: () =>
      "Hier wird eine große, schwer umkehrbare Zusage an Menschen gemacht, und ob sie sich bewährt, ist offen. Die Gefahr ist, alles vorab zu geben und danach keinen Hebel mehr zu haben.",
    fitWhy: "Der Erfolg war offen. Mit Stufen bleibt ein Hebel, bis die Ziele erreicht sind.",
    missWhy: "Es gab keinen Grund zum Zögern. Die Stufen wirken wie Misstrauen und kosten Zeit.",
    saved: "Die Ziele geben Richtung, die zweite Stufe sitzt. Umsatz {amount}.",
  },
  monatsbericht: {
    risk: "kpi",
    name: "Monatsbericht an das Gremium",
    term: "Reporting-Pflicht",
    short: "Die Geschäftsführung legt jeden Monat feste Kennzahlen vor. Weicht eine ab, wird sofort beraten.",
    guards: "Entscheidungen, die niemand mit Zahlen nachprüft",
    lesson: "reporting",
    diagnosis: (s) =>
      `Die Finanzsteuerung liegt bei ${finance(s)} von 100${debtNote(s)}. Ob die Führung liefert, sieht man heute erst am Jahresende. Die Gefahr ist, dass Fehlentwicklungen zu spät auffallen.`,
    fitWhy: "Die Zahlen waren das Risiko. Der Monatsbericht macht Abweichungen früh sichtbar.",
    missWhy: "Die Berichte waren schon gut. Der zusätzliche Monatsbericht erzeugt nur Aufwand.",
    saved: "Der Monatsbericht zeigt Abweichungen früh, es wird rechtzeitig gegengesteuert. Umsatz {amount}.",
  },
  // Krise und Risiko
  krisenbudget: {
    risk: "budget",
    name: "Krisenbudget mit Deckel",
    term: "Budgetdeckel (Cap)",
    short: "Für die Krise gibt es ein festes Budget. Was darüber hinaus geht, braucht ein neues Okay.",
    guards: "Krisenkosten, die die Kasse leeren",
    lesson: "budgetdeckel",
    diagnosis: (s) =>
      `Das Geld reicht ${months(runway(s))}. In einer Krise wird schnell und teuer entschieden. Die Gefahr ist, dass die Krisenkosten die Firma härter treffen als die Krise selbst.`,
    fitWhy: "Das Geld war knapp. Das Krisenbudget hält die Kosten im Rahmen.",
    missWhy: "Geld war in dieser Krise nicht das Problem. Der Deckel bremst nur die Lösung.",
    saved: "Das Krisenbudget lenkt das Geld dorthin, wo es wirkt. Umsatz {amount}.",
  },
  ersatzquelle: {
    risk: "second",
    name: "Ersatz und zweite Quelle",
    term: "Dual Sourcing (Klumpenrisiko senken)",
    short: "Für den kritischen Lieferanten, Dienstleister oder Kunden wird vertraglich ein zweiter aufgebaut.",
    guards: "die Abhängigkeit von einem einzigen Partner oder Kunden",
    lesson: "klumpenrisiko",
    diagnosis: (s) =>
      `Die Firma hängt an wenigen: Der größte Kunde bringt ${pctOf(s.metrics.topCustomer)} des Umsatzes, und auch {partner} wäre schwer zu ersetzen. Fällt einer aus, steht die Firma. Die Gefahr ist das Klumpenrisiko.`,
    fitWhy: "Die Abhängigkeit war das Risiko. Eine zweite Quelle macht die Firma krisenfest.",
    missWhy: "Es gab keine gefährliche Abhängigkeit. Die zweite Quelle kostet nur Geld und Aufmerksamkeit.",
    saved: "Die zweite Quelle hält den Betrieb am Laufen. Umsatz {amount}.",
  },
  krisenstab: {
    risk: "kpi",
    name: "Krisenstab mit Wochenbericht",
    term: "Krisenreporting",
    short: "Ein kleiner Krisenstab berichtet dem Gremium jede Woche Zahlen und Maßnahmen, bis die Lage stabil ist.",
    guards: "eine Lage, die kippt, ohne dass es jemand rechtzeitig merkt",
    lesson: "reporting",
    diagnosis: (s) =>
      `Die Finanzsteuerung liegt bei ${finance(s)} von 100${debtNote(s)}. In der Krise ändern sich die Zahlen jede Woche. Die Gefahr ist, dass das Gremium erst davon erfährt, wenn es zu spät ist.`,
    fitWhy: "Der Überblick war das Risiko. Der Wochenbericht macht die Krise steuerbar.",
    missWhy: "Die Lage war überschaubar. Der Krisenstab bindet nur Leute.",
    saved: "Der Krisenstab steuert früh gegen. Umsatz {amount}.",
  },
};

export const COVENANTS: Record<CovenantId, CovenantDef> = {
  ...LEGACY,
  ...(Object.fromEntries(Object.entries(THEMED_DEFS).map(([id, d]) => [id, { ...d, ...base(d.risk), id }])) as Record<ThemedCovenantId, CovenantDef>),
};

export const COVENANT_IDS = Object.keys(COVENANTS) as CovenantId[];

/** What each kind of risk is about, for people who know one field well (network contacts). */
export const RISK_LABEL: Record<CovenantRisk, string> = {
  budget: "Kosten und Budgets",
  stagegate: "Tranchen und Meilensteine",
  pilot: "Tests und Piloten",
  second: "Abhängigkeiten",
  kpi: "Kennzahlen und Berichte",
  veto: "Kontrolle der Führung",
};

// ---------------------------------------------------------------------------
// Themenfelder: jede Vorlage gehört zu einem, jedes hat drei Auflagen
// ---------------------------------------------------------------------------

export type ThemeId = "finanzierung" | "team" | "produkt" | "ausschuettung" | "zukauf" | "vertrieb" | "governance" | "krise";

export const THEMES: Record<ThemeId, { label: string; covenants: [ThemedCovenantId, ThemedCovenantId, ThemedCovenantId] }> = {
  finanzierung: { label: "Finanzierung und Kredit", covenants: ["kreditdeckel", "tranchen", "geldgeberkennzahl"] },
  team: { label: "Team und Einstellungen", covenants: ["stellenplan", "testphase", "vertretung"] },
  produkt: { label: "Produkt und Expansion", covenants: ["testmarkt", "meilenstein", "projektdeckel"] },
  ausschuettung: { label: "Ausschüttung und Dividende", covenants: ["mindestkasse", "haelfte", "quartal"] },
  zukauf: { label: "Zukauf und Verkauf", covenants: ["stufen", "garantien", "schluesselkunden"] },
  vertrieb: { label: "Preis und Vertrieb", covenants: ["testkunden", "zweiterweg", "margenboden"] },
  governance: { label: "Führung und Governance", covenants: ["zustimmungskatalog", "zielstufen", "monatsbericht"] },
  krise: { label: "Krise und Risiko", covenants: ["krisenbudget", "ersatzquelle", "krisenstab"] },
};

/**
 * Topic area of every template, and which of its three conditions the subject
 * itself calls for (on top of what the numbers say). A bank loan is about
 * reporting to the lender, a price rise about testing it on some customers first.
 */
const TOPICS: Record<string, [ThemeId, Partial<Record<ThemedCovenantId, number>>]> = {
  bridge: ["finanzierung", { kreditdeckel: 0.7 }],
  seed_round: ["finanzierung", { geldgeberkennzahl: 0.5, tranchen: 0.2 }],
  bank_loan: ["finanzierung", { geldgeberkennzahl: 0.7 }],
  subsidy: ["finanzierung", { tranchen: 0.5, geldgeberkennzahl: 0.2 }],
  foerderkredit: ["finanzierung", { geldgeberkennzahl: 0.6 }],
  m_covenant: ["finanzierung", { geldgeberkennzahl: 0.7 }],
  hire_sales: ["team", { stellenplan: 0.5, testphase: 0.3 }],
  esop: ["team", { stellenplan: 0.4, vertretung: 0.3 }],
  cto_leaves: ["team", { vertretung: 0.6 }],
  viertagewoche: ["team", { testphase: 0.6 }],
  m_betriebsrat: ["team", { testphase: 0.5 }],
  m_ausbildung: ["team", { testphase: 0.5 }],
  expansion: ["produkt", { testmarkt: 0.6, meilenstein: 0.3 }],
  second_product: ["produkt", { meilenstein: 0.6 }],
  pivot: ["produkt", { testmarkt: 0.6 }],
  feature: ["produkt", { meilenstein: 0.5 }],
  office: ["produkt", { projektdeckel: 0.6 }],
  ausland: ["produkt", { testmarkt: 0.6 }],
  m_onlineshop: ["produkt", { testmarkt: 0.6 }],
  m_halle: ["produkt", { projektdeckel: 0.6 }],
  k_werk: ["produkt", { testmarkt: 0.6 }],
  k_digital: ["produkt", { meilenstein: 0.6 }],
  dividend: ["ausschuettung", { quartal: 0.4, mindestkasse: 0.3 }],
  k_dividende: ["ausschuettung", { quartal: 0.5 }],
  acquisition: ["zukauf", { stufen: 0.6 }],
  m_zukauf: ["zukauf", { stufen: 0.5, schluesselkunden: 0.2 }],
  k_zukauf: ["zukauf", { stufen: 0.4, garantien: 0.3 }],
  price: ["vertrieb", { testkunden: 0.6 }],
  exclusive: ["vertrieb", { zweiterweg: 0.7 }],
  marketing: ["vertrieb", { testkunden: 0.5 }],
  freemium: ["vertrieb", { testkunden: 0.6 }],
  partnership: ["vertrieb", { zweiterweg: 0.6 }],
  price_war: ["vertrieb", { margenboden: 0.5 }],
  payment_terms: ["vertrieb", { margenboden: 0.4, zweiterweg: 0.3 }],
  influencer: ["vertrieb", { testkunden: 0.6 }],
  rahmenvertrag: ["vertrieb", { zweiterweg: 0.6 }],
  m_preise: ["vertrieb", { testkunden: 0.6 }],
  k_auftrag: ["vertrieb", { margenboden: 0.5, zweiterweg: 0.2 }],
  founder_salary: ["governance", { zielstufen: 0.5 }],
  hire_cfo: ["governance", { zielstufen: 0.4, zustimmungskatalog: 0.3 }],
  m_geschaeftsfuehrung: ["governance", { zielstufen: 0.5, zustimmungskatalog: 0.3 }],
  m_seniorchef: ["governance", { zustimmungskatalog: 0.6 }],
  k_verguetung: ["governance", { monatsbericht: 0.6 }],
  cost_cut: ["krise", { krisenstab: 0.5 }],
  privacy: ["krise", { krisenstab: 0.5 }],
  quality: ["krise", { krisenstab: 0.5 }],
  datenpanne: ["krise", { krisenstab: 0.5 }],
  m_lieferant: ["krise", { ersatzquelle: 0.7 }],
};

/** The topic area set for a template, if any. */
export function templateTopic(templateId: string): ThemeId | undefined {
  return TOPICS[templateId]?.[0];
}

/** The topic area of a template; unknown ones count as product and expansion. */
export function themeOf(templateId: string): ThemeId {
  return templateTopic(templateId) ?? "produkt";
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How strongly the numbers of the situation point to each kind of risk. */
export function riskScores(t: Template, s: Startup): Record<CovenantRisk, number> {
  const m = s.metrics;
  const go = t.outcomes.go.resolve(s);
  let spend = 0;
  let hires = 0;
  let upside = 0;
  const deltas: Delta[] = [...go.effects.map((e) => e.delta), ...(go.risk ? [go.risk.good] : [])];
  for (const d of deltas) {
    spend += Math.max(0, -(d.cash ?? 0)) + Math.max(0, d.opex ?? 0) * 6 + Math.max(0, d.team ?? 0) * OPEX_PER_HIRE * 6;
    hires += Math.max(0, d.team ?? 0);
    upside += Math.max(0, d.growth ?? 0) * 10 + Math.max(0, d.revenuePct ?? 0);
  }
  const heavy = clamp01(spend / Math.max(1, m.cash) / 0.6);
  const chance = go.risk?.chance;
  const reach = runway(s);
  const text = `${t.title} ${t.motion} ${t.pitch}`;
  const dependent = /\{partner\}|\{customer\}|Lieferant|Partner|Großkunde|Rahmenvertrag/.test(text);
  return {
    budget: (Number.isFinite(reach) ? clamp01((9 - reach) / 7) : 0) * 0.8 + heavy * 0.25,
    stagegate: (chance !== undefined ? clamp01((0.7 - chance) / 0.4) * 0.5 : 0) + heavy * 0.3,
    pilot: clamp01((60 - m.axes.market) / 35) * 0.5 + (upside > 0 ? 0.15 : 0),
    second: clamp01((m.topCustomer - 0.25) / 0.3) * 0.8 + (dependent ? 0.2 : 0),
    kpi: clamp01((55 - m.axes.finance) / 35) * 0.5 + (m.debt > 0 ? 0.25 : 0),
    veto: clamp01((60 - m.trust) / 35) * 0.5 + clamp01(hires / 3) * 0.3 + clamp01((50 - m.axes.management) / 30) * 0.2,
  };
}

/** How strongly the situation calls for each of the template's three conditions: its subject plus what the numbers say. */
export function covenantScores(t: Template, s: Startup): Partial<Record<CovenantId, number>> {
  const risks = riskScores(t, s);
  const affinity = TOPICS[t.id]?.[1] ?? {};
  return Object.fromEntries(THEMES[themeOf(t.id)].covenants.map((id) => [id, (affinity[id] ?? 0) + risks[COVENANTS[id].risk]]));
}

/**
 * Fixes the three conditions of an item when it comes up: the three of its
 * topic area, the one that fits the risk best marked. The order on screen is
 * shuffled so position tells nothing.
 */
export function covenantSetup(t: Template, s: Startup, random: () => number): CovenantSetup {
  const scores = covenantScores(t, s);
  const ids = THEMES[themeOf(t.id)].covenants;
  for (const id of ids) scores[id] = scores[id]! + (random() - 0.5) * 0.12;
  const fit = ids.reduce((best, id) => (scores[id]! > scores[best]! ? id : best), ids[0]);
  const options: CovenantId[] = [...ids];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)) % (i + 1);
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  // The clearer the situation calls for the condition, the more it beats a plain decision.
  const edge = Math.min(0.3, Math.max(-0.25, -0.36 + 0.35 * Math.min(1.3, scores[fit]!) + (random() - 0.5) * 0.25));
  const miss: Partial<Record<CovenantId, number>> = {};
  for (const id of ids) if (id !== fit) miss[id] = 0.1 + random() * 0.15;
  return { options, fit, edge: Math.round(edge * 1000) / 1000, miss };
}

export interface CovenantPlan {
  id: CovenantId;
  fits: boolean;
  resolved: ResolvedOutcome;
  outlook: OutcomeOutlook;
  /** What the condition adds to (positive) or takes from (negative) the monthly revenue, as a fraction. */
  amount: number;
}

export interface CovenantOutlook {
  go: OutcomeOutlook;
  no: OutcomeOutlook;
  /** The board's standard condition (the template's middle path). */
  standard: OutcomeOutlook;
  plans: CovenantPlan[];
  /** The lower anchor of the decision's spread: the worst of go, no and standard. */
  floor: number;
}

export const signedPct = (v: number) => `${v > 0 ? "+" : "−"}${(Math.round(Math.abs(v) * 1000) / 10).toLocaleString("de-DE")} %`;

/** The effect of a condition, in two halves: the second only counts in full after the follow-up. */
function leverEffects(def: CovenantDef, fits: boolean, amount: number, s: Startup): Effect[] {
  if (amount === 0) return [];
  const half = amount / 2;
  if (amount > 0) {
    return [
      { delay: CONDITION_DELAY, text: fill(def.saved.replace("{amount}", signedPct(half)), s), delta: { revenuePct: half } },
      { delay: CONDITION_DELAY + 2, text: `Die Auflage „${def.name}“ wirkt weiter: Umsatz ${signedPct(half)}.`, delta: { revenuePct: half }, review: true },
    ];
  }
  const what = fits ? "Die Auflage kostet Abstimmung und Zeit" : `„${def.name}“ passt nicht: Abstimmungen, Berichte und Verzögerung bremsen den Vertrieb`;
  return [
    { delay: CONDITION_DELAY, text: `${what}. Umsatz ${signedPct(half)}.`, delta: { revenuePct: half } },
    { delay: CONDITION_DELAY + 2, text: `Die Auflage „${def.name}“ bindet weiter Zeit. Umsatz ${signedPct(half)}.`, delta: { revenuePct: half } },
  ];
}

function withLever(base: ResolvedOutcome, extra: Effect[]): ResolvedOutcome {
  return { ...base, effects: [...base.effects, ...extra] };
}

/**
 * The outcome of one condition: the board's middle path, later by the time a
 * condition needs, plus what the condition does. The size of that effect is
 * set so the condition lands where the item's setup says: the fitting one
 * above the plain decisions (by `edge`), the others below (by `miss`).
 */
export function planCovenant(t: Template, input: Startup, setup: CovenantSetup, id: CovenantId, plain?: { go: number; no: number; standard: number }): CovenantPlan {
  const s = judgedStartup(input);
  const def = COVENANTS[id];
  const fits = id === setup.fit;
  const values = plain ?? {
    go: outcomeValue(s, resolveVote(t, "go", s)).value,
    no: outcomeValue(s, resolveVote(t, "no", s)).value,
    standard: outcomeValue(s, resolveVote(t, "conditions", s)).value,
  };
  const hi = Math.max(values.go, values.no);
  const top = Math.max(hi, values.standard);
  const lo = Math.min(values.go, values.no, values.standard);
  // A decision where one option ruins the company would make every gap huge: the spread counts up to half the value.
  const spread = Math.min(Math.max(top - lo, 0.02 * Math.abs(top), 1), Math.max(1, 0.35 * Math.abs(top)));
  const target = fits
    ? Math.max(top + setup.edge * spread, values.standard + 0.1 * spread)
    : Math.min(hi, values.standard) - (setup.miss[id] ?? 0.25) * spread - 0.01 * Math.abs(top);

  const middle = delayOutcome(t.outcomes.conditions.resolve(s), CONDITION_DELAY + def.extraDelay);
  const flavour: Effect = { delay: CONDITION_DELAY, text: fill(fits ? def.fitWhy : def.missWhy, s), delta: fits ? def.fitDelta : def.missDelta };
  const base = withLever(middle, [flavour]);
  const v0 = outcomeValue(s, base).value;

  // Value grows about in step with revenue; one correction step for crises and exits.
  const bound = (r: number) => Math.round(Math.min(0.4, Math.max(-0.25, fits ? Math.max(0, r) : Math.min(0, r))) * 200) / 200;
  const slope = Math.max(1, Math.abs(v0));
  let amount = bound((target - v0) / slope);
  let resolved = withLever(base, leverEffects(def, fits, amount, s));
  let outlook = outcomeValue(s, resolved);
  if (amount !== 0 && Math.abs(outlook.value - target) > 0.03 * spread) {
    const measured = (outlook.value - v0) / amount;
    if (measured > slope * 0.1) {
      const next = bound(amount + (target - outlook.value) / measured);
      if (next !== amount) {
        amount = next;
        resolved = withLever(base, leverEffects(def, fits, amount, s));
        outlook = outcomeValue(s, resolved);
      }
    }
  }
  return { id, fits, resolved, outlook, amount };
}

/** What the CFO plans for every option of an item, conditions included. */
export function covenantOutlook(t: Template, input: Startup, setup: CovenantSetup): CovenantOutlook {
  const s = judgedStartup(input);
  const go = outcomeValue(s, resolveVote(t, "go", s));
  const no = outcomeValue(s, resolveVote(t, "no", s));
  const standard = outcomeValue(s, resolveVote(t, "conditions", s));
  const plain = { go: go.value, no: no.value, standard: standard.value };
  const plans = setup.options.map((id) => planCovenant(t, s, setup, id, plain));
  return { go, no, standard, plans, floor: Math.min(go.value, no.value, standard.value) };
}

/** All options with their planned value: "go", "no" and each offered condition. */
export function optionValues(o: CovenantOutlook): Record<string, number> {
  const values: Record<string, number> = { go: o.go.value, no: o.no.value };
  for (const p of o.plans) values[p.id] = p.outlook.value;
  return values;
}

/** The answer to the risk question: what could make the plan fail. */
export function riskAnswer(setup: CovenantSetup, s: Startup): string {
  return fill(COVENANTS[setup.fit].diagnosis(s), s);
}

export const RISK_QUESTION = { id: "risiko", q: "Woran könnte das scheitern?" } as const;

/** What a member lets on about the risk in a talk beforehand: only those whose interests touch it see it. */
export function pretalkHint(member: BoardMember, setup: CovenantSetup): string | null {
  const def = COVENANTS[setup.fit];
  if (!member.interests.some((i) => def.interests.includes(i))) return null;
  return `Mir macht vor allem ${def.guards} Sorgen.`;
}

/** Free hints: the numbers anyone can read. They point somewhere, but often to more than one condition. */
export function covenantSignals(s: Startup): { label: string; value: string; alert: boolean }[] {
  const m = s.metrics;
  const reach = runway(s);
  return [
    { label: "Reichweite", value: Number.isFinite(reach) ? `${Math.round(reach)} Mon.` : "verdient Geld", alert: reach < 6 },
    { label: "Größter Kunde", value: pctOf(m.topCustomer), alert: m.topCustomer > 0.3 },
    { label: "Markt", value: `${Math.round(m.axes.market)}/100`, alert: m.axes.market < 45 },
    { label: "Finanzen", value: `${Math.round(m.axes.finance)}/100`, alert: m.axes.finance < 45 || m.debt > 0 },
    { label: "Vertrauen", value: `${Math.round(m.trust)}/100`, alert: m.trust < 50 },
  ];
}

export function covenantName(id: CovenantId | "standard"): string {
  return id === "standard" ? "Auflage des Gremiums" : COVENANTS[id].name;
}
