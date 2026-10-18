import type { GameAction, SeatId, Vote } from "./types";

// Server actions receive whatever the browser sends. This turns it into a
// GameAction or nothing; the engine then checks the game rules.

const SEATS: readonly SeatId[] = ["ceo", "cto", "vc", "indep", "angel"];
const VOTES: readonly Vote[] = ["go", "conditions", "no"];

function id(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[\w-]+$/.test(value);
}

export function parseAction(input: unknown): GameAction | null {
  if (typeof input !== "object" || input === null) return null;
  const a = input as Record<string, unknown>;
  switch (a.type) {
    case "dd":
    case "invest":
    case "decline":
    case "founderCall":
      return id(a.startupId) ? { type: a.type, startupId: a.startupId } : null;
    case "question":
      return id(a.itemId) && id(a.questionId) ? { type: "question", itemId: a.itemId, questionId: a.questionId } : null;
    case "cfo":
      return id(a.itemId) ? { type: "cfo", itemId: a.itemId } : null;
    case "pretalk":
      return id(a.itemId) && SEATS.includes(a.seat as SeatId) ? { type: "pretalk", itemId: a.itemId, seat: a.seat as SeatId } : null;
    case "meeting":
      if (!id(a.itemId) || !VOTES.includes(a.vote as Vote)) return null;
      if (a.argument !== null && !id(a.argument)) return null;
      return { type: "meeting", itemId: a.itemId, argument: a.argument as string | null, vote: a.vote as Vote };
    case "readMail":
      return id(a.mailId) ? { type: "readMail", mailId: a.mailId } : null;
    case "learn":
    case "closeMonth":
      return { type: a.type };
    default:
      return null;
  }
}
