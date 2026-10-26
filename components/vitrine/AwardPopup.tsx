"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trophyOf } from "@/lib/game/trophies";
import { usePlay } from "@/components/game/usePlay";
import { Tomb } from "@/components/glass/Tomb";

/** Up to this many further tombstones are named; beyond that the popup only counts them (old games can earn many at once). */
const SHOW_TITLES = 2;

/** Announces a new tombstone once; afterwards it waits in the cabinet. */
export function AwardPopup({ ids, details, revision }: { ids: string[]; details: Record<string, string | undefined>; revision: number }) {
  const { play, pending } = usePlay(revision);
  const button = useRef<HTMLAnchorElement>(null);
  const defs = ids.map((id) => trophyOf(id)).filter((d) => d !== undefined);
  useEffect(() => {
    button.current?.focus();
  }, []);
  if (defs.length === 0) return null;
  const first = defs[0]!;
  const more = defs.length - 1;
  const seen = () => play({ type: "seenTrophies" });
  return (
    <div className="glass-page award" role="dialog" aria-modal="true" aria-labelledby="award-title" onKeyDown={(e) => e.key === "Escape" && seen()}>
      <div className="gwin award__card">
        <div className="glbl">Neuer Tombstone</div>
        <Tomb def={first} detail={details[first.id]} fresh eager />
        <h2 id="award-title">{first.title}</h2>
        <p>{first.story}</p>
        <p>
          Ab jetzt steht er in deiner Vitrine
          {more === 0
            ? ""
            : more <= SHOW_TITLES
              ? `, zusammen mit ${defs
                  .slice(1)
                  .map((d) => d.title)
                  .join(", ")}`
              : `, und ${more} weitere warten dort ebenfalls auf dich`}
          .
        </p>
        <div className="award__actions">
          <Link ref={button} href="/vitrine" className="gbtn gbtn--go" onClick={seen}>
            Zur Vitrine
          </Link>
          <button type="button" className="gbtn" onClick={seen} disabled={pending}>
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
}
