export type GameActionErrorCode =
  | "GAME_OVER"
  | "STALE_WEEK"
  | "ORDER_NOT_FOUND"
  | "ORDER_UNAVAILABLE"
  | "TOOL_LEVEL_TOO_LOW"
  | "NOT_ENOUGH_HOURS"
  | "NOT_ACCEPTED"
  | "INVESTMENT_REFUSED"
  | "EMPLOYEE_NOT_FOUND";

/** Expected, player-facing rule violations (as opposed to bugs/infrastructure errors). */
export class GameActionError extends Error {
  constructor(
    readonly code: GameActionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GameActionError";
  }
}
