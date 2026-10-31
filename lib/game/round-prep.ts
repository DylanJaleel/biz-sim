import { mnaRandom } from "./lbo";
import type { Ctx } from "./mna-core";
import { contactOf, contactRead, personOf } from "./network";
import { leverOpen, negotiateChance, negotiateTerms, prepBonus, type PrepBonus, type TermLever } from "./rounds";
import type { GameAction, GameState, Round, RoundAmbition, RoundPrep, RoundTermSheet, Startup } from "./types";
import { fulfilment, investorsFor, preparedChance, ventureChance, ventureChecks, ventureEligible, type VentureCheck } from "./venture";
import {
  AMBITION,
  INTRO_WARMTH,
  INTRO_WARMTH_MIN,
  IPO_GOALS,
  IPO_PREP_REPUTATION,
  LATE_ROUND_REPUTATION,
  NEGOTIATE_DAYS,
  PITCH_DAYS,
  PITCH_MAX,
  PREP_DAYS,
  PREP_MIN_GAP,
  PREP_MONTHS,
  ROUND_INVESTORS,
  ROUND_PREP_REPUTATION,
  STAGE_GOALS,
  UNICORN_STAGE,
  VENTURE_CHANCE,
  VENTURE_IPO_STAGE,
  VENTURE_MOOD,
  VENTURE_STAGES,
  investorGroup,
} from "./venture-config";

// Eine Finanzierungsrunde aktiv angehen: Ziel und Zeitplan setzen, Investoren
// ansprechen, ein warmes Intro über das Netzwerk holen und das Term Sheet
// verhandeln. Spielzüge und Ansichten; die Rechenregeln stehen in rounds.ts,
// der Ablauf der Runde selbst in venture.ts.

type VentureRoundAction = Extract<GameAction, { type: "ventureRound" }>;

/** Label of the round that leads to a stage (the last one is the Pre-IPO round). */
export function roundLabel(target: number | "ipo"): string {
  if (target === "ipo") return "Börsengang";
  return target === UNICORN_STAGE ? "Pre-IPO-Runde" : (VENTURE_STAGES[target]?.label ?? "Runde");
}

function openRoundOf(state: GameState, s: Startup): Round | undefined {
  return state.rounds.find((r) => r.startupId === s.id && r.status === "open");
}

/** Why the player cannot prepare the next round (or the listing) now, or null. */
export function prepBlocker(state: GameState, s: Startup, ipo: boolean): string | null {
  if (s.status !== "active" || s.stake <= 0 || !ventureEligible(s)) return "Nur bei eigenen jungen Beteiligungen mit Wachstumsinvestoren.";
  const path = s.venture;
  if (!path) return "Erst auf Seed-Niveau schauen Wachstumsinvestoren hin. Bis dahin finanziert sich die Firma mit kleinen Runden.";
  if (path.prep) return "Eine Runde ist schon in Vorbereitung.";
  if (openRoundOf(state, s)) return "Gerade liegt ein Term Sheet auf dem Tisch.";
  if (ipo) {
    if (state.reputation < IPO_PREP_REPUTATION) return `Einen Börsengang bereitest du ab ${IPO_PREP_REPUTATION} Ruf vor.`;
    if (path.stage < VENTURE_IPO_STAGE && path.unicorn === undefined) return `Börsenreif wird eine Firma ab der ${VENTURE_STAGES[VENTURE_IPO_STAGE]!.label}.`;
    if (state.exits.some((e) => e.startupId === s.id && e.status === "open")) return "Es liegt schon ein Angebot für die Firma vor.";
    return null;
  }
  if (path.unicorn !== undefined || path.stage >= UNICORN_STAGE) return "Weiter geht es nur mit Börsengang oder Verkauf.";
  if (path.ended !== undefined) return "Der Weg nach oben ist vorerst zu Ende: Ohne bessere Zahlen führt niemand eine neue Runde.";
  if (state.reputation < ROUND_PREP_REPUTATION)
    return `Runden bereitest du ab ${ROUND_PREP_REPUTATION} Ruf selbst vor. Bis dahin kommen die Investoren von allein, wenn die Zahlen stimmen.`;
  if (path.stage + 1 >= 3 && state.reputation < LATE_ROUND_REPUTATION)
    return `Ab der ${roundLabel(3)} reden Growth- und Crossover-Fonds erst ab ${LATE_ROUND_REPUTATION} Ruf mit dir. Die Runde kommt trotzdem, wenn die Zahlen stimmen.`;
  return null;
}

/** First month the prepared round can go out: the chosen timetable, but not too soon after the last round. */
export function prepDue(state: GameState, s: Startup, months: number, ipo: boolean): number {
  const at = state.month + months;
  return ipo || !s.venture ? at : Math.max(at, s.venture.since + PREP_MIN_GAP);
}

export function playVentureRound(ctx: Ctx, action: VentureRoundAction): void {
  const state = ctx.state;
  const s = state.startups.find((x) => x.id === action.startupId);
  if (!s) return ctx.fail("Diese Firma gibt es nicht.");
  if (action.move === "negotiate") return negotiate(ctx, s, action.lever);
  if (action.move === "prepare") {
    const ipo = action.ipo === true;
    const why = prepBlocker(state, s, ipo);
    if (why) return ctx.fail(why);
    const months = action.months ?? 6;
    if (!(PREP_MONTHS as readonly number[]).includes(months)) return ctx.fail("Diesen Zeitplan gibt es nicht.");
    const ambition: RoundAmbition = action.ambition ?? "market";
    if (!AMBITION[ambition]) return ctx.fail("Diese Bewertungsvorstellung gibt es nicht.");
    const path = s.venture!;
    ctx.spend("ventureRound", `${roundLabel(ipo ? "ipo" : path.stage + 1)} vorbereiten: ${s.name}`, PREP_DAYS);
    const prep: RoundPrep = { target: ipo ? "ipo" : path.stage + 1, started: state.month, due: prepDue(state, s, months, ipo), ambition, pitched: [] };
    ctx.replace({ ...s, venture: { ...path, prep } });
    ctx.lesson("meilensteine");
    return;
  }
  const path = s.venture;
  const prep = path?.prep;
  if (!path || !prep) return ctx.fail("Für diese Firma ist keine Runde in Vorbereitung.");
  if (action.move === "cancel") {
    const next = { ...path };
    delete next.prep;
    ctx.replace({ ...s, venture: next });
    return;
  }
  if (action.move === "pitch") {
    const names = investorsFor(prep.target);
    const i = action.investor ?? -1;
    if (!Number.isInteger(i) || i < 0 || i >= names.length) return ctx.fail("Diesen Investor gibt es nicht.");
    if (prep.pitched.includes(i)) return ctx.fail("Diesen Investor hast du schon getroffen.");
    if (prep.pitched.length >= PITCH_MAX) return ctx.fail(`Mehr als ${PITCH_MAX} Investoren gleichzeitig wirken verzweifelt.`);
    ctx.spend("ventureRound", `Pitch bei ${names[i]}: ${s.name}`, PITCH_DAYS);
    ctx.replace({ ...s, venture: { ...path, prep: { ...prep, pitched: [...prep.pitched, i] } } });
    return;
  }
  // Warm introduction through the VC partner of the network.
  if (prep.intro) return ctx.fail("Das Intro hast du schon.");
  const contact = contactOf(state, "vcpartner");
  if (!contact?.met || contact.warmth < INTRO_WARMTH_MIN) return ctx.fail(`Dafür brauchst du die VC-Partnerin aus deinem Netzwerk mit mindestens ${INTRO_WARMTH_MIN} Wärme.`);
  contact.warmth = Math.max(0, contact.warmth - INTRO_WARMTH);
  ctx.replace({ ...s, venture: { ...path, prep: { ...prep, intro: true } } });
  ctx.lesson("warm_intro");
}

function negotiate(ctx: Ctx, s: Startup, lever: TermLever | undefined): void {
  const state = ctx.state;
  const round = openRoundOf(state, s);
  if (!round || round.venture === undefined || !round.terms) return ctx.fail("Für diese Firma liegt kein Term Sheet zum Verhandeln vor.");
  if (state.reputation < ROUND_PREP_REPUTATION) return ctx.fail(`Verhandeln kannst du ab ${ROUND_PREP_REPUTATION} Ruf.`);
  if (!lever || !leverOpen(round.terms, lever)) return ctx.fail("Diesen Punkt kannst du nicht mehr verhandeln.");
  ctx.spend("ventureRound", `Term Sheet verhandeln: ${s.name}`, NEGOTIATE_DAYS);
  const result = negotiateTerms(round, round.terms, lever, mnaRandom(state, `negotiate|${round.id}|${lever}`));
  round.preMoney = result.preMoney;
  round.terms = { ...result.terms, log: [...(round.terms.log ?? []), result.text] };
  ctx.lesson(lever === "pref" ? "liquidationspraeferenz" : "term_sheet");
}

// ---------------------------------------------------------------------------
// Ansichten
// ---------------------------------------------------------------------------

export interface PrepOption<T> {
  value: T;
  label: string;
  text: string;
}

export interface RoundPrepView {
  /** Round to prepare (or prepared): label, theme of the milestones, what investors look for. */
  target: number | "ipo" | null;
  label: string;
  theme: string;
  text: string;
  blocker: string | null;
  /** The listing can be prepared (Serie D or unicorn). */
  ipo: { possible: boolean; blocker: string | null };
  prep?: RoundPrep & { ambitionLabel: string };
  checks: VentureCheck[];
  fulfilment: number;
  chance: { base: number; bonus: PrepBonus; total: number };
  investors: { group: string; names: { index: number; name: string; pitched: boolean }[]; max: number };
  intro: { name: string; possible: boolean; reason: string | null; done: boolean };
  months: PrepOption<number>[];
  ambitions: PrepOption<RoundAmbition>[];
  /** Price range of the round at market price (post-money). */
  price?: { low: number; high: number; amount: number; dilution: number };
  daysLeft: number;
}

const ZERO_BONUS: PrepBonus = { ambition: 0, pitches: 0, intro: 0, total: 0 };

export function roundPrepView(state: GameState, s: Startup, daysLeft: number): RoundPrepView | null {
  if (!ventureEligible(s) || s.status !== "active") return null;
  const path = s.venture;
  const prep = path?.prep;
  const nextStage = path ? path.stage + 1 : 0;
  const ipoBlocker = prepBlocker(state, s, true);
  const ipoPossible = !!path && (path.stage >= VENTURE_IPO_STAGE || path.unicorn !== undefined);
  const roundOpen = !!path && path.unicorn === undefined && path.ended === undefined && path.stage < UNICORN_STAGE;
  const target: number | "ipo" | null = prep ? prep.target : roundOpen ? nextStage : ipoPossible ? "ipo" : null;
  const goals = STAGE_GOALS[target === "ipo" ? IPO_GOALS : Math.min(UNICORN_STAGE, Math.max(0, target ?? nextStage))]!;
  const checks = target === null ? [] : ventureChecks(state, s, target);
  const f = fulfilment(checks);
  const bonus = prep ? prepBonus(prep) : ZERO_BONUS;
  const mood = VENTURE_MOOD[state.market.regime];
  const base = target === "ipo" ? Math.max(VENTURE_CHANCE.min, Math.min(VENTURE_CHANCE.max, (0.2 + 0.55 * f) * mood)) : ventureChance(state, s);
  const total = target === "ipo" ? Math.min(0.72, Math.max(VENTURE_CHANCE.min, base + bonus.total)) : preparedChance(state, s, prep);
  const group = ROUND_INVESTORS[investorGroup(target ?? nextStage)]!;
  const contact = contactRead(state, "vcpartner");
  const person = personOf(state, contact);
  const introReason = !contact.met
    ? "Noch nicht kennengelernt (Netzwerk)."
    : contact.warmth < INTRO_WARMTH_MIN
      ? `Zu kühl: ${Math.round(contact.warmth)} von ${INTRO_WARMTH_MIN} Wärme.`
      : null;
  const def = typeof target === "number" ? VENTURE_STAGES[target] : undefined;
  return {
    target,
    label: target === null ? "–" : roundLabel(target),
    theme: goals.theme,
    text: goals.text,
    blocker: target === "ipo" && !prep ? ipoBlocker : prepBlocker(state, s, false),
    ipo: { possible: ipoPossible, blocker: ipoBlocker },
    ...(prep ? { prep: { ...prep, ambitionLabel: AMBITION[prep.ambition].label } } : {}),
    checks,
    fulfilment: f,
    chance: { base, bonus, total },
    investors: { group: group.label, names: group.names.map((name, index) => ({ index, name, pitched: prep?.pitched.includes(index) ?? false })), max: PITCH_MAX },
    intro: { name: person.name, possible: !introReason && !prep?.intro, reason: introReason, done: prep?.intro ?? false },
    months: PREP_MONTHS.map((m) => ({
      value: m,
      label: `${m} Monate`,
      text: m === 3 ? "Schnell, mit den Zahlen von heute." : m === 6 ? "Zeit für ein, zwei Ziele." : "Mit Puffer: die Zahlen reifen länger.",
    })),
    ambitions: (Object.keys(AMBITION) as RoundAmbition[]).map((a) => ({ value: a, label: AMBITION[a].label, text: AMBITION[a].text })),
    ...(def && path ? { price: priceRange(def.post, def.dilution, path.paper) } : {}),
    daysLeft,
  };
}

function priceRange(post: number, dilution: number, paper: number) {
  const low = Math.max(post * 0.9, paper * 1.3);
  const high = Math.max(post * 1.15, paper * 1.3);
  return { low, high, amount: ((low + high) / 2) * dilution, dilution };
}

export interface TermSheetView {
  terms: RoundTermSheet;
  investorKind: string;
  levers: { lever: TermLever; label: string; text: string; open: boolean; chance: number }[];
  canNegotiate: boolean;
  reason: string | null;
}

const LEVER_TEXT: Record<TermLever, { label: string; text: string }> = {
  price: { label: "Höhere Bewertung", text: "10 % mehr vor dem Geld. Klappt es nicht, verlangt der Lead oft eine höhere Präferenz." },
  pref: { label: "Saubere Präferenz", text: "Zurück auf 1×: Bei einem Verkauf bekommt der Fonds nur sein Geld zuerst zurück. Kostet etwas Bewertung." },
  seat: { label: "Ohne Beiratssitz", text: "Der Lead schickt nur einen Beobachter. Der Beirat bleibt, wie er ist. Kostet etwas Bewertung." },
};

export function termSheetView(state: GameState, round: Round): TermSheetView | null {
  if (round.venture === undefined || !round.terms) return null;
  const terms = round.terms;
  const reason = round.status !== "open" ? "Die Runde ist entschieden." : state.reputation < ROUND_PREP_REPUTATION ? `Verhandeln kannst du ab ${ROUND_PREP_REPUTATION} Ruf.` : null;
  return {
    terms,
    investorKind: ROUND_INVESTORS[investorGroup(round.venture)]!.label,
    levers: (["price", "pref", "seat"] as const).map((lever) => ({ lever, ...LEVER_TEXT[lever], open: leverOpen(terms, lever), chance: negotiateChance(terms, lever) })),
    canNegotiate: reason === null,
    reason,
  };
}
