import type { Ring } from "@/lib/game/network";
import { initialsOf } from "@/components/shares/holders";
import { RING_CLASS } from "./ring";

// Runder Avatar mit Initialen. Der Ring um das Gesicht zeigt die Wärme der
// Beziehung (bei "kühlt ab" in Bernstein), warme Kontakte glimmen leicht.
// Ohne Wärme (plain) ist es nur ein Farbkreis, etwa in Briefen und Listen.

export function NetAvatar({
  name,
  ring,
  warmth,
  met = true,
  cooling = false,
  locked = false,
  size = "md",
}: {
  name: string;
  ring: Ring;
  /** 0..100; leave out for a plain disc. */
  warmth?: number;
  met?: boolean;
  cooling?: boolean;
  locked?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const cls = ["nt-av", RING_CLASS[ring], `nt-av--${size}`];
  if (warmth === undefined) cls.push("is-plain");
  else if (!met) cls.push("is-new");
  else {
    if (warmth >= 75) cls.push("is-hot");
    else if (warmth >= 50) cls.push("is-warm");
    if (cooling) cls.push("is-cooling");
  }
  if (locked) cls.push("is-locked");
  return (
    <span className={cls.join(" ")} style={warmth !== undefined && met ? ({ "--w": warmth } as React.CSSProperties) : undefined} aria-hidden="true">
      <span className="nt-av__face">{locked ? <LockIcon /> : initialsOf(name)}</span>
    </span>
  );
}

export function LockIcon() {
  return (
    <svg className="nt-lock" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.8" />
      <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
    </svg>
  );
}

export type BadgeKind = "favor" | "rival" | "career" | "cooling";

const BADGE_LABEL: Record<BadgeKind, string> = { favor: "Offene Bitte", rival: "Konkurrenz", career: "Karriere-Neuigkeit", cooling: "Kühlt ab" };

/** Small round marks: an open request, a rival bidder, career news, a cooling relationship. */
export function NetBadge({ kind }: { kind: BadgeKind }) {
  return (
    <span className={`nt-badge nt-badge--${kind}`} title={BADGE_LABEL[kind]} aria-hidden="true">
      <svg viewBox="0 0 12 12">
        {kind === "favor" && <path d="M6 2.2v4.1M6 8.6v.4" />}
        {kind === "rival" && <path d="M6.8 1.5 3 6.6h2.5L5.1 10.5 9 5.3H6.4z" className="fill" />}
        {kind === "career" && <path d="M6 1.8l1.2 2.7 2.9.3-2.2 2 .7 2.9L6 8.2 3.4 9.7l.7-2.9-2.2-2 2.9-.3z" className="fill" />}
        {kind === "cooling" && <path d="M6 2.2v7M3.2 6.8 6 9.6l2.8-2.8" />}
      </svg>
    </span>
  );
}
