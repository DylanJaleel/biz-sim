import { describe, expect, it } from "vitest";
import { applyAction, netWorth, newGame, portfolioValue } from "../lib/game/engine";
import { familyOf, fundMetrics, fundsRead, LPAC_OPTIONS, nextFundBlocker, waterfallSplit } from "../lib/game/funds";
import { building, milestone, studioBlocker, studioRead } from "../lib/game/studio";
import { companyValue, creditedValue, stakeValues, ventureChance } from "../lib/game/venture";
import { PAPER_CAP, STUDIO_DAYS, UNICORN_STAGE, VENTURE_STAGES } from "../lib/game/venture-config";
import { menuSections } from "../lib/navigation";
import { trophyOf } from "../lib/game/trophies";
import { lessonOf } from "../lib/game/lessons";
import { parseAction } from "../lib/game/validate";
import { valuation } from "../lib/game/sim";
import type { ExitOffer, FundState, GameAction, GameState, Startup } from "../lib/game/types";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;

/** A late-game player with a family office and Fund I. */
function withFund(invested = 0.75, seed = 7): GameState {
  const state: GameState = { ...newGame(seed), cash: 5_000_000, reputation: 90, office: 3, familyOffice: 1 };
  state.month = 40;
  state.fund = { name: "Dein Fonds I", size: 10_000_000, cash: 10_000_000 * (1 - invested), invested: 10_000_000 * invested, returned: 0, raised: 20 };
  return state;
}

function accepted(state: GameState, n: number): void {
  for (let i = 0; i < n; i++) state.exits.push({ id: `xx${i}`, startupId: "pendelwerk", month: 1, buyer: "Test", price: 1, status: "accepted" } as ExitOffer);
}

describe("fund waterfall (European, whole fund)", () => {
  it("pays capital, hurdle, catch-up, then 80/20", () => {
    const w = waterfallSplit(10_000_000, 2_000_000, 0.2, 20_000_000);
    expect(w.capital).toBe(10_000_000);
    expect(w.hurdle).toBe(2_000_000);
    expect(w.catchUp).toBeCloseTo(500_000, 0);
    expect(w.gp).toBeCloseTo(2_000_000, 0);
    expect(w.lp + w.gp).toBeCloseTo(20_000_000, 0);
    // Below capital back: no carry at all.
    expect(waterfallSplit(10_000_000, 2_000_000, 0.2, 9_000_000).gp).toBe(0);
  });

  it("converts an old Fund I and counts its deal-by-deal carry as paid", () => {
    const state = withFund(0.5);
    const old = state.fund!;
    expect(old.wf).toBeUndefined();
    const [f] = fundsRead(state);
    expect(f!.wf).toBe(true);
    expect(f!.id).toBe("fonds");
    expect(f!.fees).toBeGreaterThan(0);
    // Reading never writes.
    expect(state.fund!.wf).toBeUndefined();
    familyOf(state);
    expect(state.fund!.wf).toBe(true);
    const m = fundMetrics(state, state.fund!);
    expect(m.dpi).toBe(0);
    expect(m.investedShare).toBeCloseTo(0.5, 5);
  });

  it("old saves without the new fields play on", () => {
    let state = withFund(0.2);
    for (let i = 0; i < 3; i++) state = act(state, { type: "closeMonth" });
    expect(state.funds).toBeDefined();
    expect(state.fund!.fees).toBeGreaterThan(0);
  });
});

describe("Fund II with investors", () => {
  it("opens only once Fund I is 70 % invested", () => {
    expect(nextFundBlocker(withFund(0.5))).toMatch(/70 %/);
    expect(nextFundBlocker(withFund(0.75))).toBeNull();
  });

  it("runs a roadshow: pitch, concessions, close; new deals go to Fund II", () => {
    let state = act(withFund(0.75), { type: "fund", move: "launch" });
    const raising = state.funds!.raising!;
    expect(raising.no).toBe(2);
    expect(raising.target).toBeGreaterThanOrEqual(10_000_000);
    // Paper gains on Fund I so the investors like the record.
    state.fund!.returned = 14_000_000;
    for (const lp of raising.lps) {
      if (state.daysUsed >= 18) state = act(state, { type: "closeMonth" });
      state = act(state, { type: "fund", move: "pitch", lpId: lp.id });
    }
    for (let lp = state.funds!.raising!.lps.find((l) => l.status === "wants"); lp; lp = state.funds!.raising!.lps.find((l) => l.status === "wants"))
      state = act(state, { type: "fund", move: "concede", lpId: lp.id });
    const lps = state.funds!.raising!.lps;
    expect(lps.every((l) => l.status === "committed" || l.status === "declined")).toBe(true);
    expect(lps.some((l) => l.status === "committed")).toBe(true);
    state = act(state, { type: "closeMonth" });
    state = act(state, { type: "fund", move: "close" });
    const fund2 = state.funds!.later[0]!;
    expect(fund2.name).toBe("Dein Fonds II");
    expect(fund2.size).toBeGreaterThan(0);
    expect(trophyOf("fund-2")!.earned(state, 0)).toBe(true);
    // A new direct investment: Fund II co-invests.
    const offer = state.startups.find((s) => s.status === "offered" && !s.offer?.buyout);
    if (offer) {
      state = act(state, { type: "invest", startupId: offer.id });
      expect(state.startups.find((s) => s.id === offer.id)!.capTable.some((h) => h.id === "fonds2")).toBe(true);
    }
  });

  it("parses the new moves", () => {
    expect(parseAction({ type: "fund", move: "pitch", lpId: "lp2-0" })).toEqual({ type: "fund", move: "pitch", lpId: "lp2-0" });
    expect(parseAction({ type: "fund", move: "steal" })).toBeNull();
    expect(parseAction({ type: "lpac", voteId: "lpac1", choice: "fair" })).toEqual({ type: "lpac", voteId: "lpac1", choice: "fair" });
    expect(parseAction({ type: "studio", move: "found", ideaId: "idea1-0", ceo: 1, keep: 70 })).toEqual({ type: "studio", move: "found", ideaId: "idea1-0", ceo: 1, keep: 70 });
    expect(parseAction({ type: "studio", move: "found", keep: 95 })).toBeNull();
  });
});

describe("venture studio", () => {
  it("stays closed until reputation and sales are there", () => {
    const state = { ...newGame(2), reputation: 60 };
    expect(studioBlocker(state)).toMatch(/Ruf 75/);
    const nav = menuSections({ reputation: 60, unread: 0, openItems: 0, networkTasks: 0, familyOffice: false, exits: 0 });
    const studio = nav.flatMap((s) => s.entries).find((e) => e.item.href === "/studio")!;
    expect(studio.locked).toMatch(/ab Ruf 75/);
  });

  it("founds a company, takes days, releases tranches at milestones, asks the fund via the LPAC", () => {
    let state = withFund(0.3, 5);
    accepted(state, 2);
    const idea = studioRead(state).pool[0]!;
    state = act(state, { type: "studio", move: "found", ideaId: idea.id, ceo: 0, keep: 70 });
    const s = state.startups.find((x) => x.studio)!;
    expect(s.status).toBe("active");
    expect(s.stake).toBe(70);
    expect(s.capTable.reduce((sum, h) => sum + h.pct, 0) + s.stake).toBeCloseTo(100, 6);
    expect(state.studio!.founded).toBe(1);
    expect(trophyOf("studio")!.earned(state, 0)).toBe(true);
    // Next month starts with the studio days already in the calendar.
    state = act(state, { type: "closeMonth" });
    expect(state.calendar.some((c) => c.label.includes(s.name) && c.days === STUDIO_DAYS)).toBe(true);
    expect(building(state)).toHaveLength(1);
    // Releasing before the milestone fails.
    const before = milestone(state.startups.find((x) => x.id === s.id)!, 1);
    if (!before.done) expect(() => applyAction(state, { type: "studio", move: "tranche", startupId: s.id })).toThrow(/Meilenstein/);
    // Force the prototype and negotiate a lean tranche: less money, more for the CEO.
    const c = state.startups.find((x) => x.id === s.id)!;
    c.metrics.axes.product = 80;
    const cash = state.cash;
    state = act(state, { type: "studio", move: "tranche", startupId: s.id, size: "lean" });
    const after = state.startups.find((x) => x.id === s.id)!;
    expect(after.stake).toBeCloseTo(66, 6);
    expect(state.cash).toBeLessThan(cash);
    // The fund is asked: a conflict for the LPAC.
    state = act(state, { type: "studio", move: "fundAsk", startupId: s.id });
    const vote = state.funds!.votes.find((v) => v.kind === "studio")!;
    expect(vote.status).toBe("open");
    state = act(state, { type: "lpac", voteId: vote.id, choice: "fair" });
    const done = state.funds!.votes.find((v) => v.id === vote.id)!;
    expect(["approved", "rejected"]).toContain(done.status);
    expect(done.result).toBeTruthy();
    if (done.status === "approved") expect(state.startups.find((x) => x.id === s.id)!.capTable.some((h) => h.kind === "fund")).toBe(true);
  });

  it("allows at most two companies in the building phase", () => {
    let state = withFund(0.3, 9);
    accepted(state, 2);
    const pool = studioRead(state).pool;
    state = act(state, { type: "studio", move: "found", ideaId: pool[0]!.id, ceo: 0, keep: 60 });
    state = act(state, { type: "studio", move: "found", ideaId: pool[1]!.id, ceo: 1, keep: 80 });
    expect(() => applyAction(state, { type: "studio", move: "found", ideaId: pool[2]!.id, ceo: 0, keep: 70 })).toThrow(/2 Studio-Firmen/);
  });
});

describe("growth path to the unicorn", () => {
  function onPath(stage: number, paper: number): { state: GameState; s: Startup } {
    const state = newGame(3);
    const s = state.startups.find((x) => x.id === "pendelwerk")!;
    s.status = "active";
    s.stake = 8;
    s.joined = 1;
    s.venture = { stage, paper, since: 1, next: 99, log: [] };
    return { state, s };
  }

  it("counts the paper value only in part until the exit", () => {
    const { state, s } = onPath(3, 210_000_000);
    const v = stakeValues(s);
    expect(companyValue(s)).toBe(210_000_000);
    expect(v.paper).toBeCloseTo(16_800_000, -3);
    expect(v.credited).toBeLessThan(v.paper);
    expect(v.credited - v.fundamental).toBeLessThanOrEqual(PAPER_CAP + 1);
    expect(portfolioValue(state)).toBeCloseTo(creditedValue(s), 0);
    expect(netWorth(state)).toBeLessThan(state.cash + v.paper);
  });

  it("a closed pre-IPO round makes a unicorn: news, mail, trophy", () => {
    const { state, s } = onPath(UNICORN_STAGE - 1, 520_000_000);
    const stage = VENTURE_STAGES[UNICORN_STAGE]!;
    const amount = stage.post * stage.dilution;
    state.rounds.push({
      id: "r-u",
      startupId: s.id,
      month: state.month,
      label: "Pre-IPO-Runde",
      amount,
      preMoney: stage.post - amount,
      leadId: "growth-x",
      lead: "Atlas Growth",
      down: false,
      status: "open",
      venture: UNICORN_STAGE,
    });
    s.flags.push("round_open");
    expect(() => applyAction(state, { type: "round", roundId: "r-u", take: "lead", vote: "go" })).toThrow(/Wachstumsinvestor/);
    const next = act(state, { type: "round", roundId: "r-u", take: "none", vote: "go" });
    const u = next.startups.find((x) => x.id === s.id)!;
    expect(u.venture!.unicorn).toBe(next.month);
    expect(next.trophies.some((t) => t.id === "unicorn")).toBe(true);
    expect(next.mails.some((m) => m.subject.includes("Unicorn"))).toBe(true);
    expect(next.news[0]!.title).toContain(s.name);
    expect(lessonOf("unicorn").title).toBe("Unicorn");
  });

  it("chance grows with good numbers and is deterministic", () => {
    const { state, s } = onPath(1, 22_000_000);
    s.metrics.growth = 0.01;
    s.metrics.axes.market = 30;
    const low = ventureChance(state, s);
    s.metrics.growth = 0.06;
    s.metrics.axes.market = 90;
    expect(ventureChance(state, s)).toBeGreaterThan(low);
    expect(valuation(s.metrics)).toBeLessThan(companyValue(s));
  });
});

describe("LPAC options", () => {
  it("has a clean option for every kind", () => {
    for (const kind of Object.keys(LPAC_OPTIONS) as (keyof typeof LPAC_OPTIONS)[]) expect(LPAC_OPTIONS[kind].length).toBeGreaterThanOrEqual(2);
    const f: FundState = { name: "x", size: 1, cash: 0, invested: 0, returned: 0, raised: 0 };
    expect(f.terms).toBeUndefined();
  });
});
