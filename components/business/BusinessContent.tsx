import { InvestCard } from "@/components/business/InvestCard";
import { TeamCard } from "@/components/business/TeamCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import {
  EMPLOYEE_ADMIN_PER_WEEK,
  EMPLOYEE_INSURANCE_PER_WEEK,
  EMPLOYEE_ONBOARDING_WEEKS,
  EMPLOYEE_SKILL,
  EMPLOYEE_WEEKLY_WAGE,
  MARKET_SEGMENTS,
  MISSING_VEHICLE_FACTOR,
  VEHICLE_WEEKLY_COST,
  WORK_HOURS_PER_PERSON,
  toolConfig,
  workshopConfig,
} from "@/lib/config";
import { seatsTaken } from "@/lib/economy";
import { formatCurrency, formatHours, formatPercent } from "@/lib/format";
import { loadCompanyState } from "@/lib/repository/company";
import { requireCompanyId } from "@/lib/session";

export async function BusinessContent() {
  const state = await loadCompanyState(await requireCompanyId());
  const { business, weekNumber } = state;

  const tool = toolConfig(business.toolLevel);
  const nextTool = business.toolLevel < 3 ? toolConfig(business.toolLevel + 1) : null;
  const workshop = workshopConfig(business.workshopLevel);
  const nextWorkshop = business.workshopLevel < 3 ? workshopConfig(business.workshopLevel + 1) : null;
  const people = seatsTaken(business, weekNumber);

  const fixedTotal = state.fixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const openHours = state.availableOrders.reduce((sum, order) => sum + order.hours, 0);
  const openMargin = state.availableOrders.reduce((sum, order) => sum + order.payout - order.materialNeed, 0);
  const averageMargin = openHours > 0 ? openMargin / openHours : 0;
  const breakEvenHours = averageMargin > 0 ? fixedTotal / averageMargin : null;

  const newHireHours = WORK_HOURS_PER_PERSON * tool.efficiency * EMPLOYEE_SKILL;
  const newTierName = nextTool ? MARKET_SEGMENTS[nextTool.level - 1].name : null;

  return (
    <>
      <PageHeader title="Betrieb" subtitle="Team, Ausstattung und Standort" />

      <Card title="Fixkosten pro Woche">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Fixkosten" value={formatCurrency(fixedTotal)} />
          <StatTile
            label="Break-even"
            value={breakEvenHours ? formatHours(breakEvenHours) : "–"}
            hint={`bei Ø ${formatCurrency(averageMargin)}/Std. Marge`}
          />
        </div>
        <dl className="mt-4 space-y-1 text-sm">
          {state.fixedCosts.map((item) => (
            <div key={item.key} className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <dt>{item.label}</dt>
              <dd className="tabular-nums">{formatCurrency(item.amount)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Erst Stunden über dem Break-even machen Gewinn – den du in Wachstum steckst. Die Kreditrate kommt oben drauf.
        </p>
      </Card>

      <TeamCard team={state.team} seats={workshop.seats} />

      <InvestCard
        kind="hire"
        title="Geselle einstellen"
        status={`${people} von ${workshop.seats} Plätzen belegt`}
        details={[
          `Lohn ${formatCurrency(EMPLOYEE_WEEKLY_WAGE)}/Woche plus ${formatCurrency(
            EMPLOYEE_INSURANCE_PER_WEEK + EMPLOYEE_ADMIN_PER_WEEK,
          )} Nebenkosten`,
          `Bringt ca. ${formatHours(newHireHours)}/Woche – in den ersten ${EMPLOYEE_ONBOARDING_WEEKS} Wochen nur die Hälfte`,
          "Fängt nächste Woche an. Braucht ein eigenes Fahrzeug, sonst verliert er Zeit.",
          "Du selbst verlierst etwas Arbeitszeit für Planung und Anleitung.",
        ]}
        action="Einstellen"
        check={state.investmentChecks.hire}
      />

      <InvestCard
        kind="vehicle"
        title="Fahrzeug kaufen"
        status={`${business.vehicles} ${business.vehicles === 1 ? "Fahrzeug" : "Fahrzeuge"} für ${people} ${people === 1 ? "Person" : "Personen"}`}
        details={[
          `Unterhalt ${formatCurrency(VEHICLE_WEEKLY_COST)}/Woche`,
          `Ohne Fahrzeug arbeitet eine Person nur mit ${formatPercent(MISSING_VEHICLE_FACTOR)} ihrer Zeit`,
        ]}
        action="Kaufen"
        check={state.investmentChecks.vehicle}
      />

      <InvestCard
        kind="tools"
        title="Werkzeugqualität"
        status={`Stufe ${tool.level} · ${tool.name}`}
        details={
          nextTool
            ? [
                `${nextTool.name}: ${formatPercent(nextTool.efficiency)} nutzbare Zeit (jetzt ${formatPercent(tool.efficiency)})`,
                `Reklamationen sinken von ${formatPercent(tool.defectRate)} auf ${formatPercent(nextTool.defectRate)}`,
                `Schaltet „${newTierName}“ frei`,
                `Pflege ${formatCurrency(nextTool.upkeepPerPerson)} statt ${formatCurrency(tool.upkeepPerPerson)} pro Person/Woche`,
              ]
            : ["Mehr geht nicht – deine Ausstattung ist erstklassig."]
        }
        action="Aufrüsten"
        check={state.investmentChecks.tools}
      />

      <InvestCard
        kind="workshop"
        title="Werkstatt"
        status={`${workshop.name} · ${workshop.seats} Plätze · ${formatCurrency(workshop.rentPerWeek)}/Woche`}
        details={
          nextWorkshop
            ? [
                `${nextWorkshop.name}: ${nextWorkshop.seats} Plätze`,
                `Miete ${formatCurrency(nextWorkshop.rentPerWeek)} statt ${formatCurrency(workshop.rentPerWeek)}/Woche`,
              ]
            : ["Größer geht es an diesem Standort nicht."]
        }
        action="Umziehen"
        check={state.investmentChecks.workshop}
      />

      <Card title="Zweiter Standort">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          In Planung: Mit großer Werkstatt, Meister-Ausstattung, gutem Ruf und einem starken Team kannst du irgendwann
          eine Filiale in einer anderen Stadt eröffnen – mit eigenem Markt, eigenem Betriebsleiter und hohem
          Startkapital.
        </p>
      </Card>
    </>
  );
}
