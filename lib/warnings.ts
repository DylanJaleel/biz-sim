import { INSOLVENCY_NEGATIVE_CASH_WEEKS } from "./config";
import type { GameStatus } from "./outcome";
import type { RoundSummary } from "./round";

export interface WeekWarning {
  level: "critical" | "warning";
  title: string;
  text: string;
}

/** Hints shown under the week summary, most severe first. */
export function buildWeekWarnings(summary: RoundSummary, status: GameStatus): WeekWarning[] {
  const warnings: WeekWarning[] = [];

  if (status === "ACTIVE" && summary.cashAfter < 0) {
    warnings.push({
      level: "critical",
      title: "Kapital im Minus",
      text: `Bleibt dein Kapital ${INSOLVENCY_NEGATIVE_CASH_WEEKS} Wochen in Folge negativ, droht die Insolvenz.`,
    });
  }

  if (summary.revenue === 0) {
    warnings.push({
      level: "warning",
      title: "Kein Umsatz",
      text: "Du hast keinen Auftrag abgewickelt, die Kreditrate wird trotzdem fällig.",
    });
  }

  return warnings;
}
