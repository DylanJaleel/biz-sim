"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { MeetingEvent, Phase } from "@/lib/game/meeting";
import { PHASES, VOTE_LABEL, type RoomState } from "./derive";
import type { People } from "./people";

const PHASE_COPY: Record<Phase, string> = {
  opening: "Der Beirat nimmt Platz. Die Vorlage liegt auf dem Tisch.",
  statements: "Jedes Mitglied sagt, wie es die Vorlage sieht.",
  debate: "Jetzt reagieren sie aufeinander und auf dich.",
  vote: "Jedes Mitglied verteilt seine 20 Stimmanteile.",
  verdict: "Der Beirat hat entschieden.",
};

function stanceText(stance: number): string {
  if (stance > 0.35) return "dafür";
  if (stance < -0.25) return "dagegen";
  return "unentschieden";
}

export function SpeechCard({ events, room, people }: { events: MeetingEvent[]; room: RoomState; people: People }) {
  const reduce = useReducedMotion();
  const event = room.latest;
  const key = event ? `${events.indexOf(event)}` : "empty";

  let content;
  if (!event || event.kind === "phase") {
    const phase = event?.kind === "phase" ? event.phase : "opening";
    content = (
      <div className="speech__card speech__card--phase">
        <p className="speech__phase">{PHASES.find((p) => p.id === phase)!.label}</p>
        <p className="speech__hint">{PHASE_COPY[phase]}</p>
      </div>
    );
  } else {
    const person = people[event.speaker];
    let meta: string;
    let text: string;
    if (event.kind === "statement") {
      text = event.text;
      meta = event.speaker === "you" ? "dein Argument" : `${person.title} · ${stanceText(event.stance)}`;
    } else if (event.kind === "reaction") {
      text = event.text;
      const target = event.target === "you" ? "dich" : people[event.target].name;
      meta = `${event.relation === "agree" ? "stimmt zu" : "widerspricht"} · an ${target}`;
    } else {
      text = event.reason;
      meta = `stimmt ab · ${VOTE_LABEL[event.vote]}`;
    }
    content = (
      <div className="speech__card" style={{ ["--member" as string]: person.color }}>
        <div className="speech__head">
          <span className="speech__avatar">{person.initials}</span>
          <div>
            <p className="speech__name">{person.full}</p>
            <p className="speech__meta">{meta}</p>
          </div>
        </div>
        <p className="speech__text">{text}</p>
      </div>
    );
  }

  return (
    <div className="speech" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
