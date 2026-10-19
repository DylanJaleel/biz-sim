import { describe, expect, it } from "vitest";
import { analystBot, consultantBot, passiveBot, proBot, runBot, yesBot, type Bot } from "../lib/game/bots";
import { START_CASH } from "../lib/game/config";

// Skript-Spieler über 24 Monate. Sie halten fest, wofür das Spiel steht:
// Wer nur zuschaut, verliert bei einem riskanten Startup Geld; wer vorbereitet
// entscheidet, schneidet klar besser ab als ein Ja-Sager.

const SEEDS = 30;
const MONTHS = 24;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

function play(bot: Bot) {
  const runs = Array.from({ length: SEEDS }, (_, i) => runBot(bot, i + 1, MONTHS));
  return {
    value: median(runs.map((r) => r.finalValue)),
    insolvency: runs.filter((r) => r.dead > 0).length / SEEDS,
    reputation: median(runs.map((r) => r.reputation)),
  };
}

describe("game balance", () => {
  const passive = play(passiveBot("pendelwerk"));
  const yes = play(yesBot("pendelwerk"));
  const analyst = play(analystBot("pendelwerk"));
  const consultant = play(consultantBot());
  const pro = play(proBot("pendelwerk"));

  it("only watching a risky startup loses money", () => {
    expect(passive.value).toBeLessThan(START_CASH);
    expect(passive.reputation).toBeLessThan(10);
  });

  it("careful preparation beats saying yes to everything", () => {
    expect(analyst.value).toBeGreaterThan(yes.value * 1.15);
    expect(analyst.value).toBeGreaterThan(START_CASH * 1.2);
    expect(analyst.insolvency).toBeLessThanOrEqual(0.15);
    expect(analyst.reputation).toBeGreaterThan(yes.reputation + 15);
  });

  it("consulting pays the bills but does not replace investing well", () => {
    expect(consultant.value).toBeGreaterThan(START_CASH);
    expect(consultant.value).toBeLessThan(analyst.value * 0.75);
  });

  it("exits, syndicates and offices reward skill but print no money", () => {
    expect(pro.value).toBeGreaterThan(analyst.value);
    expect(pro.value).toBeLessThan(analyst.value * 1.5);
  });

  it("startups can fail, but most survive two years", () => {
    expect(passive.insolvency).toBeGreaterThan(0);
    expect(passive.insolvency).toBeLessThan(0.5);
  });
}, 120_000);
