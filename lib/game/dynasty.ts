import { ASSETS } from "./market";
import { LIVING_COSTS, TRADE_FEE, monthLabel } from "./config";
import { eur, type Ctx } from "./mna-core";
import { netRandom } from "./network";
import { officeRent } from "./estate";
import type { AssetId, GameAction, GameState, IncomeLines } from "./types";
import type { CharterId, DynastyState, Heir, HeirKind, WealthStrategy } from "./wealth-types";

// Dynastie: eine Nachfolge aufbauen, die Familie ordnen, das Family Office
// übergeben. Danach (Generation 2) führt die Nachfolge das Tagesgeschäft,
// du beobachtest und verwaltest das Familienvermögen.

export interface HeirDef {
  kind: HeirKind;
  name: string;
  short: string;
  role: string;
  age: number;
  text: string;
  /** Maturity at the start, per month without mentoring, per mentoring day. */
  start: number;
  base: number;
  perDay: number;
  /** Months before the handover is possible (the child has to come of age). */
  minMonths: number;
  /** How often the heir finds the best option in a board meeting after the handover. */
  skill: number;
  /** Reputation per year after the handover (a known family name). */
  fame: number;
  traits: Record<"Urteil" | "Risiko" | "Menschen" | "Zahlen" | "Ausdauer", number>;
  pros: string[];
  cons: string[];
}

// Neutral by design: with the same mentoring both are ready at about the same time.
export const HEIRS: Record<HeirKind, HeirDef> = {
  kind: {
    kind: "kind",
    name: "Jonas",
    short: "JO",
    role: "Dein Sohn",
    age: 17,
    text: "Schüler, jobbt in einer Bäckerei. Schnell, neugierig, risikofreudig.",
    start: 15,
    base: 0.2,
    perDay: 0.55,
    minMonths: 48,
    skill: 0.7,
    fame: 1,
    traits: { Urteil: 55, Risiko: 80, Menschen: 75, Zahlen: 50, Ausdauer: 60 },
    pros: ["Lernt schnell: jeder Mentoring-Tag zählt mehr", "Trägt den Familiennamen: nach der Übergabe +1 Ruf im Jahr"],
    cons: ["Startet mit wenig Reife", "Übergabe frühestens in vier Jahren (ab 21)", "Entscheidet mutiger, aber seltener genau richtig"],
  },
  schuetzling: {
    kind: "schuetzling",
    name: "Dr. Nadia Karimi",
    short: "NK",
    role: "Dein Schützling",
    age: 29,
    text: "Betriebswirtin, seit Jahren an deiner Seite. Gründlich, ruhig, stark in Zahlen.",
    start: 40,
    base: 0.15,
    perDay: 0.35,
    minMonths: 0,
    skill: 0.8,
    fame: 0,
    traits: { Urteil: 75, Risiko: 45, Menschen: 60, Zahlen: 85, Ausdauer: 65 },
    pros: ["Startet reifer", "Übergabe möglich, sobald sie bereit ist", "Entscheidet im Beirat öfter genau richtig"],
    cons: ["Lernt langsamer: Mentoring bringt weniger je Tag", "Kein Familienname: kein Ruf-Bonus nach der Übergabe"],
  },
};

export const DYNASTY = {
  startCohesion: 50,
  /** Ready to take over. */
  maturity: 80,
  cohesion: 60,
  charter: 2,
  mentorMax: 3,
  handoverDays: 3,
  /** Once a year, maturity may stagnate for some months. */
  stallChance: 0.1,
  stallMonths: 6,
  /** Mentoring days during a stagnation that keep the heir on board. */
  stallDays: 6,
  /** Chance the heir quits after a stagnation: with enough mentoring, and without. */
  quit: { kept: 0.15, neglected: 0.6 },
  charterCost: 2_500,
  charterCohesion: 6,
  /** The family council meets once a year; ignoring it costs cohesion. */
  councilMissed: -3,
  /** Generation 2: a family branch wants to be paid out when cohesion is low. */
  conflictCohesion: 40,
  conflictShare: 0.03,
} as const;

export interface CharterDef {
  id: CharterId;
  title: string;
  text: string;
}

export const CHARTER: CharterDef[] = [
  { id: "ausschuettung", title: "Ausschüttungsregel", text: "Wie viel das Family Office jedes Jahr an die Familie zahlt, und wann nicht." },
  { id: "eintritt", title: "Eintritt in die Firmen", text: "Wer aus der Familie mitarbeiten darf: Ausbildung, Erfahrung außerhalb, Probezeit." },
  { id: "streit", title: "Streitschlichtung", text: "Ein Beirat von außen schlichtet, bevor jemand vor Gericht zieht." },
  { id: "werte", title: "Werte und Stiftung", text: "Wofür die Familie steht und wie sie sich gemeinsam engagiert." },
  { id: "nachfolge", title: "Nachfolgeregel", text: "Wer das Family Office führt, wie die Nachfolge vorbereitet und übergeben wird." },
];

export interface CouncilOption {
  label: string;
  cohesion: number;
  /** Fixed cost, or share of the account. */
  cost?: number;
  share?: number;
}

export interface CouncilQuestion {
  id: string;
  title: string;
  text: string;
  options: [CouncilOption, CouncilOption];
}

export const COUNCIL: CouncilQuestion[] = [
  {
    id: "ausschuettung",
    title: "Ausschüttung an die Familie",
    text: "Die Geschwister fragen, ob das Family Office in diesem Jahr etwas an die Familie auszahlt.",
    options: [
      { label: "2 % des Kontos ausschütten", cohesion: 5, share: 0.02 },
      { label: "Alles bleibt im Family Office", cohesion: -2 },
    ],
  },
  {
    id: "cousine",
    title: "Lea will mitarbeiten",
    text: "Deine Cousine Lea möchte nach dem Studium ins Family Office.",
    options: [
      { label: "Aufnehmen, mit einem Jahr Probezeit", cohesion: 4, cost: 30_000 },
      { label: "Absagen, Praktikum in einer Beteiligung vermitteln", cohesion: -1 },
    ],
  },
  {
    id: "ferienhaus",
    title: "Das alte Ferienhaus am See",
    text: "Ein Teil der Familie will das Ferienhaus verkaufen, der andere es behalten.",
    options: [
      { label: "Behalten und gemeinsam renovieren", cohesion: 3, cost: 15_000 },
      { label: "Verkaufen und den Erlös teilen", cohesion: -2 },
    ],
  },
  {
    id: "engagement",
    title: "Gemeinsam etwas bewegen",
    text: "Die Jüngeren wünschen sich ein Projekt, das die ganze Familie trägt.",
    options: [
      { label: "Gemeinsames Förderprojekt starten", cohesion: 4, cost: 25_000 },
      { label: "Jeder engagiert sich für sich", cohesion: -1 },
    ],
  },
];

export const COUNCIL_DAYS = 1;

export interface StrategyDef {
  id: WealthStrategy;
  label: string;
  text: string;
  weights: Record<AssetId, number>;
}

export const STRATEGIES: Record<WealthStrategy, StrategyDef> = {
  bewahren: { id: "bewahren", label: "Bewahren", text: "Vor allem Tagesgeld und Anleihen. Wenig Schwankung, wenig Ertrag.", weights: { tagesgeld: 0.5, anleihen: 0.4, dividenden: 0.1, tech: 0 } },
  ausgewogen: { id: "ausgewogen", label: "Ausgewogen", text: "Je ein Teil sicher, ein Teil Aktien. Der Klassiker für Familienvermögen.", weights: { tagesgeld: 0.2, anleihen: 0.35, dividenden: 0.3, tech: 0.15 } },
  wachstum: { id: "wachstum", label: "Wachstum", text: "Überwiegend Aktien. Mehr Chancen, starke Ausschläge.", weights: { tagesgeld: 0.05, anleihen: 0.15, dividenden: 0.4, tech: 0.4 } },
};

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

function emptyDynasty(): DynastyState {
  return { lost: [], cohesion: DYNASTY.startCohesion, charter: [], councils: 0, generation: 1 };
}

export function dynastyOf(state: GameState): DynastyState {
  state.wealth = state.wealth ?? {};
  if (!state.wealth.dynasty) state.wealth.dynasty = emptyDynasty();
  return state.wealth.dynasty;
}

export function dynastyRead(state: GameState): DynastyState {
  return state.wealth?.dynasty ?? emptyDynasty();
}

export function generationTwo(state: GameState): boolean {
  return state.wealth?.dynasty?.generation === 2;
}

/** The heir running the business in generation 2, or null. */
export function heirInCharge(state: GameState): HeirDef | null {
  const d = state.wealth?.dynasty;
  return d?.generation === 2 && d.heir ? HEIRS[d.heir.kind] : null;
}

/** Months until the heir is ready at the current pace (null: not at this pace). */
export function monthsToReady(heir: Heir, daysPerMonth: number): number | null {
  const def = HEIRS[heir.kind];
  const pace = def.base + def.perDay * daysPerMonth;
  const gap = DYNASTY.maturity - heir.maturity;
  if (gap <= 0) return 0;
  return pace > 0 ? Math.ceil(gap / pace) : null;
}

export interface HandoverCheck {
  label: string;
  done: boolean;
}

export function handoverChecks(state: GameState): HandoverCheck[] {
  const d = dynastyRead(state);
  const heir = d.heir;
  const def = heir ? HEIRS[heir.kind] : null;
  const age = heir && def ? state.month - heir.chosen : 0;
  return [
    { label: "Family Office gegründet", done: state.familyOffice !== undefined },
    { label: heir ? `Reife ${DYNASTY.maturity} (heute ${Math.floor(heir.maturity)})` : `Nachfolge gewählt`, done: !!heir && heir.maturity >= DYNASTY.maturity },
    { label: `Zusammenhalt der Familie ${DYNASTY.cohesion} (heute ${Math.round(d.cohesion)})`, done: d.cohesion >= DYNASTY.cohesion },
    { label: `Familiencharta mit mindestens ${DYNASTY.charter} Artikeln (bisher ${d.charter.length})`, done: d.charter.length >= DYNASTY.charter },
    ...(def && def.minMonths > 0 ? [{ label: `${def.name} ist volljährig genug (ab Monat ${heir!.chosen + def.minMonths})`, done: age >= def.minMonths }] : []),
  ];
}

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------

function requireFamilyOffice(ctx: Ctx): void {
  if (ctx.state.familyOffice === undefined) ctx.fail("Nachfolge und Familienrat beginnen mit dem Family Office.");
}

export function chooseHeir(ctx: Ctx, kind: HeirKind): void {
  requireFamilyOffice(ctx);
  const d = dynastyOf(ctx.state);
  if (d.generation === 2) ctx.fail("Die Übergabe ist schon geschehen.");
  if (d.heir) ctx.fail(`${HEIRS[d.heir.kind].name} ist schon deine Nachfolge.`);
  if (d.lost.includes(kind)) ctx.fail(`${HEIRS[kind].name} hat abgesagt und kommt nicht zurück.`);
  const def = HEIRS[kind];
  d.heir = { kind, chosen: ctx.state.month, maturity: def.start, days: 0, totalDays: 0 };
  ctx.lesson("family_governance");
  ctx.mail({
    kind: "system",
    from: def.name,
    subject: "Ich bin dabei",
    body: `${def.name} sagt zu und will lernen, wie dein Family Office arbeitet. Jeder Mentoring-Tag bringt Reife, ohne Mentoring wächst sie nur langsam. Bereit ist man ab Reife ${DYNASTY.maturity}.`,
  });
}

export function mentor(ctx: Ctx): void {
  const d = dynastyOf(ctx.state);
  const heir = d.heir;
  if (!heir || d.generation === 2) ctx.fail("Es gibt niemanden zu begleiten.");
  if (heir.days >= DYNASTY.mentorMax) ctx.fail(`Mehr als ${DYNASTY.mentorMax} Mentoring-Tage im Monat überfordern ${HEIRS[heir.kind].name}.`);
  ctx.spend("dynasty", `Mentoring ${HEIRS[heir.kind].name}`, 1);
  heir.days += 1;
}

export function signCharter(ctx: Ctx, article: CharterId): void {
  requireFamilyOffice(ctx);
  const d = dynastyOf(ctx.state);
  const def = CHARTER.find((c) => c.id === article);
  if (!def) ctx.fail("Diesen Artikel gibt es nicht.");
  if (d.charter.includes(article)) ctx.fail("Dieser Artikel steht schon in der Charta.");
  if (ctx.state.cash < DYNASTY.charterCost) ctx.fail("Für die Anwältin fehlt dir das Geld.");
  ctx.spend("dynasty", `Familiencharta: ${def.title}`, 1);
  ctx.state.cash -= DYNASTY.charterCost;
  d.charter.push(article);
  d.cohesion = Math.min(100, d.cohesion + DYNASTY.charterCohesion);
  ctx.lesson("family_governance");
}

export function councilQuestion(state: GameState): CouncilQuestion | null {
  const c = state.wealth?.dynasty?.council;
  if (!c || c.choice !== undefined || c.month !== state.month) return null;
  return COUNCIL.find((q) => q.id === c.question) ?? null;
}

export function decideCouncil(ctx: Ctx, choice: number): void {
  const q = councilQuestion(ctx.state);
  if (!q) ctx.fail("Der Familienrat tagt gerade nicht.");
  const option = q.options[choice];
  if (!option) ctx.fail("Diese Antwort gibt es nicht.");
  const cost = option.cost ?? Math.round(Math.max(0, ctx.state.cash) * (option.share ?? 0));
  if (cost > 0 && ctx.state.cash < cost) ctx.fail("Dafür reicht dein Konto nicht.");
  ctx.spend("dynasty", "Familienrat", COUNCIL_DAYS);
  const d = dynastyOf(ctx.state);
  ctx.state.cash -= cost;
  d.cohesion = Math.max(0, Math.min(100, d.cohesion + option.cohesion));
  d.council!.choice = choice;
  d.councils += 1;
}

export function handover(ctx: Ctx): void {
  const d = dynastyOf(ctx.state);
  if (d.generation === 2) ctx.fail("Die Übergabe ist schon geschehen.");
  const open = handoverChecks(ctx.state).filter((c) => !c.done);
  if (open.length > 0) ctx.fail(`Noch nicht bereit: ${open.map((c) => c.label).join(", ")}.`);
  ctx.spend("dynasty", "Übergabe des Family Office", DYNASTY.handoverDays);
  const def = HEIRS[d.heir!.kind];
  d.generation = 2;
  d.handedOver = ctx.state.month;
  d.strategy = d.strategy ?? "ausgewogen";
  ctx.reputation(2);
  ctx.mail({
    kind: "system",
    from: def.name,
    subject: "Generation 2 beginnt",
    body: `Ab heute führt ${def.name} das Tagesgeschäft: Beiräte, Runden, neue Beteiligungen. Du beobachtest, berätst im Familienrat und verwaltest das Familienvermögen: Anlagestrategie, Immobilien, Stiftung. Einmal im Jahr bekommst du einen Bericht.`,
  });
}

export function setStrategy(ctx: Ctx, strategy: WealthStrategy | "none"): void {
  requireFamilyOffice(ctx);
  const d = dynastyOf(ctx.state);
  if (strategy === "none") delete d.strategy;
  else {
    if (!STRATEGIES[strategy]) ctx.fail("Diese Strategie gibt es nicht.");
    d.strategy = strategy;
    ctx.lesson("diversifikation");
  }
}

// ---------------------------------------------------------------------------
// Generation 2: was nur noch die Nachfolge entscheidet
// ---------------------------------------------------------------------------

const HEIR_MOVES = new Set<GameAction["type"]>([
  "dd",
  "invest",
  "decline",
  "question",
  "cfo",
  "pretalk",
  "meeting",
  "followUp",
  "founderCall",
  "round",
  "buyShares",
  "askShares",
  "introContact",
  "gig",
  "exit",
  "buyout",
  "hire",
  "fire",
  "assign",
  "raiseFund",
  "mandate",
  "search",
  "examine",
  "acquire",
  "joinCorporate",
  "specialist",
  "contactHint",
  "lever",
]);

/** In generation 2 the heir runs the business: the reason a move is not the player's any more, or null. */
export function heirBlocks(state: GameState, action: GameAction): string | null {
  const heir = heirInCharge(state);
  if (!heir) return null;
  const blocked = HEIR_MOVES.has(action.type) || (action.type === "platform" && action.move !== "cure");
  return blocked ? `Das Tagesgeschäft führt jetzt ${heir.name}. Du beobachtest und kümmerst dich um das Familienvermögen: Anlagestrategie, Immobilien, Stiftung und Familienrat.` : null;
}

// ---------------------------------------------------------------------------
// Monat
// ---------------------------------------------------------------------------

export function dynastyMonth(ctx: Ctx, month: number, income: IncomeLines, notes: string[]): void {
  const { state } = ctx;
  const d = state.wealth?.dynasty;
  if (d) {
    growHeir(ctx, d, month, notes);
    council(ctx, d, month, notes);
    if (d.generation === 2) generationTwoMonth(ctx, d, month, income, notes);
  }
  rebalance(state, notes);
}

function growHeir(ctx: Ctx, d: DynastyState, month: number, notes: string[]): void {
  const heir = d.heir;
  if (!heir || d.generation === 2) return;
  const def = HEIRS[heir.kind];
  const stalled = heir.stalled !== undefined && heir.stalled >= month;
  const gain = stalled ? (def.perDay * heir.days) / 2 : def.base + def.perDay * heir.days;
  heir.maturity = Math.min(100, heir.maturity + gain);
  heir.totalDays += heir.days;
  if (stalled) heir.stallDays = (heir.stallDays ?? 0) + heir.days;
  heir.days = 0;
  if (heir.stalled !== undefined && heir.stalled === month) {
    const kept = (heir.stallDays ?? 0) >= DYNASTY.stallDays;
    const r = netRandom(ctx.state.seed, `dynasty|quit|${month}`);
    if (r() < (kept ? DYNASTY.quit.kept : DYNASTY.quit.neglected)) {
      d.lost.push(heir.kind);
      delete d.heir;
      const other = (Object.keys(HEIRS) as HeirKind[]).find((k) => !d.lost.includes(k));
      ctx.mail({
        kind: "system",
        from: def.name,
        subject: "Ich höre auf",
        body: `${def.name} sagt ab: Das Family Office soll jemand anderes führen. ${other ? `Du kannst stattdessen ${HEIRS[other].name} aufbauen, das bisherige Mentoring ist aber verloren.` : "Eine weitere Nachfolge gibt es nicht."}`,
      });
      notes.push(`${def.name} hat die Nachfolge abgebrochen.`);
      return;
    }
    delete heir.stalled;
    delete heir.stallDays;
    notes.push(`${def.name} hat die Durststrecke überwunden. Die Reife wächst wieder.`);
    return;
  }
  // Once a year: a phase where nothing seems to move.
  if ((month + 1) % 12 === 4 && heir.stalled === undefined && heir.maturity < DYNASTY.maturity && month - heir.chosen >= 12) {
    const r = netRandom(ctx.state.seed, `dynasty|stall|${month}`);
    if (r() < DYNASTY.stallChance) {
      heir.stalled = month + DYNASTY.stallMonths;
      heir.stallDays = 0;
      ctx.mail({
        kind: "system",
        from: def.name,
        subject: "Eine Durststrecke",
        body: `${def.name} zweifelt, ob das Family Office das Richtige ist. Bis ${monthLabel(heir.stalled)} wächst die Reife kaum. Mit mindestens ${DYNASTY.stallDays} Mentoring-Tagen in dieser Zeit bleibt die Nachfolge meist an Bord, ohne Begleitung droht der Abbruch.`,
      });
    }
  }
}

function council(ctx: Ctx, d: DynastyState, month: number, notes: string[]): void {
  // An unanswered council ends with the month.
  if (d.council && d.council.month === month && d.council.choice === undefined) {
    d.cohesion = Math.max(0, d.cohesion + DYNASTY.councilMissed);
    notes.push("Der Familienrat hat ohne dich getagt. Der Zusammenhalt leidet.");
  }
  // The council meets every April.
  if ((month + 1) % 12 === 7) {
    const q = COUNCIL[d.councils % COUNCIL.length]!;
    d.council = { month: month + 1, question: q.id };
    ctx.mail({ kind: "system", from: "Familienrat", subject: `Familienrat: ${q.title}`, body: `${q.text} Der Rat tagt diesen Monat. Antworte in „Stiftung & Dynastie“, sonst entscheidet die Familie ohne dich.` });
  }
}

function generationTwoMonth(ctx: Ctx, d: DynastyState, month: number, income: IncomeLines, notes: string[]): void {
  const def = d.heir ? HEIRS[d.heir.kind] : null;
  if (!def) return;
  if ((month + 1) % 12 === 4) {
    if (def.fame > 0) ctx.reputation(def.fame);
    ctx.mail({
      kind: "system",
      from: def.name,
      subject: "Jahresbericht der Nachfolge",
      body: `${def.name} berichtet: ${ctx.state.startups.filter((s) => s.status === "active" && !s.corporate).length} aktive Beteiligungen, Vermögen der Familie ${eur(ctx.worth())}, Zusammenhalt ${Math.round(d.cohesion)}.`,
    });
  }
  // Low cohesion: once a year a branch of the family wants to be paid out.
  if ((month + 1) % 12 === 10 && d.cohesion < DYNASTY.conflictCohesion) {
    const amount = Math.round(Math.max(0, ctx.worth()) * DYNASTY.conflictShare);
    ctx.state.cash -= amount;
    income.foundation = (income.foundation ?? 0) - amount;
    d.cohesion = Math.min(100, d.cohesion + 5);
    notes.push(`Familienstreit: Ein Zweig der Familie lässt sich auszahlen (${eur(amount)}). Eine Charta und der Familienrat hätten das verhindert.`);
  }
}

/** Monthly fixed costs for the cash reserve of the strategy. */
function reserveOf(state: GameState): number {
  const salaries = state.team.reduce((s, m) => s + m.salary, 0);
  return 150_000 + 6 * (LIVING_COSTS + officeRent(state) + salaries);
}

/** The family office invests free money by its strategy and rebalances when a weight is off: sales first, then purchases. */
function rebalance(state: GameState, notes: string[]): void {
  const strategy = state.wealth?.dynasty?.strategy;
  if (!strategy || state.familyOffice === undefined) return;
  const m = state.market;
  const depot = ASSETS.reduce((s, a) => s + m.holdings[a.id] * m.prices[a.id], 0);
  const investable = Math.max(0, state.cash + depot - reserveOf(state));
  const gap = (id: AssetId) => investable * STRATEGIES[strategy].weights[id] - m.holdings[id] * m.prices[id];
  const due = (id: AssetId) => Math.abs(gap(id)) >= Math.max(5_000, investable * STRATEGIES[strategy].weights[id] * 0.05);
  let traded = 0;
  for (const a of ASSETS) {
    if (gap(a.id) >= 0 || !due(a.id)) continue;
    const current = m.holdings[a.id] * m.prices[a.id];
    const sell = Math.min(-gap(a.id), current);
    const share = sell / current;
    m.holdings[a.id] -= m.holdings[a.id] * share;
    m.invested[a.id] -= m.invested[a.id] * share;
    if (m.holdings[a.id] < 1e-6) {
      m.holdings[a.id] = 0;
      m.invested[a.id] = 0;
    }
    state.cash += sell * (1 - TRADE_FEE);
    traded += sell;
  }
  for (const a of ASSETS) {
    if (gap(a.id) <= 0 || !due(a.id)) continue;
    const amount = Math.min(gap(a.id), state.cash / (1 + TRADE_FEE));
    if (amount < 1_000) continue;
    state.cash -= amount * (1 + TRADE_FEE);
    m.holdings[a.id] += amount / m.prices[a.id];
    m.invested[a.id] += amount;
    traded += amount;
  }
  if (traded > 50_000) notes.push(`Vermögensverwaltung (${STRATEGIES[strategy].label}): ${eur(traded)} umgeschichtet.`);
}
