import type { GameEventEffect } from "./events";
import { calculateWeeklyLoanCharge, type LoanState } from "./loan";

export interface AcceptedOrder {
  payout: number;
  materialNeed: number;
}

export interface RoundInput {
  weekNumber: number;
  cashBefore: number;
  acceptedOrders: AcceptedOrder[];
  employeeWageTotal: number;
  warehouseRent: number;
  loan: LoanState;
  event: GameEventEffect | null;
}

export interface RoundSummary {
  weekNumber: number;
  revenue: number;
  materialCost: number;
  wageCost: number;
  rentCost: number;
  loanPrincipalPayment: number;
  loanInterestPayment: number;
  eventDescription: string | null;
  totalExpenses: number;
  netResult: number;
  cashBefore: number;
  cashAfter: number;
  loanAfter: LoanState;
}

/** Resolves one weekly round into a balance (section 3.1 step 4). */
export function resolveRound(input: RoundInput): RoundSummary {
  const revenue = input.acceptedOrders.reduce((sum, order) => sum + order.payout, 0);

  const materialCostMultiplier = input.event?.materialCostMultiplier ?? 1;
  const materialCost =
    input.acceptedOrders.reduce((sum, order) => sum + order.materialNeed, 0) * materialCostMultiplier;

  const loanCharge = calculateWeeklyLoanCharge(input.loan);
  const totalExpenses =
    materialCost + input.employeeWageTotal + input.warehouseRent + loanCharge.totalPayment;

  const netResult = revenue - totalExpenses;

  return {
    weekNumber: input.weekNumber,
    revenue,
    materialCost,
    wageCost: input.employeeWageTotal,
    rentCost: input.warehouseRent,
    loanPrincipalPayment: loanCharge.principalPayment,
    loanInterestPayment: loanCharge.interestPayment,
    eventDescription: input.event?.description ?? null,
    totalExpenses,
    netResult,
    cashBefore: input.cashBefore,
    cashAfter: input.cashBefore + netResult,
    loanAfter: { ...input.loan, remainingBalance: loanCharge.remainingBalanceAfter },
  };
}
