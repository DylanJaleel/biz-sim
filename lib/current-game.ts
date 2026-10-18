import "server-only";
import { cache } from "react";
import { loadGame } from "./repository/game";
import { requireUser } from "./session";

/**
 * The signed-in player's game, read once per request (layout and page share
 * it). Reads the session cookie, so callers must sit behind <Suspense>.
 */
export const currentGame = cache(async () => {
  const user = await requireUser();
  return loadGame(user.id!);
});
