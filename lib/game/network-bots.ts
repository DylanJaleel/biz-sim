import { daysLeft, openItems } from "./engine";
import { mnaRead } from "./mna-core";
import { activeMandates, mandateCapacity } from "./mna";
import { contactDef, contactRead, ringOpen } from "./network";
import { RIVAL_WARMTH, SPECIALIST_WARMTH_MIN } from "./network-config";
import { eventCost, eventDef } from "./network-events";
import { FAVORS, specialistBlocker } from "./network-life";
import { leadOf } from "./team";
import type { GameAction, GameState } from "./types";

// Wie die Skript-Spieler das Netzwerk nutzen: Bitten beantworten, passende
// Veranstaltungen besuchen, Spezialisten bei Übernahmen einsetzen und
// Konkurrenten mit einem Treffen entschärfen.

export type NetStyle = "expert" | "mogul" | "pe";

/** Which events each style goes to. */
const EVENTS_OF: Record<NetStyle, string[]> = {
  expert: ["startup_nacht", "gruenderpreis", "neujahr", "sommerfest", "fo_forum"],
  mogul: ["ma_konferenz", "fo_forum", "unternehmertag", "golf", "sommerfest"],
  pe: ["ma_konferenz", "fo_forum", "golf"],
};

/** Specialists each style keeps warm. */
const KEEP_WARM: Record<NetStyle, string[]> = {
  expert: [],
  mogul: ["wp", "kanzlei", "boutique", "interim"],
  pe: ["levfin", "boutique", "kartell", "wp"],
};

export function networkActions(s: GameState, style: NetStyle): GameAction[] {
  const out: GameAction[] = [];
  const net = s.network;
  // Board work comes first: the network only gets the days it leaves over.
  const own = openItems(s).filter((i) => !leadOf(s, i.startupId));
  let budget = daysLeft(s) - own.length * 3 - 4;
  const spend = (days: number) => {
    if (days > budget) return false;
    budget -= days;
    return true;
  };
  // Favours: yes when it is cheap enough, otherwise a clear no (never let them lapse).
  for (const f of net?.favors ?? []) {
    const def = FAVORS[f.kind];
    const ok = def.days <= 2 && (def.cash ?? 0) <= s.cash * 0.02 && (!def.risk || s.cash > def.risk.amount * 8) && spend(def.days);
    out.push({ type: "favor", favorId: f.id, accept: ok });
  }
  // Events: the ones that fit the style, when affordable; talks when possible. Next month's are booked at its start.
  for (const e of net?.events ?? []) {
    if (e.status !== "invited") continue;
    const def = eventDef(e.def);
    if (!def) continue;
    const talk = Boolean(def.talk && s.reputation >= def.talk.from);
    const cost = eventCost(s, def, talk);
    const want = EVENTS_OF[style].includes(def.id) && cost.money <= Math.max(3_000, s.cash * 0.01) && cost.days <= 4;
    if (want && (e.month > s.month || spend(cost.days))) out.push({ type: "event", eventId: e.id, move: "accept", talk });
    else if (e.month === s.month || !want) out.push({ type: "event", eventId: e.id, move: "decline" });
  }
  // A rival bids for a company we want: one meeting may be enough.
  const rivals = [
    ...s.startups.filter((x) => x.status === "offered" && x.offer?.rival && !x.offer.rival.defused).map((x) => x.offer!.rival!.contactId),
    ...mnaRead(s)
      .addons.filter((a) => a.status === "open" && a.rival && !a.rival.defused)
      .map((a) => a.rival!.contactId),
  ];
  const met = new Set<string>();
  for (const id of new Set(rivals)) {
    const c = contactRead(s, id);
    if (ringOpen(s, contactDef(id).ring) && c.warmth + (c.met ? 15 : 30) >= RIVAL_WARMTH && spend(1)) {
      out.push({ type: "meetContact", contactId: id });
      met.add(id);
    }
  }
  // Specialists on deals, add-ons, mandates and own companies.
  const hire = (contactId: string, targetId?: string) => {
    if (specialistBlocker(s, contactId, targetId) === null && spend(1)) out.push({ type: "specialist", contactId, ...(targetId ? { targetId } : {}) });
  };
  for (const d of s.startups.filter((x) => x.status === "offered" && x.offer?.ev)) {
    hire("wp", d.id);
    hire("kanzlei", d.id);
    hire("levfin", d.id);
  }
  for (const a of mnaRead(s).addons.filter((x) => x.status === "open" || x.status === "review")) {
    if (style === "mogul") hire("wp", a.id);
    const platform = s.startups.find((x) => x.id === a.platformId);
    if (platform && (a.status === "review" || (platform.metrics.revenue + a.revenue) * 12 > 55_000_000)) hire("kartell", a.id);
  }
  for (const m of mnaRead(s).mandates.filter((x) => x.status === "prep")) hire("wp", m.id);
  for (const o of s.startups.filter((x) => x.status === "active" && x.lbo)) {
    hire("levfin", o.id);
    const young = s.month - o.lbo!.acquired <= 3 || (o.platform?.integrations.length ?? 0) > 0;
    if (young && o.metrics.cash > 80_000) hire("interim", o.id);
  }
  if (activeMandates(s).length < mandateCapacity(s)) hire("boutique");
  // Keep the useful specialists warm: at most two meetings a month.
  const cold = KEEP_WARM[style].filter((id) => {
    const c = contactRead(s, id);
    return !met.has(id) && ringOpen(s, contactDef(id).ring) && c.warmth < SPECIALIST_WARMTH_MIN + 10;
  });
  for (const id of cold.slice(0, 2)) if (spend(1)) out.push({ type: "meetContact", contactId: id });
  return out;
}
