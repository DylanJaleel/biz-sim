import { annualEbitda, ebitdaEquityValue, enterpriseValue, fairMultiple, LTM_WEIGHT, qualityFactor, sizeMultiple, valueEbitda } from "./ebitda";
import { annuityOf, bankRate, expectedEarnout, netLeverage, syncDebt } from "./lbo";
import { BANK_MAX_LEVERAGE, BANK_YEARS, MULTIPLE_GROWTH_CAP, MULTIPLE_PER_GROWTH_POINT } from "./mna-config";
import { eur, mio, roundTo, times, type Ctx } from "./mna-core";
import { INTERIM } from "./network-config";
import { applyDelta } from "./sim";
import type { ResolvedOutcome } from "./templates";
import type { Delta, GameState, LeverId, Metrics, PendingEffect, Startup } from "./types";

export type { LeverId };

// Eigene Mittelstandsfirmen: Was ihren Wert treibt, warum er sich bewegt, und
// was der Mehrheitsgesellschafter tun kann, wenn es mehrere Monate schlecht
// läuft. Die Hebel sind bewusst wenige und klar: Führung, Kosten, Preise,
// Vertrieb, gebundenes Geld und die Finanzierung.

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const pctText = (v: number, digits = 0) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toLocaleString("de-DE", { maximumFractionDigits: digits })} %`;
const mioText = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v) >= 1_000_000 ? mio(Math.abs(v)) : eur(roundTo(Math.abs(v), 1000))}`;

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
  const ebitda = valueEbitda(m);
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
  const size = sizeMultiple(valueEbitda(after)) - sizeMultiple(valueEbitda(before));
  const quality = (qualityFactor(after) - qualityFactor(before)) * fairMultiple(before);
  const pick = [
    { v: g, up: "weil das Wachstum anzieht", down: "weil das Wachstum nachlässt" },
    { v: size, up: "weil die Firma größer wird", down: "weil das EBITDA kleiner ist (kleine Firmen kosten weniger je Euro)" },
    {
      v: quality,
      up: "weil Zahlen und Kundenbasis solider sind",
      down: after.topCustomer > before.topCustomer ? "weil ein Großkunde mehr Gewicht hat" : "weil die Finanzen unsauberer sind",
    },
  ].sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0]!;
  return pick.v >= 0 ? pick.up : pick.down;
}

/** Money with sign: Mio. € from a million on, else euros rounded to the thousand. */
const moneyText = (v: number) => (Math.abs(v) >= 1_000_000 ? mio(v) : eur(roundTo(v, 1000)));

/**
 * Why the twelve-month EBITDA moved: this month's revenue, gross margin or
 * costs, or earlier months still working through the twelve-month figure.
 */
function ebitdaReason(before: Metrics, after: Metrics): string {
  const total = valueEbitda(after) - valueEbitda(before);
  const fresh = (annualEbitda(after) - annualEbitda(before)) * LTM_WEIGHT;
  const catchUp = total - fresh;
  const dir = Math.sign(total) || 1;
  const parts = [
    { v: (after.revenue - before.revenue) * before.grossMargin, text: `Umsatz ${pctText(after.revenue / Math.max(1, before.revenue) - 1, 1)}` },
    {
      v: (after.grossMargin - before.grossMargin) * after.revenue,
      text: `Rohmarge ${after.grossMargin >= before.grossMargin ? "+" : "−"}${Math.abs((after.grossMargin - before.grossMargin) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Punkte`,
    },
    { v: -(after.opex - before.opex), text: `Kosten ${pctText(after.opex / Math.max(1, before.opex) - 1, 1)}` },
  ]
    .filter((p) => Math.abs(p.v) > 0.0005 * Math.max(1, before.revenue) && Math.sign(p.v) === dir)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .map((p) => p.text);
  // A drop or jump a few months ago is still working through the twelve months.
  const lag =
    Math.abs(catchUp) > Math.abs(fresh) && Math.abs(catchUp) > 0.002 * Math.abs(valueEbitda(before))
      ? `${catchUp < 0 ? "die schwächeren" : "die stärkeren"} Monate davor wirken nach, laufend ${moneyText(annualEbitda(after))} im Jahr`
      : null;
  const out = [...(lag ? [lag] : []), ...parts].slice(0, 2);
  return out.length > 0 ? out.join(", ") : "kleine Schwankung";
}

/**
 * One short line for the monthly report: by how much and why the equity value
 * of a family business changed (EBITDA, multiple, debt, cash). Every month, so a
 * drop is never a riddle.
 */
export function explainValueChange(before: Metrics, after: Metrics, extra: { payout?: number } = {}): string {
  const a = valueParts(before);
  const b = valueParts(after);
  const delta = b.equity - a.equity;
  const rel = delta / Math.max(1, Math.abs(a.equity));
  const head = Math.abs(rel) < 0.005 ? "Wert kaum verändert" : `Wert ${mioText(delta)} (${pctText(rel, Math.abs(rel) < 0.1 ? 1 : 0)})`;
  const parts: string[] = [];
  if (!a.substance && !b.substance) {
    const ebitdaMove = b.ebitda / a.ebitda - 1;
    parts.push(Math.abs(ebitdaMove) < 0.005 ? "EBITDA unverändert" : `EBITDA ${pctText(ebitdaMove, Math.abs(ebitdaMove) < 0.1 ? 1 : 0)} (${ebitdaReason(before, after)})`);
    parts.push(times(a.multiple) === times(b.multiple) ? "Multiple unverändert" : `Multiple ${times(a.multiple)} → ${times(b.multiple)}, ${multipleReason(before, after)}`);
  } else if (b.substance) {
    parts.push(`${b.ebitda <= 0 ? "kein operativer Gewinn" : "kaum operativer Gewinn"} (${ebitdaReason(before, after)}): bewertet wird nur die Substanz`);
  } else {
    parts.push(`wieder operativer Gewinn (${ebitdaReason(before, after)})`);
  }
  const money: { v: number; text: string }[] = [];
  const debt = b.debt - a.debt;
  if (Math.abs(debt) >= 1000)
    money.push({
      v: debt,
      text: `Schulden ${mioText(debt)}${Math.abs(debt) > 0.05 * Math.max(1, a.debt) ? (debt < 0 ? " (Tilgung oder ein Earn-out, dessen Ziel wackelt)" : " (neue Kredite oder ein Earn-out, dessen Ziel wieder erreichbar ist)") : ""}`,
    });
  const cash = b.excessCash - a.excessCash;
  if (Math.abs(cash) >= 1000) money.push({ v: cash, text: `freie Kasse ${mioText(cash)}${extra.payout && cash < 0 ? " (Ausschüttung an die Gesellschafter)" : ""}` });
  parts.push(...money.sort((x, y) => Math.abs(y.v) - Math.abs(x.v)).map((p) => p.text));
  return `${head}: ${parts.join("; ")}.`;
}

// ---------------------------------------------------------------------------
// Hebel für eigene Mittelstandsfirmen
// ---------------------------------------------------------------------------

export const LEVER_IDS: LeverId[] = ["interim", "costs", "pricing", "workingCapital", "refinance"];

/**
 * Fees, effects and risks of the levers. Effects are relative to the company
 * and arrive with a delay (`delay` months); the value follows the smoothed
 * EBITDA, so a lever shows in the value over about half a year.
 */
export const LEVERS = {
  interim: { title: "Interim-Management", days: 1, fee: 45_000, months: 6, cooldown: 6, clash: 0.2 },
  costs: { title: "Kostenprogramm", days: 1, saving: 0.05, oneOff: 3, delay: 2, cooldown: 9, risk: 0.3 },
  pricing: { title: "Preise anpassen", days: 1, margin: 0.02, keeps: 0.5, loss: 0.01, delay: 1, cooldown: 12 },
  workingCapital: { title: "Working-Capital-Programm", days: 1, freed: 0.35, fee: 0.02, delay: 2, cooldown: 12, risk: 0.2 },
  refinance: { title: "Refinanzierung", days: 1, fee: 0.01, cooldown: 12 },
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

function cooldownBlocker(state: GameState, s: Startup, id: LeverId): string | null {
  const last = s.lbo?.levers?.[id];
  if (last === undefined) return null;
  const left = last + LEVERS[id].cooldown - state.month;
  return left > 0 ? `Gerade erst gemacht. Wieder in ${left} ${left === 1 ? "Monat" : "Monaten"}.` : null;
}

/** Interest and repayment per month on today's terms vs a fresh seven-year loan at the market rate. */
export function refinanceTerms(state: GameState, s: Startup): { rate: number; payment: number; oldPayment: number; fee: number; rolled: number } | null {
  const lbo = s.lbo;
  if (!lbo || lbo.bank <= 0) return null;
  const e = valueEbitda(s.metrics);
  const soon = lbo.vendors.filter((v) => v.due <= state.month + 12).reduce((sum, v) => sum + v.amount, 0);
  const rolled = e > 0 && (lbo.bank + soon) / e <= BANK_MAX_LEVERAGE ? soon : 0;
  const bank = lbo.bank + rolled;
  const rate = bankRate(e > 0 ? bank / e : BANK_MAX_LEVERAGE, state.market.regime) - (lbo.headroom ? 0.005 : 0);
  return { rate, payment: annuityOf(bank, rate, BANK_YEARS * 12), oldPayment: lbo.payment, fee: roundTo(bank * LEVERS.refinance.fee, 1000), rolled };
}

const costRisk = (m: Metrics) => clamp(LEVERS.costs.risk - m.axes.management / 400, 0.05, 0.3);
const priceChance = (m: Metrics) => clamp(0.4 + (m.axes.edge + m.axes.market) / 400, 0.4, 0.85);
/** "ab nächstem Monat" or "in 2 Monaten"; `cap` for the start of a sentence. */
const whenText = (n: number, cap = false) => {
  const t = n === 1 ? "ab nächstem Monat" : `in ${n} Monaten`;
  return cap ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

export function leverViews(state: GameState, s: Startup): LeverView[] {
  if (!steerable(s)) return [];
  const m = s.metrics;
  const lbo = s.lbo!;
  const month = state.month;
  const cd = (id: LeverId) => cooldownBlocker(state, s, id);
  const cure = lbo.status === "cure" ? "Erst die Forderung der Bank erfüllen." : null;
  const tooPoor = (amount: number) => (m.cash < amount ? "Die Kasse der Firma reicht dafür nicht." : null);
  const out: LeverView[] = [];

  out.push({
    id: "interim",
    title: LEVERS.interim.title,
    text: "Eine erfahrene Managerin auf Zeit stellt sich neben die Geschäftsführung, ordnet Abläufe und bringt die Kosten wieder zum Umsatz.",
    cost: `${eur(LEVERS.interim.fee)} für ${LEVERS.interim.months} Monate aus der Kasse der Firma (über das Netzwerk ${eur(INTERIM.fee)})`,
    effect: "Führung jeden Monat etwas stärker, die Kosten passen sich doppelt so schnell an, Übergaberisiken sinken.",
    risk: `In etwa ${Math.round(LEVERS.interim.clash * 100)} % der Fälle reibt sie sich mit der Geschäftsführung: Stimmung und Vertrauen leiden.`,
    days: LEVERS.interim.days,
    blocker: (lbo.interim ?? 0) >= month ? "Die Interim-Managerin ist schon vor Ort." : (cd("interim") ?? tooPoor(LEVERS.interim.fee)),
  });
  const saving = m.opex * LEVERS.costs.saving;
  out.push({
    id: "costs",
    title: LEVERS.costs.title,
    text: "Sachkosten, Einkauf und Strukturen durchgehen. Spart dauerhaft, kostet einmalig Abfindungen und Berater.",
    cost: `einmalig ${eur(roundTo(saving * LEVERS.costs.oneOff, 1000))} aus der Kasse der Firma`,
    effect: `${whenText(LEVERS.costs.delay, true)} Kosten −${Math.round(LEVERS.costs.saving * 100)} %: etwa ${eur(roundTo(saving, 1000))} mehr EBITDA im Monat, auf Dauer rund ${mio(saving * 12 * Math.max(1, fairMultiple(m)))} Unternehmenswert.`,
    risk: `Die Stimmung leidet sofort. In etwa ${Math.round(costRisk(m) * 100)} % der Fälle gehen Leistungsträger (weniger mit starker Führung): rund 3 % Umsatz weg.`,
    days: LEVERS.costs.days,
    blocker: cd("costs") ?? cure ?? tooPoor(saving * LEVERS.costs.oneOff),
  });
  out.push({
    id: "pricing",
    title: LEVERS.pricing.title,
    text: "Die Preise steigen, vor allem bei Kunden, die lange nicht angepasst wurden. Preise sind der stärkste Hebel auf den Gewinn.",
    cost: "kein Geld, ein Tag mit der Geschäftsführung",
    effect: `${whenText(LEVERS.pricing.delay, true)} Rohmarge +${Math.round(LEVERS.pricing.margin * 100)} Punkte, die Hälfte davon dauerhaft; etwa ${Math.round(LEVERS.pricing.loss * 100)} % Umsatz gehen verloren.`,
    risk: `Gelingt in etwa ${Math.round(priceChance(m) * 100)} % der Fälle (besser mit starkem Markt und Vorsprung). Sonst wandern Kunden ab: rund 6 % Umsatz.`,
    days: LEVERS.pricing.days,
    blocker: cd("pricing"),
  });
  const uses = lbo.levers?.wcUses ?? 0;
  const freed = m.revenue * LEVERS.workingCapital.freed * Math.pow(0.5, uses);
  out.push({
    id: "workingCapital",
    title: LEVERS.workingCapital.title,
    text: "Kunden zahlen schneller, das Lager wird kleiner, Lieferanten werden später bezahlt. Gewinn ist nicht Geld: Hier wird gebundenes Geld frei.",
    cost: `${eur(roundTo(m.revenue * LEVERS.workingCapital.fee, 1000))} für Berater und Skonto`,
    effect: `${whenText(LEVERS.workingCapital.delay, true)} etwa ${eur(roundTo(freed, 1000))} mehr in der Kasse. Senkt die Nettoverschuldung, hilft beim Covenant.${uses > 0 ? " Beim zweiten Mal ist weniger zu holen." : ""}`,
    risk: `In etwa ${Math.round(LEVERS.workingCapital.risk * 100)} % der Fälle ärgern strengere Zahlungsziele einen Kunden: rund 2 % Umsatz weg.`,
    days: LEVERS.workingCapital.days,
    blocker: cd("workingCapital") ?? (uses >= 3 ? "Hier ist nichts mehr zu holen." : null),
  });
  const refi = refinanceTerms(state, s);
  out.push({
    id: "refinance",
    title: LEVERS.refinance.title,
    text: "Den Bankkredit neu aufsetzen: wieder sieben Jahre Laufzeit zum heutigen Marktzins, bald fällige Verkäuferdarlehen kann die Bank mit übernehmen.",
    cost: refi ? `${eur(refi.fee)} Bankgebühr aus der Kasse der Firma` : "–",
    effect: refi
      ? `Sofort: Rate ${eur(refi.oldPayment)} → ${eur(refi.payment)} im Monat, Zins ${(refi.rate * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %.${refi.rolled > 0 ? ` Die Bank übernimmt ${eur(refi.rolled)} Verkäuferdarlehen.` : ""}`
      : "Ohne Bankkredit gibt es nichts zu refinanzieren.",
    risk: "Länger Schulden heißt insgesamt mehr Zinsen. Steigt der Marktzins, kann die neue Rate auch höher sein.",
    days: LEVERS.refinance.days,
    blocker: !refi ? "Die Firma hat keinen Bankkredit." : lbo.status !== "ok" ? "Mit gebrochenem Covenant verhandelt die Bank nicht." : (cd("refinance") ?? tooPoor(refi.fee)),
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
  const m = s.metrics;
  ctx.spend("platform", `${view!.title}: ${s.name}`, view!.days);
  let next: Startup = s;
  const lbo = () => next.lbo!;
  const itemId = `lever-${id}-${s.id}-${state.month}`;
  // Levers work with a delay: the outcome (and its risk) is rolled when it is due.
  const schedule = (delay: number, risk: NonNullable<PendingEffect["risk"]>) =>
    state.effects.push({ delay, text: "", delta: {}, startupId: s.id, due: state.month + delay, itemId, risk });
  let text = "";
  switch (id) {
    case "interim": {
      next = { ...next, metrics: { ...next.metrics, cash: next.metrics.cash - LEVERS.interim.fee }, lbo: { ...lbo(), interim: state.month + LEVERS.interim.months } };
      schedule(1, {
        chance: 1 - LEVERS.interim.clash,
        good: {},
        bad: { morale: -5, trust: -5 },
        goodText: "Die Interim-Managerin und die Geschäftsführung arbeiten gut zusammen.",
        badText: "Die Interim-Managerin und die Geschäftsführung reiben sich. Im Betrieb ist Unruhe.",
      });
      text = `Die Interim-Managerin ist ab sofort ${LEVERS.interim.months} Monate in ${s.name}. Honorar ${eur(LEVERS.interim.fee)}, die Firma zahlt.`;
      ctx.lesson("interim_management");
      break;
    }
    case "costs": {
      const saving = m.opex * LEVERS.costs.saving;
      next = applyDelta(next, { cash: -saving * LEVERS.costs.oneOff, morale: -6 });
      schedule(LEVERS.costs.delay, {
        chance: 1 - costRisk(m),
        good: { opex: -saving },
        bad: { opex: -saving, revenuePct: -0.03, axes: { management: -4 } },
        goodText: `Das Kostenprogramm greift: ${eur(saving)} weniger Kosten im Monat.`,
        badText: `Das Kostenprogramm greift (${eur(saving)} weniger Kosten im Monat), aber zwei Leistungsträger kündigen. Kunden merken es: rund 3 % Umsatz weg.`,
      });
      text = `Kostenprogramm in ${s.name} beschlossen. Einmalig ${eur(saving * LEVERS.costs.oneOff)} für Abfindungen und Berater. Die Einsparung von ${eur(saving)} im Monat wirkt ${whenText(LEVERS.costs.delay)}.`;
      ctx.lesson("fixkosten");
      break;
    }
    case "pricing": {
      // Half of the increase lasts: the margin the business drifts back to moves up.
      next = { ...next, lbo: { ...lbo(), grossMargin: (lbo().grossMargin ?? m.grossMargin) + LEVERS.pricing.margin * LEVERS.pricing.keeps } };
      schedule(LEVERS.pricing.delay, {
        chance: priceChance(m),
        good: { grossMargin: LEVERS.pricing.margin, revenuePct: -LEVERS.pricing.loss },
        bad: { grossMargin: LEVERS.pricing.margin / 2, revenuePct: -0.06, morale: -3 },
        goodText: `Die neuen Preise gelten: Rohmarge +${Math.round(LEVERS.pricing.margin * 100)} Punkte, nur wenige Kunden gehen.`,
        badText: "Die neuen Preise gelten, aber mehrere Kunden wechseln zur Konkurrenz: rund 6 % Umsatz weg, die Marge steigt nur wenig.",
      });
      text = `Neue Preislisten für ${s.name} gehen raus. Sie gelten ${whenText(LEVERS.pricing.delay)}.`;
      ctx.lesson("preiselastizitaet");
      break;
    }
    case "workingCapital": {
      const uses = lbo().levers?.wcUses ?? 0;
      const freed = Math.round(m.revenue * LEVERS.workingCapital.freed * Math.pow(0.5, uses));
      const fee = m.revenue * LEVERS.workingCapital.fee;
      next = applyDelta(next, { cash: -fee });
      next = { ...next, lbo: { ...lbo(), levers: { ...lbo().levers, wcUses: uses + 1 } } };
      schedule(LEVERS.workingCapital.delay, {
        chance: 1 - LEVERS.workingCapital.risk,
        good: { cash: freed },
        bad: { cash: freed, revenuePct: -0.02, trust: -2 },
        goodText: `Das Working-Capital-Programm wirkt: ${eur(freed)} gebundenes Geld sind frei.`,
        badText: `Das Working-Capital-Programm bringt ${eur(freed)}, aber ein Kunde ärgert sich über die strengeren Zahlungsziele und bestellt weniger.`,
      });
      text = `Working-Capital-Programm in ${s.name} gestartet, ${eur(fee)} Kosten. Das Geld kommt ${whenText(LEVERS.workingCapital.delay)} frei.`;
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
  /** This month's EBITDA × 12; the value uses the smoothed twelve months (parts.ebitda). */
  runRate: number;
  /** Why the value moved last month (from the monthly report). */
  why: string | null;
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
  const e = valueEbitda(m);
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
  const why = state.reports[0]?.lines.find((l) => l.startupId === s.id)?.valueWhy ?? null;
  return {
    parts,
    runRate: annualEbitda(m),
    why,
    margin,
    entry: lbo ? { ev: lbo.entryEv, ebitda: lbo.entryEbitda, multiple: lbo.entryEv / Math.max(1, lbo.entryEbitda), margin: lbo.margin ?? 0 } : null,
    bank: lbo?.bank ?? 0,
    vendors: lbo ? lbo.vendors.reduce((sum, v) => sum + v.amount, 0) : 0,
    earnout,
    leverage: netLeverage(s),
    covenant,
    trend: s.history.slice(-6).map((h) => ({ month: h.month, equity: h.valuation, ebitda: h.ebitda, multiple: h.multiple, debt: h.netDebt })),
    diagnosis,
    levers: leverViews(state, s),
  };
}
