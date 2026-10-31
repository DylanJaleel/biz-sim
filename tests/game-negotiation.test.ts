import { describe, expect, it } from "vitest";
import { duelMood, GOOD_MOOD, hasBonusRound, moodKey, moodValue, roundsFor, tableMood } from "../lib/game/negotiation";

describe("Verhandlungstisch: Stimmung und Runden", () => {
  it("gute Laune gibt genau eine Runde mehr", () => {
    expect(roundsFor(3, GOOD_MOOD)).toBe(4);
    expect(roundsFor(3, 100)).toBe(4);
    expect(roundsFor(3, GOOD_MOOD - 1)).toBe(3);
    expect(roundsFor(3, 0)).toBe(3);
    expect(roundsFor(4, 90)).toBe(5);
  });

  it("unbekannte Stimmung zählt als mittel und gibt keine Zusatzrunde", () => {
    expect(moodValue(undefined)).toBe(60);
    expect(moodValue(Number.NaN)).toBe(60);
    expect(hasBonusRound(undefined)).toBe(false);
    expect(roundsFor(3, undefined)).toBe(3);
  });

  it("die Miene folgt der Stimmung, Erleichterung nur bei Einigung", () => {
    expect(moodKey(85)).toBe("pleased");
    expect(moodKey(60)).toBe("neutral");
    expect(moodKey(40)).toBe("skeptical");
    expect(moodKey(10)).toBe("angry");
    expect(moodKey(10, true)).toBe("relieved");
    expect(moodKey(-5)).toBe("angry");
    expect(moodKey(500)).toBe("pleased");
  });

  it("Stimmung am Tisch ist der gerundete Mittelwert", () => {
    expect(tableMood([80, 60])).toBe(70);
    expect(tableMood([])).toBe(60);
    expect(tableMood([90, undefined, 30])).toBe(60);
  });

  it("im Bietgefecht ist der Inhaber froh, wenn du vorn liegst", () => {
    expect(duelMood(110, 100)).toBeGreaterThanOrEqual(GOOD_MOOD - 10);
    expect(duelMood(100, 100)).toBe(50);
    expect(duelMood(80, 100)).toBeLessThan(35);
    expect(duelMood(1, 0)).toBe(50);
  });
});
