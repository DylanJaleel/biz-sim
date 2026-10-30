import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getDb } from "../db";
import { applyAction, GameRuleError, newGame, planAgenda, upgradeState, type ActionResult } from "../game/engine";
import { monthLabel } from "../game/config";
import type { GameAction, GameState } from "../game/types";
import { applyNewsSeen, LATEST_RELEASE_ID } from "../changelog";
import { applyOnboardingPatch, type OnboardingPatch } from "../game/onboarding";
import { budgetReached, flushIfDue } from "../usage";
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
  if (await budgetReached(getDb())) {
    throw new GameRuleError("Das Monatsbudget für die Datenbank ist erreicht. Spielzüge pausieren bis zum Monatsende, ansehen geht weiter. Details unter Konto.");
  }
  await ensureGame(userId);
  const done = await getDb().$transaction(async (tx) => {
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
  await flushIfDue(getDb());
  return done;
}

/** Deletes the game; the next visit starts over. A copy stays among the saves. */
export async function resetGame(userId: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const row = await tx.game.findUnique({ where: { userId } });
    if (row) await writeSave(tx, userId, "backup", "Vor dem Neustart", upgradeState(unpackState(row.state)));
    await tx.game.deleteMany({ where: { userId } });
  });
}

/**
 * Saves the progress of the introduction (finished or skipped, last step, hints acknowledged).
 * Quiet like reading mail: it neither checks nor bumps the revision, so an open tab stays valid.
 */
export async function saveOnboarding(userId: string, patch: OnboardingPatch): Promise<void> {
  await getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Game" WHERE "userId" = ${userId} FOR UPDATE`;
    const row = await tx.game.findUnique({ where: { userId } });
    if (!row) return;
    const state = upgradeState(unpackState(row.state));
    state.onboarding = applyOnboardingPatch(state.onboarding, patch);
    // A new game that finishes or skips the introduction has seen the news too: the same write marks the newest release.
    if (patch.done && state.month <= 1) state.whatsNew = applyNewsSeen(state.whatsNew, LATEST_RELEASE_ID);
    await tx.game.update({ where: { id: row.id }, data: { state: packState(state) } });
  });
}

/** Remembers the newest release the player has seen ("what's new" popup). Quiet like saveOnboarding: one write, no revision bump. */
export async function saveNewsSeen(userId: string, releaseId: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Game" WHERE "userId" = ${userId} FOR UPDATE`;
    const row = await tx.game.findUnique({ where: { userId } });
    if (!row) return;
    const state = upgradeState(unpackState(row.state));
    state.whatsNew = applyNewsSeen(state.whatsNew, releaseId);
    await tx.game.update({ where: { id: row.id }, data: { state: packState(state) } });
  });
}
