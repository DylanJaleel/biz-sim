"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { GAME_LENGTH_WEEKS } from "@/lib/config";
import type { GameStatus } from "@/lib/outcome";
import {
  acceptOrder,
  closeRound,
  GameActionError,
  rejectOrder,
  restartGame,
  withdrawOrder,
} from "@/lib/repository/company";
import type { RoundSummary } from "@/lib/round";
import { requireCompanyId } from "@/lib/session";
import type { CompanyStage } from "@/lib/stage";
import { buildWeekWarnings, type WeekWarning } from "@/lib/warnings";

export interface WeekSummaryView {
  summary: RoundSummary;
  status: GameStatus;
  stageBefore: CompanyStage;
  stageAfter: CompanyStage;
  warnings: WeekWarning[];
}

/**
 * Every action re-reads the session (the proxy's cookie check is only
 * optimistic) and derives the company from it — the client only ever sends
 * ids of the thing it wants to act on, never who it is.
 */
async function guarded<T>(work: (companyId: string) => Promise<T>): Promise<ActionResult<T>> {
  const companyId = await requireCompanyId();
  try {
    const data = await work(companyId);
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof GameActionError) {
      // The rule violation usually means the screen was stale: refresh it too.
      revalidatePath("/", "layout");
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

function validOrderId(orderId: unknown): orderId is string {
  return typeof orderId === "string" && orderId.length > 0 && orderId.length <= 64;
}

const INVALID_ORDER: ActionResult<never> = { ok: false, error: "Ungültiger Auftrag." };

export async function acceptOrderAction(orderId: string): Promise<ActionResult> {
  if (!validOrderId(orderId)) return INVALID_ORDER;
  return guarded(async (companyId) => {
    await acceptOrder(companyId, orderId);
    return null;
  });
}

export async function rejectOrderAction(orderId: string): Promise<ActionResult> {
  if (!validOrderId(orderId)) return INVALID_ORDER;
  return guarded(async (companyId) => {
    await rejectOrder(companyId, orderId);
    return null;
  });
}

export async function withdrawOrderAction(orderId: string): Promise<ActionResult> {
  if (!validOrderId(orderId)) return INVALID_ORDER;
  return guarded(async (companyId) => {
    await withdrawOrder(companyId, orderId);
    return null;
  });
}

export async function closeRoundAction(expectedWeek: number): Promise<ActionResult<WeekSummaryView>> {
  if (!Number.isInteger(expectedWeek) || expectedWeek < 1 || expectedWeek > GAME_LENGTH_WEEKS) {
    return { ok: false, error: "Ungültige Woche." };
  }
  return guarded(async (companyId) => {
    const result = await closeRound(companyId, expectedWeek);
    return { ...result, warnings: buildWeekWarnings(result.summary, result.status) };
  });
}

export async function restartGameAction(): Promise<void> {
  const companyId = await requireCompanyId();
  await restartGame(companyId);
  revalidatePath("/", "layout");
  redirect("/");
}
