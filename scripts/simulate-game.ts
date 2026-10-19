// Balance-Report für das Boardroom-Spiel: Skript-Spieler × Startups × Seeds.
//   npm run simulate            (100 seeds, 24 Monate)
//   npm run simulate -- 200 36
import { analystBot, consultantBot, passiveBot, proBot, randomBot, runBot, yesBot, type Bot } from "../lib/game/bots";

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
