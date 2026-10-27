import { annualEbitda, ebitdaEquityValue, enterpriseValue, fairMultiple, qualityFactor, sizeMultiple } from "./ebitda";
import { annuityOf, bankRate, expectedEarnout, mnaRandom, netLeverage, syncDebt } from "./lbo";
import { BANK_MAX_LEVERAGE, BANK_YEARS, EBITDA_GROWTH_CAP, MULTIPLE_GROWTH_CAP, MULTIPLE_PER_GROWTH_POINT, VENDOR_MONTHS } from "./mna-config";
import { eur, mio, roundTo, times, type Ctx } from "./mna-core";
import { INTERIM } from "./network-config";
import { applyDelta } from "./sim";
import type { ResolvedOutcome } from "./templates";
import type { Delta, GameState, LeverId, Metrics, Startup } from "./types";

export type { LeverId };

// Eigene Mittelstandsfirmen: Was ihren Wert treibt, warum er sich bewegt, und
// was der Mehrheitsgesellschafter tun kann, wenn es mehrere Monate schlecht
// läuft. Die Hebel sind bewusst wenige und klar: Führung, Kosten, Preise,
// Vertrieb, gebundenes Geld und die Finanzierung.

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const pctText = (v: number, digits = 0) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toLocaleString("de-DE", { maximumFractionDigits: digits })} %`;
const mioText = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v) >= 1_000_000 ? mio(Math.abs(v)) : `${Math.round(Math.abs(v) / 1000).toLocaleString("de-DE")} Tsd. €`}`;

export const isFamily = (s: Startup) => s.metrics.valuedOn === "ebitda";

// ---------------------------------------------------------------------------
// Beiratsvorlagen: Startup-Themen passen nicht zum Familienbetrieb
// ---------------------------------------------------------------------------

/** Topics of the startup board that make no sense in a family business (rounds, options, pivots, office moves). */
export const STARTUP_ONLY_TEMPLATES = new Set([
  "expansion",
  "marketing",
  "freemium",
  "second_product",
  "pivot",
  "bridge",
  "seed_round",
  "bank_loan",
  "acquisition",
  "cost_cut",
  "esop",
  "cto_leaves",
  "office",
  "feature",
  "privacy",
]);

/** Topics written for the old majority purchase that do not fit a company bought with debt: add-ons go through the platform. */
export const LBO_EXCLUDED_TEMPLATES = new Set(["m_zukauf"]);

/**
 * A family business is a tanker: a decision moves revenue, margin and growth
 * less than in a young startup. Applied to the generic board topics (the
 * Mittelstand topics are written for family businesses already).
 */
export type FamilyScale = { revenuePct: number; grossMargin: number; growth: number; topCustomer: number };
export const FAMILY_TEMPLATE_SCALE: FamilyScale = { revenuePct: 0.25, grossMargin: 0.5, growth: 0.25, topCustomer: 0.6 };
/** The Mittelstand topics (m_) were written for the old majority purchase valued on revenue: for a business valued on EBITDA their moves are halved. */
export const FAMILY_THEME_SCALE: FamilyScale = { revenuePct: 0.5, grossMargin: 0.6, growth: 0.5, topCustomer: 1 };

export function familyDelta(d: Delta, scale: FamilyScale = FAMILY_TEMPLATE_SCALE): Delta {
  const out: Delta = { ...d };
  for (const key of Object.keys(scale) as (keyof FamilyScale)[]) {
    if (d[key] !== undefined) out[key] = d[key]! * scale[key];
  }
  // Family businesses do not hand out options or new shares on a board decision.
  if (out.dilution) delete out.dilution;
  if (out.dilutionTo) delete out.dilutionTo;
  return out;
}

export function familyOutcome(r: ResolvedOutcome, s: Startup, scale: FamilyScale = FAMILY_TEMPLATE_SCALE): ResolvedOutcome {
  if (!isFamily(s)) return r;
  return {
    effects: r.effects.map((e) => ({ ...e, delta: familyDelta(e.delta, scale) })),
    ...(r.risk ? { risk: { ...r.risk, good: familyDelta(r.risk.good, scale), bad: familyDelta(r.risk.bad, scale) } } : {}),
  };
}

// ---------------------------------------------------------------------------
// Netzwerk: klassische Kontakte helfen auch im Mittelstand
// ---------------------------------------------------------------------------

/** What a classic contact does in a family business: same idea as for a startup, scaled to EBITDA. */
export function familyIntroDelta(contactId: string, s: Startup): Delta | null {
  const m = s.metrics;
  switch (contactId) {
    case "steuer":
      return { axes: { finance: 10 }, opex: -m.opex * 0.01 };
    case "vertrieb":
      return { revenuePct: 0.02, topCustomer: -0.05, axes: { market: 4 } };
    case "anwalt":
      return { trust: 6, axes: { management: 4 } };
    case "recruiter":
      return { axes: { management: 10 }, morale: 4 };
    case "growth":
      return { growth: 0.002, axes: { market: 5 } };
    case "einkauf":
      return { revenuePct: 0.05, topCustomer: 0.1, axes: { market: 3 } };
  }
  return null;
}

/** Why a classic contact would help this family business now, or null. */
export function familyNeed(contactId: string, s: Startup): string | null {
  const m = s.metrics;
  switch (contactId) {
    case "steuer":
      return m.axes.finance < 60 ? `Controlling schwach (${Math.round(m.axes.finance)}/100), ein paar Kosten sind zu viel.` : null;
    case "vertrieb":
      return m.topCustomer > 0.3
        ? `Klumpenrisiko: größter Kunde ${Math.round(m.topCustomer * 100)} %.`
        : m.axes.market < 50
          ? `Markt schwach (${Math.round(m.axes.market)}/100).`
          : null;
    case "anwalt":
      return m.trust < 55 ? `Vertrauen der Geschäftsführung bröckelt (${Math.round(m.trust)}/100).` : null;
    case "recruiter":
      return m.axes.management < 60 ? `Führung schwach (${Math.round(m.axes.management)}/100): eine starke zweite Ebene fehlt.` : null;
    case "growth":
      return m.growth < 0.001 ? "Der Umsatz tritt auf der Stelle." : null;
    case "einkauf":
      return m.topCustomer < 0.25 && m.axes.market < 65 ? "Ein Großkunde brächte viel Umsatz, aber auch Abhängigkeit." : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Werttreiber und Begründung im Monatsbericht
// ---------------------------------------------------------------------------

export interface ValueParts {
  ebitda: number;
  /** Effective multiple: enterprise value per euro of EBITDA (0 without profit). */
  multiple: number;
  ev: number;
  /** Cash beyond two months of costs: belongs to the owners. */
  excessCash: number;
  /** Bank, vendor loans and the earn-out as far as it is likely to be owed. */
  debt: number;
  equity: number;
  /** The profit is so thin that only the substance (a share of revenue) carries the value. */
  substance: boolean;
}

export function valueParts(m: Metrics): ValueParts {
  const ebitda = annualEbitda(m);
  const ev = enterpriseValue(m);
  const excessCash = Math.max(0, m.cash - 2 * m.opex);
  const debt = m.debt + (m.acqDebt ?? 0);
  const substance = ebitda <= 0 || ebitda * fairMultiple(m) < ev - 1;
  return { ebitda, multiple: substance ? 0 : ev / ebitda, ev, excessCash, debt, equity: ebitdaEquityValue(m), substance };
}

/** Why the multiple moved: growth, size or quality (the largest of the three). */
function multipleReason(before: Metrics, after: Metrics): string {
  const growth = (m: Metrics) => clamp(m.growth * 100 * MULTIPLE_PER_GROWTH_POINT, MULTIPLE_GROWTH_CAP[0], MULTIPLE_GROWTH_CAP[1]);
  const g = growth(after) - growth(before);
  const size = sizeMultiple(annualEbitda(after)) - sizeMultiple(annualEbitda(before));
  const quality = (qualityFactor(after) - qualityFactor(before)) * fairMultiple(before);
  const pick = [
    { v: g, up: "weil das Wachstum anzieht", down: "weil das Wachstum nachlässt" },
    { v: size, up: "weil die Firma größer wird", down: "weil das EBITDA kleiner ist (kleine Firmen kosten weniger je Euro Ertrag)" },
    {
      v: quality,
      up: "weil Zahlen und Kundenbasis solider sind",
      down: after.topCustomer > before.topCustomer ? "weil ein Großkunde mehr Gewicht hat" : "weil die Finanzen unsauberer sind",
    },
  ].sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0]!;
  return pick.v >= 0 ? pick.up : pick.down;
}

/** Why the EBITDA moved: revenue, gross margin or running costs. */
function ebitdaReason(before: Metrics, after: Metrics): string {
  const rev = (after.revenue - before.revenue) * before.grossMargin;
  const gm = (after.grossMargin - before.grossMargin) * after.revenue;
  const cost = -(after.opex - before.opex);
  const parts = [
    { v: rev, text: `Umsatz ${pctText(after.revenue / Math.max(1, before.revenue) - 1, 1)}` },
    {
      v: gm,
      text: `Rohmarge ${after.grossMargin >= before.grossMargin ? "+" : "−"}${Math.abs((after.grossMargin - before.grossMargin) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Punkte`,
    },
    { v: cost, text: `Kosten ${pctText(after.opex / Math.max(1, before.opex) - 1, 1)}` },
  ]
    .filter((p) => Math.abs(p.v) > 0.0005 * Math.max(1, before.revenue))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 2);
  return parts.length > 0 ? parts.map((p) => p.text).join(", ") : "kleine Schwankung";
}

/**
 * One short line for the monthly report: by how much and why the equity value
 * of a family business changed (EBITDA, multiple, debt, cash). Null when the
 * change is small.
 */
export function explainValueChange(before: Metrics, after: Metrics, extra: { payout?: number } = {}): string | null {
  const a = valueParts(before);
  const b = valueParts(after);
  const delta = b.equity - a.equity;
  if (Math.abs(delta) < Math.max(50_000, 0.03 * Math.max(1, a.equity))) return null;
  const parts: { v: number; text: string }[] = [];
  if (!a.substance && !b.substance) {
    parts.push({ v: (b.ebitda - a.ebitda) * a.multiple, text: `EBITDA ${pctText(b.ebitda / a.ebitda - 1)} (${ebitdaReason(before, after)})` });
    parts.push({ v: b.ebitda * (b.multiple - a.multiple), text: `Multiple ${times(a.multiple)} → ${times(b.multiple)}, ${multipleReason(before, after)}` });
  } else {
    parts.push({
      v: b.ev - a.ev,
      text: b.substance
        ? `${b.ebitda <= 0 ? "kein operativer Gewinn mehr" : "kaum noch operativer Gewinn"} (${ebitdaReason(before, after)}): bewertet wird nur die Substanz`
        : `wieder operativer Gewinn (${ebitdaReason(before, after)})`,
    });
  }
  const debt = b.debt - a.debt;
  if (Math.abs(debt) > 1000)
    parts.push({
      v: -debt,
      text:
        debt < 0
          ? `Schulden ${mioText(debt)} (Tilgung oder ein Earn-out, dessen Ziel wackelt)`
          : `Schulden ${mioText(debt)} (neue Kredite oder ein Earn-out, dessen Ziel wieder erreichbar ist)`,
    });
  const cash = b.excessCash - a.excessCash;
  if (Math.abs(cash) > 1000) parts.push({ v: cash, text: `freie Kasse ${mioText(cash)}${extra.payout && cash < 0 ? " (Ausschüttung an die Gesellschafter)" : ""}` });
  const main = parts
    .filter((p) => Math.abs(p.v) >= Math.abs(delta) * 0.15 || Math.abs(p.v) >= 100_000)
    .sort((x, y) => Math.abs(y.v) - Math.abs(x.v))
    .slice(0, 3);
  if (main.length === 0) return null;
  return `Wert ${mioText(delta)}: ${main.map((p) => p.text).join("; ")}.`;
}

// ---------------------------------------------------------------------------
// Hebel für eigene Mittelstandsfirmen
// ---------------------------------------------------------------------------

export const LEVER_IDS: LeverId[] = ["interim", "ceo", "costs", "pricing", "sales", "workingCapital", "refinance", "earnout"];

/** Fees, effects and risks of the levers; the effects are monthly figures relative to the company. */
export const LEVERS = {
  interim: { title: "Interim-Management", days: 1, fee: 45_000, months: 6, cooldown: 6 },
  ceo: { title: "Geschäftsführung austauschen", days: 2, fee: [60_000, 300_000] as [number, number], feeShare: 0.04, cooldown: 18, good: 0.65 },
  costs: { title: "Kostenprogramm", days: 1, saving: 0.05, oneOff: 3, cooldown: 9, risk: 0.3 },
  pricing: { title: "Preise anpassen", days: 1, margin: 0.02, keeps: 0.5, loss: 0.01, cooldown: 12 },
  sales: { title: "Vertriebsoffensive", days: 1, cost: 0.015, months: 6, cooldown: 9 },
  workingCapital: { title: "Working-Capital-Programm", days: 1, freed: 0.35, fee: 0.02, cooldown: 12, risk: 0.2 },
  refinance: { title: "Refinanzierung", days: 1, fee: 0.01, cooldown: 12 },
  earnout: { title: "Earn-out nachverhandeln", days: 1, cooldown: 6 },
} as const;

export interface LeverView {
  id: LeverId;
  title: string;
  /** What it is, in one or two sentences. */
  text: string;
  cost: string;
  effect: string;
  risk: string;
  days: number;
  /** Null when it can be pulled now. */
  blocker: string | null;
}

/** A company this player can steer: active, valued on EBITDA, majority, bought through the succession desk. */
export function steerable(s: Startup): boolean {
  return s.status === "active" && isFamily(s) && s.stake > 50 && Boolean(s.lbo);
}

function lastUsed(s: Startup, id: LeverId): number | undefined {
  return s.lbo?.levers?.[id];
}

function cooldownBlocker(state: GameState, s: Startup, id: LeverId): string | null {
  const last = lastUsed(s, id);
  if (last === undefined) return null;
  const left = last + LEVERS[id].cooldown - state.month;
  return left > 0 ? `Gerade erst gemacht. Wieder in ${left} ${left === 1 ? "Monat" : "Monaten"}.` : null;
}

function ceoFee(s: Startup): number {
  return roundTo(clamp(annualEbitda(s.metrics) * LEVERS.ceo.feeShare, LEVERS.ceo.fee[0], LEVERS.ceo.fee[1]), 1000);
}

/** Interest and repayment per month on today's terms vs a fresh seven-year loan at the market rate. */
export function refinanceTerms(state: GameState, s: Startup): { rate: number; payment: number; oldPayment: number; fee: number; rolled: number } | null {
  const lbo = s.lbo;
  if (!lbo || lbo.bank <= 0) return null;
  const e = annualEbitda(s.metrics);
  const soon = lbo.vendors.filter((v) => v.due <= state.month + 12).reduce((sum, v) => sum + v.amount, 0);
  const rolled = e > 0 && (lbo.bank + soon) / e <= BANK_MAX_LEVERAGE ? soon : 0;
  const bank = lbo.bank + rolled;
  const rate = bankRate(e > 0 ? bank / e : BANK_MAX_LEVERAGE, state.market.regime) - (lbo.headroom ? 0.005 : 0);
  return { rate, payment: annuityOf(bank, rate, BANK_YEARS * 12), oldPayment: lbo.payment, fee: roundTo(bank * LEVERS.refinance.fee, 1000), rolled };
}

/** What the seller would take instead of the open earn-outs: a fixed vendor loan, less the further the target is away. */
export function earnoutSettlement(s: Startup): { open: number; expected: number; fixed: number } | null {
  const lbo = s.lbo;
  if (!lbo || lbo.earnouts.length === 0) return null;
  const e = annualEbitda(s.metrics);
  const open = lbo.earnouts.reduce((sum, x) => sum + x.amount, 0);
  const expected = lbo.earnouts.reduce((sum, x) => sum + expectedEarnout(x, e), 0);
  const fixed = roundTo(
    lbo.earnouts.reduce((sum, x) => sum + x.amount * (0.4 + 0.5 * clamp(e / Math.max(1, x.target), 0, 1)), 0),
    1000,
  );
  return { open, expected, fixed };
}

export function leverViews(state: GameState, s: Startup): LeverView[] {
  if (!steerable(s)) return [];
  const m = s.metrics;
  const lbo = s.lbo!;
  const month = state.month;
  const days = (id: LeverId) => LEVERS[id].days;
  const cd = (id: LeverId) => cooldownBlocker(state, s, id);
  const cure = lbo.status === "cure" ? "Erst die Forderung der Bank erfüllen." : null;
  const out: LeverView[] = [];

  const interimOn = (lbo.interim ?? 0) >= month;
  out.push({
    id: "interim",
    title: LEVERS.interim.title,
    text: "Eine erfahrene Managerin auf Zeit stellt sich neben die Geschäftsführung, ordnet Abläufe und bringt die Kosten wieder zum Umsatz.",
    cost: `${eur(LEVERS.interim.fee)} für ${LEVERS.interim.months} Monate, zahlt die Firma (über das Netzwerk ${eur(INTERIM.fee)})`,
    effect: "Führung wird jeden Monat stärker, Kosten passen sich doppelt so schnell an, Übergaberisiken sinken.",
    risk: "Gering. Hilft nur, solange sie da ist.",
    days: days("interim"),
    blocker: interimOn ? "Die Interim-Managerin ist schon vor Ort." : (cd("interim") ?? (m.cash < LEVERS.interim.fee ? "Die Kasse der Firma reicht dafür nicht." : null)),
  });
  const fee = ceoFee(s);
  out.push({
    id: "ceo",
    title: LEVERS.ceo.title,
    text: "Ein Personalberater sucht eine neue Geschäftsführung. Der letzte Ausweg, wenn die Führung das Problem ist.",
    cost: `${eur(fee)} Honorar aus deinem Privatkapital, zwei Tage`,
    effect: "Mit Glück eine starke Führung (Führung mindestens 68/100), die die Firma wieder auf Kurs bringt.",
    risk: `In etwa ${Math.round((1 - LEVERS.ceo.good) * 100)} % der Fälle passt die neue Person nicht: Unruhe, Kunden vermissen den alten Chef. ${lbo.searchId ? "Die Suchende behält ihre Anteile, verdient aber keine weiteren." : ""}`.trim(),
    days: days("ceo"),
    blocker: cd("ceo") ?? (state.cash < fee ? `Dafür fehlen dir ${eur(fee - state.cash)}.` : null),
  });
  const saving = m.opex * LEVERS.costs.saving;
  out.push({
    id: "costs",
    title: LEVERS.costs.title,
    text: "Sachkosten, Einkauf und Strukturen durchgehen. Spart dauerhaft, kostet einmalig Abfindungen und Berater.",
    cost: `einmalig ${eur(saving * LEVERS.costs.oneOff)} aus der Kasse der Firma`,
    effect: `Kosten −${Math.round(LEVERS.costs.saving * 100)} %: etwa ${eur(saving)} mehr EBITDA im Monat, rund ${mio(saving * 12 * Math.max(1, fairMultiple(m)))} Unternehmenswert.`,
    risk: `Die Stimmung leidet. Mit schwacher Führung gehen oft Leistungsträger (etwa ${Math.round(clamp(LEVERS.costs.risk - m.axes.management / 400, 0.05, 0.3) * 100)} %): dann fallen Umsatz und Führung.`,
    days: days("costs"),
    blocker: cd("costs") ?? cure ?? (m.cash < saving * LEVERS.costs.oneOff ? "Die Kasse der Firma reicht dafür nicht." : null),
  });
  const priceChance = clamp(0.4 + (m.axes.edge + m.axes.market) / 400, 0.4, 0.85);
  out.push({
    id: "pricing",
    title: LEVERS.pricing.title,
    text: "Die Preise steigen, vor allem bei Kunden, die lange nicht angepasst wurden. Preise sind der stärkste Hebel auf den Gewinn.",
    cost: "keine, ein Tag mit der Geschäftsführung",
    effect: `Rohmarge +${Math.round(LEVERS.pricing.margin * 100)} Punkte, die Hälfte davon bleibt dauerhaft; etwa ${Math.round(LEVERS.pricing.loss * 100)} % Umsatz gehen verloren.`,
    risk: `Gelingt in etwa ${Math.round(priceChance * 100)} % der Fälle (stärker mit Markt und Vorsprung). Sonst wandern Kunden ab: rund 6 % Umsatz.`,
    days: days("pricing"),
    blocker: cd("pricing"),
  });
  out.push({
    id: "sales",
    title: LEVERS.sales.title,
    text: "Zwei zusätzliche Vertriebsleute und ein Budget für Messen und Angebote, ein halbes Jahr lang.",
    cost: `${eur(m.revenue * LEVERS.sales.cost)} im Monat für ${LEVERS.sales.months} Monate`,
    effect: "Markt +6, nach drei Monaten mehr Umsatz (+2 bis +4 %), das Wachstum zieht etwas an.",
    risk: "Mit schwachem Markt bringt es weniger als es kostet.",
    days: days("sales"),
    blocker: cd("sales") ?? cure,
  });
  const uses = lbo.levers?.wcUses ?? 0;
  const freed = m.revenue * LEVERS.workingCapital.freed * Math.pow(0.5, uses);
  out.push({
    id: "workingCapital",
    title: LEVERS.workingCapital.title,
    text: "Kunden zahlen schneller, das Lager wird kleiner, Lieferanten werden später bezahlt. Gewinn ist nicht Geld: Hier wird gebundenes Geld frei.",
    cost: `${eur(m.revenue * LEVERS.workingCapital.fee)} für Berater und Skonto`,
    effect: `Etwa ${eur(freed)} mehr in der Kasse. Senkt die Nettoverschuldung, hilft beim Covenant.${uses > 0 ? " Beim zweiten Mal ist weniger zu holen." : ""}`,
    risk: `In etwa ${Math.round(LEVERS.workingCapital.risk * 100)} % der Fälle ärgern strengere Zahlungsziele einen Kunden: rund 2 % Umsatz weg.`,
    days: days("workingCapital"),
    blocker: cd("workingCapital") ?? (uses >= 3 ? "Hier ist nichts mehr zu holen." : null),
  });
  const refi = refinanceTerms(state, s);
  out.push({
    id: "refinance",
    title: LEVERS.refinance.title,
    text: "Den Bankkredit neu aufsetzen: wieder sieben Jahre Laufzeit zum heutigen Marktzins, fällige Verkäuferdarlehen kann die Bank mit übernehmen.",
    cost: refi ? `${eur(refi.fee)} Bankgebühr aus der Kasse der Firma` : "–",
    effect: refi
      ? `Rate ${eur(refi.oldPayment)} → ${eur(refi.payment)} im Monat, Zins ${(refi.rate * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %.${refi.rolled > 0 ? ` Die Bank übernimmt ${eur(refi.rolled)} Verkäuferdarlehen.` : ""}`
      : "Ohne Bankkredit gibt es nichts zu refinanzieren.",
    risk: "Länger Schulden heißt mehr Zinsen insgesamt. Bei Covenant-Bruch verhandelt die Bank nicht.",
    days: days("refinance"),
    blocker: !refi ? "Die Firma hat keinen Bankkredit." : lbo.status !== "ok" ? "Mit gebrochenem Covenant verhandelt die Bank nicht." : cd("refinance"),
  });
  const eo = earnoutSettlement(s);
  out.push({
    id: "earnout",
    title: LEVERS.earnout.title,
    text: "Dem Verkäufer statt des unsicheren Earn-outs einen festen Betrag anbieten, als Darlehen in vier Jahren fällig.",
    cost: eo ? `fest ${eur(eo.fixed)} statt bis zu ${eur(eo.open)} (erwartet: ${eur(eo.expected)})` : "–",
    effect: "Der Streit über das Ziel ist vom Tisch: Der Verkäufer mischt sich nicht mehr ein, das Vertrauen steigt.",
    risk: "Liegt das EBITDA weit unter dem Ziel, zahlst du mehr, als der Earn-out wahrscheinlich gekostet hätte. Der Verkäufer kann ablehnen.",
    days: days("earnout"),
    blocker: !eo ? "Es gibt keinen offenen Earn-out." : cd("earnout"),
  });
  return out;
}

/** Pulls a lever. Throws a rule error when it cannot be pulled. */
export function playLever(ctx: Ctx, s: Startup, id: LeverId): void {
  const state = ctx.state;
  if (!steerable(s)) ctx.fail("Eingreifen kannst du nur in eigenen Mittelstandsfirmen, an denen du die Mehrheit hältst.");
  const view = leverViews(state, s).find((l) => l.id === id);
  if (!view) ctx.fail("Diesen Hebel gibt es nicht.");
  if (view!.blocker) ctx.fail(view!.blocker);
  const r = mnaRandom(state, `lever|${s.id}|${id}|${state.month}`);
  const m = s.metrics;
  ctx.spend("platform", `${view!.title}: ${s.name}`, view!.days);
  let next: Startup = s;
  const lbo = () => next.lbo!;
  let text = "";
  switch (id) {
    case "interim": {
      next = { ...next, metrics: { ...next.metrics, cash: next.metrics.cash - LEVERS.interim.fee }, lbo: { ...lbo(), interim: state.month + LEVERS.interim.months } };
      text = `Die Interim-Managerin ist ab sofort ${LEVERS.interim.months} Monate in ${s.name}. Honorar ${eur(LEVERS.interim.fee)}, die Firma zahlt.`;
      ctx.lesson("interim_management");
      break;
    }
    case "ceo": {
      const fee = ceoFee(s);
      state.cash -= fee;
      const good = r() < LEVERS.ceo.good + (m.trust - 50) / 500;
      const ceo = s.board.find((b) => b.seat === "ceo");
      const name = `${["Dr. Annette", "Thomas", "Claudia", "Michael", "Birgit", "Stefan"][Math.floor(r() * 6)]} ${["Wagner", "Hoffmann", "Krüger", "Lehmann", "Brandt", "Vogt"][Math.floor(r() * 6)]}`;
      next = {
        ...next,
        board: next.board.map((b) =>
          b.seat === "ceo" ? { ...b, name, short: name.split(" ").at(-1)!, title: "Geschäftsführung (neu eingesetzt)", personality: "numbers" as const } : b,
        ),
      };
      // The searcher stays a shareholder but no longer runs the company, so she earns no more shares.
      if (lbo().searchId) {
        const rest = { ...lbo() };
        delete rest.searchId;
        next = { ...next, lbo: rest };
      }
      if (good) {
        next = applyDelta(next, { morale: -4, trust: 6, axes: { management: Math.max(12, 68 - m.axes.management) } });
        text = `${ceo?.name ?? "Die bisherige Geschäftsführung"} geht, ${name} übernimmt. Der erste Eindruck ist stark: klare Prioritäten, die Belegschaft zieht mit. Honorar ${eur(fee)}.`;
      } else {
        next = applyDelta(next, { morale: -10, trust: -4, revenuePct: -0.02, axes: { management: 3 } });
        text = `${ceo?.name ?? "Die bisherige Geschäftsführung"} geht, ${name} übernimmt, aber es knirscht: Zwei Großkunden vermissen den alten Chef, im Betrieb ist Unruhe. Honorar ${eur(fee)}.`;
      }
      ctx.lesson("interim_management");
      break;
    }
    case "costs": {
      const saving = m.opex * LEVERS.costs.saving;
      next = applyDelta(next, { opex: -saving, cash: -saving * LEVERS.costs.oneOff, morale: -8 });
      const bad = r() < clamp(LEVERS.costs.risk - m.axes.management / 400, 0.05, 0.3);
      if (bad) next = applyDelta(next, { revenuePct: -0.03, axes: { management: -4 } });
      text = `Kostenprogramm in ${s.name}: ${eur(saving)} weniger Kosten im Monat, einmalig ${eur(saving * LEVERS.costs.oneOff)}.${bad ? " Zwei Leistungsträger kündigen, ein Teil der Kunden merkt es: rund 3 % Umsatz weg." : " Die Belegschaft murrt, zieht aber mit."}`;
      ctx.lesson("fixkosten");
      break;
    }
    case "pricing": {
      const chance = clamp(0.4 + (m.axes.edge + m.axes.market) / 400, 0.4, 0.85);
      if (r() < chance) {
        next = applyDelta(next, { grossMargin: LEVERS.pricing.margin, revenuePct: -LEVERS.pricing.loss });
        next = { ...next, lbo: { ...lbo(), grossMargin: (lbo().grossMargin ?? m.grossMargin) + LEVERS.pricing.margin * LEVERS.pricing.keeps } };
        text = `Neue Preise in ${s.name}: Die Rohmarge steigt um ${Math.round(LEVERS.pricing.margin * 100)} Punkte, nur wenige Kunden gehen.`;
      } else {
        next = applyDelta(next, { grossMargin: LEVERS.pricing.margin / 2, revenuePct: -0.06, morale: -3 });
        text = `Neue Preise in ${s.name}: Mehrere Kunden wechseln zur Konkurrenz, rund 6 % Umsatz sind weg. Die Marge steigt nur wenig.`;
      }
      ctx.lesson("preiselastizitaet");
      break;
    }
    case "sales": {
      const cost = m.revenue * LEVERS.sales.cost;
      next = applyDelta(next, { opex: cost, axes: { market: 6 }, growth: Math.min(0.003, EBITDA_GROWTH_CAP - m.growth) });
      const success = r() < clamp(0.45 + m.axes.market / 200, 0.4, 0.85);
      state.effects.push({
        delay: 3,
        text: success ? "Die Vertriebsoffensive trägt: neue Aufträge, mehr Umsatz." : "Die Vertriebsoffensive bringt weniger als erhofft.",
        delta: { revenuePct: success ? 0.04 : 0.01 },
        startupId: s.id,
        due: state.month + 3,
        itemId: `lever-sales-${s.id}-${state.month}`,
      });
      state.effects.push({
        delay: LEVERS.sales.months,
        text: "Die Vertriebsoffensive ist vorbei, das Budget fällt weg.",
        delta: { opex: -cost },
        startupId: s.id,
        due: state.month + LEVERS.sales.months,
        itemId: `lever-sales-end-${s.id}-${state.month}`,
      });
      text = `Vertriebsoffensive in ${s.name}: ${eur(cost)} im Monat für ${LEVERS.sales.months} Monate. Ergebnisse in etwa drei Monaten.`;
      break;
    }
    case "workingCapital": {
      const uses = lbo().levers?.wcUses ?? 0;
      const freed = m.revenue * LEVERS.workingCapital.freed * Math.pow(0.5, uses);
      const fee = m.revenue * LEVERS.workingCapital.fee;
      next = applyDelta(next, { cash: freed - fee });
      const bad = r() < LEVERS.workingCapital.risk;
      if (bad) next = applyDelta(next, { revenuePct: -0.02, trust: -2 });
      next = { ...next, lbo: { ...lbo(), levers: { ...lbo().levers, wcUses: uses + 1 } } };
      text = `Working-Capital-Programm in ${s.name}: ${eur(freed)} gebundenes Geld frei, ${eur(fee)} Kosten.${bad ? " Ein Kunde ärgert sich über die strengeren Zahlungsziele und bestellt weniger." : ""}`;
      ctx.lesson("working_capital");
      break;
    }
    case "refinance": {
      const t = refinanceTerms(state, s)!;
      const vendors = t.rolled > 0 ? lbo().vendors.filter((v) => v.due > state.month + 12) : lbo().vendors;
      next = { ...next, metrics: { ...next.metrics, cash: next.metrics.cash - t.fee }, lbo: { ...lbo(), bank: lbo().bank + t.rolled, rate: t.rate, payment: t.payment, vendors } };
      text = `Refinanzierung von ${s.name}: neue Rate ${eur(t.payment)} statt ${eur(t.oldPayment)} im Monat, ${(t.rate * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} % Zins, sieben Jahre.${t.rolled > 0 ? ` Die Bank übernimmt ${eur(t.rolled)} Verkäuferdarlehen.` : ""} Gebühr ${eur(t.fee)}.`;
      ctx.lesson("refinanzierung");
      break;
    }
    case "earnout": {
      const eo = earnoutSettlement(s)!;
      if (r() < 0.5 + (0.3 * m.trust) / 100) {
        next = applyDelta(next, { trust: 6, morale: 2 });
        next = {
          ...next,
          lbo: {
            ...lbo(),
            earnouts: [],
            vendors: [...lbo().vendors, { amount: eo.fixed, due: state.month + VENDOR_MONTHS, label: `Abgelöster Earn-out ${s.name}` }],
            handover: lbo().handover.includes("patriarch") ? lbo().handover : [...lbo().handover, "patriarch"],
          },
        };
        text = `Der Verkäufer nimmt an: ${eur(eo.fixed)} fest, fällig in vier Jahren, statt bis zu ${eur(eo.open)} Earn-out. Er zieht sich aus dem Tagesgeschäft zurück.`;
      } else {
        next = applyDelta(next, { trust: -3 });
        text = `Der Verkäufer lehnt ab: Er glaubt an das Ziel und will den vollen Earn-out.`;
      }
      ctx.lesson("earn_out");
      break;
    }
  }
  next = { ...next, lbo: { ...lbo(), levers: { ...lbo().levers, [id]: state.month } } };
  next = syncDebt(next);
  ctx.replace(next);
  ctx.mail({ kind: "system", from: `${s.name}, Gesellschafter`, subject: `${s.name}: ${view!.title}`, body: text, startupId: s.id });
}

// ---------------------------------------------------------------------------
// Für die Firmenseite: was den Wert treibt, der Verlauf, was du tun kannst
// ---------------------------------------------------------------------------

export interface FamilyValueView {
  parts: ValueParts;
  margin: number;
  entry: { ev: number; ebitda: number; multiple: number; margin: number } | null;
  bank: number;
  vendors: number;
  earnout: { open: number; expected: number } | null;
  leverage: number;
  covenant: number;
  trend: { month: number; equity: number; ebitda?: number; multiple?: number; debt?: number }[];
  /** Plain-language diagnosis: what is going wrong, if anything. */
  diagnosis: string[];
  levers: LeverView[];
}

export function familyValueView(state: GameState, s: Startup, covenant: number): FamilyValueView | null {
  if (!isFamily(s) || s.status !== "active") return null;
  const m = s.metrics;
  const parts = valueParts(m);
  const lbo = s.lbo;
  const margin = m.revenue > 0 ? parts.ebitda / (m.revenue * 12) : 0;
  const e = annualEbitda(m);
  const diagnosis: string[] = [];
  if (lbo) {
    const drop = e / Math.max(1, lbo.entryEbitda) - 1;
    if (drop < -0.1) diagnosis.push(`Das EBITDA liegt ${Math.round(-drop * 100)} % unter dem beim Kauf.`);
    if (lbo.margin && margin < lbo.margin * 0.85)
      diagnosis.push(`Die Marge (${(margin * 100).toFixed(1).replace(".", ",")} %) ist deutlich unter der beim Kauf: Die Kosten passen nicht mehr zum Umsatz.`);
    if (m.growth < -0.003) diagnosis.push("Der Umsatz schrumpft. Markt, Vorsprung und Führung bestimmen, wohin er läuft.");
    if (m.axes.management < 50) diagnosis.push(`Die Führung ist schwach (${Math.round(m.axes.management)}/100).`);
    if (lbo.status !== "ok") diagnosis.push("Die Bank ist unzufrieden: Covenant gebrochen.");
  }
  const earnout =
    lbo && lbo.earnouts.length > 0 ? { open: lbo.earnouts.reduce((sum, x) => sum + x.amount, 0), expected: lbo.earnouts.reduce((sum, x) => sum + expectedEarnout(x, e), 0) } : null;
  return {
    parts,
    margin,
    entry: lbo ? { ev: lbo.entryEv, ebitda: lbo.entryEbitda, multiple: lbo.entryEv / Math.max(1, lbo.entryEbitda), margin: lbo.margin ?? 0 } : null,
    bank: lbo?.bank ?? 0,
    vendors: lbo ? lbo.vendors.reduce((sum, v) => sum + v.amount, 0) : 0,
    earnout,
    leverage: netLeverage(s),
    covenant,
    trend: s.history.slice(-7).map((h) => ({ month: h.month, equity: h.valuation, ebitda: h.ebitda, multiple: h.multiple, debt: h.netDebt })),
    diagnosis,
    levers: leverViews(state, s),
  };
}
