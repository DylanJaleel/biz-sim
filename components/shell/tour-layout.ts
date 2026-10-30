// Wohin die Karte der Einführung kommt: neben das hervorgehobene Element, wenn Platz ist,
// sonst unten in die Mitte. Reine Geometrie, damit sie sich testen lässt.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type Side = "top" | "bottom" | "left" | "right" | "none";

export interface Placement {
  left: number;
  top: number;
  /** Auf welcher Seite der Karte der Pfeil sitzt (zeigt zum Ziel); "none" = kein Pfeil. */
  side: Side;
  /** Abstand des Pfeils vom Kartenrand in px (entlang der Kante). */
  arrow: number;
}

const GAP = 14;
const MARGIN = 12;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function placeCard(target: Box | null, card: { width: number; height: number }, view: { width: number; height: number }): Placement {
  const center: Placement = { left: Math.round((view.width - card.width) / 2), top: Math.round((view.height - card.height) / 2), side: "none", arrow: 0 };
  if (!target) return center;
  const right = target.left + target.width;
  const bottom = target.top + target.height;
  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;
  const below = view.height - bottom - GAP - MARGIN;
  const above = target.top - GAP - MARGIN;
  const after = view.width - right - GAP - MARGIN;
  const before = target.left - GAP - MARGIN;
  const x = clamp(cx - card.width / 2, MARGIN, view.width - card.width - MARGIN);
  const y = clamp(cy - card.height / 2, MARGIN, view.height - card.height - MARGIN);
  if (below >= card.height) return { left: Math.round(x), top: Math.round(bottom + GAP), side: "top", arrow: clamp(cx - x, 22, card.width - 22) };
  if (above >= card.height) return { left: Math.round(x), top: Math.round(target.top - GAP - card.height), side: "bottom", arrow: clamp(cx - x, 22, card.width - 22) };
  if (after >= card.width) return { left: Math.round(right + GAP), top: Math.round(y), side: "left", arrow: clamp(cy - y, 22, card.height - 22) };
  if (before >= card.width) return { left: Math.round(target.left - GAP - card.width), top: Math.round(y), side: "right", arrow: clamp(cy - y, 22, card.height - 22) };
  // Kein Platz daneben: Karte unten in der Mitte, das Ziel bleibt hervorgehoben.
  return { left: center.left, top: Math.round(view.height - card.height - MARGIN), side: "none", arrow: 0 };
}

/** Das Ziel mit etwas Luft, auf den sichtbaren Bereich begrenzt. */
export function spotBox(rect: Box, view: { width: number; height: number }, pad = 6): Box {
  const left = Math.max(2, rect.left - pad);
  const top = Math.max(2, rect.top - pad);
  const right = Math.min(view.width - 2, rect.left + rect.width + pad);
  const bottom = Math.min(view.height - 2, rect.top + rect.height + pad);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}
