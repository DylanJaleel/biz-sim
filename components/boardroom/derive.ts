import type { MeetingEvent, Phase } from "@/lib/game/meeting";
import type { Shares, SpeakerId, Vote } from "@/lib/game/types";
import { SHARES_PER_MEMBER } from "@/lib/game/config";
import { voteFromStance, type Ballot } from "@/lib/game/votes";

export const PHASES: { id: Phase; label: string }[] = [
  { id: "opening", label: "Eröffnung" },
  { id: "statements", label: "Statements" },
  { id: "debate", label: "Debatte" },
  { id: "vote", label: "Abstimmung" },
  { id: "verdict", label: "Beschluss" },
];

export const VOTE_LABEL: Record<Vote, string> = { go: "Ja", conditions: "Auflagen", no: "Nein" };
export const OUTCOME_LABEL: Record<Vote, string> = { go: "Angenommen", conditions: "Mit Auflagen", no: "Abgelehnt" };

export type Reaction = Extract<MeetingEvent, { kind: "reaction" }>;

export interface RoomState {
  phase: Phase;
  latest: MeetingEvent | undefined;
  speaker: SpeakerId | undefined;
  reactions: Reaction[];
  votes: Partial<Record<SpeakerId, Vote>>;
  cast: Partial<Record<SpeakerId, Shares>>;
  stances: Partial<Record<SpeakerId, number>>;
  mood: number | undefined;
}

const VOTE_MOOD: Record<Vote, number> = { go: 1, conditions: 0.15, no: -1 };

export function deriveRoom(events: MeetingEvent[], shown: number): RoomState {
  const visible = events.slice(0, shown);
  let phase: Phase = "opening";
  const reactions: Reaction[] = [];
  const votes: RoomState["votes"] = {};
  const stances: RoomState["stances"] = {};
  const cast: RoomState["cast"] = {};

  for (const event of visible) {
    if (event.kind === "phase") phase = event.phase;
    else if (event.kind === "statement") stances[event.speaker] = event.stance;
    else if (event.kind === "reaction") {
      reactions.push(event);
      // Wer zustimmt oder widerspricht, rückt sichtbar näher an die Person heran oder weg.
      const target = stances[event.target];
      const own = stances[event.speaker];
      if (target !== undefined && own !== undefined) {
        stances[event.speaker] = event.relation === "agree" ? (own + target) / 2 : own;
      }
    } else {
      votes[event.speaker] = event.vote;
      cast[event.speaker] = event.shares;
    }
  }

  const voteValues = Object.values(votes);
  const stanceValues = Object.entries(stances)
    .filter(([id]) => id !== "you")
    .map(([, v]) => v);
  let mood: number | undefined;
  if (voteValues.length > 0) mood = voteValues.reduce((sum, v) => sum + VOTE_MOOD[v], 0) / voteValues.length;
  else if (stanceValues.length > 0) mood = stanceValues.reduce((a, b) => a + b, 0) / stanceValues.length;

  const latest = visible[visible.length - 1];
  const speaker = latest && latest.kind !== "phase" ? latest.speaker : undefined;
  return { phase, latest, speaker, reactions, votes, cast, stances, mood };
}

/** Shares a member would give at a stance, without the dice of the real vote. */
export function leaningShares(stance: number): Shares {
  const go = Math.round(Math.min(18, Math.max(0, 6.5 + 10 * stance)));
  const no = Math.round(Math.min(18, Math.max(0, stance < 0 ? 4 - 16 * stance : 4 - 4 * stance)));
  const abstain = Math.abs(stance) < 0.15 ? 3 : 0;
  const rest = Math.max(0, SHARES_PER_MEMBER - go - no - abstain);
  return { go, conditions: rest, no, abstain };
}

export type LiveBallot = Ballot & { state: "open" | "leaning" | "cast" };

/**
 * The live hemicycle: cast votes count with their real shares, members who have
 * spoken show their leaning, the rest are still open (grey).
 */
export function liveBallots(seats: SpeakerId[], room: RoomState): LiveBallot[] {
  return seats.map((member) => {
    const vote = room.votes[member];
    const shares = room.cast[member];
    if (vote && shares) return { member, vote, shares, state: "cast" as const };
    const stance = room.stances[member];
    if (stance !== undefined) return { member, vote: voteFromStance(stance), shares: leaningShares(stance), state: "leaning" as const };
    return { member, vote: "conditions" as const, shares: { go: 0, conditions: 0, no: 0, abstain: SHARES_PER_MEMBER }, state: "open" as const };
  });
}
