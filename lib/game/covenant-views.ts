import { CONDITION_DELAY, OPEX_PER_HIRE } from "./config";
import { templateOf } from "./content";
import { COVENANTS, covenantOutlook, covenantSignals, pretalkHint, RISK_QUESTION, riskAnswer } from "./covenants";
import { covenantsOf, startupOf } from "./engine";
import type { OutcomeOutlook } from "./judge";
import { runwayMonths } from "./sim";
import { fill } from "./templates";
import type { BoardItem, CovenantId, GameState, MeetingDecision, Startup } from "./types";

// Was Seiten über Auflagen zeigen: die drei Optionen, Hinweise aus der
// Vorbereitung, die Zahlen des CFO, den Rückblick nach der Sitzung und die
// Folgetermine.

export interface CovenantOptionView {
  id: CovenantId;
  name: string;
  term: string;
  short: string;
}

export interface CovenantPlanView extends CovenantOptionView {
  outlook: OutcomeOutlook;
  cashAfter: number;
  runwayAfter: number;
}

export interface CovenantPrepView {
  options: CovenantOptionView[];
  /** The question about the risk; answered once asked. */
  risk: { id: string; q: string; a?: string };
  /** What the numbers show anyone: hints, not the answer. */
  signals: { label: string; value: string; alert: boolean }[];
  /** What members said about the risk in talks beforehand. */
  hints: { seat: string; short: string; text: string }[];
  /** The CFO's numbers for each condition, after the CFO talk. */
  plans: CovenantPlanView[] | null;
}

function optionView(id: CovenantId, s: Startup): CovenantOptionView {
  const def = COVENANTS[id];
  return { id, name: def.name, term: def.term, short: fill(def.short, s) };
}

export function covenantOptions(state: GameState, item: BoardItem): CovenantOptionView[] {
  const s = startupOf(state, item.startupId);
  return covenantsOf(state, item).options.map((id) => optionView(id, s));
}

/** Everything about the conditions of an open item that the preparation shows. */
export function covenantPrep(state: GameState, item: BoardItem): CovenantPrepView {
  const s = startupOf(state, item.startupId);
  const setup = covenantsOf(state, item);
  const t = templateOf(item.templateId);
  const asked = item.asked.includes(RISK_QUESTION.id);
  const hints = item.pretalks.flatMap((seat) => {
    const member = s.board.find((b) => b.seat === seat);
    const text = member ? pretalkHint(member, setup) : null;
    return member && text ? [{ seat, short: member.short, text }] : [];
  });
  let plans: CovenantPlanView[] | null = null;
  if (item.cfo) {
    const planned = covenantOutlook(t, s, setup);
    plans = planned.plans.map((p) => {
      // Cash and runway once the condition is in place (its first month).
      const soon = p.resolved.effects.filter((e) => e.delay <= CONDITION_DELAY);
      const cash = soon.reduce((sum, e) => sum + (e.delta.cash ?? 0), 0);
      const opex = soon.reduce((sum, e) => sum + (e.delta.opex ?? 0) + (e.delta.team ?? 0) * OPEX_PER_HIRE, 0);
      const metrics = { ...s.metrics, cash: s.metrics.cash + cash, opex: s.metrics.opex + opex };
      return { ...optionView(p.id, s), outlook: p.outlook, cashAfter: metrics.cash, runwayAfter: runwayMonths(metrics) };
    });
  }
  return {
    options: setup.options.map((id) => optionView(id, s)),
    risk: { id: RISK_QUESTION.id, q: RISK_QUESTION.q, ...(asked ? { a: riskAnswer(setup, s) } : {}) },
    signals: covenantSignals(s),
    hints,
    plans,
  };
}

export interface CovenantReviewView {
  fit: CovenantId;
  fitName: string;
  fitWhy: string;
  chosen?: CovenantId;
  chosenName?: string;
  /** Why the chosen condition missed, if it did. */
  missWhy?: string;
  /** The condition in force when the outcome was "conditions". */
  appliedName?: string;
  /** All options with their planned value, best first marked. */
  options: { key: string; label: string; value: number; best: boolean; mine: boolean; fit: boolean }[];
  /** The decision barely mattered: the options lay close together. */
  slight: boolean;
}

/** After the meeting: which condition fitted, why, and how all options compared. */
export function covenantReview(state: GameState, item: BoardItem, d: MeetingDecision): CovenantReviewView | undefined {
  if (!d.fit || !d.covenantValues || d.lapsed) return undefined;
  const s = startupOf(state, item.startupId);
  const values = d.covenantValues;
  const mine = d.vote === "conditions" ? (d.covenant ?? "standard") : d.vote;
  const ids = (Object.keys(values) as (CovenantId | "standard")[]).filter((k): k is CovenantId => k !== "standard");
  const options = [
    { key: "go", label: "Ja", value: d.values.go },
    ...ids.map((id) => ({ key: id, label: `Auflage: ${COVENANTS[id].name}`, value: values[id]! })),
    ...(mine === "standard" ? [{ key: "standard", label: "Auflagen ohne Wahl", value: values.standard! }] : []),
    { key: "no", label: "Nein", value: d.values.no },
  ].map((o) => ({ ...o, best: o.key === d.bestOption, mine: o.key === mine, fit: o.key === d.fit }));
  const chosen = d.vote === "conditions" ? d.covenant : undefined;
  return {
    fit: d.fit,
    fitName: COVENANTS[d.fit].name,
    fitWhy: fill(COVENANTS[d.fit].fitWhy, s),
    ...(chosen ? { chosen, chosenName: COVENANTS[chosen].name } : {}),
    ...(chosen && chosen !== d.fit ? { missWhy: fill(COVENANTS[chosen].missWhy, s) } : {}),
    ...(d.applied ? { appliedName: d.applied === "standard" ? "die Auflage des Gremiums" : COVENANTS[d.applied].name } : {}),
    options,
    slight: (d.weight ?? 1) < 0.25,
  };
}

export interface FollowUpView {
  itemId: string;
  startupId: string;
  startupName: string;
  title: string;
  covenant: string;
  until: number;
  /** Possible now (from the month after the decision). */
  ready: boolean;
}

/** Follow-up meetings still open: one day each, until the end of the given month. */
export function followUpsOf(state: GameState, startupId?: string): FollowUpView[] {
  return state.items
    .filter((i) => i.followUp && !i.followUp.done && !i.followUp.missed && i.decision && (!startupId || i.startupId === startupId))
    .flatMap((i) => {
      const s = startupOf(state, i.startupId);
      if (s.status !== "active") return [];
      const applied = i.decision!.applied;
      return [
        {
          itemId: i.id,
          startupId: s.id,
          startupName: s.name,
          title: fill(templateOf(i.templateId).title, s),
          covenant: applied && applied !== "standard" ? COVENANTS[applied].name : "Auflage",
          until: i.followUp!.until,
          ready: state.month > i.decision!.month,
        },
      ];
    });
}
