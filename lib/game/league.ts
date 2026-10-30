import { START_MONTH_INDEX } from "./config";
import { mnaRandom } from "./lbo";
import { between, mnaOf, mnaRead, type Ctx } from "./mna-core";
import { RIVAL_POOL, rivalsIn, rivalsOf } from "./rivals";
import type { GameState } from "./types";

// League Table: die Rangliste der M&A-Berater im Mittelstand, nach Volumen
// (Summe der Unternehmenswerte) oder Anzahl der beratenen Deals im Jahr.
// Die anderen Häuser haben kein eigenes Verhalten: Ihre Zahlen sind aus dem
// Seed fortgeschrieben. Nur deine eigenen Mandate zählen wirklich.

export interface LeagueHouse {
  id: string;
  name: string;
  city: string;
  league: { volume: number; count: number; growth: number };
}

/** Houses that are only ever names in the table. */
const ADVISERS: LeagueHouse[] = [
  { id: "rheinhold", name: "Rheinhold Kapital", city: "Köln", league: { volume: 520, count: 22, growth: 0.04 } },
  { id: "alpen", name: "Alpen M&A", city: "Zürich", league: { volume: 380, count: 14, growth: 0.03 } },
  { id: "hanseatic", name: "Hanseatic Capital Advisors", city: "Hamburg", league: { volume: 260, count: 12, growth: 0.04 } },
  { id: "isartal", name: "Isartal Corporate Finance", city: "München", league: { volume: 190, count: 10, growth: 0.05 } },
  { id: "elbufer", name: "Elbufer Partners", city: "Dresden", league: { volume: 120, count: 8, growth: 0.05 } },
  { id: "mainfeld", name: "Mainfeld & Co.", city: "Frankfurt", league: { volume: 75, count: 6, growth: 0.04 } },
  { id: "foerde", name: "Fördestadt Advisory", city: "Kiel", league: { volume: 35, count: 4, growth: 0.06 } },
];

/** Last year's place in the top five brings more requests. */
export const LEAGUE_TOP = 5;
export const LEAGUE_MANDATE_BONUS = 0.04;

export function yearOf(month: number): number {
  return Math.floor((START_MONTH_INDEX + month - 1) / 12) + 1;
}

/** Months of a calendar year already played (closed) when `month` is being played. */
export function monthsPlayed(month: number, year: number): number {
  const now = yearOf(month);
  if (year < now) return 12;
  if (year > now) return 0;
  return (START_MONTH_INDEX + month - 1) % 12;
}

/** Your own advised volume and deal count per calendar year. */
export function recordLeague(ctx: Ctx, month: number, ev: number): void {
  const m = mnaOf(ctx.state);
  const year = yearOf(month);
  m.league = m.league ?? [];
  let row = m.league.find((x) => x.year === year);
  if (!row) {
    row = { year, volume: 0, count: 0 };
    m.league.push(row);
    if (m.league.length > 12) m.league.splice(0, m.league.length - 12);
  }
  row.volume += ev;
  row.count += 1;
}

export interface LeagueRow {
  id: string;
  name: string;
  city: string;
  rival: boolean;
  me: boolean;
  /** Million euros. */
  volume: number;
  count: number;
  rank: number;
  /** Places gained against last year (positive = up); null without a last year. */
  move: number | null;
}

function houses(state: GameState): (LeagueHouse & { rival: boolean })[] {
  const rivals = rivalsIn(state) ? new Set(rivalsOf(state).map((x) => x.id)) : new Set<string>();
  return [...ADVISERS.map((h) => ({ ...h, rival: false })), ...RIVAL_POOL.map((h) => ({ id: h.id, name: h.name, city: h.city, league: h.league, rival: rivals.has(h.id) }))];
}

function houseYear(state: GameState, h: LeagueHouse, year: number, played: number): { volume: number; count: number } {
  const r = mnaRandom(state, `league|${year}|${h.id}`);
  const grow = Math.pow(1 + h.league.growth, Math.max(0, year - 1));
  const volume = h.league.volume * grow * between(r, 0.75, 1.3);
  const count = Math.max(1, Math.round(h.league.count * Math.sqrt(grow) * between(r, 0.75, 1.3)));
  const share = played / 12;
  return { volume: Math.round(volume * share * 10) / 10, count: Math.round(count * share) };
}

function rank(rows: Omit<LeagueRow, "rank" | "move">[], by: "volume" | "count"): Omit<LeagueRow, "move">[] {
  return [...rows]
    .sort((a, b) => (by === "volume" ? b.volume - a.volume || b.count - a.count : b.count - a.count || b.volume - a.volume) || (a.me ? -1 : b.me ? 1 : 0))
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

function rowsOf(state: GameState, year: number, played: number): Omit<LeagueRow, "rank" | "move">[] {
  const own = mnaRead(state).league?.find((x) => x.year === year);
  return [
    ...houses(state).map((h) => ({ id: h.id, name: h.name, city: h.city, rival: h.rival, me: false, ...houseYear(state, h, year, played) })),
    { id: "you", name: "Du", city: "dein Büro", rival: false, me: true, volume: Math.round(((own?.volume ?? 0) / 1_000_000) * 10) / 10, count: own?.count ?? 0 },
  ];
}

/** The table of a calendar year; the running year shows the months played so far. */
export function leagueTable(state: GameState, year: number, by: "volume" | "count" = "volume"): LeagueRow[] {
  const played = monthsPlayed(state.month, year);
  const now = rank(rowsOf(state, year, played), by);
  const before = year > 1 ? rank(rowsOf(state, year - 1, 12), by) : null;
  return now.map((x) => {
    const old = before?.find((y) => y.id === x.id);
    return { ...x, move: old ? old.rank - x.rank : null };
  });
}

/** Your place at the end of a finished year (by volume), or null before you advised anything. */
export function leagueRank(state: GameState, year: number): number | null {
  if (!mnaRead(state).league?.some((x) => x.year === year)) return null;
  return leagueTable(state, year).find((x) => x.me)?.rank ?? null;
}

/** January: the paper prints last year's table. */
export function leagueMonth(ctx: Ctx): void {
  const state = ctx.state;
  if ((START_MONTH_INDEX + state.month - 1) % 12 !== 0) return;
  const year = yearOf(state.month) - 1;
  const place = leagueRank(state, year);
  if (place === null) return;
  const table = leagueTable(state, year);
  const top = table.slice(0, 3).map((x) => (x.me ? "du" : x.name));
  ctx.lesson("league_table");
  ctx.mail({
    kind: "news",
    from: "Wirtschaftsblatt",
    subject: `League Table Jahr ${year}: Platz ${place}`,
    body: `Die Rangliste der M&A-Berater im Mittelstand ist da. Vorn: ${top.join(", ")}. Du stehst nach Volumen auf Platz ${place} von ${table.length}.${place <= LEAGUE_TOP ? " Ein Platz unter den ersten fünf spricht sich herum: Es kommen mehr Anfragen." : ""}`,
  });
}

/** Extra chance of a mandate request from last year's place. */
export function leagueBonus(state: GameState): number {
  const place = leagueRank(state, yearOf(state.month) - 1);
  return place !== null && place <= LEAGUE_TOP ? LEAGUE_MANDATE_BONUS : 0;
}
