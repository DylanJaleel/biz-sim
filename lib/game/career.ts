import { CORPORATE_REPUTATION, FAMILY_OFFICE_REPUTATION, FAMILY_OFFICE_WORTH, FUND_REPUTATION, LEAD_REPUTATION } from "./config";
import type { GameState } from "./types";

// Die Karriereleiter vom Angel zum Investment-Mogul. Danach geht das Spiel
// weiter: mehr Firmen, größere Deals, der eigene Fonds wächst.

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
    {
      title: "Konzern-Aufsichtsrat",
      requirement: `Ein Mandat im Aufsichtsrat eines Konzerns (ab ${CORPORATE_REPUTATION} Ruf, mit angeführter Runde oder Mehrheit)`,
      done: state.corporateSeat === "joined",
    },
    {
      title: "Family Office",
      requirement: `Family Office gründen (ab ${FAMILY_OFFICE_REPUTATION} Ruf, ${(FAMILY_OFFICE_WORTH / 1_000_000).toLocaleString("de-DE")} Mio. € Vermögen, Büroetage mit Analyst)`,
      done: state.familyOffice !== undefined,
    },
    { title: "Investment-Mogul", requirement: `Eigenen Fonds auflegen (ab ${FUND_REPUTATION} Ruf, mit einem erfolgreichen Verkauf)`, done: state.fund !== undefined },
  ];
  let level = -1;
  for (let i = 0; i < steps.length; i++) if (steps[i]!.done) level = i;
  return { title: level >= 0 ? steps[level]!.title : "Privatinvestor", level, steps };
}
