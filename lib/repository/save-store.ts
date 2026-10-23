import { Prisma } from "@prisma/client";
import { careerOf } from "../game/career";
import { monthLabel } from "../game/config";
import { netWorth } from "../game/engine";
import type { GameState } from "../game/types";
import { packState } from "./codec";

// Schreiben einer Sicherung, getrennt vom Rest, damit das Spiel-Repository
// nach dem Monatsabschluss sichern kann, ohne sich selbst zu importieren.

export type SaveKind = "auto" | "manual" | "backup";

export interface SaveSummary {
  month: number;
  monthLabel: string;
  worth: number;
  cash: number;
  reputation: number;
  career: string;
  mandates: number;
}

export interface SaveListItem {
  id: string;
  kind: SaveKind;
  name: string;
  summary: SaveSummary;
  createdAt: Date;
}

/** How many copies of each kind are kept; the oldest go first. */
export const KEEP: Record<SaveKind, number> = { auto: 12, manual: 10, backup: 5 };

type Tx = Prisma.TransactionClient;

export function summarize(state: GameState): SaveSummary {
  return {
    month: state.month,
    monthLabel: monthLabel(state.month),
    worth: Math.round(netWorth(state)),
    cash: Math.round(state.cash),
    reputation: state.reputation,
    career: careerOf(state).title,
    mandates: state.startups.filter((s) => s.status === "active").length,
  };
}

/** Writes a copy and drops the oldest of the same kind beyond the limit. */
export async function writeSave(tx: Tx, userId: string, kind: SaveKind, name: string, state: GameState): Promise<void> {
  await tx.gameSave.create({
    data: { userId, kind, name: name.slice(0, 80), state: packState(state), summary: summarize(state) as unknown as Prisma.InputJsonValue },
  });
  const old = await tx.gameSave.findMany({ where: { userId, kind }, orderBy: { createdAt: "desc" }, skip: KEEP[kind], select: { id: true } });
  if (old.length > 0) await tx.gameSave.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}
