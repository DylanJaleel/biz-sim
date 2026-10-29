"use client";

import { usePlay } from "@/components/game/usePlay";

const FIT = { good: "passt gut", mid: "passt mittel", weak: "passt kaum" } as const;

/** Gives a company to an operating partner; the option text shows the fit. */
export function OpAssign({
  memberId,
  options,
  full,
  revision,
}: {
  memberId: string;
  options: { id: string; name: string; fit: keyof typeof FIT; lead?: string }[];
  full: boolean;
  revision: number;
}) {
  const { play, pending, error } = usePlay(revision);
  return (
    <span className="action">
      <select
        className="select"
        aria-label="Firma zuweisen"
        value=""
        disabled={pending || full || options.length === 0}
        onChange={(e) => e.target.value && play({ type: "assign", memberId, startupId: e.target.value })}
      >
        <option value="">{full ? "Kapazität voll" : options.length === 0 ? "Keine Firma frei" : "Firma zuweisen …"}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} · {FIT[o.fit]}
            {o.lead ? ` · bisher ${o.lead}` : ""}
          </option>
        ))}
      </select>
      {error && (
        <span className="action__error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
