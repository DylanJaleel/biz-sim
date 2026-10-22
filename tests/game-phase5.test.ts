import { describe, expect, it } from "vitest";
import { applyAction, closeMonth, netWorth, newGame, upgradeState } from "../lib/game/engine";
import { TROPHIES } from "../lib/game/trophies";
import { boldChance, cityOf, garageValue, RESALE, resolveTrip, travelOptions, vehicleOf } from "../lib/game/travel";
import type { GameAction, GameState, Gig } from "../lib/game/types";
import { parseAction } from "../lib/game/validate";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

function gig(kind: string, extra: Partial<Gig> = {}): Gig {
  return { id: "g900", month: 1, kind, client: "Feinguss Weber", title: "Interim-CFO", text: "", days: 6, fee: 20_000, status: "offered", ...extra };
}

function withGig(state: GameState, g: Gig): GameState {
  return { ...state, gigs: [...state.gigs, g] };
}

describe("display cabinet", () => {
  it("awards a tombstone once and keeps it", () => {
    let state = act(newGame(3), { type: "invest", startupId: "pendelwerk" });
    expect(state.trophies.map((t) => t.id)).toContain("first-deal");
    expect(state.trophies.find((t) => t.id === "first-deal")!.seen).toBe(false);
    state = { ...state, cash: 1_200_000 };
    state = act(state, { type: "learn" });
    expect(state.trophies.map((t) => t.id)).toContain("worth-1m");
    // Money gone again: the piece stays on the shelf.
    state = act({ ...state, cash: 10_000 }, { type: "closeMonth" });
    expect(state.trophies.filter((t) => t.id === "worth-1m")).toHaveLength(1);
    state = act(state, { type: "seenTrophies" });
    expect(state.trophies.every((t) => t.seen)).toBe(true);
  });

  it("every trophy has a picture and a requirement", () => {
    const ids = new Set(TROPHIES.map((t) => t.id));
    expect(ids.size).toBe(TROPHIES.length);
    for (const t of TROPHIES) {
      expect(t.image).toMatch(/^tombstone-/);
      expect(t.requirement.length).toBeGreaterThan(5);
    }
  });

  it("old saves get the cabinet without a flood of announcements", () => {
    const v5 = { ...act(newGame(2), { type: "invest", startupId: "pendelwerk" }), version: 5 } as unknown as Record<string, unknown>;
    delete v5.trophies;
    delete v5.garage;
    const up = upgradeState(v5 as unknown as GameState);
    expect(up.version).toBe(6);
    expect(up.garage).toEqual([]);
    expect(up.trophies.map((t) => t.id)).toContain("first-deal");
    expect(up.trophies.every((t) => t.seen)).toBe(true);
  });
});

describe("garage", () => {
  it("buys, pays upkeep, counts at resale value and sells", () => {
    let state: GameState = { ...newGame(4), cash: 200_000, reputation: 50 };
    expect(() => act(state, { type: "buyVehicle", vehicleId: "super" })).toThrow(/Ruf/);
    const before = netWorth(state);
    state = act(state, { type: "buyVehicle", vehicleId: "elektro" });
    const v = vehicleOf("elektro")!;
    expect(state.garage).toEqual(["elektro"]);
    expect(state.cash).toBe(200_000 - v.price);
    expect(garageValue(state)).toBe(Math.round(v.price * RESALE));
    expect(netWorth(state)).toBeLessThan(before);
    expect(() => act(state, { type: "buyVehicle", vehicleId: "elektro" })).toThrow();
    const report = closeMonth(structuredClone(state));
    expect(report.income?.vehicles).toBe(-v.upkeep);
    state = act(state, { type: "sellVehicle", vehicleId: "elektro" });
    expect(state.garage).toEqual([]);
  });

  it("driver and jet need the next career steps", () => {
    const state: GameState = { ...newGame(4), cash: 9_000_000, reputation: 90 };
    expect(() => act(state, { type: "buyVehicle", vehicleId: "fahrer" })).toThrow(/Family Office/);
    expect(() => act(state, { type: "buyVehicle", vehicleId: "jet" })).toThrow(/Fonds/);
    expect(act(state, { type: "buyVehicle", vehicleId: "jetkarte" }).garage).toEqual(["jetkarte"]);
  });
});

describe("trips to a job", () => {
  it("offers train always, flights only far away, own cars once bought", () => {
    const state = newGame(5);
    const near = travelOptions(state, gig("bank"));
    expect(cityOf(gig("bank")).distance).toBe("local");
    expect(near.map((o) => o.id)).toEqual(["bahn2", "bahn1"]);
    const far = travelOptions({ ...state, garage: ["kompakt"] }, gig("interim"));
    expect(far.map((o) => o.id)).toEqual(["bahn2", "bahn1", "kompakt", "eco", "business", "first", "jetkarte"]);
    expect(far.find((o) => o.id === "jetkarte")!.locked).toBeTruthy();
    expect(far.find((o) => o.id === "eco")!.days).toBe(0);
    expect(far.find((o) => o.id === "kompakt")!.days).toBe(1);
    for (const o of far) expect(o.scenes.at(-1)!.scene).toBe("kunde");
  });

  it("the way you arrive changes the odds of the bold approach", () => {
    const train = travelOptions(newGame(5), gig("interim")).find((o) => o.id === "bahn1")!;
    const eco = travelOptions(newGame(5), gig("interim")).find((o) => o.id === "eco")!;
    expect(boldChance(train)).toBeGreaterThan(boldChance(eco));
    const g = gig("interim");
    expect(resolveTrip(g, train, "bold", 0).fee).toBeGreaterThan(g.fee);
    expect(resolveTrip(g, train, "bold", 0.99).reputation).toBe(-1);
    expect(resolveTrip(g, train, "safe", 0.5).days).toBe(g.days + train.days - 1);
    expect(resolveTrip(g, train, "thorough", 0.5).days).toBe(g.days + train.days + 1);
  });

  it("booking pays the trip, books the days and pays the outcome at month end", () => {
    let state = withGig(newGame(6), gig("interim", { month: 1 }));
    const cash = state.cash;
    state = act(state, { type: "gig", gigId: "g900", travel: "bahn1", approach: "thorough" });
    const g = state.gigs.find((x) => x.id === "g900")!;
    expect(g.status).toBe("booked");
    expect(g.trip?.travel).toBe("bahn1");
    expect(g.trip?.offeredFee).toBe(20_000);
    expect(g.fee).toBe(24_000);
    expect(state.cash).toBe(cash - g.trip!.travelCost);
    expect(state.daysUsed).toBe(g.days);
    const report = closeMonth(structuredClone(state));
    expect(report.income?.consulting).toBeGreaterThanOrEqual(24_000);
    expect(() => act(state, { type: "gig", gigId: "g900" })).toThrow();
    expect(() => act(withGig(newGame(6), gig("interim")), { type: "gig", gigId: "g900", travel: "jetkarte" })).toThrow(/Jet-Karte/);
  });

  it("validates the new actions", () => {
    expect(parseAction({ type: "gig", gigId: "g1", travel: "bahn1", approach: "bold" })).toEqual({ type: "gig", gigId: "g1", travel: "bahn1", approach: "bold" });
    expect(parseAction({ type: "gig", gigId: "g1", approach: "wild" })).toBeNull();
    expect(parseAction({ type: "buyVehicle", vehicleId: "coupe" })).toEqual({ type: "buyVehicle", vehicleId: "coupe" });
    expect(parseAction({ type: "seenTrophies" })).toEqual({ type: "seenTrophies" });
  });
});

describe("audit fixes", () => {
  it("the next step skips side goals and leads to the Family Office", async () => {
    const { nextStepView } = await import("../lib/game/views");
    const state: GameState = { ...act(newGame(3), { type: "invest", startupId: "pendelwerk" }), ledRounds: 1, reputation: 72, cash: 900_000, office: 3 };
    const step = nextStepView(state)!;
    expect(step.title).toBe("Family Office");
    expect(step.action?.move).toEqual({ type: "foundFamilyOffice" });
    const low = nextStepView({ ...state, office: 1 })!;
    expect(low.action).toBeUndefined();
    expect(low.side?.move).toEqual({ type: "moveOffice", level: 3 });
  });

  it("loans count against net worth, locked shares for it", () => {
    const base = newGame(4);
    const withLoan: GameState = { ...base, loans: [{ id: "k1", startupId: "x", label: "Kredit", balance: 100_000, payment: 1_000, rate: 0.05 }] };
    expect(netWorth(withLoan)).toBe(netWorth(base) - 100_000);
    const withLock: GameState = { ...base, lockups: [{ id: "l1", name: "X", amount: 50_000, index: base.market.prices.tech, due: 9 }] };
    expect(netWorth(withLock)).toBeCloseTo(netWorth(base) + 50_000, 0);
  });

  it("writes once when the Family Office is within reach", () => {
    let state: GameState = { ...act(newGame(5), { type: "invest", startupId: "pendelwerk" }), reputation: 75, cash: 900_000, office: 3 };
    state = act(state, { type: "closeMonth" });
    state = act(state, { type: "closeMonth" });
    expect(state.mails.filter((m) => m.subject === "Du kannst jetzt ein Family Office gründen")).toHaveLength(1);
  });

  it("a declined supervisory seat comes back a year later", () => {
    let state: GameState = { ...newGame(6), corporateSeat: "declined", corporateDeclined: 1, reputation: 80, ledRounds: 1 };
    for (let m = 0; m < 12; m++) state = act(state, { type: "closeMonth" });
    expect(state.corporateSeat).toBe("offered");
  });
});
