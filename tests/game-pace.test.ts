import { describe, expect, it } from "vitest";
import { AGENDA_MAX } from "../lib/game/config";
import { TEMPLATES } from "../lib/game/content";
import { THEME_TEMPLATES } from "../lib/game/content/themes";
import { applyAction, newGame, openItems, planAgenda, startupOf, updatePace, upgradeState } from "../lib/game/engine";
import { NEWS } from "../lib/game/news";
import type { GameAction, GameState, PaceKind, Startup } from "../lib/game/types";
import { companyView } from "../lib/game/views";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

/** A game with Pendelwerk as mandate, a few months in. */
function playing(seed = 3, months = 2): GameState {
  let state = act(newGame(seed), { type: "invest", startupId: "pendelwerk" });
  for (let m = 0; m < months; m++) state = act(state, { type: "closeMonth" });
  return state;
}

/** Sets Pendelwerk's phase, clears its agenda and plans the next one. */
function planWith(state: GameState, kind: PaceKind, healthy = true): number {
  const next = structuredClone(state);
  next.items = next.items.filter((i) => i.startupId !== "pendelwerk" || i.status !== "open");
  next.rounds = next.rounds.filter((r) => r.status !== "open");
  next.exits = next.exits.filter((e) => e.status !== "open");
  next.news = [];
  next.startups = next.startups.map((s) =>
    s.id === "pendelwerk"
      ? { ...s, crisisMonths: 0, pace: { kind, until: next.month + 2 }, metrics: healthy ? { ...s.metrics, cash: s.metrics.opex * 30, morale: 70, trust: 70 } : s.metrics }
      : s,
  );
  planAgenda(next);
  return openItems(next).filter((i) => i.startupId === "pendelwerk").length;
}

describe("rhythm of a company", () => {
  it("busy phases bring two or three items, calm ones mostly none", () => {
    const busy: number[] = [];
    const calm: number[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      const state = playing(seed, 4);
      if (startupOf(state, "pendelwerk").status !== "active") continue;
      busy.push(planWith(state, "busy"));
      calm.push(planWith(state, "calm"));
    }
    expect(busy.length).toBeGreaterThan(6);
    expect(busy.every((n) => n >= 2 && n <= AGENDA_MAX)).toBe(true);
    expect(busy.some((n) => n === 3)).toBe(true);
    expect(calm.filter((n) => n === 0).length).toBeGreaterThan(calm.length / 2);
  });

  it("a crisis or an open round makes a company busy at once", () => {
    const state = playing(5, 3);
    const s = startupOf(state, "pendelwerk");
    const calm: Startup = { ...s, pace: { kind: "calm", until: state.month + 3 }, crisisMonths: 1 };
    const pace = updatePace(state, calm);
    expect(pace.kind).toBe("busy");
    expect(pace.reason).toMatch(/Kasse/);
  });

  it("phases change over time and every kind shows up", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 6; seed++) {
      let state = playing(seed, 0);
      for (let m = 0; m < 24; m++) {
        state = act(state, { type: "closeMonth" });
        const s = state.startups.find((x) => x.id === "pendelwerk")!;
        if (s.status !== "active") break;
        if (s.pace) seen.add(s.pace.kind);
      }
    }
    expect([...seen].sort()).toEqual(["busy", "calm", "normal"]);
  });

  it("older games without a rhythm keep working", () => {
    const state = playing(2, 3);
    const old = structuredClone(state);
    for (const s of old.startups) delete s.pace;
    const up = upgradeState(old);
    expect(up.startups.every((s) => s.pace === undefined)).toBe(true);
    const next = act(up, { type: "closeMonth" });
    const s = next.startups.find((x) => x.id === "pendelwerk")!;
    if (s.status === "active") expect(s.pace).toBeDefined();
    expect(companyView(next, "pendelwerk").startup.id).toBe("pendelwerk");
  });
});

describe("more themes", () => {
  it("adds new templates with unique ids and complete outcomes", () => {
    expect(THEME_TEMPLATES.length).toBeGreaterThanOrEqual(15);
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const state = playing(4, 6);
    const s = startupOf(state, "pendelwerk");
    for (const t of THEME_TEMPLATES) {
      expect(t.arguments.map((a) => a.toward).sort()).toEqual(["conditions", "go", "no"]);
      for (const vote of ["go", "conditions", "no"] as const) {
        const out = t.outcomes[vote].resolve(s);
        expect(Array.isArray(out.effects)).toBe(true);
      }
    }
    expect(THEME_TEMPLATES.some((t) => t.corporate)).toBe(true);
    expect(THEME_TEMPLATES.some((t) => t.id.startsWith("m_"))).toBe(true);
  });

  it("has fresh news, good and bad", () => {
    const ids = NEWS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(NEWS.length).toBeGreaterThanOrEqual(36);
  });
});
