import { templateOf } from "./content";
import { applyAction, covenantsOf, daysLeft, GameRuleError, netWorth, newGame, openItems, portfolioValue, previewMeeting, randomFor, startupOf, syndicateBlocker } from "./engine";
import { covenantOutlook, optionValues } from "./covenants";
import { holdingsValue } from "./market";
import { OFFICES, officeOf } from "./office";
import { careerOf } from "./career";
import { potentialGrowth, valuation } from "./sim";
import { bestOf, VOTES } from "./judge";
import { boldChance, garageUpkeep, travelOptions } from "./travel";
import { playerAmount } from "./captable";
import { contactDef, ringOpen } from "./network";
import { BUYOUT_REPUTATION, INTRO_COOLDOWN, LEAD_REPUTATION, LIVING_COSTS, WARMTH_INTRO_MIN } from "./config";
import { activeMandates, mandateCapacity } from "./mna";
import { ddCost, mnaRead } from "./mna-core";
import { DD_MODULES, type DdModule } from "./mna-config";
import { activeSearch, searchBlocker, searchCandidates, structureDeal } from "./lbo";
import { annualEbitda, sizeMultiple } from "./ebitda";
import { platformBlocker, platformOf } from "./platform";
import { networkActions } from "./network-bots";
import { ventureActions } from "./venture-bots";
import { companyValue } from "./venture";
import { currentMandates, hireFee, integrationCapacity, leadOf, OP_PROFILES, opTypeOf, profileOf } from "./team";
import { addonFit, fitKnown, HOLDCO } from "./holdco";
import { wealthActions } from "./wealth-bots";
import type { CovenantId, GameAction, GameState, MandateLever, Startup, Vote } from "./types";

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

/** Votes at random, argues at random; with conditions, any of the three. */
export const randomBot = (prefer?: string): Bot => ({
  name: "Zufall",
  pick: (s) => firstAffordable(s, prefer),
  month: (s, random) => [
    ...investActions(s, firstAffordable(s, prefer), false),
    ...openItems(s).map((i) => {
      const t = templateOf(i.templateId);
      const arg = t.arguments[Math.floor(random() * 3)]!;
      const vote = VOTES[Math.floor(random() * 3)]!;
      const options = covenantsOf(s, i).options;
      const covenant = vote === "conditions" ? options[Math.floor(random() * options.length)] : undefined;
      return { type: "meeting", itemId: i.id, argument: arg.id, vote, ...(covenant ? { covenant } : {}) } as GameAction;
    }),
  ],
});

/** Follow-up meetings that are due: one day each, so the conditions work in full. */
function followUps(state: GameState): GameAction[] {
  return state.items
    .filter((i) => i.followUp && !i.followUp.done && !i.followUp.missed && i.decision && i.decision.month < state.month && state.month <= i.followUp.until)
    .filter((i) => startupOf(state, i.startupId).status === "active")
    .map((i) => ({ type: "followUp", itemId: i.id }) as GameAction);
}

/**
 * Always the middle: argues for conditions and picks the first condition on
 * offer, without asking what the risk is. Follows its conditions up.
 */
export const conditionsBot = (prefer?: string): Bot => ({
  name: "Immer Auflagen",
  pick: (s) => firstAffordable(s, prefer),
  month: (s) => [
    ...investActions(s, firstAffordable(s, prefer), false),
    ...followUps(s),
    ...openItems(s).map((i) => {
      const t = templateOf(i.templateId);
      const arg = t.arguments.find((a) => a.toward === "conditions") ?? t.arguments[1]!;
      return { type: "meeting", itemId: i.id, argument: arg.id, vote: "conditions", covenant: covenantsOf(s, i).options[0] } as GameAction;
    }),
    ...gigActions(s, 6),
  ],
});

/** What the CFO's numbers recommend: yes, no, or the condition that fits. */
export function analystChoice(state: GameState, itemId: string): { vote: Vote; covenant?: CovenantId } {
  const item = state.items.find((i) => i.id === itemId)!;
  const planned = covenantOutlook(templateOf(item.templateId), startupOf(state, item.startupId), covenantsOf(state, item));
  const best = bestOf(optionValues(planned));
  return best === "go" || best === "no" ? { vote: best } : { vote: "conditions", covenant: best as CovenantId };
}

/**
 * Prepares like a careful board member: CFO view, talks to the member most
 * likely to swing, argues for the best plan and votes for it.
 */
export const analystBot = (prefer?: string): Bot => ({
  name: "Analyst",
  pick: (s) => firstAffordable(s, prefer),
  month: (s) => {
    const actions: GameAction[] = [...investActions(s, firstAffordable(s, prefer), true), ...followUps(s)];
    for (const item of openItems(s)) {
      const t = templateOf(item.templateId);
      const startup = startupOf(s, item.startupId);
      // The CFO talk (one day, below) is what makes the numbers known.
      const choice = analystChoice(s, item.id);
      const best = choice.vote;
      const argument = t.arguments.find((a) => a.toward === best) ?? t.arguments[0]!;
      const stances = previewMeeting(s, item.id).stancesBefore;
      const swing = startup.board
        .filter((m) => m.seat !== "ceo" && m.interests.some((i) => argument.appeals.includes(i)))
        .sort((a, b) => Math.abs(stances[a.seat] - target(best)) - Math.abs(stances[b.seat] - target(best)))
        .reverse()[0];
      actions.push({ type: "cfo", itemId: item.id });
      if (swing) actions.push({ type: "pretalk", itemId: item.id, seat: swing.seat });
      actions.push({ type: "meeting", itemId: item.id, argument: argument.id, vote: best, ...(choice.covenant ? { covenant: choice.covenant } : {}) });
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
 * bank loan, founds the family office, hires operating partners and raises a fund.
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
        if (o.offer!.ev) continue;
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
        // Operating partners: the platform and bought companies first, then the rest.
        const order = [...active].sort((a, b) => Number(Boolean(b.platform)) - Number(Boolean(a.platform)) || Number(Boolean(b.lbo)) - Number(Boolean(a.lbo)));
        actions.push(...teamActions(s, order.slice(0, Math.max(0, active.length - 1)), 3, 150_000));
        if (!s.fund) actions.push({ type: "raiseFund" });
      }
      return [...wealthActions(s, "mogul"), ...networkActions(s, "mogul"), ...mnaActions(s, "mogul"), ...actions, ...base.month(s, random)];
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
        // On the venture path the last round's price is the yardstick.
        const value = companyValue(c);
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
        if (active.length >= 4 + Math.min(3, s.team.length) * 1.5) break;
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
        // Operating partners look after the platform and the weakest companies; the player keeps the best two.
        const delegate = [...ranked.filter((x) => x.platform), ...[...ranked].reverse().filter((x) => !x.platform && ranked.indexOf(x) >= 2)];
        actions.push(...teamActions(s, delegate, 3, 200_000));
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
      return [
        ...networkActions(s, "expert"),
        ...actions,
        ...ventureActions(s, free()),
        ...wealthActions(s, "expert"),
        ...mnaActions(s, "mogul"),
        ...expertBoard(s, analyst, random),
      ];
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

/** The mogul with a taste for leverage: maximum debt, no reviews, fast integrations, more add-ons. */
export const peBot = (prefer?: string): Bot => {
  const base = mogulBot(prefer);
  return {
    name: "PE-Profi",
    pick: base.pick,
    month: (s, random) => [
      ...wealthActions(s, "pe"),
      ...networkActions(s, "pe"),
      ...mnaActions(s, "pe"),
      ...base.month(s, random).filter((a) => !["acquire", "examine", "platform", "search", "specialist", "favor", "event", "estate", "foundation", "dynasty"].includes(a.type)),
    ],
  };
};

const STYLE = {
  mogul: {
    bank: 0.45,
    vendor: 0.1,
    earnout: 0.1,
    dd: DD_MODULES,
    addonDd: ["financial", "legal", "commercial"] as DdModule[],
    integration: "careful" as const,
    cashShare: 0.6,
    sellAddons: 3,
    sellMonths: 30,
  },
  pe: { bank: 0.6, vendor: 0.2, earnout: 0.15, dd: [] as DdModule[], addonDd: [] as DdModule[], integration: "fast" as const, cashShare: 0.85, sellAddons: 4, sellMonths: 36 },
};

/**
 * Mandates, succession programme and buy-and-build as a bot plays them:
 * advise first, then fund a search, buy what it finds, make it a platform,
 * add smaller firms and sell the group.
 */
export function mnaActions(s: GameState, style: keyof typeof STYLE): GameAction[] {
  const st = STYLE[style];
  const out: GameAction[] = [];
  const mna = mnaRead(s);
  // Investment banking: take mandates, analyse, run an auction, close.
  for (const m of mna.mandates) {
    if (m.status === "offered" && activeMandates(s).length < mandateCapacity(s) && daysLeft(s) >= 6) out.push({ type: "mandate", mandateId: m.id, move: "accept" });
    if (m.status === "offered" || m.status === "prep") {
      if (!m.comps) out.push({ type: "mandate", mandateId: m.id, move: "comps" });
      else if (m.big && !m.big.teaser)
        // Large mandate: an honest teaser with size, margin, plan and every known problem.
        out.push({
          type: "mandate",
          mandateId: m.id,
          move: "teaser",
          facts: m.big.facts.filter((f) => f.finding || ["revenue", "ebitda", "plan"].includes(f.id)).map((f) => f.id),
        });
      if (m.comps) {
        const mid = (m.comps[0] + m.comps[1]) / 2;
        out.push(
          m.side === "sell"
            ? { type: "mandate", mandateId: m.id, move: "launch", multiple: Math.round(mid * 10) / 10, buyers: "mixed", process: "auction", dd: ["financial", "legal"] }
            : { type: "mandate", mandateId: m.id, move: "launch", multiple: Math.round(mid * 0.95 * 10) / 10, process: "exclusive", dd: ["financial", "commercial"] },
        );
      }
    }
    if (m.status === "bids" && m.bids?.length && m.big) {
      // Three rounds on the best bidder: competition, best and final, competition again; then the award.
      const top = [...m.bids].filter((b) => !b.out).sort((a, b) => b.ev - a.ev)[0];
      const levers: MandateLever[] = ["batna", "bnf", "batna"];
      for (const lever of levers.slice(m.big.rounds)) if (top) out.push({ type: "mandate", mandateId: m.id, move: "round", bidder: top.buyer, lever });
      out.push({ type: "mandate", mandateId: m.id, move: "accept_bid" });
    } else if (m.status === "bids" && m.bids?.length) {
      if (m.side === "sell" && m.process === "auction" && m.bids.length >= 2) out.push({ type: "mandate", mandateId: m.id, move: "final" });
      else if (m.side === "buy" && m.bids[0]!.ev > m.wish) out.push({ type: "mandate", mandateId: m.id, move: "negotiate" });
      else out.push({ type: "mandate", mandateId: m.id, move: "accept_bid" });
    }
  }
  const worth = netWorth(s);
  const owned = s.startups.filter((x) => x.status === "active" && x.lbo);
  // A bought company: separate the liability with an intermediate holding.
  if (!s.holdco && s.familyOffice !== undefined && owned.length > 0 && s.cash > HOLDCO.cost * 5) out.push({ type: "holdco" });
  // The bank wants money: pay if possible.
  for (const x of owned.filter((y) => y.lbo!.status === "cure" && y.lbo!.cure && y.lbo!.cure.amount <= s.cash)) out.push({ type: "platform", startupId: x.id, move: "cure" });
  // Fund a search while no company of the programme is owned.
  if (!activeSearch(s) && owned.length === 0 && searchBlocker(s, worth) === null) {
    const best = searchCandidates(s)
      .map((c, i) => ({ i, score: c.operator + c.network - c.cost / 500 }))
      .sort((a, b) => b.score - a.score)[0]!;
    out.push({ type: "search", move: "start", candidate: best.i });
  }
  // Targets: review, then buy at a fair price with bank, seller loan and earn-out.
  for (const o of s.startups.filter((x) => x.status === "offered" && x.offer?.ev)) {
    if (s.reputation < BUYOUT_REPUTATION || owned.length >= (style === "pe" ? 2 : 1)) break;
    const ebitda = annualEbitda(o.metrics);
    if (o.offer!.multiple! > sizeMultiple(ebitda) + 0.4) continue;
    const structure = structureDeal(o.offer!.ev!, ebitda, st, s.market.regime, o.offer!.stake);
    const ddTodo = st.dd.filter((m) => !(o.offer!.dd ?? []).includes(m));
    const ddMoney = ddTodo.reduce((sum, m) => sum + ddCost(m, o.offer!.ev!), 0);
    if (structure.equity + structure.fees + ddMoney > s.cash * st.cashShare) continue;
    const duel = o.offer!.duel;
    if (duel?.status === "open") {
      // Bidding war: the concept first, then small raises up to a limit; above it, walk away.
      const cap = o.offer!.ev! * (style === "pe" ? 1.1 : 1.06);
      if (!duel.concept) out.push({ type: "duel", targetId: o.id, move: "concept" });
      for (let i = 1; i <= 2 && duel.you + o.offer!.ev! * 0.04 * i <= cap; i++) out.push({ type: "duel", targetId: o.id, move: "raise", size: "small" });
    }
    if (ddTodo.length > 0) out.push({ type: "examine", targetId: o.id, modules: ddTodo });
    out.push({ type: "acquire", targetId: o.id, bid: "ask", bank: st.bank, vendor: st.vendor, earnout: st.earnout });
  }
  const platform = platformOf(s);
  if (!platform) {
    const base = owned.filter((x) => platformBlocker(s, x) === null).sort((a, b) => annualEbitda(b.metrics) - annualEbitda(a.metrics))[0];
    if (base) out.push({ type: "platform", startupId: base.id, move: "make" });
    return out;
  }
  const p = platform.platform!;
  const age = s.month - p.since;
  if (
    !p.sale &&
    !s.exits.some((e) => e.startupId === platform.id && e.status === "open") &&
    (p.addons.length >= st.sellAddons || age >= st.sellMonths) &&
    p.integrations.length === 0 &&
    platform.lbo?.status === "ok"
  ) {
    out.push({ type: "platform", startupId: platform.id, move: "sell", process: "auction", buyers: "strategic" });
    return out;
  }
  const busy = p.integrations.length;
  for (const a of mna.addons.filter((x) => x.platformId === platform.id && x.status === "open")) {
    if (p.sale || (style === "mogul" && busy >= integrationCapacity(s, platform))) break;
    // Known misfits are left alone; a careful buyer checks the fit first and decides next month.
    if (fitKnown(s, a) && addonFit(s, a).level === "bad") continue;
    const todo = st.addonDd.filter((m) => !a.dd.includes(m));
    if (todo.length > 0) out.push({ type: "examine", targetId: a.id, modules: todo });
    if (todo.includes("commercial") && !fitKnown(s, a)) continue;
    out.push({ type: "acquire", targetId: a.id, bid: "ask", bank: 0.6, vendor: st.vendor, earnout: st.earnout, integration: st.integration });
  }
  return out;
}

/** Hires operating partners while companies lack a lead, and gives each free company to the best-fitting partner with room. */
function teamActions(s: GameState, companies: Startup[], max: number, minCash: number): GameAction[] {
  const out: GameAction[] = [];
  const free = companies.filter((c) => !c.corporate && !leadOf(s, c));
  const room = s.team.reduce((n, m) => n + Math.max(0, profileOf(m).capacity - currentMandates(m).length), 0);
  if (s.team.length < max && free.length > room && s.cash > minCash) {
    const want = opTypeOf(free[0]!);
    const pick = OP_PROFILES.filter((p) => !s.team.some((m) => m.profile === p.id) && hireFee(p) < s.cash * 0.2).sort((a, b) => b.strengths[want] - a.strengths[want])[0];
    if (pick) out.push({ type: "hire", role: "operating", profile: pick.id });
  }
  const spare = new Map(s.team.map((m) => [m.id, profileOf(m).capacity - currentMandates(m).length]));
  for (const c of free) {
    const t = opTypeOf(c);
    const best = s.team.filter((m) => (spare.get(m.id) ?? 0) > 0).sort((a, b) => profileOf(b).strengths[t] - profileOf(a).strengths[t])[0];
    if (!best) break;
    out.push({ type: "assign", memberId: best.id, startupId: c.id });
    spare.set(best.id, spare.get(best.id)! - 1);
  }
  return out;
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
  /** Net worth at the end of each game year. */
  curve: number[];
  mna: ReturnType<typeof mnaRead>["record"];
  /** Fund family, studio and venture path at the end (for the balance report). */
  venture?: { unicorn: boolean; paths: string[]; funds: number; studio: number; trust?: number; votes: string[]; fund?: string };
}

export function runBot(bot: Bot, seed: number, months: number): BotRun {
  let state = newGame(seed);
  const worth: number[] = [];
  const income: Record<string, number> = {};
  const curve: number[] = [];
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
    if ((m + 1) % 12 === 0) curve.push(netWorth(state));
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
    curve,
    mna: mnaRead(state).record,
    venture: {
      unicorn: state.startups.some((s) => s.venture?.unicorn !== undefined && (s.venture.unicornStake ?? 0) > 0),
      paths: state.startups
        .filter((s) => s.venture)
        .map((s) => `${s.venture!.stage}${s.venture!.unicorn ? "U" : ""}${s.venture!.ended ? "x" : ""}${s.status === "exited" ? "e" : ""}`),
      funds: (state.fund ? 1 : 0) + (state.funds?.later.length ?? 0),
      studio: state.studio?.founded ?? 0,
      trust: state.funds?.trust,
      votes: (state.funds?.votes ?? []).map((v) => `${v.kind}:${v.status}`),
      fund: [state.fund, ...(state.funds?.later ?? [])]
        .map((f) => (f ? `${f.name}@${f.raised} ${Math.round((f.invested / f.size) * 100)}% of ${Math.round(f.size / 1e6)}M` : ""))
        .join(" | "),
    },
  };
}
