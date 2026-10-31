import { SPECIALIST_WARMTH_MIN } from "./network-config";
import { between, mio, priceAfterFindings, roundTo, type Ctx } from "./mna-core";
import { mnaRandom } from "./lbo";
import { roundsFor } from "./negotiation";
import type { GameState, Startup, TakeoverState, TakeoverTerms } from "./types";

// Übernahme am Tisch: Du legst dem Inhaber ein Angebot hin (Preis, Verkäuferdarlehen,
// Earn-out, Zusagen), er antwortet mit einem Gegenangebot. Seine Stimmung folgt deinen
// Angeboten; gut gelaunt gibt er eine Runde mehr, verärgert steht er auf. Unter seiner
// Schmerzgrenze verkauft er nie. Jede Runde kostet einen Tag.

export const TAKEOVER = {
  /** Rounds before the owner's last word; good mood adds one (negotiation.ts). */
  rounds: 3,
  /** What waiting is worth to the owner: a seller loan or an earn-out counts less than cash. */
  vendorWeight: 0.25,
  earnoutWeight: 0.6,
  /** A site and jobs guarantee is worth this share of the asked price to the owner. */
  pledgeValue: 0.03,
  /** Opening counter of the owner: the asked price with a small seller loan. */
  openVendor: 0.1,
  openEarnout: 0,
  /** Shares of the asked price the lowest price lies in (seeded per company). */
  pain: [0.84, 0.93] as [number, number],
  /** The owner accepts at most this much seller loan and earn-out in his counter. */
  maxVendor: 0.1,
  maxEarnout: 0.05,
  startMood: 60,
  walkMood: 25,
  /** Width of the range a partial review reveals (± share of the limit). */
  range: 0.05,
  days: 1,
} as const;

/** The asked price after the problems the review found. */
export function askNow(s: Startup): number {
  return roundTo(priceAfterFindings(s.offer?.ev ?? 0, s.findings ?? []), 10_000);
}

/** The owner's lowest price for clean terms (cash, no guarantee): hidden until a review or a contact reveals it. */
export function painOf(state: GameState, s: Startup): number {
  const r = mnaRandom(state, `pain|${s.id}`);
  return roundTo(askNow(s) * between(r, TAKEOVER.pain[0], TAKEOVER.pain[1]), 10_000);
}

/** What an offer is worth to the owner. */
export function ownerValue(t: TakeoverTerms, ask: number): number {
  return t.price * (1 - TAKEOVER.vendorWeight * t.vendor - TAKEOVER.earnoutWeight * t.earnout) + (t.pledge ? TAKEOVER.pledgeValue * ask : 0);
}

export function openingCounter(s: Startup): TakeoverTerms {
  return { price: askNow(s), vendor: TAKEOVER.openVendor, earnout: TAKEOVER.openEarnout, pledge: false };
}

export function takeoverOf(s: Startup): TakeoverState {
  return s.takeover ?? { mood: TAKEOVER.startMood, rounds: [], status: "open" };
}

export function roundsOf(t: TakeoverState): number {
  return roundsFor(TAKEOVER.rounds, t.mood);
}

export function lastCounter(s: Startup): TakeoverTerms {
  const t = takeoverOf(s);
  return t.rounds.length > 0 ? (t.rounds[t.rounds.length - 1]!.counter ?? openingCounter(s)) : openingCounter(s);
}

/** What you know of the owner's limit: exact, a range or nothing. */
export function painKnown(state: GameState, s: Startup): { exact?: number; range?: [number, number]; by?: string } {
  const pain = painOf(state, s);
  if (s.diligence?.pain === "exact") return { exact: pain, by: "Due Diligence" };
  const boutique = state.contacts.find((c) => c.id === "boutique" && c.met && c.warmth >= SPECIALIST_WARMTH_MIN);
  if (s.diligence?.pain === "range" || boutique) {
    const w = TAKEOVER.range * pain;
    return { range: [roundTo(pain - w, 10_000), roundTo(pain + w, 10_000)], by: s.diligence?.pain === "range" ? "Due Diligence" : "M&A-Berater aus deinem Netzwerk" };
  }
  return {};
}

export interface OwnerAnswer {
  accept: boolean;
  walk: boolean;
  mood: number;
  counter?: TakeoverTerms;
  say: string;
}

const pctText = (n: number) => `${Math.round(n * 100)} %`;

/** The owner's answer to an offer: pure, the same rule for engine and tests. */
export function ownerAnswer(input: {
  ask: number;
  pain: number;
  mood: number;
  offer: TakeoverTerms;
  counter: TakeoverTerms;
  previous?: TakeoverTerms;
  last: boolean;
  pledged: boolean;
}): OwnerAnswer {
  const { ask, pain, offer, counter } = input;
  const v = ownerValue(offer, ask);
  const target = ownerValue(counter, ask);
  if (v >= target - 1) return { accept: true, walk: false, mood: Math.min(100, input.mood + 8), say: "„Das ist ein Wort. Schlagen wir ein.“" };
  let mood = input.mood;
  if (v < pain * 0.92) mood -= 18;
  else if (v < pain) mood -= 8;
  else {
    const before = input.previous ? ownerValue(input.previous, ask) : pain;
    mood += Math.max(-6, Math.min(12, 4 + (40 * (v - before)) / Math.max(1, ask)));
  }
  if (offer.pledge && !input.pledged) mood += 6;
  if (offer.earnout > TAKEOVER.maxEarnout) mood -= 4;
  mood = Math.round(Math.max(0, Math.min(100, mood)));
  if (mood < TAKEOVER.walkMood) return { accept: false, walk: true, mood, say: "„Das ist nicht ernst gemeint. Ich habe vierzig Jahre in diese Firma gesteckt. Wir sind fertig.“" };
  const give = (target - Math.max(v, pain)) * (0.3 + mood / 250);
  const floor = input.last ? Math.max(pain, target - 2 * give) : pain;
  const value = Math.max(floor, target - give);
  const vendor = Math.min(offer.vendor, TAKEOVER.maxVendor);
  const earnout = Math.min(offer.earnout, TAKEOVER.maxEarnout);
  const pledgeBonus = offer.pledge ? TAKEOVER.pledgeValue * ask : 0;
  const price = roundTo(Math.max(0, value - pledgeBonus) / (1 - TAKEOVER.vendorWeight * vendor - TAKEOVER.earnoutWeight * earnout), 10_000);
  const next: TakeoverTerms = { price: Math.max(price, roundTo(pain * 0.98, 10_000)), vendor, earnout, pledge: offer.pledge };
  const why =
    offer.earnout > TAKEOVER.maxEarnout
      ? `Mit ${pctText(offer.earnout)} Earn-out soll ich Jahre auf mein Geld warten? Nein.`
      : offer.vendor > TAKEOVER.maxVendor
        ? `Ein Verkäuferdarlehen über ${pctText(offer.vendor)} ist mir zu viel Risiko.`
        : v < pain
          ? "Das liegt weit unter dem, was die Firma wert ist."
          : "Wir kommen uns näher.";
  const say = `„${why} ${mio(next.price)}, Verkäuferdarlehen ${pctText(next.vendor)}, Earn-out ${next.earnout > 0 ? `höchstens ${pctText(next.earnout)}` : "keiner"}${next.pledge ? ", mit Standortgarantie" : ""}.${input.last ? " Das ist mein letztes Wort." : " Dann reden wir weiter."}“`;
  return { accept: false, walk: false, mood, counter: next, say };
}

function deal(ctx: Ctx, id: string): Startup {
  const s = ctx.state.startups.find((x) => x.id === id && x.status === "offered" && x.offer?.ev);
  if (!s) ctx.fail("Diese Firma steht nicht mehr zum Verkauf.");
  if (s!.offer!.duel && s!.offer!.duel.status === "open") ctx.fail("Erst das Bietgefecht entscheiden.");
  if (s!.offer!.duel?.status === "won") ctx.fail("Den Preis hat das Bietgefecht entschieden.");
  return s!;
}

/** Your move at the table: an offer, the owner's last counter accepted, or leaving. */
export function playTakeover(ctx: Ctx, id: string, move: "offer" | "accept" | "leave", terms?: Partial<TakeoverTerms>): void {
  const s = deal(ctx, id);
  const t = takeoverOf(s);
  if (t.status !== "open") ctx.fail(t.status === "agreed" ? "Ihr seid euch schon einig." : "Die Verhandlung ist beendet.");
  const owner = s.board.find((b) => b.seat === "ceo")?.name ?? s.name;
  if (move === "leave") {
    t.status = "left";
    s.takeover = t;
    s.status = "declined";
    ctx.mail({ kind: "deal", from: owner, subject: `${s.name}: Gespräche beendet`, body: "Schade, dass wir nicht zusammengekommen sind. Ich suche weiter.", startupId: s.id });
    return;
  }
  if (move === "accept") {
    if (t.rounds.length === 0 || !t.rounds[t.rounds.length - 1]!.counter) ctx.fail("Es liegt noch kein Gegenangebot vor.");
    ctx.spend("acquire", `Handschlag ${s.name}`, TAKEOVER.days);
    t.status = "agreed";
    t.agreed = { ...lastCounter(s) };
    t.mood = Math.min(100, t.mood + 6);
    s.takeover = t;
    ctx.lesson("verhandlung_uebernahme");
    return;
  }
  if (t.rounds.length >= roundsOf(t)) ctx.fail("Alle Runden sind gespielt. Nimm das letzte Gegenangebot an oder steh auf.");
  const ask = askNow(s);
  const offer: TakeoverTerms = {
    price: roundTo(Math.max(ask * 0.5, Math.min(ask * 1.2, Number(terms?.price) || ask)), 10_000),
    vendor: Math.max(0, Math.min(0.3, Number(terms?.vendor) || 0)),
    earnout: Math.max(0, Math.min(0.3, Number(terms?.earnout) || 0)),
    pledge: Boolean(terms?.pledge),
  };
  ctx.spend("acquire", `Verhandlung ${s.name}, Runde ${t.rounds.length + 1}`, TAKEOVER.days);
  const counter = lastCounter(s);
  const previous = t.rounds.length > 0 ? t.rounds[t.rounds.length - 1]!.offer : undefined;
  const answer = ownerAnswer({
    ask,
    pain: painOf(ctx.state, s),
    mood: t.mood,
    offer,
    counter,
    previous,
    last: t.rounds.length + 1 >= roundsFor(TAKEOVER.rounds, t.mood),
    pledged: t.rounds.some((r) => r.offer.pledge),
  });
  t.mood = answer.mood;
  t.rounds.push({ offer, counter: answer.counter, mood: answer.mood, say: answer.say });
  ctx.lesson("verhandlung_uebernahme");
  if (answer.accept) {
    t.status = "agreed";
    t.agreed = offer;
  } else if (answer.walk) {
    t.status = "walked";
    s.status = "declined";
    ctx.reputation(-1);
    ctx.mail({ kind: "deal", from: owner, subject: `${s.name}: Gespräche abgebrochen`, body: `${answer.say} Ich verkaufe an jemand anderen.`, startupId: s.id });
  }
  s.takeover = t;
}

/** The terms the purchase must use once the owner agreed; otherwise null. */
export function agreedTerms(s: Startup): TakeoverTerms | null {
  return s.takeover?.status === "agreed" && s.takeover.agreed ? s.takeover.agreed : null;
}

export interface TakeoverView {
  id: string;
  owner: string;
  ownerTitle: string;
  ask: number;
  askBefore: number;
  mood: number;
  played: number;
  rounds: number;
  bonus: boolean;
  status: TakeoverState["status"];
  counter: TakeoverTerms;
  lastOffer?: TakeoverTerms;
  say: string;
  sayNote?: string;
  agreed?: TakeoverTerms;
  pain: { exact?: number; range?: [number, number]; by?: string };
  history: { offer: TakeoverTerms; counter?: TakeoverTerms; say: string }[];
  blocked: string | null;
  maxVendor: number;
  maxEarnout: number;
  days: number;
}

export function takeoverView(state: GameState, s: Startup): TakeoverView | null {
  if (!s.offer?.ev) return null;
  const t = takeoverOf(s);
  const owner = s.board.find((b) => b.seat === "ceo");
  const last = t.rounds[t.rounds.length - 1];
  const duel = s.offer.duel;
  const rounds = roundsOf(t);
  return {
    id: s.id,
    owner: owner?.name ?? "Der Inhaber",
    ownerTitle: owner?.title ?? "Inhaber",
    ask: askNow(s),
    askBefore: s.offer.ev,
    mood: t.mood,
    played: t.rounds.length,
    rounds,
    bonus: rounds > TAKEOVER.rounds,
    status: t.status,
    counter: lastCounter(s),
    lastOffer: last?.offer,
    say: last
      ? last.say
      : `„Ich verlange ${mio(askNow(s))} mit ${Math.round(TAKEOVER.openVendor * 100)} % Verkäuferdarlehen. Für weniger muss mich jemand mit guten Argumenten überzeugen.“`,
    sayNote: last ? `Gegenangebot aus Runde ${t.rounds.length}` : "Seine Forderung",
    agreed: t.agreed,
    pain: painKnown(state, s),
    history: t.rounds.map((r) => ({ offer: r.offer, counter: r.counter, say: r.say })),
    blocked: duel?.status === "open" ? "Erst das Bietgefecht entscheiden." : duel?.status === "won" ? "Den Preis hat das Bietgefecht entschieden." : null,
    maxVendor: TAKEOVER.maxVendor,
    maxEarnout: TAKEOVER.maxEarnout,
    days: TAKEOVER.days,
  };
}
