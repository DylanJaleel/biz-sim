export type GameActionErrorCode =
  | "GAME_OVER"
  | "STALE_WEEK"
  | "ORDER_NOT_FOUND"
  | "ORDER_UNAVAILABLE"
  | "CAPACITY_REACHED"
  | "NOT_ACCEPTED";

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
