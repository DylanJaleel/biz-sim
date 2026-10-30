import { FAMILY_OFFICE_REPUTATION } from "./config";
import { mnaRead, eur, mio, type Ctx } from "./mna-core";
import type { GameState, IncomeLines } from "./types";
import type { FoundationPurpose, FoundationState, LegacyPoint } from "./wealth-types";

// Lebenswerk: verwaltetes Vermögen (AuM) für die Stufe „Fondsfamilie“, der
// Lebenswerk-Wert als Anzeige mit Verlauf und die gemeinnützige Stiftung mit
// einer einfachen, lokalen Steuerregel. Ein Steuersystem fürs ganze Spiel
// kommt später (siehe docs/boardroom-konzept.md, „Später“).

// ---------------------------------------------------------------------------
// Verwaltetes Vermögen (Assets under Management)
// ---------------------------------------------------------------------------

/** Career step "Fondsfamilie". */
export const FUND_FAMILY_AUM = 1_000_000_000;

export interface ManagedAssets {
  /** Net worth of the family, once it sits in a family office. */
  familyOffice: number;
  /** Committed capital of own funds, investors' money included. */
  funds: number;
  /** Endowment of the foundation: managed by the family office, owned by nobody. */
  foundation: number;
  total: number;
}

/**
 * What counts as assets under management: everything the player decides on
 * for others or for the family. The own funds count with their full size
 * (the investors' commitments included), the family's net worth only once it
 * is run by a family office, and the foundation's endowment. Further funds
 * (Fonds II, III) belong in `funds`.
 */
export function managedAssets(state: GameState, worth: number): ManagedAssets {
  const familyOffice = state.familyOffice !== undefined ? Math.max(0, worth) : 0;
  const funds = state.fund?.size ?? 0;
  const foundation = state.wealth?.foundation?.capital ?? 0;
  return { familyOffice, funds, foundation, total: familyOffice + funds + foundation };
}

// ---------------------------------------------------------------------------
// Lebenswerk-Wert
// ---------------------------------------------------------------------------

export interface LegacyPart {
  id: "worth" | "exits" | "foundation" | "reputation" | "trophies";
  label: string;
  detail: string;
  points: number;
}

export interface Legacy {
  total: number;
  parts: LegacyPart[];
}

/** Points per unit; the score is only shown, it decides nothing. */
export const LEGACY_POINTS = { perMio: 1, perExit: 3, perPlatform: 5, perFoundationMio: 1.5, perPerson: 0.05, perReputation: 0.5, perTrophy: 2 } as const;

export function legacyOf(state: GameState, worth: number): Legacy {
  const P = LEGACY_POINTS;
  const sales = state.exits.filter((e) => e.status === "accepted").length;
  const platforms = mnaRead(state).record.platformExits.filter((e) => !e.forced).length;
  const f = state.wealth?.foundation;
  const capital = f?.capital ?? 0;
  const people = Math.floor(f?.people ?? 0);
  const trophies = state.trophies.length;
  const parts: LegacyPart[] = [
    { id: "worth", label: "Vermögen", detail: `${mio(Math.max(0, worth))} · ${P.perMio} Punkt je Mio. €`, points: (Math.max(0, worth) / 1_000_000) * P.perMio },
    {
      id: "exits",
      label: "Verkäufe",
      detail: `${sales} Firmenverkäufe, ${platforms} Plattformen · ${P.perExit} je Verkauf, ${P.perPlatform} je Plattform`,
      points: sales * P.perExit + platforms * P.perPlatform,
    },
    {
      id: "foundation",
      label: "Stiftung und Wirkung",
      detail:
        capital > 0
          ? `${mio(capital)} gestiftet, ${people.toLocaleString("de-DE")} Menschen gefördert`
          : `noch keine · ${P.perFoundationMio} je gestifteter Mio. €, ${P.perPerson} je geförderter Person`,
      points: (capital / 1_000_000) * P.perFoundationMio + people * P.perPerson,
    },
    { id: "reputation", label: "Ruf", detail: `${state.reputation} von 100 · ${P.perReputation} Punkte je Rufpunkt`, points: state.reputation * P.perReputation },
    { id: "trophies", label: "Tombstones in der Vitrine", detail: `${trophies} Stück · ${P.perTrophy} Punkte je Stück`, points: trophies * P.perTrophy },
  ];
  return { total: Math.round(parts.reduce((s, p) => s + p.points, 0)), parts };
}

/** One point per quarter for the chart; at most 20 years. */
export function recordLegacy(state: GameState, month: number, worth: number): void {
  if (month % 3 !== 1 && (state.wealth?.legacy?.length ?? 0) > 0) return;
  state.wealth = state.wealth ?? {};
  const points: LegacyPoint[] = state.wealth.legacy ?? [];
  if (points.at(-1)?.month === month) return;
  points.push({ month, value: legacyOf(state, worth).total });
  state.wealth.legacy = points.slice(-80);
}

// ---------------------------------------------------------------------------
// Stiftung
// ---------------------------------------------------------------------------

export const FOUNDATION = {
  reputation: 70,
  worth: 5_000_000,
  /** Smallest endowment at founding and smallest later gift. */
  minCapital: 1_000_000,
  minGift: 250_000,
  cost: 20_000,
  days: 2,
  giveDays: 1,
  /** Yield on the endowment per year, all of it spent on the programme. */
  yield: 0.03,
  /**
   * Local tax rule (simplified § 10b Abs. 1a EStG): gifts into the endowment
   * up to 1 Mio. € within ten years reduce the income tax; refunded at the
   * top rate of 42 % with the next month's close.
   */
  allowance: 1_000_000,
  allowanceMonths: 120,
  taxRate: 0.42,
  /** Reputation: founding, and per full million given (at most 3 per gift). */
  foundReputation: 3,
  giftReputationMax: 3,
} as const;

export const FOUNDATION_AMOUNTS = [250_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000] as const;

export interface PurposeDef {
  id: FoundationPurpose;
  label: string;
  text: string;
  /** Money per person supported in a year. */
  perPerson: number;
  people: string;
}

export const PURPOSES: Record<FoundationPurpose, PurposeDef> = {
  bildung: { id: "bildung", label: "Bildung", text: "Stipendien und Wirtschaftskurse an Schulen.", perPerson: 2_000, people: "Schülerinnen und Schüler" },
  gruenderinnen: { id: "gruenderinnen", label: "Gründerinnen", text: "Stipendien und Mentoring für Gründerinnen im ersten Jahr.", perPerson: 20_000, people: "Gründerinnen" },
  nachfolge: {
    id: "nachfolge",
    label: "Nachfolge-Werkstatt",
    text: "Kurse für Menschen, die einen Familienbetrieb übernehmen wollen.",
    perPerson: 10_000,
    people: "Nachfolgerinnen und Nachfolger",
  },
};

export function foundationRead(state: GameState): FoundationState | undefined {
  return state.wealth?.foundation;
}

/** Why the player cannot set up a foundation now, or null. */
export function foundationBlocker(state: GameState, worth: number): string | null {
  if (state.wealth?.foundation) return "Deine Stiftung gibt es schon.";
  if (state.familyOffice === undefined) return `Eine Stiftung gründest du aus dem Family Office heraus (ab ${FAMILY_OFFICE_REPUTATION} Ruf).`;
  if (state.reputation < FOUNDATION.reputation) return `Stiftungsaufsicht und Partner nehmen dich ab ${FOUNDATION.reputation} Ruf ernst.`;
  if (worth < FOUNDATION.worth) return `Eine Stiftung lohnt sich ab etwa ${mio(FOUNDATION.worth)} Vermögen.`;
  return null;
}

/** Endowment gifts still deductible in the ten-year window. */
export function allowanceLeft(state: GameState, month = state.month): number {
  const gifts = state.wealth?.foundation?.gifts ?? [];
  const used = gifts.filter((g) => g.month > month - FOUNDATION.allowanceMonths).reduce((s, g) => s + g.deductible, 0);
  return Math.max(0, FOUNDATION.allowance - used);
}

/** Tax refund for a gift of this size today. */
export function taxRefund(state: GameState, amount: number): number {
  return Math.round(Math.min(amount, allowanceLeft(state)) * FOUNDATION.taxRate);
}

function give(ctx: Ctx, f: FoundationState, amount: number): void {
  const deductible = Math.min(amount, allowanceLeft(ctx.state));
  ctx.state.cash -= amount;
  f.capital += amount;
  f.gifts.push({ month: ctx.state.month, amount, deductible });
  f.refundDue = (f.refundDue ?? 0) + Math.round(deductible * FOUNDATION.taxRate);
}

export function foundFoundation(ctx: Ctx, amount: number, purpose: FoundationPurpose): void {
  const { state } = ctx;
  const blocker = foundationBlocker(state, ctx.worth());
  if (blocker) ctx.fail(blocker);
  if (!PURPOSES[purpose]) ctx.fail("Diesen Stiftungszweck gibt es nicht.");
  if (amount < FOUNDATION.minCapital) ctx.fail(`Die Stiftungsaufsicht will mindestens ${mio(FOUNDATION.minCapital)} Grundstockvermögen sehen.`);
  if (state.cash < amount + FOUNDATION.cost) ctx.fail(`Dafür fehlt dir Geld auf dem Konto: ${eur(amount + FOUNDATION.cost)} nötig (Kapital plus Notar und Satzung).`);
  ctx.spend("foundation", "Stiftung errichten", FOUNDATION.days);
  state.cash -= FOUNDATION.cost;
  state.wealth = state.wealth ?? {};
  const f: FoundationState = { purpose, founded: state.month, capital: 0, gifts: [], people: 0, granted: 0 };
  state.wealth.foundation = f;
  give(ctx, f, amount);
  ctx.reputation(FOUNDATION.foundReputation + Math.min(FOUNDATION.giftReputationMax, Math.floor(amount / 1_000_000)) - 1);
  ctx.lesson("gemeinnuetzigkeit");
  ctx.mail({
    kind: "system",
    from: "Stiftungsaufsicht",
    subject: "Deine Stiftung ist anerkannt",
    body: `Die Stiftung ist errichtet und als gemeinnützig anerkannt. Zweck: ${PURPOSES[purpose].label}. Das Grundstockvermögen von ${eur(amount)} bleibt für immer in der Stiftung, nur der Ertrag (etwa ${Math.round(FOUNDATION.yield * 100)} % im Jahr) fließt in die Förderung. Mit dem nächsten Monatsabschluss erstattet das Finanzamt ${eur(f.refundDue ?? 0)}.`,
  });
}

export function giveFoundation(ctx: Ctx, amount: number): void {
  const { state } = ctx;
  const f = state.wealth?.foundation;
  if (!f) ctx.fail("Gründe zuerst eine Stiftung.");
  if (amount < FOUNDATION.minGift) ctx.fail(`Eine Zustiftung beginnt bei ${eur(FOUNDATION.minGift)}.`);
  if (state.cash < amount) ctx.fail("Dafür reicht dein Konto nicht.");
  ctx.spend("foundation", "Zustiftung", FOUNDATION.giveDays);
  give(ctx, f, amount);
  const rep = Math.min(FOUNDATION.giftReputationMax, Math.floor(amount / 1_000_000));
  if (rep > 0) ctx.reputation(rep);
}

/** The programme spends the yield; the tax office refunds; once a year a report and a little reputation. */
export function foundationMonth(ctx: Ctx, month: number, income: IncomeLines, notes: string[]): void {
  const f = ctx.state.wealth?.foundation;
  if (!f) return;
  if (f.refundDue) {
    ctx.state.cash += f.refundDue;
    income.foundation = (income.foundation ?? 0) + f.refundDue;
    notes.push(`Das Finanzamt erstattet ${eur(f.refundDue)} für deine Zustiftung (Gemeinnützigkeit).`);
    delete f.refundDue;
  }
  const grant = (f.capital * FOUNDATION.yield) / 12;
  f.granted += grant;
  f.people += grant / PURPOSES[f.purpose].perPerson;
  if ((month + 1) % 12 === 4 && month > f.founded) {
    if (f.capital >= FOUNDATION.minCapital) ctx.reputation(1);
    const year = Math.round(f.capital * FOUNDATION.yield);
    ctx.mail({
      kind: "system",
      from: "Deine Stiftung",
      subject: "Jahresbericht der Stiftung",
      body: `Im letzten Jahr hat die Stiftung ${eur(year)} ausgeschüttet: ${PURPOSES[f.purpose].label}. Gefördert bisher: ${Math.floor(f.people).toLocaleString("de-DE")} ${PURPOSES[f.purpose].people}. Das Grundstockvermögen von ${eur(f.capital)} bleibt erhalten.`,
    });
  }
}
