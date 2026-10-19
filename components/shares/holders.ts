import type { HolderKind } from "@/lib/game/types";

export const HOLDER_COLOR: Record<HolderKind | "you", string> = {
  you: "#2342f5",
  founder: "#0e9f8e",
  cofounder: "#5cbfb3",
  vc: "#7b4dff",
  investor: "#a98bff",
  angel: "#e0457b",
  esop: "#b9bec8",
  advisor: "#d48a10",
};

export function initialsOf(name: string): string {
  if (name === "Du") return "Du";
  const parts = name.replace(/^(Dr\.|Prof\.)\s*/g, "").split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export const fmtPct = (v: number) => `${v.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
