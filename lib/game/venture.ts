import { mnaRandom } from "./lbo";
import { monthlyCashFlow, valuation } from "./sim";
import type { Ctx } from "./mna-core";
import type { ExitOffer, GameState, Round, RoundPrep, Startup, VenturePath } from "./types";
import { initialTerms, prepBonus } from "./rounds";
import {
  AMBITION,
  BRIDGE_FULFIL,
  BRIDGE_MONTHS,
  DOWN_ROUND_CUT,
  DOWN_ROUND_END,
  IPO_GOALS,
  LEAD_PARTNERS,
  PAPER_CAP,
  PAPER_CREDIT,
  PAPER_FADE,
  PREP_CHANCE_MAX,
  ROUND_INVESTORS,
  SALE_PAPER_SHARE,
  STAGE_GOALS,
  UNICORN_ROUND_FACTOR,
  UNICORN_STAGE,
  VENTURE_CHANCE,
  VENTURE_ENTRY,
  VENTURE_GAP,
  VENTURE_MOOD,
  VENTURE_STAGES,
  investorGroup,
  type GoalId,
} from "./venture-config";

// Wachstumspfad bis zum Unicorn: Junge Firmen, die schnell wachsen, können
// Runden bei Wachstumsinvestoren holen (Serie A bis D). Jede Runde hebt den
// Papierwert, verwässert aber alle. Bis zum Verkauf oder Börsengang zählt der
// Papierwert nur zum Teil ins Vermögen; erst der Erlös zählt voll.

const mio = (n: number) => `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: n >= 100_000_000 ? 0 : 1 })} Mio. €`;
const pctText = (n: number) => `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;

/** A young company with venture investors: not a family business, a platform or the corporation. */
export function ventureEligible(s: Startup): boolean {
  return !s.corporate && !s.lbo && !s.platform && s.metrics.valuedOn !== "ebitda" && !s.flags.includes("mittelstand");
}

/** What the company is worth on the market: the last venture round, or its numbers if they say more. */
export function companyValue(s: Startup): number {
  const fundamental = valuation(s.metrics);
  return s.venture ? Math.max(fundamental, s.venture.paper) : fundamental;
}

/** What a trade buyer bases an offer on: the numbers plus part of the paper premium. */
export function saleValue(s: Startup): number {
  const fundamental = valuation(s.metrics);
  return fundamental + Math.max(0, companyValue(s) - fundamental) * SALE_PAPER_SHARE;
}

export interface CreditedValue {
  /** Your share of the fundamental value (revenue × multiple). */
  fundamental: number;
  /** Your share of the paper value (last round). */
  paper: number;
  /** What counts towards net worth until the exit. */
  credited: number;
}

/**
 * The player's stake: until the exit only part of the paper gain counts (and
 * at most PAPER_CAP per company); the realised sale counts in full.
 */
export function stakeValues(s: Startup): CreditedValue {
  const share = s.stake / 100;
  const fundamental = share * valuation(s.metrics);
  const paper = share * companyValue(s);
  const credited = fundamental + Math.min(PAPER_CAP, Math.max(0, paper - fundamental) * PAPER_CREDIT);
  return { fundamental, paper, credited };
}

export function creditedValue(s: Startup): number {
  return s.venture ? stakeValues(s).credited : (s.stake / 100) * valuation(s.metrics);
}

export interface VentureCheck {
  id: GoalId;
  label: string;
  /** What the company shows, as text. */
  value: string;
  target: string;
  /** 0..1 */
  score: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const euro = (v: number) => `${(Math.round(v / 1000) * 1000).toLocaleString("de-DE")} €`;

/** Share of good board decisions at this company (strong counts full, fair half); 0.5 without any. */
export function boardQuality(state: GameState, s: Startup): number {
  const decided = state.items.filter((i) => i.startupId === s.id && i.decision && !i.decision.lapsed);
  if (decided.length === 0) return 0.5;
  const points = decided.reduce((sum, i) => sum + (i.decision!.judgment === "strong" ? 1 : i.decision!.judgment === "fair" ? 0.5 : 0), 0);
  return points / decided.length;
}

function goalCheck(state: GameState, s: Startup, id: GoalId, target: number): VentureCheck {
  const m = s.metrics;
  switch (id) {
    case "revenue":
      return { id, label: "Umsatz", value: `${euro(m.revenue)} im Monat`, target: euro(target), score: clamp01(m.revenue / target) };
    case "growth":
      return { id, label: "Wachstum", value: `${pctText(m.growth * 100)} im Monat`, target: pctText(target * 100), score: clamp01(m.growth / target) };
    case "product":
      return { id, label: "Produkt & Kundenbindung", value: `${Math.round(m.axes.product)} von 100`, target: String(target), score: clamp01(m.axes.product / target) };
    case "customers":
      return {
        id,
        label: "Kundenbreite",
        value: `größter Kunde ${Math.round(m.topCustomer * 100)} %`,
        target: `höchstens ${Math.round(target * 100)} %`,
        score: m.topCustomer <= target ? 1 : clamp01(1 - (m.topCustomer - target) / 0.4),
      };
    case "margin":
      return {
        id,
        label: "Rohmarge (Unit Economics)",
        value: `${Math.round(m.grossMargin * 100)} %`,
        target: `${Math.round(target * 100)} %`,
        score: clamp01(m.grossMargin / target),
      };
    case "market":
      return { id, label: "Vertrieb & Markt", value: `${Math.round(m.axes.market)} von 100`, target: String(target), score: clamp01(m.axes.market / target) };
    case "management": {
      const team = (m.axes.management + m.morale) / 2;
      return { id, label: "Führung & Team", value: `${Math.round(team)} von 100`, target: String(target), score: clamp01(team / target) };
    }
    case "burn": {
      const flow = monthlyCashFlow(m) / Math.max(1, m.revenue);
      return {
        id,
        label: "Weg zur Profitabilität",
        value: `Cashflow ${Math.round(flow * 100)} % vom Umsatz`,
        target: `mindestens ${Math.round(target * 100)} %`,
        score: flow >= target ? 1 : clamp01(1 - (target - flow) / 0.4),
      };
    }
    case "finance":
      return { id, label: "Saubere Zahlen", value: `${Math.round(m.axes.finance)} von 100`, target: String(target), score: clamp01(m.axes.finance / target) };
    case "board": {
      const board = boardQuality(state, s);
      return { id, label: "Beirat", value: `${Math.round(board * 100)} % gute Entscheidungen`, target: `${Math.round(target * 100)} %`, score: clamp01(board / target) };
    }
  }
}

/** The milestones investors of a round look at (default: the next round; "ipo" for the listing). */
export function ventureChecks(state: GameState, s: Startup, stage: number | "ipo" = (s.venture?.stage ?? -1) + 1): VentureCheck[] {
  const goals = STAGE_GOALS[stage === "ipo" ? IPO_GOALS : Math.min(UNICORN_STAGE, Math.max(0, stage))]!;
  return goals.goals.map(([id, target]) => goalCheck(state, s, id, target));
}

/** The milestones still missing, as one readable line (for refusals). */
export function missingText(checks: VentureCheck[]): string {
  const missing = checks.filter((c) => c.score < 0.999);
  if (missing.length === 0) return "Alle Ziele waren erfüllt, am Ende fehlte das Glück.";
  return `Es fehlten: ${missing.map((c) => `${c.label} (${c.value}, Ziel ${c.target})`).join("; ")}.`;
}

export function fulfilment(checks: VentureCheck[]): number {
  return checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
}

/** Chance that the next round of the path comes together. */
export function ventureChance(state: GameState, s: Startup): number {
  const f = fulfilment(ventureChecks(state, s));
  const mood = VENTURE_MOOD[state.market.regime];
  const rare = (s.venture?.stage ?? -1) + 1 >= UNICORN_STAGE ? UNICORN_ROUND_FACTOR : 1;
  return Math.max(VENTURE_CHANCE.min, Math.min(VENTURE_CHANCE.max, (VENTURE_CHANCE.base + VENTURE_CHANCE.span * f) * mood * rare));
}

/** Chance of going all the way from today's stage to the unicorn, if the company keeps today's numbers. */
export function unicornOdds(state: GameState, s: Startup): number {
  const stage = s.venture?.stage ?? -1;
  if (s.venture?.unicorn) return 1;
  if (s.venture?.ended) return 0;
  const p = ventureChance(state, s);
  const steps = UNICORN_STAGE - Math.max(0, stage);
  return Math.pow(p, steps);
}

function gap(r: () => number): number {
  return VENTURE_GAP[0] + Math.floor(r() * (VENTURE_GAP[1] - VENTURE_GAP[0] + 1));
}

/**
 * Once a month: fast companies join the path, companies on the path try for
 * their next round, ended paths let the paper value fade.
 */
export function ventureMonth(ctx: Ctx, notes: string[]): void {
  const state = ctx.state;
  const month = state.month;
  for (const s of state.startups) {
    if (s.status !== "active" || !ventureEligible(s)) continue;
    const path = s.venture;
    if (!path) {
      if (s.stake <= 0 || month - s.joined < VENTURE_ENTRY.age) continue;
      const value = valuation(s.metrics);
      if (value < VENTURE_ENTRY.value || s.metrics.growth < VENTURE_ENTRY.growth) continue;
      const r = mnaRandom(state, `venture|enter|${s.id}`);
      ctx.replace({ ...s, venture: { stage: 0, paper: value, since: month, next: month + gap(r), log: [{ stage: 0, month, lead: "", amount: 0, post: value }] } });
      ctx.lesson("venture_path");
      ctx.mail({
        kind: "round",
        from: s.name,
        subject: `${s.name} ist auf dem Radar der Wachstumsinvestoren`,
        body: `Mit ${mio(value)} Bewertung und ${pctText(s.metrics.growth * 100)} Wachstum im Monat hat ${s.name} Seed-Niveau erreicht. Ab jetzt schauen Wachstumsinvestoren hin: Wachstum, Marge, Markt, Team und gute Beiratsentscheidungen entscheiden, ob eine Serie A kommt. Den Weg zeigt die Firmenseite unter „Wachstum“.`,
        startupId: s.id,
      });
      continue;
    }
    if (path.prep?.target === "ipo") {
      if (month >= path.prep.due) ipoTry(ctx, s, path, path.prep, notes);
      continue;
    }
    if (path.ended !== undefined || path.unicorn !== undefined) {
      // Without a new round the paper value drifts back to what the numbers say.
      const fundamental = valuation(s.metrics);
      if (path.ended !== undefined && path.paper > fundamental) ctx.replace({ ...s, venture: { ...path, paper: Math.max(fundamental, path.paper * PAPER_FADE) } });
      continue;
    }
    const prep = path.prep;
    if (month < (prep ? prep.due : path.next) || path.stage >= UNICORN_STAGE) continue;
    if (state.rounds.some((r) => r.startupId === s.id && r.status === "open")) continue;
    const r = mnaRandom(state, `venture|${s.id}|${path.stage}|${month}`);
    const checks = ventureChecks(state, s);
    const chance = preparedChance(state, s, prep);
    if (r() < chance) openVentureRound(ctx, s, path, r, prep, fulfilment(checks));
    else if (fulfilment(checks) >= BRIDGE_FULFIL && !path.log.some((l) => l.bridge && l.stage === path.stage)) bridgeRound(ctx, s, path, checks, notes);
    else downRound(ctx, s, path, r, notes, checks);
  }
}

/** Chance of the next round, with what the player's preparation adds. */
export function preparedChance(state: GameState, s: Startup, prep: RoundPrep | undefined): number {
  const chance = ventureChance(state, s);
  if (!prep) return chance;
  const rare = (s.venture?.stage ?? -1) + 1 >= UNICORN_STAGE ? UNICORN_ROUND_FACTOR : 1;
  return Math.max(VENTURE_CHANCE.min, Math.min(PREP_CHANCE_MAX, chance + prepBonus(prep).total * rare));
}

function withoutPrep(path: VenturePath): VenturePath {
  const next = { ...path };
  delete next.prep;
  return next;
}

/** Names of the investors who lead the round to a stage. */
export function investorsFor(stage: number | "ipo"): string[] {
  return ROUND_INVESTORS[investorGroup(stage)]!.names;
}

function openVentureRound(ctx: Ctx, s: Startup, path: VenturePath, r: () => number, prep: RoundPrep | undefined, fulfil: number): void {
  const state = ctx.state;
  const stage = path.stage + 1;
  const def = VENTURE_STAGES[stage]!;
  const price = AMBITION[prep?.ambition ?? "market"].price;
  // The paper value of the last round sets a floor: investors pay at least a little more than last time.
  const post = Math.round(Math.max(def.post * (0.9 + r() * 0.25) * price, path.paper * 1.3) / 100_000) * 100_000;
  const amount = Math.round((post * def.dilution) / 100_000) * 100_000;
  const names = investorsFor(stage);
  // An investor the player pitched leads; otherwise whoever the market sends.
  const leadName = (prep && prep.pitched.length > 0 ? names[prep.pitched[0]! % names.length] : undefined) ?? names[Math.floor(r() * names.length) % names.length]!;
  const terms = initialTerms(stage, prep, fulfil, r);
  const label = stage === UNICORN_STAGE ? "Pre-IPO-Runde" : def.label;
  const round: Round = {
    id: ctx.id("r"),
    startupId: s.id,
    month: state.month,
    status: "open",
    label,
    amount,
    preMoney: post - amount,
    leadId: `growth-${leadName.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    lead: leadName,
    down: false,
    venture: stage,
    terms,
  };
  state.rounds.push(round);
  ctx.replace({ ...s, flags: [...s.flags.filter((f) => f !== "round_open"), "round_open"], venture: { ...withoutPrep(path), next: state.month + gap(r) } });
  ctx.lesson("term_sheet");
  if (stage >= 2) ctx.lesson("spaete_runden");
  if (investorGroup(stage) === 2) ctx.lesson("crossover");
  const unicorn = stage === UNICORN_STAGE;
  const conditions = [
    terms.pref > 1 ? `Liquidationspräferenz ${terms.pref.toLocaleString("de-DE")}×` : "1× Liquidationspräferenz",
    terms.seat ? "ein Sitz im Beirat" : "",
    terms.rivals > 0 ? `${terms.rivals} weitere${terms.rivals === 1 ? "s" : ""} Term Sheet${terms.rivals === 1 ? "" : "s"} liegen vor` : "",
  ]
    .filter(Boolean)
    .join(", ");
  ctx.mail({
    kind: "round",
    from: `${leadName}`,
    subject: `Term Sheet für ${s.name}: ${label} über ${mio(amount)}`,
    body: `${leadName} bietet ${mio(amount)} bei ${mio(post)} Bewertung nach dem Geld.${unicorn ? " Damit wäre die Firma mehr als eine Milliarde wert: ein Unicorn." : ""} Die neuen Investoren bekommen ${Math.round(def.dilution * 100)} % der Firma, alle anderen werden verwässert. Bedingungen: ${conditions}. Vor der Abstimmung kannst du verhandeln und anteilig mitziehen. Die Gesellschafterversammlung entscheidet bis Monatsende.`,
    startupId: s.id,
    roundId: round.id,
  });
}

/**
 * Close, but not enough: the insiders bridge with a convertible loan (Wandeldarlehen)
 * that buys six more months. No new price, the next try comes sooner.
 */
function bridgeRound(ctx: Ctx, s: Startup, path: VenturePath, checks: VentureCheck[], notes: string[]): void {
  const state = ctx.state;
  const burn = Math.max(0, -monthlyCashFlow(s.metrics));
  const amount = Math.max(250_000, Math.round((burn * BRIDGE_MONTHS) / 10_000) * 10_000);
  const next: VenturePath = {
    ...withoutPrep(path),
    next: state.month + BRIDGE_MONTHS,
    log: [...path.log, { stage: path.stage, month: state.month, lead: "Bestandsinvestoren", amount, post: path.paper, bridge: true }],
  };
  ctx.replace({ ...s, venture: next, metrics: { ...s.metrics, cash: s.metrics.cash + amount } });
  ctx.lesson("bridge");
  const label = VENTURE_STAGES[path.stage + 1]?.label ?? "nächste Runde";
  const text = `${s.name}: Für die ${label} reicht es knapp nicht. Die Bestandsinvestoren geben ${mio(amount)} als Wandeldarlehen (Bridge), damit die Firma ${BRIDGE_MONTHS} Monate Zeit für die fehlenden Ziele hat. ${missingText(checks)}`;
  notes.push(text);
  ctx.mail({ kind: "round", from: s.name, subject: `Bridge statt ${label}`, body: text, startupId: s.id });
}

function downRound(ctx: Ctx, s: Startup, path: VenturePath, r: () => number, notes: string[], checks: VentureCheck[]): void {
  const state = ctx.state;
  const ends = r() < DOWN_ROUND_END;
  const paper = Math.max(valuation(s.metrics), path.paper * (1 - DOWN_ROUND_CUT));
  const next: VenturePath = {
    ...withoutPrep(path),
    paper,
    next: state.month + gap(r),
    log: [...path.log, { stage: path.stage, month: state.month, lead: "", amount: 0, post: paper, down: true }],
    ...(ends ? { ended: state.month } : {}),
  };
  ctx.replace({ ...s, venture: next, metrics: { ...s.metrics, morale: Math.max(0, s.metrics.morale - 6) } });
  ctx.lesson("down_round");
  const label = VENTURE_STAGES[path.stage + 1]?.label ?? "nächste Runde";
  const text = ends
    ? `${s.name}: Kein Investor will die ${label} führen. Die Bewertung sinkt auf ${mio(paper)} (Down Round). Der Weg nach oben ist vorerst zu Ende; der Papierwert nähert sich wieder den Zahlen. ${missingText(checks)}`
    : `${s.name}: Die ${label} platzt. Neue Bewertung nur ${mio(paper)} (Down Round). In einem Jahr gibt es einen neuen Versuch, wenn die Zahlen stimmen. ${missingText(checks)}`;
  notes.push(text);
  ctx.mail({ kind: "round", from: s.name, subject: ends ? "Wachstumsrunde abgesagt" : "Down Round", body: text, startupId: s.id });
}

/** The shareholders accepted a round of the path: new stage, new paper value, perhaps the unicorn. */
export function ventureRoundClosed(ctx: Ctx, round: Round, notes: string[]): void {
  const state = ctx.state;
  const s = state.startups.find((x) => x.id === round.startupId);
  if (!s?.venture || round.venture === undefined) return;
  const post = round.preMoney + round.amount;
  const path: VenturePath = {
    ...s.venture,
    stage: round.venture,
    paper: post,
    since: state.month,
    log: [...s.venture.log, { stage: round.venture, month: state.month, lead: round.lead, amount: round.amount, post }],
  };
  // Growth money buys people and reach: more team, a little more growth, higher costs.
  const m = s.metrics;
  const metrics = {
    ...m,
    growth: m.growth + 0.004,
    opex: m.opex + Math.round(round.amount / 60 / 100) * 100,
    team: m.team + Math.max(2, Math.round(round.amount / 400_000)),
    axes: { ...m.axes, market: Math.min(100, m.axes.market + 3), management: Math.min(100, m.axes.management + 2) },
  };
  let next: Startup = { ...s, venture: path, metrics };
  // The lead takes the venture capital seat of the board: a partner who watches the numbers.
  if (round.terms?.seat) {
    const partner = LEAD_PARTNERS[(round.venture + s.id.length) % LEAD_PARTNERS.length]!;
    const short = partner.replace(/^Dr\. /, "").split(" ")[0]!;
    next = {
      ...next,
      board: next.board.map((b) =>
        b.seat === "vc" ? { ...b, name: partner, short, title: round.lead, personality: "numbers" as const, interests: ["growth", "cash"] as typeof b.interests } : b,
      ),
    };
    notes.push(`${s.name}: ${partner} von ${round.lead} übernimmt den Sitz der Investoren im Beirat.`);
  }
  if (round.venture >= UNICORN_STAGE) {
    next = { ...next, venture: { ...path, unicorn: state.month, unicornStake: s.stake } };
    ctx.replace(next);
    celebrateUnicorn(ctx, next, post, notes);
    return;
  }
  ctx.replace(next);
}

function celebrateUnicorn(ctx: Ctx, s: Startup, post: number, notes: string[]): void {
  const state = ctx.state;
  ctx.reputation(5);
  ctx.lesson("unicorn");
  const mine = (s.stake / 100) * post;
  const text = `${s.name} ist ein Unicorn: ${mio(post)} Bewertung. Dein Anteil von ${pctText(s.stake)} ist auf dem Papier ${mio(mine)} wert. Erst ein Verkauf oder Börsengang macht daraus echtes Geld.`;
  notes.push(text);
  state.news.unshift({ month: state.month, title: `Titelseite: ${s.name} knackt die Milliarde`, text, startupIds: [s.id] });
  ctx.mail({
    kind: "news",
    from: "Wirtschaftsblatt, Titelseite",
    subject: `${s.name} ist ein Unicorn`,
    body: `${text} Die Branche staunt: Aus einer Beiratsrunde ist eine der wertvollsten jungen Firmen des Landes geworden. In deiner Vitrine steht jetzt ein goldener Tombstone.`,
    startupId: s.id,
  });
}

/** Chance that the banks take the company public: the milestones of a listed company, the market mood and the preparation. */
export function ipoChance(state: GameState, s: Startup, prep?: RoundPrep): number {
  const base = (0.2 + 0.55 * fulfilment(ventureChecks(state, s, "ipo"))) * VENTURE_MOOD[state.market.regime];
  const max = prep ? PREP_CHANCE_MAX : VENTURE_CHANCE.max;
  return Math.max(VENTURE_CHANCE.min, Math.min(max, base + (prep ? prepBonus(prep).total : 0)));
}

/**
 * The prepared listing: the banks test the story against the milestones of a
 * listed company. Yes: an IPO offer for the shareholders' meeting. No: the
 * window is closed for now, with reasons.
 */
function ipoTry(ctx: Ctx, s: Startup, path: VenturePath, prep: RoundPrep, notes: string[]): void {
  const state = ctx.state;
  if (state.exits.some((e) => e.startupId === s.id && e.status === "open") || s.flags.includes("round_open")) {
    ctx.replace({ ...s, venture: { ...path, prep: { ...prep, due: state.month + 1 } } });
    return;
  }
  const checks = ventureChecks(state, s, "ipo");
  const mood = VENTURE_MOOD[state.market.regime];
  const chance = ipoChance(state, s, prep);
  const r = mnaRandom(state, `venture|ipo|${s.id}|${state.month}`);
  ctx.replace({ ...s, venture: withoutPrep(path) });
  ctx.lesson("lockup");
  if (r() >= chance) {
    const text = `${s.name}: Die Banken raten vom Börsengang ab. Das Börsenfenster ist für diese Geschichte gerade zu. ${missingText(checks)}`;
    notes.push(text);
    ctx.mail({ kind: "exit", from: "Konsortium der Emissionsbanken", subject: `${s.name}: Börsengang verschoben`, body: text, startupId: s.id });
    return;
  }
  const price = Math.round((companyValue(s) * AMBITION[prep.ambition].price * (0.95 + r() * 0.2) * mood) / 100_000) * 100_000;
  const offer: ExitOffer = { id: ctx.id("x"), startupId: s.id, month: state.month, buyer: "Börsengang in Frankfurt", price, status: "open", ipo: true };
  state.exits.push(offer);
  ctx.mail({
    kind: "exit",
    from: "Konsortium der Emissionsbanken",
    subject: `${s.name} ist börsenreif: ${mio(price)}`,
    body: `Nach Roadshow und Bookbuilding (Fondsmanager zeichnen Aktien zu einem Preis) steht der Ausgabepreis: ${mio(price)} für die ganze Firma. Die Hälfte deines Erlöses kommt sofort, für die andere Hälfte gilt eine Sperrfrist (Lock-up). Die Gesellschafterversammlung entscheidet bis Monatsende.`,
    startupId: s.id,
    exitId: offer.id,
  });
}

/** A round of the path the shareholders turned down: the investor walks, a new try comes later. */
export function ventureRoundFailed(ctx: Ctx, round: Round): void {
  const s = ctx.state.startups.find((x) => x.id === round.startupId);
  if (!s?.venture || round.venture === undefined) return;
  ctx.replace({ ...s, venture: { ...s.venture, next: ctx.state.month + VENTURE_GAP[1] } });
}

/** Companies the player held when they became a unicorn. */
export function unicorns(state: GameState): Startup[] {
  return state.startups.filter((s) => s.venture?.unicorn !== undefined && (s.venture.unicornStake ?? 0) > 0);
}

export interface VentureView {
  eligible: boolean;
  stage: number;
  stages: { label: string; post: number; reached: boolean; current: boolean; month?: number }[];
  paper: number;
  fundamental: number;
  credited: number;
  /** Player's share of paper and fundamental value. */
  stakePaper: number;
  chance: number;
  odds: number;
  checks: VentureCheck[];
  next?: number;
  ended?: number;
  unicorn?: number;
  log: VenturePath["log"];
  entry: typeof VENTURE_ENTRY;
}

export function ventureView(state: GameState, s: Startup): VentureView {
  const path = s.venture;
  const values = stakeValues(s);
  const stage = path?.stage ?? -1;
  return {
    eligible: ventureEligible(s),
    stage,
    stages: VENTURE_STAGES.map((d, i) => ({
      label: d.label,
      post: i === 0 && path ? (path.log.find((l) => l.stage === 0)?.post ?? d.post) : (path?.log.find((l) => l.stage === i && !l.down)?.post ?? d.post),
      reached: i <= stage,
      current: i === stage,
      month: path?.log.find((l) => l.stage === i && !l.down)?.month ?? (i === 0 && path ? path.since : undefined),
    })),
    paper: companyValue(s),
    fundamental: valuation(s.metrics),
    credited: values.credited,
    stakePaper: values.paper,
    chance: ventureChance(state, s),
    odds: unicornOdds(state, s),
    checks: ventureChecks(state, s),
    next: path?.next,
    ended: path?.ended,
    unicorn: path?.unicorn,
    log: path?.log ?? [],
    entry: VENTURE_ENTRY,
  };
}
