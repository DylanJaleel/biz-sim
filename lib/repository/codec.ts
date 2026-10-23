import { gunzipSync, gzipSync } from "node:zlib";
import type { Prisma } from "@prisma/client";
import type { GameState } from "../game/types";

// Spielstände liegen komprimiert in der Datenbank. Ein spätes Spiel ist als
// JSON rund 600 KB groß und wird bei jedem Zug gelesen und geschrieben; gzip
// macht daraus etwa ein Sechstel. Das hält die Datenübertragung zur Datenbank
// klein. Alte, unkomprimierte Stände werden weiter gelesen und beim nächsten
// Schreiben komprimiert.

interface Packed {
  gz: string;
}

function isPacked(value: unknown): value is Packed {
  return typeof value === "object" && value !== null && typeof (value as Packed).gz === "string";
}

export function packState(state: GameState): Prisma.InputJsonValue {
  return { gz: gzipSync(JSON.stringify(state)).toString("base64") };
}

export function unpackState(value: Prisma.JsonValue): GameState {
  if (isPacked(value)) return JSON.parse(gunzipSync(Buffer.from(value.gz, "base64")).toString("utf8")) as GameState;
  return value as unknown as GameState;
}
