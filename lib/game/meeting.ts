import {
  ARGUMENT_PULL,
  PRETALK_BOOST,
  PRETALK_SHIFT,
  PROPOSER_RECEPTIVENESS,
  PROPOSER_STANCE,
} from "./config";
import { SEAT_ORDER } from "./startups";
import { fill, type Argument, type Reason, type Template } from "./templates";
import { COVENANTS } from "./covenants";
import type { BoardItem, BoardMember, CovenantId, Personality, SeatId, Shares, SpeakerId, Startup, Vote } from "./types";
import { outcomeFromShares, playerShares, sharesFromStance, sumShares, voteFromStance, type Ballot } from "./votes";

export type Phase = "opening" | "statements" | "debate" | "vote" | "verdict";

export type MeetingEvent =
  | { kind: "phase"; phase: Phase }
  | { kind: "statement"; speaker: SpeakerId; text: string; stance: number }
  | { kind: "reaction"; speaker: SpeakerId; target: SpeakerId; relation: "agree" | "disagree"; text: string }
  | { kind: "vote"; speaker: SpeakerId; vote: Vote; reason: string; shares: Shares };

export interface MeetingInput {
  template: Template;
  startup: Startup;
  item: BoardItem;
  reputation: number;
  random: () => number;
  /** undefined: the player has not spoken yet; null: the player stays silent. */
  argument?: string | null;
  vote?: Vote;
  /** The condition the player votes for (with vote "conditions"). */
  covenant?: CovenantId;
}

export interface MeetingPlayback {
  events: MeetingEvent[];
  /** Index after which the player chooses an argument. */
  pauseForArgument: number;
  /** Index after which the player votes (only when an argument was given). */
  pauseForVote: number | null;
  stancesBefore: Record<SeatId, number>;
  stancesAfter: Record<SeatId, number>;
  ballots: Ballot[];
  outcome: Vote | null;
  shares: Shares | null;
}

const TARGET: Record<Vote, number> = { go: 0.85, conditions: 0.1, no: -0.85 };
const clamp = (v: number) => Math.min(1, Math.max(-1, v));

const PERSONALITY_BIAS: Record<Personality, number> = {
  visionary: 0.1,
  numbers: -0.1,
  doer: 0.05,
  diplomat: 0,
  loyal: 0,
  practical: 0,
};

/** Where each member stands before anyone argues: interests, temperament, a little mood of the day. */
export function baseStances(t: Template, s: Startup, random: () => number): Record<SeatId, number> {
  const stances = {} as Record<SeatId, number>;
  for (const member of s.board) {
    const pulls = member.interests.map((i) => t.pull[i] ?? 0);
    let stance = pulls.reduce((a, b) => a + b, 0) / Math.max(1, pulls.length);
    stance += PERSONALITY_BIAS[member.personality];
    if (member.personality === "diplomat") stance *= 0.6;
    if (member.seat === "ceo") stance += PROPOSER_STANCE;
    stance += (random() - 0.5) * 0.3;
    stances[member.seat] = clamp(stance);
  }
  for (const member of s.board) {
    if (member.personality === "loyal") stances[member.seat] = clamp(0.65 * stances.ceo + 0.35 * stances[member.seat]);
  }
  return stances;
}

/** How an argument moves each member: interests that match listen, a talk beforehand doubles the effect. */
export function stancesAfterArgument(
  before: Record<SeatId, number>,
  s: Startup,
  item: BoardItem,
  argument: Argument | null,
  reputation: number,
): Record<SeatId, number> {
  const after = { ...before };
  if (!argument) return after;
  for (const member of s.board) {
    const matches = member.interests.some((i) => argument.appeals.includes(i));
    const pretalked = item.pretalks.includes(member.seat);
    let strength = matches ? ARGUMENT_PULL : 0.08;
    if (pretalked) strength = strength * PRETALK_BOOST + PRETALK_SHIFT;
    if (member.seat === "ceo") strength *= PROPOSER_RECEPTIVENESS;
    if (member.personality === "loyal" && !pretalked) strength *= 0.35;
    if (member.seat === "ceo" || member.seat === "cto") strength *= 0.6 + (0.8 * s.metrics.trust) / 100;
    strength *= 0.8 + reputation / 250;
    const target = TARGET[argument.toward];
    after[member.seat] = clamp(before[member.seat] + (target - before[member.seat]) * Math.min(1, strength));
  }
  return after;
}

const OPENERS: Record<Personality, { pos: string[]; neg: string[]; mid: string[] }> = {
  visionary: {
    pos: ["Das ist unsere Chance.", "Wer jetzt zögert, verliert."],
    neg: ["Ich bin skeptisch, und das sage ich selten."],
    mid: ["Ich will das, aber nicht um jeden Preis."],
  },
  numbers: {
    pos: ["Ich habe nachgerechnet, es geht auf."],
    neg: ["Ich habe nachgerechnet.", "Die Zahlen sprechen dagegen."],
    mid: ["Die Zahlen sind nicht eindeutig."],
  },
  doer: { pos: ["Kurz und klar: machen."], neg: ["Ich bin für Tempo, aber nicht so."], mid: ["Ich will entscheiden, nicht ewig reden."] },
  diplomat: {
    pos: ["Ich kann das unterstützen."],
    neg: ["Ich habe Bedenken, die ich offen sagen möchte."],
    mid: ["Ich verstehe beide Seiten."],
  },
  loyal: { pos: ["Ich stehe hinter {ceo}."], neg: ["Ich sage das ungern gegen {ceo}, aber:"], mid: ["Ich bin unsicher."] },
  practical: { pos: ["Aus der Praxis: Das funktioniert."], neg: ["Aus der Praxis:"], mid: ["Ich frage mich, was der Kunde davon hat."] },
};

function pick<T>(list: T[], random: () => number): T {
  return list[Math.floor(random() * list.length) % list.length]!;
}

function reasonFor(member: BoardMember, stance: number, t: Template, random: () => number): Reason {
  const pool = stance >= 0 ? t.pro : t.contra;
  const matching = pool.filter((r) => member.interests.includes(r.interest));
  return pick(matching.length > 0 ? matching : pool, random);
}

function statementText(member: BoardMember, stance: number, t: Template, s: Startup, random: () => number): string {
  if (member.seat === "ceo") return fill(t.pitch.replace(/^„|“$/g, ""), s);
  const openers = OPENERS[member.personality];
  const opener = pick(stance > 0.2 ? openers.pos : stance < -0.2 ? openers.neg : openers.mid, random);
  const reason = reasonFor(member, stance, t, random);
  return fill(`${opener} ${reason.text}`, s);
}

function memberName(s: Startup, id: SpeakerId): string {
  if (id === "you") return "du";
  return s.board.find((b) => b.seat === id)?.short ?? id;
}

export function voteReason(t: Template, vote: Vote, s: Startup, covenant?: CovenantId): string {
  if (vote === "conditions" && covenant) return `Mit Auflage: ${COVENANTS[covenant].name}.`;
  const label = fill(t.outcomes[vote].label, s);
  if (vote === "go") return `Dafür: ${label}.`;
  if (vote === "conditions") return `Mit Auflagen: ${label}.`;
  return `Dagegen. Mein Vorschlag: ${label}.`;
}

/**
 * Builds the meeting as a list of events, like the boardroom repo plays them:
 * opening, statements, debate (with the player's argument and reactions drawn
 * as lines across the table), votes with conviction shares, verdict. Without
 * an argument it stops before the debate; without a vote, before the ballot.
 */
export function buildMeeting(input: MeetingInput): MeetingPlayback {
  const { template: t, startup: s, item, random, reputation } = input;
  const before = baseStances(t, s, random);
  const events: MeetingEvent[] = [{ kind: "phase", phase: "opening" }, { kind: "phase", phase: "statements" }];

  const order: SeatId[] = ["ceo", ...SEAT_ORDER.filter((seat) => seat !== "ceo")];
  for (const seat of order) {
    const member = s.board.find((b) => b.seat === seat);
    if (!member) continue;
    events.push({ kind: "statement", speaker: seat, text: statementText(member, before[seat], t, s, random), stance: before[seat] });
  }
  const pauseForArgument = events.length;

  const empty: MeetingPlayback = {
    events,
    pauseForArgument,
    pauseForVote: null,
    stancesBefore: before,
    stancesAfter: before,
    ballots: [],
    outcome: null,
    shares: null,
  };
  if (input.argument === undefined) return empty;

  const argument = input.argument ? (t.arguments.find((a) => a.id === input.argument) ?? null) : null;
  const after = stancesAfterArgument(before, s, item, argument, reputation);

  events.push({ kind: "phase", phase: "debate" });
  if (argument) {
    events.push({ kind: "statement", speaker: "you", text: fill(argument.text, s), stance: TARGET[argument.toward] });
    const moved = s.board
      .map((m) => ({ m, delta: Math.abs(after[m.seat] - before[m.seat]), away: Math.abs(after[m.seat] - TARGET[argument.toward]) }))
      .sort((a, b) => b.delta - a.delta);
    for (const { m } of moved.filter((x) => x.delta > 0.12).slice(0, 2)) {
      // Wer dir zustimmt, begründet in die Richtung deines Arguments.
      const reason = reasonFor(m, TARGET[argument.toward] >= 0.5 ? 1 : -1, t, random);
      events.push({
        kind: "reaction",
        speaker: m.seat,
        target: "you",
        relation: "agree",
        text: fill(`${pick(["Das überzeugt mich.", "Da gebe ich dir recht."], random)} ${reason.text}`, s),
      });
    }
    const opponent = moved.filter((x) => x.delta <= 0.12 && x.away > 0.9).sort((a, b) => b.away - a.away)[0];
    if (opponent) {
      const reason = reasonFor(opponent.m, after[opponent.m.seat], t, random);
      events.push({
        kind: "reaction",
        speaker: opponent.m.seat,
        target: "you",
        relation: "disagree",
        text: fill(`${pick(["Das sehe ich anders.", "Da widerspreche ich."], random)} ${reason.text}`, s),
      });
    }
  }
  const ranked = s.board.map((m) => ({ m, stance: after[m.seat] })).sort((a, b) => a.stance - b.stance);
  const low = ranked[0];
  const high = ranked[ranked.length - 1];
  if (low && high && high.stance - low.stance > 0.6) {
    const reason = reasonFor(low.m, low.stance, t, random);
    events.push({
      kind: "reaction",
      speaker: low.m.seat,
      target: high.m.seat,
      relation: "disagree",
      text: fill(`${pick([`${high.m.short}, da muss ich widersprechen.`, `Bei allem Respekt, ${high.m.short}:`], random)} ${reason.text}`, s),
    });
    const second = ranked[ranked.length - 2];
    if (second && Math.abs(second.stance - high.stance) < 0.35) {
      const r2 = reasonFor(second.m, second.stance, t, random);
      events.push({
        kind: "reaction",
        speaker: second.m.seat,
        target: high.m.seat,
        relation: "agree",
        text: fill(`${high.m.short} hat recht. ${r2.text}`, s),
      });
    }
  }
  const pauseForVote = events.length;
  if (!input.vote) return { ...empty, events, pauseForVote, stancesAfter: after };

  events.push({ kind: "phase", phase: "vote" });
  const ballots: Ballot[] = [];
  for (const seat of SEAT_ORDER) {
    const member = s.board.find((b) => b.seat === seat);
    if (!member) continue;
    const vote = voteFromStance(after[seat]);
    const shares = sharesFromStance(after[seat], vote, random);
    ballots.push({ member: seat, vote, shares });
    events.push({ kind: "vote", speaker: seat, vote, reason: voteReason(t, vote, s), shares });
  }
  const mine = playerShares(input.vote);
  ballots.push({ member: "you", vote: input.vote, shares: mine });
  events.push({ kind: "vote", speaker: "you", vote: input.vote, reason: voteReason(t, input.vote, s, input.covenant), shares: mine });
  events.push({ kind: "phase", phase: "verdict" });
  const shares = sumShares(ballots);
  return {
    events,
    pauseForArgument,
    pauseForVote,
    stancesBefore: before,
    stancesAfter: after,
    ballots,
    outcome: outcomeFromShares(shares),
    shares,
  };
}

export { memberName };
