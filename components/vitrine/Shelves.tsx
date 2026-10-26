"use client";

import { useState } from "react";
import { trophyOf, type TrophyShelf } from "@/lib/game/trophies";
import { Tomb } from "@/components/glass/Tomb";

interface ShelfView {
  shelf: TrophyShelf;
  title: string;
  items: { id: string; earned: boolean; when: string; detail?: string }[];
}

function chunks<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

/** The shelves and the piece you look at closer. */
export function Shelves({ shelves }: { shelves: ShelfView[] }) {
  const all = shelves.flatMap((s) => s.items.map((i) => ({ ...i, shelfTitle: s.title })));
  const [selected, setSelected] = useState(() => [...all].reverse().find((i) => i.earned)?.id ?? all[0]!.id);
  const pick = all.find((i) => i.id === selected)!;
  const def = trophyOf(pick.id)!;
  return (
    <div className="cabinet">
      <div className="gwin shelves" style={{ background: "linear-gradient(#3b2718, #24170e)" }}>
        {shelves.map((s) => (
          <div key={s.shelf}>
            <p className="shelf__title">{s.title}</p>
            {chunks(s.items, 5).map((row, n) => (
              <div className="shelf" key={n}>
                {row.map((i) => {
                  const d = trophyOf(i.id)!;
                  return (
                    <button key={i.id} type="button" className={i.id === selected ? "piece is-on" : "piece"} onClick={() => setSelected(i.id)} aria-pressed={i.id === selected}>
                      <Tomb def={d} detail={i.detail} locked={!i.earned} />
                      <span className="piece__cap">{d.title}</span>
                      <span className="piece__when">{i.when}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
      <aside className="gwin cabinet__detail" aria-live="polite">
        <div className="glbl">{pick.shelfTitle}</div>
        <div className="cabinet__stage">
          <Tomb def={def} detail={pick.detail} locked={!pick.earned} eager />
        </div>
        <h2 style={{ margin: 0, fontSize: 22 }}>{def.title}</h2>
        <div className="glbl">{pick.earned ? `Verliehen: ${pick.when}` : `Bedingung: ${def.requirement}`}</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(245,245,247,.86)" }}>
          {pick.earned ? def.story : "Noch nicht verdient. Sobald du ihn hast, steht er hier im Licht, und jeder Gast in deinem Büro sieht ihn."}
        </p>
      </aside>
    </div>
  );
}
