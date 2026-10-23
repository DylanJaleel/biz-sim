// Analyse: woher kommt das Vermögen eines Bots? Netto-Vermögen nach Jahren und Einnahmen nach Quelle.
//   npx tsx scripts/wealth-trace.ts [seeds] [months] [bot]
import { analystBot, expertBot, mogulBot, proBot, runBot, type Bot } from "../lib/game/bots";

const seeds = Number(process.argv[2] ?? 6);
const months = Number(process.argv[3] ?? 84);
const which = process.argv[4] ?? "expert";
const bots: Record<string, Bot> = {
  expert: expertBot(),
  sell: expertBot({ hold: false }, "Experte (verkauft)"),
  nodepot: expertBot({ depot: false }, "Experte (ohne Depot)"),
  noshares: expertBot({ shares: false }, "Experte (ohne Anteilskäufe)"),
  mogul: mogulBot("pendelwerk"),
  pro: proBot("pendelwerk"),
  analyst: analystBot("pendelwerk"),
};
const bot = bots[which]!;
const m = (v: number) => `${(v / 1e6).toFixed(2)}`.padStart(8);
const years = [1, 2, 3, 5, 7, 10].filter((y) => y * 12 <= months);
console.log(`${bot.name}: ${seeds} Spiele à ${months} Monate. Vermögen in Mio. € nach Jahr ${years.join("/")}`);
const sums: Record<string, number> = {};
for (let seed = 1; seed <= seeds; seed++) {
  const t = Date.now();
  const r = runBot(bot, seed, months);
  for (const [k, v] of Object.entries(r.income)) sums[k] = (sums[k] ?? 0) + v / seeds;
  console.log(
    `Seed ${String(seed).padStart(2)}: ${years.map((y) => m(r.worth[y * 12 - 1]!)).join("")}   Ruf ${r.reputation}  Karriere ${r.career}  Mandate ${r.mandates}  Verkäufe ${r.exited}  Börse ${r.ipos}  (${Math.round((Date.now() - t) / 1000)} s)`,
  );
}
console.log("Einnahmen im Schnitt (Summe über das Spiel, T€):");
console.log(
  Object.entries(sums)
    .map(([k, v]) => `${k} ${Math.round(v / 1000)}`)
    .join(", "),
);
