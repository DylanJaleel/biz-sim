// Verhandlungstisch: die Stimmung der Gegenseite und was sie für die Zahl der Runden bedeutet.
// Reine Funktionen ohne Abhängigkeiten, damit Engine, Ansichten und Oberfläche dieselbe Regel nutzen.

export type MoodKey = "pleased" | "relieved" | "neutral" | "skeptical" | "angry";

/** Ab dieser Stimmung (0 bis 100) ist die Gegenseite gut gelaunt: Sie gibt eine Runde mehr. */
export const GOOD_MOOD = 70;
/** Unter dieser Stimmung wird die Gegenseite skeptisch. */
export const SKEPTICAL_MOOD = 50;
/** Unter dieser Stimmung ist sie verärgert. */
export const ANGRY_MOOD = 35;
/** Gute Laune bringt höchstens diese Zahl zusätzlicher Runden. */
export const BONUS_ROUNDS = 1;

export const MOOD_LABEL: Record<MoodKey, string> = {
  pleased: "erfreut",
  relieved: "erleichtert",
  neutral: "sachlich",
  skeptical: "skeptisch",
  angry: "verärgert",
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Die Stimmung als Zahl von 0 bis 100, gerundet. Unbekannt oder ungültig zählt als 60. */
export function moodValue(mood: number | undefined): number {
  return typeof mood === "number" && Number.isFinite(mood) ? clamp(Math.round(mood), 0, 100) : 60;
}

/** Welche Miene zur Stimmung gehört. `relieved` gilt für eine Einigung, die ein Gespräch beendet. */
export function moodKey(mood: number | undefined, relieved = false): MoodKey {
  if (relieved) return "relieved";
  const m = moodValue(mood);
  if (m >= GOOD_MOOD) return "pleased";
  if (m >= SKEPTICAL_MOOD) return "neutral";
  if (m >= ANGRY_MOOD) return "skeptical";
  return "angry";
}

/** Gute Laune gibt eine Runde mehr. */
export function hasBonusRound(mood: number | undefined): boolean {
  return moodValue(mood) >= GOOD_MOOD;
}

/** Wie viele Runden die Gegenseite mitgeht: die Grundzahl, bei guter Laune eine mehr. */
export function roundsFor(base: number, mood: number | undefined): number {
  return base + (hasBonusRound(mood) ? BONUS_ROUNDS : 0);
}

/** Die Stimmung am Tisch: Mittelwert der Stimmungen, gerundet. Ohne Gegenüber 60. */
export function tableMood(moods: (number | undefined)[]): number {
  if (!moods.length) return 60;
  return Math.round(moods.reduce<number>((s, m) => s + moodValue(m), 0) / moods.length);
}

/** Die Stimmung eines Inhabers im Bietgefecht aus der Wertung: vorn ist gut, zurück schlecht. */
export function duelMood(scoreYou: number, scoreRival: number): number {
  if (!(scoreRival > 0) || !(scoreYou >= 0)) return 50;
  return clamp(Math.round(50 + (scoreYou / scoreRival - 1) * 300), 0, 100);
}
