import type { StartupDefinition } from "./startups";
import type { Axes, BoardMember, Holder, Interest, Personality } from "./types";

// Neue Angebote ohne Ende: Aus Branchen, Ideen, Namen und Kennzahlen entsteht
// jedes Mal eine andere Firma. Die Prüfung zeigt ehrlich, was die Zahlen
// verschweigen, denn die Schwächen sind in den Achsen angelegt.

export type DealStage = "preseed" | "seed" | "growth" | "buyout";

export const STAGE_LABEL: Record<DealStage, string> = {
  preseed: "Pre-Seed",
  seed: "Seed",
  growth: "Wachstum",
  buyout: "Nachfolge",
};

interface Idea {
  name: [string, string];
  tagline: string;
  pitch: string;
}

interface SectorDef {
  sector: string;
  margin: [number, number];
  ideas: Idea[];
  competitors: string[];
  partners: string[];
  acquirers: string[];
  customers: string[];
  /** Ideas for family businesses looking for a successor. */
  mittelstand: Idea[];
}

export const SECTORS: SectorDef[] = [
  {
    sector: "Mobilität",
    margin: [0.3, 0.45],
    ideas: [
      { name: ["Rad", "flotte"], tagline: "Lastenräder im Abo für Handwerksbetriebe", pitch: "Handwerker fahren in der Stadt schneller mit dem Rad als mit dem Transporter." },
      { name: ["Lade", "punkt"], tagline: "Ladesäulen für Mehrfamilienhäuser", pitch: "Mieter wollen E-Autos, Vermieter wollen keinen Aufwand. Wir übernehmen beides." },
      { name: ["Pendel", "bus"], tagline: "Sammeltaxis für Gewerbegebiete", pitch: "Wo kein Bus fährt, fahren wir: auf Abruf, für Firmen bezahlt." },
    ],
    competitors: ["Velocity", "UrbanMove", "Stromer24"],
    partners: ["die Stadtwerke", "ein großer Autovermieter", "der Verkehrsverbund"],
    acquirers: ["die Mobil AG", "ein Autohersteller", "die Bahn"],
    customers: ["ein Klinikverbund", "ein Logistikpark", "eine Wohnungsgenossenschaft"],
    mittelstand: [{ name: ["Autohaus ", "Berger"], tagline: "Autohaus mit Werkstatt, drei Standorte", pitch: "Der Inhaber geht in Rente, die Kinder wollen nicht übernehmen." }],
  },
  {
    sector: "Software für Firmen",
    margin: [0.65, 0.85],
    ideas: [
      { name: ["Takt", "plan"], tagline: "Schichtplanung für Pflegeheime", pitch: "Pflegeheime planen Schichten noch mit Excel und Bauchgefühl." },
      { name: ["Beleg", "blick"], tagline: "Buchhaltung, die Belege selbst zuordnet", pitch: "Kleine Firmen verlieren jeden Monat zwei Tage mit Belegen." },
      { name: ["Werk", "akte"], tagline: "Digitale Bauakte für Handwerker", pitch: "Auf jeder Baustelle fehlt irgendein Zettel. Bei uns nicht." },
      { name: ["Kunden", "puls"], tagline: "Kundenservice-Software für Stadtwerke", pitch: "Stadtwerke bekommen tausende Anfragen, wir sortieren sie automatisch." },
    ],
    competitors: ["SoftServe", "Planio", "DataDach"],
    partners: ["ein großes Systemhaus", "die IHK", "ein Branchenverband"],
    acquirers: ["ein amerikanischer Softwarekonzern", "die DATEV-Konkurrenz", "ein Finanzinvestor"],
    customers: ["eine Pflegekette", "ein Stadtwerk", "ein Baukonzern"],
    mittelstand: [{ name: ["Systemhaus ", "Krämer"], tagline: "IT-Dienstleister für den Mittelstand", pitch: "Der Gründer sucht nach 30 Jahren einen Nachfolger, der das Team hält." }],
  },
  {
    sector: "Lebensmittel",
    margin: [0.25, 0.4],
    ideas: [
      { name: ["Hafer", "hof"], tagline: "Haferdrinks aus regionalem Anbau", pitch: "Pflanzenmilch boomt, aber kaum eine kommt aus der Region." },
      { name: ["Kiez", "küche"], tagline: "Mittagessen für Büros, frisch geliefert", pitch: "Büros wollen gutes Essen, aber keine eigene Kantine." },
      { name: ["Brot", "bote"], tagline: "Bäckerei-Abo bis an die Haustür", pitch: "Frisches Brot jeden Morgen, ohne zum Bäcker zu gehen." },
    ],
    competitors: ["FoodLane", "Frischfix", "Kornkraft"],
    partners: ["eine Supermarktkette", "ein Großhändler", "ein Lieferdienst"],
    acquirers: ["ein Lebensmittelkonzern", "eine Supermarktkette", "ein Getränkehersteller"],
    customers: ["eine Hotelkette", "ein Bürokomplex", "eine Supermarktkette"],
    mittelstand: [{ name: ["Bäckerei ", "Lindner"], tagline: "Bäckerei mit zwölf Filialen", pitch: "Vierte Generation, aber niemand will um drei Uhr aufstehen." }],
  },
  {
    sector: "Bildung",
    margin: [0.55, 0.8],
    ideas: [
      { name: ["Lern", "pfad"], tagline: "Nachhilfe per Video mit echten Lehrern", pitch: "Nachhilfe ist teuer und schwer zu finden, besonders auf dem Land." },
      { name: ["Azubi", "werk"], tagline: "Lern-App für Auszubildende im Handwerk", pitch: "Jeder dritte Azubi bricht ab. Mit uns weniger." },
      { name: ["Sprach", "brücke"], tagline: "Deutschkurse für Fachkräfte aus dem Ausland", pitch: "Firmen holen Fachkräfte, aber die Sprache bremst alles." },
    ],
    competitors: ["Lernbox", "EduNet", "SkillUp"],
    partners: ["die Handwerkskammer", "eine Volkshochschule", "die Arbeitsagentur"],
    acquirers: ["ein Bildungsverlag", "ein Weiterbildungskonzern", "ein Finanzinvestor"],
    customers: ["ein Klinikverbund", "eine Handwerkskammer", "ein Industrieverband"],
    mittelstand: [{ name: ["Fahrschule ", "Albrecht"], tagline: "Fahrschulkette mit acht Filialen", pitch: "Die Inhaberin will nach 25 Jahren aufhören und sucht einen guten Käufer." }],
  },
  {
    sector: "Logistik",
    margin: [0.18, 0.32],
    ideas: [
      { name: ["Kühl", "kette"], tagline: "Gekühlte Lieferung für Apotheken", pitch: "Medikamente müssen kalt bleiben, die meisten Kuriere können das nicht." },
      { name: ["Palette", "plus"], tagline: "Leerfahrten vermeiden: Frachtbörse für Spediteure", pitch: "Jeder dritte Lkw fährt leer. Das ist Geld auf der Straße." },
      { name: ["Kiste", "kreis"], tagline: "Mehrwegkisten für den Versandhandel", pitch: "Karton landet im Müll. Unsere Kiste kommt zurück." },
    ],
    competitors: ["CargoNow", "Lieferfix", "TransHub"],
    partners: ["ein Paketdienst", "ein Großhändler", "ein Hafenbetreiber"],
    acquirers: ["ein Logistikkonzern", "ein Paketdienst", "eine Spedition"],
    customers: ["eine Apothekenkette", "ein Onlinehändler", "ein Autozulieferer"],
    mittelstand: [{ name: ["Spedition ", "Hartmann"], tagline: "Spedition mit 40 Lkw", pitch: "Der Seniorchef hat keine Nachfolge, die Fahrer wollen bleiben." }],
  },
  {
    sector: "Gesundheit",
    margin: [0.5, 0.75],
    ideas: [
      { name: ["Praxis", "funk"], tagline: "Online-Terminbuchung für Physiotherapie", pitch: "Praxen verlieren jede Woche Termine durch Absagen ohne Ersatz." },
      { name: ["Pflege", "nah"], tagline: "Vermittlung von Pflegekräften für Zuhause", pitch: "Angehörige suchen verzweifelt Hilfe, Pflegekräfte suchen faire Jobs." },
      { name: ["Atem", "werk"], tagline: "Reha-App für Lungenpatienten", pitch: "Nach der Klinik hört die Reha meist auf. Wir machen weiter." },
    ],
    competitors: ["MediBook", "CareNow", "Gesundly"],
    partners: ["eine große Krankenkasse", "ein Klinikverbund", "ein Ärzteverband"],
    acquirers: ["ein Medizintechnik-Konzern", "eine Klinikgruppe", "ein Finanzinvestor"],
    customers: ["eine Krankenkasse", "eine Klinikkette", "ein Pflegedienst"],
    mittelstand: [{ name: ["Sanitätshaus ", "Wolff"], tagline: "Sanitätshaus mit Orthopädiewerkstatt", pitch: "Der Inhaber sucht einen Käufer, der die Werkstatt nicht schließt." }],
  },
  {
    sector: "Energie",
    margin: [0.25, 0.4],
    ideas: [
      { name: ["Sonnen", "dach"], tagline: "Solaranlagen für Gewerbedächer zur Miete", pitch: "Hallendächer sind leer, Strom ist teuer. Wir bringen beides zusammen." },
      { name: ["Wärme", "werk"], tagline: "Wärmepumpen für Altbauten, mit Einbau", pitch: "Jeder will eine Wärmepumpe, kaum ein Handwerker hat Zeit." },
      { name: ["Strom", "teiler"], tagline: "Mieterstrom für Wohnanlagen", pitch: "Solarstrom vom Dach direkt an die Mieter, ohne Bürokratie." },
    ],
    competitors: ["Enpal", "SolarNord", "VoltWerk"],
    partners: ["ein Stadtwerk", "ein Großhändler für Haustechnik", "eine Bank für Förderkredite"],
    acquirers: ["ein Energiekonzern", "ein Stadtwerk", "ein Infrastrukturfonds"],
    customers: ["eine Wohnungsbaugesellschaft", "ein Logistikpark", "eine Supermarktkette"],
    mittelstand: [{ name: ["Elektro ", "Neumann"], tagline: "Elektrobetrieb mit 35 Mitarbeitern", pitch: "Volle Auftragsbücher, aber der Meister ist 67 und will aufhören." }],
  },
  {
    sector: "Finanzen",
    margin: [0.6, 0.85],
    ideas: [
      { name: ["Konto", "klar"], tagline: "Geschäftskonto für Selbstständige", pitch: "Selbstständige verstehen ihre Bank nicht und die Bank sie nicht." },
      { name: ["Miet", "kaution"], tagline: "Kautionsversicherung statt Bargeld", pitch: "Mieter haben die Kaution nicht flüssig, Vermieter wollen Sicherheit." },
      { name: ["Rente", "plan"], tagline: "Betriebsrente für kleine Firmen, digital", pitch: "Kleine Firmen wollen Leute halten, aber Betriebsrente ist Papierkrieg." },
    ],
    competitors: ["Finom", "Kontist", "Penta"],
    partners: ["eine Sparkasse", "ein Versicherer", "ein Steuerberaterverband"],
    acquirers: ["eine Großbank", "ein Versicherer", "ein Zahlungsdienstleister"],
    customers: ["ein Verband der Selbstständigen", "eine Hausverwaltung", "ein Handwerksverband"],
    mittelstand: [{ name: ["Versicherungsmakler ", "Roth"], tagline: "Versicherungsmakler mit 4.000 Firmenkunden", pitch: "Der Gründer will verkaufen, solange die Kunden noch treu sind." }],
  },
  {
    sector: "Bau und Handwerk",
    margin: [0.22, 0.38],
    ideas: [
      { name: ["Fliesen", "fix"], tagline: "Badsanierung zum Festpreis in zehn Tagen", pitch: "Wer ein Bad saniert, wartet Monate und zahlt mehr als geplant." },
      { name: ["Modul", "haus"], tagline: "Holzmodule für Aufstockungen", pitch: "In Städten fehlt Wohnraum, Dächer gibt es genug." },
      { name: ["Gerüst", "netz"], tagline: "Gerüste zur Miete per App", pitch: "Kleine Betriebe brauchen ein Gerüst für drei Tage und finden keins." },
    ],
    competitors: ["Bauhelden", "Renovio", "MeisterNet"],
    partners: ["ein Baustoffhändler", "eine Wohnungsbaugesellschaft", "die Handwerkskammer"],
    acquirers: ["ein Baukonzern", "ein Baustoffhändler", "ein Finanzinvestor"],
    customers: ["eine Wohnungsbaugesellschaft", "eine Hausverwaltung", "ein Bauträger"],
    mittelstand: [{ name: ["Dachdecker ", "Schuster"], tagline: "Dachdeckerei mit 25 Leuten", pitch: "Der Betrieb ist kerngesund, aber der Chef findet keinen Meister als Nachfolger." }],
  },
  {
    sector: "Tourismus",
    margin: [0.35, 0.55],
    ideas: [
      { name: ["Hütten", "zeit"], tagline: "Buchungsplattform für Berghütten", pitch: "Berghütten buchen per Telefon und Fax. Wirklich." },
      { name: ["Rad", "reise"], tagline: "Geführte Radreisen mit Gepäcktransport", pitch: "Radurlaub boomt, aber niemand will Gepäck schleppen." },
      { name: ["Camp", "platz"], tagline: "Stellplätze auf Bauernhöfen für Wohnmobile", pitch: "Wohnmobile gibt es doppelt so viele wie vor fünf Jahren, Stellplätze nicht." },
    ],
    competitors: ["TripNow", "Alpenbuch", "CampFinder"],
    partners: ["ein Tourismusverband", "die Bahn", "ein Reiseveranstalter"],
    acquirers: ["ein Reisekonzern", "eine Buchungsplattform", "ein Finanzinvestor"],
    customers: ["ein Reiseveranstalter", "ein Hotelverband", "eine Region"],
    mittelstand: [{ name: ["Hotel ", "Seeblick"], tagline: "Familienhotel mit 60 Zimmern am See", pitch: "Die Eigentümer sind müde, das Haus ist voll gebucht." }],
  },
];

const CITIES = ["Leipzig", "Hamburg", "Köln", "Freiburg", "Nürnberg", "Bremen", "Dresden", "Münster", "Mannheim", "Kiel", "Augsburg", "Hannover", "Erfurt", "Regensburg"];
export const FIRST = ["Anna", "Ben", "Clara", "David", "Elif", "Finn", "Greta", "Hannes", "Ida", "Jonas", "Katja", "Luca", "Mira", "Nico", "Olga", "Paul", "Rosa", "Samir", "Tilda", "Umut", "Vera", "Yusuf", "Zoe", "Moritz", "Leonie", "Kerem", "Sophie", "Tobias"];
export const LAST = ["Albers", "Bauer", "Cetin", "Dietrich", "Engel", "Fuchs", "Graf", "Hahn", "Ilić", "Jäger", "Kaya", "Lorenz", "Marx", "Nowak", "Ott", "Peters", "Quandt", "Ritter", "Sommer", "Thiel", "Unger", "Vogt", "Weiß", "Yildiz", "Ziegler", "Brandt", "Haas", "Kühn"];
const FUNDS = ["Nordstern Ventures", "Elbkapital", "Seed Collective", "Rheinland Ventures", "Alpen Capital", "Kiezkapital", "Main Ventures", "Spree Capital"];
const PERSONALITIES: Personality[] = ["visionary", "numbers", "doer", "diplomat", "loyal", "practical"];
const INTERESTS: Interest[] = ["growth", "cash", "team", "product", "customer", "control"];

interface StageDef {
  revenue: [number, number];
  growth: [number, number];
  stake: [number, number];
  team: [number, number];
  /** Monthly burn (startups) or margin of safety (buyouts). */
  burn: [number, number];
  runway: [number, number];
}

const STAGES: Record<DealStage, StageDef> = {
  preseed: { revenue: [4_000, 16_000], growth: [0.04, 0.085], stake: [10, 15], team: [3, 8], burn: [14_000, 38_000], runway: [6, 13] },
  seed: { revenue: [18_000, 55_000], growth: [0.03, 0.06], stake: [7, 11], team: [8, 20], burn: [30_000, 80_000], runway: [7, 14] },
  growth: { revenue: [90_000, 240_000], growth: [0.018, 0.04], stake: [4, 7], team: [25, 70], burn: [60_000, 180_000], runway: [8, 16] },
  buyout: { revenue: [60_000, 220_000], growth: [-0.004, 0.01], stake: [60, 80], team: [25, 140], burn: [0, 0], runway: [3, 6] },
};

const between = (r: () => number, [a, b]: [number, number]) => a + r() * (b - a);
const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length]!;
const round = (v: number, step: number) => Math.round(v / step) * step;

function person(r: () => number, used: Set<string>): { name: string; short: string } {
  for (let i = 0; i < 20; i++) {
    const first = pick(r, FIRST);
    const last = pick(r, LAST);
    const name = `${first} ${last}`;
    if (!used.has(first) && !used.has(last)) {
      used.add(first);
      used.add(last);
      return { name, short: first };
    }
  }
  const first = pick(r, FIRST);
  return { name: `${first} ${pick(r, LAST)}`, short: first };
}

function interests(r: () => number): Interest[] {
  const a = pick(r, INTERESTS);
  let b = pick(r, INTERESTS);
  if (b === a) b = INTERESTS[(INTERESTS.indexOf(a) + 2) % INTERESTS.length]!;
  return [a, b];
}

function axes(r: () => number, stage: DealStage): Axes {
  const base = stage === "buyout" ? { management: 55, product: 38, market: 32, edge: 26, finance: 55 } : { management: 55, product: 60, market: 60, edge: 45, finance: 42 };
  const out = { ...base };
  for (const key of Object.keys(out) as (keyof Axes)[]) out[key] = Math.round(out[key] + (r() - 0.5) * 24);
  // One real strength, one real weakness: the due diligence finds them.
  const keys = Object.keys(out) as (keyof Axes)[];
  const strong = pick(r, keys);
  let weak = pick(r, keys);
  if (weak === strong) weak = keys[(keys.indexOf(strong) + 2) % keys.length]!;
  out[strong] = Math.min(90, out[strong] + 18);
  out[weak] = Math.max(15, out[weak] - 22);
  return out;
}

const AXIS_FACT: Record<keyof Axes, { label: string; good: string; bad: string }> = {
  management: { label: "Team", good: "Die Führung ist erfahren und ergänzt sich gut.", bad: "Die Führung ist unerfahren; Entscheidungen hängen an einer Person." },
  product: { label: "Produkt", good: "Kunden loben das Produkt, kaum Beschwerden.", bad: "Das Produkt ist unfertig, Kunden melden viele Fehler." },
  market: { label: "Markt", good: "Der Markt wächst und ist groß genug für mehr.", bad: "Der Markt ist kleiner als im Pitch behauptet." },
  edge: { label: "Wettbewerb", good: "Ein Vorsprung, den andere nicht schnell aufholen.", bad: "Andere können das schnell nachbauen." },
  finance: { label: "Zahlen", good: "Saubere Buchhaltung, jede Zahl ist belegt.", bad: "Die Buchhaltung ist chaotisch, der Plan zu optimistisch." },
};

/**
 * One new company. The stage follows what the player can afford; sectors,
 * people and numbers come from the seed, so a game replays identically.
 */
export function generateDeal(r: () => number, stage: DealStage, id: string, month: number, taken: Set<string>): StartupDefinition {
  const sec = pick(r, SECTORS);
  const s = STAGES[stage];
  const buyout = stage === "buyout";
  let idea = pick(r, buyout ? sec.mittelstand : sec.ideas);
  let name = idea.name.join("");
  for (let i = 0; i < 6 && taken.has(name); i++) {
    const other = pick(r, SECTORS);
    idea = pick(r, buyout ? other.mittelstand : other.ideas);
    name = buyout ? `${idea.name[0]}${pick(r, LAST)}` : `${idea.name[0]}${pick(r, ["werk", "wise", "kraft", "netz", "punkt", "haus"])}`;
  }
  if (taken.has(name)) name = `${name} ${pick(r, CITIES)}`;
  const city = pick(r, CITIES);

  const revenue = round(between(r, s.revenue), 100);
  const growth = Math.round(between(r, s.growth) * 1000) / 1000;
  const grossMargin = Math.round(between(r, sec.margin) * 100) / 100;
  const team = Math.round(between(r, s.team));
  let opex: number;
  let cash: number;
  if (buyout) {
    // Family businesses earn money: costs eat 75 to 92 % of the gross profit.
    opex = round(revenue * grossMargin * between(r, [0.75, 0.92]), 100);
    cash = round(opex * between(r, s.runway), 1000);
  } else {
    const burn = round(between(r, s.burn), 500);
    opex = round(revenue * grossMargin + burn, 100);
    cash = round(burn * between(r, s.runway), 1000);
  }
  const ax = axes(r, stage);
  const topCustomer = Math.round(between(r, [0.08, 0.5]) * 100) / 100;
  const debt = buyout && r() < 0.4 ? round(revenue * between(r, [1, 3]), 10_000) : 0;

  const used = new Set<string>();
  const founder = person(r, used);
  const cofounder = person(r, used);
  const investor = person(r, used);
  const indep = person(r, used);
  const angel = person(r, used);
  const fund = pick(r, FUNDS);
  const board: BoardMember[] = buyout
    ? [
        { seat: "ceo", name: founder.name, short: founder.short, title: "Inhaber & Geschäftsführer", personality: pick(r, ["practical", "loyal", "numbers"] as const), interests: ["control", pick(r, ["team", "customer"] as const)] },
        { seat: "cto", name: cofounder.name, short: cofounder.short, title: "Prokurist", personality: pick(r, PERSONALITIES), interests: interests(r) },
        { seat: "vc", name: investor.name, short: investor.short, title: "Hausbank", personality: "numbers", interests: ["cash", "control"] },
        { seat: "indep", name: indep.name, short: indep.short, title: "Steuerberater der Familie", personality: pick(r, PERSONALITIES), interests: interests(r) },
        { seat: "angel", name: angel.name, short: angel.short, title: "Betriebsrat", personality: "practical", interests: ["team", pick(r, ["customer", "product"] as const)] },
      ]
    : [
        { seat: "ceo", name: founder.name, short: founder.short, title: "Gründer:in & CEO", personality: pick(r, ["visionary", "doer", "visionary", "numbers"] as const), interests: ["growth", pick(r, ["control", "product", "customer"] as const)] },
        { seat: "cto", name: cofounder.name, short: cofounder.short, title: "Mitgründer:in", personality: pick(r, PERSONALITIES), interests: interests(r) },
        { seat: "vc", name: investor.name, short: investor.short, title: fund, personality: pick(r, ["doer", "numbers", "visionary"] as const), interests: ["growth", pick(r, ["cash", "control"] as const)] },
        { seat: "indep", name: indep.name, short: indep.short, title: "Unabhängiger Beirat", personality: pick(r, PERSONALITIES), interests: interests(r) },
        { seat: "angel", name: angel.name, short: angel.short, title: "Business Angel", personality: pick(r, PERSONALITIES), interests: interests(r) },
      ];

  const stake = Math.round(between(r, s.stake));
  const capTable: Holder[] = buyout
    ? [
        { id: "ceo", name: founder.name, kind: "founder", pct: 100 - stake - 8 },
        { id: "cto", name: cofounder.name, kind: "cofounder", pct: 8 },
      ]
    : (() => {
        const vcPct = stage === "preseed" ? Math.round(between(r, [8, 18])) : stage === "seed" ? Math.round(between(r, [18, 28])) : Math.round(between(r, [30, 42]));
        const esop = Math.round(between(r, [5, 10]));
        const angelPct = Math.round(between(r, [3, 8]));
        const founders = 100 - vcPct - esop - angelPct;
        const ceoPct = Math.round(founders * between(r, [0.55, 0.7]));
        return [
          { id: "ceo", name: founder.name, kind: "founder" as const, pct: ceoPct },
          { id: "cto", name: cofounder.name, kind: "cofounder" as const, pct: founders - ceoPct },
          { id: "vc", name: fund, kind: "vc" as const, pct: vcPct },
          { id: "angel", name: angel.name, kind: "angel" as const, pct: angelPct },
          { id: "esop", name: "Mitarbeiterpool", kind: "esop" as const, pct: esop },
        ];
      })();

  const burn = Math.max(0, opex - revenue * grossMargin);
  const runwayText = buyout ? "Die Firma verdient Geld." : `Die Firma verbraucht ${round(burn, 1000).toLocaleString("de-DE")} € im Monat, das Geld reicht etwa ${Math.round(cash / Math.max(1, burn))} Monate.`;
  const keys = Object.keys(ax) as (keyof Axes)[];
  const best = keys.reduce((a, b) => (ax[a] >= ax[b] ? a : b));
  const worst = keys.reduce((a, b) => (ax[a] <= ax[b] ? a : b));
  const diligence: StartupDefinition["diligence"] = [
    buyout
      ? { label: "Ertrag", text: `Seit Jahren stabil. ${debt > 0 ? `Bei der Hausbank stehen ${debt.toLocaleString("de-DE")} € Kredit offen.` : "Keine Bankschulden."}`, tone: debt > 0 ? "warn" : "good" }
      : { label: "Wachstum", text: `${(growth * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % im Monat. ${growth >= 0.05 ? "Die Nachfrage ist echt." : "Solide, aber kein Selbstläufer."}`, tone: growth >= 0.05 ? "good" : "warn" },
    { label: "Kosten", text: runwayText, tone: buyout ? "good" : cash / Math.max(1, burn) < 8 ? "bad" : "warn" },
    { label: AXIS_FACT[best].label, text: AXIS_FACT[best].good, tone: "good" },
    { label: AXIS_FACT[worst].label, text: AXIS_FACT[worst].bad, tone: "bad" },
  ];
  if (topCustomer > 0.35) diligence.push({ label: "Kunden", text: `${Math.round(topCustomer * 100)} % des Umsatzes kommen von einem einzigen Kunden.`, tone: "bad" });

  const mail = buyout
    ? {
        from: `${founder.name}, ${name}`,
        subject: `Nachfolge gesucht: ${idea.tagline}`,
        body: `Guten Tag, ich führe ${name} in ${city}. ${idea.pitch} Ich biete ${stake} % der Firma zum Kauf an und bleibe ein Jahr an Bord. Mit der Mehrheit bekommen Sie auch die Gewinne. Wenn Sie wollen, finanziert die Hausbank einen Teil des Kaufpreises.`,
      }
    : {
        from: `${founder.name}, ${name}`,
        subject: `${STAGE_LABEL[stage]}: ${idea.tagline}`,
        body: `Hallo, ich bin ${founder.short}, wir sitzen in ${city}. ${idea.pitch} ${revenue.toLocaleString("de-DE")} € Umsatz im Monat, ${(growth * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % Wachstum. Für unsere ${STAGE_LABEL[stage]}-Runde suchen wir einen Investor mit Erfahrung: ${stake} % Anteil und ein Sitz im Beirat.`,
      };

  return {
    id,
    name,
    tagline: idea.tagline,
    sector: sec.sector,
    mail,
    diligence,
    stake,
    capTable,
    arrives: month,
    board,
    metrics: { cash, revenue, growth, grossMargin, opex, team, morale: Math.round(between(r, [55, 75])), trust: Math.round(between(r, [48, 64])), axes: ax, topCustomer, debt },
    names: { city, competitor: pick(r, sec.competitors), partner: pick(r, sec.partners), acquirer: pick(r, sec.acquirers), customer: pick(r, sec.customers) },
    stage,
  };
}
