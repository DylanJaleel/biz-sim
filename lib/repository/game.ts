import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getDb } from "../db";
import { applyAction, GameRuleError, newGame, planAgenda, upgradeState, type ActionResult } from "../game/engine";
import type { GameAction, GameState } from "../game/types";

export { GameRuleError } from "../game/engine";

export interface StoredGame {
  id: string;
  state: GameState;
  revision: number;
}

function toStored(row: { id: string; state: Prisma.JsonValue; revision: number }): StoredGame {
  return { id: row.id, state: upgradeState(row.state as unknown as GameState), revision: row.revision };
}

function freshState(): GameState {
  const state = newGame(randomInt(1, 2 ** 31 - 1));
  planAgenda(state);
  return state;
}

/** Loads the player's game, starting a new one on the first visit. A concurrent first visit resolves via the unique userId. */
export async function loadGame(userId: string): Promise<StoredGame> {
  const db = getDb();
  const existing = await db.game.findUnique({ where: { userId } });
  if (existing) return toStored(existing);
  const state = freshState();
  try {
    const created = await db.game.create({
      data: { userId, state: state as unknown as Prisma.InputJsonValue, month: state.month },
    });
    return toStored(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return toStored(await db.game.findUniqueOrThrow({ where: { userId } }));
    }
    throw error;
  }
}

/**
 * Applies one action under a row lock. `expectedRevision` is the revision the
 * player was looking at: a double tap or a stale tab fails instead of acting
 * twice.
 */
export async function performAction(
  userId: string,
  action: GameAction,
  expectedRevision: number,
): Promise<{ game: StoredGame; result: ActionResult }> {
  await loadGame(userId);
  return getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Game" WHERE "userId" = ${userId} FOR UPDATE`;
    const row = await tx.game.findUniqueOrThrow({ where: { userId } });
    // Marking mail as read changes nothing that matters, so it neither checks nor bumps the revision.
    const quiet = action.type === "readMail";
    if (!quiet && row.revision !== expectedRevision) {
      throw new GameRuleError("Der Spielstand hat sich inzwischen geändert. Die Ansicht wurde aktualisiert.");
    }
    const { state, result } = applyAction(upgradeState(row.state as unknown as GameState), action);
    const updated = await tx.game.update({
      where: { id: row.id },
      data: { state: state as unknown as Prisma.InputJsonValue, month: state.month, revision: quiet ? undefined : { increment: 1 } },
    });
    return { game: toStored(updated), result };
  });
}

/** Deletes the game; the next visit starts over. */
export async function resetGame(userId: string): Promise<void> {
  await getDb().game.deleteMany({ where: { userId } });
}
