import { describe, expect, it } from "vitest";
import { BUYOUT_REPUTATION, FAMILY_OFFICE_REPUTATION, FUND_REPUTATION, LEAD_REPUTATION, START_REPUTATION } from "@/lib/game/config";
import { MANDATE_REPUTATION } from "@/lib/game/mna-config";
import { applyAction, newGame, planAgenda } from "@/lib/game/engine";
import { applyOnboardingPatch, parseOnboardingPatch, pendingUnlocks, reachedUnlocks, seedUnlocks, shouldAutoStartTour, UNLOCKS } from "@/lib/game/onboarding";
import { placeCard, spotBox } from "@/components/shell/tour-layout";
import { activeNavItem, menuSections } from "@/lib/navigation";

function fresh() {
  const state = newGame(7);
  planAgenda(state);
  return state;
}

describe("Einführung: wann sie startet", () => {
  it("startet in einem neuen Spiel, nicht in einem fortgeschrittenen oder beendeten", () => {
    const state = fresh();
    expect(shouldAutoStartTour(state)).toBe(true);
    expect(shouldAutoStartTour({ month: 1, onboarding: { done: true } })).toBe(false);
    expect(shouldAutoStartTour({ month: 2, onboarding: undefined })).toBe(false);
    expect(shouldAutoStartTour({ month: 14, onboarding: { step: 3 } })).toBe(false);
  });

  it("legt die Freischaltungen aus dem Code zugrunde, aufsteigend", () => {
    const rep = (id: string) => UNLOCKS.find((u) => u.id === id)!.reputation;
    expect(rep("mandate")).toBe(MANDATE_REPUTATION);
    expect(rep("lead")).toBe(LEAD_REPUTATION);
    expect(rep("buyout")).toBe(BUYOUT_REPUTATION);
    expect(rep("holding")).toBe(FAMILY_OFFICE_REPUTATION);
    expect(rep("fund")).toBe(FUND_REPUTATION);
    expect(UNLOCKS.map((u) => u.reputation)).toEqual([...UNLOCKS.map((u) => u.reputation)].sort((a, b) => a - b));
    expect(reachedUnlocks(START_REPUTATION)).toHaveLength(0);
    // Die Navigation sperrt Nachfolge und Holding bei denselben Werten.
    const nav = (reputation: number) => menuSections({ reputation, unread: 0, openItems: 0, networkTasks: 0, familyOffice: false }).flatMap((s) => s.entries);
    expect(nav(MANDATE_REPUTATION - 1).find((e) => e.item.href === "/nachfolge")?.locked).toBeTruthy();
    expect(nav(MANDATE_REPUTATION).find((e) => e.item.href === "/nachfolge")?.locked).toBeNull();
    expect(nav(FAMILY_OFFICE_REPUTATION).find((e) => e.item.href === "/holding")?.locked).toBeNull();
  });

  it("hat einen Menüeintrag unter Wissen", () => {
    const entry = menuSections({ reputation: 20, unread: 0, openItems: 0, networkTasks: 0, familyOffice: false })
      .find((s) => s.group.id === "knowledge")
      ?.entries.find((e) => e.item.href === "/einfuehrung");
    expect(entry?.item.label).toBe("Einführung");
    expect(activeNavItem("/einfuehrung")?.href).toBe("/einfuehrung");
  });
});

describe("Hinweise bei Freischaltungen", () => {
  it("meldet ohne Liste nichts (ältere Stände) und legt sie beim Monatsabschluss still an", () => {
    const start = fresh();
    start.reputation = 62;
    expect(pendingUnlocks(start)).toHaveLength(0);
    const old = applyAction(start, { type: "closeMonth" }).state;
    // Alles bis Ruf 62 war schon da, auch wenn sich der Ruf im Abschluss ändert.
    expect(old.onboarding?.seen).toEqual(expect.arrayContaining(["mandate", "lead", "syndicate", "buyout"]));
    expect(pendingUnlocks({ reputation: 62, onboarding: old.onboarding }).map((u) => u.id)).toEqual([]);
  });

  it("meldet im neuen Spiel genau das, was neu erreicht wird, einmal", () => {
    const state = applyAction(fresh(), { type: "closeMonth" }).state;
    expect(state.onboarding?.seen).toEqual([]);
    state.reputation = MANDATE_REPUTATION;
    expect(pendingUnlocks(state).map((u) => u.id)).toEqual(["mandate", "league"]);
    state.onboarding = applyOnboardingPatch(state.onboarding, { seen: ["mandate", "league"] });
    expect(pendingUnlocks(state)).toHaveLength(0);
    state.reputation = LEAD_REPUTATION;
    expect(pendingUnlocks(state).map((u) => u.id)).toEqual(["lead"]);
  });

  it("seedUnlocks überschreibt eine vorhandene Liste nicht", () => {
    const state = fresh();
    state.onboarding = { seen: ["mandate"] };
    state.reputation = 90;
    seedUnlocks(state);
    expect(state.onboarding.seen).toEqual(["mandate"]);
  });
});

describe("Einführung: Speichern", () => {
  it("nimmt nur bekannte Felder und Werte an", () => {
    expect(parseOnboardingPatch({ done: true, step: 3 })).toEqual({ done: true, step: 3 });
    expect(parseOnboardingPatch({ seen: ["mandate"] })).toEqual({ seen: ["mandate"] });
    expect(parseOnboardingPatch({})).toBeNull();
    expect(parseOnboardingPatch(null)).toBeNull();
    expect(parseOnboardingPatch({ done: "ja" })).toBeNull();
    expect(parseOnboardingPatch({ step: -1 })).toBeNull();
    expect(parseOnboardingPatch({ step: 1.5 })).toBeNull();
    expect(parseOnboardingPatch({ seen: ["gibtsnicht"] })).toBeNull();
    expect(parseOnboardingPatch({ seen: [5] })).toBeNull();
  });

  it("vereinigt gesehene Hinweise und lässt den Rest stehen", () => {
    const a = applyOnboardingPatch(undefined, { seen: ["mandate"] });
    const b = applyOnboardingPatch(a, { done: true, step: 7, seen: ["lead", "mandate"] });
    expect(b).toEqual({ done: true, step: 7, seen: ["mandate", "lead"] });
  });
});

describe("Einführung: Platz für die Karte", () => {
  const view = { width: 1280, height: 900 };
  const card = { width: 360, height: 240 };

  it("steht ohne Ziel in der Mitte", () => {
    expect(placeCard(null, card, view)).toMatchObject({ left: 460, top: 330, side: "none" });
  });

  it("setzt die Karte unter ein Ziel in der Kopfleiste, mit Pfeil nach oben, und bleibt im Bild", () => {
    const p = placeCard({ left: 1200, top: 8, width: 70, height: 40 }, card, view);
    expect(p.side).toBe("top");
    expect(p.top).toBeGreaterThan(48);
    expect(p.left + card.width).toBeLessThanOrEqual(view.width);
    expect(p.arrow).toBeGreaterThanOrEqual(22);
  });

  it("weicht auf eine niedrige Ansicht (Handy quer) aus und fällt sonst nach unten in die Mitte zurück", () => {
    const small = { width: 844, height: 390 };
    expect(placeCard({ left: 600, top: 4, width: 90, height: 36 }, { width: 340, height: 250 }, small).side).toBe("top");
    const huge = placeCard({ left: 20, top: 20, width: 800, height: 340 }, { width: 340, height: 250 }, small);
    expect(huge.side).toBe("none");
    expect(huge.top + 250).toBeLessThanOrEqual(small.height);
  });

  it("begrenzt die Hervorhebung auf den sichtbaren Bereich", () => {
    const b = spotBox({ left: -50, top: -10, width: 2000, height: 100 }, view);
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.left + b.width).toBeLessThanOrEqual(view.width);
  });
});
