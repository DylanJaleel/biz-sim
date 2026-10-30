import { CORPORATE_FEE } from "./config";
import { initialsOf, leadOf, profileOf } from "./team";
import { annualEbitda } from "./ebitda";
import { netLeverage } from "./lbo";
import { COVENANT, VENDOR_RATE } from "./mna-config";
import { runwayMonths, valuation } from "./sim";
import { stakeValues } from "./venture";
import { COCKPIT_RULES, RANK, type CockpitKind, type CockpitGroup, type CockpitRow, type Facts, type Light, type NextDate } from "./cockpit-view";
import type { GameState, Startup, StartupPhase } from "./types";

export * from "./cockpit-view";

// Portfolio-Cockpit: Eine Ampel pro Beteiligung, mit Schwellen je Firmentyp.
// Alles hier ist reine Ansicht (keine Tage, kein Zufall) und liest nur den Spielstand.

export interface Check {
  id: string;
  light: Light;
  text: string;
}

export interface Assessment {
  light: Light;
  /** Kurze Begründung, z. B. „Runway 5 Monate“. */
  reason: string;
  /** Alle Prüfungen, die nicht grün sind, schwerste zuerst; bei Grün der Hinweis, warum alles gut ist. */
  reasons: string[];
  checks: Check[];
}

const num = (v: number, digits = 1) => v.toLocaleString("de-DE", { maximumFractionDigits: digits });

export function cockpitKind(s: Startup): CockpitKind {
  if (s.corporate) return "corporate";
  if (s.platform) return "platform";
  if (s.lbo || s.metrics.valuedOn === "ebitda" || s.flags.includes("mittelstand")) return "buyout";
  return "startup";
}

export function fundPercent(s: Startup): number {
  return s.capTable.filter((h) => h.kind === "fund").reduce((sum, h) => sum + h.pct, 0);
}

/** Über den eigenen Fonds gehalten: Der Fonds steht in der Beteiligungstabelle. */
export function heldByFund(s: Startup): boolean {
  return !s.corporate && fundPercent(s) > 0.05;
}

export function groupOf(s: Startup): CockpitGroup {
  if (s.corporate) return "mandate";
  if (s.studio) return "studio";
  if (heldByFund(s)) return "fund";
  const kind = cockpitKind(s);
  return kind === "buyout" || kind === "platform" ? "own" : "direct";
}

export function factsOf(s: Startup): Facts {
  const m = s.metrics;
  const ebitda = annualEbitda(m);
  const runway = runwayMonths(m);
  const margin = m.revenue > 0 ? ebitda / 12 / m.revenue : 0;
  let leverage: number | null = null;
  let limit: number | null = null;
  let cover: number | null = null;
  let debt = m.debt;
  if (s.lbo) {
    leverage = netLeverage(s);
    limit = COVENANT + (s.lbo.headroom ?? 0);
    const interest = s.lbo.bank * s.lbo.rate + s.lbo.vendors.reduce((sum, v) => sum + v.amount * VENDOR_RATE, 0);
    cover = interest > 0 ? ebitda / interest : null;
    debt = s.lbo.bank;
  } else if (s.corporate) {
    leverage = m.debt > 0 ? (ebitda > 0 ? m.debt / ebitda : Infinity) : null;
  }
  return { revenue: m.revenue, growth: m.growth, cash: m.cash, runway: Number.isFinite(runway) ? runway : null, ebitda, margin, leverage, limit, cover, debt };
}

function worst(checks: Check[]): Light {
  return checks.reduce<Light>((w, c) => (RANK[c.light] > RANK[w] ? c.light : w), "green");
}

function startupChecks(s: Startup, f: Facts): Check[] {
  const r = COCKPIT_RULES.startup;
  const checks: Check[] = [];
  if (s.crisisMonths >= r.crisisRed) checks.push({ id: "crisis", light: "red", text: `Kasse seit ${s.crisisMonths} ${s.crisisMonths === 1 ? "Monat" : "Monaten"} im Minus` });
  if (f.runway === null) checks.push({ id: "runway", light: "green", text: "Die Firma verdient Geld" });
  else {
    const text = f.runway < 1 ? "Runway unter 1 Monat" : `Runway ${num(f.runway)} ${Math.round(f.runway * 10) === 10 ? "Monat" : "Monate"}`;
    checks.push({
      id: "runway",
      light: f.runway < r.runwayRed ? "red" : f.runway < r.runwayYellow ? "yellow" : "green",
      text: f.runway >= r.runwayYellow ? `Runway über ${r.runwayYellow} Monate` : text,
    });
  }
  if (f.growth <= r.shrinkYellow) checks.push({ id: "growth", light: "yellow", text: `Umsatz sinkt um ${num(-f.growth * 100)} % im Monat` });
  if (s.metrics.topCustomer >= r.topCustomerYellow)
    checks.push({ id: "customer", light: "yellow", text: `Ein Kunde bringt ${Math.round(s.metrics.topCustomer * 100)} % des Umsatzes` });
  if (s.metrics.morale < r.moraleYellow) checks.push({ id: "morale", light: "yellow", text: `Stimmung im Team nur ${Math.round(s.metrics.morale)} von 100` });
  return checks;
}

function buyoutChecks(s: Startup, f: Facts): Check[] {
  const r = COCKPIT_RULES.buyout;
  const checks: Check[] = [];
  if (s.lbo?.status === "cure") checks.push({ id: "cure", light: "red", text: "Die Bank verlangt frisches Eigenkapital" });
  else if (s.lbo?.status === "watch") checks.push({ id: "watch", light: "yellow", text: "Covenant gebrochen, die Bank schaut genau hin" });
  if (f.cash < 0) checks.push({ id: "cash", light: "red", text: "Kasse im Minus" });
  else if (f.cash < s.metrics.opex * r.cashMonthsYellow) checks.push({ id: "cash", light: "yellow", text: "Kasse unter einem Monat Kosten" });
  const marginText = `EBITDA-Marge ${num(f.margin * 100)} %`;
  checks.push({ id: "margin", light: f.margin < r.marginRed ? "red" : f.margin < r.marginYellow ? "yellow" : "green", text: marginText });
  if (f.leverage !== null && f.limit !== null && f.leverage > 0) {
    const gap = (f.limit - f.leverage) / f.limit;
    const text = !Number.isFinite(f.leverage) ? "Kein positives EBITDA, Schulden nicht tragbar" : `Verschuldung ${num(f.leverage)}× EBITDA (Grenze ${num(f.limit)}×)`;
    checks.push({ id: "leverage", light: gap < 0 ? "red" : gap < r.covenantGapYellow ? "yellow" : "green", text });
  }
  if (f.cover !== null) {
    checks.push({ id: "cover", light: f.cover < r.coverRed ? "red" : f.cover < r.coverYellow ? "yellow" : "green", text: `Zinsdeckung ${num(f.cover)}×` });
  }
  return checks;
}

function corporateChecks(s: Startup, f: Facts): Check[] {
  const r = COCKPIT_RULES.corporate;
  const checks: Check[] = [];
  checks.push({ id: "margin", light: f.margin < r.marginRed ? "red" : f.margin < r.marginYellow ? "yellow" : "green", text: `EBITDA-Marge ${num(f.margin * 100)} %` });
  if (f.leverage !== null) {
    const text = Number.isFinite(f.leverage) ? `Schulden ${num(f.leverage)}× EBITDA` : "Schulden ohne positives EBITDA";
    checks.push({ id: "leverage", light: f.leverage >= r.leverageRed ? "red" : f.leverage >= r.leverageYellow ? "yellow" : "green", text });
  }
  if (f.growth <= r.shrinkYellow) checks.push({ id: "growth", light: "yellow", text: `Umsatz sinkt um ${num(-f.growth * 100)} % im Monat` });
  if (s.metrics.morale < r.moraleYellow) checks.push({ id: "morale", light: "yellow", text: `Stimmung in der Belegschaft nur ${Math.round(s.metrics.morale)} von 100` });
  return checks;
}

/** Die Ampel einer Beteiligung nach den Regeln ihres Typs. */
export function assess(s: Startup, kind: CockpitKind = cockpitKind(s), facts: Facts = factsOf(s)): Assessment {
  const checks = kind === "startup" ? startupChecks(s, facts) : kind === "corporate" ? corporateChecks(s, facts) : buyoutChecks(s, facts);
  const light = worst(checks);
  const bad = checks.filter((c) => c.light !== "green").sort((a, b) => RANK[b.light] - RANK[a.light]);
  const reasons = bad.length > 0 ? bad.map((c) => c.text) : checks.map((c) => c.text);
  return { light, reason: reasons[0] ?? "Keine Auffälligkeiten", reasons, checks };
}

// ---------------------------------------------------------------------------
// Zeilen
// ---------------------------------------------------------------------------

const NEEDS = { item: 2, round: 2, share: 1, exit: 2, cure: 3, red: 3, yellow: 1 };

function nextDate(state: GameState, s: Startup, kind: CockpitKind): NextDate | null {
  const now = state.month;
  const list: { month: number; text: string }[] = [];
  const at = (month: number, text: string) => list.push({ month: Math.max(now, month), text });
  if (s.lbo) {
    if (s.lbo.status === "cure" && s.lbo.cure) at(s.lbo.cure.due, "Frist der Bank für das Eigenkapital");
    at(now + ((3 - (now % 3)) % 3), "Covenant-Prüfung der Bank");
    const vendor = Math.min(...s.lbo.vendors.map((v) => v.due));
    if (Number.isFinite(vendor)) at(vendor, "Verkäuferdarlehen fällig");
    const earnout = Math.min(...s.lbo.earnouts.map((e) => e.due));
    if (Number.isFinite(earnout)) at(earnout, "Earn-out wird geprüft");
  }
  if (s.platform) {
    if (s.platform.sale) at(s.platform.sale.due, "Verkaufsprozess endet");
    for (const i of s.platform.integrations) at(i.due, `Integration ${i.name} abgeschlossen`);
  }
  if (kind === "corporate") {
    let m = now + 1;
    while ((m - s.joined) % 3 !== 1) m++;
    at(m, "Sitzung des Aufsichtsrats");
  } else if (kind === "startup") {
    at(now + (3 - (now % 3)), "Quartalsrunde");
  }
  const effect = state.effects.filter((e) => e.startupId === s.id && e.due > now).map((e) => e.due);
  if (effect.length > 0) at(Math.min(...effect), "Folgen einer Entscheidung");
  const offer = state.shareOffers.filter((o) => o.startupId === s.id && o.status === "open").map((o) => o.expires);
  if (offer.length > 0) at(Math.min(...offer), "Angebot zum Kauf von Anteilen läuft ab");
  if (list.length === 0) return null;
  const first = list.reduce((a, b) => (b.month < a.month ? b : a));
  return { month: first.month, inMonths: first.month - now, text: first.text };
}

function requests(state: GameState, s: Startup): { actions: string[]; points: number; openItems: number } {
  const actions: string[] = [];
  let points = 0;
  const items = state.items.filter((i) => i.status === "open" && i.startupId === s.id).length;
  if (items > 0) {
    actions.push(items === 1 ? "1 Vorlage wartet auf den Beirat" : `${items} Vorlagen warten auf den Beirat`);
    points += items * NEEDS.item;
  }
  if (state.rounds.some((r) => r.startupId === s.id && r.status === "open")) {
    actions.push("Finanzierungsrunde wartet auf dich");
    points += NEEDS.round;
  }
  if (state.exits.some((e) => e.startupId === s.id && (e.status === "open" || e.status === "negotiating"))) {
    actions.push("Kaufangebot liegt vor");
    points += NEEDS.exit;
  }
  if (state.shareOffers.some((o) => o.startupId === s.id && o.status === "open")) {
    actions.push("Anteile werden angeboten");
    points += NEEDS.share;
  }
  if (s.lbo?.status === "cure" && s.lbo.cure) {
    actions.push(`Bank verlangt ${Math.round(s.lbo.cure.amount / 1000).toLocaleString("de-DE")} Tsd. € Eigenkapital`);
    points += NEEDS.cure;
  }
  return { actions, points, openItems: items };
}

export function cockpitRow(state: GameState, s: Startup): CockpitRow {
  const kind = cockpitKind(s);
  const facts = factsOf(s);
  const a = assess(s, kind, facts);
  const companyValue = valuation(s.metrics);
  const share = s.corporate ? 1 : s.stake / 100;
  const values = stakeValues(s);
  const value = s.corporate ? 0 : s.venture ? values.credited : share * companyValue;
  const shown = s.corporate ? companyValue : value;
  const past = s.history.filter((h) => h.month < state.month);
  const prev = past[past.length - 1];
  const prevShown = prev ? (s.corporate ? prev.valuation : (prev.stake / 100) * prev.valuation) : 0;
  const change = prev && prevShown > 0 ? shown / prevShown - 1 : null;
  const trend = [...past.slice(-11).map((h) => (s.corporate ? h.valuation : (h.stake / 100) * h.valuation)), shown];
  const need = requests(state, s);
  const tones: CockpitRow["tones"] = {};
  const toneOf = (id: string): Light | undefined => a.checks.find((c) => c.id === id)?.light;
  tones.runway = toneOf("runway");
  tones.margin = toneOf("margin");
  tones.leverage = toneOf("leverage");
  tones.cover = toneOf("cover");
  tones.cash = toneOf("cash");
  tones.growth = toneOf("growth");
  const tag = kind === "corporate" ? "Mandat" : kind === "platform" ? "Plattform" : kind === "buyout" ? "Nachfolge" : PHASE_TAG[s.phase];
  return {
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    kind,
    group: groupOf(s),
    tag,
    pace: s.pace && s.pace.kind !== "normal" ? s.pace.kind : undefined,
    phase: s.phase,
    light: a.light,
    reason: a.reason,
    reasons: a.reasons,
    tones,
    facts,
    stake: s.stake,
    fundPct: fundPercent(s),
    value,
    ...(s.venture && values.paper > values.fundamental * 1.01 ? { paper: values.paper } : {}),
    companyValue,
    change,
    trend,
    next: nextDate(state, s, kind),
    actions: need.actions,
    openItems: need.openItems,
    needs: need.points + (a.light === "red" ? NEEDS.red : a.light === "yellow" ? NEEDS.yellow : 0),
    fee: s.corporate ? CORPORATE_FEE : undefined,
    lead: leadCell(state, s),
  };
}

function leadCell(state: GameState, s: Startup): CockpitRow["lead"] {
  const lead = leadOf(state, s);
  if (!lead) return undefined;
  return { name: lead.member.name, initials: initialsOf(lead.member.name), color: profileOf(lead.member).color, fit: lead.fit };
}

const PHASE_TAG: Record<StartupPhase, string> = { beta: "Beta", launch: "Markteintritt", scale: "Skalierung", profit: "Profitabel" };

/** Alle aktiven Beteiligungen als Cockpit-Zeilen, in der Reihenfolge des Spielstands. */
export function cockpitRows(state: GameState): CockpitRow[] {
  return state.startups.filter((s) => s.status === "active").map((s) => cockpitRow(state, s));
}
