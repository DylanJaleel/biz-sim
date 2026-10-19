"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import type { ActionResult } from "@/lib/action-result";
import { GameRuleError } from "@/lib/repository/game";
import { createSave, deleteSave, importGame, restoreSave } from "@/lib/repository/saves";
import { requireUser } from "@/lib/session";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

const ID = /^[\w-]{1,64}$/;

/** Runs a save operation for the signed-in player; broken rules come back as messages. */
async function run(work: (userId: string) => Promise<void>): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await work(user.id!);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof GameRuleError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function createSaveAction(name: unknown): Promise<ActionResult> {
  const label = typeof name === "string" ? name.slice(0, 80) : "";
  return run((userId) => createSave(userId, label));
}

export async function restoreSaveAction(saveId: unknown): Promise<ActionResult> {
  if (typeof saveId !== "string" || !ID.test(saveId)) return { ok: false, error: "Ungültige Sicherung." };
  return run((userId) => restoreSave(userId, saveId));
}

export async function deleteSaveAction(saveId: unknown): Promise<ActionResult> {
  if (typeof saveId !== "string" || !ID.test(saveId)) return { ok: false, error: "Ungültige Sicherung." };
  return run((userId) => deleteSave(userId, saveId));
}

/** A save file from the player's device; at most 2 MB. */
export async function importSaveAction(text: unknown): Promise<ActionResult> {
  if (typeof text !== "string" || text.length === 0) return { ok: false, error: "Die Datei ist leer." };
  if (text.length > 2_000_000) return { ok: false, error: "Die Datei ist zu groß." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Die Datei ist kein gültiger Spielstand." };
  }
  return run((userId) => importGame(userId, parsed));
}
