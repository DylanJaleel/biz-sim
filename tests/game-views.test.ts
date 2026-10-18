import { describe, expect, it } from "vitest";
import { linkPath } from "../components/boardroom/RoundTable";
import { deriveRoom, liveBallots } from "../components/boardroom/derive";
import { applyAction, newGame, openItems, previewMeeting } from "../lib/game/engine";
import type { GameAction, GameState } from "../lib/game/types";
import { parseAction } from "../lib/game/validate";
import { companyView, deskView, meetingView } from "../lib/game/views";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

function withItem(): GameState {
  let state = newGame(7);
  state = act(state, { type: "dd", startupId: "pendelwerk" });
  state = act(state, { type: "invest", startupId: "pendelwerk" });
  return act(state, { type: "closeMonth" });
}

describe("parseAction", () => {
  it("accepts well-formed moves and rejects everything else", () => {
    expect(parseAction({ type: "dd", startupId: "pendelwerk" })).toEqual({ type: "dd", startupId: "pendelwerk" });
    expect(parseAction({ type: "meeting", itemId: "v3", argument: null, vote: "no" })).toEqual({ type: "meeting", itemId: "v3", argument: null, vote: "no" });
    expect(parseAction({ type: "closeMonth", extra: 1 })).toEqual({ type: "closeMonth" });
    expect(parseAction({ type: "meeting", itemId: "v3", argument: null, vote: "maybe" })).toBeNull();
    expect(parseAction({ type: "pretalk", itemId: "v3", seat: "you" })).toBeNull();
    expect(parseAction({ type: "dd", startupId: "x".repeat(65) })).toBeNull();
    expect(parseAction({ type: "dd", startupId: "../etc" })).toBeNull();
    expect(parseAction({ type: "nuke" })).toBeNull();
    expect(parseAction(null)).toBeNull();
  });
});

describe("views", () => {
  it("the desk points to the deals first and to the board item once there is one", () => {
    const fresh = deskView(newGame(1), 17);
    expect(fresh.offers).toBe(2);
    expect(fresh.tasks[0]!.href).toBe("/post?firma=pendelwerk");
    const later = deskView(withItem(), 17);
    expect(later.openItems).toHaveLength(1);
    expect(later.tasks[0]!.href).toBe("/firma/pendelwerk");
  });

  it("the meeting script matches what the engine plays after each argument", () => {
    const state = withItem();
    const item = openItems(state)[0]!;
    const view = meetingView(state, item.id);
    expect(view.opening).toEqual(previewMeeting(state, item.id).events);
    for (const a of view.args) {
      const full = previewMeeting(state, item.id, a.id, "go");
      expect([...view.opening, ...view.debates[a.id]!]).toEqual(full.events.slice(0, full.pauseForVote!));
    }
    expect(view.debates.none).toBeDefined();
  });

  it("a talk beforehand reveals where a member leans", () => {
    let state = withItem();
    const item = openItems(state)[0]!;
    expect(companyView(state, "pendelwerk").board.every((m) => m.leaning === undefined)).toBe(true);
    state = act(state, { type: "pretalk", itemId: item.id, seat: "vc" });
    const vc = companyView(state, "pendelwerk").board.find((m) => m.seat === "vc")!;
    expect(vc.pretalked).toBe(true);
    expect(["go", "conditions", "no", "open"]).toContain(vc.leaning);
  });

  it("the decision keeps every ballot for the hemicycle", () => {
    const state = withItem();
    const item = openItems(state)[0]!;
    const after = act(state, { type: "meeting", itemId: item.id, argument: null, vote: "conditions" });
    const ballots = after.items.find((i) => i.id === item.id)!.decision!.ballots!;
    expect(ballots).toHaveLength(6);
    expect(ballots.reduce((sum, b) => sum + b.shares.go + b.shares.conditions + b.shares.no + b.shares.abstain, 0)).toBe(120);
  });
});

describe("round table", () => {
  it("the live hemicycle fills from open to leaning to cast", () => {
    const state = withItem();
    const item = openItems(state)[0]!;
    const playback = previewMeeting(state, item.id, null, "go");
    const seats = ["cto", "vc", "ceo", "indep", "angel", "you"] as const;
    const start = liveBallots([...seats], deriveRoom(playback.events, 0));
    expect(start.every((b) => b.state === "open")).toBe(true);
    const end = liveBallots([...seats], deriveRoom(playback.events, playback.events.length));
    expect(end.every((b) => b.state === "cast")).toBe(true);
  });

  it("lines run along the rim and reach the player at the open side", () => {
    const toYou = linkPath("angel", "you");
    expect(toYou.startsWith("M")).toBe(true);
    const ys = [...toYou.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys)).toBeGreaterThan(110);
    expect(linkPath("cto", "angel")).not.toEqual(linkPath("cto", "angel", 1));
  });
});
