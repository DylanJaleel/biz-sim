import { mnaRandom } from "./lbo";
import { between, eur, mio, roundTo, type Ctx } from "./mna-core";
import type { Duel, GameState, RivalState, Startup } from "./types";

// Rivalen: drei Häuser, die mit dir um dieselben Firmen bieten. Sie kommen ab
// Ruf 50 ins Spiel, werden je Spiel aus einem Pool gezogen und stehen mit den
// gleichen Namen in der Rangliste der M&A-Berater. Ein eigenes Verhalten haben
// sie nicht: Ihre Gebote folgen festen Regeln, ihre Ranglistenwerte sind
// aus dem Seed fortgeschrieben.

export type RivalKind = "pe" | "konzern" | "family" | "boutique";

export interface RivalDef {
  id: string;
  name: string;
  /** The person you deal with. */
  head: string;
  city: string;
  kind: RivalKind;
  /** One line: how they bid. */
  style: string;
  strengths: string[];
  /** Opening bid above the asked price. */
  opening: number;
  /** Most they pay above the asked price (drawn in this range per deal). */
  premium: [number, number];
  /** How the owner rates their terms besides the price (site, staff, continuity), as a share of the price. */
  terms: number;
  /** What the owner hears about their terms. */
  termsText: string;
  /** League table: volume (Mio. €) and deals per year at the start, yearly growth. */
  league: { volume: number; count: number; growth: number };
}

export const RIVAL_POOL: RivalDef[] = [
  {
    id: "aurum",
    name: "Aurum Capital",
    head: "Marcus Hallgarten",
    city: "Düsseldorf",
    kind: "pe",
    style: "Aggressiv: bietet früh über Wert, finanziert mit viel Kredit, lässt den Standort offen.",
    strengths: ["Preis", "Tempo"],
    opening: 0.06,
    premium: [0.08, 0.16],
    terms: -0.04,
    termsText: "Standort offen, Exit nach vier Jahren",
    league: { volume: 450, count: 9, growth: 0.06 },
  },
  {
    id: "hartmann",
    name: "Hartmann Industriegruppe",
    head: "Dr. Jürgen Aschoff",
    city: "Essen",
    kind: "konzern",
    style: "Strategisch: zahlt einen Aufschlag für Synergien, entscheidet langsam und gründlich.",
    strengths: ["Synergien", "Ausdauer"],
    opening: 0.03,
    premium: [0.1, 0.2],
    terms: 0,
    termsText: "Eingliederung in den Konzern",
    league: { volume: 300, count: 6, growth: 0.04 },
  },
  {
    id: "brandt",
    name: "Brandt Lenz Partner",
    head: "Kati Brandt",
    city: "München",
    kind: "boutique",
    style: "Netzwerkerin: bietet knapp, punktet mit Fortbestand und einem Platz im Beirat.",
    strengths: ["Netzwerk", "Fortbestand"],
    opening: 0.02,
    premium: [0.03, 0.08],
    terms: 0.06,
    termsText: "Altinhaber bleibt im Beirat, Name bleibt",
    league: { volume: 140, count: 15, growth: 0.05 },
  },
  {
    id: "rothenbaum",
    name: "Rothenbaum & Cie",
    head: "Henrik Rothenbaum",
    city: "Hamburg",
    kind: "family",
    style: "Familienholding: denkt in Generationen, sichert Arbeitsplätze, zahlt selten mehr als fair.",
    strengths: ["Fortbestand", "Geduld"],
    opening: 0.01,
    premium: [0.03, 0.1],
    terms: 0.08,
    termsText: "Arbeitsplätze und Standort gesichert",
    league: { volume: 220, count: 10, growth: 0.03 },
  },
  {
    id: "weissenfels",
    name: "Weißenfels Corporate Finance",
    head: "Clara Weißenfels",
    city: "Frankfurt",
    kind: "boutique",
    style: "Zahlenmensch: bietet genau den fairen Wert und steigt früh aus, wenn es teurer wird.",
    strengths: ["Disziplin", "Due Diligence"],
    opening: 0.03,
    premium: [0.02, 0.06],
    terms: 0.02,
    termsText: "sauberer Vertrag, schnelle Zahlung",
    league: { volume: 330, count: 18, growth: 0.04 },
  },
  {
    id: "nordlicht",
    name: "Nordlicht Equity",
    head: "Sven Ahlgrim",
    city: "Hamburg",
    kind: "pe",
    style: "Buy-and-Build-Fonds: zahlt für die Passung zu seiner Plattform, verlangt Garantien.",
    strengths: ["Plattform", "Kapital"],
    opening: 0.04,
    premium: [0.06, 0.14],
    terms: -0.02,
    termsText: "harte Garantien, Integration in eine Plattform",
    league: { volume: 240, count: 11, growth: 0.07 },
  },
  {
    id: "kessler",
    name: "Kessler Weiß & Co.",
    head: "Dr. Annette Kessler",
    city: "München",
    kind: "boutique",
    style: "Alte Schule: Handschlag und Verschwiegenheit, aber kein Bietgefecht weit über Wert.",
    strengths: ["Vertrauen", "Diskretion"],
    opening: 0.02,
    premium: [0.02, 0.07],
    terms: 0.04,
    termsText: "diskret, ohne Aufsehen in der Belegschaft",
    league: { volume: 160, count: 12, growth: 0.03 },
  },
  {
    id: "stahlberg",
    name: "Stahlberg Industrie Holding",
    head: "Bernd Stahlberg",
    city: "Siegen",
    kind: "konzern",
    style: "Mittelstands-Konzern: kauft Wettbewerber, zahlt bar und schnell, baut aber Doppelfunktionen ab.",
    strengths: ["Bargeld", "Tempo"],
    opening: 0.05,
    premium: [0.06, 0.15],
    terms: -0.01,
    termsText: "Doppelfunktionen werden abgebaut",
    league: { volume: 200, count: 7, growth: 0.05 },
  },
];

export const RIVAL_KIND_LABEL: Record<RivalKind, string> = {
  pe: "Private-Equity-Fonds",
  konzern: "Konzern",
  family: "Familienholding",
  boutique: "Beratungshaus mit Beteiligungen",
};

/** From this reputation the rivals take notice of you. */
export const RIVAL_REPUTATION = 50;
export const RIVAL_COUNT = 3;
/** Chance that a rival bids for a new family business on the open market. */
export const DUEL_CHANCE = 0.35;
/** Your moves before the owner decides. */
export const DUEL_ROUNDS = 3;
export const DUEL_DAYS = { raise: 1, concept: 2, leave: 0 } as const;
/** A raise adds this share of the asked price. */
export const DUEL_RAISE = { small: 0.04, big: 0.08 } as const;
/** The rival beats your rating by this much when he counters. */
const COUNTER_MARGIN = 0.02;
/** A succession concept (site, staff, the owner as adviser): worth this share of the price to the owner. */
export const CONCEPT_VALUE: [number, number] = [0.07, 0.13];
/** It costs you this share of the price at closing (bonus for the staff, site guarantee) and wins trust. */
export const CONCEPT_COST = 0.02;
export const CONCEPT_TRUST = 8;

/** The three rivals of this game: drawn by seed, always the same within a game. */
export function rivalsOf(state: GameState): RivalDef[] {
  const r = mnaRandom(state, "rivals|draw");
  const pool = [...RIVAL_POOL];
  const out: RivalDef[] = [];
  while (out.length < RIVAL_COUNT && pool.length > 0) out.push(pool.splice(Math.floor(r() * pool.length) % pool.length, 1)[0]!);
  return out;
}

export function rivalDef(id: string): RivalDef | undefined {
  return RIVAL_POOL.find((x) => x.id === id);
}

/** The rivals are in the game (from reputation 50 on; they stay once there). */
export function rivalsIn(state: GameState): boolean {
  return state.rivals !== undefined;
}

function rivalState(state: GameState): RivalState {
  if (!state.rivals) state.rivals = { since: state.month, duels: {} };
  return state.rivals;
}

/** How the owner rates an offer: the price plus what the terms are worth to him. */
export function duelScore(bid: number, terms: number): number {
  return bid * (1 + terms);
}

export function duelScores(d: Duel): { you: number; rival: number } {
  const def = rivalDef(d.rivalId);
  return { you: duelScore(d.you, d.concept ? d.conceptValue : 0), rival: duelScore(d.rival, def?.terms ?? 0) };
}

/** Month start: the rivals show up once you are known, and bid for some new offers. */
export function planRivalHouses(ctx: Ctx): void {
  const state = ctx.state;
  if (!state.rivals && state.reputation >= RIVAL_REPUTATION) {
    rivalState(state);
    const rivals = rivalsOf(state);
    ctx.lesson("league_table");
    ctx.mail({
      kind: "news",
      from: "Wirtschaftsblatt",
      subject: "Neue Konkurrenz für einen bekannten Namen",
      body: `Wer im Mittelstand kauft und berät, kennt jetzt auch dich. Drei Häuser beobachten dich genau: ${rivals.map((x) => `${x.name} (${x.city}, ${x.head})`).join(", ")}. Sie bieten auf dieselben Firmen wie du und stehen mit dir in der Rangliste der M&A-Berater.`,
    });
  }
  if (!state.rivals) return;
  const rivals = rivalsOf(state);
  for (const s of state.startups.filter((x) => x.status === "offered" && x.offer?.ev && x.offer.source === "market" && !x.offer.duel)) {
    const offer = s.offer!;
    // Only new offers; a contact who already bids (network) keeps the rival houses out.
    if (offer.expires !== state.month + 1 || (offer.rival && !offer.rival.defused)) continue;
    const r = mnaRandom(state, `duel|${s.id}`);
    if (r() > DUEL_CHANCE) continue;
    const def = rivals[Math.floor(r() * rivals.length) % rivals.length]!;
    const ask = offer.ev!;
    const rival = roundTo(ask * (1 + def.opening), 10_000);
    const max = Math.max(rival, roundTo(ask * (1 + between(r, def.premium[0], def.premium[1])), 10_000));
    offer.duel = {
      rivalId: def.id,
      you: ask,
      rival,
      max,
      conceptValue: Math.round(between(r, CONCEPT_VALUE[0], CONCEPT_VALUE[1]) * 1000) / 1000,
      round: 0,
      status: "open",
      due: state.month,
      log: [`${def.name} bietet ${mio(rival)} (${def.termsText}). Dein Angebot steht beim geforderten Preis von ${mio(ask)}.`],
    };
    ctx.lesson("bietgefecht");
    ctx.mail({
      kind: "deal",
      from: s.board.find((b) => b.seat === "ceo")?.name ?? s.name,
      subject: `${s.name}: Bietgefecht mit ${def.name}`,
      body: `${def.head} von ${def.name} hat mir ${mio(rival)} geboten. Ich entscheide bis Ende des Monats. Sie können erhöhen, mir ein Nachfolge-Konzept vorlegen oder aussteigen. Mir geht es nicht nur ums Geld.`,
      startupId: s.id,
    });
  }
}

export type DuelMove = "raise" | "concept" | "leave";

/** One round of the bidding war: your move, then the rival answers. */
export function playDuel(ctx: Ctx, targetId: string, move: DuelMove, size: "small" | "big" = "small"): void {
  const state = ctx.state;
  const s = state.startups.find((x) => x.id === targetId);
  const d = s?.offer?.duel;
  if (!s || s.status !== "offered" || !d || d.status !== "open") ctx.fail("Hier läuft kein Bietgefecht.");
  const duel = d!;
  const def = rivalDef(duel.rivalId)!;
  const ask = s!.offer!.ev!;
  if (move === "leave") {
    ctx.spend("acquire", `Bietgefecht ${s!.name}: Rückzug`, DUEL_DAYS.leave);
    duel.log.push("Du ziehst dein Gebot zurück.");
    lose(ctx, s!, duel, "left");
    return;
  }
  if (duel.round >= DUEL_ROUNDS) ctx.fail("Alle Runden sind gespielt. Der Inhaber entscheidet.");
  if (move === "concept") {
    if (duel.concept) ctx.fail("Dein Nachfolge-Konzept liegt schon vor.");
    ctx.spend("acquire", `Bietgefecht ${s!.name}: Nachfolge-Konzept`, DUEL_DAYS.concept);
    duel.concept = true;
    duel.log.push(
      `Du legst ein Nachfolge-Konzept vor: Standort fünf Jahre sichern, ein Bonus für die Belegschaft, der Inhaber bleibt Berater. Ihm ist das etwa ${mio(ask * duel.conceptValue)} wert.`,
    );
  } else {
    ctx.spend("acquire", `Bietgefecht ${s!.name}: Gebot erhöhen`, DUEL_DAYS.raise);
    duel.you = roundTo(duel.you + ask * DUEL_RAISE[size], 10_000);
    duel.log.push(`Du erhöhst auf ${mio(duel.you)}.`);
  }
  duel.round += 1;
  const score = duelScores(duel);
  if (score.you > score.rival) {
    const counter = roundTo((score.you / (1 + def.terms)) * (1 + COUNTER_MARGIN), 10_000);
    if (duel.round < DUEL_ROUNDS && counter <= duel.max) {
      duel.rival = counter;
      duel.log.push(`${def.name} kontert mit ${mio(counter)}.`);
      return;
    }
    duel.log.push(duel.round < DUEL_ROUNDS ? `${def.name} geht nicht weiter mit und steigt aus.` : `Letzte Runde: ${def.name} kann nicht mehr nachlegen.`);
    win(ctx, s!, duel);
    return;
  }
  duel.log.push(`Der Inhaber sieht ${def.name} weiter vorn.`);
  if (duel.round >= DUEL_ROUNDS) lose(ctx, s!, duel, "lost");
}

function record(state: GameState, id: string): { won: number; lost: number } {
  const rs = rivalState(state);
  rs.duels[id] = rs.duels[id] ?? { won: 0, lost: 0 };
  return rs.duels[id]!;
}

function win(ctx: Ctx, s: Startup, d: Duel): void {
  const def = rivalDef(d.rivalId)!;
  const offer = s.offer!;
  d.status = "won";
  const ebitda = offer.multiple ? offer.ev! / offer.multiple : 0;
  offer.ev = d.you;
  if (ebitda > 0) offer.multiple = Math.round((d.you / ebitda) * 10) / 10;
  offer.ticket = roundTo((d.you * offer.stake) / 100, 1000);
  record(ctx.state, d.rivalId).won += 1;
  ctx.mail({
    kind: "deal",
    from: s.board.find((b) => b.seat === "ceo")?.name ?? s.name,
    subject: `${s.name}: Zuschlag für Sie`,
    body: `Ich habe mich gegen ${def.name} entschieden. Ihr Preis: ${mio(d.you)}.${d.concept ? " Ihr Nachfolge-Konzept hat den Ausschlag gegeben." : ""} Jetzt fehlen nur noch Prüfung und Finanzierung.`,
    startupId: s.id,
  });
}

function lose(ctx: Ctx, s: Startup, d: Duel, status: "lost" | "left"): void {
  const def = rivalDef(d.rivalId)!;
  d.status = status;
  s.status = "declined";
  record(ctx.state, d.rivalId).lost += 1;
  if (status === "lost")
    ctx.mail({
      kind: "deal",
      from: s.board.find((b) => b.seat === "ceo")?.name ?? s.name,
      subject: `${s.name}: Zuschlag an ${def.name}`,
      body: `${def.name} bekommt den Zuschlag für ${mio(d.rival)}. Danke für Ihr Interesse.`,
      startupId: s.id,
    });
}

/** Month end: the owner decides the bidding wars that are still open. */
export function duelsMonth(ctx: Ctx, month: number, notes: string[]): void {
  for (const s of ctx.state.startups.filter((x) => x.status === "offered" && x.offer?.duel?.status === "open" && x.offer.duel.due <= month)) {
    const d = s.offer!.duel!;
    const def = rivalDef(d.rivalId)!;
    const score = duelScores(d);
    if (score.you > score.rival) {
      d.log.push("Fristende: Der Inhaber entscheidet sich für dich.");
      win(ctx, s, d);
      notes.push(`${s.name}: Zuschlag im Bietgefecht gegen ${def.name}.`);
    } else {
      d.log.push(`Fristende: Der Inhaber nimmt das Angebot von ${def.name}.`);
      lose(ctx, s, d, "lost");
      notes.push(`${s.name}: ${def.name} hat das Bietgefecht gewonnen.`);
    }
  }
}

/** Before a purchase: an open or lost bidding war blocks it; after a won one the last bid is the price. */
export function duelBlocker(state: GameState, targetId: string, bid: "ask" | "low"): string | null {
  const d = state.startups.find((x) => x.id === targetId)?.offer?.duel;
  if (!d) return null;
  if (d.status === "open") return "Erst das Bietgefecht entscheiden: erhöhen, Konzept vorlegen oder aussteigen.";
  if (d.status !== "won") return "Diese Firma ging an einen Rivalen.";
  if (bid === "low") return "Nach dem Bietgefecht gilt dein letztes Gebot. Weniger zu bieten, wäre Wortbruch.";
  return null;
}

/** After the purchase: a promised succession concept costs money and wins the staff over. */
export function afterDuelPurchase(ctx: Ctx, targetId: string): void {
  const state = ctx.state;
  const s = state.startups.find((x) => x.id === targetId && x.status === "active");
  const d = s?.offer?.duel;
  if (!s || !d || d.status !== "won" || !d.concept || s.flags.includes("nachfolge_konzept")) return;
  const cost = roundTo(d.you * CONCEPT_COST, 1000);
  state.cash -= cost;
  ctx.replace({ ...s, flags: [...s.flags, "nachfolge_konzept"], metrics: { ...s.metrics, trust: Math.min(100, s.metrics.trust + CONCEPT_TRUST) } });
  ctx.mail({
    kind: "founder",
    from: s.board.find((b) => b.seat === "ceo")?.name ?? s.name,
    subject: `${s.name}: Das Nachfolge-Konzept gilt`,
    body: `Wie versprochen: Der Standort bleibt, die Belegschaft bekommt einen Bonus von zusammen ${eur(cost)}. Die Leute sind erleichtert, das Vertrauen ist da.`,
    startupId: s.id,
  });
}

/** Your record against each rival, for pages and bots. */
export function duelRecord(state: GameState): Record<string, { won: number; lost: number }> {
  return state.rivals?.duels ?? {};
}
