import type { Ring } from "@/lib/game/network";

// Die drei Kreise tragen je eine Farbe (CSS-Variablen --net-1 bis --net-3, hell und dunkel in globals.css).

export const RING_CLASS: Record<Ring, string> = { 1: "nr-1", 2: "nr-2", 3: "nr-3" };

/** "Dr. Anna Rossi" becomes "Anna": the short name under a selected contact. */
export function shortName(name: string): string {
  return name.replace(/^(Dr\.|Prof\.)\s*/g, "").split(/\s+/)[0] ?? name;
}

/** Month text like "März · Jahr 3" split into a short month and the year. */
export function dateParts(label: string): { month: string; year: string } {
  const [m = label, y = ""] = label.split(" · ");
  return { month: m.slice(0, 3).toUpperCase(), year: y };
}
