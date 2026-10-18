import type { StartupHistoryPoint } from "@/lib/game/types";
import { eur } from "@/components/game/format";

/** Revenue per month as a quiet line, the last point labelled. */
export function Sparkline({ history, current }: { history: StartupHistoryPoint[]; current: number }) {
  const values = [...history.map((h) => h.revenue), current];
  if (values.length < 2) return <p className="muted">Der Verlauf erscheint nach dem ersten Monat.</p>;
  const W = 320;
  const H = 72;
  const max = Math.max(...values) * 1.08;
  const min = Math.min(...values) * 0.9;
  const x = (i: number) => (i / (values.length - 1)) * (W - 8) + 4;
  const y = (v: number) => H - 6 - ((v - min) / Math.max(1, max - min)) * (H - 14);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Umsatz pro Monat, zuletzt ${eur(current)}`}>
      <path className="spark__area" d={`${d} L${x(last)} ${H} L${x(0)} ${H} Z`} />
      <path className="spark__line" d={d} />
      <circle className="spark__dot" cx={x(last)} cy={y(values[last]!)} r={3.5} />
    </svg>
  );
}
