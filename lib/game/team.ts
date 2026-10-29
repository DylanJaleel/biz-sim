import { eur, type Ctx } from "./mna-core";
import { valuation } from "./sim";
import type { GameState, IncomeLines, OpMandate, Startup, TeamMember } from "./types";

// Operating Partner: erfahrene Leute im Family Office, die Firmen für dich
// betreuen. Jede Person hat Stärken je Firmentyp, eine Kapazität und einen
// Vertrag aus Grundgehalt, einem kleinen laufenden Anteil am Wertzuwachs und
// Carry beim Verkauf. Sie ersetzen Associate und Partnerin älterer Spielstände.

export type OpType = "startup" | "mittelstand" | "plattform";
export type FitLevel = "good" | "mid" | "weak";

export const OP_TYPES: OpType[] = ["startup", "mittelstand", "plattform"];
export const OP_TYPE_LABEL: Record<OpType, string> = { startup: "Startups", mittelstand: "Mittelstand", plattform: "Plattform und Zukäufe" };
export const FIT_LABEL: Record<FitLevel, string> = { good: "passt gut", mid: "passt mittel", weak: "passt kaum" };

export interface OpProfile {
  id: string;
  name: string;
  age?: number;
  vita: string;
  style: string;
  strengths: Record<OpType, number>;
  salary: number;
  /** Share of the quarterly value gain (above the high-water mark) of the companies looked after. */
  running: number;
  /** Share of your gain at a sale of a company looked after (from the start of the mandate). */
  carry: number;
  /** Companies at the same time. */
  capacity: number;
  color: string;
  legacy?: boolean;
}

export const OP_PROFILES: OpProfile[] = [
  {
    id: "voss",
    name: "Marlene Voss",
    age: 47,
    vita: "Restrukturierungsberaterin, 14 Jahre Sanierung im Mittelstand.",
    style: "„Cash zuerst. Wer keinen Rückfluss zeigt, bekommt kein Budget.“",
    strengths: { startup: 35, mittelstand: 92, plattform: 70 },
    salary: 9_500,
    running: 0.01,
    carry: 0.06,
    capacity: 2,
    color: "#7a5af8",
  },
  {
    id: "reiter",
    name: "Jonas Reiter",
    age: 38,
    vita: "Früher Vertriebsleiter eines IT-Mittelständlers, baute zwei Standorte auf.",
    style: "„Wer nicht wächst, wird gekauft.“",
    strengths: { startup: 88, mittelstand: 55, plattform: 62 },
    salary: 8_500,
    running: 0.01,
    carry: 0.05,
    capacity: 2,
    color: "#0a9bb5",
  },
  {
    id: "kaya",
    name: "Dr. Ines Kaya",
    age: 44,
    vita: "Ehemalige Finanzchefin eines Familienunternehmens, kennt Banken, Covenants und Zukäufe.",
    style: "„Zahlen, die eine Bank versteht, öffnen jede Tür.“",
    strengths: { startup: 50, mittelstand: 78, plattform: 88 },
    salary: 9_000,
    running: 0.0075,
    carry: 0.05,
    capacity: 2,
    color: "#e0663a",
  },
  {
    id: "brandt",
    name: "Tim Brandt",
    age: 33,
    vita: "Key-Account-Manager, Quereinsteiger aus dem Startup-Vertrieb.",
    style: "„Ich will Verantwortung. Sonst bin ich in einem Jahr weg.“",
    strengths: { startup: 76, mittelstand: 48, plattform: 40 },
    salary: 6_500,
    running: 0.005,
    carry: 0.03,
    capacity: 2,
    color: "#1c9a5a",
  },
  {
    id: "dreyer",
    name: "Heiko Dreyer",
    age: 58,
    vita: "Interim-Manager mit 30 Jahren Erfahrung in Übergaben und Integrationen.",
    style: "„Ich brauche keine Beteiligung. Ich brauche klare Ziele.“",
    strengths: { startup: 30, mittelstand: 84, plattform: 80 },
    salary: 12_000,
    running: 0,
    carry: 0,
    capacity: 3,
    color: "#6b7180",
  },
];

/** Team members of older games keep name and salary; their old contract has no share in the gains. */
const LEGACY: Record<"associate" | "partner", OpProfile> = {
  associate: {
    id: "associate",
    name: "",
    vita: "Kam als Associate ins Family Office. Alter Vertrag: festes Gehalt, keine Beteiligung.",
    style: "„Ich kenne die Beiratsvorlagen auswendig.“",
    strengths: { startup: 70, mittelstand: 58, plattform: 45 },
    salary: 5_000,
    running: 0,
    carry: 0,
    capacity: 2,
    color: "#0e9f8e",
    legacy: true,
  },
  partner: {
    id: "partner",
    name: "",
    vita: "Kam als Partnerin ins Family Office. Alter Vertrag: festes Gehalt, keine Beteiligung.",
    style: "„Deals entstehen beim zweiten Kaffee.“",
    strengths: { startup: 60, mittelstand: 72, plattform: 78 },
    salary: 9_000,
    running: 0,
    carry: 0,
    capacity: 2,
    color: "#7b4dff",
    legacy: true,
  },
};

export const OP = {
  max: 4,
  /** Recruiter fee: share of a year's salary. */
  recruiter: 0.25,
  hireDays: 2,
  /** Working days a mandate saves you per month, by fit; the team saves at most daysMax. */
  days: { good: 1.5, mid: 1, weak: 0.5 },
  daysMax: 4,
  /** How often the partner finds the best option in a board item you leave to them. */
  skill: { good: 0.85, mid: 0.7, weak: 0.5 },
  /** Handover risks of a bought company are multiplied by this. */
  handover: { good: 0.6, mid: 0.8, weak: 1 },
  /** Integrations of a platform: more synergies, fewer customers lost. */
  synergy: { good: 0.1, mid: 0.05, weak: 0 },
  churn: { good: -0.1, mid: -0.05, weak: 0 },
  /** Preparing add-ons: more candidates per month. */
  addonChance: { good: 0.15, mid: 0.1, weak: 0.05 },
  /** A mandate ended after this many months keeps its carry claim. */
  vestMonths: 6,
} as const;

export function profileOf(m: TeamMember): OpProfile {
  const own = OP_PROFILES.find((p) => p.id === m.profile);
  if (own) return own;
  return LEGACY[m.profile === "partner" || m.role === "partner" ? "partner" : "associate"];
}

export function opTypeOf(s: Startup): OpType {
  if (s.platform) return "plattform";
  return s.metrics.valuedOn === "ebitda" ? "mittelstand" : "startup";
}

export function fitLevel(strength: number): FitLevel {
  return strength >= 75 ? "good" : strength >= 55 ? "mid" : "weak";
}

export function fitOf(m: TeamMember, s: Startup): FitLevel {
  return fitLevel(profileOf(m).strengths[opTypeOf(s)]);
}

export function initialsOf(name: string): string {
  return name
    .replace(/^Dr\. /, "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

/** All mandates, also of older games (a single `mandate`). */
function allMandates(m: TeamMember): OpMandate[] {
  if (m.mandates) return m.mandates;
  return m.mandate ? [{ id: m.mandate, since: m.hired, base: 0, mark: 0 }] : [];
}

export function currentMandates(m: TeamMember): OpMandate[] {
  return allMandates(m).filter((x) => x.until === undefined);
}

/** The operating partner who looks after this company right now. */
export function leadOf(state: GameState, s: Startup | string): { member: TeamMember; fit: FitLevel } | undefined {
  const company = typeof s === "string" ? state.startups.find((x) => x.id === s) : s;
  if (!company || company.status !== "active") return undefined;
  const member = (state.team ?? []).find((m) => currentMandates(m).some((x) => x.id === company.id));
  return member ? { member, fit: fitOf(member, company) } : undefined;
}

/** Your stake's value minus everything you put in: the value created so far. */
function created(s: Startup): number {
  return (valuation(s.metrics) * s.stake) / 100 - (s.playerCost ?? 0);
}

// ---------------------------------------------------------------------------
// Wirkung
// ---------------------------------------------------------------------------

/** Extra working days per month: the team takes work off you. */
export function teamDays(state: GameState): number {
  let days = 0;
  for (const m of state.team ?? []) {
    for (const x of currentMandates(m)) {
      const s = state.startups.find((c) => c.id === x.id && c.status === "active");
      if (s) days += OP.days[fitOf(m, s)];
    }
  }
  return Math.min(OP.daysMax, Math.floor(days));
}

/** The partner who decides open board items of this company in your place, and how well. */
export function delegateFor(state: GameState, startupId: string): { member: TeamMember; skill: number } | undefined {
  const lead = leadOf(state, startupId);
  return lead ? { member: lead.member, skill: OP.skill[lead.fit] } : undefined;
}

/** Integrations a platform can run at once: you, the team, and a partner on site. */
export function integrationCapacity(state: GameState, s: Startup): number {
  const lead = leadOf(state, s);
  return 1 + ((state.team ?? []).length > 0 ? 1 : 0) + (lead && lead.fit !== "weak" ? 1 : 0);
}

/** A partner on the platform prepares add-ons: more candidates, a day saved, the fit checked beforehand. */
export function platformPrep(state: GameState, s: Startup): { chance: number; days: number; reveal: boolean; name?: string } {
  const lead = leadOf(state, s);
  if (!lead) return { chance: 0, days: 0, reveal: false };
  return { chance: OP.addonChance[lead.fit], days: lead.fit === "weak" ? 0 : 1, reveal: lead.fit !== "weak", name: lead.member.name };
}

/** Handover risks of a bought company: a partner on site makes them rarer. */
export function handoverFactor(state: GameState, s: Startup): number {
  const lead = leadOf(state, s);
  return lead ? OP.handover[lead.fit] : 1;
}

export function integrationBonus(state: GameState, s: Startup): { synergy: number; churn: number } {
  const lead = leadOf(state, s);
  return lead ? { synergy: OP.synergy[lead.fit], churn: OP.churn[lead.fit] } : { synergy: 0, churn: 0 };
}

/** The team's network brings one more deal a month. */
export function teamDealFlow(state: GameState): number {
  return (state.team ?? []).length > 0 ? 1 : 0;
}

/** What a mandate does, in short sentences for the pages. */
export function effectsOf(m: TeamMember, s: Startup): string[] {
  const fit = fitOf(m, s);
  const out = [`spart ${OP.days[fit].toLocaleString("de-DE")} Tage im Monat`, `entscheidet Vorlagen zu ${Math.round(OP.skill[fit] * 100)} % richtig`];
  if (s.lbo && OP.handover[fit] < 1) out.push(`Übergaberisiko −${Math.round((1 - OP.handover[fit]) * 100)} %`);
  if (s.platform) {
    out.push(`+${Math.round(OP.addonChance[fit] * 100)} % Chance auf Zukaufkandidaten`);
    if (fit !== "weak") out.push("prüft die Passung vorab, Zukauf einen Tag schneller, eine Integration mehr");
    if (OP.synergy[fit] > 0) out.push(`Synergie-Chance +${Math.round(OP.synergy[fit] * 100)} Punkte`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Einstellen, zuweisen, entlassen
// ---------------------------------------------------------------------------

export function hireFee(p: OpProfile): number {
  return Math.round((p.salary * 12 * OP.recruiter) / 500) * 500;
}

export function hireBlocker(state: GameState, profileId: string): string | null {
  if (state.familyOffice === undefined) return "Ein Team stellst du im Family Office ein.";
  const p = OP_PROFILES.find((x) => x.id === profileId);
  if (!p) return "Diese Person gibt es nicht.";
  if (state.team.some((m) => m.profile === p.id)) return `${p.name} arbeitet schon für dich.`;
  if (state.team.length >= OP.max) return `Dein Family Office hat ${OP.max} Plätze für Operating Partner.`;
  if (state.cash < hireFee(p)) return `Der Personalberater kostet ${eur(hireFee(p))}.`;
  return null;
}

export function hireOp(ctx: Ctx, profileId: string): void {
  const state = ctx.state;
  const why = hireBlocker(state, profileId);
  if (why) ctx.fail(why);
  const p = OP_PROFILES.find((x) => x.id === profileId)!;
  ctx.spend("hire", `Gespräche mit ${p.name}`, OP.hireDays);
  state.cash -= hireFee(p);
  state.team.push({ id: ctx.id("t"), role: "operating", profile: p.id, name: p.name, salary: p.salary, hired: state.month, mandates: [] });
  ctx.lesson("operating_partner");
  ctx.mail({
    kind: "system",
    from: p.name,
    subject: "Ich fange am Montag an",
    body: `Danke für das Vertrauen. Gib mir eine oder mehrere Firmen, höchstens ${p.capacity}. Mein Vertrag: ${eur(p.salary)} Gehalt im Monat${p.running > 0 ? `, ${pct(p.running)} vom Wertzuwachs jedes Quartal und ${pct(p.carry)} Carry beim Verkauf` : ", keine Beteiligung"}.`,
  });
}

function pct(n: number): string {
  return `${(n * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
}

export function fireOp(ctx: Ctx, memberId: string): void {
  const state = ctx.state;
  if (!state.team.some((m) => m.id === memberId)) ctx.fail("Diese Person arbeitet nicht bei dir.");
  // Leaving before a sale: the carry claims lapse (bad leaver).
  state.team = state.team.filter((m) => m.id !== memberId);
}

/** Gives a company to a partner (taking it from whoever had it), or ends one mandate (`from`) or all (`null`). */
export function assignOp(ctx: Ctx, memberId: string, startupId: string | null, from?: string): void {
  const state = ctx.state;
  const member = state.team.find((m) => m.id === memberId);
  if (!member) ctx.fail("Diese Person arbeitet nicht bei dir.");
  normalize(state, member!);
  if (startupId === null) {
    for (const x of currentMandates(member!)) if (from === undefined || x.id === from) end(state, member!, x);
    return;
  }
  const s = state.startups.find((x) => x.id === startupId);
  if (!s || s.status !== "active") ctx.fail("Das ist keine aktive Beteiligung.");
  if (s!.corporate) ctx.fail("Im Konzern sitzt du selbst im Aufsichtsrat.");
  if (currentMandates(member!).some((x) => x.id === s!.id)) return;
  if (currentMandates(member!).length >= profileOf(member!).capacity)
    ctx.fail(`${member!.name} betreut schon ${profileOf(member!).capacity} Firmen. Nimm erst eine ab.`);
  for (const other of state.team) {
    normalize(state, other);
    for (const x of currentMandates(other)) if (x.id === s!.id) end(state, other, x);
  }
  const v = created(s!);
  member!.mandates = [...(member!.mandates ?? []).filter((x) => x.id !== s!.id), { id: s!.id, since: state.month, base: v, mark: v }];
  ctx.lesson("operating_partner");
}

function end(state: GameState, m: TeamMember, x: OpMandate): void {
  const vested = state.month - x.since >= OP.vestMonths && profileOf(m).carry > 0;
  m.mandates = (m.mandates ?? []).flatMap((y) => (y !== x ? [y] : vested ? [{ ...y, until: state.month }] : []));
}

/** Older members (associate, partner, single `mandate`) become operating partners. */
function normalize(state: GameState, m: TeamMember): void {
  if (m.role !== "operating") {
    m.profile = m.profile ?? m.role;
    m.role = "operating";
  }
  if (!m.mandates) {
    const s = m.mandate ? state.startups.find((x) => x.id === m.mandate && x.status === "active") : undefined;
    const v = s ? created(s) : 0;
    m.mandates = s ? [{ id: s.id, since: state.month, base: v, mark: v }] : [];
  }
  delete m.mandate;
}

/** Called when a game is loaded: maps associates and partners onto operating partners (no version bump). */
export function migrateTeam(state: GameState): GameState {
  if (!(state.team ?? []).some((m) => m.role !== "operating" || !m.mandates || m.mandate !== undefined)) return state;
  const next = { ...state, team: state.team.map((m) => ({ ...m })) };
  for (const m of next.team) normalize(next, m);
  return next;
}

// ---------------------------------------------------------------------------
// Vergütung: laufender Anteil je Quartal, Carry beim Verkauf
// ---------------------------------------------------------------------------

/** Month end: mandates of companies that are gone drop out; each quarter the running share is paid. */
export function teamMonth(state: GameState, month: number, income: IncomeLines, notes: string[]): void {
  let paid = 0;
  const lines: string[] = [];
  for (const m of state.team) {
    normalize(state, m);
    const p = profileOf(m);
    m.mandates = (m.mandates ?? []).filter((x) => state.startups.some((s) => s.id === x.id && s.status === "active"));
    if (month % 3 !== 0) continue;
    let mine = 0;
    for (const x of currentMandates(m)) {
      const s = state.startups.find((c) => c.id === x.id)!;
      const v = created(s);
      if (v > x.mark) {
        mine += p.running * (v - x.mark);
        x.mark = v;
      }
    }
    mine = Math.round(mine);
    if (mine <= 0) continue;
    m.paid = (m.paid ?? 0) + mine;
    paid += mine;
    lines.push(`${m.name} ${eur(mine)}`);
  }
  if (paid <= 0) return;
  state.cash -= paid;
  income.salaries = (income.salaries ?? 0) - paid;
  notes.push(`Erfolgsbeteiligung des Teams für das Quartal: ${lines.join(", ")} (laufender Anteil am Wertzuwachs deiner Firmen).`);
}

/** At a sale: the carry of every partner with a claim on this company, taken from your proceeds. `apply` false only computes it. */
export function teamCarry(state: GameState, s: Startup, proceeds: number, apply = true): { amount: number; lines: { name: string; amount: number }[] } {
  const lines: { name: string; amount: number }[] = [];
  for (const m of state.team ?? []) {
    if (apply) normalize(state, m);
    const claims = allMandates(m).filter((x) => x.id === s.id);
    if (claims.length === 0) continue;
    const p = profileOf(m);
    const gain = proceeds - (s.playerCost ?? 0) - Math.min(...claims.map((x) => x.base));
    const amount = Math.round(Math.max(0, gain) * p.carry);
    if (apply) {
      m.mandates = (m.mandates ?? []).filter((x) => x.id !== s.id);
      m.paid = (m.paid ?? 0) + amount;
    }
    if (amount > 0) lines.push({ name: m.name, amount });
  }
  return { amount: lines.reduce((sum, l) => sum + l.amount, 0), lines };
}

// ---------------------------------------------------------------------------
// Ansicht
// ---------------------------------------------------------------------------

export interface OpCard {
  id?: string;
  profileId: string;
  name: string;
  initials: string;
  color: string;
  age?: number;
  vita: string;
  style: string;
  strengths: { type: OpType; label: string; value: number; fit: FitLevel }[];
  top: OpType;
  salary: number;
  running: number;
  carry: number;
  capacity: number;
  legacy: boolean;
  hired?: number;
  paid: number;
  fee: number;
  blocker: string | null;
  mandates: { id: string; name: string; type: OpType; fit: FitLevel; since: number; effects: string[]; created: number }[];
  /** Ended mandates with a vested carry claim. */
  claims: { id: string; name: string }[];
}

export interface TeamCompany {
  id: string;
  name: string;
  type: OpType;
  lead?: string;
  /** Fit per partner id. */
  fit: Record<string, FitLevel>;
}

export interface TeamView {
  founded: boolean;
  max: number;
  team: OpCard[];
  candidates: OpCard[];
  companies: TeamCompany[];
  days: number;
  daysMax: number;
  cost: number;
  hireDays: number;
  recruiter: number;
  vestMonths: number;
  daysLeft?: number;
}

function card(state: GameState, p: OpProfile, m?: TeamMember): OpCard {
  const strengths = OP_TYPES.map((t) => ({ type: t, label: OP_TYPE_LABEL[t], value: p.strengths[t], fit: fitLevel(p.strengths[t]) }));
  const top = [...strengths].sort((a, b) => b.value - a.value)[0]!.type;
  const company = (id: string) => state.startups.find((s) => s.id === id);
  return {
    id: m?.id,
    profileId: p.id,
    name: m?.name ?? p.name,
    initials: initialsOf(m?.name ?? p.name),
    color: p.color,
    age: p.age,
    vita: p.vita,
    style: p.style,
    strengths,
    top,
    salary: m?.salary ?? p.salary,
    running: p.running,
    carry: p.carry,
    capacity: p.capacity,
    legacy: Boolean(p.legacy),
    hired: m?.hired,
    paid: m?.paid ?? 0,
    fee: hireFee(p),
    blocker: m ? null : hireBlocker(state, p.id),
    mandates: m
      ? currentMandates(m).flatMap((x) => {
          const s = company(x.id);
          if (!s || s.status !== "active") return [];
          return [{ id: s.id, name: s.name, type: opTypeOf(s), fit: fitOf(m, s), since: x.since, effects: effectsOf(m, s), created: created(s) - x.base }];
        })
      : [],
    claims: m ? allMandates(m).flatMap((x) => (x.until !== undefined && company(x.id)?.status === "active" ? [{ id: x.id, name: company(x.id)!.name }] : [])) : [],
  };
}

export function teamView(state: GameState): TeamView {
  const team = state.team ?? [];
  const companies = state.startups
    .filter((s) => s.status === "active" && !s.corporate)
    .map((s) => ({
      id: s.id,
      name: s.name,
      type: opTypeOf(s),
      lead: leadOf(state, s)?.member.name,
      fit: Object.fromEntries(team.map((m) => [m.id, fitOf(m, s)])),
    }));
  return {
    founded: state.familyOffice !== undefined,
    max: OP.max,
    team: team.map((m) => card(state, profileOf(m), m)),
    candidates: OP_PROFILES.filter((p) => !team.some((m) => m.profile === p.id)).map((p) => card(state, p)),
    companies,
    days: teamDays(state),
    daysMax: OP.daysMax,
    cost: team.reduce((sum, m) => sum + m.salary, 0),
    hireDays: OP.hireDays,
    recruiter: OP.recruiter,
    vestMonths: OP.vestMonths,
  };
}
