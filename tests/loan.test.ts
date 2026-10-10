import { describe, expect, it } from "vitest";
import { calculateWeeklyLoanCharge, createLoan } from "../lib/loan";

describe("loan amortization", () => {
  it("creates a loan with the full principal outstanding", () => {
    const loan = createLoan(15_000, 0.06, 52);
    expect(loan.remainingBalance).toBe(15_000);
  });

  it("charges equal principal installments and interest on the outstanding balance", () => {
    const loan = createLoan(15_000, 0.06, 52);
    const charge = calculateWeeklyLoanCharge(loan);

    expect(charge.principalPayment).toBeCloseTo(15_000 / 52, 5);
    expect(charge.interestPayment).toBeCloseTo(15_000 * (0.06 / 52), 5);
    expect(charge.remainingBalanceAfter).toBeCloseTo(15_000 - 15_000 / 52, 5);
  });

  it("fully repays the loan after exactly the loan term", () => {
    let loan = createLoan(15_000, 0.06, 52);
    for (let week = 0; week < 52; week++) {
      loan = { ...loan, remainingBalance: calculateWeeklyLoanCharge(loan).remainingBalanceAfter };
    }
    expect(loan.remainingBalance).toBeCloseTo(0, 5);
  });

  it("never charges a payment once the loan is paid off", () => {
    const loan = createLoan(15_000, 0.06, 52);
    const paidOff = { ...loan, remainingBalance: 0 };
    const charge = calculateWeeklyLoanCharge(paidOff);

    expect(charge).toEqual({
      principalPayment: 0,
      interestPayment: 0,
      totalPayment: 0,
      remainingBalanceAfter: 0,
    });
  });

  it("never pays more principal than what remains on the final installment", () => {
    const loan = createLoan(15_000, 0.06, 52);
    const almostPaidOff = { ...loan, remainingBalance: 100 };
    const charge = calculateWeeklyLoanCharge(almostPaidOff);

    expect(charge.principalPayment).toBe(100);
    expect(charge.remainingBalanceAfter).toBe(0);
  });
});
