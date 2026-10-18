import type { StartupPhase, Vote } from "@/lib/game/types";

export const PHASE_LABEL: Record<StartupPhase, string> = {
  beta: "Beta",
  launch: "Markteintritt",
  scale: "Skalierung",
  profit: "Profitabel",
};

export const LEANING_LABEL: Record<Vote | "open", string> = {
  go: "neigt zu Ja",
  conditions: "will Auflagen",
  no: "neigt zu Nein",
  open: "noch offen",
};
