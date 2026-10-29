import { monthLabel } from "./config";
import { eur, mio, pickOf, roundTo, type Ctx } from "./mna-core";
import { contactOf, netRandom, personOf } from "./network";
import { officeOf } from "./office";
import type { GameState, IncomeLines, Regime } from "./types";
import type { Binding, EstateKind, EstateOffer, EstateState, Mortgage, Property } from "./wealth-types";

// Immobilien: eine Anlageklasse neben den Beteiligungen. Kaufen mit Hypothek,
// Miete nach Leerstand, Instandhaltung, Zinsbindung und Anschlusszins. Der
// Marktzins folgt einem festen Ablauf: etwa alle fünfeinhalb Jahre eine Wende,
// neun Monate vorher in den Wirtschaftsnachrichten angekündigt.

// ---------------------------------------------------------------------------
// Zinszyklus
// ---------------------------------------------------------------------------

/** Mortgage rate for ten years fixed at the start of the game. */
export const RATE_BASE = 0.034;
/** Month the first rate turn begins; every RATE_PERIOD months the next one, up and down in turn. */
export const RATE_FIRST_TURN = 58;
export const RATE_PERIOD = 66;
/** A turn moves the rate this far, in four quarterly steps. */
export const RATE_MOVE = 0.02;
/** The news announce a turn this many months ahead. */
export const RATE_ANNOUNCE = 9;
/** Shorter fixed periods are cheaper, longer ones cost a premium. */
export const BINDING_OFFSET: Record<Binding, number> = { 5: -0.004, 10: 0, 15: 0.003 };
export const BINDINGS: Binding[] = [5, 10, 15];
/** Initial repayment per year on top of the interest (German annuity loan). */
export const REPAYMENT = 0.02;
/** Surcharge per started 5 points of loan-to-value above 60 %. */
export const LTV_SURCHARGE = 0.001;
/** A warm bank contact gets a better rate. */
export const BANK_DISCOUNT = 0.002;
export const BANK_WARMTH = 50;

export interface RateTurn {
  month: number;
  up: boolean;
}

/** The k-th rate turn (0 = first). */
export function rateTurn(k: number): RateTurn {
  return { month: RATE_FIRST_TURN + k * RATE_PERIOD, up: k % 2 === 0 };
}

/** The next turn that has not started by `month`. */
export function nextTurn(month: number): RateTurn {
  let k = 0;
  while (rateTurn(k).month <= month) k++;
  return rateTurn(k);
}

/** Market rate for a new mortgage in a month, by fixed period. A turn moves it in four steps over twelve months. */
export function marketRate(month: number, binding: Binding = 10): number {
  let r = RATE_BASE;
  for (let k = 0; ; k++) {
    const t = rateTurn(k);
    if (t.month > month) break;
    const steps = Math.min(4, Math.floor((month - t.month) / 3) + 1);
    r += ((t.up ? 1 : -1) * RATE_MOVE * steps) / 4;
  }
  return Math.round((r + BINDING_OFFSET[binding]) * 10_000) / 10_000;
}

/** A turn is announced: from RATE_ANNOUNCE months before it begins. */
export function announcedTurn(month: number): RateTurn | null {
  const t = nextTurn(month);
  return t.month - month <= RATE_ANNOUNCE ? t : null;
}

// ---------------------------------------------------------------------------
// Objektarten und Städte
// ---------------------------------------------------------------------------

export interface KindDef {
  kind: EstateKind;
  label: string;
  price: [number, number];
  /** Gross rental yield: annual rent ÷ price. */
  yield: [number, number];
  maxLtv: number;
  spread: number;
  /** Maintenance per year, as share of the value. */
  upkeep: number;
  /** Rent growth per year (index clauses, market). */
  growth: number;
  /** Value change per percentage point of market rate since purchase. */
  rateSens: number;
  vacancy: Record<Regime, number>;
  /** Spread of the monthly vacancy around its level. */
  noise: number;
  units: [number, number];
  area: [number, number];
  /** Net worth the bank wants to see. */
  worth: number;
  reputation: number;
  text: string;
}

export const KINDS: Record<EstateKind, KindDef> = {
  wohnung: {
    kind: "wohnung",
    label: "Wohnung",
    price: [280_000, 620_000],
    yield: [0.036, 0.042],
    maxLtv: 0.8,
    spread: 0,
    upkeep: 0.01,
    growth: 0.02,
    rateSens: 0.06,
    vacancy: { boom: 0.01, normal: 0.02, weak: 0.03, crash: 0.04 },
    noise: 0.015,
    units: [1, 1],
    area: [55, 115],
    worth: 400_000,
    reputation: 0,
    text: "Eine vermietete Eigentumswohnung. Wenig Arbeit, wenig Leerstand, kleine Rendite.",
  },
  mfh: {
    kind: "mfh",
    label: "Mehrfamilienhaus",
    price: [1_400_000, 3_600_000],
    yield: [0.043, 0.05],
    maxLtv: 0.75,
    spread: 0.0015,
    upkeep: 0.014,
    growth: 0.018,
    rateSens: 0.07,
    vacancy: { boom: 0.02, normal: 0.03, weak: 0.05, crash: 0.07 },
    noise: 0.02,
    units: [6, 14],
    area: [480, 1_200],
    worth: 1_500_000,
    reputation: 0,
    text: "Ein ganzes Haus mit mehreren Wohnungen. Mehr Rendite, mehr Instandhaltung.",
  },
  gewerbe: {
    kind: "gewerbe",
    label: "Gewerbe",
    price: [3_500_000, 9_000_000],
    yield: [0.056, 0.066],
    maxLtv: 0.65,
    spread: 0.005,
    upkeep: 0.016,
    growth: 0.01,
    rateSens: 0.08,
    vacancy: { boom: 0.06, normal: 0.1, weak: 0.16, crash: 0.24 },
    noise: 0.06,
    units: [3, 8],
    area: [1_200, 3_800],
    worth: 4_000_000,
    reputation: 0,
    text: "Büros und Läden. Hohe Miete, aber der Leerstand schwankt stark mit der Konjunktur.",
  },
  penthouse: {
    kind: "penthouse",
    label: "Penthouse",
    price: [2_400_000, 4_500_000],
    yield: [0.021, 0.024],
    maxLtv: 0.6,
    spread: 0.003,
    upkeep: 0.012,
    growth: 0.02,
    rateSens: 0.06,
    vacancy: { boom: 0, normal: 0, weak: 0, crash: 0 },
    noise: 0,
    units: [1, 1],
    area: [180, 320],
    worth: 3_000_000,
    reputation: 60,
    text: "Wohnsitz und Büro zugleich: Du zahlst keine Büromiete mehr und lädst Gäste ein. Bringt Ruf, aber keine Miete.",
  },
};

export const ESTATE_KINDS: EstateKind[] = ["wohnung", "mfh", "gewerbe", "penthouse"];

export interface EstateCity {
  id: string;
  name: string;
  image: string;
  /** Transfer tax, notary and agent as share of the price. */
  costs: number;
  /** Price level and yield level against the average. */
  price: number;
  yield: number;
  districts: string[];
}

export const ESTATE_CITIES: EstateCity[] = [
  { id: "berlin", name: "Berlin", image: "stadt-berlin", costs: 0.09, price: 1, yield: 1, districts: ["Prenzlauer Berg", "Friedrichshain", "Charlottenburg", "Schöneberg", "Mitte"] },
  { id: "hamburg", name: "Hamburg", image: "stadt-hamburg", costs: 0.085, price: 1.1, yield: 0.95, districts: ["HafenCity", "Eimsbüttel", "Ottensen", "Winterhude", "Altona"] },
  { id: "muenchen", name: "München", image: "stadt-muenchen", costs: 0.07, price: 1.3, yield: 0.85, districts: ["Glockenbach", "Schwabing", "Haidhausen", "Bogenhausen", "Maxvorstadt"] },
  { id: "frankfurt", name: "Frankfurt", image: "stadt-frankfurt", costs: 0.095, price: 1.05, yield: 1.05, districts: ["Westend", "Sachsenhausen", "Nordend", "Bockenheim", "Niederrad"] },
  { id: "wien", name: "Wien", image: "stadt-wien", costs: 0.08, price: 0.95, yield: 0.95, districts: ["Josefstadt", "Neubau", "Wieden", "Leopoldstadt", "Döbling"] },
  { id: "luzern", name: "Luzern", image: "stadt-luzern", costs: 0.045, price: 1.25, yield: 0.9, districts: ["Altstadt", "Tribschen", "Würzenbach", "Seeburg", "Hirschmatt"] },
];

export function estateCity(id: string): EstateCity {
  return ESTATE_CITIES.find((c) => c.id === id) ?? ESTATE_CITIES[0]!;
}

const NAMES: Record<EstateKind, string[]> = {
  wohnung: ["2-Zimmer-Wohnung", "3-Zimmer-Wohnung", "Altbauwohnung", "Dachgeschosswohnung", "Gartenwohnung"],
  mfh: ["Gründerzeithaus", "Zinshaus", "Stadthaus", "Wohnhaus", "Eckhaus"],
  gewerbe: ["Bürohaus", "Geschäftshaus", "Ärztehaus", "Büro- und Ladenhaus", "Gewerbehof"],
  penthouse: ["Penthouse", "Penthouse mit Dachterrasse", "Penthouse am Park", "Penthouse mit Weitblick", "Penthouse über den Dächern"],
};

/** Condition 1..5: vacancy, value and wear. */
const COND_VACANCY = [2, 2, 1.4, 1, 0.85, 0.7];
const COND_VALUE = [0.9, 0.9, 0.95, 1, 1.02, 1.04];
export const CONDITION_LABEL = ["", "sanierungsbedürftig", "einfach", "ordentlich", "gut", "neuwertig"];
/** The condition drops one step after this many months. */
export const WEAR_MONTHS = 48;
/** Renovation: cost as share of the value, months of building with lower rent, rent increase after. */
export const RENOVATION = { cost: 0.1, months: 3, vacancy: 0.2, rent: 0.06 } as const;
/** Selling: agent and notary as share of the value. */
export const SALE_COSTS = 0.03;
/** Early repayment fee per year of fixed rate left, at most PREPAY_MAX. */
export const PREPAY_PER_YEAR = 0.01;
export const PREPAY_MAX = 0.05;
export const ESTATE_DAYS = { buy: 2, sell: 1, renovate: 1 } as const;
/** Net worth from which the bank talks about property at all. */
export const ESTATE_WORTH = 400_000;
/** Career side goal: market value of investment property (penthouse excluded). */
export const MAGNATE_TIERS = [
  { name: "Bronze", value: 2_000_000 },
  { name: "Silber", value: 8_000_000 },
  { name: "Gold", value: 20_000_000 },
] as const;

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

function emptyEstate(): EstateState {
  return { offers: [], offersMonth: 0, owned: [], record: { bought: 0, sold: 0, refinanced: 0, topUps: 0, gains: 0 } };
}

export function estateOf(state: GameState): EstateState {
  state.wealth = state.wealth ?? {};
  if (!state.wealth.estate) state.wealth.estate = emptyEstate();
  return state.wealth.estate;
}

export function estateRead(state: GameState): EstateState {
  return state.wealth?.estate ?? emptyEstate();
}

export function ownsPenthouse(state: GameState): boolean {
  return estateRead(state).owned.some((p) => p.kind === "penthouse");
}

/** Office rent this month: nothing while the player works from the penthouse. */
export function officeRent(state: GameState): number {
  return ownsPenthouse(state) ? 0 : officeOf(state).rent;
}

// ---------------------------------------------------------------------------
// Bewertung und Kredit
// ---------------------------------------------------------------------------

/** Market value: the rent moves it, the market rate since purchase and the condition. */
export function propertyValue(p: Property, month: number): number {
  const def = KINDS[p.kind];
  const rateFactor = Math.max(0.5, 1 - def.rateSens * (marketRate(month) - p.rate0) * 100);
  const cond = COND_VALUE[p.condition]! / COND_VALUE[p.condition0]!;
  // Offices with many empty floors are worth less.
  const empty = p.kind === "gewerbe" ? Math.max(0, 1 - (p.occupancy ?? 1) - def.vacancy.normal) : 0;
  return Math.round(p.price * (p.rent / p.rent0) * rateFactor * cond * (1 - empty));
}

export function rateFor(state: GameState, kind: EstateKind, ltv: number, binding: Binding, month = state.month): number {
  const def = KINDS[kind];
  const over = Math.max(0, Math.ceil((ltv - 0.6 - 1e-9) / 0.05));
  const bank = contactOf(state, "bank");
  const discount = bank?.met && bank.warmth >= BANK_WARMTH ? BANK_DISCOUNT : 0;
  return Math.round((marketRate(month, binding) + def.spread + over * LTV_SURCHARGE - discount) * 10_000) / 10_000;
}

export function bankDiscount(state: GameState): { name: string; active: boolean } {
  const bank = contactOf(state, "bank");
  return { name: bank ? personOf(state, bank).name : "Deine Bank", active: !!bank?.met && bank.warmth >= BANK_WARMTH };
}

export function paymentOf(balance: number, rate: number): number {
  return Math.round((balance * (rate + REPAYMENT)) / 12);
}

/** Balance left after `months` of an annuity loan. */
export function balanceAfter(balance: number, rate: number, payment: number, months: number): number {
  let b = balance;
  for (let i = 0; i < months && b > 0; i++) b = Math.max(0, b + (b * rate) / 12 - payment);
  return Math.round(b);
}

export interface Financing {
  price: number;
  costs: number;
  loan: number;
  equity: number;
  /** Own money needed in total: equity plus costs. */
  cash: number;
  rate: number;
  payment: number;
  /** Monthly rent after typical vacancy, minus maintenance and the loan. */
  rentMonth: number;
  upkeepMonth: number;
  cashflow: number;
  /** Debt service coverage: net rent ÷ loan payment. */
  dscr: number | null;
  /** Rent ÷ price (gross yield) and price ÷ rent (multiplier). */
  grossYield: number;
  factor: number;
  /** Balance when the fixed rate ends and the cash flow if the rate is then two points higher. */
  rest: number;
  stressRate: number;
  stressCashflow: number;
}

export function maxLtv(kind: EstateKind): number {
  return KINDS[kind].maxLtv;
}

/** What a purchase would look like with this loan; also used by the page. */
export function financing(state: GameState, offer: Pick<EstateOffer, "kind" | "price" | "rent" | "city" | "condition">, ltvIn: number, binding: Binding): Financing {
  const def = KINDS[offer.kind];
  const ltv = Math.max(0, Math.min(def.maxLtv, ltvIn));
  const costs = Math.round(offer.price * estateCity(offer.city).costs);
  const loan = roundTo(offer.price * ltv, 1_000);
  const equity = offer.price - loan;
  const rate = rateFor(state, offer.kind, ltv, binding);
  const payment = loan > 0 ? paymentOf(loan, rate) : 0;
  const occupancy = 1 - def.vacancy.normal * COND_VACANCY[offer.condition]!;
  const rentMonth = offer.kind === "penthouse" ? 0 : Math.round((offer.rent / 12) * occupancy);
  const upkeepMonth = Math.round((offer.price * def.upkeep) / 12);
  const cashflow = rentMonth - upkeepMonth - payment;
  const rest = loan > 0 ? balanceAfter(loan, rate, payment, binding * 12) : 0;
  const stressRate = rate + 0.02;
  const stressCashflow = rentMonth - upkeepMonth - (rest > 0 ? paymentOf(rest, stressRate) : 0);
  return {
    price: offer.price,
    costs,
    loan,
    equity,
    cash: equity + costs,
    rate,
    payment,
    rentMonth,
    upkeepMonth,
    cashflow,
    dscr: payment > 0 ? (rentMonth - upkeepMonth) / payment : null,
    grossYield: offer.rent / offer.price,
    factor: offer.price / offer.rent,
    rest,
    stressRate,
    stressCashflow,
  };
}

/** Why the player cannot buy this kind of property now, or null. */
export function kindBlocker(state: GameState, kind: EstateKind, worth: number): string | null {
  const def = KINDS[kind];
  if (worth < def.worth) return `Die Bank finanziert ${ARTICLE[kind]} erst ab ${mio(def.worth)} Vermögen.`;
  if (state.reputation < def.reputation) return `Ein Penthouse dieser Lage verkauft man dir ab ${def.reputation} Ruf.`;
  if (kind === "penthouse" && ownsPenthouse(state)) return "Ein Penthouse hast du schon.";
  return null;
}

// ---------------------------------------------------------------------------
// Angebote
// ---------------------------------------------------------------------------

const ARTICLE: Record<EstateKind, string> = { wohnung: "eine Wohnung", mfh: "ein Mehrfamilienhaus", gewerbe: "Gewerbe", penthouse: "ein Penthouse" };

const OFFER_KINDS: EstateKind[] = ["wohnung", "wohnung", "mfh", "gewerbe", "penthouse"];

/** New listings each quarter, drawn from the seed: the same game shows the same houses. */
export function drawOffers(state: GameState, month: number): EstateOffer[] {
  const r = netRandom(state.seed, `estate|offers|${month}`);
  return OFFER_KINDS.map((kind, i) => {
    const def = KINDS[kind];
    const city = pickOf(r, ESTATE_CITIES);
    const district = pickOf(r, city.districts);
    const base = def.price[0] + r() * (def.price[1] - def.price[0]);
    const price = roundTo(base * city.price, kind === "wohnung" ? 5_000 : 25_000);
    const condition = 2 + Math.floor(r() * 4);
    const yieldBase = def.yield[0] + r() * (def.yield[1] - def.yield[0]);
    // Run-down houses are cheaper per euro of rent, new ones dearer.
    const gross = yieldBase * city.yield * (1 + (3 - condition) * 0.03);
    const units = def.units[0] + Math.floor(r() * (def.units[1] - def.units[0] + 1));
    const area = roundTo(def.area[0] + r() * (def.area[1] - def.area[0]), 5);
    return {
      id: `im${month}-${i}`,
      kind,
      name: `${pickOf(r, NAMES[kind])} ${district}`,
      city: city.id,
      district,
      price,
      rent: roundTo(price * gross, 100),
      condition,
      units,
      area,
      expires: month + 2,
    };
  }).sort((a, b) => a.price - b.price);
}

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------

export function buyProperty(ctx: Ctx, offerId: string, ltvIn: number, binding: Binding): void {
  const { state } = ctx;
  const estate = estateOf(state);
  const offer = estate.offers.find((o) => o.id === offerId);
  if (!offer || offer.expires < state.month) ctx.fail("Dieses Objekt ist nicht mehr auf dem Markt.");
  if (!BINDINGS.includes(binding)) ctx.fail("Diese Zinsbindung bietet die Bank nicht an.");
  const blocker = kindBlocker(state, offer.kind, ctx.worth());
  if (blocker) ctx.fail(blocker);
  const def = KINDS[offer.kind];
  if (ltvIn > def.maxLtv + 1e-9) ctx.fail(`Die Bank beleiht ein Objekt dieser Art höchstens zu ${Math.round(def.maxLtv * 100)} %.`);
  const f = financing(state, offer, ltvIn, binding);
  if (state.cash < f.cash) ctx.fail(`Dafür fehlt dir Eigenkapital: ${eur(f.cash)} nötig (Kaufpreis minus Darlehen plus Nebenkosten).`);
  ctx.spend("estate", `Kauf ${offer.name}`, ESTATE_DAYS.buy);
  state.cash -= f.cash;
  const loan: Mortgage | undefined = f.loan > 0 ? { balance: f.loan, rate: f.rate, payment: f.payment, binding, until: state.month + binding * 12 - 1 } : undefined;
  const p: Property = {
    id: ctx.id("im"),
    kind: offer.kind,
    name: offer.name,
    city: offer.city,
    district: offer.district,
    price: offer.price,
    costs: f.costs,
    bought: state.month,
    rent: offer.rent,
    rent0: offer.rent,
    condition: offer.condition,
    condition0: offer.condition,
    units: offer.units,
    area: offer.area,
    rate0: marketRate(state.month),
    loan,
    worn: state.month,
    occupancy: 1 - def.vacancy.normal,
    invested: f.cash,
  };
  estate.owned.push(p);
  estate.offers = estate.offers.filter((o) => o.id !== offer.id);
  estate.record.bought += 1;
  ctx.lesson("mietrendite");
  if (loan) {
    ctx.lesson("zinsbindung");
    ctx.lesson("beleihungsauslauf");
  }
  if (p.kind === "penthouse" && !estate.prestige) {
    estate.prestige = true;
    ctx.reputation(3);
  }
  ctx.mail({
    kind: "system",
    from: "Notariat",
    subject: `Gekauft: ${p.name}`,
    body:
      `${p.name} in ${estateCity(p.city).name} gehört dir. Kaufpreis ${eur(p.price)}, Nebenkosten ${eur(f.costs)}.` +
      (loan ? ` Die Bank leiht ${eur(loan.balance)} zu ${pct(loan.rate)} fest bis ${monthLabel(loan.until)}, Rate ${eur(loan.payment)} im Monat.` : " Ganz ohne Kredit bezahlt.") +
      (p.kind === "penthouse" ? " Ab jetzt arbeitest du von hier aus: keine Büromiete mehr." : ""),
  });
}

/** Early repayment fee for selling while the rate is still fixed. */
export function prepaymentFee(p: Property, month: number): number {
  if (!p.loan || p.loan.until < month) return 0;
  const years = Math.ceil((p.loan.until - month + 1) / 12);
  return Math.round(p.loan.balance * Math.min(PREPAY_MAX, years * PREPAY_PER_YEAR));
}

export interface SaleView {
  value: number;
  costs: number;
  fee: number;
  debt: number;
  proceeds: number;
  gain: number;
}

export function saleOf(p: Property, month: number): SaleView {
  const value = propertyValue(p, month);
  const costs = Math.round(value * SALE_COSTS);
  const fee = prepaymentFee(p, month);
  const debt = p.loan?.balance ?? 0;
  const proceeds = value - costs - fee - debt;
  return { value, costs, fee, debt, proceeds, gain: proceeds - p.invested };
}

export function sellProperty(ctx: Ctx, propertyId: string): void {
  const { state } = ctx;
  const estate = estateOf(state);
  const p = estate.owned.find((x) => x.id === propertyId);
  if (!p) ctx.fail("Dieses Objekt gehört dir nicht.");
  if (p.renovating !== undefined && p.renovating >= state.month) ctx.fail("Während der Sanierung findest du keinen Käufer zum vollen Preis. Warte, bis die Bauarbeiten fertig sind.");
  ctx.spend("estate", `Verkauf ${p.name}`, ESTATE_DAYS.sell);
  const sale = saleOf(p, state.month);
  state.cash += sale.proceeds;
  estate.owned = estate.owned.filter((x) => x.id !== p.id);
  estate.record.sold += 1;
  estate.record.gains += sale.gain;
  ctx.mail({
    kind: "system",
    from: "Notariat",
    subject: `Verkauft: ${p.name}`,
    body:
      `Verkauft für ${eur(sale.value)}. Makler und Notar ${eur(sale.costs)}${sale.debt > 0 ? `, Restschuld ${eur(sale.debt)}` : ""}${sale.fee > 0 ? `, Vorfälligkeitsentschädigung ${eur(sale.fee)} (die Zinsbindung lief noch)` : ""}. ` +
      `Dir bleiben ${eur(sale.proceeds)}, ${sale.gain >= 0 ? `${eur(sale.gain)} mehr` : `${eur(-sale.gain)} weniger`} als dein eingesetztes Geld.`,
  });
}

export function renovationCost(p: Property, month: number): number {
  return roundTo(propertyValue(p, month) * RENOVATION.cost, 1_000);
}

export function renovateProperty(ctx: Ctx, propertyId: string): void {
  const { state } = ctx;
  const p = estateOf(state).owned.find((x) => x.id === propertyId);
  if (!p) ctx.fail("Dieses Objekt gehört dir nicht.");
  if (p.renovating !== undefined && p.renovating >= state.month) ctx.fail("Hier wird schon gebaut.");
  if (p.condition >= 5) ctx.fail("Das Objekt ist neuwertig. Eine Sanierung bringt nichts.");
  const cost = renovationCost(p, state.month);
  if (state.cash < cost) ctx.fail(`Für die Sanierung fehlen dir ${eur(cost - state.cash)}.`);
  ctx.spend("estate", `Sanierung ${p.name}`, ESTATE_DAYS.renovate);
  state.cash -= cost;
  p.invested += cost;
  p.renovating = state.month + RENOVATION.months - 1;
}

// ---------------------------------------------------------------------------
// Monat
// ---------------------------------------------------------------------------

/** One month of property: rent, vacancy, maintenance, loans, refinancing, wear, offers, rate news. */
export function estateMonth(ctx: Ctx, month: number, income: IncomeLines, notes: string[]): void {
  const { state } = ctx;
  announceRates(ctx, month, notes);
  const current = state.wealth?.estate;
  if (!current && ctx.worth() < ESTATE_WORTH) return;
  const estate = estateOf(state);
  // New listings at the start of each quarter, and whenever the list ran out.
  const next = month + 1;
  if (ctx.worth() >= ESTATE_WORTH && (next % 3 === 1 || estate.offers.length === 0 || estate.offersMonth === 0)) {
    if (estate.offersMonth !== next) {
      estate.offers = drawOffers(state, next);
      estate.offersMonth = next;
    }
  }
  estate.offers = estate.offers.filter((o) => o.expires >= next);
  let flow = 0;
  for (const p of estate.owned) {
    const def = KINDS[p.kind];
    const r = netRandom(state.seed, `estate|${p.id}|${month}`);
    const building = p.renovating !== undefined && p.renovating >= month;
    const vacancy = Math.max(0, Math.min(0.6, def.vacancy[state.market.regime] * COND_VACANCY[p.condition]! + (r() - 0.5) * def.noise + (building ? RENOVATION.vacancy : 0)));
    p.occupancy = p.kind === "penthouse" ? 1 : 1 - vacancy;
    const rent = p.kind === "penthouse" ? 0 : (p.rent / 12) * p.occupancy;
    const value = propertyValue(p, month);
    const upkeep = ((value * def.upkeep) / 12) * (p.condition <= 2 ? 1.3 : 1);
    let pay = 0;
    if (p.loan) {
      const interest = (p.loan.balance * p.loan.rate) / 12;
      pay = Math.min(p.loan.payment, p.loan.balance + interest);
      p.loan.balance = Math.max(0, Math.round(p.loan.balance + interest - pay));
    }
    flow += rent - upkeep - pay;
    p.rent = p.rent * Math.pow(1 + def.growth, 1 / 12);
    if (building && p.renovating === month) {
      p.condition = Math.min(5, p.condition + 1);
      p.rent *= 1 + RENOVATION.rent;
      p.worn = month;
      delete p.renovating;
      notes.push(`${p.name}: Die Sanierung ist fertig. Zustand jetzt ${CONDITION_LABEL[p.condition]}, die Miete steigt um ${Math.round(RENOVATION.rent * 100)} %.`);
    } else if (month - (p.worn ?? p.bought) >= WEAR_MONTHS && p.condition > 1) {
      p.condition -= 1;
      p.worn = month;
      notes.push(`${p.name}: Die Jahre zeigen Spuren. Zustand jetzt ${CONDITION_LABEL[p.condition]}, Leerstand und Instandhaltung steigen.`);
    }
    if (p.loan) refinance(ctx, p, month, notes);
  }
  if (estate.owned.length > 0 || flow !== 0) {
    state.cash += flow;
    income.estate = Math.round((income.estate ?? 0) + flow);
  }
  hostEvening(ctx, month, notes);
}

function refinance(ctx: Ctx, p: Property, month: number, notes: string[]): void {
  const { state } = ctx;
  const loan = p.loan!;
  if (loan.balance <= 1) {
    delete p.loan;
    notes.push(`${p.name}: Das Darlehen ist abbezahlt.`);
    return;
  }
  if (!loan.warned && loan.until - month <= 6) {
    loan.warned = true;
    const expected = rateFor(state, p.kind, loan.balance / propertyValue(p, month), loan.binding, month);
    ctx.mail({
      kind: "system",
      from: bankDiscount(state).name,
      subject: `Zinsbindung endet: ${p.name}`,
      body: `Die Zinsbindung für ${p.name} endet ${monthLabel(loan.until)}. Heute läge der Anschlusszins bei ${pct(expected)} (bisher ${pct(loan.rate)}). Restschuld dann etwa ${eur(balanceAfter(loan.balance, loan.rate, loan.payment, loan.until - month))}. Steigt der Beleihungsauslauf über ${Math.round(KINDS[p.kind].maxLtv * 100)} %, verlangen wir eine Sondertilgung.`,
    });
  }
  if (month < loan.until) return;
  const value = propertyValue(p, month + 1);
  const limit = Math.round(value * KINDS[p.kind].maxLtv);
  const record = estateOf(state).record;
  if (loan.balance > limit) {
    const topUp = loan.balance - limit;
    state.cash -= topUp;
    p.invested += topUp;
    loan.balance = limit;
    record.topUps += 1;
    notes.push(`${p.name}: Der Wert reicht der Bank nicht mehr. Sondertilgung von ${eur(topUp)} vor der Anschlussfinanzierung.`);
  }
  const before = loan.rate;
  loan.rate = rateFor(state, p.kind, loan.balance / value, loan.binding, month + 1);
  loan.payment = paymentOf(loan.balance, loan.rate);
  loan.until = month + loan.binding * 12;
  loan.warned = false;
  record.refinanced += 1;
  ctx.lesson("zinsbindung");
  notes.push(`${p.name}: Anschlussfinanzierung zu ${pct(loan.rate)} (bisher ${pct(before)}), neue Rate ${eur(loan.payment)} im Monat, fest bis ${monthLabel(loan.until)}.`);
}

/** Rate news: the central bank hints at a turn months ahead, and the turn begins. */
function announceRates(ctx: Ctx, month: number, notes: string[]): void {
  const { state } = ctx;
  const next = month + 1;
  const turn = nextTurn(month);
  const started = turn.month === next ? turn : null;
  const announce = turn.month - next === RATE_ANNOUNCE ? turn : null;
  const publish = (title: string, text: string) => {
    state.news.unshift({ month, title, text, startupIds: [] });
    if (state.news.length > 24) state.news.length = 24;
    notes.push(`Nachrichten: ${title}.`);
    ctx.mail({ kind: "news", from: "Wirtschaftsblatt", subject: title, body: text });
  };
  if (announce) {
    const target = marketRate(turn.month + 12);
    publish(
      announce.up ? "Notenbank deutet Zinswende an" : "Notenbank stellt Zinssenkungen in Aussicht",
      `Ab ${monthLabel(turn.month)} will die Notenbank die Zinsen ${announce.up ? "anheben" : "senken"}, in vier Schritten über ein Jahr. Hypotheken mit zehn Jahren Bindung kosten heute ${pct(marketRate(month))}, danach eher ${pct(target)}. ${announce.up ? "Wer jetzt lange festschreibt, sichert sich den alten Zins." : "Wer jetzt kurz festschreibt, profitiert früher von den Senkungen."}`,
    );
  } else if (started) {
    publish(
      started.up ? "Die Zinswende beginnt" : "Die Zinsen sinken wieder",
      `Die Notenbank ${started.up ? "erhöht" : "senkt"} den Leitzins. Neue Hypotheken mit zehn Jahren Bindung kosten jetzt ${pct(marketRate(next))}. Weitere Schritte folgen bis ${monthLabel(started.month + 9)}.`,
    );
  }
}

/** Once a year the penthouse hosts an evening: a little reputation, warmer contacts. */
function hostEvening(ctx: Ctx, month: number, notes: string[]): void {
  const { state } = ctx;
  if (!ownsPenthouse(state) || (month + 1) % 12 !== 4) return;
  const guests = state.contacts
    .filter((c) => c.met && c.warmth < 95)
    .sort((a, b) => b.warmth - a.warmth)
    .slice(0, 3);
  for (const c of guests) c.warmth = Math.min(100, c.warmth + 5);
  ctx.reputation(1);
  notes.push(`Neujahrsempfang in deinem Penthouse: ${guests.length > 0 ? `${guests.map((c) => personOf(state, c).name).join(", ")} und andere kommen.` : "Gäste aus der Stadt kommen."} Etwas mehr Ruf.`);
}

// ---------------------------------------------------------------------------
// Kennzahlen
// ---------------------------------------------------------------------------

export interface EstateTotals {
  value: number;
  debt: number;
  equity: number;
  rentMonth: number;
  investValue: number;
  units: number;
  count: number;
}

export function estateTotals(state: GameState): EstateTotals {
  const owned = estateRead(state).owned;
  let value = 0;
  let debt = 0;
  let rentMonth = 0;
  let investValue = 0;
  let units = 0;
  for (const p of owned) {
    const v = propertyValue(p, state.month);
    value += v;
    debt += p.loan?.balance ?? 0;
    if (p.kind !== "penthouse") {
      rentMonth += (p.rent / 12) * (p.occupancy ?? 1);
      investValue += v;
      units += p.units;
    }
  }
  return { value, debt, equity: value - debt, rentMonth: Math.round(rentMonth), investValue, units, count: owned.length };
}

/** Value minus loans: what the property adds to the net worth. */
export function estateEquity(state: GameState): number {
  if (!state.wealth?.estate || state.wealth.estate.owned.length === 0) return 0;
  return estateTotals(state).equity;
}

/** Tier reached on the side goal "Immobilien-Magnat" (-1 = none). */
export function magnateTier(state: GameState): number {
  const value = estateTotals(state).investValue;
  let tier = -1;
  MAGNATE_TIERS.forEach((t, i) => {
    if (value >= t.value) tier = i;
  });
  return tier;
}

export const pct = (r: number) => `${(r * 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
