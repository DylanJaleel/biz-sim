import {
  BUYOUT_REPUTATION,
  BUYOUT_WORTH,
  CORPORATE_REPUTATION,
  FAMILY_OFFICE_REPUTATION,
  FAMILY_OFFICE_WORTH,
  FUND_EXITS,
  FUND_OFFICE_MONTHS,
  FUND_REPUTATION,
  LEAD_REPUTATION,
} from "./config";
import { MANDATE_REPUTATION, PLATFORM_REPUTATION } from "./mna-config";
import type { GameState } from "./types";
import { MAGNATE_TIERS, magnateTier } from "./estate";
import { FOUNDATION, FUND_FAMILY_AUM } from "./legacy";

// Die Karriereleiter vom Angel zum Investment-Mogul. Danach geht das Spiel
// weiter: mehr Firmen, größere Deals, der eigene Fonds wächst.

export interface CareerStep {
  title: string;
  requirement: string;
  done: boolean;
  /** Not playable yet. */
  later?: boolean;
  /** A goal beside the main path: nice to have, not needed for the next step. */
  side?: boolean;
  /** Tier reached on a step with tiers (e.g. "Silber"). */
  tier?: string;
}

export interface Career {
  title: string;
  level: number;
  steps: CareerStep[];
}

/** A buy-and-build platform with at least two add-ons was sold for more than the player put in. */
export function platformBuilt(state: GameState): boolean {
  return (state.mna?.record.platformExits ?? []).some((e) => !e.forced && e.addons >= 2 && e.moic > 1);
}

/** Assets under management of at least 1 billion euros at a month end, with an own fund. */
function fundFamily(state: GameState): boolean {
  return state.fund !== undefined && (state.wealth?.aumPeak ?? 0) >= FUND_FAMILY_AUM;
}

export function careerOf(state: GameState): Career {
  const invested = state.startups.some((s) => s.joined > 0);
  const led = state.ledRounds > 0;
  const majority = state.startups.some((s) => (s.status === "active" || s.status === "exited") && s.stake > 50);
  const steps: CareerStep[] = [
    { title: "Business Angel", requirement: "Bei einem Startup einsteigen", done: invested },
    { title: "Lead-Investor", requirement: `Eine Finanzierungsrunde anführen (ab ${LEAD_REPUTATION} Ruf)`, done: led },
    {
      title: "M&A-Berater",
      requirement: `Ein M&A-Mandat erfolgreich abschließen (Anfragen ab ${MANDATE_REPUTATION} Ruf, bei den Aufträgen)`,
      done: (state.mna?.record.mandatesDone ?? 0) > 0,
      side: true,
    },
    {
      title: "Mehrheitsgesellschafter",
      requirement: `Mehr als 50 % an einer Firma halten: eine Nachfolge kaufen (Angebote ab ${BUYOUT_REPUTATION} Ruf und ${(BUYOUT_WORTH / 1_000_000).toLocaleString("de-DE")} Mio. € Vermögen, gezielter über das Nachfolge-Programm)`,
      done: majority,
      side: true,
    },
    {
      title: "Konzern-Aufsichtsrat",
      requirement: `Ein Mandat im Aufsichtsrat eines Konzerns (ab ${CORPORATE_REPUTATION} Ruf, mit angeführter Runde oder Mehrheit)`,
      done: state.corporateSeat === "joined",
      side: true,
    },
    {
      title: "Immobilien-Magnat",
      requirement: `Immobilien als Anlage aufbauen, ohne Penthouse: ${MAGNATE_TIERS.map((t) => `${t.name} ab ${(t.value / 1_000_000).toLocaleString("de-DE")} Mio. €`).join(", ")} Marktwert`,
      done: magnateTier(state) >= 0,
      side: true,
      tier: magnateTier(state) >= 0 ? MAGNATE_TIERS[magnateTier(state)]!.name : undefined,
    },
    {
      title: "Family Office",
      requirement: `Family Office gründen (ab ${FAMILY_OFFICE_REPUTATION} Ruf, ${(FAMILY_OFFICE_WORTH / 1_000_000).toLocaleString("de-DE")} Mio. € Vermögen, Büroetage mit Analyst)`,
      done: state.familyOffice !== undefined,
    },
    {
      title: "Investment-Mogul",
      requirement: `Eigenen Fonds auflegen (ab ${FUND_REPUTATION} Ruf, ${FUND_EXITS} erfolgreiche Verkäufe, Family Office seit ${FUND_OFFICE_MONTHS} Monaten)`,
      done: state.fund !== undefined,
    },
    {
      title: "Plattform-Investor",
      requirement: `Eine Plattform mit mindestens zwei Zukäufen aufbauen und mit Gewinn verkaufen (ab ${PLATFORM_REPUTATION} Ruf, mit Family Office)`,
      done: platformBuilt(state),
    },
    {
      title: "Stifter/in",
      requirement: `Eine gemeinnützige Stiftung errichten (ab ${FOUNDATION.reputation} Ruf, ${(FOUNDATION.worth / 1_000_000).toLocaleString("de-DE")} Mio. € Vermögen, mindestens ${(FOUNDATION.minCapital / 1_000_000).toLocaleString("de-DE")} Mio. € Kapital)`,
      done: state.wealth?.foundation !== undefined,
    },
    {
      title: "Lebenswerk",
      requirement: "Eine Nachfolge aufbauen und das Family Office an die zweite Generation übergeben",
      done: state.wealth?.dynasty?.generation === 2,
    },
    {
      title: "Fondsfamilie",
      requirement: `${(FUND_FAMILY_AUM / 1_000_000_000).toLocaleString("de-DE")} Mrd. € verwaltetes Vermögen: Family Office, eigene Fonds mit dem Geld der Investoren, Stiftung`,
      done: fundFamily(state),
    },
  ];
  let level = -1;
  for (let i = 0; i < steps.length; i++) if (steps[i]!.done) level = i;
  return { title: level >= 0 ? steps[level]!.title : "Privatinvestor", level, steps };
}
