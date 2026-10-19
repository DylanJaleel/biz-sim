import type { AssetId, ExitChoice, GameAction, GvVote, RoundTake, SeatId, Vote } from "./types";

// Server actions receive whatever the browser sends. This turns it into a
// GameAction or nothing; the engine then checks the game rules.

const SEATS: readonly SeatId[] = ["ceo", "cto", "vc", "indep", "angel"];
const VOTES: readonly Vote[] = ["go", "conditions", "no"];
const TAKES: readonly RoundTake[] = ["none", "half", "prorata", "lead", "syndicate"];
const EXIT_CHOICES: readonly ExitChoice[] = ["accept", "negotiate", "reject"];
const GV_VOTES: readonly GvVote[] = ["go", "no"];
const ASSET_IDS: readonly AssetId[] = ["tagesgeld", "anleihen", "dividenden", "tech"];

function id(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[\w-]+$/.test(value);
}

export function parseAction(input: unknown): GameAction | null {
  if (typeof input !== "object" || input === null) return null;
  const a = input as Record<string, unknown>;
  switch (a.type) {
    case "invest":
      if (!id(a.startupId)) return null;
      return a.size === "half" ? { type: "invest", startupId: a.startupId, size: "half" } : { type: "invest", startupId: a.startupId };
    case "dd":
    case "decline":
    case "founderCall":
    case "askShares":
      return id(a.startupId) ? { type: a.type, startupId: a.startupId } : null;
    case "round":
      return id(a.roundId) && TAKES.includes(a.take as RoundTake) && GV_VOTES.includes(a.vote as GvVote)
        ? { type: "round", roundId: a.roundId, take: a.take as RoundTake, vote: a.vote as GvVote }
        : null;
    case "gig":
      return id(a.gigId) ? { type: "gig", gigId: a.gigId } : null;
    case "trade": {
      const amount = Number(a.amount);
      if (!ASSET_IDS.includes(a.assetId as AssetId) || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 50_000_000) return null;
      return { type: "trade", assetId: a.assetId as AssetId, amount: Math.round(amount) };
    }
    case "exit":
      return id(a.exitId) && EXIT_CHOICES.includes(a.choice as ExitChoice) ? { type: "exit", exitId: a.exitId, choice: a.choice as ExitChoice } : null;
    case "moveOffice": {
      const level = Number(a.level);
      return Number.isInteger(level) && level >= 0 && level <= 4 ? { type: "moveOffice", level } : null;
    }
    case "joinCorporate":
      return typeof a.accept === "boolean" ? { type: "joinCorporate", accept: a.accept } : null;
    case "buyShares":
      return id(a.offerId) ? { type: "buyShares", offerId: a.offerId } : null;
    case "meetContact":
      return id(a.contactId) ? { type: "meetContact", contactId: a.contactId } : null;
    case "introContact":
      return id(a.contactId) && id(a.startupId) ? { type: "introContact", contactId: a.contactId, startupId: a.startupId } : null;
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
