import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getDb } from "../db";
import { applyAction, GameRuleError, newGame, planAgenda, upgradeState, type ActionResult } from "../game/engine";
import { monthLabel } from "../game/config";
import type { GameAction, GameState } from "../game/types";
import { packState, unpackState } from "./codec";
import { writeSave } from "./save-store";

export { GameRuleError } from "../game/engine";

export interface StoredGame {
  id: string;
  state: GameState;
  revision: number;
  /** Last time the game was written to the database. */
  updatedAt: Date;
}

function toStored(row: { id: string; state: Prisma.JsonValue; revision: number; updatedAt: Date }): StoredGame {
  return { id: row.id, state: upgradeState(unpackState(row.state)), revision: row.revision, updatedAt: row.updatedAt };
}

function freshState(): GameState {
  const state = newGame(randomInt(1, 2 ** 31 - 1));
  planAgenda(state);
  return state;
}

/** Makes sure the player has a game without loading it. */
export async function ensureGame(userId: string): Promise<void> {
  const existing = await getDb().game.findUnique({ where: { userId }, select: { id: true } });
  if (!existing) await loadGame(userId);
}

/** Loads the player's game, starting a new one on the first visit. A concurrent first visit resolves via the unique userId. */
export async function loadGame(userId: string): Promise<StoredGame> {
  const db = getDb();
  const existing = await db.game.findUnique({ where: { userId } });
  if (existing) return toStored(existing);
  const state = freshState();
  try {
    const created = await db.game.create({
      data: { userId, state: packState(state), month: state.month },
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
export async function performAction(userId: string, action: GameAction, expectedRevision: number): Promise<{ game: StoredGame; result: ActionResult }> {
  await ensureGame(userId);
  return getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Game" WHERE "userId" = ${userId} FOR UPDATE`;
    const row = await tx.game.findUniqueOrThrow({ where: { userId } });
    // Marking mail as read changes nothing that matters, so it neither checks nor bumps the revision.
    const quiet = action.type === "readMail";
    if (!quiet && row.revision !== expectedRevision) {
      throw new GameRuleError("Der Spielstand hat sich inzwischen geändert. Die Ansicht wurde aktualisiert.");
    }
    const { state, result } = applyAction(upgradeState(unpackState(row.state)), action);
    const updated = await tx.game.update({
      where: { id: row.id },
      data: { state: packState(state), month: state.month, revision: quiet ? undefined : { increment: 1 } },
      select: { id: true, revision: true, updatedAt: true },
    });
    // Every closed month leaves a copy to go back to.
    if (action.type === "closeMonth") await writeSave(tx, userId, "auto", `Nach dem Abschluss von ${monthLabel(state.month - 1)}`, state);
    return { game: { ...updated, state }, result };
  });
}

/** Deletes the game; the next visit starts over. A copy stays among the saves. */
export async function resetGame(userId: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const row = await tx.game.findUnique({ where: { userId } });
    if (row) await writeSave(tx, userId, "backup", "Vor dem Neustart", upgradeState(unpackState(row.state)));
    await tx.game.deleteMany({ where: { userId } });
  });
}
