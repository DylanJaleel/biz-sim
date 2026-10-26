import { describe, expect, it } from "vitest";
import { careerOf } from "../lib/game/career";
import { annualEbitda, ebitdaEquityValue, enterpriseValue, sizeMultiple } from "../lib/game/ebitda";
import { applyAction, closeMonth, ctxOf, GameRuleError, newGame } from "../lib/game/engine";
import { lboAllowsDividends, netLeverage, previewStructure, targetDeal } from "../lib/game/lbo";
import { mnaOf } from "../lib/game/mna-core";
import { acquisitionView, mandateView, platformView, successionView } from "../lib/game/mna-views";
import { parseAction } from "../lib/game/validate";
import { valuation } from "../lib/game/sim";
import type { GameAction, GameState, Mandate } from "../lib/game/types";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;
const close = (state: GameState) => act(state, { type: "closeMonth" });

function rich(state: GameState, extra: Partial<GameState> = {}): GameState {
  return { ...state, reputation: 80, cash: 5_000_000, month: 12, ...extra };
}

function sellMandate(over: Partial<Mandate> = {}): Mandate {
  return {
    id: "n900",
    month: 12,
    side: "sell",
    client: "Familie Test",
    company: "Testwerk",
    sector: "Logistik",
    city: "Kassel",
    text: "Test",
    ebitda: 600_000,
    fair: 5,
    wish: 3_000_000,
    retainer: 5_000,
    status: "offered",
    expires: 13,
    findings: [],
    ...over,
  };
}

/** A game with one EBITDA target on offer. */
function withTarget(seed = 7) {
  const state = rich(newGame(seed));
  const ctx = ctxOf(state);
  const s = targetDeal(ctx, () => 0.5, { ev: 3_000_000, source: "market" });
  return { state, id: s.id };
}

describe("EBITDA valuation", () => {
  it("pays more per euro of EBITDA for bigger companies, and debt comes off", () => {
    expect(sizeMultiple(2_000_000)).toBeGreaterThan(sizeMultiple(200_000));
    const { state, id } = withTarget();
    const s = state.startups.find((x) => x.id === id)!;
    expect(s.metrics.valuedOn).toBe("ebitda");
    const m = { ...s.metrics, cash: 0 };
    expect(ebitdaEquityValue({ ...m, acqDebt: 1_000_000 })).toBeCloseTo(Math.max(m.revenue * 12 * 0.02, enterpriseValue(m) - 1_000_000), 0);
    expect(valuation(m)).toBeCloseTo(enterpriseValue(m), 0);
  });
});

describe("M&A mandates", () => {
  it("runs from request to closing and pays retainer and success fee", () => {
    let state = rich(newGame(3));
    mnaOf(state).mandates.push(sellMandate());
    state = act(state, { type: "mandate", mandateId: "n900", move: "accept" });
    state = act(state, { type: "mandate", mandateId: "n900", move: "comps" });
    expect(mandateView(state, "n900")!.comps).toBeDefined();
    state = act(state, { type: "mandate", mandateId: "n900", move: "launch", multiple: 4.5, buyers: "mixed", process: "auction", dd: ["financial", "legal", "tax", "commercial"] });
    const cash = state.cash;
    state = close(state);
    expect(state.cash).toBeGreaterThan(cash - 50_000);
    const m = mnaOf(state).mandates[0]!;
    expect(m.status).toBe("bids");
    state = act(state, { type: "mandate", mandateId: "n900", move: "accept_bid" });
    state = close(state);
    const done = mnaOf(state).mandates[0]!;
    expect(done.status).toBe("closed");
    expect(done.outcome!.fee).toBeGreaterThan(0);
    expect(mnaOf(state).record.mandatesDone).toBe(1);
    expect(mnaOf(state).record.auctionWins ?? 0).toBe(done.outcome!.ev >= done.wish ? 1 : 0);
    expect(careerOf(state).steps.find((x) => x.title === "M&A-Berater")!.done).toBe(true);
  });

  it("an asking price far above the market finds no buyer", () => {
    let state = rich(newGame(3));
    mnaOf(state).mandates.push(sellMandate());
    state = act(state, { type: "mandate", mandateId: "n900", move: "accept" });
    state = act(state, { type: "mandate", mandateId: "n900", move: "launch", multiple: 12, buyers: "financial", process: "auction" });
    const rep = state.reputation;
    state = close(state);
    expect(mnaOf(state).mandates[0]!.status).toBe("failed");
    expect(state.reputation).toBeLessThan(rep + 1);
  });

  it("needs reputation", () => {
    const state = { ...rich(newGame(3)), reputation: 20 };
    mnaOf(state).mandates.push(sellMandate());
    expect(() => act(state, { type: "mandate", mandateId: "n900", move: "accept" })).toThrow(GameRuleError);
  });
});

describe("succession programme", () => {
  it("is locked until a mandate was closed, then costs search capital every month", () => {
    let state = rich(newGame(5));
    expect(successionView(state).blocker).toMatch(/Mandat/);
    mnaOf(state).record.mandatesDone = 1;
    expect(successionView(state).blocker).toBeNull();
    state = act(state, { type: "search", move: "start", candidate: 0 });
    const cost = mnaOf(state).searches[0]!.searcher.cost;
    const cash = state.cash;
    state = closeMonthOnly(state);
    expect(mnaOf(state).searches[0]!.spent).toBe(cost);
    expect(state.cash).toBeLessThan(cash);
    expect(state.reports[0]!.income!.search).toBe(-cost);
  });

  it("ends without a purchase after 24 months", () => {
    let state = rich(newGame(5));
    mnaOf(state).record.mandatesDone = 1;
    state = act(state, { type: "search", move: "start", candidate: 1 });
    for (let i = 0; i < 25; i++) {
      for (const s of state.startups.filter((x) => x.status === "offered")) s.status = "declined";
      state = closeMonthOnly(state);
    }
    const search = mnaOf(state).searches[0]!;
    expect(["failed"]).toContain(search.status);
    expect(mnaOf(state).record.searchesFailed).toBe(1);
  });
});

/** Closes a month and keeps the player solvent and busy-free. */
function closeMonthOnly(state: GameState): GameState {
  const next = structuredClone(state);
  closeMonth(next);
  next.cash = Math.max(next.cash, 1_000_000);
  return next;
}

describe("buying a family business", () => {
  it("due diligence finds problems and lowers the price", () => {
    const { state, id } = withTarget(11);
    const s = state.startups.find((x) => x.id === id)!;
    s.findings = [{ kind: "taxAudit", module: "tax", title: "Offene Betriebsprüfung", text: "", priceCut: 0.05, cash: -100_000 }];
    const before = acquisitionView(state, id)!.priceNow;
    const next = act(state, { type: "examine", targetId: id, modules: ["tax"] });
    const after = acquisitionView(next, id)!;
    expect(after.found).toHaveLength(1);
    expect(after.priceNow).toBeLessThan(before);
    expect(next.cash).toBeLessThan(state.cash);
  });

  it("puts the bank loan into the company, limited by EBITDA and minimum equity", () => {
    const { state, id } = withTarget(12);
    const next = act(state, { type: "acquire", targetId: id, bid: "ask", bank: 0.6, vendor: 0.2, earnout: 0.15 });
    const s = next.startups.find((x) => x.id === id)!;
    expect(s.status).toBe("active");
    expect(s.lbo).toBeDefined();
    const e = annualEbitda(s.metrics);
    expect(s.lbo!.bank).toBeLessThanOrEqual(3 * e + 1);
    const price = s.lbo!.entryEv;
    expect(s.lbo!.bank + 0.2 * price + 0.15 * price).toBeLessThanOrEqual(0.7 * price + 2000);
    expect(s.metrics.acqDebt).toBeGreaterThan(0);
    expect(mnaOf(next).record.acquisitions).toBe(1);
    // The equity is worth less than the company: debt comes first.
    expect(valuation(s.metrics)).toBeLessThan(enterpriseValue(s.metrics));
  });

  it("previews the same money the purchase takes", () => {
    const { state, id } = withTarget(13);
    const view = acquisitionView(state, id)!;
    const terms = { bid: "ask" as const, bank: 0.4, vendor: 0.1, earnout: 0 };
    const preview = previewStructure(view.preview, terms);
    const next = act(state, { type: "acquire", targetId: id, ...terms });
    expect(state.cash - next.cash).toBe(preview.fromPlayer);
  });

  it("a covenant breach blocks dividends, and an uncured breach ends in a forced sale", () => {
    const { state: start, id } = withTarget(14);
    let state = act(start, { type: "acquire", targetId: id, bid: "ask", bank: 0.6, vendor: 0, earnout: 0 });
    // A collapse in earnings: the bank's ratio blows through the covenant.
    const s = state.startups.find((x) => x.id === id)!;
    s.metrics.opex = s.metrics.revenue * s.metrics.grossMargin * 0.97;
    s.lbo = { ...s.lbo!, refRevenue: undefined, margin: undefined };
    expect(netLeverage(s)).toBeGreaterThan(3.5);
    state.month = 15; // the bank tests at the end of a quarter
    state = closeMonthOnly(state);
    let x = state.startups.find((y) => y.id === id)!;
    expect(x.lbo!.status).toBe("watch");
    expect(lboAllowsDividends(x)).toBe(false);
    for (let i = 0; i < 6 && x.status === "active"; i++) {
      state = closeMonthOnly(state);
      x = state.startups.find((y) => y.id === id)!;
    }
    expect(x.status).toBe("sold");
    expect(mnaOf(state).record.forcedSales).toBe(1);
    expect(mnaOf(state).record.covenantRecovered ?? 0).toBe(0);
  });

  it("a breach that is repaired in time counts as survived", () => {
    const { state: start, id } = withTarget(14);
    let state = act(start, { type: "acquire", targetId: id, bid: "ask", bank: 0.6, vendor: 0, earnout: 0 });
    const s = state.startups.find((x) => x.id === id)!;
    const goodOpex = s.metrics.opex;
    s.metrics.opex = s.metrics.revenue * s.metrics.grossMargin * 0.97;
    s.lbo = { ...s.lbo!, refRevenue: undefined, margin: undefined };
    state.month = 15;
    state = closeMonthOnly(state);
    expect(state.startups.find((y) => y.id === id)!.lbo!.status).toBe("watch");
    expect(mnaOf(state).record.covenantBreaches).toBe(1);
    // Costs back to normal and enough cash: the next quarterly test is passed.
    const x = state.startups.find((y) => y.id === id)!;
    x.metrics.opex = goodOpex;
    x.metrics.cash += x.lbo!.bank;
    x.lbo = { ...x.lbo!, refRevenue: undefined, margin: undefined };
    state.month = 17;
    state = closeMonthOnly(state);
    state = closeMonthOnly(state);
    const after = state.startups.find((y) => y.id === id)!;
    expect(after.lbo!.status).toBe("ok");
    expect(mnaOf(state).record.covenantRecovered).toBe(1);
    expect(mnaOf(state).record.forcedSales).toBe(0);
  });
});

describe("buy-and-build", () => {
  function owned(): { state: GameState; id: string } {
    const { state: start, id } = withTarget(21);
    const state = act({ ...start, familyOffice: 1 }, { type: "acquire", targetId: id, bid: "ask", bank: 0.3, vendor: 0, earnout: 0 });
    return { state, id };
  }

  it("needs the family office and enough EBITDA", () => {
    const { state, id } = owned();
    expect(platformView({ ...state, familyOffice: undefined }, id)!.makeBlocker).toMatch(/Family Office/);
    const next = act(state, { type: "platform", startupId: id, move: "make" });
    expect(next.startups.find((x) => x.id === id)!.platform).toBeDefined();
  });

  it("an add-on adds EBITDA, starts an integration and the sale ends in a recorded exit", () => {
    const { state: s0, id } = owned();
    let state = act(s0, { type: "platform", startupId: id, move: "make" });
    // Force an add-on offer.
    for (let i = 0; i < 12 && !mnaOf(state).addons.some((a) => a.status === "open"); i++) state = closeMonthOnly(state);
    const addon = mnaOf(state).addons.find((a) => a.status === "open");
    expect(addon).toBeDefined();
    const before = annualEbitda(state.startups.find((x) => x.id === id)!.metrics);
    state = { ...state, daysUsed: 0 };
    state = act(state, { type: "acquire", targetId: addon!.id, bid: "ask", bank: 0.5, vendor: 0.1, earnout: 0, integration: "fast" });
    const p = state.startups.find((x) => x.id === id)!;
    expect(annualEbitda(p.metrics)).toBeGreaterThan(before);
    expect(p.platform!.integrations).toHaveLength(1);
    expect(mnaOf(state).record.addons).toBe(1);
    for (let i = 0; i < 5; i++) state = closeMonthOnly(state);
    expect(state.startups.find((x) => x.id === id)!.platform!.integrations).toHaveLength(0);
    // A healthy group for the sale (the months before may have brought shocks).
    const healthy = state.startups.find((x) => x.id === id)!;
    healthy.metrics.opex = healthy.metrics.revenue * healthy.metrics.grossMargin * 0.7;
    healthy.lbo = { ...healthy.lbo!, status: "ok", breach: 0, refRevenue: undefined, margin: undefined, grossMargin: undefined };
    state = { ...state, daysUsed: 0 };
    state = act(state, { type: "platform", startupId: id, move: "sell", process: "exclusive", buyers: "strategic" });
    state = closeMonthOnly(state);
    const offer = state.exits.find((e) => e.startupId === id && e.status === "open");
    expect(offer?.platform).toBe(true);
    state = { ...state, daysUsed: 0 };
    state = act(state, { type: "exit", exitId: offer!.id, choice: "accept" });
    const rec = mnaOf(state).record.platformExits;
    expect(rec).toHaveLength(1);
    expect(rec[0]!.addons).toBe(1);
    expect(rec[0]!.multiple).toBeGreaterThan(0);
  });
});

describe("validation and old games", () => {
  it("parses the new moves and rejects nonsense", () => {
    expect(parseAction({ type: "acquire", targetId: "d1", bid: "ask", bank: 0.4, vendor: 0.1, earnout: 0 })).not.toBeNull();
    expect(parseAction({ type: "acquire", targetId: "d1", bid: "ask", bank: 0.9, vendor: 0, earnout: 0 })).toBeNull();
    expect(parseAction({ type: "mandate", mandateId: "n1", move: "launch", multiple: 5, process: "auction", dd: ["legal"] })).not.toBeNull();
    expect(parseAction({ type: "mandate", mandateId: "n1", move: "launch", dd: ["magic"] })).toBeNull();
    expect(parseAction({ type: "examine", targetId: "z1", modules: [] })).toBeNull();
    expect(parseAction({ type: "platform", startupId: "d1", move: "cure" })).not.toBeNull();
    expect(parseAction({ type: "search", move: "start", candidate: 5 })).toBeNull();
  });

  it("a game without the M&A part plays on", () => {
    const state = newGame(9);
    delete state.mna;
    const next = close(state);
    expect(next.month).toBe(2);
    expect(successionView(next).record.mandatesDone).toBe(0);
  });
});
