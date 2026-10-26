import Link from "next/link";
import { monthLabel } from "@/lib/game/config";
import { SHELF_LABEL, SHELF_ORDER, TROPHIES } from "@/lib/game/trophies";
import { currentGame } from "@/lib/current-game";
import { sceneStyle } from "@/components/glass/Tomb";
import { Shelves } from "./Shelves";

// Die Vitrine hinter dem Schreibtisch: fünf Regale. Was
// verdient ist, steht im Licht; der Rest wartet als Umriss.

export async function Vitrine() {
  const { state } = await currentGame();
  const shelves = SHELF_ORDER.map((shelf) => ({
    shelf,
    title: SHELF_LABEL[shelf],
    items: TROPHIES.filter((t) => t.shelf === shelf).map((t) => {
      const got = state.trophies.find((x) => x.id === t.id);
      return { id: t.id, earned: !!got, when: got ? monthLabel(got.month) : "Noch offen", detail: got?.detail };
    }),
  }));
  const earned = state.trophies.length;
  return (
    <div className="glass-page">
      <div className="glass-scene" style={{ ...sceneStyle("vitrine-wand"), ["--scene-blur" as string]: "6px" }} aria-hidden="true" />
      <header className="gwin" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="glbl">Die Wand hinter deinem Schreibtisch</div>
          <h1 style={{ margin: "4px 0 0", font: "700 clamp(26px, 3vw, 34px)/1.1 var(--font-body)", letterSpacing: "-0.02em" }}>Vitrine</h1>
          <p className="glbl" style={{ margin: "6px 0 0", maxWidth: "60ch" }}>
            Für jeden großen Schritt kommt ein Tombstone ins Regal, so wie Banken nach einem Abschluss einen Acrylblock verschenken. Einmal verdient, bleibt er stehen.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="gchip">
            <b>{earned}</b> <span className="glbl">von {TROPHIES.length}</span>
          </span>
          <Link href="/" className="gbtn">
            Zum Schreibtisch
          </Link>
        </div>
      </header>
      <Shelves shelves={shelves} />
    </div>
  );
}
