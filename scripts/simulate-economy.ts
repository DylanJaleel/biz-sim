// Prints how scripted players fare in the economy. Used to calibrate lib/config.ts.
//   npm run simulate            (200 seeds, 104 weeks)
//   npm run simulate -- 500 156
import { aggregate, careless, grower, passive, reckless, simulate, solo, type Strategy } from "../lib/simulation";

const seeds = Number(process.argv[2] ?? 200);
const weeks = Number(process.argv[3] ?? 104);

const strategies: Strategy[] = [passive, careless, solo, grower({ maxEmployees: 2 }), grower({ maxEmployees: 5 }), reckless];

const pct = (value: number) => `${Math.round(value * 100)}%`;
const eur = (value: number) => `${Math.round(value).toLocaleString("de-DE")}`.padStart(8);

console.log(`${seeds} Spielverläufe à ${weeks} Wochen\n`);
console.log("Strategie".padEnd(24) + "Pleite  Wo.(med)  Gewinn J1  Gewinn J2  Wert(med)  MA(end)  Auslastung");
for (const strategy of strategies) {
  const results = Array.from({ length: seeds }, (_, i) => simulate({ seed: i + 1, weeks, strategy }));
  const a = aggregate(results);
  console.log(
    strategy.name.padEnd(24) +
      pct(a.insolvencyShare).padStart(6) +
      String(a.medianWeeksPlayed).padStart(10) +
      eur(a.avgProfitFirstYear) +
      "  " +
      eur(a.avgProfitSecondYear) +
      "  " +
      eur(a.medianValue) +
      String(a.medianHeadcountEnd).padStart(8) +
      pct(a.avgUtilization).padStart(12),
  );
}

// Timeline of the growth strategies: median headcount and cash at checkpoints.
console.log("\nVerlauf (Median über alle Läufe, nur überlebende Verläufe zählen am jeweiligen Zeitpunkt)");
for (const strategy of [grower({ maxEmployees: 2 }), grower({ maxEmployees: 5 })]) {
  const results = Array.from({ length: seeds }, (_, i) => simulate({ seed: i + 1, weeks, strategy }));
  console.log(strategy.name);
  for (const week of [13, 26, 52, 78, 104, 156, 208].filter((w) => w <= weeks)) {
    const records = results.map((r) => r.records[week - 1]).filter(Boolean);
    if (records.length === 0) continue;
    const med = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    console.log(
      `  Woche ${String(week).padStart(3)}: Team ${med(records.map((r) => r.headcount))}  Kapital ${eur(med(records.map((r) => r.cashAfter)))}  Gewinn/Wo. ${eur(med(records.map((r) => r.profit)))}  Ruf ${Math.round(med(records.map((r) => r.reputation)))}  (${records.length}/${results.length} aktiv)`,
    );
  }
}

// When do the failures of the optimal solo player happen?
{
  const results = Array.from({ length: seeds }, (_, i) => simulate({ seed: i + 1, weeks, strategy: solo }));
  const failed = results.filter((r) => r.insolvent).map((r) => r.weeksPlayed);
  const buckets = new Map<string, number>();
  for (const week of failed) {
    const key = `Woche ${Math.floor((week - 1) / 13) * 13 + 1}-${Math.floor((week - 1) / 13) * 13 + 13}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  console.log("\nInsolvenzen des optimalen Solo-Spielers nach Quartal:", [...buckets.entries()].map(([k, v]) => `${k}: ${v}`).join(" | ") || "keine");
}
