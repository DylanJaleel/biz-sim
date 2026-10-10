import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatTile } from "@/components/ui/StatTile";
import { formatCurrency } from "@/lib/format";
import { calculateWeeklyLoanCharge } from "@/lib/loan";
import { loadCompanyState } from "@/lib/repository/company";
import { requireCompanyId } from "@/lib/session";

export async function BankContent() {
  const state = await loadCompanyState(await requireCompanyId());
  const { loan } = state;
  const charge = calculateWeeklyLoanCharge(loan);
  const repaid = loan.principal - loan.remainingBalance;

  return (
    <>
      <PageHeader title="Bank" subtitle="Bankwesen und Kredite" />

      <Card title="Dein Kredit">
        <div className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {formatCurrency(loan.remainingBalance)}
        </div>
        <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Restschuld von {formatCurrency(loan.principal)}
        </div>
        <div className="mt-4">
          <ProgressBar
            value={repaid}
            max={loan.principal}
            label={`${formatCurrency(repaid)} getilgt`}
          />
        </div>
      </Card>

      <Card title="Diese Woche fällig">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Rate" value={formatCurrency(charge.totalPayment)} />
          <StatTile label="Tilgung" value={formatCurrency(charge.principalPayment)} />
          <StatTile label="Zinsen" value={formatCurrency(charge.interestPayment)} />
        </div>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          {(loan.annualInterestRate * 100).toLocaleString("de-DE")} % Zinsen p. a., lineare Tilgung
          über {loan.termWeeks} Wochen. Die Rate wird bei jedem Rundenabschluss automatisch
          abgebucht.
        </p>
      </Card>
    </>
  );
}
