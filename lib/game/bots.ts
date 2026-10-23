import { templateOf } from "./content";
import { applyAction, daysLeft, GameRuleError, netWorth, newGame, openItems, portfolioValue, previewMeeting, randomFor, startupOf, syndicateBlocker } from "./engine";
import { holdingsValue } from "./market";
import { OFFICES, officeOf } from "./office";
import { careerOf } from "./career";
import { potentialGrowth, valuation } from "./sim";
import { bestVote, outlook, VOTES } from "./judge";
import { boldChance, garageUpkeep, travelOptions } from "./travel";
import { playerAmount } from "./captable";
import { contactDef, ringOpen } from "./network";
import { BUYOUT_REPUTATION, INTRO_COOLDOWN, LEAD_REPUTATION, LIVING_COSTS, WARMTH_INTRO_MIN } from "./config";
import type { GameAction, GameState, Startup, Vote } from "./types";

// Skript-Spieler für die Balance: Sie spielen das Spiel über die echte Engine.

export interface Bot {
  name: string;
  /** Which offered startup to invest in. */
  pick: (state: GameState) => string | null;
  /** Actions for one month, executed in order; failing actions are skipped. */
  month: (state: GameState, random: () => number) => GameAction[];
  /** Optional last actions of the month, planned on the state after `month` (e.g. parking cash in the depot). */
  end?: (state: GameState) => GameAction[];
}

function firstAffordable(state: GameState, prefer?: string): string | null {
  const offers = state.startups.filter((s) => s.status === "offered" && s.offer && s.offer.ticket <= state.cash);
  return (offers.find((s) => s.id === prefer) ?? offers[0])?.id ?? null;
}

function investActions(state: GameState, id: string | null, dd: boolean): GameAction[] {
  if (!id || state.startups.some((s) => s.status === "active")) return [];
  return dd
    ? [
        { type: "dd", startupId: id },
        { type: "invest", startupId: id },
      ]
    : [{ type: "invest", startupId: id }];
}

/** Never meets: the founders decide everything alone. */
export const passiveBot = (prefer?: string): Bot => ({
  name: "passiv",
  pick: (s) => firstAffordable(s, prefer),
  month: (s) => investActions(s, firstAffordable(s, prefer), false),
});

/** Books paid work for the days that are left, keeping a few free. */
function gigActions(state: GameState, reserve: number): GameAction[] {
  let free = daysLeft(state) - reserve;
  const out: GameAction[] = [];
  for (const g of state.gigs.filter((x) => x.status === "offered").sort((a, b) => b.fee / b.days - a.fee / a.days)) {
    // The quickest way there, then the cheapest; done the safe way.
    const trip = travelOptions(state, g)
      .filter((o) => !o.locked)
      .sort((a, b) => a.days - b.days || a.cost - b.cost)[0]!;
    const days = Math.max(1, g.days + trip.days - (g.days >= 3 ? 1 : 0));
    if (days <= free) {
      out.push({ type: "gig", gigId: g.id, travel: trip.id, approach: "safe" });
      free -= days;
    }
  }
  return out;
}

/** Never invests: lives from consulting and keeps the money on the account. */
export const consultantBot = (): Bot => ({
  name: "Nur Berater",
  pick: () => null,
  month: (s) => [...s.startups.filter((x) => x.status === "offered").map((x) => ({ type: "decline", startupId: x.id }) as GameAction), ...gigActions(s, 0)],
});

/** Always says yes to whatever the founder proposes. */
export const yesBot = (prefer?: string): Bot => ({
  name: "Ja-Sager",
  pick: (s) => firstAffordable(s, prefer),
  month: (s) => [
    ...investActions(s, firstAffordable(s, prefer), false),
    ...openItems(s).map((i) => ({ type: "meeting", itemId: i.id, argument: null, vote: "go" }) as GameAction),
    ...gigActions(s, 6),
  ],
});

/** Votes at random, argues at random. */
export const randomBot = (prefer?: string): Bot => ({
  name: "Zufall",
  pick: (s) => firstAffordable(s, prefer),
  month: (s, random) => [
    ...investActions(s, firstAffordable(s, prefer), false),
    ...openItems(s).map((i) => {
      const t = templateOf(i.templateId);
      const arg = t.arguments[Math.floor(random() * 3)]!;
      return { type: "meeting", itemId: i.id, argument: arg.id, vote: VOTES[Math.floor(random() * 3)]! } as GameAction;
    }),
  ],
});

/**
 * Prepares like a careful board member: CFO view, talks to the member most
 * likely to swing, argues for the best plan and votes for it.
 */
export const analystBot = (prefer?: string): Bot => ({
  name: "Analyst",
  pick: (s) => firstAffordable(s, prefer),
  month: (s) => {
    const actions: GameAction[] = [...investActions(s, firstAffordable(s, prefer), true)];
    for (const item of openItems(s)) {
      const t = templateOf(item.templateId);
      const startup = startupOf(s, item.startupId);
      const o = outlook(t, startup);
      const best = bestVote({ go: o.go.value, conditions: o.conditions.value, no: o.no.value });
      const argument = t.arguments.find((a) => a.toward === best) ?? t.arguments[0]!;
      const stances = previewMeeting(s, item.id).stancesBefore;
      const swing = startup.board
        .filter((m) => m.seat !== "ceo" && m.interests.some((i) => argument.appeals.includes(i)))
        .sort((a, b) => Math.abs(stances[a.seat] - target(best)) - Math.abs(stances[b.seat] - target(best)))
        .reverse()[0];
      actions.push({ type: "cfo", itemId: item.id });
      if (swing) actions.push({ type: "pretalk", itemId: item.id, seat: swing.seat });
      actions.push({ type: "meeting", itemId: item.id, argument: argument.id, vote: best });
    }
    for (const round of s.rounds.filter((r) => r.status === "open")) {
      actions.push({ type: "round", roundId: round.id, take: "prorata", vote: "go" });
      actions.push({ type: "round", roundId: round.id, take: "half", vote: "go" });
    }
    for (const startup of s.startups.filter((x) => x.status === "active" && x.metrics.trust < 55)) {
      actions.push({ type: "founderCall", startupId: startup.id });
    }
    // Paid work only with the days the mandates leave over.
    const planned = actions.length;
    return [...actions, ...gigActions({ ...s, daysUsed: s.daysUsed + planned }, 2)];
  },
});

/**
 * The analyst plus everything Phase 3 offers: weighs sale offers, leads with
 * a syndicate, keeps the angel club warm, moves into a better office when it
 * can afford a year of rent, and takes the corporate seat.
 */
export const proBot = (prefer?: string): Bot => {
  const base = analystBot(prefer);
  return {
    name: "Profi",
    pick: base.pick,
    month: (s, random) => {
      const actions: GameAction[] = [];
      for (const e of s.exits.filter((x) => x.status === "open")) {
        const value = valuation(startupOf(s, e.startupId).metrics);
        if (e.price >= value * 1.15) actions.push({ type: "exit", exitId: e.id, choice: "accept" });
        else if (e.price >= value && e.choice !== "negotiate") actions.push({ type: "exit", exitId: e.id, choice: "negotiate" }, { type: "exit", exitId: e.id, choice: "accept" });
        else actions.push({ type: "exit", exitId: e.id, choice: "reject" });
      }
      if (s.corporateSeat === "offered") actions.push({ type: "joinCorporate", accept: true });
      const next = OFFICES[s.office + 1];
      if (next && s.reputation >= next.reputation && netWorth(s) >= next.worth && s.cash > next.rent * 12) actions.push({ type: "moveOffice", level: next.level });
      const club = s.contacts.find((c) => c.id === "angels");
      if (s.reputation >= 35 && club && club.warmth < 60) actions.push({ type: "meetContact", contactId: "angels" });
      for (const round of s.rounds.filter((r) => r.status === "open")) actions.push({ type: "round", roundId: round.id, take: "syndicate", vote: "go" });
      return [...actions, ...base.month(s, random)];
    },
  };
};

/**
 * The long game: invests in several companies, buys family businesses with a
 * bank loan, founds the family office, hires associates and raises a fund.
 */
export const mogulBot = (prefer?: string): Bot => {
  const base = proBot(prefer);
  return {
    name: "Mogul",
    pick: base.pick,
    month: (s, random) => {
      const actions: GameAction[] = [];
      const active = s.startups.filter((x) => x.status === "active" && !x.corporate);
      let budget = s.cash * 0.35;
      for (const o of s.startups.filter((x) => x.status === "offered" && x.offer)) {
        if (active.length + actions.length / 2 >= 6) break;
        const ticket = o.offer!.ticket;
        if (o.offer!.buyout) {
          if (s.reputation >= 55 && ticket * 0.6 <= s.cash * 0.85) actions.push({ type: "dd", startupId: o.id }, { type: "buyout", startupId: o.id, leverage: true });
          continue;
        }
        if (ticket <= budget) {
          actions.push({ type: "dd", startupId: o.id }, { type: "invest", startupId: o.id });
          budget -= ticket;
        } else if (ticket / 2 <= budget) {
          actions.push({ type: "dd", startupId: o.id }, { type: "invest", startupId: o.id, size: "half" });
          budget -= ticket / 2;
        }
      }
      if (!s.familyOffice) actions.push({ type: "foundFamilyOffice" });
      else {
        const associates = s.team.filter((m) => m.role === "associate");
        if (associates.length < Math.min(3, active.length - 2) && s.cash > 150_000) actions.push({ type: "hire", role: "associate" });
        if (!s.team.some((m) => m.role === "partner") && s.cash > 400_000) actions.push({ type: "hire", role: "partner" });
        const free = active.filter((x) => !s.team.some((m) => m.mandate === x.id));
        associates
          .filter((m) => !m.mandate || !active.some((x) => x.id === m.mandate))
          .forEach((m, i) => {
            if (free[i]) actions.push({ type: "assign", memberId: m.id, startupId: free[i]!.id });
          });
        if (!s.fund) actions.push({ type: "raiseFund" });
      }
      return [...actions, ...base.month(s, random)];
    },
  };
};

/** How promising a company looks: today's growth and where product, market and edge pull it. */
function promise(s: Startup): number {
  return (s.metrics.growth + potentialGrowth(s.metrics)) / 2;
}

/** Monthly fixed costs of the player: living, rent, team, cars, loan instalments. */
function fixedCosts(s: GameState): number {
  return LIVING_COSTS + officeOf(s).rent + s.team.reduce((a, m) => a + m.salary, 0) + garageUpkeep(s) + s.loans.reduce((a, l) => a + l.payment, 0);
}

export interface ExpertStyle {
  /** Keep growing companies instead of selling them. */
  hold?: boolean;
  /** Park spare money in the tech index (and switch to the call account in weak markets). */
  depot?: boolean;
  /** Buy every share on offer in the best companies. */
  shares?: boolean;
}

/**
 * Plays like a resourceful human: picks the most promising companies, prepares
 * every meeting, leads rounds with a syndicate, buys shares in its best
 * companies, uses the network for them, books the best-paid jobs with fast
 * travel, keeps spare money in the market and builds family office and fund
 * as early as the rules allow.
 */
export const expertBot = (style: ExpertStyle = {}, name = "Experte"): Bot => {
  const { hold = true, depot = true, shares = true } = style;
  const analyst = analystBot();
  return {
    name,
    pick: (s) => firstAffordable(s),
    month: (s, random) => {
      const actions: GameAction[] = [];
      const reserve = 30_000 + fixedCosts(s) * 4;
      const active = s.startups.filter((x) => x.status === "active" && !x.corporate);
      const ranked = [...active].sort((a, b) => promise(b) - promise(a));
      // Money for this month: account plus what the depot can bring.
      let money = s.cash + holdingsValue(s.market) - reserve;
      const free = () => Math.max(0, money);
      if (depot) {
        // Weak markets: out of the tech index. Money needed this month comes out first.
        const tech = s.market.holdings.tech * s.market.prices.tech;
        const parked = s.market.holdings.tagesgeld * s.market.prices.tagesgeld;
        if (tech > 0 && (s.market.regime === "weak" || s.market.regime === "crash")) actions.push({ type: "trade", assetId: "tech", amount: -tech });
        else if (tech > 0) actions.push({ type: "trade", assetId: "tech", amount: -Math.min(tech, Math.max(0, reserve * 3 - s.cash)) });
        if (parked > 0) actions.push({ type: "trade", assetId: "tagesgeld", amount: -parked });
      }
      // Sales: keep what still grows fast, sell what stalls.
      for (const e of s.exits.filter((x) => x.status === "open")) {
        const c = startupOf(s, e.startupId);
        const value = valuation(c.metrics);
        const grows = hold && c.metrics.growth > 0.025;
        if (e.ipo || e.price >= value * (grows ? 1.6 : 1.1)) actions.push({ type: "exit", exitId: e.id, choice: "accept" });
        else if (!grows && e.price >= value * 0.9 && e.choice !== "negotiate")
          actions.push({ type: "exit", exitId: e.id, choice: "negotiate" }, { type: "exit", exitId: e.id, choice: "accept" });
        else actions.push({ type: "exit", exitId: e.id, choice: "reject" });
      }
      if (s.corporateSeat === "offered") actions.push({ type: "joinCorporate", accept: true });
      const next = OFFICES[s.office + 1];
      if (next && s.reputation >= next.reputation && netWorth(s) >= next.worth && s.cash + holdingsValue(s.market) > next.rent * 8)
        actions.push({ type: "moveOffice", level: next.level });
      // Rounds: lead the good ones, keep the share in the rest.
      for (const round of s.rounds.filter((r) => r.status === "open")) {
        const c = startupOf(s, round.startupId);
        const good = promise(c) > 0.025;
        const lead = playerAmount(round, c.stake, "lead");
        if (good && !syndicateBlocker(s) && playerAmount(round, c.stake, "syndicate") <= free()) {
          actions.push({ type: "round", roundId: round.id, take: "syndicate", vote: "go" });
          money -= playerAmount(round, c.stake, "syndicate");
        } else if (good && s.reputation >= LEAD_REPUTATION && lead <= free() * 0.6) {
          actions.push({ type: "round", roundId: round.id, take: "lead", vote: "go" });
          money -= lead;
        }
        actions.push(
          { type: "round", roundId: round.id, take: "prorata", vote: "go" },
          { type: "round", roundId: round.id, take: "half", vote: "go" },
          { type: "round", roundId: round.id, take: "none", vote: "go" },
        );
      }
      // Shares in the best companies, at today's price or below.
      if (shares) {
        for (const o of s.shareOffers.filter((x) => x.status === "open")) {
          const c = startupOf(s, o.startupId);
          if (c.status !== "active" || promise(c) < 0.02 || o.price > free() * 0.5) continue;
          if (o.price <= ((valuation(c.metrics) * o.pct) / 100) * 1.05) {
            actions.push({ type: "buyShares", offerId: o.id });
            money -= o.price;
          }
        }
      }
      // New companies: the most promising first, buyouts once the money is there.
      const offers = s.startups.filter((x) => x.status === "offered" && x.offer).sort((a, b) => promise(b) - promise(a));
      for (const o of offers) {
        if (active.length >= 4 + s.team.filter((m) => m.role === "associate").length * 1.5) break;
        const ticket = o.offer!.ticket;
        if (o.offer!.buyout) {
          const own = ticket * (1 - 0.4);
          if (s.reputation >= BUYOUT_REPUTATION && own <= free() * 0.7 && o.metrics.growth > -0.004) {
            actions.push({ type: "dd", startupId: o.id }, { type: "buyout", startupId: o.id, leverage: true });
            money -= own;
          }
          continue;
        }
        if (promise(o) < 0.02) continue;
        if (ticket <= free() * 0.6) {
          actions.push({ type: "dd", startupId: o.id }, { type: "invest", startupId: o.id });
          money -= ticket;
        } else if (ticket / 2 <= free() * 0.6) {
          actions.push({ type: "dd", startupId: o.id }, { type: "invest", startupId: o.id, size: "half" });
          money -= ticket / 2;
        }
      }
      // Holding: family office, team, fund.
      if (!s.familyOffice) actions.push({ type: "foundFamilyOffice" });
      else {
        const associates = s.team.filter((m) => m.role === "associate");
        if (associates.length < Math.min(3, active.length - 3) && s.cash > 200_000) actions.push({ type: "hire", role: "associate" });
        if (!s.team.some((m) => m.role === "partner") && s.cash > 500_000) actions.push({ type: "hire", role: "partner" });
        // Associates look after the weakest mandates; the player keeps the best.
        const weakest = [...ranked].reverse().filter((x) => !s.team.some((m) => m.mandate === x.id));
        associates
          .filter((m) => !m.mandate || !active.some((x) => x.id === m.mandate))
          .forEach((m, i) => {
            if (weakest[i] && ranked.indexOf(weakest[i]!) >= 2) actions.push({ type: "assign", memberId: m.id, startupId: weakest[i]!.id });
          });
        if (!s.fund) actions.push({ type: "raiseFund" });
      }
      // The network works for the best company.
      const best = ranked[0];
      if (best) {
        for (const id of ["growth", "vertrieb", "recruiter", "steuer", "anwalt", "angels", "vcpartner", "foerder", "dealflow"]) {
          const c = s.contacts.find((x) => x.id === id);
          if (!c || !ringOpen(s, contactDef(id).ring)) continue;
          if (c.lastIntro !== undefined && s.month - c.lastIntro < INTRO_COOLDOWN) continue;
          if (c.met && c.warmth >= WARMTH_INTRO_MIN) {
            const target = id === "growth" || id === "vertrieb" || id === "vcpartner" ? best : (ranked.find((x) => x.metrics.axes.finance < 60) ?? best);
            if (id !== "angels" || shares) actions.push({ type: "introContact", contactId: id, startupId: target.id });
          } else if (["growth", "vertrieb", "angels", "dealflow"].includes(id)) actions.push({ type: "meetContact", contactId: id });
        }
        if (shares && best.metrics.trust >= 50 && promise(best) > 0.03) actions.push({ type: "askShares", startupId: best.id });
      }
      // A fast car saves the travel day on far jobs.
      if (!s.garage.includes("elektro") && s.reputation >= 40 && s.cash > 400_000) actions.push({ type: "buyVehicle", vehicleId: "elektro" });
      return [...actions, ...expertBoard(s, analyst, random)];
    },
    end: (s) => {
      if (!depot) return [];
      const spare = s.cash - (30_000 + fixedCosts(s) * 4);
      if (spare < 5_000) return [];
      const calm = s.market.regime === "boom" || s.market.regime === "normal";
      return [{ type: "trade", assetId: calm ? "tech" : "tagesgeld", amount: Math.floor(spare * 0.995) }];
    },
  };
};

/** Board work like the analyst, then the best-paid jobs with the quickest travel. */
function expertBoard(s: GameState, analyst: Bot, random: () => number): GameAction[] {
  const view = { ...s, startups: s.startups.map((x) => (x.status === "offered" ? { ...x, status: "declined" as const } : x)), rounds: [] };
  const board = analyst.month(view, random).filter((a) => a.type !== "gig");
  const used = board.reduce((sum, a) => sum + (a.type === "meeting" || a.type === "founderCall" || a.type === "pretalk" || (a.type === "cfo" && !officeOf(s).analyst) ? 1 : 0), 0);
  let left = daysLeft(s) - used - 4;
  const gigs: GameAction[] = [];
  for (const g of s.gigs.filter((x) => x.status === "offered").sort((a, b) => b.fee / b.days - a.fee / a.days)) {
    const trip = travelOptions(s, g)
      .filter((o) => !o.locked && o.cost <= Math.max(500, s.cash * 0.02))
      .sort((a, b) => a.days - b.days || a.cost - b.cost)[0];
    if (!trip) continue;
    const days = Math.max(1, g.days + trip.days - (g.days >= 3 ? 1 : 0));
    if (days <= left) {
      gigs.push({ type: "gig", gigId: g.id, travel: trip.id, approach: boldChance(trip) >= 0.7 ? "bold" : "safe" });
      left -= days;
    }
  }
  return [...board, ...gigs];
}

function target(v: Vote): number {
  return v === "go" ? 0.85 : v === "conditions" ? 0.1 : -0.85;
}

export interface BotRun {
  bot: string;
  seed: number;
  months: number;
  finalValue: number;
  cash: number;
  reputation: number;
  dead: number;
  exited: number;
  sold: number;
  office: number;
  corporate: boolean;
  ledRounds: number;
  career: number;
  mandates: number;
  buyouts: number;
  ipos: number;
  judgments: Record<"strong" | "fair" | "weak", number>;
  /** Net worth at the end of each month (index 0 = after month 1). */
  worth: number[];
  /** Income lines of all month reports, summed up. */
  income: Record<string, number>;
}

export function runBot(bot: Bot, seed: number, months: number): BotRun {
  let state = newGame(seed);
  const worth: number[] = [];
  const income: Record<string, number> = {};
  const play = (actions: GameAction[], stopWhenBusy: boolean) => {
    for (const action of actions) {
      try {
        state = applyAction(state, action).state;
      } catch (error) {
        if (!(error instanceof GameRuleError)) throw error;
      }
      if (stopWhenBusy && daysLeft(state) <= 0) break;
    }
  };
  for (let m = 0; m < months; m++) {
    const random = randomFor(seed, `bot|${m}`);
    play(bot.month(state, random), true);
    if (bot.end) play(bot.end(state), false);
    const result = applyAction(state, { type: "closeMonth" });
    state = result.state;
    if (result.result.kind === "report") for (const [k, v] of Object.entries(result.result.report.income ?? {})) income[k] = (income[k] ?? 0) + (v ?? 0);
    worth.push(netWorth(state));
  }
  const judgments = { strong: 0, fair: 0, weak: 0 };
  for (const i of state.items) if (i.decision && !i.decision.lapsed) judgments[i.decision.judgment]++;
  return {
    bot: bot.name,
    seed,
    months,
    finalValue: portfolioValue(state) + state.cash + holdingsValue(state.market),
    cash: state.cash,
    reputation: state.reputation,
    dead: state.startups.filter((s) => s.status === "dead").length,
    exited: state.startups.filter((s) => s.status === "exited").length,
    sold: state.startups.filter((s) => s.status === "sold").length,
    office: state.office,
    corporate: state.corporateSeat === "joined",
    ledRounds: state.ledRounds,
    career: careerOf(state).level,
    mandates: state.startups.filter((s) => s.joined > 0 && !s.corporate).length,
    buyouts: state.startups.filter((s) => s.flags.includes("mittelstand") && s.joined > 0).length,
    ipos: state.exits.filter((e) => e.ipo && e.status === "accepted").length,
    judgments,
    worth,
    income,
  };
}
