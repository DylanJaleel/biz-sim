import type { Round, RoundPrep, RoundTermSheet } from "./types";
import { AMBITION, INTRO_BONUS, NEGOTIATE_CHANCE, NEGOTIATE_PRICE_STEP, PITCH_BONUS, PITCH_MAX, PREF_TRADE, SEAT_TRADE } from "./venture-config";

// Rechenregeln einer vorbereiteten Finanzierungsrunde: Zuschlag auf die Chance
// durch Vorbereitung, Bedingungen des Term Sheets und die Verhandlung darüber.
// Reine Funktionen ohne Spielstand, damit Engine, Ansicht und eine spätere
// Verhandlungsszene dieselben Zahlen nutzen.

export type TermLever = RoundTermSheet["asked"][number];

export interface PrepBonus {
  ambition: number;
  pitches: number;
  intro: number;
  total: number;
}

/** What the preparation adds to the chance of the round (can be negative with a bold price). */
export function prepBonus(prep: Pick<RoundPrep, "ambition" | "pitched" | "intro">): PrepBonus {
  const ambition = AMBITION[prep.ambition].chance;
  const pitches = Math.min(PITCH_MAX, prep.pitched.length) * PITCH_BONUS;
  const intro = prep.intro ? INTRO_BONUS : 0;
  return { ambition, pitches, intro, total: ambition + pitches + intro };
}

/**
 * The term sheet a lead offers: a bold price comes with a higher preference,
 * leads of Serie A to C want a board seat, every pitched investor who liked
 * the numbers sends a competing term sheet.
 */
export function initialTerms(stage: number, prep: Pick<RoundPrep, "ambition" | "pitched"> | undefined, fulfilment: number, random: () => number): RoundTermSheet {
  let rivals = 0;
  for (let i = 0; i < (prep?.pitched.length ?? 0); i++) if (random() < 0.25 + 0.5 * fulfilment) rivals++;
  return { pref: AMBITION[prep?.ambition ?? "market"].pref, seat: stage >= 1 && stage <= 3, rivals, asked: [] };
}

/** Whether a lever can still be pulled on these terms. */
export function leverOpen(terms: RoundTermSheet, lever: TermLever): boolean {
  if (terms.asked.includes(lever)) return false;
  if (lever === "pref") return terms.pref > 1;
  if (lever === "seat") return terms.seat;
  return true;
}

export function negotiateChance(terms: RoundTermSheet, lever: TermLever): number {
  return Math.min(NEGOTIATE_CHANCE.max, NEGOTIATE_CHANCE[lever] + NEGOTIATE_CHANCE.rival * terms.rivals);
}

export interface NegotiationResult {
  ok: boolean;
  preMoney: number;
  terms: RoundTermSheet;
  text: string;
}

const mio = (n: number) => `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €`;

/**
 * One lever of the negotiation. Price: ten percent more valuation, or the lead
 * insists on a 1,5× preference. Preference: back to 1× for a little price.
 * Board seat: the lead does without it for a little price.
 */
export function negotiateTerms(round: Pick<Round, "preMoney" | "lead">, terms: RoundTermSheet, lever: TermLever, random: () => number): NegotiationResult {
  const ok = random() < negotiateChance(terms, lever);
  const asked = [...terms.asked, lever];
  const round100k = (v: number) => Math.round(v / 100_000) * 100_000;
  const backing = terms.rivals > 0 ? ` Mit ${terms.rivals === 1 ? "einem zweiten Term Sheet" : `${terms.rivals} weiteren Term Sheets`} im Rücken.` : "";
  if (lever === "price") {
    if (ok) {
      const preMoney = round100k(round.preMoney * (1 + NEGOTIATE_PRICE_STEP));
      return { ok, preMoney, terms: { ...terms, asked }, text: `${round.lead} geht auf ${mio(preMoney)} vor dem Geld hoch.${backing} Weniger Verwässerung für alle.` };
    }
    if (terms.pref <= 1)
      return {
        ok,
        preMoney: round.preMoney,
        terms: { ...terms, asked, pref: 1.5 },
        text: `${round.lead} bleibt beim Preis und verlangt jetzt eine Liquidationspräferenz von 1,5×: Bei einem Verkauf bekommt der Fonds zuerst das Anderthalbfache seines Geldes.`,
      };
    return { ok, preMoney: round.preMoney, terms: { ...terms, asked }, text: `${round.lead} bleibt beim Preis. Mehr gibt der Markt gerade nicht her.` };
  }
  if (lever === "pref") {
    if (ok) {
      const preMoney = round100k(round.preMoney * (1 - PREF_TRADE));
      return { ok, preMoney, terms: { ...terms, asked, pref: 1 }, text: `Saubere Bedingungen: 1× Präferenz, dafür ${mio(preMoney)} vor dem Geld.${backing}` };
    }
    return {
      ok,
      preMoney: round.preMoney,
      terms: { ...terms, asked },
      text: `${round.lead} besteht auf der Präferenz von ${terms.pref.toLocaleString("de-DE")}×. Das ist der Preis für die hohe Bewertung.`,
    };
  }
  if (ok) {
    const preMoney = round100k(round.preMoney * (1 - SEAT_TRADE));
    return {
      ok,
      preMoney,
      terms: { ...terms, asked, seat: false },
      text: `${round.lead} verzichtet auf den Beiratssitz und schickt nur einen Beobachter. Bewertung ${mio(preMoney)} vor dem Geld.`,
    };
  }
  return { ok, preMoney: round.preMoney, terms: { ...terms, asked }, text: `${round.lead} will den Sitz im Beirat. Bei diesem Betrag ist das nicht verhandelbar.` };
}
