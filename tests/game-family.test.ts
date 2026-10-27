import { describe, expect, it } from "vitest";
import { annualEbitda, enterpriseValue, familyGrowth } from "../lib/game/ebitda";
import { applyAction, closeMonth, ctxOf, newGame, startupOf } from "../lib/game/engine";
import { explainValueChange, familyValueView, leverViews, STARTUP_ONLY_TEMPLATES } from "../lib/game/family";
import { expectedEarnout, targetDeal } from "../lib/game/lbo";
import { mnaOf } from "../lib/game/mna-core";
import { COVENANT } from "../lib/game/mna-config";
import { acquisitionRedirect, companyRedirect, platformRedirect } from "../lib/game/mna-views";
import { helpersForCompany } from "../lib/game/network-views";
import { planAddons } from "../lib/game/platform";
import { stepMonth, valuation } from "../lib/game/sim";
import { parseAction } from "../lib/game/validate";
import type { GameAction, GameState } from "../lib/game/types";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

/** A rich player in year six with one family business on offer. */
function offered(seed: number, ev: number, source: "search" | "market" = "market") {
  const state: GameState = { ...newGame(seed), reputation: 90, cash: 40_000_000, month: 60 };
  const search = source === "search" ? ({ id: "s1", searcher: { name: "Johanna Yildiz", operator: 60 } } as never) : undefined;
  const s = targetDeal(ctxOf(state), () => 0.5, { ev, source, ...(search ? { search } : {}) });
  return { state, id: s.id };
}

/** Bought like Systemhaus Fuchs: no bank, vendor loan and earn-out, the rest is own money. */
function boughtBySeller(seed: number, ev: number) {
  const { state, id } = offered(seed, ev, "search");
  return { state: act(state, { type: "acquire", targetId: id, bid: "ask", bank: 0, vendor: 0.1, earnout: 0.15 }), id };
}

/** One month without board decisions (the healthy case): news, findings and the handover still happen. */
function calmMonth(state: GameState, id: string): GameState {
  const next = structuredClone(state);
  next.items = next.items.filter((i) => i.startupId !== id);
  closeMonth(next);
  next.cash = Math.max(next.cash, 5_000_000);
  return next;
}

describe("404 after a purchase", () => {
  it("a signed purchase leads to the company page, an unknown id stays a 404", () => {
    const { state, id } = offered(3, 5_000_000);
    expect(acquisitionRedirect(state, id)).toBeNull();
    const next = act(state, { type: "acquire", targetId: id, bid: "ask", bank: 0.4, vendor: 0.1, earnout: 0 });
    expect(startupOf(next, id).status).toBe("active");
    expect(acquisitionRedirect(next, id)).toBe(`/firma/${id}`);
    expect(acquisitionRedirect(next, "d999")).toBeNull();
  });

  it("an expired offer from the searcher leads back to the succession desk, one from the post to the post", () => {
    const a = offered(4, 5_000_000, "search");
    startupOf(a.state, a.id).status = "declined";
    expect(acquisitionRedirect(a.state, a.id)).toBe("/nachfolge");
    const b = offered(4, 5_000_000);
    startupOf(b.state, b.id).status = "declined";
    expect(acquisitionRedirect(b.state, b.id)).toBe(`/post?firma=${b.id}`);
    expect(companyRedirect(b.state, b.id)).toBe(`/post?firma=${b.id}`);
  });

  it("an offer opened as a company page leads to its takeover page", () => {
    const { state, id } = offered(5, 5_000_000);
    expect(companyRedirect(state, id)).toBe(`/uebernahme/${id}`);
    expect(platformRedirect(state, id)).toBe(`/uebernahme/${id}`);
  });

  it("an add-on that was bought leads to its platform", () => {
    const { state: s0, id } = offered(21, 8_000_000);
    let state = act({ ...s0, familyOffice: 1 } as GameState, { type: "acquire", targetId: id, bid: "ask", bank: 0.3, vendor: 0, earnout: 0 });
    state = act({ ...state, daysUsed: 0 }, { type: "platform", startupId: id, move: "make" });
    for (let i = 0; i < 40 && !mnaOf(state).addons.some((a) => a.status === "open"); i++) {
      state.month += 1;
      planAddons(ctxOf(state));
    }
    const addon = mnaOf(state).addons.find((a) => a.status === "open")!;
    expect(acquisitionRedirect(state, addon.id)).toBeNull();
    state = act({ ...state, daysUsed: 0 }, { type: "acquire", targetId: addon.id, bid: "ask", bank: 0.3, vendor: 0, earnout: 0, integration: "careful" });
    expect(mnaOf(state).addons.find((a) => a.id === addon.id)!.status).toBe("bought");
    expect(acquisitionRedirect(state, addon.id)).toBe(`/plattform/${id}`);
    expect(companyRedirect(state, addon.id)).toBe(`/plattform/${id}`);
  });
});

describe("value of a family business", () => {
  it("grows like a mature business, not like a startup: no drag for size", () => {
    const { state, id } = boughtBySeller(7, 27_000_000);
    const s = startupOf(state, id);
    expect(s.metrics.revenue).toBeGreaterThan(1_000_000);
    let x = { ...s, metrics: { ...s.metrics, growth: 0 } };
    for (let i = 0; i < 12; i++) x = stepMonth(x).startup;
    // A startup of this size would drift towards −2 to −3 % a month.
    expect(x.metrics.growth).toBeGreaterThan(-0.006);
    expect(x.metrics.growth).toBeLessThanOrEqual(0.005);
    expect(Math.abs(familyGrowth(s.metrics))).toBeLessThan(0.006);
  });

  it("a healthy company keeps its value over 24 months in several seeds", () => {
    const ratios: number[] = [];
    for (const ev of [3_000_000, 27_000_000]) {
      for (let seed = 1; seed <= 6; seed++) {
        const bought = boughtBySeller(seed, ev);
        let state = bought.state;
        const id = bought.id;
        const start = valuation(startupOf(state, id).metrics);
        for (let m = 0; m < 24 && startupOf(state, id).status === "active"; m++) {
          state = calmMonth(state, id);
          if (m === 5 || m === 11 || m === 23) {
            const s = startupOf(state, id);
            if (s.status === "active") ratios.push(valuation(s.metrics) / start);
          }
        }
      }
    }
    expect(ratios.length).toBeGreaterThan(24);
    // Before the fix a company like Systemhaus Fuchs fell from 27 to under 1 Mio. € in half a year.
    expect(Math.min(...ratios)).toBeGreaterThan(0.6);
    const sorted = [...ratios].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    expect(median).toBeGreaterThan(0.9);
    expect(median).toBeLessThan(1.6);
  });

  it("counts an earn-out only as far as its target is in reach", () => {
    const e = { amount: 1_000_000, target: 2_000_000 };
    expect(expectedEarnout(e, 2_000_000)).toBe(1_000_000);
    expect(expectedEarnout(e, 1_200_000)).toBe(0);
    expect(expectedEarnout(e, 1_700_000)).toBeCloseTo(500_000, -3);
  });

  it("a thin profit is never worth less than a small loss", () => {
    const { state, id } = boughtBySeller(2, 5_000_000);
    const m = startupOf(state, id).metrics;
    const loss = { ...m, opex: m.revenue * m.grossMargin + 1000 };
    const thin = { ...m, opex: m.revenue * m.grossMargin - 1000 };
    expect(enterpriseValue(thin)).toBeGreaterThanOrEqual(enterpriseValue(loss));
  });

  it("explains a change of value in one line", () => {
    const { state, id } = boughtBySeller(2, 10_000_000);
    const m = startupOf(state, id).metrics;
    const worse = { ...m, revenue: m.revenue * 0.9, opex: m.opex * 0.95 };
    const text = explainValueChange(m, worse)!;
    expect(text).toMatch(/^Wert −/);
    expect(text).toMatch(/EBITDA −\d+ %/);
    expect(text).toMatch(/Umsatz −10 %/);
    expect(explainValueChange(m, m)).toBeNull();
  });

  it("the monthly report says why the value moved", () => {
    const bought = boughtBySeller(8, 10_000_000);
    let state = bought.state;
    const id = bought.id;
    let found = false;
    for (let i = 0; i < 12 && !found; i++) {
      state = calmMonth(state, id);
      found = Boolean(state.reports[0]!.lines.find((l) => l.startupId === id)?.valueWhy);
    }
    expect(found).toBe(true);
    expect(state.lessons).toContain("werttreiber");
  });

  it("old games: a company crashed by the startup growth path is valued plausibly again next month, without new money", () => {
    const { state: s0, id } = boughtBySeller(9, 20_000_000);
    const state = structuredClone(s0);
    const s = startupOf(state, id);
    // What the old model left behind: shrinking 3 % a month, revenue down 40 %, the fixed costs still there.
    s.metrics = { ...s.metrics, growth: -0.03, revenue: s.metrics.revenue * 0.6, opex: s.metrics.opex * 0.75 };
    delete s.lbo!.model;
    s.lbo!.refRevenue = s.metrics.revenue;
    const before = valuation(s.metrics);
    const cashBefore = s.metrics.cash;
    const next = calmMonth(state, id);
    const after = startupOf(next, id);
    expect(after.lbo!.model).toBe(2);
    expect(after.metrics.growth).toBeGreaterThan(-0.01);
    expect(valuation(after.metrics)).toBeGreaterThan(before * 1.3);
    // The company's cash only moves by one month of business, nothing is handed back.
    expect(after.metrics.cash - cashBefore).toBeLessThan(annualEbitda(after.metrics) / 12 + 1);
    expect(next.reports[0]!.lines.find((l) => l.startupId === id)!.events.join(" ")).toMatch(/Neu bewertet/);
  });

  it("startup topics stay out of the family business board", () => {
    const bought = boughtBySeller(10, 5_000_000);
    let state = bought.state;
    const id = bought.id;
    for (let i = 0; i < 18; i++) {
      const next = structuredClone(state);
      closeMonth(next);
      next.cash = Math.max(next.cash, 5_000_000);
      state = next;
    }
    const topics = state.items.filter((i) => i.startupId === id).map((i) => i.templateId);
    expect(topics.length).toBeGreaterThan(0);
    for (const t of topics) expect(STARTUP_ONLY_TEMPLATES.has(t)).toBe(false);
    expect(topics).not.toContain("m_zukauf");
  });
});

describe("levers for the majority owner", () => {
  it("are offered for an own family business with costs, effect and risk", () => {
    const { state, id } = boughtBySeller(11, 10_000_000);
    const levers = leverViews(state, startupOf(state, id));
    expect(levers.map((l) => l.id)).toEqual(["interim", "ceo", "costs", "pricing", "sales", "workingCapital", "refinance", "earnout"]);
    for (const l of levers) {
      expect(l.cost.length).toBeGreaterThan(0);
      expect(l.effect.length).toBeGreaterThan(0);
      expect(l.risk.length).toBeGreaterThan(0);
    }
    // No bank loan: nothing to refinance. An open earn-out: it can be renegotiated.
    expect(levers.find((l) => l.id === "refinance")!.blocker).toMatch(/keinen Bankkredit/);
    expect(levers.find((l) => l.id === "earnout")!.blocker).toBeNull();
    const view = familyValueView(state, startupOf(state, id), COVENANT)!;
    expect(view.parts.equity).toBeCloseTo(valuation(startupOf(state, id).metrics), 0);
  });

  it("a cost programme lowers the costs for good, costs money once and waits before the next one", () => {
    const { state, id } = boughtBySeller(12, 10_000_000);
    const before = startupOf(state, id);
    const next = act(state, { type: "lever", startupId: id, lever: "costs" });
    const after = startupOf(next, id);
    expect(after.metrics.opex).toBeLessThan(before.metrics.opex * 0.96);
    expect(after.metrics.cash).toBeLessThan(before.metrics.cash);
    expect(next.daysUsed).toBe(state.daysUsed + 1);
    expect(() => act(next, { type: "lever", startupId: id, lever: "costs" })).toThrow(/Gerade erst/);
  });

  it("a working-capital programme frees cash, less the second time", () => {
    const { state, id } = boughtBySeller(13, 10_000_000);
    const c0 = startupOf(state, id).metrics.cash;
    const once = act(state, { type: "lever", startupId: id, lever: "workingCapital" });
    const freed = startupOf(once, id).metrics.cash - c0;
    expect(freed).toBeGreaterThan(0);
    expect(once.lessons).toContain("working_capital");
    const later = { ...structuredClone(once), month: once.month + 12, daysUsed: 0 };
    const twice = act(later, { type: "lever", startupId: id, lever: "workingCapital" });
    expect(startupOf(twice, id).metrics.cash - startupOf(later, id).metrics.cash).toBeLessThan(freed);
  });

  it("refinancing stretches the bank loan: lower payment, a fee", () => {
    const { state: s0, id } = offered(14, 10_000_000);
    const state = act(s0, { type: "acquire", targetId: id, bid: "ask", bank: 0.5, vendor: 0, earnout: 0 });
    const later = { ...structuredClone(state), month: state.month + 30, daysUsed: 0 };
    const s = startupOf(later, id);
    // Thirty months of a seven-year loan paid: the new seven years mean a lower rate.
    s.lbo = { ...s.lbo!, bank: s.lbo!.bank * 0.7 };
    const next = act(later, { type: "lever", startupId: id, lever: "refinance" });
    expect(startupOf(next, id).lbo!.payment).toBeLessThan(s.lbo!.payment);
    expect(next.lessons).toContain("refinanzierung");
  });

  it("an interim manager makes a weak management stronger month by month", () => {
    const { state: s0, id } = boughtBySeller(15, 10_000_000);
    const state = structuredClone(s0);
    startupOf(state, id).metrics.axes.management = 40;
    const next = act(state, { type: "lever", startupId: id, lever: "interim" });
    const after = calmMonth(next, id);
    expect(startupOf(after, id).metrics.axes.management).toBeGreaterThan(43);
  });

  it("are only for majority-owned family businesses, and the action is validated", () => {
    const state = newGame(3);
    expect(() => act(state, { type: "lever", startupId: "pendelwerk", lever: "costs" })).toThrow(/Mittelstandsfirmen/);
    expect(parseAction({ type: "lever", startupId: "d1", lever: "costs" })).not.toBeNull();
    expect(parseAction({ type: "lever", startupId: "d1", lever: "magic" })).toBeNull();
  });

  it("classic contacts help a family business too, with help on its scale", () => {
    const { state: s0, id } = boughtBySeller(16, 10_000_000);
    const state = { ...structuredClone(s0), contacts: s0.contacts.map((c) => ({ ...c, met: true, warmth: 70 })) };
    startupOf(state, id).metrics.axes.finance = 40;
    const helpers = helpersForCompany(state, id);
    expect(helpers.some((h) => h.id === "steuer" && h.action === "intro")).toBe(true);
    const opex = startupOf(state, id).metrics.opex;
    const next = act(state, { type: "introContact", contactId: "steuer", startupId: id });
    const after = calmMonth(next, id);
    // A startup gets 600 € of savings; a family business about one percent of its costs.
    expect(next.effects.find((e) => e.startupId === id && e.itemId.startsWith("intro-steuer"))!.delta.opex).toBeLessThan(-opex * 0.005);
    expect(startupOf(after, id).metrics.axes.finance).toBeGreaterThan(45);
  });
});
