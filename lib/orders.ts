export interface OrderWindow {
  weekOffered: number;
  deadlineWeeks: number;
}

/** An order offered in week w with deadline d can be accepted during weeks w .. w+d-1. */
export function lastOpenWeek(order: OrderWindow): number {
  return order.weekOffered + order.deadlineWeeks - 1;
}

export function isOrderOpen(order: OrderWindow, weekNumber: number): boolean {
  return order.weekOffered <= weekNumber && weekNumber <= lastOpenWeek(order);
}

/** Weeks left to accept the order, counting the current one (1 = last chance). */
export function remainingWeeks(order: OrderWindow, weekNumber: number): number {
  return lastOpenWeek(order) - weekNumber + 1;
}
