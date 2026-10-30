"use client";

import { Children, useCallback, useSyncExternalStore, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

const CHANGE_EVENT = "boardroom:wealth-tab-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Reiter über den Abschnitten einer Seite; der zuletzt gewählte bleibt im Browser gemerkt. */
export function WealthTabs({ tabs, storageKey, children }: { tabs: Tab[]; storageKey: string; children: ReactNode }) {
  const first = tabs[0]!.id;
  const read = useCallback(() => {
    try {
      const v = window.localStorage.getItem(storageKey);
      return v && tabs.some((t) => t.id === v) ? v : first;
    } catch {
      return first;
    }
  }, [storageKey, tabs, first]);
  const active = useSyncExternalStore(subscribe, read, () => first);
  const choose = (id: string) => {
    try {
      window.localStorage.setItem(storageKey, id);
    } catch {
      /* Speicher gesperrt: der Reiter gilt nur für diese Ansicht. */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  const panels = Children.toArray(children);
  return (
    <>
      <div className="wl-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === active} className={t.id === active ? "wl-tab-on" : "wl-tab"} onClick={() => choose(t.id)}>
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="wl-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div key={tabs[i]?.id ?? i} role="tabpanel" hidden={tabs[i]?.id !== active}>
          {panel}
        </div>
      ))}
    </>
  );
}
