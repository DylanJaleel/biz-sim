import "server-only";
import { cookies } from "next/headers";

// Wie das Büro aussieht: das Glas-Cockpit (neu) oder der Schreibtisch von oben
// (bisher). Gespeichert im Browser, damit jeder es für sich umschalten kann.

export type OfficeStyle = "glas" | "klassisch";
export const OFFICE_STYLE_COOKIE = "buero";

export async function officeStyle(): Promise<OfficeStyle> {
  return (await cookies()).get(OFFICE_STYLE_COOKIE)?.value === "klassisch" ? "klassisch" : "glas";
}
