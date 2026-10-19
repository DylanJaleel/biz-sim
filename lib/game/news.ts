import type { Delta, Startup } from "./types";

// Was in der Welt passiert: Ereignisse treffen Branchen oder einzelne Firmen.
// Am Anfang selten, später häufiger. So verläuft kein Spiel wie das andere.

export interface NewsDef {
  id: string;
  title: string;
  text: string;
  /** Sectors hit; empty = every company. */
  sectors: string[];
  /** Only one company, picked at random among those that fit. */
  single?: boolean;
  delta: Delta;
  /** Report line per company. */
  effect: string;
}

export const NEWS: NewsDef[] = [
  { id: "foerder", title: "Förderprogramm für die Verkehrswende", text: "Der Bund fördert Pendlerangebote mit Zuschüssen.", sectors: ["Mobilität"], delta: { cash: 20_000 }, effect: "Zuschuss aus dem Förderprogramm: 20.000 €." },
  { id: "datenschutz", title: "Neue Datenschutzauflagen", text: "Software für Firmen muss Daten künftig in Deutschland speichern.", sectors: ["Software für Firmen", "Bildung"], delta: { opex: 1_500, growth: -0.003, axes: { product: -3 } }, effect: "Neue Datenschutzauflagen kosten 1.500 € im Monat." },
  { id: "fachkraefte", title: "Fachkräfte werden knapp", text: "Entwickler und Vertriebsleute verlangen mehr Gehalt.", sectors: [], delta: { opex: 1_500, morale: -4 }, effect: "Höhere Gehälter, um Leute zu halten." },
  { id: "energie", title: "Strompreise ziehen an", text: "Energieintensive Betriebe zahlen deutlich mehr.", sectors: ["Lebensmittel", "Logistik", "Industrie"], delta: { grossMargin: -0.03 }, effect: "Höhere Stromkosten drücken die Marge um 3 Punkte." },
  { id: "mehrweg", title: "Mehrwegpflicht wird verschärft", text: "Lieferdienste müssen ab sofort Mehrweg anbieten.", sectors: ["Logistik"], delta: { revenuePct: 0.04, growth: 0.003 }, effect: "Die verschärfte Mehrwegpflicht bringt neue Kunden." },
  { id: "ausbildung", title: "Ausbildungsoffensive des Bundes", text: "Betriebe bekommen Zuschüsse für digitale Lernangebote.", sectors: ["Bildung"], delta: { growth: 0.004 }, effect: "Die Ausbildungsoffensive treibt die Nachfrage." },
  { id: "sommer", title: "Rekordsommer", text: "Wochenlang Sonne: Radfahrer und Biergärten jubeln.", sectors: ["Mobilität", "Lebensmittel"], delta: { revenuePct: 0.03 }, effect: "Der Rekordsommer bringt 3 % mehr Umsatz." },
  { id: "lieferkette", title: "Engpässe in der Lieferkette", text: "Bauteile und Verpackungen kommen Wochen zu spät.", sectors: ["Mobilität", "Logistik", "Industrie"], delta: { grossMargin: -0.025, revenuePct: -0.02, morale: -2 }, effect: "Lieferengpässe kosten Marge." },
  { id: "aufgabe", title: "Ein Wettbewerber gibt auf", text: "Ein bekannter Konkurrent stellt den Betrieb ein.", sectors: [], single: true, delta: { growth: 0.004, axes: { market: 3 } }, effect: "Ein Wettbewerber gibt auf, seine Kunden suchen eine Alternative." },
  { id: "presse", title: "Großer Zeitungsartikel", text: "Eine überregionale Zeitung porträtiert ein junges Unternehmen.", sectors: [], single: true, delta: { growth: 0.003, trust: 3 }, effect: "Ein großer Zeitungsartikel bringt Aufmerksamkeit." },
  { id: "ausfall", title: "Ein Kunde zahlt nicht", text: "Ein mittelgroßer Kunde ist insolvent und bleibt Rechnungen schuldig.", sectors: [], single: true, delta: { cash: -25_000 }, effect: "Ein insolventer Kunde bleibt 25.000 € schuldig." },
  { id: "cyber", title: "Cyberangriff", text: "Hacker legen die Systeme eines Softwareanbieters lahm.", sectors: ["Software für Firmen", "Bildung"], single: true, delta: { revenuePct: -0.05, growth: -0.003, trust: -3 }, effect: "Ein Cyberangriff legt die Systeme zwei Tage lahm." },
  { id: "auftrag", title: "Öffentliche Ausschreibung gewonnen", text: "Ein Startup gewinnt einen Auftrag der Stadt.", sectors: [], single: true, delta: { revenuePct: 0.04, axes: { market: 3 } }, effect: "Eine öffentliche Ausschreibung gewonnen." },
  { id: "zurueckhaltung", title: "Verbraucher halten sich zurück", text: "Die Stimmung ist trüb, Haushalte sparen.", sectors: ["Mobilität", "Lebensmittel"], delta: { revenuePct: -0.03, growth: -0.004 }, effect: "Die Kaufzurückhaltung kostet Umsatz." },
  { id: "budgets", title: "Firmen kürzen IT-Budgets", text: "Viele Mittelständler verschieben Softwareprojekte ins nächste Jahr.", sectors: ["Software für Firmen", "Bildung"], delta: { growth: -0.006 }, effect: "Kunden verschieben Aufträge, das Wachstum lässt nach." },
  { id: "abwerbung", title: "Großkonzern wirbt Talente ab", text: "Ein Tech-Konzern eröffnet einen Standort und zahlt Spitzengehälter.", sectors: [], single: true, delta: { morale: -6, axes: { product: -4 }, opex: 1_000 }, effect: "Zwei Schlüsselleute wechseln zum Konzern, der Rest will mehr Gehalt." },
  { id: "preiskampf", title: "Preiskampf in der Branche", text: "Ein gut finanzierter Neuling unterbietet alle Preise.", sectors: [], single: true, delta: { grossMargin: -0.03, growth: -0.003 }, effect: "Ein Preiskampf drückt Marge und Wachstum." },
];

/** Companies a piece of news hits. */
export function targetsOf(news: NewsDef, startups: Startup[], random: () => number): Startup[] {
  const fit = startups.filter((s) => news.sectors.length === 0 || news.sectors.includes(s.sector));
  if (!news.single || fit.length === 0) return fit;
  return [fit[Math.floor(random() * fit.length) % fit.length]!];
}
