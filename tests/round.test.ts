import { describe, expect, it } from "vitest";
import { createLoan } from "../lib/loan";
import { resolveRound } from "../lib/round";

describe("resolveRound", () => {
  it("computes revenue, expenses and net result for a quiet week", () => {
    const loan = createLoan(15_000, 0.06, 52);

    const summary = resolveRound({
      weekNumber: 1,
      acceptedOrders: [
        { payout: 1_000, materialNeed: 300 },
        { payout: 500, materialNeed: 150 },
      ],
      employeeWageTotal: 0,
      warehouseRent: 0,
      loan,
      event: null,
    });

    const expectedLoanInterest = 15_000 * (0.06 / 52);
    const expectedLoanPrincipal = 15_000 / 52;

    expect(summary.revenue).toBe(1_500);
    expect(summary.materialCost).toBe(450);
    expect(summary.loanPrincipalPayment).toBeCloseTo(expectedLoanPrincipal, 5);
    expect(summary.loanInterestPayment).toBeCloseTo(expectedLoanInterest, 5);
    expect(summary.totalExpenses).toBeCloseTo(450 + expectedLoanPrincipal + expectedLoanInterest, 5);
    expect(summary.netResult).toBeCloseTo(1_500 - (450 + expectedLoanPrincipal + expectedLoanInterest), 5);
    expect(summary.loanAfter.remainingBalance).toBeCloseTo(15_000 - expectedLoanPrincipal, 5);
  });

  it("applies a material price spike event on top of material cost", () => {
    const loan = createLoan(15_000, 0.06, 52);

    const summary = resolveRound({
      weekNumber: 2,
      acceptedOrders: [{ payout: 1_000, materialNeed: 400 }],
      employeeWageTotal: 450,
      warehouseRent: 150,
      loan,
      event: {
        type: "material_price_spike",
        materialCostMultiplier: 1.5,
        description: "Materialpreise sind diese Woche um 50% gestiegen.",
      },
    });

    expect(summary.materialCost).toBe(600);
    expect(summary.wageCost).toBe(450);
    expect(summary.rentCost).toBe(150);
    expect(summary.eventDescription).toContain("Materialpreise");
  });

  it("produces a negative net result when expenses exceed revenue", () => {
    const loan = createLoan(15_000, 0.06, 52);

    const summary = resolveRound({
      weekNumber: 3,
      acceptedOrders: [],
      employeeWageTotal: 450,
      warehouseRent: 150,
      loan,
      event: null,
    });

    expect(summary.revenue).toBe(0);
    expect(summary.netResult).toBeLessThan(0);
  });
});
