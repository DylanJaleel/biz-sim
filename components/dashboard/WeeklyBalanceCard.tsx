import { BalanceLines } from "@/components/dashboard/BalanceLines";
import { Card } from "@/components/ui/Card";
import type { RoundSummary } from "@/lib/round";

export function WeeklyBalanceCard({ summary }: { summary: RoundSummary }) {
  return (
    <Card title={`Letzte Wochenbilanz · Woche ${summary.weekNumber}`}>
      <BalanceLines summary={summary} />
    </Card>
  );
}
