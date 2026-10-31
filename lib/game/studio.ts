import { generateDeal, SECTORS, FIRST, LAST } from "./dealgen";
import { mnaRandom } from "./lbo";
import { personOf } from "./network";
import { monthDays } from "./office";
import { offerStartup, type StartupDefinition } from "./startups";
import { applyDelta, valuation } from "./sim";
import { askLpacForStudio, familyRead, fundsOf, investingFund, termsOf } from "./funds";
import type { Ctx } from "./mna-core";
import type { CeoFit, GameState, Startup, StudioCeo, StudioIdea, StudioState, StudioTranche } from "./types";
import {
  LPAC_SEAT_DAYS,
  STUDIO_BUILD_MONTHS,
  STUDIO_CEO_MIN,
  STUDIO_DAYS,
  STUDIO_ESOP,
  STUDIO_EXITS,
  STUDIO_FOUND_DAYS,
  STUDIO_KEEP,
  STUDIO_MAX,
  STUDIO_MILESTONE,
  STUDIO_POOL_MONTHS,
  STUDIO_REPUTATION,
  STUDIO_TRANCHE_DAYS,
  STUDIO_TRANCHES,
  TRANCHE_SIZE,
} from "./venture-config";

// Venture Studio: Statt auf Gründer zu warten, suchst du die Idee aus, holst
// einen CEO und gibst das Geld in Tranchen frei, wenn Meilensteine stehen.
// Bis zu zwei Studio-Firmen gleichzeitig, jede kostet Tage im Monat.

const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

export const FIT_LABEL: Record<CeoFit, string> = { sales: "Vertrieb", product: "Produkt", lead: "Führung" };

function exitsDone(state: GameState): number {
  return state.exits.filter((e) => e.status === "accepted").length;
}

/** Why the studio is still closed, or null. */
export function studioBlocker(state: GameState): string | null {
  if (state.reputation < STUDIO_REPUTATION) return `Ein Venture Studio startest du ab Ruf ${STUDIO_REPUTATION}. Gründer und Investoren müssen deinen Namen kennen.`;
  const exits = exitsDone(state);
  if (exits < STUDIO_EXITS) return `Dafür brauchst du ${STUDIO_EXITS} erfolgreiche Verkäufe, bisher ${exits}. Erst wer verkauft hat, weiß, wofür man eine Firma baut.`;
  return null;
}

/** Text for the menu while the studio is closed. */
export function studioLock(reputation: number, exits: number): string | null {
  return reputation >= STUDIO_REPUTATION && exits >= STUDIO_EXITS ? null : `ab Ruf ${STUDIO_REPUTATION} und ${STUDIO_EXITS} Verkäufen`;
}

const period = (month: number) => Math.floor(month / STUDIO_POOL_MONTHS);

/** The ideas on the table this half-year; pure, derived from the seed. */
function drawPool(state: GameState, p: number): StudioIdea[] {
  const r = mnaRandom(state, `studio|pool|${p}`);
  const taken = new Set(state.startups.map((s) => s.name));
  const ideas: StudioIdea[] = [];
  const count = 4 + Math.floor(r() * 3);
  const warm = state.contacts.filter((c) => c.met && c.warmth >= 40).sort((a, b) => b.warmth - a.warmth)[0];
  const mine = state.startups.filter((s) => s.status === "active" && s.stake > 0 && !s.corporate);
  for (let i = 0; i < count * 3 && ideas.length < count; i++) {
    const sec = SECTORS[Math.floor(r() * SECTORS.length) % SECTORS.length]!;
    const idea = sec.ideas[Math.floor(r() * sec.ideas.length) % sec.ideas.length]!;
    const name = idea.name.join("");
    if (taken.has(name) || ideas.some((x) => x.name === name)) continue;
    const pilot = mine.find((s) => s.sector === sec.sector);
    const market = Math.round(35 + r() * 50 + (pilot ? 8 : 0));
    const riskRoll = r();
    const risk: StudioIdea["risk"] = pilot ? (riskRoll < 0.6 ? "low" : "mid") : riskRoll < 0.3 ? "low" : riskRoll < 0.7 ? "mid" : "high";
    const need = roundTo(380_000 + r() * 1_020_000, 10_000);
    const ceos: StudioCeo[] = [0, 1].map((k) => {
      const fit = (["sales", "product", "lead"] as const)[Math.floor(r() * 3) % 3]!;
      const first = FIRST[Math.floor(r() * FIRST.length) % FIRST.length]!;
      const last = LAST[Math.floor(r() * LAST.length) % LAST.length]!;
      const via = k === 1 && warm ? personOf(state, warm).name : undefined;
      return { name: `${first} ${last}`, short: first, fit, strength: Math.round(45 + r() * 35 + (via ? 10 : 0)), ask: Math.round(12 + r() * 16), ...(via ? { via } : {}) };
    });
    ideas.push({
      id: `idea${p}-${ideas.length}`,
      name,
      tagline: idea.tagline,
      pitch: idea.pitch,
      sector: sec.sector,
      market,
      risk,
      need,
      ...(pilot ? { pilot: pilot.name } : {}),
      ceos,
    });
  }
  return ideas;
}

/** The studio for writing; the pool is drawn anew every six months. */
function studioOf(state: GameState): StudioState {
  const p = period(state.month);
  if (!state.studio) state.studio = { pool: drawPool(state, p), period: p, founded: 0 };
  else if (state.studio.period !== p) state.studio = { ...state.studio, pool: drawPool(state, p), period: p };
  return state.studio;
}

/** Read-only view of the studio, with this half-year's ideas. */
export function studioRead(state: GameState): StudioState {
  const p = period(state.month);
  if (state.studio && state.studio.period === p) return state.studio;
  return { pool: drawPool(state, p), period: p, founded: state.studio?.founded ?? 0 };
}

/** Studio companies still in the building phase: they take days every month. */
export function building(state: GameState): Startup[] {
  return state.startups.filter((s) => s.status === "active" && s.studio && s.studio.built === undefined);
}

export function studioCompanies(state: GameState): Startup[] {
  return state.startups.filter((s) => s.studio && s.status !== "offered" && s.status !== "declined");
}

/** Next tranche to release (index), or -1 when all are out. */
export function nextTranche(s: Startup): number {
  return s.studio ? s.studio.tranches.findIndex((t) => t.released === undefined) : -1;
}

export interface Milestone {
  label: string;
  done: boolean;
  /** Progress 0..1 and its text. */
  progress: number;
  text: string;
}

export function milestone(s: Startup, index: number): Milestone {
  const m = s.metrics;
  const k = (v: number) => `${Math.round(v / 1000).toLocaleString("de-DE")} Tsd. €`;
  switch (index) {
    case 1: {
      const p = Math.max(m.axes.product / STUDIO_MILESTONE.prototypeProduct, m.revenue / STUDIO_MILESTONE.prototypeRevenue);
      return {
        label: "Prototyp",
        done: p >= 1,
        progress: Math.min(1, p),
        text: `Produkt ${Math.round(m.axes.product)} von ${STUDIO_MILESTONE.prototypeProduct} oder ${k(m.revenue)} von ${k(STUDIO_MILESTONE.prototypeRevenue)} Umsatz im Monat`,
      };
    }
    case 2: {
      const p = m.revenue / STUDIO_MILESTONE.customers;
      return {
        label: "100 Kunden",
        done: p >= 1,
        progress: Math.min(1, p),
        text: `${k(m.revenue)} von ${k(STUDIO_MILESTONE.customers)} Umsatz im Monat (rund ${Math.min(100, Math.round(p * 100))} Kunden)`,
      };
    }
    case 3: {
      const p = m.revenue / STUDIO_MILESTONE.arr;
      return { label: "1 Mio. € ARR", done: p >= 1, progress: Math.min(1, p), text: `${k(m.revenue * 12)} von 1.000 Tsd. € Jahresumsatz` };
    }
    default:
      return { label: "Gründung", done: true, progress: 1, text: "Gründungskapital eingezahlt" };
  }
}

export function trancheAmount(s: Startup, index: number, size: keyof typeof TRANCHE_SIZE = "plan"): number {
  const t = s.studio?.tranches[index];
  return t && s.studio ? roundTo(s.studio.need * t.share * TRANCHE_SIZE[size].money, 1000) : 0;
}

/** Capital the player puts in for an idea at a chosen starting share. */
export function studioNeed(idea: StudioIdea, keep: number): number {
  return roundTo((idea.need * keep) / 70, 10_000);
}

function ceoHolder(s: Startup) {
  return s.capTable.find((h) => h.id === "ceo");
}

export function playStudio(ctx: Ctx, action: { move: string; ideaId?: string; ceo?: number; keep?: number; startupId?: string; size?: "lean" | "plan" | "big" }): void {
  const state = ctx.state;
  switch (action.move) {
    case "found": {
      const why = studioBlocker(state);
      if (why) ctx.fail(why);
      if (building(state).length >= STUDIO_MAX) ctx.fail(`Mehr als ${STUDIO_MAX} Studio-Firmen gleichzeitig im Aufbau schaffst du nicht.`);
      const studio = studioOf(state);
      const idea = studio.pool.find((i) => i.id === action.ideaId);
      if (!idea) ctx.fail("Diese Idee liegt nicht mehr auf dem Tisch.");
      const ceo = idea.ceos[action.ceo ?? 0];
      if (!ceo) ctx.fail("Diese Kandidatin gibt es nicht.");
      const keep = action.keep ?? 70;
      if (!(STUDIO_KEEP as readonly number[]).includes(keep)) ctx.fail("Wähle 60, 70 oder 80 % Startanteil.");
      const need = studioNeed(idea, keep);
      const seed = roundTo(need * STUDIO_TRANCHES[0].share, 1000);
      if (state.cash < seed) ctx.fail(`Für das Gründungskapital fehlen dir ${eur(seed - state.cash)}.`);
      ctx.spend("studio", `Gründung ${idea.name}`, STUDIO_FOUND_DAYS);
      state.cash -= seed;
      const s = foundCompany(ctx, idea, ceo, keep, need, seed);
      studio.founded += 1;
      studio.pool = studio.pool.filter((i) => i.id !== idea.id);
      ctx.lesson("venture_studio");
      const ceoPct = 100 - keep - STUDIO_ESOP;
      ctx.mail({
        kind: "founder",
        from: `${ceo.name}, ${s.name}`,
        subject: `${s.name} ist gegründet`,
        body: `Danke für dein Vertrauen. ${s.name} startet mit ${eur(seed)} Gründungskapital. Du hältst ${keep} %, ich ${ceoPct} %, ${STUDIO_ESOP} % sind für das Team reserviert.${ceoPct < ceo.ask ? ` Ehrlich gesagt hatte ich mit ${ceo.ask} % gerechnet.` : ""} Die nächste Tranche gibt es, wenn der Prototyp steht. Bis dahin brauche ich dich ${STUDIO_DAYS} Tage im Monat.`,
        startupId: s.id,
      });
      return;
    }
    case "tranche": {
      const s = state.startups.find((x) => x.id === action.startupId);
      if (!s?.studio || s.status !== "active") ctx.fail("Das ist keine aktive Studio-Firma.");
      const i = nextTranche(s);
      if (i < 0) ctx.fail("Alle Tranchen sind freigegeben.");
      const ms = milestone(s, i);
      if (!ms.done) ctx.fail(`Der Meilenstein „${ms.label}“ ist noch nicht erreicht: ${ms.text}.`);
      const size = action.size ?? "plan";
      const amount = trancheAmount(s, i, size);
      if (state.cash < amount) ctx.fail(`Für diese Tranche fehlen dir ${eur(amount - state.cash)}.`);
      ctx.spend("studio", `Tranche ${s.name}`, STUDIO_TRANCHE_DAYS);
      state.cash -= amount;
      const terms = TRANCHE_SIZE[size];
      let next = applyDelta(s, {
        cash: amount,
        opex: Math.round(amount / 16 / 100) * 100,
        growth: 0.004 * terms.money,
        axes: { product: 3, market: 2 },
        morale: terms.shift < 0 ? 8 : terms.shift > 0 ? -8 : 2,
        trust: terms.shift < 0 ? 6 : terms.shift > 0 ? -6 : 2,
      });
      const ceo = ceoHolder(next);
      let shift: number = terms.shift;
      if (ceo && shift > 0) shift = Math.min(shift, Math.max(0, ceo.pct - 4));
      if (ceo && shift < 0) shift = -Math.min(-shift, Math.max(0, next.stake - 26));
      if (ceo && shift !== 0) {
        next = { ...next, stake: next.stake + shift, capTable: next.capTable.map((h) => (h.id === "ceo" ? { ...h, pct: h.pct - shift } : h)) };
      }
      const tranches: StudioTranche[] = next.studio!.tranches.map((t, k) => (k === i ? { ...t, released: state.month, amount, size } : t));
      const done = tranches.every((t) => t.released !== undefined);
      next = {
        ...next,
        playerCost: (next.playerCost ?? 0) + amount,
        studio: { ...next.studio!, tranches, ...(done && next.studio!.built === undefined ? { built: state.month } : {}) },
      };
      ctx.replace(next);
      ctx.lesson("stage_gate");
      if (done)
        ctx.mail({
          kind: "founder",
          from: s.name,
          subject: `${s.name} steht auf eigenen Beinen`,
          body: `Mit der letzten Tranche ist der Aufbau im Studio abgeschlossen. Ab jetzt ist ${s.name} eine Beteiligung wie jede andere: Beirat statt Studio-Tage.`,
          startupId: s.id,
        });
      return;
    }
    case "fundAsk": {
      const s = state.startups.find((x) => x.id === action.startupId);
      if (!s?.studio || s.status !== "active") ctx.fail("Das ist keine aktive Studio-Firma.");
      if (s.studio.fundVote) ctx.fail("Der Fonds wurde schon gefragt.");
      const f = investingFund(state);
      if (!f) ctx.fail("Kein eigener Fonds mit freiem Geld.");
      if (familyRead(state).votes.some((v) => v.status === "open" && v.startupId === s.id)) ctx.fail("Der LPAC berät schon darüber.");
      const vote = askLpacForStudio(ctx, s, roundTo(s.studio.need * 0.3, 10_000));
      if (!vote) ctx.fail("Kein eigener Fonds mit freiem Geld.");
      ctx.replace({ ...s, studio: { ...s.studio, fundVote: vote.id } });
      return;
    }
    default:
      ctx.fail("Diesen Schritt gibt es nicht.");
  }
}

function foundCompany(ctx: Ctx, idea: StudioIdea, ceo: StudioCeo, keep: number, need: number, seed: number): Startup {
  const state = ctx.state;
  const id = ctx.id("studio");
  const r = mnaRandom(state, `studio|found|${id}`);
  const base = generateDeal(r, "preseed", id, state.month, new Set(state.startups.map((s) => s.name)));
  const ceoPct = 100 - keep - STUDIO_ESOP;
  const unhappy = Math.max(0, ceo.ask - ceoPct);
  const axes = { ...base.metrics.axes };
  if (ceo.fit === "sales") axes.market = Math.min(95, axes.market + 10);
  if (ceo.fit === "product") axes.product = Math.min(95, axes.product + 10);
  if (ceo.fit === "lead") axes.management = Math.min(95, axes.management + 10);
  axes.management = Math.max(15, Math.min(95, Math.round(axes.management + (ceo.strength - 60) / 3)));
  axes.market = Math.round(axes.market * 0.5 + idea.market * 0.5);
  if (idea.risk === "high") axes.edge = Math.max(15, axes.edge - 10);
  if (idea.risk === "low") axes.edge = Math.min(90, axes.edge + 6);
  axes.finance = Math.max(axes.finance, 55);
  const revenue = roundTo(3_000 + r() * 3_000 + (idea.pilot ? 2_000 : 0), 100);
  const growth = Math.round((0.055 + idea.market / 2000 + (idea.risk === "high" ? 0.012 : idea.risk === "low" ? -0.006 : 0)) * 1000) / 1000;
  const burn = roundTo(seed / 7, 500);
  const grossMargin = base.metrics.grossMargin;
  const def: StartupDefinition = {
    ...base,
    name: idea.name,
    tagline: idea.tagline,
    sector: idea.sector,
    stake: keep,
    capTable: [
      { id: "ceo", name: ceo.name, kind: "founder", pct: ceoPct },
      { id: "esop", name: "Mitarbeiterpool", kind: "esop", pct: STUDIO_ESOP },
    ],
    board: base.board.map((b) =>
      b.seat === "ceo"
        ? { ...b, name: ceo.name, short: ceo.short, title: "CEO aus dem Studio" }
        : b.seat === "vc"
          ? { ...b, title: "Partner:in im Venture Studio" }
          : b.seat === "cto"
            ? { ...b, title: "Produktleitung" }
            : b,
    ),
    metrics: {
      ...base.metrics,
      cash: seed,
      revenue,
      growth,
      opex: roundTo(revenue * grossMargin + burn, 100),
      team: 4,
      morale: Math.max(25, 72 - unhappy * 2 - (ceoPct < STUDIO_CEO_MIN ? 10 : 0)),
      trust: Math.max(30, 64 - unhappy - (ceoPct < STUDIO_CEO_MIN ? 8 : 0)),
      axes,
      topCustomer: idea.pilot ? 0.45 : 0.25,
      debt: 0,
    },
    mail: { from: `${ceo.name}, ${idea.name}`, subject: `${idea.name} ist gegründet`, body: idea.pitch },
    diligence: [],
    arrives: state.month,
    stage: "preseed",
  };
  state.deals.push(def);
  const offered = offerStartup(def, state.month);
  const s: Startup = {
    ...offered,
    status: "active",
    stake: keep,
    joined: state.month,
    playerCost: seed,
    stage: "Studio",
    flags: ["studio"],
    offer: undefined,
    studio: {
      idea: idea.id,
      founded: state.month,
      need,
      tranches: STUDIO_TRANCHES.map((t, i) => ({ label: t.label, share: t.share, ...(i === 0 ? { released: state.month, amount: seed, size: "plan" as const } : {}) })),
    },
    history: [{ month: state.month, revenue, cash: seed, valuation: valuation(def.metrics), stake: keep }],
  };
  delete s.offer;
  state.startups.push(s);
  return s;
}

/** After the month turned: new ideas every half-year, companies that stand on their own leave the studio. */
export function studioMonth(ctx: Ctx, notes: string[]): void {
  const state = ctx.state;
  if (!state.studio) return;
  studioOf(state);
  for (const s of building(state)) {
    if (state.month - s.studio!.founded < STUDIO_BUILD_MONTHS) continue;
    ctx.replace({ ...s, studio: { ...s.studio!, built: state.month } });
    notes.push(`${s.name} verlässt das Studio nach zwei Jahren: ab jetzt ohne Studio-Tage.`);
  }
}

/** Fixed dates at the start of the month: studio work and LPAC meetings take their days first. */
export function fixedDays(state: GameState): void {
  const book = (label: string, days: number, kind: "studio" | "lpac" = "studio") => {
    const free = monthDays(state) - state.daysUsed;
    const take = Math.min(days, Math.max(0, free - 1));
    if (take <= 0) return;
    state.calendar.push({ day: state.daysUsed + 1, days: take, kind, label });
    state.daysUsed += take;
  };
  for (const s of building(state)) book(`Venture Studio: ${s.name}`, STUDIO_DAYS);
  if (state.month % 3 === 0 && (state.fund || state.funds) && fundsOf(state).some((f) => f.closed === undefined && termsOf(f).lpacSeat))
    book("LPAC-Sitzung (Investorenbeirat)", LPAC_SEAT_DAYS, "lpac");
}
