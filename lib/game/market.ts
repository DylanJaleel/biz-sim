import type { AssetId, MarketState, Regime } from "./types";

// Eine kleine, ausgedachte Börse: vier Anlagen mit unterschiedlichem Risiko.
// Alle hängen am selben Marktklima, das auch Startup-Runden beeinflusst.

export interface AssetDef {
  id: AssetId;
  name: string;
  kind: string;
  /** Yearly payout as share of value (interest, coupon, dividend). */
  yield: number;
  /** Paid every n months. */
  payEvery: number;
  beta: number;
  drift: number;
  vol: number;
  note: string;
}

export const ASSETS: AssetDef[] = [
  { id: "tagesgeld", name: "Tagesgeld", kind: "Konto", yield: 0.02, payEvery: 1, beta: 0, drift: 0, vol: 0, note: "Kein Risiko, wenig Ertrag. Jederzeit verfügbar." },
  { id: "anleihen", name: "Anleihen-Fonds", kind: "Anleihen", yield: 0.035, payEvery: 1, beta: 0.15, drift: 0, vol: 0.006, note: "Feste Zinsen, kleine Schwankungen. Leidet, wenn Zinsen steigen." },
  { id: "dividenden", name: "Dividenden-Aktien", kind: "Aktienfonds", yield: 0.032, payEvery: 3, beta: 0.85, drift: 0.001, vol: 0.015, note: "Etablierte Firmen, die Gewinne ausschütten. Dividende jedes Quartal." },
  { id: "tech", name: "Tech-Index", kind: "Aktienfonds", yield: 0, payEvery: 0, beta: 1.5, drift: 0.003, vol: 0.03, note: "Hohe Chancen, starke Ausschläge, keine Ausschüttung." },
];

export function assetOf(id: AssetId): AssetDef {
  return ASSETS.find((a) => a.id === id)!;
}

const REGIME: Record<Regime, { drift: number; vol: number; sentiment: number; next: [Regime, number][] }> = {
  boom: { drift: 0.012, vol: 0.03, sentiment: 0.6, next: [["boom", 0.75], ["normal", 0.2], ["weak", 0.04], ["crash", 0.01]] },
  normal: { drift: 0.005, vol: 0.035, sentiment: 0.1, next: [["normal", 0.84], ["boom", 0.08], ["weak", 0.07], ["crash", 0.01]] },
  weak: { drift: -0.008, vol: 0.045, sentiment: -0.4, next: [["weak", 0.6], ["normal", 0.3], ["crash", 0.06], ["boom", 0.04]] },
  crash: { drift: -0.05, vol: 0.07, sentiment: -0.9, next: [["weak", 0.5], ["crash", 0.25], ["normal", 0.25]] },
};

export const REGIME_LABEL: Record<Regime, string> = { boom: "Aufschwung", normal: "Ruhiger Markt", weak: "Schwacher Markt", crash: "Crash" };

const HEADLINES: Record<Regime, string[]> = {
  boom: ["Börsen auf Rekordkurs, Investoren in Kauflaune", "Tech-Werte ziehen an, Fonds sammeln Milliarden ein", "Zinsen sinken: Wagniskapital wird wieder billiger"],
  normal: ["Märkte seitwärts, Anleger warten auf Zahlen", "Ruhiger Handel, Dividendenwerte gefragt", "Konjunktur stabil, Notenbank hält still"],
  weak: ["Zinsangst drückt die Kurse", "Investoren werden vorsichtig: Runden dauern länger", "Konjunktur kühlt ab, Tech-Werte unter Druck"],
  crash: ["Ausverkauf an den Börsen", "Panik am Markt: Tech-Index bricht ein", "Banken drehen den Geldhahn zu, Startups suchen Geld"],
};

/** Market mood from -1 (crash) to 1 (boom); rounds and fundraising follow it. */
export function sentimentOf(regime: Regime): number {
  return REGIME[regime].sentiment;
}

const ZERO: Record<AssetId, number> = { tagesgeld: 0, anleihen: 0, dividenden: 0, tech: 0 };

export function initialMarket(): MarketState {
  const prices = { tagesgeld: 1, anleihen: 100, dividenden: 100, tech: 100 };
  return { regime: "normal", headline: HEADLINES.normal[0]!, prices, holdings: { ...ZERO }, invested: { ...ZERO }, history: [{ month: 1, prices: { ...prices }, regime: "normal" }] };
}

function gauss(random: () => number): number {
  const u = Math.max(1e-9, random());
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** One month of market: new regime, new prices, payouts in euros. */
export function stepMarket(market: MarketState, month: number, random: () => number): { market: MarketState; payout: number; lines: string[] } {
  const roll = random();
  let acc = 0;
  let regime: Regime = market.regime;
  for (const [r, p] of REGIME[market.regime].next) {
    acc += p;
    if (roll < acc) {
      regime = r;
      break;
    }
  }
  const r = REGIME[regime];
  const marketReturn = r.drift + gauss(random) * r.vol;
  const prices = { ...market.prices };
  let payout = 0;
  const lines: string[] = [];
  for (const a of ASSETS) {
    const value = market.holdings[a.id] * market.prices[a.id];
    if (a.yield > 0 && a.payEvery > 0 && month % a.payEvery === 0 && value > 0) {
      const amount = (value * a.yield * a.payEvery) / 12;
      payout += amount;
      if (amount >= 1) lines.push(`${a.name}: ${Math.round(amount).toLocaleString("de-DE")} € ${a.id === "dividenden" ? "Dividende" : "Zinsen"}`);
    }
    if (a.vol === 0) continue;
    const change = a.drift + a.beta * marketReturn + gauss(random) * a.vol;
    prices[a.id] = Math.max(5, Math.round(market.prices[a.id] * (1 + change) * 100) / 100);
  }
  const options = HEADLINES[regime];
  const headline = options[Math.floor(random() * options.length) % options.length]!;
  const history = [...market.history, { month: month + 1, prices: { ...prices }, regime }].slice(-36);
  return { market: { ...market, regime, headline, prices, history }, payout, lines };
}

export function holdingsValue(market: MarketState): number {
  return ASSETS.reduce((sum, a) => sum + market.holdings[a.id] * market.prices[a.id], 0);
}
