"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Phase } from "@/lib/game/meeting";
import { PHASES } from "./derive";

export function PhaseTrack({ phase }: { phase: Phase }) {
  const current = PHASES.findIndex((p) => p.id === phase);
  return (
    <ol className="phases" aria-label="Ablauf der Sitzung">
      {PHASES.map((p, i) => {
        const state = i < current ? "past" : i === current ? "current" : "future";
        return (
          <li key={p.id} className={`phases__step phases__step--${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="phases__num">{i + 1}</span>
            <span className="phases__label">{p.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function MoodMeter({ mood }: { mood: number | undefined }) {
  const reduce = useReducedMotion();
  const position = mood === undefined ? 50 : 50 + mood * 46;
  const label = mood === undefined ? "Noch offen" : mood > 0.3 ? "Eher dafür" : mood < -0.3 ? "Eher dagegen" : "Gespalten";
  return (
    <div className="mood" role="meter" aria-label="Stimmung im Raum" aria-valuemin={-1} aria-valuemax={1} aria-valuenow={mood ?? 0} aria-valuetext={label}>
      <div className="mood__row">
        <span className="mood__title">Stimmung im Raum</span>
        <span className="mood__value">{label}</span>
      </div>
      <div className="mood__track">
        <motion.span
          className="mood__needle"
          initial={false}
          animate={{ left: `${position}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 14 }}
        />
      </div>
    </div>
  );
}
