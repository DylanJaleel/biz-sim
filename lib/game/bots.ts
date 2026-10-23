import { templateOf } from "./content";
import { applyAction, daysLeft, GameRuleError, netWorth, newGame, openItems, portfolioValue, previewMeeting, randomFor, startupOf } from "./engine";
import { holdingsValue } from "./market";
import { OFFICES } from "./office";
import { careerOf } from "./career";
import { valuation } from "./sim";
import { bestVote, outlook, VOTES } from "./judge";
import { travelOptions } from "./travel";
import { activeMandates, mandateCapacity } from "./mna";
import { ddCost, mnaRead } from "./mna-core";
import { DD_MODULES, type DdModule } from "./mna-config";
import { activeSearch, searchBlocker, searchCandidates, structureDeal } from "./lbo";
import { annualEbitda, sizeMultiple } from "./ebitda";
import { platformBlocker, platformOf } from "./platform";
import type { GameAction, GameState, Vote } from "./types";

// Skript-Spieler für die Balance: Sie spielen das Spiel über die echte Engine.

export interface Bot {
  name: string;
  /** Which offered startup to invest in. */
  pick: (state: GameState) => string | null;
  /** Actions for one month, executed in order; failing actions are skipped. */
  month: (state: GameState, random: () => number) => GameAction[];
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
      return [...mnaActions(s, "mogul"), ...actions, ...base.month(s, random)];
    },
  };
};

/** The mogul with a taste for leverage: maximum debt, no reviews, fast integrations, more add-ons. */
export const peBot = (prefer?: string): Bot => {
  const base = mogulBot(prefer);
  return {
    name: "PE-Profi",
    pick: base.pick,
    month: (s, random) => [...mnaActions(s, "pe"), ...base.month(s, random).filter((a) => !["acquire", "examine", "platform", "search"].includes(a.type))],
  };
};

const STYLE = {
  mogul: { bank: 0.45, vendor: 0.1, earnout: 0.1, dd: DD_MODULES, addonDd: ["financial", "legal"] as DdModule[], integration: "careful" as const, cashShare: 0.6, sellAddons: 3, sellMonths: 30 },
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
      else {
        const mid = (m.comps[0] + m.comps[1]) / 2;
        out.push(
          m.side === "sell"
            ? { type: "mandate", mandateId: m.id, move: "launch", multiple: Math.round(mid * 10) / 10, buyers: "mixed", process: "auction", dd: ["financial", "legal"] }
            : { type: "mandate", mandateId: m.id, move: "launch", multiple: Math.round(mid * 0.95 * 10) / 10, process: "exclusive", dd: ["financial", "commercial"] },
        );
      }
    }
    if (m.status === "bids" && m.bids?.length) {
      if (m.side === "sell" && m.process === "auction" && m.bids.length >= 2) out.push({ type: "mandate", mandateId: m.id, move: "final" });
      else if (m.side === "buy" && m.bids[0]!.ev > m.wish) out.push({ type: "mandate", mandateId: m.id, move: "negotiate" });
      else out.push({ type: "mandate", mandateId: m.id, move: "accept_bid" });
    }
  }
  const worth = netWorth(s);
  const owned = s.startups.filter((x) => x.status === "active" && x.lbo);
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
    if (s.reputation < 55 || owned.length >= (style === "pe" ? 2 : 1)) break;
    const ebitda = annualEbitda(o.metrics);
    if (o.offer!.multiple! > sizeMultiple(ebitda) + 0.4) continue;
    const structure = structureDeal(o.offer!.ev!, ebitda, st, s.market.regime, o.offer!.stake);
    const ddTodo = st.dd.filter((m) => !(o.offer!.dd ?? []).includes(m));
    const ddMoney = ddTodo.reduce((sum, m) => sum + ddCost(m, o.offer!.ev!), 0);
    if (structure.equity + structure.fees + ddMoney > s.cash * st.cashShare) continue;
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
  if (!p.sale && !s.exits.some((e) => e.startupId === platform.id && e.status === "open") && (p.addons.length >= st.sellAddons || age >= st.sellMonths) && p.integrations.length === 0 && platform.lbo?.status === "ok") {
    out.push({ type: "platform", startupId: platform.id, move: "sell", process: "auction", buyers: "strategic" });
    return out;
  }
  const busy = p.integrations.length;
  for (const a of mna.addons.filter((x) => x.platformId === platform.id && x.status === "open")) {
    if (p.sale || (style === "mogul" && busy >= 1 + s.team.filter((t) => t.role === "partner").length)) break;
    const todo = st.addonDd.filter((m) => !a.dd.includes(m));
    if (todo.length > 0) out.push({ type: "examine", targetId: a.id, modules: todo });
    out.push({ type: "acquire", targetId: a.id, bid: "ask", bank: 0.6, vendor: st.vendor, earnout: st.earnout, integration: st.integration });
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
  /** Net worth at the end of each game year. */
  curve: number[];
  mna: ReturnType<typeof mnaRead>["record"];
}

export function runBot(bot: Bot, seed: number, months: number): BotRun {
  let state = newGame(seed);
  const curve: number[] = [];
  for (let m = 0; m < months; m++) {
    const random = randomFor(seed, `bot|${m}`);
    for (const action of bot.month(state, random)) {
      try {
        state = applyAction(state, action).state;
      } catch (error) {
        if (!(error instanceof GameRuleError)) throw error;
      }
      if (daysLeft(state) <= 0) break;
    }
    state = applyAction(state, { type: "closeMonth" }).state;
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
    curve,
    mna: mnaRead(state).record,
  };
}
