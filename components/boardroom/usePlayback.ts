"use client";

import { useCallback, useEffect, useState } from "react";
import type { MeetingEvent } from "@/lib/game/meeting";

export function eventDuration(event: MeetingEvent): number {
  switch (event.kind) {
    case "phase":
      return 1200;
    case "statement":
      return 1500 + event.text.length * 30;
    case "reaction":
      return 1400 + event.text.length * 28;
    case "vote":
      return 950;
  }
}

export interface Playback {
  shown: number;
  playing: boolean;
  speed: number;
  /** All events known so far are on screen. More may follow after the player's choice. */
  caughtUp: boolean;
  toggle: () => void;
  next: () => void;
  skip: () => void;
  setSpeed: (speed: number) => void;
}

/** Plays events one by one. The list can grow while playing (after an argument, after the vote). */
export function usePlayback(events: MeetingEvent[], startAt = 0): Playback {
  const [shown, setShown] = useState(startAt);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const caughtUp = shown >= events.length;

  useEffect(() => {
    if (!playing || caughtUp) return;
    const current = shown === 0 ? undefined : events[shown - 1];
    const delay = current ? eventDuration(current) / speed : 500;
    const timer = setTimeout(() => setShown((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, [playing, caughtUp, shown, events, speed]);

  const next = useCallback(() => setShown((n) => Math.min(events.length, n + 1)), [events.length]);
  const skip = useCallback(() => setShown(events.length), [events.length]);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  return { shown: Math.min(shown, events.length), playing: playing && !caughtUp, speed, caughtUp, toggle, next, skip, setSpeed };
}
