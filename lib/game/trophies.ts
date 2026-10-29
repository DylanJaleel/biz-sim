import { platformBuilt } from "./career";
import { mnaRead } from "./mna-core";
import { CITIES, gigStats } from "./travel";
import type { GameState } from "./types";

// Die Vitrine: Für jeden großen Schritt kommt ein Tombstone ins Regal, so wie
// Banken nach einem Abschluss einen Acrylblock verschenken. Einmal verdient,
// bleibt er stehen, auch wenn das Vermögen später wieder fällt.

export type TrophyShelf = "worth" | "deals" | "career" | "mna" | "board";
/** Where the engraving sits on a blank piece. */
export type TrophyPlate = "block" | "kristall" | "gold";

export interface TrophyDef {
  id: string;
  shelf: TrophyShelf;
  /** Picture in /public/boardroom. */
  image: string;
  /** Blank piece: the face is engraved on this kind of plate. Missing: the picture already carries it. */
  plate?: TrophyPlate;
  /** Text engraved on the piece. */
  face: string;
  title: string;
  /** How to earn it, shown while it is missing. */
  requirement: string;
  story: string;
  earned: (state: GameState, worth: number) => boolean;
  /** A detail engraved at the moment it is earned. */
  detail?: (state: GameState) => string | undefined;
}

export const SHELF_ORDER: TrophyShelf[] = ["worth", "deals", "career", "mna", "board"];
export const SHELF_LABEL: Record<TrophyShelf, string> = {
  worth: "Vermögen",
  deals: "Deals und Verkäufe",
  career: "Karriere",
  mna: "M&A und Private Equity",
  board: "Beirat und unterwegs",
};

const worthStep = (id: string, amount: number, image: string, plate: TrophyPlate | undefined, face: string, title: string, story: string): TrophyDef => ({
  id,
  shelf: "worth",
  image,
  plate,
  face,
  title,
  requirement: `Vermögen über ${(amount / 1_000_000).toLocaleString("de-DE")} Mio. €`,
  story,
  earned: (_s, worth) => worth >= amount,
});

const accepted = (s: GameState) => s.exits.filter((x) => x.status === "accepted");
const record = (s: GameState) => mnaRead(s).record;
const mio = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/** Board decisions of the player's own that were judged strong. */
const strongDecisions = (s: GameState) => s.items.filter((i) => i.decision && !i.decision.lapsed && !i.decision.delegated && i.decision.judgment === "strong").length;
/** Decisions "yes, but" where the chosen condition was the one that fitted the risk. */
const fittingConditions = (s: GameState) =>
  s.items.filter(
    (i) =>
      i.decision &&
      !i.decision.delegated &&
      i.decision.outcome === "conditions" &&
      i.decision.applied &&
      i.decision.applied !== "standard" &&
      i.decision.applied === i.decision.fit,
  ).length;

export const TROPHIES: TrophyDef[] = [
  worthStep(
    "worth-1m",
    1_000_000,
    "tombstone-block",
    undefined,
    "1 Mio €",
    "Die erste Million",
    "Konto, Depot und Beteiligungen sind zusammen zum ersten Mal mehr als eine Million wert.",
  ),
  worthStep(
    "worth-5m",
    5_000_000,
    "tombstone-gold-blank",
    "gold",
    "Portfolio\n5 Mio €",
    "Fünf Millionen",
    "Ab hier zählst du zu den großen Business Angels. Gründer kennen deinen Namen, bevor du ihn sagst.",
  ),
  worthStep("worth-10m", 10_000_000, "tombstone-gold-blank", "gold", "Portfolio\n10 Mio €", "Zehn Millionen", "Zweistellig. Banken laden dich jetzt zu ihren Abendessen ein."),
  worthStep("worth-25m", 25_000_000, "tombstone-gold-blank", "gold", "Portfolio\n25 Mio €", "25 Millionen", "Ein Vermögen, das von selbst weiterarbeitet."),
  worthStep("worth-50m", 50_000_000, "tombstone-gold-blank", "gold", "Portfolio\n50 Mio €", "50 Millionen", "Die oberste Liga. Was jetzt kommt, ist Vermächtnis."),
  worthStep(
    "worth-100m",
    100_000_000,
    "tombstone-gold-blank",
    "gold",
    "Portfolio\n100 Mio €",
    "Hundert Millionen",
    "Im Private Banking gilt man ab 30 Millionen Dollar als „Ultra High Net Worth“. Du bist weit darüber, und die Banken schicken nicht mehr Berater, sondern Vorstände.",
  ),
  worthStep(
    "worth-250m",
    250_000_000,
    "tombstone-gold-blank",
    "gold",
    "Portfolio\n250 Mio €",
    "Eine Viertelmilliarde",
    "Vermögen dieser Größe verwaltet man über Generationen. Das oberste Ziel heißt dann nicht mehr Rendite, sondern Erhalt.",
  ),
  {
    id: "first-deal",
    shelf: "deals",
    image: "tombstone-block-blank",
    plate: "block",
    face: "Erste\nBeteiligung",
    title: "Erste Beteiligung",
    requirement: "Bei einem Startup einsteigen",
    story: "Der erste Scheck, der erste Platz am Tisch. Jede Sammlung fängt mit einem Stück an.",
    earned: (s) => s.startups.some((x) => x.joined > 0 && !x.corporate),
  },
  {
    id: "first-exit",
    shelf: "deals",
    image: "tombstone-kristall-blank",
    plate: "kristall",
    face: "",
    title: "Erster Verkauf",
    requirement: "Eine Firma aus dem Portfolio verkaufen",
    story: "Ein Käufer hat die ganze Firma übernommen, und das Geld ist durch den Wasserfall bis zu dir geflossen.",
    earned: (s) => accepted(s).some((x) => !x.ipo),
    detail: (s) => {
      const x = accepted(s).find((e) => !e.ipo);
      return x ? `${(x.price / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio €` : undefined;
    },
  },
  {
    id: "exit-10x",
    shelf: "deals",
    image: "tombstone-kristall-blank",
    plate: "kristall",
    face: "10x",
    title: "Zehnfacher Verkauf",
    requirement: "Bei einem Verkauf das Zehnfache deines Einsatzes bekommen",
    story: "Das Zehnfache zurück. Solche Treffer bezahlen in einem Portfolio alle anderen Fehlgriffe.",
    earned: (s) =>
      accepted(s).some((x) => {
        const startup = s.startups.find((t) => t.id === x.startupId);
        const mine = x.payouts?.find((p) => p.id === "you")?.amount ?? 0;
        const cost = startup?.playerCost ?? startup?.playerPref ?? 0;
        return cost > 0 && mine >= cost * 10;
      }),
  },
  {
    id: "ipo",
    shelf: "deals",
    image: "tombstone-turm",
    face: "IPO",
    title: "Börsengang",
    requirement: "Eine Firma aus dem Portfolio an die Börse bringen",
    story: "Die Glocke hat geläutet. Ab heute hat die Firma jeden Tag einen Preis.",
    earned: (s) => accepted(s).some((x) => x.ipo),
  },
  {
    id: "buyout",
    shelf: "deals",
    image: "tombstone-gebaeude",
    face: "Buyout",
    title: "Erster Buyout",
    requirement: "Die Mehrheit an einem Familienbetrieb kaufen",
    story: "Ein Betrieb mit Geschichte gehört jetzt mehrheitlich dir. Die Dividende trägt die Raten.",
    earned: (s) => s.startups.some((x) => x.joined > 0 && x.flags.includes("mittelstand") && x.stake > 50),
  },
  {
    id: "exits-3",
    shelf: "deals",
    image: "tombstone-kristall-blank",
    plate: "kristall",
    face: "3 Exits",
    title: "Dreimal verkauft",
    requirement: "Drei Firmen aus dem Portfolio verkaufen oder an die Börse bringen",
    story: "Ein Verkauf kann Glück sein, drei sind ein Muster. Genau das fragen Geldgeber später als Erstes: den Track Record.",
    earned: (s) => accepted(s).length >= 3,
  },
  {
    id: "exit-10m",
    shelf: "deals",
    image: "tombstone-kristall-blank",
    plate: "kristall",
    face: "10 Mio €",
    title: "Verkauf über zehn Millionen",
    requirement: "Eine Firma für mindestens 10 Mio. € verkaufen",
    story: "Ab dieser Größe melden sich neben Konzernen auch Finanzinvestoren. Mehrere Bieter an einem Tisch treiben den Preis.",
    earned: (s) => accepted(s).some((x) => x.price >= 10_000_000),
    detail: (s) => {
      const x = accepted(s).find((e) => e.price >= 10_000_000);
      return x ? `${mio(x.price / 1_000_000)} Mio €` : undefined;
    },
  },
  {
    id: "lead",
    shelf: "career",
    image: "tombstone-block-blank",
    plate: "block",
    face: "Lead",
    title: "Erste Runde angeführt",
    requirement: "Eine Finanzierungsrunde anführen",
    story: "Du hast die Bedingungen gesetzt, und die anderen sind gefolgt.",
    earned: (s) => s.ledRounds > 0,
  },
  {
    id: "syndicate",
    shelf: "career",
    image: "tombstone-block-blank",
    plate: "block",
    face: "Syndikat",
    title: "Syndikat angeführt",
    requirement: "Eine Runde mit dem Geld anderer Angels anführen",
    story: "Andere vertrauen dir ihr Geld an. Für ihren Gewinn bekommst du einen Anteil.",
    earned: (s) => s.startups.some((x) => x.capTable.some((h) => h.kind === "syndicate")),
  },
  {
    id: "corporate",
    shelf: "career",
    image: "tombstone-block-blank",
    plate: "block",
    face: "Aufsichts-\nrat",
    title: "Konzern-Aufsichtsrat",
    requirement: "Ein Mandat im Aufsichtsrat eines Konzerns annehmen",
    story: "Vier Sitzungen im Jahr, eine feste Vergütung und ein Namensschild aus Messing.",
    earned: (s) => s.corporateSeat === "joined",
  },
  {
    id: "family-office",
    shelf: "career",
    image: "tombstone-gold",
    face: "Family\nOffice",
    title: "Family Office gegründet",
    requirement: "Ein eigenes Family Office gründen",
    story: "Eigene Firma, eigenes Team. Ab jetzt arbeiten andere für dein Vermögen mit.",
    earned: (s) => s.familyOffice !== undefined,
  },
  {
    id: "fund",
    shelf: "career",
    image: "tombstone-gold-blank",
    plate: "gold",
    face: "Fonds I",
    title: "Eigener Fonds",
    requirement: "Einen eigenen Fonds auflegen",
    story: "Fremdes Geld, deine Entscheidungen. Der erste Fonds trägt deinen Namen.",
    earned: (s) => s.fund !== undefined,
  },
  {
    id: "fund-2",
    shelf: "career",
    image: "tombstone-gold-blank",
    plate: "gold",
    face: "Fonds II",
    title: "Fondsfamilie",
    requirement: "Einen zweiten Fonds mit Investoren schließen",
    story: "Pensionskassen und Family Offices haben dein Zeugnis gelesen: DPI und TVPI von Fonds I. Aus einem Fonds wird eine Familie.",
    earned: (s) => (s.funds?.later.length ?? 0) >= 1,
  },
  {
    id: "fund-3",
    shelf: "career",
    image: "tombstone-gold-blank",
    plate: "gold",
    face: "Fonds III",
    title: "Dritter Fonds",
    requirement: "Einen dritten Fonds schließen",
    story: "Wer dreimal Geld einsammelt, hat bewiesen, dass es kein Glück war.",
    earned: (s) => (s.funds?.later.length ?? 0) >= 2,
  },
  {
    id: "studio",
    shelf: "career",
    image: "tombstone-block-blank",
    plate: "block",
    face: "Venture\nStudio",
    title: "Erste eigene Gründung",
    requirement: "Eine Firma im eigenen Venture Studio gründen",
    story: "Keine Gründerin hat angeklopft: Du hast die Idee gewählt, den CEO geholt und das erste Geld gegeben.",
    earned: (s) => (s.studio?.founded ?? 0) >= 1,
  },
  {
    id: "unicorn",
    shelf: "deals",
    image: "tombstone-gold-blank",
    plate: "gold",
    face: "Unicorn\n1 Mrd €",
    title: "Unicorn",
    requirement: "Eine Beteiligung erreicht über Wachstumsrunden eine Bewertung von einer Milliarde Euro",
    story: "Ein seltener Glücksmoment: Aus einer Beiratsrunde ist eine der wertvollsten jungen Firmen des Landes geworden. Die Titelseite gehört dir, das Geld kommt mit dem Börsengang.",
    earned: (s) => s.startups.some((x) => x.venture?.unicorn !== undefined && (x.venture.unicornStake ?? 0) > 0),
    detail: (s) => s.startups.find((x) => x.venture?.unicorn !== undefined && (x.venture.unicornStake ?? 0) > 0)?.name,
  },
  {
    id: "platform-investor",
    shelf: "career",
    image: "tombstone-gold-blank",
    plate: "gold",
    face: "Plattform",
    title: "Plattform-Investor",
    requirement: "Eine Plattform mit mindestens zwei Zukäufen aufbauen und mit Gewinn verkaufen",
    story: "Du hast gekauft, zusammengefügt und verkauft. Die Private-Equity-Branche nennt das Buy-and-Build und lebt davon.",
    earned: (s) => platformBuilt(s),
  },
  {
    id: "mna-first",
    shelf: "mna",
    image: "tombstone-block-blank",
    plate: "block",
    face: "Erstes\nMandat",
    title: "Erstes M&A-Mandat",
    requirement: "Ein M&A-Mandat erfolgreich abschließen",
    story: "Beraten statt besitzen: Für den Abschluss bekommst du ein Erfolgshonorar, die Success Fee, einen kleinen Anteil am Kaufpreis.",
    earned: (s) => record(s).mandatesDone >= 1,
  },
  {
    id: "mna-10",
    shelf: "mna",
    image: "tombstone-kristall-blank",
    plate: "kristall",
    face: "10 Mandate",
    title: "Zehn Mandate",
    requirement: "Zehn M&A-Mandate erfolgreich abschließen",
    story: "Zehn Abschlüsse sind eine Referenzliste. In den Banken heißt sie „Credentials“, und ohne sie gewinnt man kein neues Mandat.",
    earned: (s) => record(s).mandatesDone >= 10,
  },
  {
    id: "mna-auction",
    shelf: "mna",
    image: "tombstone-block-blank",
    plate: "block",
    face: "Bieter-\nverfahren",
    title: "Zuschlag im Bieterverfahren",
    requirement: "Ein Verkaufsmandat im Bieterverfahren mindestens zum Wunschpreis der Familie abschließen",
    story: "Mehrere Käufer, die sich überbieten: Das Auktionsverfahren kostet Zeit und Diskretion, bringt aber meist den höchsten Preis.",
    earned: (s) => (record(s).auctionWins ?? 0) >= 1,
  },
  {
    id: "mna-search",
    shelf: "mna",
    image: "tombstone-gebaeude",
    face: "Search\nFund",
    title: "Nachfolge mit Suchfonds",
    requirement: "Eine Firma über einen Suchenden des Nachfolge-Programms kaufen",
    story: "Ein Search Fund bezahlt einen jungen Manager, der einen Betrieb sucht und danach selbst führt. Tausende Inhaber im Mittelstand haben keinen Nachfolger.",
    earned: (s) => s.startups.some((x) => x.lbo?.searchId !== undefined),
  },
  {
    id: "mna-handover",
    shelf: "mna",
    image: "tombstone-block-blank",
    plate: "block",
    face: "Übergabe\ngelungen",
    title: "Übergabe gelungen",
    requirement: "Das erste Jahr nach einem Firmenkauf überstehen, ohne dass das EBITDA unter 90 % des Kaufwerts fällt",
    story: "Im ersten Jahr entscheidet sich, ob Kunden, Mitarbeiter und Lieferanten dem neuen Eigentümer vertrauen.",
    earned: (s) => record(s).successions >= 1,
  },
  {
    id: "mna-platform",
    shelf: "mna",
    image: "tombstone-gold-blank",
    plate: "gold",
    face: "Erste\nPlattform",
    title: "Erste Plattform",
    requirement: "Eine gekaufte Firma zur Plattform für Zukäufe machen",
    story: "Kleine Wettbewerber kauft man billig, die große Gruppe wird teurer bewertet. Dieser Unterschied heißt Multiple Arbitrage.",
    earned: (s) => s.startups.some((x) => x.platform !== undefined),
  },
  {
    id: "mna-addons-5",
    shelf: "mna",
    image: "tombstone-kristall-blank",
    plate: "kristall",
    face: "5 Zukäufe",
    title: "Fünf Zukäufe",
    requirement: "Fünf Zukäufe für Plattformen abschließen",
    story: "Viele Plattformen scheitern nicht beim Kaufen, sondern beim Zusammenwachsen: Systeme, Preise, Menschen.",
    earned: (s) => record(s).addons >= 5,
  },
  {
    id: "mna-moic-3",
    shelf: "mna",
    image: "tombstone-gold-blank",
    plate: "gold",
    face: "3x\nMOIC",
    title: "Dreifaches Kapital",
    requirement: "Eine Plattform verkaufen und dabei mindestens das Dreifache des eingesetzten Eigenkapitals zurückbekommen",
    story: "MOIC heißt Multiple on Invested Capital: wie oft das eingesetzte Geld zurückkommt. Beteiligungsgesellschaften peilen bei einem Buyout oft das Zwei- bis Dreifache an.",
    earned: (s) => record(s).platformExits.some((e) => !e.forced && e.moic >= 3),
  },
  {
    id: "mna-covenant",
    shelf: "mna",
    image: "tombstone-block-blank",
    plate: "block",
    face: "Covenant\nüberstanden",
    title: "Covenant überstanden",
    requirement: "Einen Covenant-Bruch überstehen, ohne dass die Bank die Firma zwangsverkauft",
    story: "Ein Covenant ist eine Kennzahlgrenze im Kreditvertrag, etwa Schulden im Verhältnis zum EBITDA. Wer sie reißt, muss verhandeln. Du hast es geschafft.",
    earned: (s) => (record(s).covenantRecovered ?? 0) >= 1,
  },
  {
    id: "board-conditions-10",
    shelf: "board",
    image: "tombstone-block-blank",
    plate: "block",
    face: "10 Auflagen",
    title: "Auflagen mit Gespür",
    requirement: "Zehnmal im Beirat „Ja, aber“ sagen und dabei die Auflage wählen, die das Risiko trifft",
    story: "Gute Beiräte sagen nicht nur Ja oder Nein. Sie knüpfen Geld an Bedingungen, die zum Risiko passen: Meilensteine, Budgetdeckel, Vetorechte.",
    earned: (s) => fittingConditions(s) >= 10,
  },
  {
    id: "board-strong-25",
    shelf: "board",
    image: "tombstone-gold-blank",
    plate: "gold",
    face: "25 starke\nEntscheidungen",
    title: "Ruhige Hand",
    requirement: "25 eigene Beiratsentscheidungen treffen, die als stark bewertet werden",
    story: "Ein guter Beirat sieht Risiken, bevor sie in den Zahlen stehen. Gründer rufen dich an, weil deine Entscheidungen halten.",
    earned: (s) => strongDecisions(s) >= 25,
  },
  {
    id: "trips-10",
    shelf: "board",
    image: "tombstone-block-blank",
    plate: "block",
    face: "10 Aufträge",
    title: "Zehn Aufträge",
    requirement: "Zehn bezahlte Aufträge außerhalb des Portfolios erledigen",
    story: "Vorträge, Interim-Rollen, Gutachten: Das Honorar ist das eine, die Empfehlung danach oft mehr wert.",
    earned: (s) => gigStats(s).done >= 10,
  },
  {
    id: "trips-all-cities",
    shelf: "board",
    image: "tombstone-kristall-blank",
    plate: "kristall",
    face: "8 Städte",
    title: "Einmal quer durchs Land",
    requirement: `Aufträge in allen ${Object.keys(CITIES).length} Städten erledigen: ${Object.values(CITIES)
      .map((c) => c.name)
      .join(", ")}`,
    story: "Wer überall schon am Tisch gesessen hat, kennt die Menschen hinter den Firmen. Im Mittelstand zählt der persönliche Besuch.",
    earned: (s) => Object.keys(CITIES).every((c) => gigStats(s).cities.includes(c)),
  },
  {
    id: "own-jet",
    shelf: "board",
    image: "tombstone-gold-blank",
    plate: "gold",
    face: "Eigener\nJet",
    title: "Eigener Jet",
    requirement: "Einen eigenen Jet kaufen",
    story: "Zeit ist das knappste Gut. Ein Jet kauft sie zurück, und der Unterhalt kostet im Monat so viel wie ein Neuwagen.",
    earned: (s) => s.garage.includes("jet"),
  },
];

export function trophyOf(id: string): TrophyDef | undefined {
  return TROPHIES.find((t) => t.id === id);
}

/** Adds every newly earned trophy; returns their ids so the game can announce them. */
export function awardTrophies(state: GameState, worth: number): string[] {
  const have = new Set(state.trophies.map((t) => t.id));
  const fresh = TROPHIES.filter((t) => !have.has(t.id) && t.earned(state, worth)).map((t) => t.id);
  for (const id of fresh) {
    const detail = trophyOf(id)?.detail?.(state);
    state.trophies.push({ id, month: state.month, seen: false, ...(detail ? { detail } : {}) });
  }
  return fresh;
}
