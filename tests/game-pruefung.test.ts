import { describe, expect, it } from "vitest";
import { careerOf } from "../lib/game/career";
import { CORPORATE_REPUTATION } from "../lib/game/config";
import { CORPORATE_DEFS, CORPORATE_ID } from "../lib/game/corporate";
import { CORP, corporateFee, corporatesRead, poolFor } from "../lib/game/corporates";
import { ebitdaMargin } from "../lib/game/corporate-books";
import { applyAction, closeMonth, newGame, upgradeState } from "../lib/game/engine";
import { PLATFORM_REPUTATION } from "../lib/game/mna-config";
import { emptyRecord } from "../lib/game/mna-core";
import type { GameState } from "../lib/game/types";
import { corporateStartup } from "../lib/game/corporate";

const act = (s: GameState, a: Parameters<typeof applyAction>[1]) => applyAction(s, a).state;

function seated(seed: number): GameState {
  const state: GameState = { ...newGame(seed), reputation: CORPORATE_REPUTATION, ledRounds: 1 };
  closeMonth(state);
  return act(state, { type: "joinCorporate", accept: true });
}

describe("Plattform-Investor", () => {
  it("opens at 70 reputation", () => {
    expect(PLATFORM_REPUTATION).toBe(70);
  });

  it("counts a platform sold with a profit or one worth twice the equity", () => {
    const base = newGame(3);
    const step = (s: GameState) => careerOf(s).steps.find((x) => x.title === "Plattform-Investor")!;
    expect(step(base).done).toBe(false);
    const sold: GameState = {
      ...base,
      mna: {
        mandates: [],
        searches: [],
        addons: [],
        record: { ...emptyRecord(), platformExits: [{ name: "X", month: 9, ev: 1, ebitda: 1, multiple: 1, entryMultiple: 1, moic: 1.3, addons: 1 }] },
      },
    };
    expect(step(sold).done).toBe(true);
    const forced: GameState = { ...sold, mna: { ...sold.mna!, record: { ...sold.mna!.record, platformExits: [{ ...sold.mna!.record.platformExits[0]!, forced: true }] } } };
    expect(step(forced).done).toBe(false);
    const doubled: GameState = { ...base, mna: { mandates: [], searches: [], addons: [], record: { ...emptyRecord(), platformDoubled: 30 } } };
    expect(step(doubled).done).toBe(true);
  });
});

describe("Konzerne", () => {
  it("deals five to seven Konzerne per seed, Nordhafen first", () => {
    const sizes = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const pool = poolFor(seed);
      expect(pool[0]).toBe(CORPORATE_ID);
      expect(new Set(pool).size).toBe(pool.length);
      expect(pool.length).toBeGreaterThanOrEqual(5);
      expect(pool.length).toBeLessThanOrEqual(7);
      sizes.add(pool.length);
    }
    expect(sizes.size).toBeGreaterThan(1);
  });

  it("every Konzern starts at its trade's margin", () => {
    for (const d of CORPORATE_DEFS) expect(ebitdaMargin(corporateStartup(1, d.id).metrics)).toBeCloseTo(d.margin, 3);
  });

  it("gives the first seat a term of three to five years", () => {
    const state = seated(4);
    const seat = state.corporates!.seats[0]!;
    expect(seat.id).toBe(CORPORATE_ID);
    expect([36, 48, 60]).toContain(seat.termEnd - seat.termStart);
    expect(state.corporateSeat).toBe("joined");
  });

  it("further Konzerne ask with more reputation, at most three seats", () => {
    let state = seated(5);
    state.reputation = 95;
    for (let m = 0; m < 60; m++) {
      if (state.corporates?.offer) state = act(state, { type: "joinCorporate", accept: true });
      state.reputation = Math.max(state.reputation, 92);
      state = act(state, { type: "closeMonth" });
      for (const seat of state.corporates!.seats) seat.termEnd = Math.max(seat.termEnd, 999);
    }
    const active = state.startups.filter((s) => s.corporate && s.status === "active");
    expect(active.length).toBe(CORP.maxSeats);
    expect(new Set(active.map((s) => s.name)).size).toBe(CORP.maxSeats);
    expect(careerOf(state).steps.find((s) => s.title === "Konzern-Aufsichtsrat")!.done).toBe(true);
  });

  it("resigning ends the seat and stops the fee", () => {
    let state = seated(6);
    state = act(state, { type: "corporateResign", startupId: CORPORATE_ID });
    expect(state.startups.find((s) => s.id === CORPORATE_ID)!.status).toBe("declined");
    expect(state.corporates!.seats[0]!.ended?.reason).toBe("resigned");
    expect(careerOf(state).steps.find((s) => s.title === "Konzern-Aufsichtsrat")!.done).toBe(true);
  });

  it("decides the re-election at the annual general meeting", () => {
    const results = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      let state = seated(seed);
      const seat = state.corporates!.seats[0]!;
      seat.termEnd = state.month + 1;
      state = act(state, { type: "closeMonth" });
      state = act(state, { type: "closeMonth" });
      const after = state.corporates!.seats[0]!;
      results.add(after.ended ? "out" : after.terms === 2 ? "again" : "?");
    }
    expect(results.has("?")).toBe(false);
    expect(results.has("again")).toBe(true);
  });

  it("an operating partner can take the seat and shares the fee", () => {
    let state = seated(7);
    state.familyOffice = 1;
    state.cash = 5_000_000;
    state = act(state, { type: "hire", role: "operating", profile: "voss" });
    const member = state.team[0]!;
    const before = corporateFee(state, state.startups.find((s) => s.id === CORPORATE_ID)!);
    state = act(state, { type: "assign", memberId: member.id, startupId: CORPORATE_ID });
    const after = corporateFee(state, state.startups.find((s) => s.id === CORPORATE_ID)!);
    expect(after.mine).toBe(Math.round(before.total * (1 - CORP.delegateShare)));
    expect(after.partner).toBe(member.name);
  });

  it("older games keep Nordhafen as the first seat, the term starting on load", () => {
    const state = seated(8);
    delete state.corporates;
    const loaded = upgradeState(structuredClone(state));
    const c = corporatesRead(loaded);
    expect(c.seats[0]!.id).toBe(CORPORATE_ID);
    expect(c.seats[0]!.termStart).toBe(loaded.month);
  });
});
