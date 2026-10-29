import { careerOf } from "./career";
import { monthLabel } from "./config";
import { daysLeft, netWorth } from "./engine";
import {
  announcedTurn,
  bankDiscount,
  BINDINGS,
  CONDITION_LABEL,
  ESTATE_DAYS,
  ESTATE_WORTH,
  estateCity,
  estateRead,
  estateTotals,
  financing,
  kindBlocker,
  KINDS,
  MAGNATE_TIERS,
  magnateTier,
  marketRate,
  maxLtv,
  ownsPenthouse,
  propertyValue,
  renovationCost,
  saleOf,
  type Financing,
} from "./estate";
import {
  CHARTER,
  COUNCIL_DAYS,
  councilQuestion,
  DYNASTY,
  dynastyRead,
  handoverChecks,
  HEIRS,
  heirInCharge,
  monthsToReady,
  STRATEGIES,
  type CharterDef,
  type CouncilQuestion,
  type HeirDef,
  type StrategyDef,
} from "./dynasty";
import { allowanceLeft, FOUNDATION, FOUNDATION_AMOUNTS, foundationBlocker, FUND_FAMILY_AUM, legacyOf, managedAssets, PURPOSES, taxRefund, type Legacy, type ManagedAssets, type PurposeDef } from "./legacy";
import { officeOf } from "./office";
import type { GameState } from "./types";
import type { NextStepView, Requirement } from "./views";
import type { Binding, DynastyState, EstateKind, EstateOffer, FoundationState, LegacyPoint, Property } from "./wealth-types";

// Was die Seiten Immobilien und Stiftung & Dynastie anzeigen. Reine Daten,
// damit Server und Browser dieselben Zahlen sehen.

// ---------------------------------------------------------------------------
// Immobilien
// ---------------------------------------------------------------------------

export interface OfferView extends EstateOffer {
  label: string;
  cityName: string;
  image: string;
  conditionLabel: string;
  maxLtv: number;
  costsShare: number;
  blocker: string | null;
  /** Financing with the bank's standard: the highest loan, ten years fixed. */
  standard: Financing;
  /** Rate for every fixed period at the highest loan. */
  rates: Record<Binding, number>;
  /** Every loan the panel offers: loan-to-value in steps of 10 points (and the maximum) × fixed period. */
  options: { ltv: number; binding: Binding; f: Financing }[];
}

export interface PropertyView {
  id: string;
  kind: EstateKind;
  label: string;
  name: string;
  cityName: string;
  image: string;
  value: number;
  bought: string;
  price: number;
  debt: number;
  ltv: number | null;
  maxLtv: number;
  rate: number | null;
  payment: number;
  until: string | null;
  monthsLeft: number | null;
  /** Rate if refinanced today. */
  rateToday: number | null;
  rentMonth: number;
  upkeepMonth: number;
  cashflow: number;
  occupancy: number;
  condition: number;
  conditionLabel: string;
  renovating: string | null;
  renovationCost: number;
  units: number;
  area: number;
  sale: ReturnType<typeof saleOf>;
}

export interface RatePoint {
  month: number;
  label: string;
  rate: number;
  future: boolean;
}

export interface EstatePageView {
  unlocked: boolean;
  unlockText: string;
  worth: number;
  cash: number;
  daysLeft: number;
  days: typeof ESTATE_DAYS;
  rate: { now: number; byBinding: Record<Binding, number>; turn: { month: string; up: boolean; target: number } | null; bank: { name: string; active: boolean } };
  totals: ReturnType<typeof estateTotals> & { cashflowMonth: number };
  offers: OfferView[];
  owned: PropertyView[];
  path: RatePoint[];
  magnate: { tier: number; tiers: { name: string; value: number }[]; value: number };
  penthouse: { owned: boolean; rentSaved: number; office: string };
  record: ReturnType<typeof estateRead>["record"];
}

/** Loan-to-value steps the purchase panel offers. */
export function ltvSteps(max: number): number[] {
  const steps: number[] = [];
  for (let i = 0; i * 0.1 <= max + 1e-9; i++) steps.push(Math.round(i * 10) / 100);
  if (Math.abs(steps.at(-1)! - max) > 1e-9) steps.push(max);
  return steps;
}

function propertyView(state: GameState, p: Property): PropertyView {
  const def = KINDS[p.kind];
  const value = propertyValue(p, state.month);
  const rentMonth = p.kind === "penthouse" ? 0 : Math.round((p.rent / 12) * (p.occupancy ?? 1));
  const upkeepMonth = Math.round(((value * def.upkeep) / 12) * (p.condition <= 2 ? 1.3 : 1));
  const city = estateCity(p.city);
  const loan = p.loan;
  return {
    id: p.id,
    kind: p.kind,
    label: def.label,
    name: p.name,
    cityName: city.name,
    image: city.image,
    value,
    bought: monthLabel(p.bought),
    price: p.price,
    debt: loan?.balance ?? 0,
    ltv: loan ? loan.balance / value : null,
    maxLtv: def.maxLtv,
    rate: loan?.rate ?? null,
    payment: loan?.payment ?? 0,
    until: loan ? monthLabel(loan.until) : null,
    monthsLeft: loan ? loan.until - state.month + 1 : null,
    rateToday: loan ? marketRate(state.month, loan.binding) + def.spread : null,
    rentMonth,
    upkeepMonth,
    cashflow: rentMonth - upkeepMonth - (loan?.payment ?? 0),
    occupancy: p.occupancy ?? 1,
    condition: p.condition,
    conditionLabel: CONDITION_LABEL[p.condition] ?? "",
    renovating: p.renovating !== undefined && p.renovating >= state.month ? monthLabel(p.renovating) : null,
    renovationCost: renovationCost(p, state.month),
    units: p.units,
    area: p.area,
    sale: saleOf(p, state.month),
  };
}

export function estatePage(state: GameState): EstatePageView {
  const worth = netWorth(state);
  const estate = estateRead(state);
  const totals = estateTotals(state);
  const owned = estate.owned.map((p) => propertyView(state, p));
  const turn = announcedTurn(state.month);
  const byBinding = Object.fromEntries(BINDINGS.map((b) => [b, marketRate(state.month, b)])) as Record<Binding, number>;
  const offers: OfferView[] = estate.offers
    .filter((o) => o.expires >= state.month)
    .map((o) => {
      const city = estateCity(o.city);
      const max = maxLtv(o.kind);
      return {
        ...o,
        label: KINDS[o.kind].label,
        cityName: city.name,
        image: city.image,
        conditionLabel: CONDITION_LABEL[o.condition] ?? "",
        maxLtv: max,
        costsShare: city.costs,
        blocker: kindBlocker(state, o.kind, worth),
        standard: financing(state, o, max, 10),
        rates: Object.fromEntries(BINDINGS.map((b) => [b, financing(state, o, max, b).rate])) as Record<Binding, number>,
        options: ltvSteps(max).flatMap((ltv) => BINDINGS.map((binding) => ({ ltv, binding, f: financing(state, o, ltv, binding) }))),
      };
    });
  // The rate path: three years back, and as far ahead as the news reach.
  const path: RatePoint[] = [];
  const end = turn ? turn.month + 12 : state.month;
  for (let m = Math.max(1, state.month - 36); m <= end; m++) path.push({ month: m, label: monthLabel(m), rate: marketRate(m), future: m > state.month });
  return {
    unlocked: worth >= ESTATE_WORTH || estate.owned.length > 0,
    unlockText: `Ab ${ESTATE_WORTH.toLocaleString("de-DE")} € Vermögen spricht die Bank mit dir über Immobilien.`,
    worth,
    cash: state.cash,
    daysLeft: daysLeft(state),
    days: ESTATE_DAYS,
    rate: {
      now: marketRate(state.month),
      byBinding,
      turn: turn ? { month: monthLabel(turn.month), up: turn.up, target: marketRate(turn.month + 12) } : null,
      bank: bankDiscount(state),
    },
    totals: { ...totals, cashflowMonth: owned.reduce((s, p) => s + p.cashflow, 0) },
    offers,
    owned,
    path,
    magnate: { tier: magnateTier(state), tiers: MAGNATE_TIERS.map((t) => ({ ...t })), value: totals.investValue },
    penthouse: { owned: ownsPenthouse(state), rentSaved: ownsPenthouse(state) ? officeOf(state).rent : 0, office: officeOf(state).name },
    record: estate.record,
  };
}

/** Financing for the purchase panel, computed again in the browser when the player moves the sliders. */
export function previewFinancing(state: GameState, offer: Pick<EstateOffer, "kind" | "price" | "rent" | "city" | "condition">, ltv: number, binding: Binding): Financing {
  return financing(state, offer, ltv, binding);
}

// ---------------------------------------------------------------------------
// Lebenswerk, Stiftung, Dynastie
// ---------------------------------------------------------------------------

export interface LegacyPageView {
  worth: number;
  cash: number;
  daysLeft: number;
  reputation: number;
  familyOffice: boolean;
  legacy: Legacy;
  /** Change since the first point of the current year. */
  yearChange: number | null;
  history: (LegacyPoint & { label: string })[];
  aum: ManagedAssets & { target: number; peak: number };
  ladder: { title: string; requirement: string; done: boolean; next: boolean; tier?: string }[];
  career: string;
  foundation: {
    state: FoundationState | null;
    blocker: string | null;
    amounts: readonly number[];
    purposes: PurposeDef[];
    allowanceLeft: number;
    refund: Record<number, number>;
    rules: typeof FOUNDATION;
    yearGrant: number;
  };
  dynasty: {
    state: DynastyState;
    heirs: (HeirDef & { lost: boolean })[];
    heir: (HeirDef & { maturity: number; since: string; stalledUntil: string | null; daysThisMonth: number; readyIn: { one: number | null; two: number | null; three: number | null } }) | null;
    charter: (CharterDef & { signed: boolean })[];
    council: CouncilQuestion | null;
    councilDays: number;
    checks: Requirement[];
    ready: boolean;
    inCharge: HeirDef | null;
    handedOver: string | null;
    strategies: StrategyDef[];
    rules: typeof DYNASTY;
  };
}

export function legacyPage(state: GameState): LegacyPageView {
  const worth = netWorth(state);
  const legacy = legacyOf(state, worth);
  const points = state.wealth?.legacy ?? [];
  const yearStart = points.find((p) => p.month >= state.month - ((state.month + 8) % 12));
  const career = careerOf(state);
  const lastMain = career.steps.findIndex((s) => s.title === "Plattform-Investor");
  const next = career.steps.find((s) => !s.done && !s.side);
  const f = state.wealth?.foundation ?? null;
  const d = dynastyRead(state);
  const heir = d.heir;
  const heirDef = heir ? HEIRS[heir.kind] : null;
  const checks = handoverChecks(state);
  const aum = managedAssets(state, worth);
  return {
    worth,
    cash: state.cash,
    daysLeft: daysLeft(state),
    reputation: state.reputation,
    familyOffice: state.familyOffice !== undefined,
    legacy,
    yearChange: yearStart ? legacy.total - yearStart.value : null,
    history: points.map((p) => ({ ...p, label: monthLabel(p.month) })),
    aum: { ...aum, target: FUND_FAMILY_AUM, peak: state.wealth?.aumPeak ?? 0 },
    ladder: career.steps.slice(Math.max(0, lastMain - 2)).filter((s) => !s.side).map((s) => ({ title: s.title, requirement: s.requirement, done: s.done, next: s === next, tier: s.tier })),
    career: career.title,
    foundation: {
      state: f,
      blocker: foundationBlocker(state, worth),
      amounts: FOUNDATION_AMOUNTS,
      purposes: Object.values(PURPOSES),
      allowanceLeft: allowanceLeft(state),
      refund: Object.fromEntries(FOUNDATION_AMOUNTS.map((a) => [a, taxRefund(state, a)])),
      rules: FOUNDATION,
      yearGrant: Math.round((f?.capital ?? 0) * FOUNDATION.yield),
    },
    dynasty: {
      state: d,
      heirs: Object.values(HEIRS).map((h) => ({ ...h, lost: d.lost.includes(h.kind) })),
      heir:
        heir && heirDef
          ? {
              ...heirDef,
              maturity: heir.maturity,
              since: monthLabel(heir.chosen),
              stalledUntil: heir.stalled !== undefined ? monthLabel(heir.stalled) : null,
              daysThisMonth: heir.days,
              readyIn: { one: monthsToReady(heir, 1), two: monthsToReady(heir, 2), three: monthsToReady(heir, 3) },
            }
          : null,
      charter: CHARTER.map((c) => ({ ...c, signed: d.charter.includes(c.id) })),
      council: councilQuestion(state),
      councilDays: COUNCIL_DAYS,
      checks,
      ready: checks.every((c) => c.done),
      inCharge: heirInCharge(state),
      handedOver: d.handedOver !== undefined ? monthLabel(d.handedOver) : null,
      strategies: Object.values(STRATEGIES),
      rules: DYNASTY,
    },
  };
}

/** The office's "next step" card for the new career steps. */
export function wealthNextStep(state: GameState, title: string): NextStepView | null {
  const worth = netWorth(state);
  const mio = (n: number) => `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €`;
  switch (title) {
    case "Stifter/in":
      return {
        title,
        text: "Eine gemeinnützige Stiftung: Das Kapital bleibt für immer, der Ertrag fördert Menschen. Bringt Ruf und einen Steuervorteil, aber das Geld kommt nie zurück.",
        requirements: [
          { label: "Family Office gegründet", done: state.familyOffice !== undefined },
          { label: `${FOUNDATION.reputation} Ruf (du: ${state.reputation})`, done: state.reputation >= FOUNDATION.reputation },
          { label: `${mio(FOUNDATION.worth)} Vermögen (du: ${mio(worth)})`, done: worth >= FOUNDATION.worth },
          { label: `${mio(FOUNDATION.minCapital)} auf dem Konto für das Grundstockvermögen`, done: state.cash >= FOUNDATION.minCapital + FOUNDATION.cost },
        ],
        link: { href: "/stiftung", label: "Zur Stiftung" },
      };
    case "Lebenswerk": {
      const checks = handoverChecks(state);
      return {
        title,
        text: "Bau eine Nachfolge auf und übergib das Family Office. Danach führt sie das Tagesgeschäft, du verwaltest das Familienvermögen.",
        requirements: checks,
        link: { href: "/stiftung", label: "Zur Dynastie" },
      };
    }
    case "Fondsfamilie": {
      const aum = managedAssets(state, worth);
      return {
        title,
        text: "Eine Familie von Fonds: 1 Mrd. € verwaltetes Vermögen aus Family Office, eigenen Fonds mit dem Geld der Investoren und Stiftung.",
        requirements: [
          { label: "Eigener Fonds aufgelegt", done: state.fund !== undefined },
          { label: `${mio(FUND_FAMILY_AUM)} verwaltetes Vermögen (heute ${mio(aum.total)})`, done: aum.total >= FUND_FAMILY_AUM },
        ],
        link: { href: "/stiftung", label: "Zum Lebenswerk" },
      };
    }
    default:
      return null;
  }
}
