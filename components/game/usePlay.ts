"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { playAction, type PlayResult } from "@/app/(app)/actions";
import type { GameAction } from "@/lib/game/types";

/**
 * Sends a move with the revision the player is looking at. After each answer the
 * newest revision is remembered, so quick moves in a row do not trip over the
 * stale-tab check.
 */
export function usePlay(revision: number) {
  const returned = useRef(-1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const play = useCallback((action: GameAction, onDone?: (result: PlayResult) => void) => {
    setError(null);
    startTransition(async () => {
      const response = await playAction(action, Math.max(revision, returned.current));
      if (response.ok) {
        returned.current = Math.max(returned.current, response.data.revision);
        onDone?.(response.data);
      } else {
        setError(response.error);
      }
    });
  }, [revision]);

  return { play, pending, error, clearError: () => setError(null) };
}
