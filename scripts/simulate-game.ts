// Balance-Report für das Boardroom-Spiel: Skript-Spieler × Startups × Seeds.
//   npm run simulate            (100 seeds, 24 Monate)
//   npm run simulate -- 200 36
import { analystBot, consultantBot, mogulBot, passiveBot, peBot, proBot, randomBot, runBot, yesBot, type Bot, type BotRun } from "../lib/game/bots";

const seeds = Number(process.argv[2] ?? 100);
const months = Number(process.argv[3] ?? 24);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};
const eur = (v: number) => `${Math.round(v / 1000).toLocaleString("de-DE")} T€`.padStart(10);

console.log(`${seeds} Spiele à ${months} Monate (Start: 150 T€)\n`);
for (const prefer of ["pendelwerk", "kantinenkasse"]) {
  console.log(`Startup: ${prefer}`);
  console.log("Spieler".padEnd(12) + "Wert (Median)   Insolvenz  Verkauf   Reputation  stark/fair/schwach");
  const bots: Bot[] = [passiveBot(prefer), yesBot(prefer), randomBot(prefer), analystBot(prefer), proBot(prefer), consultantBot()];
  for (const bot of bots) {
    const runs = Array.from({ length: seeds }, (_, i) => runBot(bot, i + 1, months));
    const j = runs.reduce((acc, r) => ({ strong: acc.strong + r.judgments.strong, fair: acc.fair + r.judgments.fair, weak: acc.weak + r.judgments.weak }), { strong: 0, fair: 0, weak: 0 });
    const total = Math.max(1, j.strong + j.fair + j.weak);
    console.log(
      bot.name.padEnd(12) +
        eur(median(runs.map((r) => r.finalValue))) +
        `${Math.round((runs.filter((r) => r.dead > 0).length / seeds) * 100)} %`.padStart(12) +
        `${Math.round((runs.filter((r) => r.exited > 0).length / seeds) * 100)} %`.padStart(10) +
        String(Math.round(median(runs.map((r) => r.reputation)))).padStart(12) +
        `   ${Math.round((j.strong / total) * 100)}/${Math.round((j.fair / total) * 100)}/${Math.round((j.weak / total) * 100)} %`,
    );
  }
  console.log("");
}

// Phase 3 im Detail: Wohin kommt der Profi?
const pro = Array.from({ length: seeds }, (_, i) => runBot(proBot("pendelwerk"), i + 1, months));
const share = (f: (r: (typeof pro)[number]) => boolean) => `${Math.round((pro.filter(f).length / seeds) * 100)} %`;
console.log(
  `Profi (pendelwerk): Büro-Stufe Median ${median(pro.map((r) => r.office))}, Aufsichtsrat ${share((r) => r.corporate)}, Runde angeführt ${share((r) => r.ledRounds > 0)}, Verkauf ${share((r) => r.exited > 0)}`,
);

// Das lange Spiel: fünf Jahre, mit Deal-Generator, Family Office, Fonds und Börsengängen.
const long = Number(process.argv[4] ?? 60);
console.log(`\nLanges Spiel: ${Math.min(seeds, 40)} Spiele à ${long} Monate`);
console.log("Spieler".padEnd(12) + "Wert (Median)   P25 / P75            Insolvenz  Karriere  Mandate  Nachfolgen  Börsengänge");
const STEPS = ["Angel", "Lead", "M&A-Berater", "Mehrheit", "Aufsichtsrat", "Family Office", "Mogul", "Plattform"];
const longRuns: Record<string, BotRun[]> = {};
for (const bot of [passiveBot("pendelwerk"), yesBot("pendelwerk"), analystBot("pendelwerk"), proBot("pendelwerk"), mogulBot("pendelwerk"), peBot("pendelwerk")]) {
  const runs = Array.from({ length: Math.min(seeds, 40) }, (_, i) => runBot(bot, i + 1, long));
  longRuns[bot.name] = runs;
  const sorted = runs.map((r) => r.finalValue).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))]!;
  console.log(
    bot.name.padEnd(12) +
      eur(median(sorted)) +
      `   ${eur(q(0.25)).trim()} / ${eur(q(0.75)).trim()}`.padEnd(22) +
      `${Math.round((runs.filter((r) => r.dead > 0).length / runs.length) * 100)} %`.padStart(10) +
      (STEPS[median(runs.map((r) => r.career))] ?? "–").padStart(14) +
      String(median(runs.map((r) => r.mandates))).padStart(8) +
      String(runs.reduce((a, r) => a + r.buyouts, 0)).padStart(12) +
      String(runs.reduce((a, r) => a + r.ipos, 0)).padStart(13),
  );
}

// Mittelstand: Mandate, Nachfolge-Programm, Buy-and-Build.
console.log("\nMittelstand im langen Spiel (Summen über alle Spiele, Vermögen je Jahresende als Median)");
for (const name of ["Mogul", "PE-Profi"]) {
  const runs = longRuns[name] ?? [];
  const sum = (f: (r: BotRun) => number) => runs.reduce((a, r) => a + f(r), 0);
  const exits = runs.flatMap((r) => r.mna.platformExits);
  const sold = exits.filter((e) => !e.forced);
  const years = Math.max(0, ...runs.map((r) => r.curve.length));
  const curve = Array.from({ length: years }, (_, y) => median(runs.map((r) => r.curve[y] ?? 0)));
  console.log(
    `${name}: Mandate ${sum((r) => r.mna.mandatesDone)} abgeschlossen / ${sum((r) => r.mna.mandatesFailed)} gescheitert (Median-Honorar je Spiel ${eur(median(runs.map((r) => r.mna.mandateFees))).trim()}), ` +
      `Suchen ${sum((r) => r.mna.searchesStarted)} (ohne Kauf ${sum((r) => r.mna.searchesFailed)}), Käufe ${sum((r) => r.mna.acquisitions)}, Übergaben gut/holprig ${sum((r) => r.mna.successions)}/${sum((r) => r.mna.troubledHandovers)}, ` +
      `Zukäufe ${sum((r) => r.mna.addons)} (Synergien ${sum((r) => r.mna.synergies)}, missglückt ${sum((r) => r.mna.integrationFailures)}), Covenant-Brüche ${sum((r) => r.mna.covenantBreaches)}, Zwangsverkäufe ${sum((r) => r.mna.forcedSales)}`,
  );
  console.log(
    `  Plattform-Exits ${sold.length}, Multiple beim Kauf/Verkauf (Median) ${median(sold.map((e) => e.entryMultiple))}× / ${median(sold.map((e) => e.multiple))}×, MOIC Median ${median(sold.map((e) => e.moic))}×, ` +
      `MOIC unter 1: ${exits.filter((e) => e.moic < 1).length} von ${exits.length}`,
  );
  console.log(`  Vermögen je Jahr (Median): ${curve.map((v) => eur(v).trim()).join(" → ")}`);
}
