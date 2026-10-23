import { CONDITION_DELAY, OPEX_PER_HIRE } from "./config";
import { delayOutcome, judgedStartup, outcomeValue, resolveVote, type OutcomeOutlook } from "./judge";
import { fill, months, runway, type ResolvedOutcome, type Template } from "./templates";
import type { BoardMember, CovenantId, CovenantSetup, Delta, Effect, Interest, Startup } from "./types";

// Auflagen: Wer "Ja, aber" sagt, muss sagen, welches Aber. Jede Vorlage bietet
// drei Auflagen an, genau eine trifft das eigentliche Risiko der Lage. Die
// passende ist oft besser als ein klares Ja oder Nein, die anderen kosten Zeit,
// Geld und Vertrauen und sind schlechter als eine klare Entscheidung. Welche
// passt, erfährt man über die Rückfrage zum Risiko, den CFO oder ein Vorgespräch.

export interface CovenantDef {
  id: CovenantId;
  /** Short name on the button. */
  name: string;
  /** The term used in venture capital and private equity. */
  term: string;
  /** What the condition does, one sentence. */
  short: string;
  /** Which risk it guards against. */
  guards: string;
  lesson: string;
  /** Board members with these interests notice this risk first. */
  interests: Interest[];
  /** Further months until the plan takes effect (on top of the general delay of conditions). */
  extraDelay: number;
  /** Answer to "Woran könnte das scheitern?" when this condition fits. */
  diagnosis: (s: Startup) => string;
  fitWhy: string;
  missWhy: string;
  fitDelta: Delta;
  missDelta: Delta;
  /** Text of the benefit when it fits; {amount} is replaced. */
  saved: string;
}

const pctOf = (v: number) => `${Math.round(v * 100)} %`;

export const COVENANTS: Record<CovenantId, CovenantDef> = {
  budget: {
    id: "budget",
    name: "Budgetdeckel",
    term: "Budgetdeckel (Cap)",
    short: "Die Ausgaben bekommen eine feste Obergrenze. Was darüber geht, braucht ein neues Okay.",
    guards: "Kosten, die davonlaufen, bei knapper Reichweite",
    lesson: "budgetdeckel",
    interests: ["cash"],
    extraDelay: 0,
    diagnosis: (s) =>
      `Das Geld reicht ${months(runway(s))}. Wird das Vorhaben teurer als geplant, ist die Kasse leer, bevor es wirkt. Die Gefahr sind nicht die Ziele, sondern die Kosten.`,
    fitWhy: "Das Geld war knapp. Ein Deckel schützt die Reichweite, ohne das Vorhaben zu stoppen.",
    missWhy: "Geld war hier nicht das Problem. Der Deckel bremst nur, was ohnehin finanziert war.",
    fitDelta: { axes: { finance: 3 } },
    missDelta: { growth: -0.003, morale: -3 },
    saved: "Der Budgetdeckel zwingt zu Prioritäten: Das Geld fließt nur in das, was wirkt. Umsatz {amount}.",
  },
  stagegate: {
    id: "stagegate",
    name: "Meilenstein zuerst",
    term: "Stage-Gate (Meilensteinfinanzierung)",
    short: "Geld und Freigabe kommen in Tranchen. Die nächste gibt es erst, wenn ein vereinbarter Meilenstein erreicht ist.",
    guards: "eine große Zusage mit unsicherem Ausgang",
    lesson: "stage_gate",
    interests: ["cash", "control"],
    extraDelay: 1,
    diagnosis: () => "Das Vorhaben bindet viel auf einmal, und ob es aufgeht, ist offen. Scheitert es, ist alles schon ausgegeben. Die Gefahr ist der Alles-oder-nichts-Einsatz.",
    fitWhy: "Viel Einsatz, unsicherer Ausgang: Tranchen begrenzen den Schaden, wenn es schiefgeht.",
    missWhy: "Der Ausgang war nicht das Problem. Die Tranchen kosten hier nur Zeit.",
    fitDelta: { axes: { management: 2 } },
    missDelta: { growth: -0.003 },
    saved: "Am Meilenstein wird nachgesteuert, der zweite Teil sitzt besser. Umsatz {amount}.",
  },
  pilot: {
    id: "pilot",
    name: "Pilot zuerst",
    term: "Pilotprojekt (Testmarkt)",
    short: "Erst im Kleinen beweisen, etwa in {city} oder mit wenigen Kunden, dann ausrollen.",
    guards: "eine Nachfrage, die noch niemand belegt hat",
    lesson: "pilotprojekt",
    interests: ["customer", "product", "growth"],
    extraDelay: 1,
    diagnosis: (s) =>
      `Ob die Kunden das wirklich wollen, ist nicht belegt. Die Marktstärke liegt bei ${Math.round(s.metrics.axes.market)} von 100. Die Gefahr ist, im großen Stil etwas auszurollen, das keiner kauft.`,
    fitWhy: "Die Nachfrage war unbewiesen. Ein Pilot liefert den Beleg, bevor es teuer wird.",
    missWhy: "Die Nachfrage war nicht die offene Frage. Der Pilot verschenkt nur Monate.",
    fitDelta: { axes: { market: 3 } },
    missDelta: { growth: -0.004 },
    saved: "Der Pilot zeigt, was die Kunden wirklich wollen, der Rollout trifft besser. Umsatz {amount}.",
  },
  second: {
    id: "second",
    name: "Zweiter Anbieter",
    term: "Dual Sourcing (Klumpenrisiko senken)",
    short: "Nicht alles auf einen Partner, Kunden oder Lieferanten setzen: Eine zweite Quelle wird vertraglich aufgebaut.",
    guards: "die Abhängigkeit von einem einzigen Partner oder Kunden",
    lesson: "klumpenrisiko",
    interests: ["customer", "control"],
    extraDelay: 0,
    diagnosis: (s) =>
      `Die Firma hängt an wenigen: Der größte Kunde bringt ${pctOf(s.metrics.topCustomer)} des Umsatzes, und auch {partner} wäre schwer zu ersetzen. Die Gefahr ist, dass einer allein die Bedingungen diktiert.`,
    fitWhy: "Die Abhängigkeit war das Risiko. Eine zweite Quelle macht die Firma verhandlungsstark.",
    missWhy: "Es gab keine gefährliche Abhängigkeit. Der zweite Anbieter kostet nur Geld und Aufmerksamkeit.",
    fitDelta: { topCustomer: -0.04, axes: { edge: 2 } },
    missDelta: { grossMargin: -0.01 },
    saved: "Der zweite Anbieter macht die Firma verhandlungsstark. Umsatz {amount}.",
  },
  kpi: {
    id: "kpi",
    name: "Kennzahl-Auflage",
    term: "Covenant (Financial Covenant)",
    short: "Die Freigabe gilt nur, solange vereinbarte Kennzahlen halten, etwa Marge oder Mindestkasse. Reißt eine, wird neu beraten.",
    guards: "Zahlen, die kippen, ohne dass es jemand rechtzeitig merkt",
    lesson: "covenants",
    interests: ["cash", "control"],
    extraDelay: 0,
    diagnosis: (s) =>
      `Die Finanzsteuerung ist schwach (${Math.round(s.metrics.axes.finance)} von 100)${s.metrics.debt > 0 ? ", dazu laufen Kredite" : ""}. Kippt eine Zahl, merkt es niemand rechtzeitig. Die Gefahr ist der Blindflug.`,
    fitWhy: "Die Zahlen waren das Risiko. Eine Kennzahl als Frühwarnung zwingt zu sauberem Berichten.",
    missWhy: "Die Finanzsteuerung war in Ordnung. Die Kennzahl erzeugt nur Berichtsaufwand.",
    fitDelta: { axes: { finance: 5 } },
    missDelta: { morale: -2, axes: { management: -2 } },
    saved: "Die Kennzahl schlägt früh an, es wird rechtzeitig gegengesteuert. Umsatz {amount}.",
  },
  veto: {
    id: "veto",
    name: "Vetorecht des Beirats",
    term: "Zustimmungsvorbehalt",
    short: "Größere Einstellungen und Ausgaben brauchen vorher die Zustimmung des Gremiums.",
    guards: "Personalaufbau ohne Kontrolle und eine Führung, der man noch nicht ganz traut",
    lesson: "zustimmungsvorbehalt",
    interests: ["control", "team"],
    extraDelay: 0,
    diagnosis: (s) =>
      `Das Vertrauen in die Steuerung ist angeschlagen (${Math.round(s.metrics.trust)} von 100), und der Plan baut Personal und Verpflichtungen auf. Die Gefahr ist, dass niemand prüft, wer eingestellt wird und was es kostet.`,
    fitWhy: "Wachstum ohne Kontrolle war das Risiko. Der Zustimmungsvorbehalt hält es im Rahmen.",
    missWhy: "Die Führung hatte das im Griff. Das Vetorecht wirkt wie Misstrauen und bremst.",
    fitDelta: { trust: 2, axes: { management: 3 } },
    missDelta: { trust: -5, morale: -3 },
    saved: "Der Zustimmungsvorbehalt verhindert teure Fehlentscheidungen. Umsatz {amount}.",
  },
};

export const COVENANT_IDS = Object.keys(COVENANTS) as CovenantId[];

/** Which condition fits a template by its subject (on top of what the numbers say). */
const AFFINITY: Record<string, Partial<Record<CovenantId, number>>> = {
  expansion: { pilot: 0.6, stagegate: 0.3 },
  price: { pilot: 0.6 },
  exclusive: { second: 0.7 },
  hire_sales: { veto: 0.5, stagegate: 0.3 },
  marketing: { pilot: 0.5, budget: 0.3 },
  freemium: { pilot: 0.6 },
  partnership: { second: 0.6 },
  second_product: { stagegate: 0.6 },
  pivot: { pilot: 0.6 },
  price_war: { budget: 0.4, kpi: 0.3 },
  payment_terms: { kpi: 0.5, second: 0.3 },
  bridge: { budget: 0.7 },
  seed_round: { kpi: 0.5, veto: 0.2 },
  cost_cut: { kpi: 0.5 },
  bank_loan: { kpi: 0.7 },
  acquisition: { stagegate: 0.6 },
  subsidy: { kpi: 0.4, budget: 0.2 },
  dividend: { kpi: 0.4, budget: 0.3 },
  cto_leaves: { second: 0.5 },
  esop: { veto: 0.5 },
  founder_salary: { kpi: 0.5 },
  hire_cfo: { stagegate: 0.4, veto: 0.3 },
  office: { budget: 0.6 },
  feature: { stagegate: 0.5 },
  privacy: { stagegate: 0.5 },
  quality: { kpi: 0.5 },
  influencer: { pilot: 0.6 },
  viertagewoche: { pilot: 0.6 },
  ausland: { pilot: 0.6 },
  rahmenvertrag: { second: 0.6 },
  foerderkredit: { kpi: 0.6 },
  datenpanne: { veto: 0.4, kpi: 0.3 },
  m_preise: { pilot: 0.6 },
  m_geschaeftsfuehrung: { stagegate: 0.5, veto: 0.3 },
  m_onlineshop: { pilot: 0.6 },
  m_zukauf: { stagegate: 0.6 },
  m_halle: { budget: 0.6 },
  kunde_kuendigt: { second: 0.6 },
  gruenderstreit: { veto: 0.6 },
  ki_service: { pilot: 0.6 },
  patentklage: { budget: 0.5 },
  dienstleister_pleite: { second: 0.7 },
  teilverkauf: { stagegate: 0.5 },
  esg_nachweis: { kpi: 0.5 },
  remote_first: { pilot: 0.5 },
  strategischer_investor: { veto: 0.6 },
  zertifizierung: { stagegate: 0.5 },
  vertrieb_abwerbung: { second: 0.5 },
  m_betriebsrat: { stagegate: 0.5 },
  m_covenant: { kpi: 0.7 },
  m_lieferant: { second: 0.7 },
  m_seniorchef: { veto: 0.6 },
  m_ausbildung: { pilot: 0.5 },
  k_cyber: { budget: 0.5 },
  k_sparte: { stagegate: 0.5 },
  k_ki: { pilot: 0.6 },
  k_dividende: { kpi: 0.5 },
  k_zukauf: { stagegate: 0.6 },
  k_werk: { pilot: 0.6 },
  k_verguetung: { kpi: 0.6 },
  k_digital: { stagegate: 0.6 },
  k_auftrag: { second: 0.5, kpi: 0.2 },
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How strongly the situation calls for each condition: the template's subject plus what the numbers say. */
export function covenantScores(t: Template, s: Startup): Record<CovenantId, number> {
  const m = s.metrics;
  const go = t.outcomes.go.resolve(s);
  let spend = 0;
  let hires = 0;
  let upside = 0;
  const deltas: Delta[] = [...go.effects.map((e) => e.delta), ...(go.risk ? [go.risk.good] : [])];
  for (const d of deltas) {
    spend += Math.max(0, -(d.cash ?? 0)) + Math.max(0, d.opex ?? 0) * 6 + Math.max(0, d.team ?? 0) * OPEX_PER_HIRE * 6;
    hires += Math.max(0, d.team ?? 0);
    upside += Math.max(0, d.growth ?? 0) * 10 + Math.max(0, d.revenuePct ?? 0);
  }
  const heavy = clamp01(spend / Math.max(1, m.cash) / 0.6);
  const chance = go.risk?.chance;
  const reach = runway(s);
  const text = `${t.title} ${t.motion} ${t.pitch}`;
  const dependent = /\{partner\}|\{customer\}|Lieferant|Partner|Großkunde|Rahmenvertrag/.test(text);
  const a = AFFINITY[t.id] ?? {};
  return {
    budget: (a.budget ?? 0) + (Number.isFinite(reach) ? clamp01((9 - reach) / 7) : 0) * 0.8 + heavy * 0.25,
    stagegate: (a.stagegate ?? 0) + (chance !== undefined ? clamp01((0.7 - chance) / 0.4) * 0.5 : 0) + heavy * 0.3,
    pilot: (a.pilot ?? 0) + clamp01((60 - m.axes.market) / 35) * 0.5 + (upside > 0 ? 0.15 : 0),
    second: (a.second ?? 0) + clamp01((m.topCustomer - 0.25) / 0.3) * 0.8 + (dependent ? 0.2 : 0),
    kpi: (a.kpi ?? 0) + clamp01((55 - m.axes.finance) / 35) * 0.5 + (m.debt > 0 ? 0.25 : 0),
    veto: (a.veto ?? 0) + clamp01((60 - m.trust) / 35) * 0.5 + clamp01(hires / 3) * 0.3 + clamp01((50 - m.axes.management) / 30) * 0.2,
  };
}

/**
 * Fixes the three conditions of an item when it comes up: the one that fits
 * best, a plausible alternative half of the time, and one at random. The
 * order on screen is shuffled so position tells nothing.
 */
export function covenantSetup(t: Template, s: Startup, random: () => number): CovenantSetup {
  const scores = covenantScores(t, s);
  for (const id of COVENANT_IDS) scores[id] += (random() - 0.5) * 0.12;
  const ranked = [...COVENANT_IDS].sort((x, y) => scores[y] - scores[x]);
  const fit = ranked[0]!;
  const pool = ranked.slice(1);
  const take = (index: number) => pool.splice(Math.min(pool.length - 1, Math.max(0, index)), 1)[0]!;
  const first = random() < 0.5 ? take(0) : take(Math.floor(random() * pool.length));
  const second = take(Math.floor(random() * pool.length));
  const options: CovenantId[] = [fit, first, second];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)) % (i + 1);
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  // The clearer the situation calls for the condition, the more it beats a plain decision.
  const edge = Math.min(0.3, Math.max(-0.25, -0.36 + 0.35 * Math.min(1.3, scores[fit]) + (random() - 0.5) * 0.25));
  const miss: Partial<Record<CovenantId, number>> = {};
  for (const id of [first, second]) miss[id] = 0.1 + random() * 0.15;
  return { options, fit, edge: Math.round(edge * 1000) / 1000, miss };
}

export interface CovenantPlan {
  id: CovenantId;
  fits: boolean;
  resolved: ResolvedOutcome;
  outlook: OutcomeOutlook;
  /** What the condition adds to (positive) or takes from (negative) the monthly revenue, as a fraction. */
  amount: number;
}

export interface CovenantOutlook {
  go: OutcomeOutlook;
  no: OutcomeOutlook;
  /** The board's standard condition (the template's middle path). */
  standard: OutcomeOutlook;
  plans: CovenantPlan[];
  /** The lower anchor of the decision's spread: the worst of go, no and standard. */
  floor: number;
}

export const signedPct = (v: number) => `${v > 0 ? "+" : "−"}${(Math.round(Math.abs(v) * 1000) / 10).toLocaleString("de-DE")} %`;

/** The effect of a condition, in two halves: the second only counts in full after the follow-up. */
function leverEffects(def: CovenantDef, fits: boolean, amount: number, s: Startup): Effect[] {
  if (amount === 0) return [];
  const half = amount / 2;
  if (amount > 0) {
    return [
      { delay: CONDITION_DELAY, text: fill(def.saved.replace("{amount}", signedPct(half)), s), delta: { revenuePct: half } },
      { delay: CONDITION_DELAY + 2, text: `Die Auflage „${def.name}“ wirkt weiter: Umsatz ${signedPct(half)}.`, delta: { revenuePct: half }, review: true },
    ];
  }
  const what = fits ? "Die Auflage kostet Abstimmung und Zeit" : `„${def.name}“ passt nicht: Abstimmungen, Berichte und Verzögerung bremsen den Vertrieb`;
  return [
    { delay: CONDITION_DELAY, text: `${what}. Umsatz ${signedPct(half)}.`, delta: { revenuePct: half } },
    { delay: CONDITION_DELAY + 2, text: `Die Auflage „${def.name}“ bindet weiter Zeit. Umsatz ${signedPct(half)}.`, delta: { revenuePct: half } },
  ];
}

function withLever(base: ResolvedOutcome, extra: Effect[]): ResolvedOutcome {
  return { ...base, effects: [...base.effects, ...extra] };
}

/**
 * The outcome of one condition: the board's middle path, later by the time a
 * condition needs, plus what the condition does. The size of that effect is
 * set so the condition lands where the item's setup says: the fitting one
 * above the plain decisions (by `edge`), the others below (by `miss`).
 */
export function planCovenant(t: Template, input: Startup, setup: CovenantSetup, id: CovenantId, plain?: { go: number; no: number; standard: number }): CovenantPlan {
  const s = judgedStartup(input);
  const def = COVENANTS[id];
  const fits = id === setup.fit;
  const values = plain ?? {
    go: outcomeValue(s, resolveVote(t, "go", s)).value,
    no: outcomeValue(s, resolveVote(t, "no", s)).value,
    standard: outcomeValue(s, resolveVote(t, "conditions", s)).value,
  };
  const hi = Math.max(values.go, values.no);
  const top = Math.max(hi, values.standard);
  const lo = Math.min(values.go, values.no, values.standard);
  // A decision where one option ruins the company would make every gap huge: the spread counts up to half the value.
  const spread = Math.min(Math.max(top - lo, 0.02 * Math.abs(top), 1), Math.max(1, 0.35 * Math.abs(top)));
  const target = fits
    ? Math.max(top + setup.edge * spread, values.standard + 0.1 * spread)
    : Math.min(hi, values.standard) - (setup.miss[id] ?? 0.25) * spread - 0.01 * Math.abs(top);

  const middle = delayOutcome(t.outcomes.conditions.resolve(s), CONDITION_DELAY + def.extraDelay);
  const flavour: Effect = { delay: CONDITION_DELAY, text: fill(fits ? def.fitWhy : def.missWhy, s), delta: fits ? def.fitDelta : def.missDelta };
  const base = withLever(middle, [flavour]);
  const v0 = outcomeValue(s, base).value;

  // Value grows about in step with revenue; one correction step for crises and exits.
  const bound = (r: number) => Math.round(Math.min(0.4, Math.max(-0.25, fits ? Math.max(0, r) : Math.min(0, r))) * 200) / 200;
  const slope = Math.max(1, Math.abs(v0));
  let amount = bound((target - v0) / slope);
  let resolved = withLever(base, leverEffects(def, fits, amount, s));
  let outlook = outcomeValue(s, resolved);
  if (amount !== 0 && Math.abs(outlook.value - target) > 0.03 * spread) {
    const measured = (outlook.value - v0) / amount;
    if (measured > slope * 0.1) {
      const next = bound(amount + (target - outlook.value) / measured);
      if (next !== amount) {
        amount = next;
        resolved = withLever(base, leverEffects(def, fits, amount, s));
        outlook = outcomeValue(s, resolved);
      }
    }
  }
  return { id, fits, resolved, outlook, amount };
}

/** What the CFO plans for every option of an item, conditions included. */
export function covenantOutlook(t: Template, input: Startup, setup: CovenantSetup): CovenantOutlook {
  const s = judgedStartup(input);
  const go = outcomeValue(s, resolveVote(t, "go", s));
  const no = outcomeValue(s, resolveVote(t, "no", s));
  const standard = outcomeValue(s, resolveVote(t, "conditions", s));
  const plain = { go: go.value, no: no.value, standard: standard.value };
  const plans = setup.options.map((id) => planCovenant(t, s, setup, id, plain));
  return { go, no, standard, plans, floor: Math.min(go.value, no.value, standard.value) };
}

/** All options with their planned value: "go", "no" and each offered condition. */
export function optionValues(o: CovenantOutlook): Record<string, number> {
  const values: Record<string, number> = { go: o.go.value, no: o.no.value };
  for (const p of o.plans) values[p.id] = p.outlook.value;
  return values;
}

/** The answer to the risk question: what could make the plan fail. */
export function riskAnswer(setup: CovenantSetup, s: Startup): string {
  return fill(COVENANTS[setup.fit].diagnosis(s), s);
}

export const RISK_QUESTION = { id: "risiko", q: "Woran könnte das scheitern?" } as const;

/** What a member lets on about the risk in a talk beforehand: only those whose interests touch it see it. */
export function pretalkHint(member: BoardMember, setup: CovenantSetup): string | null {
  const def = COVENANTS[setup.fit];
  if (!member.interests.some((i) => def.interests.includes(i))) return null;
  return `Mir macht vor allem ${def.guards} Sorgen.`;
}

/** Free hints: the numbers anyone can read. They point somewhere, but often to more than one condition. */
export function covenantSignals(s: Startup): { label: string; value: string; alert: boolean }[] {
  const m = s.metrics;
  const reach = runway(s);
  return [
    { label: "Reichweite", value: Number.isFinite(reach) ? `${Math.round(reach)} Mon.` : "verdient Geld", alert: reach < 6 },
    { label: "Größter Kunde", value: pctOf(m.topCustomer), alert: m.topCustomer > 0.3 },
    { label: "Markt", value: `${Math.round(m.axes.market)}/100`, alert: m.axes.market < 45 },
    { label: "Finanzen", value: `${Math.round(m.axes.finance)}/100`, alert: m.axes.finance < 45 || m.debt > 0 },
    { label: "Vertrauen", value: `${Math.round(m.trust)}/100`, alert: m.trust < 50 },
  ];
}

export function covenantName(id: CovenantId | "standard"): string {
  return id === "standard" ? "Auflage des Gremiums" : COVENANTS[id].name;
}
