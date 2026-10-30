import { describe, expect, it } from "vitest";
import { analystChoice } from "../lib/game/bots";
import { CORPORATE_REPUTATION } from "../lib/game/config";
import { CORPORATE_ID, corporateStartup } from "../lib/game/corporate";
import { CORPORATE_BOOKS, ebitdaMargin } from "../lib/game/corporate-books";
import { applyAction, closeMonth, GameRuleError, newGame, startupOf, upgradeState } from "../lib/game/engine";
import type { CovenantId, GameState, Metrics, Vote } from "../lib/game/types";

type Policy = "lapse" | "go" | "no" | "conditions" | "best";

/** A game with the Nordhafen seat taken in the first month. */
function withSeat(seed: number): GameState {
  const state: GameState = { ...newGame(seed), reputation: CORPORATE_REPUTATION, ledRounds: 1 };
  closeMonth(state);
  return applyAction(state, { type: "joinCorporate", accept: true }).state;
}

/** Plays `months` months; the player decides every Konzern item as the policy says (or lets the board decide). */
function play(seed: number, months: number, policy: Policy): { state: GameState; at: Record<number, Metrics> } {
  const key = `${seed}|${months}|${policy}`;
  const hit = played.get(key);
  if (hit) return hit;
  let state = withSeat(seed);
  const at: Record<number, Metrics> = {};
  for (let m = 1; m <= months; m++) {
    if (policy !== "lapse") {
      for (const item of state.items.filter((i) => i.status === "open" && i.startupId === CORPORATE_ID)) {
        const choice: { vote: Vote; covenant?: CovenantId } = policy === "best" ? analystChoice(state, item.id) : { vote: policy };
        try {
          state = applyAction(state, {
            type: "meeting",
            itemId: item.id,
            argument: null,
            vote: choice.vote,
            covenant: choice.vote === "conditions" ? choice.covenant : undefined,
          }).state;
        } catch (error) {
          if (!(error instanceof GameRuleError)) throw error;
        }
      }
    }
    state = applyAction(state, { type: "closeMonth" }).state;
    at[m] = structuredClone(startupOf(state, CORPORATE_ID).metrics);
  }
  played.set(key, { state, at });
  return { state, at };
}
const played = new Map<string, { state: GameState; at: Record<number, Metrics> }>();

// Seed 5 runs into a crash and a weak market around year five.
const SEEDS = [1, 2, 5, 8];
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const yearly = (at: Record<number, Metrics>, month: number) => at[month]!.revenue / at[month - 12]!.revenue - 1;

describe("Konzern im Aufsichtsratsmandat", () => {
  it("starts with an industrial margin", () => {
    const m = corporateStartup(1).metrics;
    expect(ebitdaMargin(m)).toBeGreaterThan(0.08);
    expect(ebitdaMargin(m)).toBeLessThan(0.12);
  });

  for (const policy of ["lapse", "go", "conditions", "no", "best"] as Policy[]) {
    it(`stays a Konzern over 100 months (${policy})`, () => {
      for (const seed of SEEDS) {
        const { at } = play(seed, 100, policy);
        for (const month of [60, 100]) {
          const m = at[month]!;
          // Revenue about where it started: −5 to +8 % a year at most on average.
          expect(m.revenue).toBeGreaterThan(CORPORATE_BOOKS.revenue * 0.95 ** (month / 12));
          expect(m.revenue).toBeLessThan(CORPORATE_BOOKS.revenue * 1.08 ** (month / 12));
          expect(ebitdaMargin(m)).toBeGreaterThan(0.04);
          expect(ebitdaMargin(m)).toBeLessThan(0.14);
          // Debt stays what a solid industrial company carries: under three years of EBITDA.
          expect(m.debt).toBeLessThan(3 * 12 * (m.revenue * m.grossMargin - m.opex));
          expect(yearly(at, month)).toBeGreaterThan(-0.1);
          expect(yearly(at, month)).toBeLessThan(0.12);
        }
      }
    }, 60_000);
  }

  it("good decisions show: more EBITDA and less debt than a board that lets the CEO decide alone", () => {
    const ebitda = (m: Metrics) => m.revenue * m.grossMargin - m.opex;
    const good = SEEDS.map((seed) => play(seed, 100, "best").at[96]!);
    const alone = SEEDS.map((seed) => play(seed, 100, "lapse").at[96]!);
    expect(median(good.map(ebitda))).toBeGreaterThan(median(alone.map(ebitda)) * 1.2);
    expect(median(good.map((m) => m.debt))).toBeLessThanOrEqual(median(alone.map((m) => m.debt)));
  }, 60_000);

  it("recovers from a crisis: a margin far below the band comes back", () => {
    // One seed sits right at the edge of the band by chance; the median over several shows the recovery.
    const recovered = SEEDS.map((seed) => {
      let state = withSeat(seed);
      const s = startupOf(state, CORPORATE_ID);
      // A strike and a lost contract: costs a tenth of revenue above normal.
      const hit = { ...s, metrics: { ...s.metrics, opex: s.metrics.opex + 0.1 * s.metrics.revenue } };
      state = { ...state, startups: state.startups.map((x) => (x.id === CORPORATE_ID ? hit : x)) };
      expect(ebitdaMargin(hit.metrics)).toBeLessThan(0);
      for (let m = 0; m < 36; m++) state = applyAction(state, { type: "closeMonth" }).state;
      return startupOf(state, CORPORATE_ID).metrics;
    });
    // After three years the margin is back near the band (16 seeds: median about 6,3 %, lowest 5,4 %).
    expect(median(recovered.map(ebitdaMargin))).toBeGreaterThan(CORPORATE_BOOKS.margin - CORPORATE_BOOKS.band - 0.02);
    expect(Math.min(...recovered.map(ebitdaMargin))).toBeGreaterThan(0.04);
    expect(median(recovered.map((m) => m.revenue))).toBeGreaterThan(CORPORATE_BOOKS.revenue * 0.85);
  }, 60_000);

  it("old games: a Konzern ruined by the startup path is corrected once on loading", () => {
    const state = withSeat(4);
    const s = startupOf(state, CORPORATE_ID);
    const ruined = {
      ...s,
      corporateModel: undefined,
      metrics: { ...s.metrics, revenue: 3_000_000, opex: 7_400_000, growth: -0.065, debt: 125_000_000, cash: 6_000_000 },
    };
    const old = { ...state, startups: state.startups.map((x) => (x.id === CORPORATE_ID ? ruined : x)) };
    const up = upgradeState(old);
    const k = startupOf(up, CORPORATE_ID);
    expect(k.corporateModel).toBe(CORPORATE_BOOKS.model);
    expect(k.metrics.revenue).toBe(CORPORATE_BOOKS.revenue);
    expect(ebitdaMargin(k.metrics)).toBeCloseTo(CORPORATE_BOOKS.margin, 2);
    expect(k.metrics.debt).toBeLessThanOrEqual(2 * 12 * (k.metrics.revenue * k.metrics.grossMargin - k.metrics.opex) + 1);
    expect(k.metrics.growth).toBeGreaterThan(-0.003);
    expect(up.mails[0]!.subject).toContain("neu aufgestellt");
    // Once only, and the input is not touched.
    expect(upgradeState(up)).toBe(up);
    expect(startupOf(old, CORPORATE_ID).metrics.revenue).toBe(3_000_000);
    // A healthy old Konzern only gets the marker.
    const healthy = upgradeState({ ...state, startups: state.startups.map((x) => (x.id === CORPORATE_ID ? { ...s, corporateModel: undefined } : x)) });
    expect(startupOf(healthy, CORPORATE_ID).metrics).toEqual(s.metrics);
    expect(healthy.mails.length).toBe(state.mails.length);
  });
});
