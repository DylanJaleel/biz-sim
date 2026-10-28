import { describe, expect, it } from "vitest";
import { activeNavItem, menuSections, NAV_GROUPS, NAV_ITEMS, primaryItems, type NavState } from "@/lib/navigation";

const state: NavState = { reputation: 20, unread: 3, openItems: 0, networkTasks: 0, familyOffice: false };

describe("Navigation", () => {
  it("hat eindeutige Pfade und nur bekannte Gruppen", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const i of NAV_ITEMS) expect(NAV_GROUPS.some((g) => g.id === i.group)).toBe(true);
  });

  it("ordnet Unterseiten dem richtigen Bereich zu", () => {
    const at = (p: string) => activeNavItem(p)?.href;
    expect(at("/")).toBe("/");
    expect(at("/auftrag/abc")).toBe("/");
    for (const p of ["/portfolio", "/firma/x", "/sitzung/x", "/gv/x", "/verkauf/x"]) expect(at(p)).toBe("/portfolio");
    for (const p of ["/nachfolge", "/mandat/x", "/uebernahme/x", "/plattform/x"]) expect(at(p)).toBe("/nachfolge");
    expect(at("/postfach")).toBeUndefined();
    expect(at("/post")).toBe("/post");
  });

  it("zeigt Badges, Sperrhinweise und filtert die Suche", () => {
    const all = menuSections(state).flatMap((s) => s.entries);
    expect(all.find((e) => e.item.href === "/post")?.badge).toBe(3);
    expect(all.find((e) => e.item.href === "/portfolio")?.badge).toBeNull();
    expect(all.find((e) => e.item.href === "/holding")?.locked).toMatch(/ab Ruf/);
    expect(
      menuSections({ ...state, reputation: 90 })
        .flatMap((s) => s.entries)
        .find((e) => e.item.href === "/holding")?.locked,
    ).toBeNull();
    expect(menuSections(state, "boerse").flatMap((s) => s.entries.map((e) => e.item.href))).toEqual(["/boerse"]);
    expect(menuSections(state, "xyz")).toEqual([]);
  });

  it("hat vier Hauptziele in der Kopfleiste", () => {
    expect(primaryItems().map((i) => i.href)).toEqual(["/", "/portfolio", "/post", "/netzwerk"]);
  });
});
