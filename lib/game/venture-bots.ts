import { daysLeft } from "./engine";
import { committed, familyRead, investingFundRead, nextFundBlocker } from "./funds";
import { building, milestone, nextTranche, studioBlocker, studioCompanies, studioNeed, studioRead, trancheAmount } from "./studio";
import { FUND_FIRST_CLOSE, STUDIO_MAX, STUDIO_TRANCHES } from "./venture-config";
import type { GameAction, GameState } from "./types";
import { prepBlocker } from "./round-prep";
import { leverOpen } from "./rounds";
import { fulfilment, ipoChance, ventureChecks } from "./venture";

// Skript-Spieler für Fondsfamilie, LPAC und Venture Studio: so, wie ein
// umsichtiger Mensch es spielen würde (faire Vorschläge an den LPAC,
// Zugeständnisse, die nicht zu teuer sind, Tranchen erst am Meilenstein).

export function ventureActions(s: GameState, money: number): GameAction[] {
  const out: GameAction[] = roundActions(s);
  const family = familyRead(s);
  for (const v of family.votes.filter((x) => x.status === "open")) {
    const choice = v.kind === "extension" ? "waive" : v.kind === "fee" ? "stepdown" : "fair";
    out.push({ type: "lpac", voteId: v.id, choice });
  }
  if (s.familyOffice !== undefined && nextFundBlocker(s) === null) out.push({ type: "fund", move: "launch" });
  const r = family.raising;
  if (r) {
    const partner = s.team.some((m) => m.role !== "associate");
    for (const lp of r.lps.filter((l) => l.status === "wants")) out.push({ type: "fund", move: lp.wish === "keyPerson" && !partner ? "refuse" : "concede", lpId: lp.id });
    for (const lp of r.lps.filter((l) => l.status === "open").slice(0, 3)) out.push({ type: "fund", move: "pitch", lpId: lp.id });
    const sum = committed(r);
    const open = r.lps.some((l) => l.status === "open" || l.status === "wants");
    if (sum >= r.target || (sum >= r.target * FUND_FIRST_CLOSE && (!open || s.month - r.started >= 6))) out.push({ type: "fund", move: "close" });
  }
  if (studioBlocker(s) === null) {
    if (building(s).length < STUDIO_MAX && daysLeft(s) >= 8) {
      const risk = { low: 0, mid: 8, high: 18 } as const;
      const idea = [...studioRead(s).pool].sort((a, b) => b.market - risk[b.risk] + (b.pilot ? 10 : 0) - (a.market - risk[a.risk] + (a.pilot ? 10 : 0)))[0];
      if (idea) {
        const ceo = idea.ceos.reduce((best, c, i) => (c.strength > idea.ceos[best]!.strength ? i : best), 0);
        const seed = studioNeed(idea, 70) * STUDIO_TRANCHES[0].share;
        if (seed <= money * 0.25) out.push({ type: "studio", move: "found", ideaId: idea.id, ceo, keep: 70 });
      }
    }
    for (const c of studioCompanies(s).filter((x) => x.status === "active")) {
      const i = nextTranche(c);
      if (i > 0 && milestone(c, i).done && trancheAmount(c, i) <= money * 0.5) out.push({ type: "studio", move: "tranche", startupId: c.id, size: "plan" });
      if (!c.studio!.fundVote && investingFundRead(s)) out.push({ type: "studio", move: "fundAsk", startupId: c.id });
    }
  }
  return out;
}

/**
 * Growth rounds the way a careful board member plays them: prepare the round
 * half a year ahead (cautious price if the milestones are not all met), pitch
 * two investors, take the warm intro, push the price only with a second term
 * sheet in hand, prepare the listing once the banks are likely to say yes.
 */
export function roundActions(s: GameState): GameAction[] {
  const out: GameAction[] = [];
  for (const c of s.startups.filter((x) => x.status === "active" && x.venture && x.stake > 0)) {
    const path = c.venture!;
    const open = s.rounds.find((r) => r.startupId === c.id && r.status === "open");
    if (open?.terms) {
      if (open.terms.rivals > 0 && leverOpen(open.terms, "price")) out.push({ type: "ventureRound", startupId: c.id, move: "negotiate", lever: "price" });
      if (leverOpen(open.terms, "pref")) out.push({ type: "ventureRound", startupId: c.id, move: "negotiate", lever: "pref" });
      continue;
    }
    if (path.prep) {
      if (path.prep.pitched.length < 2) out.push({ type: "ventureRound", startupId: c.id, move: "pitch", investor: path.prep.pitched.length });
      if (!path.prep.intro) out.push({ type: "ventureRound", startupId: c.id, move: "intro" });
      continue;
    }
    if (prepBlocker(s, c, true) === null && ipoChance(s, c) >= 0.3) {
      out.push({ type: "ventureRound", startupId: c.id, move: "prepare", ipo: true, months: 3, ambition: "market" });
      continue;
    }
    if (prepBlocker(s, c, false) === null && path.next - s.month <= 6) {
      const f = fulfilment(ventureChecks(s, c));
      out.push({ type: "ventureRound", startupId: c.id, move: "prepare", months: f >= 0.9 ? 3 : 6, ambition: f >= 0.95 ? "market" : "cautious" });
    }
  }
  return out;
}
