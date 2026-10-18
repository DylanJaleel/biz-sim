import { templateOf } from "./content";
import { applyAction, daysLeft, GameRuleError, newGame, openItems, portfolioValue, previewMeeting, randomFor, startupOf } from "./engine";
import { bestVote, outlook, VOTES } from "./judge";
import type { GameAction, GameState, Vote } from "./types";

// Skript-Spieler für die Balance: Sie spielen das Spiel über die echte Engine.

export interface Bot {
  name: string;
  /** Which offered startup to invest in. */
  pick: (state: GameState) => string | null;
  /** Actions for one month, executed in order; failing actions are skipped. */
  month: (state: GameState, random: () => number) => GameAction[];
}

function firstAffordable(state: GameState, prefer?: string): string | null {
  const offers = state.startups.filter((s) => s.status === "offered" && s.offer && s.offer.ticket <= state.cash);
  return (offers.find((s) => s.id === prefer) ?? offers[0])?.id ?? null;
}

function investActions(state: GameState, id: string | null, dd: boolean): GameAction[] {
  if (!id || state.startups.some((s) => s.status === "active")) return [];
  return dd ? [{ type: "dd", startupId: id }, { type: "invest", startupId: id }] : [{ type: "invest", startupId: id }];
}

/** Never meets: the founders decide everything alone. */
export const passiveBot = (prefer?: string): Bot => ({
  name: "passiv",
  pick: (s) => firstAffordable(s, prefer),
  month: (s) => investActions(s, firstAffordable(s, prefer), false),
});

/** Always says yes to whatever the founder proposes. */
export const yesBot = (prefer?: string): Bot => ({
  name: "Ja-Sager",
  pick: (s) => firstAffordable(s, prefer),
  month: (s) => [
    ...investActions(s, firstAffordable(s, prefer), false),
    ...openItems(s).map((i) => ({ type: "meeting", itemId: i.id, argument: null, vote: "go" }) as GameAction),
  ],
});

/** Votes at random, argues at random. */
export const randomBot = (prefer?: string): Bot => ({
  name: "Zufall",
  pick: (s) => firstAffordable(s, prefer),
  month: (s, random) => [
    ...investActions(s, firstAffordable(s, prefer), false),
    ...openItems(s).map((i) => {
      const t = templateOf(i.templateId);
      const arg = t.arguments[Math.floor(random() * 3)]!;
      return { type: "meeting", itemId: i.id, argument: arg.id, vote: VOTES[Math.floor(random() * 3)]! } as GameAction;
    }),
  ],
});

/**
 * Prepares like a careful board member: CFO view, talks to the member most
 * likely to swing, argues for the best plan and votes for it.
 */
export const analystBot = (prefer?: string): Bot => ({
  name: "Analyst",
  pick: (s) => firstAffordable(s, prefer),
  month: (s) => {
    const actions: GameAction[] = [...investActions(s, firstAffordable(s, prefer), true)];
    for (const item of openItems(s)) {
      const t = templateOf(item.templateId);
      const startup = startupOf(s, item.startupId);
      const o = outlook(t, startup);
      const best = bestVote({ go: o.go.value, conditions: o.conditions.value, no: o.no.value });
      const argument = t.arguments.find((a) => a.toward === best) ?? t.arguments[0]!;
      const stances = previewMeeting(s, item.id).stancesBefore;
      const swing = startup.board
        .filter((m) => m.seat !== "ceo" && m.interests.some((i) => argument.appeals.includes(i)))
        .sort((a, b) => Math.abs(stances[a.seat] - target(best)) - Math.abs(stances[b.seat] - target(best)))
        .reverse()[0];
      actions.push({ type: "cfo", itemId: item.id });
      if (swing) actions.push({ type: "pretalk", itemId: item.id, seat: swing.seat });
      actions.push({ type: "meeting", itemId: item.id, argument: argument.id, vote: best });
    }
    for (const startup of s.startups.filter((x) => x.status === "active" && x.metrics.trust < 55)) {
      actions.push({ type: "founderCall", startupId: startup.id });
    }
    return actions;
  },
});

function target(v: Vote): number {
  return v === "go" ? 0.85 : v === "conditions" ? 0.1 : -0.85;
}

export interface BotRun {
  bot: string;
  seed: number;
  months: number;
  finalValue: number;
  cash: number;
  reputation: number;
  dead: number;
  exited: number;
  judgments: Record<"strong" | "fair" | "weak", number>;
}

export function runBot(bot: Bot, seed: number, months: number): BotRun {
  let state = newGame(seed);
  for (let m = 0; m < months; m++) {
    const random = randomFor(seed, `bot|${m}`);
    for (const action of bot.month(state, random)) {
      try {
        state = applyAction(state, action).state;
      } catch (error) {
        if (!(error instanceof GameRuleError)) throw error;
      }
      if (daysLeft(state) <= 0) break;
    }
    state = applyAction(state, { type: "closeMonth" }).state;
  }
  const judgments = { strong: 0, fair: 0, weak: 0 };
  for (const i of state.items) if (i.decision && !i.decision.lapsed) judgments[i.decision.judgment]++;
  return {
    bot: bot.name,
    seed,
    months,
    finalValue: portfolioValue(state) + state.cash,
    cash: state.cash,
    reputation: state.reputation,
    dead: state.startups.filter((s) => s.status === "dead").length,
    exited: state.startups.filter((s) => s.status === "exited").length,
    judgments,
  };
}
