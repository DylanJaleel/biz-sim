import { HOLDER_LABEL } from "@/lib/game/captable";
import type { Holder } from "@/lib/game/types";
import { fmtPct, HOLDER_COLOR } from "./holders";

/** Who owns the company, as one bar and a legend. The player is always first. */
export function CapTableBar({ holders, stake, compact }: { holders: Holder[]; stake: number; compact?: boolean }) {
  const rows = [{ id: "you", name: "Du", kind: "you" as const, pct: stake }, ...[...holders].sort((a, b) => b.pct - a.pct)];
  return (
    <div className={compact ? "cap cap--compact" : "cap"}>
      <div className="cap__bar" role="img" aria-label={rows.map((r) => `${r.name} ${fmtPct(r.pct)}`).join(", ")}>
        {rows.map((r) => (
          <span key={r.id} style={{ width: `${r.pct}%`, background: HOLDER_COLOR[r.kind] }} title={`${r.name}: ${fmtPct(r.pct)}`} />
        ))}
      </div>
      {!compact && (
        <ul className="cap__legend">
          {rows.map((r) => (
            <li key={r.id} className={r.id === "you" ? "is-you" : undefined}>
              <i style={{ background: HOLDER_COLOR[r.kind] }} />
              <span className="cap__name">{r.name}</span>
              <span className="cap__kind">{HOLDER_LABEL[r.kind]}</span>
              <b>{fmtPct(r.pct)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
