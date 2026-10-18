"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import type { SeatId, SpeakerId } from "@/lib/game/types";
import type { SceneState } from "./BoardRoom3D";
import type { RoomState } from "./derive";
import type { People } from "./people";
import { RoundTable } from "./RoundTable";

const BoardRoom3D = dynamic(() => import("./BoardRoom3D"), { ssr: false });

type View = "table" | "room";
const WIDE = "(min-width: 900px)";
const VIEW_KEY = "boardroom:view";

function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const noSubscribe = () => () => {};

let webglCache: boolean | undefined;
function hasWebGL(): boolean {
  if (webglCache !== undefined) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    webglCache = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

function storedView(): View | null {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "room" ? "room" : null;
  } catch {
    return null;
  }
}

function sceneOf(seats: SeatId[], room: RoomState): SceneState {
  const latest = room.latest;
  let active: SpeakerId[] = [];
  let link: SceneState["link"];
  if (latest?.kind === "statement" || latest?.kind === "vote") active = [latest.speaker];
  if (latest?.kind === "reaction") {
    active = [latest.speaker, latest.target];
    link = { from: latest.speaker, to: latest.target, relation: latest.relation };
  }
  return { members: seats, active, link, votes: room.votes };
}

/**
 * Der Tisch von oben mit runden Avataren ist die Hauptansicht. Auf großen
 * Bildschirmen mit WebGL lässt sich in den Raum wechseln.
 */
export function BoardStage({ seats, people, room, label }: { seats: SeatId[]; people: People; room: RoomState; label: string }) {
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
  const webgl = useSyncExternalStore(noSubscribe, hasWebGL, () => false);
  const stored = useSyncExternalStore(noSubscribe, storedView, () => null);
  const [chosen, setChosen] = useState<View | null>(null);
  const [failed, setFailed] = useState(false);
  const view = chosen ?? stored ?? "table";

  const choose = (next: View) => {
    setChosen(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Ohne Speicher gilt die Wahl nur bis zum Neuladen.
    }
  };

  const canRoom = wide && webgl && !failed;
  const showRoom = canRoom && view === "room";
  return (
    <div className="stage">
      {canRoom && (
        <div className="stage__switch" role="group" aria-label="Ansicht">
          <button type="button" aria-pressed={!showRoom} onClick={() => choose("table")}>
            Tisch
          </button>
          <button type="button" aria-pressed={showRoom} onClick={() => choose("room")}>
            Raum
          </button>
        </div>
      )}
      {showRoom ? (
        <BoardRoom3D scene={sceneOf(seats, room)} people={people} label={label} onFail={() => setFailed(true)} />
      ) : (
        <RoundTable seats={[...seats, "you"]} people={people} room={room} label={label} />
      )}
    </div>
  );
}
