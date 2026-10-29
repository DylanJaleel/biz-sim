import { daysLeft, netWorth } from "./engine";
import { holdingsValue } from "./market";
import { announcedTurn, estateRead, estateTotals, financing, kindBlocker, maxLtv } from "./estate";
import { councilQuestion, CHARTER, DYNASTY, dynastyRead, handoverChecks } from "./dynasty";
import { FOUNDATION, foundationBlocker } from "./legacy";
import type { GameAction, GameState } from "./types";
import type { Binding, EstateKind } from "./wealth-types";

// Wie die Skript-Spieler Immobilien, Stiftung und Dynastie grob nutzen, damit
// die Simulation die neuen Teile abdeckt. Kein optimales Spiel.

export type WealthStyle = "expert" | "mogul" | "pe";

const STYLE: Record<WealthStyle, { kinds: EstateKind[]; ltv: number; binding: Binding; share: number; from: number; penthouse: boolean; foundation: boolean; dynasty: boolean }> = {
  expert: { kinds: ["mfh", "wohnung"], ltv: 0.7, binding: 10, share: 0.15, from: 3_000_000, penthouse: false, foundation: false, dynasty: false },
  mogul: { kinds: ["mfh"], ltv: 0.6, binding: 15, share: 0.12, from: 4_000_000, penthouse: true, foundation: true, dynasty: true },
  pe: { kinds: ["gewerbe", "mfh"], ltv: 1, binding: 5, share: 0.2, from: 5_000_000, penthouse: false, foundation: false, dynasty: false },
};

export function wealthActions(s: GameState, style: WealthStyle): GameAction[] {
  const st = STYLE[style];
  const out: GameAction[] = [];
  const worth = netWorth(s);
  const d = dynastyRead(s);
  if (st.dynasty && s.familyOffice !== undefined) {
    if (!d.heir && d.generation === 1 && d.lost.length < 2) out.push({ type: "dynasty", move: "choose", heir: d.lost.includes("schuetzling") ? "kind" : "schuetzling" });
    if (d.heir && d.generation === 1) {
      const stalled = d.heir.stalled !== undefined;
      for (let i = 0; i < (stalled ? 3 : 2); i++) out.push({ type: "dynasty", move: "mentor" });
      const next = CHARTER.find((c) => !d.charter.includes(c.id));
      if (next && (d.charter.length < 3 || d.cohesion < DYNASTY.cohesion)) out.push({ type: "dynasty", move: "charter", article: next.id });
      if (handoverChecks(s).every((c) => c.done)) out.push({ type: "dynasty", move: "handover" });
    }
    const q = councilQuestion(s);
    if (q) out.push({ type: "dynasty", move: "council", choice: (q.options[0].cost ?? 0) <= s.cash * 0.1 ? 0 : 1 });
    if (d.generation === 2 && !d.strategy) out.push({ type: "dynasty", move: "strategy", strategy: "ausgewogen" });
  }
  if (st.foundation && foundationBlocker(s, worth) === null && worth >= 8_000_000 && s.cash > FOUNDATION.minCapital + 400_000)
    out.push({ type: "foundation", move: "found", amount: FOUNDATION.minCapital, purpose: "nachfolge" });
  if (worth < st.from || daysLeft(s) < 3) return out;
  const totals = estateTotals(s);
  const offers = estateRead(s).offers;
  const turn = announcedTurn(s.month);
  const binding: Binding = turn?.up ? 15 : turn ? 5 : st.binding;
  const reserve = 300_000;
  // Money parked in the depot comes out first (the expert keeps spare cash in the market).
  const afford = (need: number): boolean => {
    if (s.cash > need) return true;
    if (s.cash + holdingsValue(s.market) * 0.9 < need) return false;
    out.push(
      { type: "trade", assetId: "tagesgeld", amount: -s.market.holdings.tagesgeld * s.market.prices.tagesgeld },
      { type: "trade", assetId: "tech", amount: -(need - s.cash) * 1.01 },
    );
    return true;
  };
  if (st.penthouse && s.office >= 3 && !estateRead(s).owned.some((p) => p.kind === "penthouse")) {
    const o = offers.find((x) => x.kind === "penthouse" && kindBlocker(s, x.kind, worth) === null);
    if (o) {
      const f = financing(s, o, maxLtv(o.kind), binding);
      if (afford(f.cash + reserve)) out.push({ type: "estate", move: "buy", offerId: o.id, ltv: maxLtv(o.kind), binding });
    }
  }
  if (totals.investValue < worth * st.share) {
    for (const kind of st.kinds) {
      const o = offers.find((x) => x.kind === kind && kindBlocker(s, x.kind, worth) === null);
      if (!o) continue;
      const ltv = Math.min(st.ltv, maxLtv(kind));
      const f = financing(s, o, ltv, binding);
      if (afford(f.cash + reserve)) {
        out.push({ type: "estate", move: "buy", offerId: o.id, ltv, binding });
        break;
      }
    }
  }
  return out;
}
