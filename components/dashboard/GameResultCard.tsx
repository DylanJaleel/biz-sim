import { RestartButton } from "@/components/dashboard/RestartButton";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { INSOLVENCY_NEGATIVE_CASH_WEEKS, TARGET_CUMULATIVE_PROFIT } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import type { GameStatus } from "@/lib/outcome";

const RESULTS: Record<Exclude<GameStatus, "ACTIVE">, { title: string; text: string; tone: string }> = {
  WON: {
    title: "Geschafft!",
    text: `Der Kredit ist getilgt und du hast mindestens ${formatCurrency(TARGET_CUMULATIVE_PROFIT)} Gewinn erwirtschaftet.`,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  FAILED: {
    title: "Ziel verfehlt",
    text: `Die Zeit ist um, aber der Kredit ist nicht getilgt oder der Gewinn liegt unter ${formatCurrency(TARGET_CUMULATIVE_PROFIT)}.`,
    tone: "text-amber-600 dark:text-amber-400",
  },
  INSOLVENT: {
    title: "Insolvenz",
    text: `Dein Kapital war ${INSOLVENCY_NEGATIVE_CASH_WEEKS} Wochen in Folge negativ.`,
    tone: "text-red-600 dark:text-red-400",
  },
};

export function GameResultCard({
  status,
  weekNumber,
  cash,
  loanRemaining,
}: {
  status: Exclude<GameStatus, "ACTIVE">;
  weekNumber: number;
  cash: number;
  loanRemaining: number;
}) {
  const result = RESULTS[status];

  return (
    <Card>
      <h2 className={`text-3xl font-bold tracking-tight ${result.tone}`}>{result.title}</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{result.text}</p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatTile label="Wochen" value={`${weekNumber}`} />
        <StatTile label="Endkapital" value={formatCurrency(cash)} />
        <StatTile label="Restschuld" value={formatCurrency(loanRemaining)} />
      </div>
      <div className="mt-5">
        <RestartButton />
      </div>
    </Card>
  );
}
