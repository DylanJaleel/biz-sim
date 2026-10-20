import type { TrophyDef } from "@/lib/game/trophies";

/** One tombstone: the photo, and on blank pieces the engraving set on top. */
export function Tomb({ def, detail, locked, fresh, eager }: { def: TrophyDef; detail?: string; locked?: boolean; fresh?: boolean; eager?: boolean }) {
  const face = def.plate === "kristall" ? (detail ?? def.face) : def.face;
  return (
    <div className={["tomb", locked ? "is-locked" : "", fresh ? "is-new" : ""].join(" ").trim()} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-sized WebP */}
      <img src={`/boardroom/${def.image}.webp`} alt="" loading={eager ? "eager" : "lazy"} decoding="async" />
      {def.plate && face && !locked && (
        <span className={`tomb__face tomb__face--${def.plate}`}>
          {face.split("\n").map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      )}
    </div>
  );
}

export function sceneStyle(image: string): React.CSSProperties {
  return { ["--scene" as string]: `url(/boardroom/${image}.webp)` };
}
