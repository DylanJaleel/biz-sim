import type { GameState } from "./types";

// Die Vitrine: Für jeden großen Schritt kommt ein Tombstone ins Regal, so wie
// Banken nach einem Abschluss einen Acrylblock verschenken. Einmal verdient,
// bleibt er stehen, auch wenn das Vermögen später wieder fällt.

export type TrophyShelf = "worth" | "deals" | "career";
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

export const SHELF_LABEL: Record<TrophyShelf, string> = { worth: "Vermögen", deals: "Deals und Verkäufe", career: "Karriere" };

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
