import { INSOLVENCY_NEGATIVE_CASH_WEEKS, OVERDRAFT_LIMIT } from "./config";
import type { WeekSummary } from "./economy";
import type { GameStatus } from "./outcome";

export interface WeekWarning {
  level: "critical" | "warning";
  title: string;
  text: string;
}

const euro = (value: number) => `${value.toLocaleString("de-DE")} €`;

/** Hints shown under the week summary, most severe first. */
export function buildWeekWarnings(summary: WeekSummary, status: GameStatus): WeekWarning[] {
  const warnings: WeekWarning[] = [];

  if (status === "ACTIVE" && summary.cashAfter < 0) {
    warnings.push({
      level: "critical",
      title: "Kapital im Minus",
      text: `Die Bank duldet den Dispo bis ${euro(OVERDRAFT_LIMIT)} und höchstens ${INSOLVENCY_NEGATIVE_CASH_WEEKS} Wochen in Folge. Danach droht die Insolvenz.`,
    });
  }

  if (summary.profit < 0 && summary.cashAfter >= 0) {
    warnings.push({
      level: "warning",
      title: "Verlustwoche",
      text: "Die Kosten waren höher als die Einnahmen. Nutze deine Stunden besser aus oder wähle lukrativere Aufträge.",
    });
  }

  if (summary.defects > 0) {
    warnings.push({
      level: "warning",
      title: summary.defects === 1 ? "Reklamation" : `${summary.defects} Reklamationen`,
      text: "Nachbesserungen kosten Geld und Ruf. Bessere Werkzeuge und weniger Überlastung senken das Risiko.",
    });
  }

  if (summary.capacityHours > 0 && summary.utilization < 0.5) {
    warnings.push({
      level: "warning",
      title: "Schwache Auslastung",
      text: "Mehr als die Hälfte deiner Arbeitszeit blieb ungenutzt, die Fixkosten laufen trotzdem.",
    });
  }

  return warnings;
}
