import { DD_MODULES, type DdModule } from "./mna-config";
import type { WealthAction } from "./wealth-types";
import type {
  AssetId,
  BuyerFocus,
  CovenantId,
  ExitChoice,
  FundMove,
  GameAction,
  GigApproach,
  GvVote,
  LeverId,
  MandateLever,
  MandateMove,
  ProcessKind,
  RoundTake,
  SeatId,
  StudioMove,
  TeamRole,
  Vote,
} from "./types";

// Server actions receive whatever the browser sends. This turns it into a
// GameAction or nothing; the engine then checks the game rules.

const SEATS: readonly SeatId[] = ["ceo", "cto", "vc", "indep", "angel"];
const VOTES: readonly Vote[] = ["go", "conditions", "no"];
const TAKES: readonly RoundTake[] = ["none", "half", "prorata", "lead", "syndicate"];
const EXIT_CHOICES: readonly ExitChoice[] = ["accept", "negotiate", "reject"];
const ROLES: readonly TeamRole[] = ["operating"];
const GV_VOTES: readonly GvVote[] = ["go", "no"];
const ASSET_IDS: readonly AssetId[] = ["tagesgeld", "anleihen", "dividenden", "tech"];
const COVENANT_IDS: readonly CovenantId[] = [
  ...(["budget", "stagegate", "pilot", "second", "kpi", "veto"] as const),
  ...([
    "kreditdeckel",
    "tranchen",
    "geldgeberkennzahl",
    "stellenplan",
    "testphase",
    "vertretung",
    "testmarkt",
    "meilenstein",
    "projektdeckel",
    "mindestkasse",
    "haelfte",
    "quartal",
  ] as const),
  ...([
    "stufen",
    "garantien",
    "schluesselkunden",
    "testkunden",
    "zweiterweg",
    "margenboden",
    "zustimmungskatalog",
    "zielstufen",
    "monatsbericht",
    "krisenbudget",
    "ersatzquelle",
    "krisenstab",
  ] as const),
];

const MANDATE_MOVES: readonly MandateMove[] = ["accept", "decline", "comps", "launch", "accept_bid", "final", "negotiate", "teaser", "round"];
const MANDATE_LEVERS: readonly MandateLever[] = ["bnf", "exclusive", "earnout", "batna"];
const BUYER_FOCUS: readonly BuyerFocus[] = ["strategic", "financial", "mixed"];
const PROCESSES: readonly ProcessKind[] = ["exclusive", "auction"];
const LEVER_IDS: readonly LeverId[] = ["interim", "costs", "pricing", "workingCapital", "refinance"];

/** A share between 0 and max, or null. */
function share(value: unknown, max: number): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 1000) / 1000 : null;
}

function modules(value: unknown): DdModule[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 4) return null;
  return value.every((v) => DD_MODULES.includes(v as DdModule)) ? [...new Set(value as DdModule[])] : null;
}

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
    case "gig": {
      if (!id(a.gigId)) return null;
      if (a.travel !== undefined && !id(a.travel)) return null;
      if (a.approach !== undefined && !["safe", "thorough", "bold"].includes(a.approach as string)) return null;
      return {
        type: "gig",
        gigId: a.gigId,
        ...(a.travel !== undefined ? { travel: a.travel as string } : {}),
        ...(a.approach !== undefined ? { approach: a.approach as GigApproach } : {}),
      };
    }
    case "buyVehicle":
    case "sellVehicle":
      return id(a.vehicleId) ? { type: a.type, vehicleId: a.vehicleId } : null;
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
    case "buyout":
      return id(a.startupId) && typeof a.leverage === "boolean" ? { type: "buyout", startupId: a.startupId, leverage: a.leverage } : null;
    case "hire":
      return ROLES.includes(a.role as TeamRole) && id(a.profile) ? { type: "hire", role: a.role as TeamRole, profile: a.profile } : null;
    case "fire":
      return id(a.memberId) ? { type: "fire", memberId: a.memberId } : null;
    case "assign":
      if (!id(a.memberId)) return null;
      if (a.startupId === null) {
        if (a.from !== undefined && !id(a.from)) return null;
        return { type: "assign", memberId: a.memberId, startupId: null, ...(a.from !== undefined ? { from: a.from as string } : {}) };
      }
      return id(a.startupId) ? { type: "assign", memberId: a.memberId, startupId: a.startupId } : null;
    case "foundFamilyOffice":
    case "holdco":
    case "raiseFund":
    case "seenTrophies":
      return { type: a.type };
    case "buyShares":
      return id(a.offerId) ? { type: "buyShares", offerId: a.offerId } : null;
    case "meetContact":
      return id(a.contactId) ? { type: "meetContact", contactId: a.contactId } : null;
    case "introContact":
      return id(a.contactId) && id(a.startupId) ? { type: "introContact", contactId: a.contactId, startupId: a.startupId } : null;
    case "favor":
      return id(a.favorId) && typeof a.accept === "boolean" ? { type: "favor", favorId: a.favorId, accept: a.accept } : null;
    case "event":
      if (!id(a.eventId) || (a.move !== "accept" && a.move !== "decline")) return null;
      if (a.talk !== undefined && typeof a.talk !== "boolean") return null;
      return { type: "event", eventId: a.eventId, move: a.move, ...(a.talk !== undefined ? { talk: a.talk } : {}) };
    case "specialist":
      if (!id(a.contactId) || (a.targetId !== undefined && !id(a.targetId))) return null;
      return { type: "specialist", contactId: a.contactId, ...(a.targetId !== undefined ? { targetId: a.targetId } : {}) };
    case "contactHint":
      return id(a.contactId) && id(a.itemId) ? { type: "contactHint", contactId: a.contactId, itemId: a.itemId } : null;
    case "question":
      return id(a.itemId) && id(a.questionId) ? { type: "question", itemId: a.itemId, questionId: a.questionId } : null;
    case "cfo":
      return id(a.itemId) ? { type: "cfo", itemId: a.itemId } : null;
    case "pretalk":
      return id(a.itemId) && SEATS.includes(a.seat as SeatId) ? { type: "pretalk", itemId: a.itemId, seat: a.seat as SeatId } : null;
    case "meeting":
      if (!id(a.itemId) || !VOTES.includes(a.vote as Vote)) return null;
      if (a.argument !== null && !id(a.argument)) return null;
      if (a.covenant !== undefined && !COVENANT_IDS.includes(a.covenant as CovenantId)) return null;
      return {
        type: "meeting",
        itemId: a.itemId,
        argument: a.argument as string | null,
        vote: a.vote as Vote,
        ...(a.covenant !== undefined ? { covenant: a.covenant as CovenantId } : {}),
      };
    case "followUp":
      return id(a.itemId) ? { type: "followUp", itemId: a.itemId } : null;
    case "readMail":
      return id(a.mailId) ? { type: "readMail", mailId: a.mailId } : null;
    case "mandate": {
      if (!id(a.mandateId) || !MANDATE_MOVES.includes(a.move as MandateMove)) return null;
      const dd = modules(a.dd);
      if (dd === null) return null;
      if (a.buyers !== undefined && !BUYER_FOCUS.includes(a.buyers as BuyerFocus)) return null;
      if (a.process !== undefined && !PROCESSES.includes(a.process as ProcessKind)) return null;
      const multiple = a.multiple === undefined ? undefined : share(a.multiple, 15);
      if (multiple === null) return null;
      const facts = a.facts === undefined ? undefined : Array.isArray(a.facts) && a.facts.length <= 12 && a.facts.every((f) => id(f)) ? (a.facts as string[]) : null;
      if (facts === null) return null;
      if (a.lever !== undefined && !MANDATE_LEVERS.includes(a.lever as MandateLever)) return null;
      if (a.bidder !== undefined && (typeof a.bidder !== "string" || a.bidder.length === 0 || a.bidder.length > 80)) return null;
      return {
        type: "mandate",
        mandateId: a.mandateId,
        move: a.move as MandateMove,
        ...(multiple !== undefined ? { multiple } : {}),
        ...(a.buyers !== undefined ? { buyers: a.buyers as BuyerFocus } : {}),
        ...(a.process !== undefined ? { process: a.process as ProcessKind } : {}),
        ...(dd.length > 0 ? { dd } : {}),
        ...(facts !== undefined ? { facts } : {}),
        ...(a.bidder !== undefined ? { bidder: a.bidder as string } : {}),
        ...(a.lever !== undefined ? { lever: a.lever as MandateLever } : {}),
      };
    }
    case "search": {
      if (a.move === "stop") return { type: "search", move: "stop" };
      const candidate = Number(a.candidate ?? 0);
      return a.move === "start" && Number.isInteger(candidate) && candidate >= 0 && candidate <= 2 ? { type: "search", move: "start", candidate } : null;
    }
    case "examine": {
      const dd = modules(a.modules);
      return id(a.targetId) && dd && dd.length > 0 ? { type: "examine", targetId: a.targetId, modules: dd } : null;
    }
    case "duel": {
      if (!id(a.targetId) || !["raise", "concept", "leave"].includes(a.move as string)) return null;
      if (a.size !== undefined && a.size !== "small" && a.size !== "big") return null;
      return { type: "duel", targetId: a.targetId, move: a.move as "raise" | "concept" | "leave", ...(a.size !== undefined ? { size: a.size as "small" | "big" } : {}) };
    }
    case "acquire": {
      const bank = share(a.bank, 0.6);
      const vendor = share(a.vendor, 0.2);
      const earnout = share(a.earnout, 0.15);
      if (!id(a.targetId) || (a.bid !== "ask" && a.bid !== "low") || bank === null || vendor === null || earnout === null) return null;
      if (a.integration !== undefined && a.integration !== "fast" && a.integration !== "careful") return null;
      return {
        type: "acquire",
        targetId: a.targetId,
        bid: a.bid,
        bank,
        vendor,
        earnout,
        ...(a.integration !== undefined ? { integration: a.integration as "fast" | "careful" } : {}),
      };
    }
    case "lever":
      return id(a.startupId) && LEVER_IDS.includes(a.lever as LeverId) ? { type: "lever", startupId: a.startupId, lever: a.lever as LeverId } : null;
    case "platform": {
      if (!id(a.startupId) || !["make", "sell", "cure", "stopSale"].includes(a.move as string)) return null;
      if (a.process !== undefined && !PROCESSES.includes(a.process as ProcessKind)) return null;
      if (a.buyers !== undefined && a.buyers !== "strategic" && a.buyers !== "financial") return null;
      return {
        type: "platform",
        startupId: a.startupId,
        move: a.move as "make" | "sell" | "cure" | "stopSale",
        ...(a.process !== undefined ? { process: a.process as ProcessKind } : {}),
        ...(a.buyers !== undefined ? { buyers: a.buyers as "strategic" | "financial" } : {}),
      };
    }
    case "fund":
      if (!["launch", "pitch", "concede", "refuse", "close"].includes(a.move as string)) return null;
      if (a.lpId !== undefined && !id(a.lpId)) return null;
      return { type: "fund", move: a.move as FundMove, ...(a.lpId !== undefined ? { lpId: a.lpId as string } : {}) };
    case "lpac":
      return id(a.voteId) && id(a.choice) ? { type: "lpac", voteId: a.voteId, choice: a.choice } : null;
    case "studio": {
      if (!["found", "tranche", "fundAsk"].includes(a.move as string)) return null;
      if (a.ideaId !== undefined && !id(a.ideaId)) return null;
      if (a.startupId !== undefined && !id(a.startupId)) return null;
      if (a.size !== undefined && !["lean", "plan", "big"].includes(a.size as string)) return null;
      const ceo = a.ceo === undefined ? undefined : Number(a.ceo);
      const keep = a.keep === undefined ? undefined : Number(a.keep);
      if (ceo !== undefined && !(Number.isInteger(ceo) && ceo >= 0 && ceo <= 3)) return null;
      if (keep !== undefined && ![60, 70, 80].includes(keep)) return null;
      return {
        type: "studio",
        move: a.move as StudioMove,
        ...(a.ideaId !== undefined ? { ideaId: a.ideaId as string } : {}),
        ...(a.startupId !== undefined ? { startupId: a.startupId as string } : {}),
        ...(a.size !== undefined ? { size: a.size as "lean" | "plan" | "big" } : {}),
        ...(ceo !== undefined ? { ceo } : {}),
        ...(keep !== undefined ? { keep } : {}),
      };
    }
    case "estate":
    case "foundation":
    case "dynasty":
      return parseWealth(a);
    case "learn":
    case "closeMonth":
      return { type: a.type };
    default:
      return null;
  }
}

const BINDINGS = [5, 10, 15] as const;
const PURPOSES = ["bildung", "gruenderinnen", "nachfolge"] as const;
const HEIRS = ["kind", "schuetzling"] as const;
const CHARTER = ["ausschuettung", "eintritt", "streit", "werte", "nachfolge"] as const;
const STRATEGIES = ["bewahren", "ausgewogen", "wachstum", "none"] as const;
const oneOf = <T extends string | number>(list: readonly T[], value: unknown): value is T => list.includes(value as T);

/** Property, foundation and dynasty moves (see wealth-types.ts). */
function parseWealth(a: Record<string, unknown>): WealthAction | null {
  if (a.type === "estate") {
    if (a.move === "buy") {
      const ltv = share(a.ltv, 0.8);
      const binding = Number(a.binding);
      return id(a.offerId) && ltv !== null && oneOf(BINDINGS, binding) ? { type: "estate", move: "buy", offerId: a.offerId, ltv, binding } : null;
    }
    return (a.move === "sell" || a.move === "renovate") && id(a.propertyId) ? { type: "estate", move: a.move, propertyId: a.propertyId } : null;
  }
  if (a.type === "foundation") {
    const amount = Number(a.amount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100_000_000) return null;
    if (a.move === "found") return oneOf(PURPOSES, a.purpose) ? { type: "foundation", move: "found", amount, purpose: a.purpose } : null;
    return a.move === "give" ? { type: "foundation", move: "give", amount } : null;
  }
  switch (a.move) {
    case "choose":
      return oneOf(HEIRS, a.heir) ? { type: "dynasty", move: "choose", heir: a.heir } : null;
    case "mentor":
    case "handover":
      return { type: "dynasty", move: a.move };
    case "charter":
      return oneOf(CHARTER, a.article) ? { type: "dynasty", move: "charter", article: a.article } : null;
    case "council": {
      const choice = Number(a.choice);
      return choice === 0 || choice === 1 ? { type: "dynasty", move: "council", choice } : null;
    }
    case "strategy":
      return oneOf(STRATEGIES, a.strategy) ? { type: "dynasty", move: "strategy", strategy: a.strategy } : null;
    default:
      return null;
  }
}
