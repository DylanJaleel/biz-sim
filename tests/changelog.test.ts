import { describe, expect, it } from "vitest";
import { applyNewsSeen, dateLabel, LATEST_RELEASE_ID, MAX_POPUP_RELEASES, parseNewsSeen, pendingRelease, releaseViews, RELEASES, type Release } from "@/lib/changelog";
import { applyAction, newGame, planAgenda } from "@/lib/game/engine";
import { FAMILY_OFFICE_REPUTATION } from "@/lib/game/config";
import { activeNavItem, NAV_GROUPS, NAV_ITEMS } from "@/lib/navigation";

const rel = (id: string): Release => ({ id, date: id, title: `Release ${id}`, items: [{ title: "x", text: "y", where: "z", isNew: true }] });
const fake = ["2026-12-01", "2026-11-15", "2026-11-01", "2026-10-15", "2026-10-01"].map(rel);

function started() {
  const state = newGame(3);
  planAgenda(state);
  return state;
}
function played() {
  const state = started();
  state.month = 7;
  return state;
}

describe("Das ist neu: pendingRelease", () => {
  it("zeigt neuen Spielen nichts, solange die Einführung ansteht", () => {
    expect(pendingRelease(started())).toBeNull();
    expect(pendingRelease({ month: 1, onboarding: undefined, whatsNew: undefined }, fake)).toBeNull();
    expect(pendingRelease({ month: 1, onboarding: { step: 3 }, whatsNew: { seen: "2026-01-01" } }, fake)).toBeNull();
  });

  it("zeigt bestehenden Spielen ohne Eintrag nur das neueste Release", () => {
    const p = pendingRelease(played(), fake)!;
    expect(p.releases.map((r) => r.id)).toEqual(["2026-12-01"]);
    expect(p.latest).toBe("2026-12-01");
    expect(pendingRelease(played())!.releases[0]!.id).toBe(LATEST_RELEASE_ID);
  });

  it("zeigt Monat 1 nach beendeter Einführung nichts, wenn das neueste Release gesehen ist", () => {
    expect(pendingRelease({ month: 1, onboarding: { done: true }, whatsNew: { seen: LATEST_RELEASE_ID } })).toBeNull();
  });

  it("fasst ungesehene Releases zusammen, neueste zuerst, höchstens drei", () => {
    const at = (seen: string) => pendingRelease({ month: 9, onboarding: undefined, whatsNew: { seen } }, fake)?.releases.map((r) => r.id);
    expect(at("2026-12-01")).toBeUndefined();
    expect(at("2026-11-15")).toEqual(["2026-12-01"]);
    expect(at("2026-11-01")).toEqual(["2026-12-01", "2026-11-15"]);
    expect(at("2026-10-15")).toEqual(["2026-12-01", "2026-11-15", "2026-11-01"]);
    expect(at("2026-09-01")).toHaveLength(MAX_POPUP_RELEASES);
    expect(at("2026-09-01")![0]).toBe("2026-12-01");
  });

  it("kommt nach dem Speichern nicht wieder", () => {
    const state = played();
    expect(pendingRelease(state)).not.toBeNull();
    state.whatsNew = applyNewsSeen(state.whatsNew, pendingRelease(state)!.latest);
    expect(pendingRelease(state)).toBeNull();
  });

  it("verändert den Spielstand nicht", () => {
    const state = played();
    const before = JSON.stringify(state);
    pendingRelease(state);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("Das ist neu: Speichern", () => {
  it("nimmt nur bekannte Release-ids an", () => {
    expect(parseNewsSeen(LATEST_RELEASE_ID)).toBe(LATEST_RELEASE_ID);
    expect(parseNewsSeen("2020-01-01")).toBeNull();
    expect(parseNewsSeen(5)).toBeNull();
    expect(parseNewsSeen(undefined)).toBeNull();
    expect(parseNewsSeen({ seen: LATEST_RELEASE_ID })).toBeNull();
  });

  it("geht nie auf ein älteres Release zurück", () => {
    expect(applyNewsSeen(undefined, "2026-10-30")).toEqual({ seen: "2026-10-30" });
    expect(applyNewsSeen({ seen: "2026-12-01" }, "2026-10-30")).toEqual({ seen: "2026-12-01" });
    expect(applyNewsSeen({ seen: "2026-10-01" }, "2026-10-30")).toEqual({ seen: "2026-10-30" });
  });

  it("der Spielstand bleibt ein gewöhnlicher Spielstand: Aktionen laufen mit dem Feld weiter", () => {
    const state = played();
    state.whatsNew = { seen: LATEST_RELEASE_ID };
    expect(() => applyAction(state, { type: "closeMonth" })).not.toThrow();
    expect(state.whatsNew).toEqual({ seen: LATEST_RELEASE_ID });
  });
});

describe("Das ist neu: Inhalt", () => {
  it("hat eindeutige, absteigend sortierte ids im Format JJJJ-MM-TT", () => {
    const ids = RELEASES.map((r) => r.id);
    for (const id of ids) expect(id).toMatch(/^\d{4}-\d{2}-\d{2}([a-z]|-[a-z]+)?$/);
    expect([...ids].sort().reverse()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
    expect(LATEST_RELEASE_ID).toBe(ids[0]);
  });

  it("nennt echte Wege: Seiten gibt es, und „Menü › Gruppe › Eintrag“ stimmt mit der Navigation überein", () => {
    for (const r of RELEASES) {
      for (const item of r.items) {
        expect(item.title.length).toBeGreaterThan(3);
        expect(item.text.length).toBeLessThan(260);
        if (item.href) expect(activeNavItem(item.href), item.href).toBeDefined();
        const m = /^Menü › ([^›]+?) › ([^›]+?)(?: ›.*)?$/.exec(item.where);
        if (m) {
          const group = NAV_GROUPS.find((g) => g.label === m[1]);
          expect(group, item.where).toBeDefined();
          expect(
            NAV_ITEMS.some((n) => n.group === group!.id && n.label === m[2]),
            item.where,
          ).toBe(true);
        }
      }
    }
  });

  it("baut die Ansicht mit Freischaltung aus dem Spielstand", () => {
    const state = played();
    const of = (views: ReturnType<typeof releaseViews>) => views.find((r) => r.id === "2026-10-30")!;
    const items = of(releaseViews(RELEASES, state)).items;
    const op = items.find((i) => i.href === "/holding/team")!;
    expect(op.unlock).toEqual({ locked: true, label: expect.stringContaining(`Ruf ${FAMILY_OFFICE_REPUTATION}`) });
    state.familyOffice = {} as never;
    expect(of(releaseViews(RELEASES, state)).items.find((i) => i.href === "/holding/team")!.unlock).toEqual({ locked: false, label: "freigeschaltet" });
    expect(items.find((i) => i.title.startsWith("Ruf steigt"))!.unlock).toBeNull();
  });

  it("formatiert das Datum deutsch und unabhängig von der Zeitzone", () => {
    expect(dateLabel("2026-10-30")).toBe("30. Oktober 2026");
  });
});
