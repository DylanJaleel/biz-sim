import { BUYOUT_REPUTATION, BUYOUT_WORTH, INTRO_COOLDOWN } from "./config";
import { generateDeal } from "./dealgen";
import { dayRate } from "./gigs";
import { activeSearch, annuityOf, targetDeal, targetEv } from "./lbo";
import { BANK_YEARS, HANDOVER_MONTHS, MANDATE_REPUTATION } from "./mna-config";
import { ddCost, eur, mnaOf, type Ctx } from "./mna-core";
import { offerMandate } from "./mna";
import { addBal, balOf, castPerson, contactDef, contactOf, contactRead, introCooldown, networkOf, personOf, refuses, ringOpen, tieKey, type ContactDef } from "./network";
import {
  BAL_FORGIVE_MONTHS,
  BOUTIQUE_COOLDOWN,
  CAREER_CHANCE,
  EVENT_MEET_CHANCE,
  EVENT_MEET_WARMTH,
  EVENT_TRAIT_WARMTH,
  EVENT_WARMTH,
  FAVOR_CHANCE,
  FAVOR_CHANCE_MAX,
  FAVOR_CHANCE_PER_CONTACT,
  FAVOR_DECLINE_WARMTH,
  FAVOR_LAPSE_WARMTH,
  FAVOR_MAX_OPEN,
  FAVOR_PAUSE,
  HINT_WARMTH_COST,
  HINT_WARMTH_MIN,
  INTERIM,
  KARTELL,
  LEVFIN_HEADROOM,
  LEVFIN_RATE_CUT,
  POACH_CHANCE,
  POACH_RAISE,
  RETIRE_AFTER,
  RIVAL_CHANCE,
  RIVAL_PREMIUM,
  RIVAL_WARMTH,
  SPECIALIST_DAYS,
  SPECIALIST_DD_SHARE,
  SPECIALIST_WARMTH_COST,
  SPECIALIST_WARMTH_MIN,
  SUCCESSOR_WARMTH,
  WARMTH_DECAY_RING,
} from "./network-config";
import { eventCost, eventDef, eventIn, type EventDef } from "./network-events";
import { netRandom } from "./network";
import type { ContactState, Favor, FavorKind, GameState, NetEvent, Startup } from "./types";

// Was im Netzwerk von selbst passiert: Kontakte bitten um Gefallen, machen
// Karriere, wechseln die Firma oder gehen in Rente, bieten bei denselben
// Firmen mit. Dazu die Spezialisten für M&A, der Hinweis vor der Sitzung und
// die Veranstaltungen im Jahreskalender.

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function warm(c: ContactState, delta: number): void {
  c.warmth = clamp(Math.round(c.warmth + delta), 0, 100);
}

function nameOf(state: GameState, id: string): string {
  return personOf(state, contactRead(state, id)).name;
}

function rand(state: GameState, purpose: string): () => number {
  return netRandom(state.seed, purpose);
}

// ---------------------------------------------------------------------------
// Gefallen: Kontakte bitten dich um etwas
// ---------------------------------------------------------------------------

export interface FavorDef {
  kind: FavorKind;
  /** Subject line of the letter. */
  subject: string;
  /** The letter; {name} is the contact, {via} the other person or company. */
  body: string;
  /** What saying yes costs, in words. */
  cost: string;
  days: number;
  /** Money out of the player's pocket. */
  cash?: number;
  /** Money out of a portfolio company's account (internship pay). */
  companyCash?: number;
  /** Trust account and warmth gained on yes. */
  bal: number;
  warmth: number;
  /** Something in return, sometimes. */
  reward?: { chance: number; kind: "fee" | "deal" | "reputation" | "tie" };
  /** Always: reputation on yes. */
  reputation?: number;
  /** Small risk on yes: the guarantee is called. */
  risk?: { chance: number; amount: number };
  /** Roles who ask this; all if missing. */
  roles?: string[];
  /** People with these interests ask this more often. */
  traits?: string[];
  needs?: "contact" | "company";
}

export const FAVORS: Record<FavorKind, FavorDef> = {
  mandant: {
    kind: "mandant",
    subject: "Kannst du dir einen Mandanten ansehen?",
    body: "Ein Mandant von mir steckt fest: Nachfolge offen, Bank nervös, Zahlen unklar. Zwei Tage mit deinem Blick von außen würden ihm sehr helfen. Vielleicht zahlt er sogar etwas.",
    cost: "2 Tage, oft mit Honorar",
    days: 2,
    bal: 2,
    warmth: 15,
    reward: { chance: 0.6, kind: "fee" },
    roles: ["steuer", "anwalt", "wp", "kanzlei", "bank", "boutique", "interim"],
    traits: ["zahlen"],
  },
  vortrag: {
    kind: "vortrag",
    subject: "Ein Vortrag bei unserem Unternehmerkreis?",
    body: "Unser Unternehmerkreis trifft sich nächsten Monat. Ein Vortrag von dir über Beiratsarbeit wäre der Höhepunkt des Abends. Honorar gibt es keins, aber Publikum.",
    cost: "1 Tag, bringt etwas Ruf",
    days: 1,
    bal: 1,
    warmth: 10,
    reputation: 1,
    traits: ["gesellig"],
  },
  neffe: {
    kind: "neffe",
    subject: "Das Startup meines Neffen",
    body: "Mein Neffe gründet gerade. Ich bin befangen, du nicht: Schaust du dir das einen Tag lang an und sagst ihm ehrlich, was du denkst?",
    cost: "1 Tag, manchmal wird ein Deal daraus",
    days: 1,
    bal: 1,
    warmth: 12,
    reward: { chance: 0.3, kind: "deal" },
    traits: ["familie"],
  },
  buergschaft: {
    kind: "buergschaft",
    subject: "Ein Brief an die Bank",
    body: "Ein Bekannter braucht für seinen Betrieb einen Kredit, und die Bank will eine persönliche Bürgschaft über 15.000 €. Mit deinem Namen darunter geht es durch. Meistens passiert ja nichts.",
    cost: "Keine Zeit, aber ein kleines Risiko: Die Bürgschaft kann fällig werden",
    days: 0,
    bal: 2,
    warmth: 15,
    risk: { chance: 0.15, amount: 15_000 },
    roles: ["bank", "foerder", "vertrieb", "einkauf", "angels", "steuer", "levfin"],
  },
  treffen: {
    kind: "treffen",
    subject: "Kannst du mich mit {via} bekannt machen?",
    body: "Ich würde gern {via} kennenlernen, und du kennst beide Seiten. Ein Abendessen zu dritt, mehr braucht es nicht.",
    cost: "Keine Zeit, aber ein wenig Wärme bei der anderen Person",
    days: 0,
    bal: 2,
    warmth: 15,
    reward: { chance: 0.35, kind: "tie" },
    needs: "contact",
    traits: ["gesellig"],
  },
  praktikum: {
    kind: "praktikum",
    subject: "Ein Praktikum für meine Tochter",
    body: "Meine Tochter sucht ein Praktikum in einem jungen Unternehmen. Hätte {via} drei Monate Platz für sie? Sie ist fleißig, versprochen.",
    cost: "Keine Zeit, die Firma zahlt 4.000 € Vergütung",
    days: 0,
    companyCash: 4_000,
    bal: 1,
    warmth: 12,
    needs: "company",
    traits: ["familie"],
  },
  spende: {
    kind: "spende",
    subject: "Ein Tisch beim Benefizabend",
    body: "Wir sammeln für das Kinderhospiz. Ein Tisch kostet 3.000 €, und es wäre schön, dich dort zu sehen.",
    cost: "3.000 €, keine Zeit",
    days: 0,
    cash: 3_000,
    bal: 1,
    warmth: 10,
    reward: { chance: 0.25, kind: "reputation" },
    roles: ["foerder", "angels", "einkauf", "steuer", "dealflow", "vcpartner", "levfin", "kartell"],
    traits: ["kultur"],
  },
  zweitmeinung: {
    kind: "zweitmeinung",
    subject: "Eine zweite Meinung zu einem Deal",
    body: "Ich schaue mir gerade eine Firma an und traue meinem eigenen Urteil nicht ganz. Einen Tag deiner Zeit? Wenn es passt, kannst du gern mit einsteigen.",
    cost: "1 Tag, manchmal darfst du mit einsteigen",
    days: 1,
    bal: 1,
    warmth: 10,
    reward: { chance: 0.25, kind: "deal" },
    roles: ["vcpartner", "angels", "dealflow", "growth", "boutique", "levfin"],
    traits: ["zahlen"],
  },
  jury: {
    kind: "jury",
    subject: "In die Jury beim Gründerwettbewerb?",
    body: "Uns fehlt ein Jurymitglied mit Erfahrung. Ein Tag, zehn Pitches, danach Abendessen. Manche Teams suchen danach einen Angel.",
    cost: "1 Tag, etwas Ruf, manchmal ein Deal",
    days: 1,
    bal: 1,
    warmth: 10,
    reputation: 1,
    reward: { chance: 0.2, kind: "deal" },
    roles: ["foerder", "angels", "growth", "recruiter", "vcpartner"],
    traits: ["sport"],
  },
};

const FAVOR_KINDS = Object.keys(FAVORS) as FavorKind[];

/** Text of a favour with names filled in. */
export function favorText(state: GameState, f: Favor): { subject: string; body: string } {
  const def = FAVORS[f.kind];
  const via =
    f.kind === "treffen" && f.via ? nameOf(state, f.via) : f.kind === "praktikum" && f.via ? (state.startups.find((s) => s.id === f.via)?.name ?? "eine deiner Firmen") : "";
  return { subject: def.subject.replace("{via}", via), body: def.body.replace("{via}", via) };
}

function companiesFor(state: GameState): Startup[] {
  return state.startups.filter((s) => s.status === "active" && !s.corporate && s.metrics.cash > 20_000);
}

/** Month start: now and then someone asks. Warm contacts ask more often; nobody asks twice in a short time. */
function planFavors(ctx: Ctx): void {
  const state = ctx.state;
  const net = networkOf(state);
  if (net.favors.length >= FAVOR_MAX_OPEN) return;
  const known = state.contacts.filter((c) => c.met && ringOpen(state, contactDef(c.id).ring));
  if (known.length === 0) return;
  const r = rand(state, `favors|${state.month}`);
  const chance = Math.min(FAVOR_CHANCE_MAX, FAVOR_CHANCE + FAVOR_CHANCE_PER_CONTACT * known.length);
  if (r() > chance) return;
  const askers = known.filter((c) => !net.favors.some((f) => f.contactId === c.id) && (c.lastAsk === undefined || state.month - c.lastAsk >= FAVOR_PAUSE));
  if (askers.length === 0) return;
  const total = askers.reduce((sum, c) => sum + 1 + c.warmth / 50, 0);
  let roll = r() * total;
  const asker = askers.find((c) => (roll -= 1 + c.warmth / 50) < 0) ?? askers[askers.length - 1]!;
  const person = personOf(state, asker);
  const companies = companiesFor(state);
  const others = known.filter((c) => c.id !== asker.id && !hasTie(state, asker.id, c.id) && c.warmth >= 20);
  const options = FAVOR_KINDS.filter((k) => {
    const d = FAVORS[k];
    if (d.roles && !d.roles.includes(asker.id)) return false;
    if (d.needs === "contact" && others.length === 0) return false;
    if (d.needs === "company" && companies.length === 0) return false;
    return true;
  });
  if (options.length === 0) return;
  const weight = (k: FavorKind) => (FAVORS[k].traits?.includes(person.trait) ? 2 : 1);
  let w = r() * options.reduce((sum, k) => sum + weight(k), 0);
  const kind = options.find((k) => (w -= weight(k)) < 0) ?? options[0]!;
  const via =
    kind === "treffen"
      ? others[Math.floor(r() * others.length) % others.length]!.id
      : kind === "praktikum"
        ? companies[Math.floor(r() * companies.length) % companies.length]!.id
        : undefined;
  const favor: Favor = { id: ctx.id("f"), contactId: asker.id, kind, month: state.month, expires: state.month + 1, ...(via ? { via } : {}) };
  net.favors.push(favor);
  asker.lastAsk = state.month;
  const text = favorText(state, favor);
  ctx.mail({
    kind: "network",
    from: `${person.name}, ${person.org}`,
    subject: text.subject,
    body: `${text.body} Antwort bitte bis Ende nächsten Monats. (${FAVORS[kind].cost}.)`,
    action: "favor",
    favorId: favor.id,
  });
}

export function hasTie(state: GameState, a: string, b: string): boolean {
  const key = tieKey(a, b);
  return (state.network?.ties ?? []).includes(key);
}

/** Saying yes or no to a favour. */
export function playFavor(ctx: Ctx, favorId: string, accept: boolean): void {
  const state = ctx.state;
  const net = networkOf(state);
  const f = net.favors.find((x) => x.id === favorId);
  if (!f) ctx.fail("Diese Bitte ist nicht mehr offen.");
  const favor = f!;
  const c = contactOf(state, favor.contactId)!;
  const person = personOf(state, c);
  const def = FAVORS[favor.kind];
  if (!accept) {
    net.favors = net.favors.filter((x) => x.id !== favor.id);
    warm(c, -FAVOR_DECLINE_WARMTH);
    addBal(c, -1);
    net.log.declined += 1;
    ctx.lesson("reziprozitaet");
    return;
  }
  const company = favor.kind === "praktikum" ? state.startups.find((s) => s.id === favor.via && s.status === "active") : undefined;
  if (favor.kind === "praktikum" && !company) ctx.fail("Die Firma gibt es so nicht mehr. Sag ab oder lass die Bitte verstreichen.");
  const other = favor.kind === "treffen" && favor.via ? contactOf(state, favor.via) : undefined;
  if (favor.kind === "treffen" && !other?.met) ctx.fail("Diese Person kennst du nicht gut genug, um sie vorzustellen.");
  if ((def.cash ?? 0) > state.cash) ctx.fail(`Dafür fehlen dir ${eur((def.cash ?? 0) - state.cash)}.`);
  if (def.days > 0) ctx.spend("favor", `Gefallen für ${person.name}`, def.days);
  state.cash -= def.cash ?? 0;
  net.favors = net.favors.filter((x) => x.id !== favor.id);
  warm(c, def.warmth);
  addBal(c, def.bal);
  net.log.given += 1;
  ctx.lesson("reziprozitaet");
  if (def.reputation) ctx.reputation(def.reputation);
  const texts: string[] = [`${person.name} bedankt sich.`];
  const r = rand(state, `favor|${favor.id}`);
  if (company) {
    ctx.replace({ ...company, metrics: { ...company.metrics, cash: company.metrics.cash - (def.companyCash ?? 0), morale: Math.min(100, company.metrics.morale + 1) } });
    texts.push(`${company.name} zahlt ${eur(def.companyCash ?? 0)} Praktikumsvergütung.`);
  }
  if (other) {
    net.ties = [...net.ties.filter((t) => t !== tieKey(c.id, other.id)), tieKey(c.id, other.id)].slice(-30);
    const liked = r() < (def.reward?.chance ?? 0);
    warm(other, liked ? 5 : -5);
    texts.push(liked ? `Auch ${personOf(state, other).name} fand den Abend gut.` : `${personOf(state, other).name} hat dir den Abend zuliebe gemacht.`);
  }
  if (def.risk && r() < def.risk.chance) {
    state.cash -= def.risk.amount;
    texts.push(`Leider wackelt der Betrieb schon jetzt: Die Bank zieht die Bürgschaft, ${eur(def.risk.amount)} gehen von deinem Konto.`);
  }
  if (def.reward && def.reward.kind !== "tie" && r() < def.reward.chance) {
    if (def.reward.kind === "fee") {
      const fee = Math.round((dayRate(state.reputation) * def.days * 0.8) / 50) * 50;
      state.cash += fee;
      texts.push(`Der Mandant zahlt dir ${eur(fee)} Honorar.`);
    } else if (def.reward.kind === "reputation") {
      ctx.reputation(1);
      texts.push("Die Zeitung berichtet über den Abend, auch über dich.");
    } else if (def.reward.kind === "deal") {
      const name = earlyDeal(ctx, r, favor.kind === "zweitmeinung" ? "seed" : "preseed");
      texts.push(`Daraus wird etwas: ${name} bietet dir eine Beteiligung an. Das Angebot liegt in deiner Post.`);
      ctx.lesson("deal_sourcing");
    }
  }
  ctx.mail({ kind: "network", from: person.name, subject: `Danke: ${favorText(state, favor).subject.replace(/\?$/, "")}`, body: texts.join(" ") });
}

/** A startup offered through the network. */
function earlyDeal(ctx: Ctx, r: () => number, stage: "preseed" | "seed"): string {
  const state = ctx.state;
  const def = generateDeal(r, stage, ctx.id("d"), state.month, new Set(state.startups.map((s) => s.name)));
  ctx.addDeal(def);
  return def.name;
}

// ---------------------------------------------------------------------------
// Monatsende: Abkühlen, verpasste Bitten, Karrieren, Abwerben
// ---------------------------------------------------------------------------

/** Month end (before the month counter moves on). */
export function networkMonth(ctx: Ctx, month: number, notes: string[]): void {
  const state = ctx.state;
  for (const c of state.contacts.filter((x) => x.met)) {
    const def = contactDef(c.id);
    warm(c, -WARMTH_DECAY_RING[def.ring]);
    if (month % BAL_FORGIVE_MONTHS === 0 && balOf(c) < 0) addBal(c, 1);
  }
  const net = state.network;
  if (net) {
    for (const f of net.favors.filter((x) => x.expires <= month)) {
      const c = contactOf(state, f.contactId)!;
      warm(c, -FAVOR_LAPSE_WARMTH);
      addBal(c, -1);
      net.log.lapsed += 1;
      notes.push(`${personOf(state, c).name} hat auf deine Antwort gewartet. Die Bitte ist verstrichen, die Beziehung kühlt ab.`);
    }
    net.favors = net.favors.filter((x) => x.expires > month);
  }
  careers(ctx, month, notes);
  poach(ctx, month);
}

function news(state: GameState, title: string, text: string): void {
  state.news.unshift({ month: state.month, title, text, startupIds: [] });
  if (state.news.length > 24) state.news.length = 24;
}

/** Contacts get promoted, change employers or retire; a successor starts cooler. */
function careers(ctx: Ctx, month: number, notes: string[]): void {
  const state = ctx.state;
  for (const c of state.contacts) {
    const def = contactDef(c.id);
    const r = rand(state, `career|${c.id}|${month}`);
    const roll = r();
    const before = personOf(state, c);
    const level = c.lv ?? 0;
    const since = c.since ?? 1;
    let kind: "up" | "move" | "new" | null = null;
    if (roll < CAREER_CHANCE.up && level < 2) {
      c.lv = level + 1;
      kind = "up";
    } else if (roll < CAREER_CHANCE.up + CAREER_CHANCE.move) {
      const orgs = def.orgs.length;
      c.org = ((c.org ?? 0) + 1 + Math.floor(r() * (orgs - 1))) % orgs;
      kind = "move";
    } else if (roll < CAREER_CHANCE.up + CAREER_CHANCE.move + CAREER_CHANCE.retire && month - since >= RETIRE_AFTER) {
      c.p = castPerson(state, c.id, 100 + month * 7 + Math.floor(r() * 50));
      c.lv = Math.max(0, level - 1);
      c.since = month;
      c.warmth = Math.round(c.warmth * SUCCESSOR_WARMTH);
      c.bal = 0;
      delete c.lastIntro;
      delete c.lastAsk;
      kind = "new";
    }
    if (!kind) continue;
    c.ev = { month, kind };
    if (!c.met) continue;
    const after = personOf(state, c);
    const text =
      kind === "up"
        ? `${after.name} ist jetzt ${after.role} bei ${after.org}. Mehr Einfluss heißt: Hilfe wiegt mehr.`
        : kind === "move"
          ? `${after.name} wechselt zu ${after.org}. Die Beziehung bleibt, die Adresse ist neu.`
          : `${before.name} geht in den Ruhestand. Nachfolge bei ${after.org}: ${after.name}. Die Beziehung muss neu wachsen.`;
    const title = kind === "up" ? `Personalien: ${after.name} steigt auf` : kind === "move" ? `Personalien: ${after.name} wechselt` : `Personalien: ${before.name} hört auf`;
    news(state, title, text);
    notes.push(`Netzwerk: ${text}`);
    ctx.mail({ kind: "network", from: "Wirtschaftsblatt, Personalien", subject: title, body: text });
  }
}

/** Contacts who may bid against you: investors and corporations. */
const RIVALS = ["vcpartner", "dealflow", "einkauf"];

/** A rival tries to hire away the searcher of the succession programme; a warm relationship prevents it. */
function poach(ctx: Ctx, month: number): void {
  const state = ctx.state;
  const search = activeSearch(state);
  if (!search) return;
  const r = rand(state, `poach|${search.id}|${month}`);
  if (r() > POACH_CHANCE) return;
  const id = RIVALS[Math.floor(r() * 2) % 2]!;
  const c = contactRead(state, id);
  const who = nameOf(state, id);
  if (c.met && c.warmth >= RIVAL_WARMTH) {
    ctx.mail({
      kind: "network",
      from: who,
      subject: `${search.searcher.name} wäre ein Gewinn`,
      body: `Ich hätte ${search.searcher.name} gern bei uns, aber ich werbe niemanden ab, der für dich sucht. Gruß und viel Erfolg bei der Suche.`,
    });
    return;
  }
  search.searcher = { ...search.searcher, cost: Math.round((search.searcher.cost * (1 + POACH_RAISE)) / 500) * 500 };
  ctx.lesson("deal_sourcing");
  ctx.mail({
    kind: "network",
    from: search.searcher.name,
    subject: "Ein Angebot von der Konkurrenz",
    body: `${who} hat mir eine Stelle angeboten. Ich bleibe, aber nur mit mehr Gehalt: ab jetzt ${eur(search.searcher.cost)} im Monat. Ein besserer Draht zu ${who} hätte das vielleicht verhindert.`,
  });
}

// ---------------------------------------------------------------------------
// Monatsanfang: Bitten, Einladungen, Konkurrenz
// ---------------------------------------------------------------------------

/** Month start, after the calendar was cleared. */
export function planNetwork(ctx: Ctx): void {
  planRivals(ctx);
  defuseRivals(ctx);
  planEvents(ctx);
  planFavors(ctx);
}

/** New offers of family businesses and add-ons: sometimes a contact bids too and the price goes up. */
function planRivals(ctx: Ctx): void {
  const state = ctx.state;
  for (const s of state.startups.filter((x) => x.status === "offered" && x.offer?.ev && x.offer.source !== "search" && !x.offer.rival)) {
    const r = rand(state, `rival|${s.id}`);
    if (r() > RIVAL_CHANCE.deal) continue;
    const id = RIVALS[Math.floor(r() * RIVALS.length) % RIVALS.length]!;
    const offer = s.offer!;
    offer.rival = { contactId: id, base: offer.ev!, premium: RIVAL_PREMIUM };
    const c = contactRead(state, id);
    if (c.met && c.warmth >= RIVAL_WARMTH) {
      offer.rival.defused = true;
      ctx.mail({
        kind: "network",
        from: nameOf(state, id),
        subject: `${s.name}: Ich lasse dir den Vortritt`,
        body: `Ich hätte mir ${s.name} auch angesehen. Aber du warst zuerst da, und wir kennen uns. Ich biete nicht mit.`,
        startupId: s.id,
      });
      continue;
    }
    offer.ev = Math.round((offer.ev! * (1 + RIVAL_PREMIUM)) / 10_000) * 10_000;
    offer.ticket = Math.round((offer.ev * offer.stake) / 100 / 1000) * 1000;
    ctx.lesson("deal_sourcing");
    ctx.mail({
      kind: "network",
      from: s.board.find((b) => b.seat === "ceo")?.name ?? s.name,
      subject: `${s.name}: Es gibt einen zweiten Interessenten`,
      body: `${nameOf(state, id)} (${personOf(state, c).org}) hat ebenfalls ein Angebot abgegeben. Der Preis steigt um ${Math.round(RIVAL_PREMIUM * 100)} % auf ${eur(offer.ev)}. Kennt ihr euch gut (ab ${RIVAL_WARMTH} Wärme), zieht sich die Konkurrenz vielleicht zurück.`,
      startupId: s.id,
    });
  }
  for (const a of mnaOf(state).addons.filter((x) => x.status === "open" && !x.rival)) {
    const r = rand(state, `rival|${a.id}`);
    if (r() > RIVAL_CHANCE.addon) continue;
    const id = RIVALS[Math.floor(r() * RIVALS.length) % RIVALS.length]!;
    a.rival = { contactId: id, base: a.multiple, premium: RIVAL_PREMIUM };
    const c = contactRead(state, id);
    if (c.met && c.warmth >= RIVAL_WARMTH) {
      a.rival.defused = true;
      continue;
    }
    a.multiple = Math.round(a.multiple * (1 + RIVAL_PREMIUM) * 100) / 100;
    ctx.mail({
      kind: "network",
      from: a.owner,
      subject: `${a.name}: Ein zweiter Bieter`,
      body: `Auch ${nameOf(state, id)} interessiert sich für ${a.name}. Mein Preis steigt um ${Math.round(RIVAL_PREMIUM * 100)} %. Eine warme Beziehung (ab ${RIVAL_WARMTH} Wärme) könnte die Konkurrenz zum Rückzug bewegen.`,
      startupId: a.platformId,
    });
  }
}

/** Warm enough now: the rival steps back and the price falls back. */
export function defuseRivals(ctx: Ctx): void {
  const state = ctx.state;
  for (const s of state.startups.filter((x) => x.status === "offered" && x.offer?.rival && !x.offer.rival.defused)) {
    const offer = s.offer!;
    const rival = offer.rival!;
    const c = contactRead(state, rival.contactId);
    if (!c.met || c.warmth < RIVAL_WARMTH) continue;
    offer.ev = rival.base;
    offer.ticket = Math.round((offer.ev * offer.stake) / 100 / 1000) * 1000;
    rival.defused = true;
    ctx.mail({
      kind: "network",
      from: nameOf(state, rival.contactId),
      subject: `${s.name}: Ich ziehe mein Angebot zurück`,
      body: `Wir kennen uns zu gut, um uns gegenseitig den Preis zu verderben. ${s.name} gehört dir, wenn du willst. Der Preis liegt wieder bei ${eur(offer.ev)}.`,
      startupId: s.id,
    });
  }
  for (const a of (state.mna?.addons ?? []).filter((x) => x.status === "open" && x.rival && !x.rival.defused)) {
    const c = contactRead(state, a.rival!.contactId);
    if (!c.met || c.warmth < RIVAL_WARMTH) continue;
    a.multiple = a.rival!.base;
    a.rival!.defused = true;
    ctx.mail({
      kind: "network",
      from: nameOf(state, a.rival!.contactId),
      subject: `${a.name}: Ich bin raus`,
      body: `Ich biete bei ${a.name} nicht weiter mit. Der Verkäufer ist zurück bei seinem alten Preis.`,
      startupId: a.platformId,
    });
  }
}

// ---------------------------------------------------------------------------
// Spezialisten für M&A und Private Equity
// ---------------------------------------------------------------------------

/** Why a contact cannot help right now, or null. */
export function helpBlocker(state: GameState, c: ContactState, def: ContactDef, minWarmth: number): string | null {
  const name = personOf(state, c).name;
  if (!ringOpen(state, def.ring)) return "Dieser Kreis öffnet sich erst mit mehr Ruf.";
  if (!c.met) return `${name} kennst du noch nicht. Erst kennenlernen.`;
  if (refuses(c)) return `${name} sagt Nein: Du hast in letzter Zeit nur genommen. Erst einen Gefallen tun.`;
  if (c.warmth < minWarmth) return `Die Beziehung zu ${name} ist zu kühl. Ab ${minWarmth} Wärme.`;
  return null;
}

export function cooldownLeft(state: GameState, c: ContactState): number {
  // The boutique passes on a mandate only every half year: they are its own business.
  const base = c.id === "boutique" ? BOUTIQUE_COOLDOWN : INTRO_COOLDOWN;
  return c.lastIntro === undefined ? 0 : Math.max(0, introCooldown(c, base) - (state.month - c.lastIntro));
}

/** What a specialist can work on: offered deals, add-ons, mandates or own companies. */
export type SpecialistTarget = { kind: "deal"; s: Startup } | { kind: "addon"; id: string } | { kind: "mandate"; id: string } | { kind: "owned"; s: Startup } | { kind: "none" };

export function specialistTarget(state: GameState, targetId?: string): SpecialistTarget {
  if (!targetId) return { kind: "none" };
  const s = state.startups.find((x) => x.id === targetId);
  if (s?.status === "offered" && s.offer?.ev) return { kind: "deal", s };
  if (s?.status === "active") return { kind: "owned", s };
  if (state.mna?.addons.some((a) => a.id === targetId)) return { kind: "addon", id: targetId };
  if (state.mna?.mandates.some((m) => m.id === targetId)) return { kind: "mandate", id: targetId };
  return { kind: "none" };
}

/** Why this specialist cannot work on this target, or null. Used by the engine and the pages. */
export function specialistBlocker(state: GameState, contactId: string, targetId?: string): string | null {
  const def = contactDef(contactId);
  if (def.kind !== "specialist") return `${def.role}: Diese Hilfe bringst du über „Einbringen“ in eine Firma.`;
  const c = contactRead(state, contactId);
  const why = helpBlocker(state, c, def, SPECIALIST_WARMTH_MIN);
  if (why) return why;
  const wait = cooldownLeft(state, c);
  if (wait > 0) return `${personOf(state, c).name} hat gerade erst geholfen. Wieder in ${wait} ${wait === 1 ? "Monat" : "Monaten"}.`;
  const t = specialistTarget(state, targetId);
  const m = state.month;
  switch (def.spec) {
    case "dd": {
      const modules = def.ddModules ?? [];
      if (t.kind === "deal") return modules.every((x) => (t.s.offer!.dd ?? []).includes(x)) ? "Diese Prüfung ist schon gemacht." : null;
      if (t.kind === "addon") {
        const a = state.mna!.addons.find((x) => x.id === t.id)!;
        if (a.status !== "open") return "Dieser Zukauf steht nicht mehr zur Wahl.";
        return modules.every((x) => a.dd.includes(x)) ? "Diese Prüfung ist schon gemacht." : null;
      }
      if (t.kind === "mandate") {
        const md = state.mna!.mandates.find((x) => x.id === t.id)!;
        if (md.status !== "prep") return "Die Prüfung gehört in die Vorbereitung des Mandats.";
        return (md.spec ?? []).includes(contactId) ? "Die Prüfung ist schon gemacht." : null;
      }
      return "Wähle eine Zielfirma, einen Zukauf oder ein Mandat in Vorbereitung.";
    }
    case "levfin": {
      if (t.kind === "deal") return (t.s.offer!.spec ?? []).includes(contactId) ? "Die Finanzierung ist schon verhandelt." : null;
      if (t.kind === "owned") {
        if (!t.s.lbo || t.s.lbo.bank <= 0) return "Die Firma hat keinen Bankkredit.";
        return t.s.lbo.headroom ? "Der Kredit ist schon nachverhandelt." : null;
      }
      return "Wähle eine Übernahme oder eine eigene Firma mit Bankkredit.";
    }
    case "interim": {
      if (t.kind !== "owned" || !t.s.lbo) return "Wähle eine gekaufte Firma in der Übergabe oder eine Plattform mit laufender Integration.";
      if ((t.s.lbo.interim ?? 0) >= m) return "Die Interim-Managerin ist schon vor Ort.";
      const handover = m - t.s.lbo.acquired < HANDOVER_MONTHS;
      const integrating = (t.s.platform?.integrations.length ?? 0) > 0;
      if (!handover && !integrating) return "Die Übergabe ist vorbei und es läuft keine Integration.";
      return null;
    }
    case "kartell": {
      if (t.kind !== "addon") return "Wähle einen Zukauf deiner Plattform.";
      const a = state.mna!.addons.find((x) => x.id === t.id)!;
      if (a.status !== "open" && a.status !== "review") return "Dieser Zukauf steht nicht mehr zur Wahl.";
      return (a.spec ?? []).includes(contactId) ? "Die Anmeldung ist schon vorbereitet." : null;
    }
    case "boutique": {
      if (state.reputation < MANDATE_REPUTATION) return `M&A-Mandate gibt es ab ${MANDATE_REPUTATION} Ruf.`;
      if ((state.mna?.mandates ?? []).some((x) => x.status === "offered")) return "Es liegt schon eine Mandatsanfrage vor.";
      return null;
    }
  }
  return "Dabei kann diese Person nicht helfen.";
}

/** A specialist works for you: one day, some warmth, a fee for some. */
export function playSpecialist(ctx: Ctx, contactId: string, targetId?: string): void {
  const state = ctx.state;
  const c = contactOf(state, contactId);
  if (!c) ctx.fail("Diesen Kontakt gibt es nicht.");
  const contact = c!;
  const why = specialistBlocker(state, contactId, targetId);
  if (why) {
    if (refuses(contact)) networkOf(state).log.refusals += 1;
    ctx.fail(why);
  }
  const def = contactDef(contactId);
  const person = personOf(state, contact);
  const t = specialistTarget(state, targetId);
  const label = (what: string) => `${person.name}: ${what}`;
  let text = "";
  switch (def.spec) {
    case "dd": {
      const modules = def.ddModules ?? [];
      if (t.kind === "mandate") {
        const md = mnaOf(state).mandates.find((x) => x.id === t.id)!;
        ctx.spend("specialist", label(`Prüfung ${md.company}`), SPECIALIST_DAYS);
        for (const f of md.findings) if (modules.includes(f.module)) f.found = true;
        md.spec = [...(md.spec ?? []), contactId];
        const found = md.findings.filter((f) => modules.includes(f.module));
        text = found.length > 0 ? `Gefunden: ${found.map((f) => f.title).join(", ")}. Besser jetzt als beim Käufer.` : "Nichts gefunden, was einen Käufer stören würde.";
        break;
      }
      const deal = t.kind === "deal" ? t.s : undefined;
      const addon = t.kind === "addon" ? mnaOf(state).addons.find((x) => x.id === t.id)! : undefined;
      const done = deal ? (deal.offer!.dd ?? []) : addon!.dd;
      const todo = modules.filter((x) => !done.includes(x));
      const price = deal ? deal.offer!.ev! : (addon!.revenue * addon!.grossMargin - addon!.opex) * 12 * addon!.multiple;
      const fee = Math.round((todo.reduce((sum, x) => sum + ddCost(x, price), 0) * SPECIALIST_DD_SHARE) / 500) * 500;
      if (state.cash < fee) ctx.fail(`Das Honorar beträgt ${eur(fee)}. Dafür reicht dein Konto nicht.`);
      ctx.spend("specialist", label(`Prüfung ${deal ? deal.name : addon!.name}`), SPECIALIST_DAYS);
      state.cash -= fee;
      const findings = deal ? (deal.findings ?? []) : addon!.findings;
      for (const f of findings) if (todo.includes(f.module)) f.found = true;
      if (deal) deal.offer = { ...deal.offer!, dd: [...done, ...todo], spec: [...(deal.offer!.spec ?? []), contactId] };
      else {
        addon!.dd = [...done, ...todo];
        addon!.spec = [...(addon!.spec ?? []), contactId];
      }
      const found = findings.filter((f) => todo.includes(f.module));
      text = `Honorar ${eur(fee)}, die Hälfte des Üblichen. ${found.length > 0 ? `Gefunden: ${found.map((f) => f.title).join(", ")}.` : "Keine Auffälligkeiten."}`;
      ctx.lesson("dd_bausteine");
      break;
    }
    case "levfin": {
      if (t.kind === "deal") {
        ctx.spend("specialist", label(`Finanzierung ${t.s.name}`), SPECIALIST_DAYS);
        t.s.offer = { ...t.s.offer!, spec: [...(t.s.offer!.spec ?? []), contactId] };
        text = `Bei der Übernahme von ${t.s.name} gibt die Bank ${LEVFIN_HEADROOM.toLocaleString("de-DE")} × EBITDA mehr Spielraum beim Covenant und ${(LEVFIN_RATE_CUT * 100).toLocaleString("de-DE")} Prozentpunkte weniger Zins.`;
      } else if (t.kind === "owned") {
        ctx.spend("specialist", label(`Refinanzierung ${t.s.name}`), SPECIALIST_DAYS);
        ctx.replace(withLevfin(t.s));
        text = `Die Bank lockert den Covenant von ${t.s.name} um ${LEVFIN_HEADROOM.toLocaleString("de-DE")} × EBITDA und senkt den Zins.`;
      }
      ctx.lesson("covenant");
      break;
    }
    case "interim": {
      const s = (t as { s: Startup }).s;
      ctx.spend("specialist", label(`Interim-Mandat ${s.name}`), SPECIALIST_DAYS);
      ctx.replace({ ...s, metrics: { ...s.metrics, cash: s.metrics.cash - INTERIM.fee }, lbo: { ...s.lbo!, interim: state.month + INTERIM.months } });
      text = `${person.name} ist ab sofort sechs Monate in ${s.name}. Das Honorar von ${eur(INTERIM.fee)} zahlt die Firma.`;
      ctx.lesson("pmi");
      break;
    }
    case "kartell": {
      const a = mnaOf(state).addons.find((x) => x.id === (t as { id: string }).id)!;
      if (state.cash < KARTELL.fee) ctx.fail(`Das Honorar beträgt ${eur(KARTELL.fee)}.`);
      ctx.spend("specialist", label(`Fusionskontrolle ${a.name}`), SPECIALIST_DAYS);
      state.cash -= KARTELL.fee;
      a.spec = [...(a.spec ?? []), contactId];
      text = `Die Anmeldung für ${a.name} ist vorbereitet. Das Kartellamt untersagt jetzt nur noch selten.`;
      break;
    }
    case "boutique": {
      ctx.spend("specialist", label("Mandat vermitteln"), SPECIALIST_DAYS);
      offerMandate(ctx);
      text = "Eine Familie sucht einen Berater für ihren Firmenverkauf oder -kauf. Die Anfrage liegt bei deinen Aufträgen.";
      ctx.lesson("deal_sourcing");
      break;
    }
  }
  warm(contact, -SPECIALIST_WARMTH_COST);
  addBal(contact, -1);
  contact.lastIntro = state.month;
  const net = networkOf(state);
  net.log.specialists += 1;
  ctx.lesson("berater_mna");
  ctx.mail({ kind: "network", from: person.name, subject: def.result.replace("{name} ", "").replace(/\.$/, ""), body: `${def.result.replace("{name}", person.name)} ${text}` });
}

function withLevfin(s: Startup): Startup {
  const lbo = { ...s.lbo! };
  lbo.headroom = LEVFIN_HEADROOM;
  lbo.rate = Math.max(0.02, lbo.rate - LEVFIN_RATE_CUT);
  lbo.payment = annuityOf(lbo.bank, lbo.rate, BANK_YEARS * 12);
  return { ...s, lbo };
}

/** After a purchase: a leveraged-finance contact who worked on the deal improves the new loan. */
export function afterAcquire(state: GameState, targetId: string): void {
  const s = state.startups.find((x) => x.id === targetId);
  if (!s || s.status !== "active" || !s.lbo || s.lbo.headroom || !(s.offer?.spec ?? []).includes("levfin")) return;
  const i = state.startups.indexOf(s);
  state.startups[i] = withLevfin(s);
}

// ---------------------------------------------------------------------------
// Hinweis vor der Sitzung
// ---------------------------------------------------------------------------

export function hintBlocker(state: GameState, contactId: string, itemId: string): string | null {
  const def = contactDef(contactId);
  if (!def.hint) return "Zu Auflagen kann diese Person nichts sagen.";
  const item = state.items.find((i) => i.id === itemId);
  if (!item || item.status !== "open") return "Über diese Vorlage wurde schon entschieden.";
  if (item.tip) return "Zu diesem Punkt hast du schon einen Hinweis.";
  return helpBlocker(state, contactRead(state, contactId), def, HINT_WARMTH_MIN);
}

/** A call to someone who knows: costs warmth, not days. The text comes from network-views.ts. */
export function playHint(ctx: Ctx, contactId: string, itemId: string): void {
  const state = ctx.state;
  const c = contactOf(state, contactId);
  if (!c) ctx.fail("Diesen Kontakt gibt es nicht.");
  const why = hintBlocker(state, contactId, itemId);
  if (why) ctx.fail(why);
  const item = state.items.find((i) => i.id === itemId)!;
  item.tip = contactId;
  warm(c!, -HINT_WARMTH_COST);
  networkOf(state).log.hints += 1;
  ctx.lesson("warm_intro");
}

// ---------------------------------------------------------------------------
// Veranstaltungen
// ---------------------------------------------------------------------------

/** Who is there: the regulars plus people whose interests fit. */
export function guestsOf(state: GameState, def: EventDef): string[] {
  const extra = state.contacts.filter((c) => !def.guests.includes(c.id) && def.traits.includes(personOf(state, c).trait)).map((c) => c.id);
  return [...def.guests, ...extra].slice(0, 8);
}

function invite(ctx: Ctx, month: number): void {
  const state = ctx.state;
  const def = eventIn(month);
  if (!def || state.reputation < def.minReputation) return;
  const net = networkOf(state);
  if (net.events.some((e) => e.month === month)) return;
  const e: NetEvent = { id: `ev${month}`, def: def.id, month, status: "invited" };
  net.events.push(e);
  const cost = eventCost(state, def, false);
  ctx.mail({
    kind: "network",
    from: def.name,
    subject: `Einladung: ${def.name}${month > state.month ? " im nächsten Monat" : ""}`,
    body: `${def.text} In ${cost.travel.city.name}, ${def.days === 1 ? "ein Tag" : `${def.days} Tage`}${cost.travel.days > 0 ? " plus Anreise" : ""}. Ticket und Reise: ${eur(cost.money)}.${def.talk && state.reputation >= def.talk.from ? ` Du kannst auch auf die Bühne: ${def.talk.title}.` : ""}`,
    action: "event",
    eventId: e.id,
  });
}

function planEvents(ctx: Ctx): void {
  const state = ctx.state;
  const net = networkOf(state);
  net.events = net.events.filter((e) => e.month >= state.month);
  for (const e of net.events.filter((x) => x.month === state.month && x.status === "accepted")) {
    try {
      attend(ctx, e, e.talk ?? false);
    } catch {
      e.status = "declined";
    }
  }
  invite(ctx, state.month);
  invite(ctx, state.month + 1);
}

export function playEvent(ctx: Ctx, eventId: string, move: "accept" | "decline", talk: boolean): void {
  const state = ctx.state;
  const e = networkOf(state).events.find((x) => x.id === eventId);
  if (!e || (e.status !== "invited" && e.status !== "accepted")) ctx.fail("Diese Einladung gilt nicht mehr.");
  const ev = e!;
  const def = eventDef(ev.def)!;
  if (move === "decline") {
    ev.status = "declined";
    return;
  }
  if (talk && (!def.talk || state.reputation < def.talk.from)) ctx.fail(def.talk ? `Auf die Bühne kommst du ab ${def.talk.from} Ruf.` : "Hier gibt es keine Vorträge.");
  if (ev.month > state.month) {
    ev.status = "accepted";
    ev.talk = talk;
    return;
  }
  attend(ctx, ev, talk);
}

/** Going there: days, money, then warmth, new acquaintances, sometimes a deal or a mandate. */
function attend(ctx: Ctx, e: NetEvent, talk: boolean): void {
  const state = ctx.state;
  const def = eventDef(e.def)!;
  const cost = eventCost(state, def, talk);
  if (state.cash < cost.money) ctx.fail(`Ticket und Reise kosten ${eur(cost.money)}.`);
  ctx.spend("event", def.name, cost.days);
  state.cash -= cost.money;
  e.status = "attended";
  e.talk = talk;
  const net = networkOf(state);
  net.log.events += 1;
  ctx.lesson("netzwerk_events");
  const r = rand(state, `event|${e.id}`);
  const met: string[] = [];
  const fresh: string[] = [];
  for (const id of guestsOf(state, def)) {
    const c = contactOf(state, id);
    if (!c || !ringOpen(state, contactDef(id).ring)) continue;
    const fits = def.traits.includes(personOf(state, c).trait);
    if (c.met) {
      warm(c, EVENT_WARMTH + (fits ? EVENT_TRAIT_WARMTH : 0));
      met.push(personOf(state, c).name);
    } else if (r() < EVENT_MEET_CHANCE + (fits ? 0.2 : 0)) {
      c.met = true;
      warm(c, EVENT_MEET_WARMTH);
      fresh.push(`${personOf(state, c).name} (${personOf(state, c).role})`);
    }
  }
  const texts: string[] = [];
  if (met.length > 0) texts.push(`Du hast ${met.join(", ")} getroffen.`);
  if (fresh.length > 0) texts.push(`Neu kennengelernt: ${fresh.join(", ")}.`);
  if (met.length === 0 && fresh.length === 0) texts.push("Viele fremde Gesichter. Bekannte waren kaum da.");
  if (talk && def.talk) {
    ctx.reputation(def.talk.reputation);
    net.log.talks += 1;
    texts.push(`${def.talk.title}: Der Saal war voll, dein Name ist jetzt bekannter.`);
  }
  if (def.deal && r() < def.deal.chance) {
    if (def.deal.kind === "early") {
      texts.push(`Beim Kaffee pitcht dir jemand: ${earlyDeal(ctx, r, r() < 0.6 ? "preseed" : "seed")} sucht Geld. Das Angebot liegt in deiner Post.`);
      ctx.lesson("deal_sourcing");
    } else if (state.reputation >= BUYOUT_REPUTATION && ctx.worth() >= BUYOUT_WORTH) {
      const s = targetDeal(ctx, r, { ev: targetEv(ctx.worth() * 0.8, r), source: "referral", from: `ein Gast beim ${def.name}` });
      texts.push(`Ein Inhaber nimmt dich zur Seite: ${s.name} sucht eine Nachfolge. Das Angebot liegt in deiner Post.`);
      ctx.lesson("deal_sourcing");
    }
  }
  if (def.mandate && r() < def.mandate && state.reputation >= MANDATE_REPUTATION && !(state.mna?.mandates ?? []).some((m) => m.status === "offered")) {
    offerMandate(ctx);
    texts.push("Am Rand fragt dich jemand, ob du einen Firmenverkauf begleiten würdest. Die Anfrage liegt bei deinen Aufträgen.");
  }
  defuseRivals(ctx);
  ctx.mail({ kind: "network", from: def.name, subject: `Zurück vom ${def.name}`, body: texts.join(" ") });
}
