import { describe, expect, it } from "vitest";
import { LOAN_PRINCIPAL, LOAN_TERM_WEEKS } from "../lib/config";
import {
  aggregate,
  careless,
  grower,
  passive,
  reckless,
  simulate,
  solo,
  type SimulationResult,
  type Strategy,
} from "../lib/simulation";

/**
 * Guards the economy's intended shape (docs/game-economy-design.md, "Balancing-Ziele").
 * The simulation is seeded, so these runs are deterministic. If a change to
 * lib/config.ts breaks one of these on purpose, update the design doc too.
 */

const SEEDS = 100;
const run = (strategy: Strategy, weeks: number): SimulationResult[] =>
  Array.from({ length: SEEDS }, (_, i) => simulate({ seed: i + 1, weeks, strategy }));

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const weeklyPrincipal = LOAN_PRINCIPAL / LOAN_TERM_WEEKS;

describe("economy balance", () => {
  it("does nothing = bankruptcy within a quarter", () => {
    const results = run(passive, 52);
    const a = aggregate(results);

    expect(a.insolvencyShare).toBe(1);
    expect(a.medianWeeksPlayed).toBeGreaterThanOrEqual(8);
    expect(a.medianWeeksPlayed).toBeLessThanOrEqual(16);
  });

  it("a careful solo craftsman roughly breaks even after the loan payment and almost never fails", () => {
    const a = aggregate(run(solo, 156));

    expect(a.insolvencyShare).toBeLessThanOrEqual(0.05);
    // Profit before principal covers the principal: cash neither collapses nor explodes.
    expect(a.avgProfitFirstYear - weeklyPrincipal).toBeGreaterThan(-60);
    expect(a.avgProfitFirstYear - weeklyPrincipal).toBeLessThan(220);
  });

  it("choosing jobs well is worth a lot: careless picking earns well under 70 % of careful picking", () => {
    const careful = aggregate(run(solo, 104));
    const sloppy = aggregate(run(careless, 104));

    expect(sloppy.avgProfitFirstYear).toBeLessThan(careful.avgProfitFirstYear * 0.7);
  });

  it("hiring without a buffer, vehicle or demand kills the business", () => {
    const a = aggregate(run(reckless, 52));

    expect(a.insolvencyShare).toBeGreaterThanOrEqual(0.9);
  });

  it("the intended growth path is safe and pays off, but not instantly", () => {
    const results = run(grower({ maxEmployees: 2 }), 156);
    const a = aggregate(results);
    const soloValue = aggregate(run(solo, 156)).medianValue;

    expect(a.insolvencyShare).toBeLessThanOrEqual(0.05);
    expect(a.medianHeadcountEnd).toBeGreaterThanOrEqual(3);
    expect(a.medianValue).toBeGreaterThan(soloValue * 3);

    const firstHireWeeks = results.map((r) => r.investments.find((i) => i.kind === "hire")?.week ?? 999);
    expect(median(firstHireWeeks)).toBeGreaterThanOrEqual(15);
    expect(median(firstHireWeeks)).toBeLessThanOrEqual(60);
  });

  it("income stays within a believable range once the team is established (pre-tax)", () => {
    const results = run(grower({ maxEmployees: 2 }), 156);
    const lateProfits = results.map((r) => r.records[155]?.profit ?? 0);

    expect(median(lateProfits)).toBeGreaterThan(1_000);
    expect(median(lateProfits)).toBeLessThan(3_200);
  });

  it("one location saturates: five employees cost far more than they bring over three", () => {
    const three = aggregate(run(grower({ maxEmployees: 2 }), 208));
    const six = aggregate(run(grower({ maxEmployees: 5 }), 208));

    expect(six.medianHeadcountEnd).toBe(6);
    expect(six.insolvencyShare).toBeLessThanOrEqual(0.1);
    expect(six.medianValue).toBeLessThan(three.medianValue);
  });
});
