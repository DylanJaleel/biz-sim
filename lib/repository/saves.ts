import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "../db";
import { monthLabel } from "../game/config";
import { GameRuleError, upgradeState } from "../game/engine";
import type { GameState } from "../game/types";
import { packState, unpackState } from "./codec";
import { ensureGame, loadGame } from "./game";
import { KEEP, pruneSaves, summarize, writeSave, type SaveKind, type SaveListItem, type SaveSummary } from "./save-store";

export { KEEP, summarize, type SaveKind, type SaveListItem, type SaveSummary } from "./save-store";

// Sicherungen: Der laufende Spielstand liegt pro Konto in der Datenbank und
// wird nach jedem Zug geschrieben. Zusätzlich gibt es Kopien zum Zurückholen:
// automatisch nach jedem Monatsabschluss und vor jedem Laden oder Neustart,
// dazu eigene, benannte Sicherungen und eine signierte Datei zum Mitnehmen.

export async function listSaves(userId: string): Promise<SaveListItem[]> {
  await pruneSaves(getDb(), userId);
  const rows = await getDb().gameSave.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, name: true, summary: true, createdAt: true },
  });
  return rows.map((r) => ({ ...r, kind: r.kind as SaveKind, summary: r.summary as unknown as SaveSummary }));
}

/** A named save of the current game. */
export async function createSave(userId: string, name: string): Promise<void> {
  const game = await loadGame(userId);
  const count = await getDb().gameSave.count({ where: { userId, kind: "manual" } });
  if (count >= KEEP.manual) throw new GameRuleError(`Du hast schon ${KEEP.manual} eigene Sicherungen. Lösche eine, bevor du eine neue anlegst.`);
  const label = name.trim() || `Mein Stand, ${monthLabel(game.state.month)}`;
  await getDb().$transaction((tx) => writeSave(tx, userId, "manual", label, game.state));
}

/** Replaces the running game with a copy; the current game is backed up first. */
async function replaceGame(userId: string, next: GameState, backupName: string): Promise<void> {
  await ensureGame(userId);
  await getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Game" WHERE "userId" = ${userId} FOR UPDATE`;
    const row = await tx.game.findUniqueOrThrow({ where: { userId } });
    await writeSave(tx, userId, "backup", backupName, upgradeState(unpackState(row.state)));
    await tx.game.update({
      where: { id: row.id },
      data: { state: packState(next), month: next.month, revision: { increment: 1 } },
      select: { id: true },
    });
  });
}

export async function restoreSave(userId: string, saveId: string): Promise<void> {
  const save = await getDb().gameSave.findFirst({ where: { id: saveId, userId } });
  if (!save) throw new GameRuleError("Diese Sicherung gibt es nicht.");
  const state = upgradeState(unpackState(save.state));
  await replaceGame(userId, state, `Vor dem Laden von „${save.name}“`);
}

export async function deleteSave(userId: string, saveId: string): Promise<void> {
  const { count } = await getDb().gameSave.deleteMany({ where: { id: saveId, userId } });
  if (count === 0) throw new GameRuleError("Diese Sicherung gibt es nicht.");
}

// ---------------------------------------------------------------------------
// Datei zum Mitnehmen: signiert, damit nur unveränderte Stände zurückkommen.
// ---------------------------------------------------------------------------

export const EXPORT_FORMAT = "boardroom-spielstand";

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  exportedAt: string;
  summary: SaveSummary;
  state: GameState;
  signature: string;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET fehlt.");
  return "boardroom-dev-secret";
}

function sign(state: GameState): string {
  return createHmac("sha256", secret()).update(JSON.stringify(state)).digest("hex");
}

export async function exportGame(userId: string): Promise<ExportFile> {
  const { state } = await loadGame(userId);
  return { format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), summary: summarize(state), state, signature: sign(state) };
}

/** Accepts only files this game wrote and nobody edited since. */
export function verifyExport(input: unknown): GameState {
  const file = input as Partial<ExportFile> | null;
  if (!file || file.format !== EXPORT_FORMAT || typeof file.signature !== "string" || typeof file.state !== "object" || file.state === null) {
    throw new GameRuleError("Das ist keine Spielstand-Datei von Boardroom.");
  }
  const expected = Buffer.from(sign(file.state as GameState), "hex");
  const given = Buffer.from(file.signature, "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new GameRuleError("Die Datei wurde verändert oder stammt nicht von hier. Sie kann nicht geladen werden.");
  }
  const state = upgradeState(file.state as GameState);
  if (!Array.isArray(state.startups) || typeof state.month !== "number") throw new GameRuleError("Die Datei ist unvollständig.");
  return state;
}

export async function importGame(userId: string, input: unknown): Promise<void> {
  const state = verifyExport(input);
  await replaceGame(userId, state, "Vor dem Import einer Datei");
}
