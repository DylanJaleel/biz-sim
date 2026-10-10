import { LOAN_ANNUAL_INTEREST_RATE, LOAN_PRINCIPAL, LOAN_TERM_WEEKS } from "./config";

export interface LoanState {
  principal: number;
  annualInterestRate: number;
  termWeeks: number;
  remainingBalance: number;
}

export function createLoan(
  principal: number = LOAN_PRINCIPAL,
  annualInterestRate: number = LOAN_ANNUAL_INTEREST_RATE,
  termWeeks: number = LOAN_TERM_WEEKS,
): LoanState {
  return { principal, annualInterestRate, termWeeks, remainingBalance: principal };
}

export interface WeeklyLoanCharge {
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingBalanceAfter: number;
}

/**
 * Linear amortization: equal principal repayment per week over the loan
 * term, interest charged weekly on the balance still outstanding.
 */
export function calculateWeeklyLoanCharge(loan: LoanState): WeeklyLoanCharge {
  if (loan.remainingBalance <= 0) {
    return { principalPayment: 0, interestPayment: 0, totalPayment: 0, remainingBalanceAfter: 0 };
  }

  const weeklyInterestRate = loan.annualInterestRate / 52;
  const scheduledPrincipalPayment = loan.principal / loan.termWeeks;
  const principalPayment = Math.min(scheduledPrincipalPayment, loan.remainingBalance);
  const interestPayment = loan.remainingBalance * weeklyInterestRate;
  const remainingBalanceAfter = Math.max(loan.remainingBalance - principalPayment, 0);

  return {
    principalPayment,
    interestPayment,
    totalPayment: principalPayment + interestPayment,
    remainingBalanceAfter,
  };
}
