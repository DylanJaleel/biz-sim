import { familyIntroDelta, familyNeed } from "./family";
import { sellers } from "./captable";
import { monthLabel, monthName, MONTH_NAMES, RING_REPUTATION, WARMTH_INTRO_MIN, WARMTH_MEET, WARMTH_MEET_FIRST } from "./config";
import { COVENANTS } from "./covenants";
import { covenantsOf, daysLeft } from "./engine";
import { mnaRead } from "./mna-core";
import {
  BASE_TIES,
  CONTACTS,
  RING_LABEL,
  TRAIT_LABEL,
  balLabel,
  balOf,
  contactDef,
  contactRead,
  generous,
  helpStrength,
  networkRead,
  personOf,
  refuses,
  ringOpen,
  tieKey,
  type ContactDef,
  type HelpKind,
  type Ring,
  type SpecialistKind,
} from "./network";
import { HINT_WARMTH_COST, HINT_WARMTH_MIN, RIVAL_WARMTH, SPECIALIST_WARMTH_COST, SPECIALIST_WARMTH_MIN, WARMTH_DECAY_RING } from "./network-config";
import { EVENTS, calendarMonth, eventCost, eventDef, type EventDef } from "./network-events";
import { FAVORS, cooldownLeft, favorText, guestsOf, helpBlocker, hintBlocker, specialistBlocker } from "./network-life";
import { runwayMonths } from "./sim";
import type { CareerKind, Favor, GameState, NetEvent, Rival, Startup } from "./types";

// Was die Netzwerkseite und die anderen Seiten vom Netzwerk zeigen: Karten
// der Kontakte, offene Bitten, Einladungen, die Karte "wer kennt wen" und
// Vorschläge, welcher Kontakt gerade bei welcher Firma helfen könnte.

export interface UsefulView {
  /** What it is for: a company, a mandate, a deal. */
  label: string;
  href: string;
  why: string;
}

export interface ContactCard {
  id: string;
  ring: Ring;
  ringLabel: string;
  name: string;
  role: string;
  org: string;
  bio: string;
  trait: string;
  warmth: number;
  met: boolean;
  /** The ring is open (reputation). */
  open: boolean;
  needs: number;
  /** Trust account: favours given minus taken. */
  balance: number;
  balanceLabel: string;
  balanceTone: "good" | "neutral" | "warn" | "bad";
  refuses: boolean;
  generous: boolean;
  /** Strength of help in percent (100 = normal). */
  strength: number;
  level: number;
  career?: { month: string; kind: CareerKind; text: string };
  kind: HelpKind;
  help: string;
  specialist?: { kind: SpecialistKind; text: string };
  /** Conditions this person can give a hint on. */
  hint?: string[];
  cooldown: number;
  /** Can be asked to help a company now ("Einbringen"). */
  canIntro: boolean;
  introBlocker?: string;
  /** Warmth next month without a meeting, and whether it falls below the threshold for favours. */
  nextWarmth: number;
  cooling: boolean;
  /** Where this person would help right now. */
  useful: UsefulView[];
  favors: FavorCard[];
  /** Upcoming events where this person will be. */
  events: string[];
  /** Bids against you for a company right now. */
  rivalFor?: string;
  meetGain: number;
}

export interface FavorCard {
  id: string;
  contactId: string;
  contactName: string;
  subject: string;
  body: string;
  cost: string;
  /** What saying yes brings, in words. */
  gain: string;
  ring: Ring;
  days: number;
  cash: number;
  expires: string;
  /** Runs out at the end of this month. */
  urgent: boolean;
  mailId?: string;
  blocker?: string;
}

export interface EventCard {
  id: string;
  defId: string;
  name: string;
  text: string;
  city: string;
  month: string;
  thisMonth: boolean;
  days: number;
  money: number;
  travel: string;
  status: NetEvent["status"];
  guests: { id: string; name: string; role: string; met: boolean; open: boolean; ring: Ring }[];
  deal: boolean;
  mandate: boolean;
  talk?: { title: string; from: number; reputation: number; possible: boolean };
  mailId?: string;
}

export interface YearEventView {
  id: string;
  name: string;
  month: string;
  city: string;
  minReputation: number;
  open: boolean;
  /** Next game month it takes place. */
  next: number;
}

export interface EdgeView {
  a: string;
  b: string;
  /** "base": they know each other anyway; "made": the player introduced them. */
  kind: "base" | "made";
}

export interface NetworkPage {
  contacts: ContactCard[];
  rings: { ring: Ring; label: string; open: boolean; needs: number }[];
  edges: EdgeView[];
  favors: FavorCard[];
  events: EventCard[];
  year: YearEventView[];
  log: { given: number; declined: number; lapsed: number; events: number; talks: number; refusals: number; specialists: number; hints: number };
  /** Companies a contact can be brought into. */
  companies: { id: string; name: string }[];
  /** Targets for specialists: deals, add-ons, mandates, own companies. */
  targets: { id: string; label: string; kind: "deal" | "addon" | "mandate" | "owned" }[];
  reputation: number;
  daysLeft: number;
  cash: number;
  warmthIntroMin: number;
  specialistMin: number;
}

const CAREER_TEXT: Record<CareerKind, (name: string, role: string, org: string) => string> = {
  up: (n, r, o) => `${n} ist aufgestiegen: ${r} bei ${o}.`,
  move: (n, _r, o) => `${n} hat zu ${o} gewechselt.`,
  new: (n, _r, o) => `${n} ist neu bei ${o}, als Nachfolge. Die Beziehung startet kühler.`,
};

/** What a yes brings: trust, warmth and sometimes something on top. */
function favorGain(def: (typeof FAVORS)[keyof typeof FAVORS]): string {
  const parts = [`Vertrauenskonto +${def.bal}`, `Wärme +${def.warmth}`];
  if (def.reputation) parts.push(`+${def.reputation} Ruf`);
  if (def.reward) {
    const sometimes = def.reward.chance >= 0.5 ? "oft" : "manchmal";
    parts.push(
      def.reward.kind === "fee"
        ? `${sometimes} ein Honorar`
        : def.reward.kind === "deal"
          ? `${sometimes} ein Deal`
          : def.reward.kind === "reputation"
            ? `${sometimes} mehr Ruf`
            : `${sometimes} ein neuer Kontakt`,
    );
  }
  return parts.join(", ");
}

function favorCard(state: GameState, f: Favor): FavorCard {
  const def = FAVORS[f.kind];
  const text = favorText(state, f);
  const c = contactRead(state, f.contactId);
  let blocker: string | undefined;
  if (def.days > daysLeft(state)) blocker = `Dafür fehlen dir Tage: ${def.days} nötig.`;
  else if ((def.cash ?? 0) > state.cash) blocker = "Dafür reicht dein Konto nicht.";
  return {
    id: f.id,
    contactId: f.contactId,
    contactName: personOf(state, c).name,
    subject: text.subject,
    body: text.body,
    cost: def.cost,
    gain: favorGain(def),
    ring: contactDef(f.contactId).ring,
    days: def.days,
    cash: def.cash ?? 0,
    expires: monthName(f.expires),
    urgent: f.expires <= state.month,
    mailId: state.mails.find((m) => m.favorId === f.id)?.id,
    ...(blocker ? { blocker } : {}),
  };
}

function eventCard(state: GameState, e: NetEvent): EventCard {
  const def = eventDef(e.def)!;
  const cost = eventCost(state, def, false);
  const guests = guestsOf(state, def).map((id) => {
    const c = contactRead(state, id);
    return { id, name: personOf(state, c).name, role: personOf(state, c).role, met: c.met, open: ringOpen(state, contactDef(id).ring), ring: contactDef(id).ring };
  });
  return {
    id: e.id,
    defId: def.id,
    name: def.name,
    text: def.text,
    city: cost.travel.city.name,
    month: monthLabel(e.month),
    thisMonth: e.month === state.month,
    days: cost.days,
    money: cost.money,
    travel: cost.travel.days > 0 ? `${cost.travel.how}, ein Reisetag` : cost.travel.how,
    status: e.status,
    guests,
    deal: Boolean(def.deal),
    mandate: Boolean(def.mandate),
    ...(def.talk ? { talk: { title: def.talk.title, from: def.talk.from, reputation: def.talk.reputation, possible: state.reputation >= def.talk.from } } : {}),
    mailId: state.mails.find((m) => m.eventId === e.id)?.id,
  };
}

/** Next game month (from now) in which an event of the yearly calendar takes place. */
function nextMonthOf(state: GameState, def: EventDef): number {
  for (let m = state.month; m < state.month + 12; m++) if (calendarMonth(m) === def.month) return m;
  return state.month;
}

/** Where a contact would help right now, with the reason. */
function usefulFor(state: GameState, def: ContactDef): UsefulView[] {
  const out: UsefulView[] = [];
  const active = state.startups.filter((s) => s.status === "active" && !s.corporate);
  if (def.kind !== "specialist") {
    for (const s of active) {
      const why = s.metrics.valuedOn === "ebitda" ? (familyIntroDelta(def.id, s) ? familyNeed(def.id, s) : null) : startupNeed(state, def.id, s);
      if (why) out.push({ label: s.name, href: `/firma/${s.id}`, why });
    }
    if (def.id === "dealflow") out.push({ label: "Neue Deals", href: "/post", why: "Empfiehlt dir ein Startup. Ist die Beziehung warm, kommen auch so öfter Angebote." });
    return out.slice(0, 3);
  }
  for (const t of specialistTargets(state)) {
    if (
      specialistBlocker({ ...state, contacts: state.contacts.map((c) => (c.id === def.id ? { ...c, met: true, warmth: 100, bal: 0, lastIntro: undefined } : c)) }, def.id, t.id) ===
      null
    ) {
      out.push({ label: t.label, href: t.href, why: specialistWhy(def, t.kind) });
    }
  }
  if (def.spec === "boutique" && state.reputation >= 35 && !(state.mna?.mandates ?? []).some((m) => m.status === "offered")) {
    out.push({ label: "M&A-Mandat", href: "/netzwerk", why: "Gibt dir ein Mandat weiter." });
  }
  return out.slice(0, 3);
}

function specialistWhy(def: ContactDef, kind: string): string {
  switch (def.spec) {
    case "dd":
      return kind === "mandate" ? "Verkäuferprüfung vorab: Mängel kennen, bevor der Käufer sie findet." : "Prüfung zum halben Honorar.";
    case "levfin":
      return "Mehr Spielraum beim Covenant, weniger Zins.";
    case "interim":
      return "Übergabe, Integration oder eine Firma in Schieflage: Sie hält den Betrieb zusammen.";
    case "kartell":
      return "Senkt das Risiko, dass das Kartellamt untersagt.";
    default:
      return def.help;
  }
}

/** Why a classic contact would help this company now, or null. */
export function startupNeed(state: GameState, id: string, s: Startup): string | null {
  const m = s.metrics;
  const runway = runwayMonths(m);
  switch (id) {
    case "steuer":
      return m.axes.finance < 55 ? `Finanzen schwach (${Math.round(m.axes.finance)}/100).` : null;
    case "vertrieb":
      return m.topCustomer > 0.3
        ? `Klumpenrisiko: größter Kunde ${Math.round(m.topCustomer * 100)} %.`
        : m.axes.market < 50
          ? `Markt schwach (${Math.round(m.axes.market)}/100).`
          : null;
    case "anwalt":
      return m.trust < 55 ? `Vertrauen im Beirat bröckelt (${Math.round(m.trust)}/100).` : null;
    case "recruiter":
      return m.axes.management < 55 ? `Führung schwach (${Math.round(m.axes.management)}/100).` : null;
    case "bank":
      return Number.isFinite(runway) && runway < 9 ? `Geld reicht nur ${Math.max(0, Math.floor(runway))} Monate.` : null;
    case "angels":
      return sellers({ ...s, metrics: { ...m, trust: 0 } }).length > 0 && s.stake < 50 ? "Jemand könnte Anteile verkaufen." : null;
    case "growth":
      return m.growth < 0.02 ? `Wachstum lahmt (${(m.growth * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % im Monat).` : null;
    case "vcpartner":
      return Number.isFinite(runway) && runway < 10 && !s.flags.includes("investor_intro") ? "Die nächste Runde kommt: besserer Preis." : null;
    case "einkauf":
      return m.topCustomer < 0.25 && m.axes.market < 65 ? "Ein Großkunde brächte viel Umsatz." : null;
    case "foerder":
      return Number.isFinite(runway) && runway < 12 ? "Ein Zuschuss verlängert die Reichweite." : null;
  }
  return null;
}

interface TargetRow {
  id: string;
  label: string;
  href: string;
  kind: "deal" | "addon" | "mandate" | "owned";
}

/** Everything a specialist could work on now. */
function specialistTargets(state: GameState): TargetRow[] {
  const out: TargetRow[] = [];
  for (const s of state.startups.filter((x) => x.status === "offered" && x.offer?.ev))
    out.push({ id: s.id, label: `Übernahme ${s.name}`, href: `/uebernahme/${s.id}`, kind: "deal" });
  for (const a of mnaRead(state).addons.filter((x) => x.status === "open" || x.status === "review"))
    out.push({ id: a.id, label: `Zukauf ${a.name}`, href: `/plattform/${a.platformId}`, kind: "addon" });
  for (const m of mnaRead(state).mandates.filter((x) => x.status === "prep")) out.push({ id: m.id, label: `Mandat ${m.company}`, href: `/mandat/${m.id}`, kind: "mandate" });
  for (const s of state.startups.filter((x) => x.status === "active" && x.lbo)) out.push({ id: s.id, label: s.name, href: `/plattform/${s.id}`, kind: "owned" });
  return out;
}

function rivalLabel(state: GameState, id: string): string | undefined {
  const deal = state.startups.find((s) => s.status === "offered" && s.offer?.rival?.contactId === id && !s.offer.rival.defused);
  if (deal) return deal.name;
  return mnaRead(state).addons.find((a) => a.status === "open" && a.rival?.contactId === id && !a.rival.defused)?.name;
}

export function contactCard(state: GameState, def: ContactDef): ContactCard {
  const c = contactRead(state, def.id);
  const person = personOf(state, c);
  const open = ringOpen(state, def.ring);
  const cooldown = cooldownLeft(state, c);
  const bl = balLabel(c);
  const introBlocker =
    def.kind === "specialist" ? undefined : (helpBlocker(state, c, def, WARMTH_INTRO_MIN) ?? (cooldown > 0 ? `Hat gerade geholfen. Wieder in ${cooldown} Monaten.` : undefined));
  const nextWarmth = c.met ? Math.max(0, c.warmth - WARMTH_DECAY_RING[def.ring]) : 0;
  const net = networkRead(state);
  return {
    id: def.id,
    ring: def.ring,
    ringLabel: RING_LABEL[def.ring],
    name: person.name,
    role: person.role,
    org: person.org,
    bio: person.bio,
    trait: TRAIT_LABEL[person.trait],
    warmth: c.warmth,
    met: c.met,
    open,
    needs: RING_REPUTATION[def.ring],
    balance: balOf(c),
    balanceLabel: bl.label,
    balanceTone: bl.tone,
    refuses: refuses(c),
    generous: generous(c),
    strength: Math.round(helpStrength(c) * 100),
    level: c.lv ?? 0,
    ...(c.ev ? { career: { month: monthLabel(c.ev.month), kind: c.ev.kind, text: CAREER_TEXT[c.ev.kind](person.name, person.role, person.org) } } : {}),
    kind: def.kind,
    help: def.help,
    ...(def.spec ? { specialist: { kind: def.spec, text: def.specText ?? def.help } } : {}),
    ...(def.hint ? { hint: def.hint.map((h) => COVENANTS[h].name) } : {}),
    cooldown,
    canIntro: def.kind !== "specialist" && !introBlocker,
    ...(introBlocker ? { introBlocker } : {}),
    nextWarmth,
    cooling: c.met && c.warmth >= WARMTH_INTRO_MIN && nextWarmth < WARMTH_INTRO_MIN,
    useful: open ? usefulFor(state, def) : [],
    favors: net.favors.filter((f) => f.contactId === def.id).map((f) => favorCard(state, f)),
    events: net.events.filter((e) => e.status !== "declined" && e.month >= state.month && guestsOf(state, eventDef(e.def)!).includes(def.id)).map((e) => eventDef(e.def)!.name),
    ...(rivalLabel(state, def.id) ? { rivalFor: rivalLabel(state, def.id) } : {}),
    meetGain: c.met ? WARMTH_MEET : WARMTH_MEET_FIRST,
  };
}

/** Everything the network page shows. */
export function networkPage(state: GameState): NetworkPage {
  const net = networkRead(state);
  const contacts = CONTACTS.map((def) => contactCard(state, def));
  const made = net.ties.map((t) => {
    const [a, b] = t.split("~") as [string, string];
    return { a, b, kind: "made" as const };
  });
  const base = BASE_TIES.filter(([a, b]) => !net.ties.includes(tieKey(a, b))).map(([a, b]) => ({ a, b, kind: "base" as const }));
  return {
    contacts,
    rings: ([1, 2, 3] as const).map((ring) => ({ ring, label: RING_LABEL[ring], open: ringOpen(state, ring), needs: RING_REPUTATION[ring] })),
    edges: [...base, ...made],
    favors: net.favors.map((f) => favorCard(state, f)),
    events: net.events.filter((e) => e.month >= state.month).map((e) => eventCard(state, e)),
    year: EVENTS.map((e) => ({
      id: e.id,
      name: e.name,
      month: MONTH_NAMES[e.month],
      city: eventCost(state, e, false).travel.city.name,
      minReputation: e.minReputation,
      open: state.reputation >= e.minReputation,
      next: nextMonthOf(state, e),
    })).sort((a, b) => a.next - b.next),
    log: net.log,
    companies: state.startups.filter((s) => s.status === "active" && !s.corporate).map((s) => ({ id: s.id, name: s.name })),
    targets: specialistTargets(state).map((t) => ({ id: t.id, label: t.label, kind: t.kind })),
    reputation: state.reputation,
    daysLeft: daysLeft(state),
    cash: state.cash,
    warmthIntroMin: WARMTH_INTRO_MIN,
    specialistMin: SPECIALIST_WARMTH_MIN,
  };
}

// ---------------------------------------------------------------------------
// Für andere Seiten: Wer hilft hier?
// ---------------------------------------------------------------------------

export interface HelperView {
  id: string;
  name: string;
  role: string;
  ring: Ring;
  warmth: number;
  met: boolean;
  why: string;
  /** Null when it can be done now. */
  blocker: string | null;
  /** "intro": bring into a company; "specialist": work on a deal, mandate or platform. */
  action: "intro" | "specialist";
  warmthCost: number;
}

/** Contacts who would help this company now (Einbringen), best first. */
export function helpersForCompany(state: GameState, startupId: string): HelperView[] {
  const s = state.startups.find((x) => x.id === startupId);
  if (!s || s.status !== "active" || s.corporate) return [];
  // Family businesses: the specialists, plus the classic contacts whose help fits a business valued on EBITDA.
  const family = s.metrics.valuedOn === "ebitda";
  const classic = CONTACTS.filter((d) => d.kind !== "specialist" && ringOpen(state, d.ring) && (!family || familyIntroDelta(d.id, s) !== null))
    .flatMap((d) => {
      const why = family ? familyNeed(d.id, s) : startupNeed(state, d.id, s);
      if (!why) return [];
      const card = contactCard(state, d);
      return [
        {
          id: d.id,
          name: card.name,
          role: card.role,
          ring: d.ring,
          warmth: card.warmth,
          met: card.met,
          why: `${why} ${d.help}`,
          blocker: card.introBlocker ?? null,
          action: "intro" as const,
          warmthCost: 20,
        },
      ];
    })
    .sort((a, b) => Number(a.blocker !== null) - Number(b.blocker !== null) || b.warmth - a.warmth)
    .slice(0, 4);
  return family ? [...specialistsFor(state, startupId), ...classic].slice(0, 5) : classic;
}

/** Specialists for a deal, add-on, mandate or own company. */
export function specialistsFor(state: GameState, targetId: string): HelperView[] {
  const row = specialistTargets(state).find((t) => t.id === targetId);
  if (!row) return [];
  return CONTACTS.filter((d) => d.kind === "specialist" && d.spec !== "boutique" && ringOpen(state, d.ring)).flatMap((d) => {
    const ideal = specialistBlocker(
      { ...state, contacts: state.contacts.map((c) => (c.id === d.id ? { ...c, met: true, warmth: 100, bal: 0, lastIntro: undefined } : c)) },
      d.id,
      targetId,
    );
    if (ideal !== null) return [];
    const card = contactCard(state, d);
    return [
      {
        id: d.id,
        name: card.name,
        role: card.role,
        ring: d.ring,
        warmth: card.warmth,
        met: card.met,
        why: card.specialist?.text ?? d.help,
        blocker: specialistBlocker(state, d.id, targetId),
        action: "specialist" as const,
        warmthCost: SPECIALIST_WARMTH_COST,
      },
    ];
  });
}

export interface RivalView {
  contactId: string;
  name: string;
  org: string;
  ring: Ring;
  warmth: number;
  needed: number;
  premium: number;
  defused: boolean;
  met: boolean;
  open: boolean;
}

export function rivalView(state: GameState, rival: Rival | undefined): RivalView | null {
  if (!rival) return null;
  const c = contactRead(state, rival.contactId);
  const p = personOf(state, c);
  return {
    contactId: rival.contactId,
    name: p.name,
    org: p.org,
    ring: contactDef(rival.contactId).ring,
    warmth: c.warmth,
    needed: RIVAL_WARMTH,
    premium: rival.premium,
    defused: Boolean(rival.defused),
    met: c.met,
    open: ringOpen(state, contactDef(rival.contactId).ring),
  };
}

export interface HintView {
  itemId: string;
  /** The hint once given. */
  tip?: { name: string; text: string; ring: Ring };
  /** Who could give one, and what they know. */
  options: { id: string; name: string; role: string; ring: Ring; knows: string[]; warmth: number; blocker: string | null }[];
  cost: number;
  min: number;
}

/** The hint text: names the fitting condition if it is in this person's field, else rules some out. */
export function hintText(state: GameState, contactId: string, itemId: string): string {
  const item = state.items.find((i) => i.id === itemId);
  const def = contactDef(contactId);
  if (!item || !def.hint) return "";
  const setup = covenantsOf(state, item);
  if (def.hint.includes(setup.fit)) return `„Ich würde auf ${COVENANTS[setup.fit].name} bestehen. Mir macht vor allem ${COVENANTS[setup.fit].guards} Sorgen.“`;
  const out = def.hint.filter((h) => setup.options.includes(h));
  if (out.length > 0) return `„${out.map((h) => COVENANTS[h].name).join(" und ")} würde ich hier nicht verlangen. Das eigentliche Risiko liegt woanders.“`;
  return "„Ehrlich gesagt: Keine der Auflagen auf dem Tisch ist mein Gebiet. Frag lieber jemanden, der die Firma kennt.“";
}

export function hintsFor(state: GameState, itemId: string): HintView {
  const item = state.items.find((i) => i.id === itemId);
  const tip = item?.tip ? { name: personOf(state, contactRead(state, item.tip)).name, text: hintText(state, item.tip, itemId), ring: contactDef(item.tip).ring } : undefined;
  // Only people who know at least one of the conditions on the table; ready ones first.
  const onTable = item ? covenantsOf(state, item).options : [];
  const options = CONTACTS.filter((d) => d.hint && d.hint.some((h) => onTable.includes(h)) && ringOpen(state, d.ring) && contactRead(state, d.id).met)
    .map((d) => {
      const c = contactRead(state, d.id);
      const p = personOf(state, c);
      return { id: d.id, name: p.name, role: p.role, ring: d.ring, knows: d.hint!.map((h) => COVENANTS[h].name), warmth: c.warmth, blocker: hintBlocker(state, d.id, itemId) };
    })
    .sort((a, b) => Number(a.blocker !== null) - Number(b.blocker !== null) || b.warmth - a.warmth);
  return { itemId, ...(tip ? { tip } : {}), options, cost: HINT_WARMTH_COST, min: HINT_WARMTH_MIN };
}

// ---------------------------------------------------------------------------
// Aufgaben für den Schreibtisch
// ---------------------------------------------------------------------------

export interface NetworkTask {
  text: string;
  href: string;
  tone: "urgent" | "normal" | "calm";
  /** Runs out soon (favour, invitation this month, contact about to cool): belongs near the top of the desk list. */
  hurry?: boolean;
}

/** Open favours, invitations and important contacts about to cool off. */
export function networkTasks(state: GameState): NetworkTask[] {
  const net = networkRead(state);
  const out: NetworkTask[] = [];
  for (const f of net.favors) {
    const card = favorCard(state, f);
    out.push({
      text: `${card.contactName} bittet um einen Gefallen: ${card.subject} ${card.urgent ? "Antwort bis Monatsende." : `Bis Ende ${card.expires}.`}`,
      href: card.mailId ? `/post?mail=${card.mailId}` : "/netzwerk",
      tone: card.urgent ? "urgent" : "normal",
      hurry: true,
    });
  }
  for (const e of net.events.filter((x) => x.status === "invited" && x.month >= state.month)) {
    const def = eventDef(e.def)!;
    out.push({
      text: `Einladung: ${def.name} im ${monthName(e.month)}. Zusagen oder absagen.`,
      href: "/netzwerk#termine",
      tone: e.month === state.month ? "normal" : "calm",
      ...(e.month === state.month ? { hurry: true } : {}),
    });
  }
  // Important: a contact who helps one of your companies or deals right now.
  const cooling = CONTACTS.map((d) => contactCard(state, d)).filter((c) => c.cooling && c.useful.length > 0);
  for (const c of cooling.slice(0, 2)) {
    out.push({
      text: `${c.name} kühlt ab (Wärme ${c.warmth}, nächsten Monat ${c.nextWarmth}). Unter ${WARMTH_INTRO_MIN} hilft niemand mehr. Ein Treffen kostet einen Tag.`,
      href: `/netzwerk?kontakt=${c.id}`,
      tone: "normal",
      hurry: true,
    });
  }
  for (const s of state.startups.filter((x) => x.status === "offered" && x.offer?.rival && !x.offer.rival.defused)) {
    const r = rivalView(state, s.offer!.rival)!;
    out.push({
      text: `${s.name}: ${r.name} bietet mit, der Preis liegt ${Math.round(r.premium * 100)} % höher. Ab ${r.needed} Wärme zieht ${r.name} zurück (jetzt ${r.warmth}).`,
      href: `/netzwerk?kontakt=${r.contactId}`,
      tone: "normal",
    });
  }
  return out;
}

/** Calendar page: upcoming events with their days. */
export function calendarEvents(state: GameState): EventCard[] {
  return networkRead(state)
    .events.filter((e) => e.month >= state.month && e.status !== "declined")
    .map((e) => eventCard(state, e));
}

/** Post: the open favours and invitations by id, for the buttons under a letter. */
export function postNetwork(state: GameState): { favors: Record<string, FavorCard>; events: Record<string, EventCard> } {
  const net = networkRead(state);
  return {
    favors: Object.fromEntries(net.favors.map((f) => [f.id, favorCard(state, f)])),
    events: Object.fromEntries(net.events.filter((e) => e.month >= state.month).map((e) => [e.id, eventCard(state, e)])),
  };
}

/** The rival of an offered deal or an add-on, by target id. */
export function rivalFor(state: GameState, targetId: string): RivalView | null {
  const deal = state.startups.find((s) => s.id === targetId && s.status === "offered");
  if (deal) return rivalView(state, deal.offer?.rival);
  return rivalView(state, mnaRead(state).addons.find((a) => a.id === targetId)?.rival);
}
