import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDatabase } from "./helpers/test-db";

let database: Awaited<ReturnType<typeof startTestDatabase>>;

beforeAll(async () => {
  database = await startTestDatabase();
}, 30_000);

afterAll(async () => {
  await database.stop();
});

const { getDb } = await import("../lib/db");
const { loadGame, performAction, resetGame } = await import("../lib/repository/game");
const { createSave, deleteSave, exportGame, importGame, listSaves, restoreSave, KEEP } = await import("../lib/repository/saves");

let counter = 0;
async function newUser() {
  return getDb().user.create({ data: { email: `save-${counter++}@example.com` } });
}

describe("saves", () => {
  it("reloading reads the same game without changing it", async () => {
    const user = await newUser();
    const first = await loadGame(user.id);
    await performAction(user.id, { type: "dd", startupId: "pendelwerk" }, first.revision);
    const a = await loadGame(user.id);
    const b = await loadGame(user.id);
    expect(b.revision).toBe(a.revision);
    expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state));
    expect(b.updatedAt.getTime()).toBe(a.updatedAt.getTime());
  });

  it("closing a month leaves an automatic save", async () => {
    const user = await newUser();
    const game = await loadGame(user.id);
    await performAction(user.id, { type: "closeMonth" }, game.revision);
    const saves = await listSaves(user.id);
    expect(saves).toHaveLength(1);
    expect(saves[0]!.kind).toBe("auto");
    expect(saves[0]!.summary.month).toBe(2);
  });

  it("keeps only the newest automatic saves", async () => {
    const user = await newUser();
    for (let i = 0; i < KEEP.auto + 2; i++) {
      const game = await loadGame(user.id);
      await performAction(user.id, { type: "closeMonth" }, game.revision);
    }
    const saves = await listSaves(user.id);
    expect(saves.filter((s) => s.kind === "auto")).toHaveLength(KEEP.auto);
    expect(saves[0]!.summary.month).toBe(KEEP.auto + 3);
  }, 30_000);

  it("restores a named save and backs up the running game first", async () => {
    const user = await newUser();
    const start = await loadGame(user.id);
    await createSave(user.id, "Vor dem Risiko");
    await performAction(user.id, { type: "dd", startupId: "pendelwerk" }, start.revision);
    const named = (await listSaves(user.id)).find((s) => s.kind === "manual")!;
    await restoreSave(user.id, named.id);
    const after = await loadGame(user.id);
    expect(after.state.daysUsed).toBe(0);
    expect(after.revision).toBe(start.revision + 2);
    const backup = (await listSaves(user.id)).find((s) => s.kind === "backup");
    expect(backup?.name).toContain("Vor dem Risiko");
    await deleteSave(user.id, named.id);
    expect((await listSaves(user.id)).some((s) => s.id === named.id)).toBe(false);
  });

  it("nobody loads someone else's save", async () => {
    const owner = await newUser();
    const other = await newUser();
    await loadGame(owner.id);
    await createSave(owner.id, "Meins");
    const save = (await listSaves(owner.id))[0]!;
    await expect(restoreSave(other.id, save.id)).rejects.toThrow(/gibt es nicht/);
  });

  it("exports a signed file and refuses edited ones", async () => {
    const user = await newUser();
    const game = await loadGame(user.id);
    await performAction(user.id, { type: "dd", startupId: "pendelwerk" }, game.revision);
    const file = await exportGame(user.id);
    const target = await newUser();
    await loadGame(target.id);
    await importGame(target.id, JSON.parse(JSON.stringify(file)));
    expect((await loadGame(target.id)).state.daysUsed).toBe(3);
    const edited = { ...file, state: { ...file.state, cash: 99_000_000 } };
    await expect(importGame(target.id, edited)).rejects.toThrow(/verändert/);
    await expect(importGame(target.id, { hello: "world" })).rejects.toThrow(/keine Spielstand-Datei/);
  });

  it("a restart keeps the old game among the saves", async () => {
    const user = await newUser();
    await loadGame(user.id);
    await resetGame(user.id);
    const saves = await listSaves(user.id);
    expect(saves[0]?.name).toBe("Vor dem Neustart");
  });
});
