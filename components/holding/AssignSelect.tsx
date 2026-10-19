"use client";

import { usePlay } from "@/components/game/usePlay";

/** Which mandate an associate looks after. */
export function AssignSelect({ memberId, current, mandates, revision }: { memberId: string; current?: string; mandates: { id: string; name: string }[]; revision: number }) {
  const { play, pending, error } = usePlay(revision);
  return (
    <span className="action">
      <select
        className="select"
        aria-label="Mandat zuweisen"
        value={current ?? ""}
        disabled={pending}
        onChange={(e) => play({ type: "assign", memberId, startupId: e.target.value === "" ? null : e.target.value })}
      >
        <option value="">Kein Mandat</option>
        {mandates.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
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
