import { CORPORATE_REPUTATION, LEAD_REPUTATION } from "./config";
import type { GameState } from "./types";

// Die Karriereleiter vom Angel zum Investment-Mogul. Die ersten vier Stufen
// sind spielbar, die oberen kommen in späteren Phasen.

export interface CareerStep {
  title: string;
  requirement: string;
  done: boolean;
  /** Not playable yet. */
  later?: boolean;
}

export interface Career {
  title: string;
  level: number;
  steps: CareerStep[];
}

export function careerOf(state: GameState): Career {
  const invested = state.startups.some((s) => s.joined > 0);
  const led = state.ledRounds > 0;
  const majority = state.startups.some((s) => (s.status === "active" || s.status === "exited") && s.stake > 50);
  const steps: CareerStep[] = [
    { title: "Business Angel", requirement: "Bei einem Startup einsteigen", done: invested },
    { title: "Lead-Investor", requirement: `Eine Finanzierungsrunde anführen (ab ${LEAD_REPUTATION} Ruf)`, done: led },
    { title: "Mehrheitsgesellschafter", requirement: "Mehr als 50 % an einer Firma halten", done: majority },
    { title: "Konzern-Aufsichtsrat", requirement: `Ein Mandat im Aufsichtsrat eines Konzerns (ab ${CORPORATE_REPUTATION} Ruf, mit angeführter Runde oder Mehrheit)`, done: state.corporateSeat === "joined" },
    { title: "Family Office", requirement: "Eigenes Family Office mit Team", done: false, later: true },
    { title: "Investment-Mogul", requirement: "Eigene Private-Equity-Firma", done: false, later: true },
  ];
  let level = -1;
  for (let i = 0; i < steps.length; i++) if (steps[i]!.done) level = i;
  return { title: level >= 0 ? steps[level]!.title : "Privatinvestor", level, steps };
}
