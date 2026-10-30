import { daysLeft } from "./engine";
import { leagueRank, leagueTable, LEAGUE_TOP, monthsPlayed, yearOf, type LeagueRow } from "./league";
import { BIG_DAYS, BIG_ROUNDS, bidValue, bigFee, bigPower, LEVER_TEXT } from "./mandate-big";
import { mnaRead } from "./mna-core";
import {
  CONCEPT_COST,
  CONCEPT_VALUE,
  DUEL_DAYS,
  DUEL_RAISE,
  DUEL_ROUNDS,
  duelRecord,
  duelScores,
  RIVAL_KIND_LABEL,
  RIVAL_REPUTATION,
  rivalDef,
  rivalsIn,
  rivalsOf,
} from "./rivals";
import type { GameState, MandateLever, TeaserFact } from "./types";

// Was die Seiten von Rangliste, Rivalen, Bietgefecht und großen Mandaten
// sehen dürfen: nie die verdeckten Grenzen der Bieter.

export interface RivalCard {
  id: string;
  name: string;
  head: string;
  city: string;
  kind: string;
  style: string;
  strengths: string[];
  terms: string;
  won: number;
  lost: number;
  place: number | null;
}

export interface LeagueView {
  year: number;
  years: number[];
  current: number;
  played: number;
  by: "volume" | "count";
  rows: LeagueRow[];
  me: LeagueRow;
  /** The house right above you, and what is missing to pass it. */
  above?: { name: string; rival: boolean; gap: number };
  history: { year: number; rank: number | null; volume: number; count: number }[];
  rivalsIn: boolean;
  rivalReputation: number;
  rivals: RivalCard[];
  top: number;
}

export function leagueView(state: GameState, year?: number, by: "volume" | "count" = "volume"): LeagueView {
  const current = yearOf(state.month);
  const playedNow = monthsPlayed(state.month, current);
  // In January nothing of the new year is played yet: show the year before.
  const fallback = playedNow === 0 && current > 1 ? current - 1 : current;
  const y = year !== undefined && year >= 1 && year <= current ? year : fallback;
  const rows = leagueTable(state, y, by);
  const me = rows.find((r) => r.me)!;
  const prev = rows[me.rank - 2];
  const own = mnaRead(state).league ?? [];
  const records = duelRecord(state);
  return {
    year: y,
    years: Array.from({ length: current }, (_, i) => current - i).slice(0, 6),
    current,
    played: monthsPlayed(state.month, y),
    by,
    rows,
    me,
    above: prev ? { name: prev.name, rival: prev.rival, gap: by === "volume" ? Math.max(0, prev.volume - me.volume) : Math.max(0, prev.count - me.count) } : undefined,
    history: own
      .filter((x) => x.year < current)
      .sort((a, b) => a.year - b.year)
      .map((x) => ({ year: x.year, rank: leagueRank(state, x.year), volume: x.volume, count: x.count })),
    rivalsIn: rivalsIn(state),
    rivalReputation: RIVAL_REPUTATION,
    rivals: rivalsIn(state)
      ? rivalsOf(state).map((d) => ({
          id: d.id,
          name: d.name,
          head: d.head,
          city: d.city,
          kind: RIVAL_KIND_LABEL[d.kind],
          style: d.style,
          strengths: d.strengths,
          terms: d.termsText,
          won: records[d.id]?.won ?? 0,
          lost: records[d.id]?.lost ?? 0,
          place: rows.find((r) => r.id === d.id)?.rank ?? null,
        }))
      : [],
    top: LEAGUE_TOP,
  };
}

export interface DuelView {
  rival: { name: string; head: string; city: string; kind: string; style: string; terms: string };
  you: number;
  rivalBid: number;
  /** The owner's rating: price plus what the terms are worth to him. */
  scoreYou: number;
  scoreRival: number;
  ahead: boolean;
  concept: boolean;
  conceptRange: [number, number];
  conceptCost: number;
  raise: { small: number; big: number };
  round: number;
  rounds: number;
  status: "open" | "won" | "lost" | "left";
  log: string[];
  days: typeof DUEL_DAYS;
  daysLeft: number;
}

export function duelView(state: GameState, targetId: string): DuelView | null {
  const s = state.startups.find((x) => x.id === targetId);
  const d = s?.offer?.duel;
  const def = d ? rivalDef(d.rivalId) : undefined;
  if (!s || !d || !def) return null;
  const ask = s.offer!.ev!;
  const score = duelScores(d);
  return {
    rival: { name: def.name, head: def.head, city: def.city, kind: RIVAL_KIND_LABEL[def.kind], style: def.style, terms: def.termsText },
    you: d.you,
    rivalBid: d.rival,
    scoreYou: score.you,
    scoreRival: score.rival,
    ahead: score.you > score.rival,
    concept: Boolean(d.concept),
    conceptRange: [ask * CONCEPT_VALUE[0], ask * CONCEPT_VALUE[1]],
    conceptCost: d.you * CONCEPT_COST,
    raise: { small: d.you + ask * DUEL_RAISE.small, big: d.you + ask * DUEL_RAISE.big },
    round: d.round,
    rounds: DUEL_ROUNDS,
    status: d.status,
    log: d.log,
    days: DUEL_DAYS,
    daysLeft: daysLeft(state),
  };
}

export interface BigBidView {
  buyer: string;
  kind: "strategic" | "financial";
  ev: number;
  earnout: number;
  value: number;
  mood: number;
  out: boolean;
  /** Your success fee if this bid wins. */
  fee: number;
}

export interface BigMandateView {
  unit: string;
  facts: TeaserFact[];
  teaser?: string[];
  effect?: { interest: number; price: number; conf: number; cred: number };
  rounds: number;
  maxRounds: number;
  log: string[];
  exclusive?: string;
  power: number;
  bids: BigBidView[];
  levers: { id: MandateLever; title: string; text: string }[];
  days: typeof BIG_DAYS;
  concealed: number;
}

export function bigMandateView(state: GameState, id: string): BigMandateView | null {
  const md = mnaRead(state).mandates.find((m) => m.id === id);
  if (!md?.big) return null;
  const big = md.big;
  return {
    unit: big.unit,
    facts: big.facts,
    teaser: big.teaser,
    effect: big.effect,
    rounds: big.rounds,
    maxRounds: BIG_ROUNDS,
    log: big.log,
    exclusive: big.exclusive,
    power: bigPower(md),
    bids: (md.bids ?? [])
      .map((b) => ({ buyer: b.buyer, kind: b.kind, ev: b.ev, earnout: b.earnout ?? 0, value: bidValue(b), mood: b.mood ?? 60, out: Boolean(b.out), fee: bigFee(bidValue(b)) }))
      .sort((a, b) => b.value - a.value),
    levers: (Object.keys(LEVER_TEXT) as MandateLever[]).map((k) => ({ id: k, ...LEVER_TEXT[k] })),
    days: BIG_DAYS,
    concealed: big.concealed?.length ?? 0,
  };
}
