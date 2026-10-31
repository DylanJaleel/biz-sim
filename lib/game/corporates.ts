import { CHAIR_WEIGHT, CORPORATE_REPUTATION } from "./config";
import { CORPORATE_DEFS, CORPORATE_ID, corporateDef, corporateStartup } from "./corporate";
import { eur, type Ctx } from "./mna-core";
import { leadOf } from "./team";
import type { CorporateSeat, CorporatesState, GameState, Startup } from "./types";

// Konzernmandate über die ganze Karriere: Jedes Spiel verteilt einen Pool von
// fünf bis sieben Konzernen. Mit wachsendem Ruf fragen weitere an. Ein Mandat
// läuft eine Amtszeit von drei bis fünf Jahren; auf der Hauptversammlung am Ende
// entscheidet der Aufsichtsrat über die Wiederwahl, je nach Leistung und
// Stimmung. Wer gut arbeitet und bekannt genug ist, wird Vorsitzende/r.
// Ein Operating Partner kann ein Mandat für dich wahrnehmen.

export const CORP = {
  /** Reputation for the n-th Konzern (n = mandates taken so far); beyond the list the last value applies. */
  tiers: [CORPORATE_REPUTATION, 75, 80, 85, 88, 90, 92],
  /** Seats at the same time (German corporate governance code: few mandates, enough time for each). */
  maxSeats: 3,
  /** An offer stays open this many months; a declined Konzern asks again after `declinedMonths`. */
  offerMonths: 3,
  declinedMonths: 12,
  /** Months between two offers. */
  gapMonths: 6,
  /** Term lengths in years, drawn per term. */
  termYears: [3, 4, 5],
  /** Pool size per game (Nordhafen included). */
  pool: [5, 7] as [number, number],
  /** Re-election: base chance, weights of decisions, board mood (trust), revenue over the term and reputation. */
  reelect: { base: 0.6, quality: 0.25, mood: 1, growth: 1, growthCap: 0.15, reputationFrom: 70, reputationSlope: 0.005, min: 0.15, max: 0.95 },
  /** Chair: elected at a re-election from this reputation and board trust, at most `maxChairs` at once. */
  chair: { reputation: 82, trust: 55, fee: 1.75, weight: CHAIR_WEIGHT, maxChairs: 1 },
  /** Share of the fee an operating partner keeps when they sit on the board for you. */
  delegateShare: 0.5,
} as const;

/** Read-only: the Konzern state, also for older games (a joined Nordhafen seat counts from now). */
export function corporatesRead(state: GameState): CorporatesState {
  if (state.corporates) return state.corporates;
  const nordhafen = state.startups.find((s) => s.id === CORPORATE_ID && s.status === "active");
  const seats: CorporateSeat[] = nordhafen ? [newSeat(state, nordhafen, state.month)] : [];
  // A seat turned down in an older game comes back a year after the refusal, as before.
  const declined = state.corporateSeat === "declined" && state.corporateDeclined !== undefined ? [{ id: CORPORATE_ID, month: state.corporateDeclined }] : [];
  return { pool: poolFor(state.seed), seats, declined };
}

/** For the engine: creates the state when it is missing (older games: Nordhafen stays the first seat, its term starts now). */
export function corporatesOf(state: GameState): CorporatesState {
  if (!state.corporates) state.corporates = corporatesRead(state);
  return state.corporates;
}

/** The Konzerne of this game: Nordhafen first, then four to six others in an order of the seed. */
export function poolFor(seed: number): string[] {
  const r = rand(seed, "corporate-pool");
  const others = CORPORATE_DEFS.filter((d) => d.id !== CORPORATE_ID).map((d) => ({ id: d.id, k: r() }));
  others.sort((a, b) => a.k - b.k);
  const size = CORP.pool[0] + Math.floor(r() * (CORP.pool[1] - CORP.pool[0] + 1));
  return [CORPORATE_ID, ...others.slice(0, size - 1).map((o) => o.id)];
}

function rand(seed: number, purpose: string): () => number {
  let h = 2166136261;
  const text = `${seed}|${purpose}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function termMonths(seed: number, id: string, term: number): number {
  const r = rand(seed, `corporate-term|${id}|${term}`);
  return 12 * CORP.termYears[Math.floor(r() * CORP.termYears.length) % CORP.termYears.length]!;
}

function newSeat(state: GameState, s: Startup, month: number, previous?: CorporateSeat): CorporateSeat {
  const terms = (previous?.terms ?? 0) + 1;
  return {
    id: s.id,
    since: previous?.since ?? month,
    termStart: month,
    termEnd: month + termMonths(state.seed, s.id, terms),
    terms,
    startRevenue: Math.round(s.metrics.revenue),
    startTrust: Math.round(s.metrics.trust),
  };
}

export function activeSeats(state: GameState): CorporateSeat[] {
  return corporatesRead(state).seats.filter((x) => !x.ended && state.startups.some((s) => s.id === x.id && s.status === "active"));
}

export function seatOf(state: GameState, id: string): CorporateSeat | undefined {
  return corporatesRead(state).seats.find((x) => x.id === id && !x.ended);
}

/** Reputation the next Konzern needs. */
export function nextTier(state: GameState): number {
  const n = corporatesRead(state).seats.length;
  return CORP.tiers[Math.min(n, CORP.tiers.length - 1)]!;
}

/** Your fee from this Konzern per month: chair pays more, a partner on the board keeps part of it. */
export function corporateFee(state: GameState, s: Startup): { mine: number; total: number; partner?: string } {
  const total = Math.round(corporateDef(s.id).fee * (s.corporateChair ? CORP.chair.fee : 1));
  const lead = leadOf(state, s);
  if (!lead) return { mine: total, total };
  return { mine: Math.round(total * (1 - CORP.delegateShare)), total, partner: lead.member.name };
}

/** Why no further Konzern asks right now, or null. */
export function offerBlocker(state: GameState): string | null {
  const c = corporatesRead(state);
  if (c.offer) return "Eine Anfrage liegt schon vor.";
  if (activeSeats(state).length >= CORP.maxSeats) return `Mehr als ${CORP.maxSeats} Aufsichtsratsmandate gleichzeitig nimmt niemand ernst. Gib erst eines ab.`;
  if (state.reputation < nextTier(state)) return `Der nächste Konzern fragt ab ${nextTier(state)} Ruf an.`;
  const record = state.ledRounds > 0 || state.startups.some((s) => s.stake > 50) || state.exits.some((e) => e.status === "accepted");
  if (!record) return "Konzerne fragen erst, wenn du eine Runde angeführt, eine Mehrheit gehalten oder eine Firma verkauft hast.";
  if (!candidate(state)) return "Gerade sucht kein weiterer Konzern ein Aufsichtsratsmitglied.";
  if (c.lastOffer !== undefined && state.month < c.lastOffer + CORP.gapMonths) return "Die nächste Anfrage kommt frühestens in ein paar Monaten.";
  return null;
}

function candidate(state: GameState): string | undefined {
  const c = corporatesRead(state);
  // The first mandate is always the Nordhafen AG; the others follow once you have a seat.
  const pool = c.seats.length === 0 ? c.pool.slice(0, 1) : c.pool;
  return pool.find(
    (id) => !c.seats.some((x) => x.id === id) && !c.declined.some((d) => d.id === id && state.month < d.month + CORP.declinedMonths) && !state.startups.some((s) => s.id === id),
  );
}

/** Month end: offers lapse, terms end at the annual general meeting, new Konzerne ask. */
export function corporatesMonth(ctx: Ctx, notes: string[]): void {
  const state = ctx.state;
  if (!state.corporates && state.corporateSeat !== "joined" && state.reputation < CORPORATE_REPUTATION) return;
  const c = corporatesOf(state);
  if (c.offer && c.offer.expires < state.month) {
    c.declined.push({ id: c.offer.id, month: state.month });
    notes.push(`Die Anfrage der ${corporateDef(c.offer.id).name} ist verfallen.`);
    delete c.offer;
    if (state.corporateSeat === "offered") state.corporateSeat = c.seats.length > 0 ? "joined" : "declined";
    state.corporateDeclined = state.month;
  }
  for (const seat of c.seats.filter((x) => !x.ended && x.termEnd <= state.month)) reelection(ctx, seat, notes);
  // Seats of Konzerne that are gone (should not happen) end quietly.
  for (const seat of c.seats.filter((x) => !x.ended && !state.startups.some((s) => s.id === x.id && s.status === "active")))
    seat.ended = { month: state.month, reason: "resigned" };
  if (offerBlocker(state)) return;
  const id = candidate(state)!;
  const d = corporateDef(id);
  c.offer = { id, month: state.month, expires: state.month + CORP.offerMonths };
  c.lastOffer = state.month;
  if (c.seats.length === 0) state.corporateSeat = "offered";
  ctx.mail({
    kind: "system",
    from: `${d.asker}, ${d.name}`,
    subject: "Anfrage: Mandat im Aufsichtsrat",
    body: `Die ${d.name} (${d.tagline}) sucht ein Aufsichtsratsmitglied${c.seats.length > 0 ? " mit Erfahrung in anderen Aufsichtsräten" : " mit Erfahrung in jungen Firmen"}. Vergütung ${eur(d.fee)} im Monat, eine Sitzung pro Quartal, keine Anteile. Die Amtszeit läuft bis zur Hauptversammlung in drei bis fünf Jahren, danach entscheidet die Wiederwahl. Bitte antworten Sie innerhalb von ${CORP.offerMonths} Monaten.`,
    action: "corporate",
    corporateOfferId: id,
  });
}

/** Chance of being re-elected at the end of a term, with the reasons the board weighs. */
export function reelectionChance(state: GameState, seat: CorporateSeat): { chance: number; quality: number; mood: number; growth: number } {
  const s = state.startups.find((x) => x.id === seat.id);
  if (!s) return { chance: 0, quality: 0, mood: 0, growth: 0 };
  const items = state.items.filter((i) => i.startupId === seat.id && i.month >= seat.termStart && i.status !== "open");
  const good = items.filter((i) => i.status === "decided" && i.decision && i.decision.judgment !== "weak").length;
  const lapsed = items.filter((i) => i.status === "lapsed").length;
  const quality = items.length > 0 ? (good - lapsed) / items.length : 0;
  const mood = (s.metrics.trust - 50) / 100;
  const growth = Math.max(-CORP.reelect.growthCap, Math.min(CORP.reelect.growthCap, s.metrics.revenue / Math.max(1, seat.startRevenue) - 1));
  const r = CORP.reelect;
  const chance = r.base + r.quality * quality + r.mood * mood + r.growth * growth + Math.max(0, state.reputation - r.reputationFrom) * r.reputationSlope;
  return { chance: Math.max(r.min, Math.min(r.max, chance)), quality, mood, growth };
}

function reelection(ctx: Ctx, seat: CorporateSeat, notes: string[]): void {
  const state = ctx.state;
  const s = state.startups.find((x) => x.id === seat.id && x.status === "active");
  if (!s) return;
  const { chance } = reelectionChance(state, seat);
  const roll = rand(state.seed, `corporate-reelect|${seat.id}|${seat.terms}`)();
  ctx.lesson("wiederwahl");
  if (roll >= chance) {
    endSeat(state, s, seat, "voted_out");
    ctx.reputation(-1);
    notes.push(`${s.name}: Die Hauptversammlung hat dich nicht wiedergewählt. Dein Mandat endet nach ${Math.round((state.month - seat.since) / 12)} Jahren.`);
    ctx.mail({
      kind: "founder",
      from: s.name,
      subject: "Hauptversammlung: keine Wiederwahl",
      body: `Der Aufsichtsrat hat Ihre Amtszeit nicht verlängert. Ausschlaggebend waren die Stimmung im Gremium und die Entwicklung seit Beginn der Amtszeit. Wir danken Ihnen für die Arbeit.`,
      startupId: s.id,
    });
    return;
  }
  const next = newSeat(state, s, state.month, seat);
  Object.assign(seat, next);
  const chairs = activeSeats(state).filter((x) => state.startups.find((y) => y.id === x.id)?.corporateChair).length;
  const chair = !s.corporateChair && chairs < CORP.chair.maxChairs && state.reputation >= CORP.chair.reputation && s.metrics.trust >= CORP.chair.trust;
  if (chair) {
    ctx.replace({ ...s, corporateChair: true });
    ctx.lesson("aufsichtsratsvorsitz");
  }
  const years = Math.round((seat.termEnd - seat.termStart) / 12);
  notes.push(`${s.name}: Wiedergewählt für ${years} Jahre${chair ? ", und der Aufsichtsrat wählt dich zur/zum Vorsitzenden" : ""}.`);
  ctx.mail({
    kind: "founder",
    from: s.name,
    subject: chair ? "Hauptversammlung: Wiederwahl und Vorsitz" : "Hauptversammlung: Wiederwahl",
    body: chair
      ? `Die Hauptversammlung hat Sie für ${years} weitere Jahre gewählt, der Aufsichtsrat hat Sie zur/zum Vorsitzenden bestimmt. Als Vorsitz leiten Sie die Sitzungen, Ihre Stimme wiegt schwerer (${CORP.chair.weight}-fach), die Vergütung steigt auf ${eur(Math.round(corporateDef(s.id).fee * CORP.chair.fee))} im Monat.`
      : `Die Hauptversammlung hat Sie für ${years} weitere Jahre in den Aufsichtsrat gewählt. Die nächste Wiederwahl ist in ${years} Jahren.`,
    startupId: s.id,
  });
}

function endSeat(state: GameState, s: Startup, seat: CorporateSeat, reason: "resigned" | "voted_out"): void {
  seat.ended = { month: state.month, reason };
  // The Konzern leaves the portfolio; open agenda items lapse without a cost.
  const i = state.startups.findIndex((x) => x.id === s.id);
  if (i >= 0) state.startups[i] = { ...s, status: "declined", corporateChair: false };
  state.items = state.items.map((x) => (x.startupId === s.id && x.status === "open" ? { ...x, status: "lapsed" } : x));
}

/** Accept or decline the open offer. */
export function answerOffer(ctx: Ctx, accept: boolean): Startup | null {
  const state = ctx.state;
  const c = corporatesOf(state);
  const offer = c.offer;
  if (!offer) ctx.fail("Dieses Mandat liegt nicht vor.");
  delete c.offer;
  if (!accept) {
    c.declined.push({ id: offer!.id, month: state.month });
    if (c.seats.length === 0) state.corporateSeat = "declined";
    state.corporateDeclined = state.month;
    return null;
  }
  if (activeSeats(state).length >= CORP.maxSeats) ctx.fail(`Du hast schon ${CORP.maxSeats} Mandate. Gib erst eines ab.`);
  const d = corporateDef(offer!.id);
  ctx.spend("joinCorporate", `Antrittsbesuch ${d.name}`, 1);
  const s = corporateStartup(state.month, d.id);
  state.startups.push(s);
  c.seats.push(newSeat(state, s, state.month));
  state.corporateSeat = "joined";
  ctx.lesson("aufsichtsrat");
  const seat = c.seats[c.seats.length - 1]!;
  ctx.mail({
    kind: "founder",
    from: `${d.board[0]!.name}, ${d.name}`,
    subject: "Willkommen im Aufsichtsrat",
    body: `Der Aufsichtsrat tagt einmal im Quartal. Sie bekommen ${eur(d.fee)} im Monat und keine Anteile. Ihre Amtszeit läuft ${Math.round((seat.termEnd - seat.termStart) / 12)} Jahre bis zur Hauptversammlung, dann entscheidet die Wiederwahl. Wir erwarten einen kritischen Blick, auch auf mich.`,
    startupId: d.id,
  });
  return s;
}

/** Step down: the seat ends at once, a short note to the board. Leaving early costs a little reputation. */
export function resign(ctx: Ctx, startupId: string): void {
  const state = ctx.state;
  const seat = seatOf(state, startupId);
  const s = state.startups.find((x) => x.id === startupId && x.status === "active" && x.corporate);
  if (!seat || !s) ctx.fail("Du sitzt in diesem Aufsichtsrat nicht.");
  const early = state.month < seat!.termEnd - 6;
  endSeat(state, s!, seat!, "resigned");
  if (early) ctx.reputation(-1);
  ctx.mail({
    kind: "founder",
    from: s!.name,
    subject: "Rücktritt aus dem Aufsichtsrat",
    body: early
      ? "Wir bedauern Ihren Rücktritt mitten in der Amtszeit. Das Gericht bestellt bis zur Hauptversammlung einen Ersatz."
      : "Danke für Ihre Arbeit. Kurz vor der Hauptversammlung ist ein Rücktritt kein Thema: Ihr Nachfolger wird dort gewählt.",
    startupId: s!.id,
  });
}

export interface CorporateSeatView {
  id: string;
  name: string;
  sector: string;
  since: number;
  termStart: number;
  termEnd: number;
  terms: number;
  chair: boolean;
  fee: number;
  feeTotal: number;
  partner?: string;
  chance: number;
  monthsLeft: number;
}

export interface CorporatesView {
  seats: CorporateSeatView[];
  past: { id: string; name: string; since: number; until: number; reason: "resigned" | "voted_out" }[];
  offer?: { id: string; name: string; tagline: string; sector: string; fee: number; expires: number };
  max: number;
  nextTier: number;
  blocker: string | null;
  pool: number;
  chairReputation: number;
  chairFee: number;
  chairWeight: number;
  delegateShare: number;
}

export function corporatesView(state: GameState): CorporatesView {
  const c = corporatesRead(state);
  const seats = activeSeats(state).map((seat) => {
    const s = state.startups.find((x) => x.id === seat.id)!;
    const fee = corporateFee(state, s);
    return {
      id: s.id,
      name: s.name,
      sector: s.sector,
      since: seat.since,
      termStart: seat.termStart,
      termEnd: seat.termEnd,
      terms: seat.terms,
      chair: Boolean(s.corporateChair),
      fee: fee.mine,
      feeTotal: fee.total,
      partner: fee.partner,
      chance: reelectionChance(state, seat).chance,
      monthsLeft: Math.max(0, seat.termEnd - state.month),
    };
  });
  const offer = c.offer ? corporateDef(c.offer.id) : undefined;
  return {
    seats,
    past: c.seats.filter((x) => x.ended).map((x) => ({ id: x.id, name: corporateDef(x.id).name, since: x.since, until: x.ended!.month, reason: x.ended!.reason })),
    offer: offer && c.offer ? { id: offer.id, name: offer.name, tagline: offer.tagline, sector: offer.sector, fee: offer.fee, expires: c.offer.expires } : undefined,
    max: CORP.maxSeats,
    nextTier: nextTier(state),
    blocker: offerBlocker(state),
    pool: c.pool.length,
    chairReputation: CORP.chair.reputation,
    chairFee: CORP.chair.fee,
    chairWeight: CORP.chair.weight,
    delegateShare: CORP.delegateShare,
  };
}
