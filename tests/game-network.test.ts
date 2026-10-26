import { describe, expect, it } from "vitest";
import { expertBot, runBot } from "../lib/game/bots";
import { applyAction, closeMonth, ctxOf, daysLeft, newGame, startupOf, upgradeState } from "../lib/game/engine";
import { acquireDeal, targetDeal } from "../lib/game/lbo";
import { ddCost, mnaOf } from "../lib/game/mna-core";
import { CONTACTS, contactDef, networkOf, personOf } from "../lib/game/network";
import {
  BAL_REFUSE,
  GENEROUS,
  INTERIM,
  LEVFIN_HEADROOM,
  RIVAL_PREMIUM,
  SPECIALIST_DD_SHARE,
  SPECIALIST_WARMTH_COST,
  SUCCESSOR_WARMTH,
  WARMTH_DECAY_RING,
} from "../lib/game/network-config";
import { EVENTS, eventIn } from "../lib/game/network-events";
import { networkMonth, planNetwork } from "../lib/game/network-life";
import { hintText, networkPage, networkTasks } from "../lib/game/network-views";
import { parseAction } from "../lib/game/validate";
import type { Favor, GameAction, GameState } from "../lib/game/types";

const act = (state: GameState, action: GameAction) => applyAction(state, action).state;
const contact = (state: GameState, id: string) => state.contacts.find((c) => c.id === id)!;

function invested(seed = 7): GameState {
  return act(newGame(seed), { type: "invest", startupId: "pendelwerk" });
}

/** A game where everybody is known and warm. */
function connected(state: GameState, warmth = 60): GameState {
  return { ...state, reputation: 70, cash: 3_000_000, contacts: state.contacts.map((c) => ({ ...c, met: true, warmth })) };
}

function withFavor(state: GameState, favor: Partial<Favor> = {}): GameState {
  const next = structuredClone(state);
  networkOf(next).favors.push({ id: "f900", contactId: "steuer", kind: "vortrag", month: next.month, expires: next.month + 1, ...favor });
  return next;
}

describe("cast", () => {
  it("draws a different cast for each new game, with the same roles", () => {
    const a = newGame(1);
    const b = newGame(2);
    expect(a.contacts.map((c) => c.id)).toEqual(CONTACTS.map((c) => c.id));
    expect(b.contacts.map((c) => c.id)).toEqual(CONTACTS.map((c) => c.id));
    const names = (s: GameState) => s.contacts.map((c) => personOf(s, c).name);
    expect(names(a)).not.toEqual(names(b));
    expect(new Set(names(a)).size).toBe(names(a).length);
    // Roles keep their meaning: the bank helps with a loan in every game.
    expect(contactDef("bank").kind).toBe("loan");
    expect(a.contacts.filter((c) => c.met).map((c) => c.id)).toEqual(["steuer", "vertrieb", "anwalt"]);
  });

  it("older games keep the classic people and get the new specialists when needed", () => {
    const state = invested();
    const old = structuredClone(state) as GameState;
    old.contacts = old.contacts
      .filter((c) => ["steuer", "vertrieb", "anwalt", "recruiter", "bank", "angels", "growth", "vcpartner", "einkauf", "foerder", "dealflow"].includes(c.id))
      .map((c) => ({ id: c.id, warmth: c.warmth, met: c.met }));
    delete old.network;
    const up = upgradeState(old);
    expect(personOf(up, contact(up, "steuer")).name).toBe("Katrin Albers");
    expect(personOf(up, contact(up, "steuer")).role).toBe("Steuerberaterin");
    let next = act(up, { type: "closeMonth" });
    next = act({ ...next, reputation: 40 }, { type: "meetContact", contactId: "wp" });
    expect(contact(next, "wp").met).toBe(true);
    expect(networkPage(next).contacts).toHaveLength(CONTACTS.length);
  });
});

describe("favours", () => {
  it("saying yes costs days, warms the relationship and fills the trust account", () => {
    const state = withFavor(invested(), { kind: "neffe" });
    const days = daysLeft(state);
    const warmth = contact(state, "steuer").warmth;
    const after = act(state, { type: "favor", favorId: "f900", accept: true });
    expect(daysLeft(after)).toBe(days - 1);
    expect(contact(after, "steuer").warmth).toBe(warmth + 12);
    expect(contact(after, "steuer").bal).toBe(1);
    expect(after.network!.favors).toHaveLength(0);
    expect(after.network!.log.given).toBe(1);
    expect(after.lessons).toContain("reziprozitaet");
  });

  it("saying no or letting it run out cools the relationship", () => {
    const state = withFavor(invested());
    const warmth = contact(state, "steuer").warmth;
    const no = act(state, { type: "favor", favorId: "f900", accept: false });
    expect(contact(no, "steuer").warmth).toBe(warmth - 10);
    expect(contact(no, "steuer").bal).toBe(-1);
    // Not answered: it lapses at the end of the following month.
    let lapsed = act(state, { type: "closeMonth" });
    expect(lapsed.network!.favors.some((f) => f.id === "f900")).toBe(true);
    lapsed = act(lapsed, { type: "closeMonth" });
    expect(lapsed.network!.favors.some((f) => f.id === "f900")).toBe(false);
    expect(lapsed.network!.log.lapsed).toBe(1);
    expect(contact(lapsed, "steuer").bal).toBe(-1);
  });

  it("contacts ask now and then, by letter with a deadline", () => {
    let state = invested();
    let asked = 0;
    for (let m = 0; m < 18; m++) {
      for (const f of state.network?.favors ?? []) {
        expect(f.expires).toBe(f.month + 1);
        expect(state.mails.some((x) => x.favorId === f.id && x.action === "favor")).toBe(true);
        asked += 1;
        state = act(state, { type: "favor", favorId: f.id, accept: false });
      }
      state = act(state, { type: "closeMonth" });
    }
    expect(asked).toBeGreaterThan(1);
    expect(state.network!.favors.length).toBeLessThanOrEqual(2);
  });

  it("a guarantee is sometimes called; a favour sometimes pays", () => {
    let called = 0;
    let paid = 0;
    for (let i = 0; i < 40; i++) {
      const base = invested(i + 1);
      const g = act(withFavor(base, { id: `f${i}`, kind: "buergschaft" }), { type: "favor", favorId: `f${i}`, accept: true });
      if (g.cash < base.cash) called += 1;
      const m = act(withFavor(base, { id: `f${i}`, kind: "mandant" }), { type: "favor", favorId: `f${i}`, accept: true });
      if (m.cash > base.cash) paid += 1;
    }
    expect(called).toBeGreaterThan(0);
    expect(called).toBeLessThan(15);
    expect(paid).toBeGreaterThan(10);
  });
});

describe("give and take", () => {
  it("someone who only takes hears no", () => {
    let state = invested();
    state = { ...state, contacts: state.contacts.map((c) => (c.id === "vertrieb" ? { ...c, bal: BAL_REFUSE, warmth: 80 } : c)) };
    expect(() => act(state, { type: "introContact", contactId: "vertrieb", startupId: "pendelwerk" })).toThrow(/Nein/);
  });

  it("someone who gives gets stronger help, a shorter pause and pays less warmth", () => {
    const base = invested();
    const plain = act(base, { type: "introContact", contactId: "steuer", startupId: "pendelwerk" });
    const friend = { ...base, contacts: base.contacts.map((c) => (c.id === "steuer" ? { ...c, bal: 3 } : c)) };
    const strong = act(friend, { type: "introContact", contactId: "steuer", startupId: "pendelwerk" });
    const effect = (s: GameState) => s.effects.find((e) => e.itemId.startsWith("intro-steuer"))!.delta.axes!.finance!;
    expect(effect(strong)).toBeCloseTo(effect(plain) * GENEROUS.strength, 6);
    expect(contact(strong, "steuer").warmth).toBe(50 - GENEROUS.warmthCost);
    expect(contact(strong, "steuer").bal).toBe(2);
    expect(contact(plain, "steuer").bal).toBe(-1);
    // Two months later the generous contact helps again, the other one not yet.
    let a = act(act(strong, { type: "closeMonth" }), { type: "closeMonth" });
    let b = act(act(plain, { type: "closeMonth" }), { type: "closeMonth" });
    a = { ...a, contacts: a.contacts.map((c) => ({ ...c, warmth: 80 })) };
    b = { ...b, contacts: b.contacts.map((c) => ({ ...c, warmth: 80 })) };
    expect(() => act(a, { type: "introContact", contactId: "steuer", startupId: "pendelwerk" })).not.toThrow();
    expect(() => act(b, { type: "introContact", contactId: "steuer", startupId: "pendelwerk" })).toThrow(/gerade erst/);
  });
});

describe("careers", () => {
  it("contacts rise, move and retire; a successor starts cooler and the paper reports it", () => {
    const state = connected(invested(), 80);
    const ctx = ctxOf(state);
    const seen = new Set<string>();
    for (let month = 50; month < 600 && seen.size < 3; month++) {
      for (const c of state.contacts) c.warmth = 80;
      const before = state.contacts.map((c) => ({ id: c.id, name: personOf(state, c).name, lv: c.lv ?? 0 }));
      networkMonth(ctx, month, []);
      for (const c of state.contacts.filter((x) => x.ev?.month === month)) {
        seen.add(c.ev!.kind);
        const b = before.find((x) => x.id === c.id)!;
        if (c.ev!.kind === "up") expect(c.lv).toBe(b.lv + 1);
        if (c.ev!.kind === "new") {
          expect(personOf(state, c).name).not.toBe(b.name);
          expect(c.warmth).toBe(Math.round((80 - WARMTH_DECAY_RING[contactDef(c.id).ring]) * SUCCESSOR_WARMTH));
        }
      }
    }
    expect([...seen].sort()).toEqual(["move", "new", "up"]);
    expect(state.news.some((n) => n.title.startsWith("Personalien"))).toBe(true);
  });

  it("a promoted bank contact lends more", () => {
    const base = connected(invested());
    const up = { ...base, contacts: base.contacts.map((c) => (c.id === "bank" ? { ...c, lv: 2 } : c)) };
    const loan = (s: GameState) => act(s, { type: "introContact", contactId: "bank", startupId: "pendelwerk" }).effects.find((e) => e.itemId.startsWith("intro-bank"))!.delta.cash!;
    expect(loan(up)).toBeGreaterThan(loan(base) * 1.25);
  });
});

describe("rivals", () => {
  it("a contact bids for the same company and pushes the price; a warm relationship makes them step back", () => {
    let found = 0;
    for (let i = 0; i < 30 && found < 1; i++) {
      const state = { ...newGame(i + 1), reputation: 70, cash: 5_000_000, month: 12 };
      const ctx = ctxOf(state);
      const s = targetDeal(ctx, () => 0.5, { ev: 3_000_000, source: "market" });
      const ask = s.offer!.ev!;
      planNetwork(ctx);
      const offer = startupOf(state, s.id).offer!;
      if (!offer.rival) continue;
      found += 1;
      expect(offer.ev).toBe(Math.round((ask * (1 + RIVAL_PREMIUM)) / 10_000) * 10_000);
      const rival = offer.rival.contactId;
      expect(networkTasks(state).some((t) => t.text.includes("bietet mit"))).toBe(true);
      const warm = { ...state, contacts: state.contacts.map((c) => (c.id === rival ? { ...c, met: true, warmth: 45 } : c)) };
      const after = act(warm, { type: "meetContact", contactId: rival });
      expect(startupOf(after, s.id).offer!.ev).toBe(ask);
      expect(startupOf(after, s.id).offer!.rival!.defused).toBe(true);
    }
    expect(found).toBe(1);
  });
});

describe("specialists", () => {
  function deal(seed = 7) {
    const state = connected(invested(seed));
    const s = targetDeal(ctxOf(state), () => 0.5, { ev: 3_000_000, source: "referral", from: "Test" });
    return { state, id: s.id };
  }

  it("the auditor does financial and tax due diligence in one day for half the fee", () => {
    const { state, id } = deal();
    const ev = startupOf(state, id).offer!.ev!;
    const fee = Math.round(((ddCost("financial", ev) + ddCost("tax", ev)) * SPECIALIST_DD_SHARE) / 500) * 500;
    const after = act(state, { type: "specialist", contactId: "wp", targetId: id });
    expect(after.cash).toBe(state.cash - fee);
    expect(daysLeft(after)).toBe(daysLeft(state) - 1);
    expect(startupOf(after, id).offer!.dd).toEqual(["financial", "tax"]);
    for (const f of startupOf(after, id).findings ?? []) expect(Boolean(f.found)).toBe(f.module === "financial" || f.module === "tax");
    expect(contact(after, "wp").warmth).toBe(60 - SPECIALIST_WARMTH_COST);
    expect(contact(after, "wp").bal).toBe(-1);
    // Specialists do not help startups.
    expect(() => act(after, { type: "introContact", contactId: "wp", startupId: "pendelwerk" })).toThrow(/nicht bei Startups/);
  });

  it("the leveraged-finance banker loosens the covenant of the bought company", () => {
    const { state, id } = deal();
    let next = act(state, { type: "specialist", contactId: "levfin", targetId: id });
    next = act(next, { type: "acquire", targetId: id, bid: "ask", bank: 0.5, vendor: 0, earnout: 0 });
    const s = startupOf(next, id);
    expect(s.status).toBe("active");
    expect(s.lbo!.headroom).toBe(LEVFIN_HEADROOM);
    const plain = act(deal().state, { type: "acquire", targetId: id, bid: "ask", bank: 0.5, vendor: 0, earnout: 0 });
    expect(s.lbo!.rate).toBeLessThan(startupOf(plain, id).lbo!.rate);
  });

  it("an interim manager makes handovers smoother", () => {
    let withHer = 0;
    let without = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const run = (interim: boolean) => {
        let state = connected(newGame(seed), 80);
        const ctx = ctxOf(state);
        const s = targetDeal(ctx, () => 0.5, { ev: 2_500_000, source: "market" });
        acquireDeal(ctx, s, { bid: "ask", bank: 0.4, vendor: 0, earnout: 0 });
        if (interim) {
          state = act(state, { type: "specialist", contactId: "interim", targetId: s.id });
          expect(startupOf(state, s.id).lbo!.interim).toBe(state.month + INTERIM.months);
        }
        for (let m = 0; m < 6; m++) closeMonth(state);
        return startupOf(state, s.id).lbo?.handover.length ?? 0;
      };
      withHer += run(true);
      without += run(false);
    }
    expect(withHer).toBeLessThan(without);
  });

  it("the M&A boutique brings a mandate", () => {
    const state = connected(invested());
    const after = act(state, { type: "specialist", contactId: "boutique" });
    expect(mnaOf(after).mandates.some((m) => m.status === "offered")).toBe(true);
    expect(() => act(after, { type: "specialist", contactId: "boutique" })).toThrow();
  });

  it("a hint before the meeting costs warmth, not days, and points to the fitting condition", () => {
    let state = invested();
    state = act(state, { type: "closeMonth" });
    const item = state.items.find((i) => i.status === "open")!;
    const fit = item.covenants!.fit;
    const expert = CONTACTS.find((c) => c.hint?.includes(fit) && c.ring === 1);
    const who = expert?.id ?? "steuer";
    const after = act(state, { type: "contactHint", contactId: who, itemId: item.id });
    expect(daysLeft(after)).toBe(daysLeft(state));
    expect(contact(after, who).warmth).toBe(contact(state, who).warmth - 10);
    expect(after.items.find((i) => i.id === item.id)!.tip).toBe(who);
    if (expert) expect(hintText(after, who, item.id)).toContain("bestehen");
    expect(() => act(after, { type: "contactHint", contactId: who, itemId: item.id })).toThrow(/schon einen Hinweis/);
  });
});

describe("events", () => {
  it("invitations come a month ahead; going costs days and money and warms several contacts at once", () => {
    let state = invested();
    let event: { id: string; month: number } | undefined;
    for (let m = 0; m < 14 && !event; m++) {
      state = act({ ...state, reputation: 60, cash: Math.max(state.cash, 200_000) }, { type: "closeMonth" });
      event = state.network?.events.find((e) => e.status === "invited" && e.month === state.month + 1);
    }
    expect(event).toBeDefined();
    expect(state.mails.some((m) => m.eventId === event!.id && m.action === "event")).toBe(true);
    state = act(state, { type: "event", eventId: event!.id, move: "accept" });
    expect(state.network!.events.find((e) => e.id === event!.id)!.status).toBe("accepted");
    state = connected(state, 50);
    const cash = state.cash;
    const after = act(state, { type: "closeMonth" });
    const def = eventIn(after.month)!;
    expect(after.calendar.some((c) => c.kind === "event" && c.label === def.name)).toBe(true);
    expect(after.network!.events.find((e) => e.id === event!.id)!.status).toBe("attended");
    expect(after.network!.log.events).toBe(1);
    expect(after.cash).toBeLessThan(cash + 10_000);
    const warmer = def.guests.filter((id) => contact(after, id).warmth > 50 - WARMTH_DECAY_RING[contactDef(id).ring]);
    expect(warmer.length).toBeGreaterThanOrEqual(2);
  });

  it("some events need reputation, and a talk brings reputation", () => {
    expect(EVENTS.some((e) => e.minReputation >= 60)).toBe(true);
    let state = invested();
    const forum = EVENTS.find((e) => e.id === "fo_forum")!;
    for (let m = 0; m < 12; m++) state = act({ ...state, reputation: 30 }, { type: "closeMonth" });
    expect(state.network!.events.some((e) => e.def === forum.id)).toBe(false);
  });
});

describe("save size", () => {
  it("stays bounded over a long game", { timeout: 60_000 }, () => {
    const run = runBot(expertBot(), 3, 96);
    expect(run.worth.length).toBe(96);
    let state = newGame(3);
    for (let m = 0; m < 60; m++) {
      for (const f of state.network?.favors ?? []) state = act(state, { type: "favor", favorId: f.id, accept: m % 2 === 0 });
      for (const e of state.network?.events ?? []) if (e.status === "invited") state = act(state, { type: "event", eventId: e.id, move: "decline" });
      state = act({ ...state, cash: Math.max(state.cash, 100_000) }, { type: "closeMonth" });
    }
    const net = state.network!;
    expect(net.favors.length).toBeLessThanOrEqual(2);
    expect(net.events.length).toBeLessThanOrEqual(2);
    expect(net.ties.length).toBeLessThanOrEqual(30);
    expect(JSON.stringify(net).length + JSON.stringify(state.contacts).length).toBeLessThan(4_000);
  });
});

describe("parsing", () => {
  it("parses the network moves", () => {
    expect(parseAction({ type: "favor", favorId: "f3", accept: true })).toEqual({ type: "favor", favorId: "f3", accept: true });
    expect(parseAction({ type: "favor", favorId: "f3", accept: "yes" })).toBeNull();
    expect(parseAction({ type: "event", eventId: "ev5", move: "accept", talk: true })).toEqual({ type: "event", eventId: "ev5", move: "accept", talk: true });
    expect(parseAction({ type: "event", eventId: "ev5", move: "maybe" })).toBeNull();
    expect(parseAction({ type: "specialist", contactId: "wp", targetId: "d12" })).toEqual({ type: "specialist", contactId: "wp", targetId: "d12" });
    expect(parseAction({ type: "specialist", contactId: "boutique" })).toEqual({ type: "specialist", contactId: "boutique" });
    expect(parseAction({ type: "contactHint", contactId: "steuer", itemId: "v3" })).toEqual({ type: "contactHint", contactId: "steuer", itemId: "v3" });
  });
});
