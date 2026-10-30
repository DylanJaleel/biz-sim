import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestDatabase } from "./helpers/test-db";

let database: Awaited<ReturnType<typeof startTestDatabase>>;

beforeAll(async () => {
  database = await startTestDatabase();
}, 30_000);

afterAll(async () => {
  await database.stop();
});

const { getDb } = await import("../lib/db");
const { loadGame, performAction, resetGame, saveNewsSeen, saveOnboarding, GameRuleError } = await import("../lib/repository/game");

let counter = 0;
async function newUser() {
  return getDb().user.create({ data: { email: `board-${counter++}@example.com` } });
}

describe("game repository", () => {
  it("creates a game on the first visit and returns the same game afterwards", async () => {
    const user = await newUser();
    const first = await loadGame(user.id);
    const second = await loadGame(user.id);
    expect(second.id).toBe(first.id);
    expect(first.state.month).toBe(1);
    expect(first.state.startups.filter((s) => s.status === "offered")).toHaveLength(2);
    expect(first.revision).toBe(0);
  });

  it("saves the introduction progress quietly: no revision bump, state otherwise untouched", async () => {
    const user = await newUser();
    const game = await loadGame(user.id);
    expect(game.state.onboarding).toBeUndefined();
    await saveOnboarding(user.id, { done: true, step: 4 });
    await saveOnboarding(user.id, { seen: ["mandate"] });
    const after = await loadGame(user.id);
    expect(after.revision).toBe(game.revision);
    expect(after.state.onboarding).toEqual({ done: true, step: 4, seen: ["mandate"] });
    expect(after.state.daysUsed).toBe(game.state.daysUsed);
  });

  it("marks the newest release as seen when a new game finishes the introduction, but not when an older game replays it", async () => {
    const { LATEST_RELEASE_ID } = await import("../lib/changelog");
    const fresh = await newUser();
    await loadGame(fresh.id);
    await saveOnboarding(fresh.id, { seen: ["mandate"] });
    expect((await loadGame(fresh.id)).state.whatsNew).toBeUndefined();
    await saveOnboarding(fresh.id, { done: true, step: 7 });
    expect((await loadGame(fresh.id)).state.whatsNew).toEqual({ seen: LATEST_RELEASE_ID });

    const old = await newUser();
    const game = await loadGame(old.id);
    await performAction(old.id, { type: "closeMonth" }, game.revision);
    await saveOnboarding(old.id, { done: true, step: 7 });
    expect((await loadGame(old.id)).state.whatsNew).toBeUndefined();
  });

  it("saves the seen release with one quiet write: no revision bump, never backwards", async () => {
    const { LATEST_RELEASE_ID } = await import("../lib/changelog");
    const user = await newUser();
    const game = await loadGame(user.id);
    expect(game.state.whatsNew).toBeUndefined();
    await saveNewsSeen(user.id, LATEST_RELEASE_ID);
    const after = await loadGame(user.id);
    expect(after.revision).toBe(game.revision);
    expect(after.state.whatsNew).toEqual({ seen: LATEST_RELEASE_ID });
    expect(after.state.daysUsed).toBe(game.state.daysUsed);
    await saveNewsSeen(user.id, "2000-01-01");
    expect((await loadGame(user.id)).state.whatsNew).toEqual({ seen: LATEST_RELEASE_ID });
  });

  it("applies actions, bumps the revision and persists the state", async () => {
    const user = await newUser();
    const game = await loadGame(user.id);
    const { game: after } = await performAction(user.id, { type: "dd", startupId: "pendelwerk" }, game.revision);
    expect(after.revision).toBe(1);
    expect(after.state.daysUsed).toBe(3);
    const reloaded = await loadGame(user.id);
    expect(reloaded.state.daysUsed).toBe(3);
    expect(reloaded.revision).toBe(1);
  });

  it("rejects an action from a stale view instead of applying it twice", async () => {
    const user = await newUser();
    const game = await loadGame(user.id);
    await performAction(user.id, { type: "dd", startupId: "pendelwerk" }, game.revision);
    await expect(performAction(user.id, { type: "dd", startupId: "kantinenkasse" }, game.revision)).rejects.toBeInstanceOf(GameRuleError);
    expect((await loadGame(user.id)).state.daysUsed).toBe(3);
  });

  it("surfaces rule violations as GameRuleError and leaves the state untouched", async () => {
    const user = await newUser();
    const game = await loadGame(user.id);
    await expect(performAction(user.id, { type: "invest", startupId: "unbekannt" }, game.revision)).rejects.toThrow("Diese Firma gibt es nicht.");
    expect((await loadGame(user.id)).revision).toBe(0);
  });

  it("plays a month: invest, close, board item on the agenda, meeting", async () => {
    const user = await newUser();
    let game = await loadGame(user.id);
    game = (await performAction(user.id, { type: "invest", startupId: "pendelwerk" }, game.revision)).game;
    const closed = await performAction(user.id, { type: "closeMonth" }, game.revision);
    expect(closed.result.kind).toBe("report");
    game = closed.game;
    expect(game.state.month).toBe(2);
    const item = game.state.items.find((i) => i.status === "open")!;
    expect(item).toBeDefined();
    const met = await performAction(user.id, { type: "meeting", itemId: item.id, argument: null, vote: "conditions" }, game.revision);
    expect(met.result.kind).toBe("meeting");
    expect(met.game.state.items.find((i) => i.id === item.id)!.status).toBe("decided");
  });

  it("reset deletes the game; the next visit starts over", async () => {
    const user = await newUser();
    const game = await loadGame(user.id);
    await performAction(user.id, { type: "dd", startupId: "pendelwerk" }, game.revision);
    await resetGame(user.id);
    const fresh = await loadGame(user.id);
    expect(fresh.id).not.toBe(game.id);
    expect(fresh.state.daysUsed).toBe(0);
  });
});

// Last on purpose: the once-mocks replace game.findUnique/create on the shared client.
describe("first visit race", () => {
  it("recovers when a concurrent first visit created the game in between", async () => {
    const db = getDb();
    const user = await newUser();
    const winner = await loadGame(user.id);
    // Mocked rather than provoked: PGlite's socket server can't recover from real constraint errors.
    vi.spyOn(db.game, "findUnique").mockResolvedValueOnce(null);
    vi.spyOn(db.game, "create").mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }));
    const loser = await loadGame(user.id);
    expect(loser.id).toBe(winner.id);
  });
});
