import { describe, expect, it } from "vitest";
import { newGame } from "../lib/game/engine";
import { packState, unpackState } from "../lib/repository/codec";

describe("stored game state", () => {
  it("packs a game into a much smaller value and reads it back unchanged", () => {
    const state = newGame(11);
    const packed = packState(state);
    expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(state).length / 2);
    expect(unpackState(packed as never)).toEqual(state);
  });

  it("still reads older, uncompressed games", () => {
    const state = newGame(12);
    expect(unpackState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
});
