"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import type { ActionResult as GameResult } from "@/lib/game/engine";
import { parseAction } from "@/lib/game/validate";
import { parseNewsSeen } from "@/lib/changelog";
import { parseOnboardingPatch } from "@/lib/game/onboarding";
import { GameRuleError, performAction, resetGame, saveNewsSeen, saveOnboarding } from "@/lib/repository/game";
import { requireUser } from "@/lib/session";

export interface PlayResult {
  revision: number;
  result: GameResult;
}

/**
 * The one entry point for all moves. The session decides whose game it is;
 * the browser only sends the move and the revision it was looking at.
 */
export async function playAction(input: unknown, revision: number): Promise<ActionResult<PlayResult>> {
  const user = await requireUser();
  const action = parseAction(input);
  if (!action) return { ok: false, error: "Ungültige Aktion." };
  if (!Number.isInteger(revision) || revision < 0) return { ok: false, error: "Ungültiger Spielstand." };
  try {
    const { game, result } = await performAction(user.id!, action, revision);
    revalidatePath("/", "layout");
    return { ok: true, data: { revision: game.revision, result } };
  } catch (error) {
    if (error instanceof GameRuleError) {
      // A broken rule usually means the screen was stale: refresh it too.
      revalidatePath("/", "layout");
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function restartGameAction(): Promise<void> {
  const user = await requireUser();
  await resetGame(user.id!);
  revalidatePath("/", "layout");
  redirect("/");
}

/** Remembers that the introduction was finished or skipped, or that unlock hints were read. No page refresh needed. */
export async function saveOnboardingAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const patch = parseOnboardingPatch(input);
  if (!patch) return { ok: false, error: "Ungültige Eingabe." };
  await saveOnboarding(user.id!, patch);
  return { ok: true, data: null };
}

/** Remembers that the "what's new" popup was closed up to this release. No page refresh needed. */
export async function saveNewsSeenAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = parseNewsSeen(input);
  if (!id) return { ok: false, error: "Ungültige Eingabe." };
  await saveNewsSeen(user.id!, id);
  return { ok: true, data: null };
}
