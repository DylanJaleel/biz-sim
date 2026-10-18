"use client";

import { useEffect, useRef } from "react";
import type { MeetingEvent } from "@/lib/game/meeting";
import { PHASES, VOTE_LABEL } from "./derive";
import type { People } from "./people";

export function Protocol({ events, shown, people }: { events: MeetingEvent[]; shown: number; people: People }) {
  const listRef = useRef<HTMLOListElement>(null);
  const visible = events.slice(0, shown);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [shown]);

  return (
    <section className="protocol" aria-label="Protokoll">
      <h2 className="protocol__title">Protokoll</h2>
      {visible.length === 0 && <p className="protocol__empty">Die Sitzung beginnt gleich.</p>}
      <ol className="protocol__list" ref={listRef} tabIndex={0} aria-label="Beiträge der Sitzung">
        {visible.map((event, i) => {
          if (event.kind === "phase") {
            return (
              <li key={i} className="protocol__phase">
                {PHASES.find((p) => p.id === event.phase)!.label}
              </li>
            );
          }
          const person = people[event.speaker];
          return (
            <li key={i} className="protocol__entry" style={{ ["--member" as string]: person.color }}>
              <p className="protocol__who">
                {person.name}
                {event.kind === "reaction" && (
                  <span className={`protocol__rel protocol__rel--${event.relation}`}>
                    {event.relation === "agree" ? " stimmt zu: " : " widerspricht: "}
                    {event.target === "you" ? "dir" : people[event.target].name}
                  </span>
                )}
                {event.kind === "vote" && <span className={`protocol__rel protocol__rel--${event.vote}`}> {VOTE_LABEL[event.vote]}</span>}
              </p>
              <p className="protocol__text">{event.kind === "vote" ? event.reason : event.text}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
