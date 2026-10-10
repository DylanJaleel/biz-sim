import {
  EMPLOYEE_NOTICE_WEEKS,
  EMPLOYEE_RECRUITING_FEE,
  EMPLOYEE_WEEKLY_WAGE,
  TOOL_LEVELS,
  VEHICLE_PRICE,
  WORKSHOP_LEVELS,
  toolConfig,
  workshopConfig,
} from "./config";
import { seatsTaken, type Business, type EmployeeSlot } from "./economy";

export type InvestmentKind = "hire" | "vehicle" | "tools" | "workshop";

export type InvestmentCheck =
  | { ok: true; cost: number; label: string }
  | { ok: false; reason: string };

const euro = (value: number) => `${value.toLocaleString("de-DE")} €`;

/**
 * Whether an investment is possible right now and what it costs. These rules
 * are shared by the app and the balance simulation.
 */
export function checkInvestment(kind: InvestmentKind, business: Business, week: number, cash: number): InvestmentCheck {
  let cost: number;
  let label: string;

  switch (kind) {
    case "hire": {
      const workshop = workshopConfig(business.workshopLevel);
      if (seatsTaken(business, week) >= workshop.seats) {
        return { ok: false, reason: `Die Werkstatt ist voll (${workshop.seats} Plätze). Du brauchst eine größere Werkstatt.` };
      }
      cost = EMPLOYEE_RECRUITING_FEE;
      label = "Vermittlungsgebühr Geselle";
      break;
    }
    case "vehicle": {
      if (business.vehicles >= seatsTaken(business, week)) {
        return { ok: false, reason: "Jede Person hat bereits ein Fahrzeug." };
      }
      cost = VEHICLE_PRICE;
      label = "Kauf Transporter";
      break;
    }
    case "tools": {
      if (business.toolLevel >= TOOL_LEVELS.length) {
        return { ok: false, reason: "Die Werkzeugausstattung ist bereits auf höchster Stufe." };
      }
      const next = toolConfig(business.toolLevel + 1);
      cost = next.upgradeCost;
      label = `Werkzeug-Upgrade: ${next.name}`;
      break;
    }
    case "workshop": {
      if (business.workshopLevel >= WORKSHOP_LEVELS.length) {
        return { ok: false, reason: "Die Werkstatt ist bereits auf höchster Stufe." };
      }
      const next = workshopConfig(business.workshopLevel + 1);
      cost = next.upgradeCost;
      label = `Umzug: ${next.name}`;
      break;
    }
  }

  if (cash < cost) {
    return { ok: false, reason: `Dafür fehlen ${euro(Math.ceil(cost - cash))}.` };
  }
  return { ok: true, cost, label };
}

/** The business after the investment. A hire starts working next week. */
export function applyInvestment(kind: InvestmentKind, business: Business, week: number): Business {
  switch (kind) {
    case "hire":
      return { ...business, employees: [...business.employees, { hiredWeek: week + 1, endsWeek: null }] };
    case "vehicle":
      return { ...business, vehicles: business.vehicles + 1 };
    case "tools":
      return { ...business, toolLevel: business.toolLevel + 1 };
    case "workshop":
      return { ...business, workshopLevel: business.workshopLevel + 1 };
  }
}

/** A hire that hasn't started yet is simply cancelled (the fee is gone); otherwise the notice period applies. */
export function fireOutcome(employee: EmployeeSlot, week: number): { cancel: true } | { endsWeek: number } {
  if (employee.hiredWeek > week) return { cancel: true };
  return { endsWeek: week + EMPLOYEE_NOTICE_WEEKS };
}

export function hireCosts() {
  return { fee: EMPLOYEE_RECRUITING_FEE, weeklyWage: EMPLOYEE_WEEKLY_WAGE };
}
