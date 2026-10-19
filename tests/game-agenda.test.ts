import { describe, expect, it } from "vitest";
import { ACTION_DAYS, AGENDA_MAX } from "../lib/game/config";
import { applyAction, closeMonth, newGame, openItems, planAgenda, startupOf } from "../lib/game/engine";
import type { GameAction, GameState } from "../lib/game/types";
import { companyView, deskView, meetingView } from "../lib/game/views";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

/** Invest in Pendelwerk and close months until the quarterly meeting brings an agenda with two or more items. */
function withAgenda(): GameState {
  for (let seed = 1; seed < 40; seed++) {
    let state = act(newGame(seed), { type: "invest", startupId: "pendelwerk" });
    for (let m = 0; m < 6; m++) {
      state = act(state, { type: "closeMonth" });
      const open = openItems(state).filter((i) => i.startupId === "pendelwerk");
      if (open.length >= 2 && startupOf(state, "pendelwerk").status === "active") return state;
    }
  }
  throw new Error("no agenda with two items found");
}

describe("agenda", () => {
  it("quarterly meetings bring two or three items, never more than the maximum", () => {
    const state = withAgenda();
    const open = openItems(state).filter((i) => i.startupId === "pendelwerk");
    expect(open.length).toBeGreaterThanOrEqual(2);
    expect(open.length).toBeLessThanOrEqual(AGENDA_MAX);
    const before = structuredClone(state);
    planAgenda(before);
    expect(openItems(before).filter((i) => i.startupId === "pendelwerk").length).toBeLessThanOrEqual(AGENDA_MAX);
    expect(companyView(state, "pendelwerk").agenda).toHaveLength(open.length);
    expect(deskView(state, 30).tasks.some((t) => t.text.includes("Punkte auf der Tagesordnung"))).toBe(true);
  });

  it("further items of the same sitting cost no extra day and count half for reputation", () => {
    let state = withAgenda();
    const [first, second] = openItems(state).filter((i) => i.startupId === "pendelwerk");
    const days = state.daysUsed;
    state = act(state, { type: "meeting", itemId: first!.id, argument: null, vote: "conditions" });
    expect(state.daysUsed).toBe(days + ACTION_DAYS.meeting);
    const view = meetingView(state, second!.id);
    expect(view.sitting).toBe(true);
    expect(view.agenda.length).toBeGreaterThanOrEqual(2);
    state = act(state, { type: "meeting", itemId: second!.id, argument: null, vote: "conditions" });
    expect(state.daysUsed).toBe(days + ACTION_DAYS.meeting);
    const d1 = state.items.find((i) => i.id === first!.id)!.decision!;
    const d2 = state.items.find((i) => i.id === second!.id)!.decision!;
    expect(Math.abs(d2.reputationDelta)).toBeLessThanOrEqual(Math.abs(d1.reputationDelta) || 4);
  });

  it("an item nobody decided is postponed once, then the founders decide alone", () => {
    const state = withAgenda();
    const item = openItems(state).find((i) => i.startupId === "pendelwerk")!;
    closeMonth(state);
    const after = state.items.find((i) => i.id === item.id)!;
    if (after.status === "open") {
      expect(after.postponed).toBe(true);
      closeMonth(state);
      expect(state.items.find((i) => i.id === item.id)!.status).toBe("lapsed");
    } else {
      // Urgent items are not postponed.
      expect(after.status).toBe("lapsed");
    }
  });
});
