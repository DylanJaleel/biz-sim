"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

// Auf Telefon und Tablet zeigt die Netzwerkseite immer nur einen Bereich
// (Karte, Bitten, Termine). Jeder Block trägt data-npane="…"; das CSS blendet
// die anderen aus. Auf dem Desktop bleibt die Leiste unsichtbar.

export type NetworkPane = { id: string; label: string; count?: number };

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function NetworkTabs({ panes, children }: { panes: NetworkPane[]; children: ReactNode }) {
  const [chosen, setChosen] = useState<string | null>(null);
  // Links wie /netzwerk#termine öffnen den passenden Bereich.
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  const known = (id: string | null) => (id && panes.some((p) => p.id === id) ? id : null);
  const active = known(chosen) ?? known(hash.replace("#", "")) ?? panes[0]?.id ?? "";

  return (
    <div className="ntabs" data-active={active}>
      <div className="ntabs__bar segmented" role="group" aria-label="Bereich des Netzwerks">
        {panes.map((p) => (
          <button key={p.id} type="button" aria-pressed={active === p.id} onClick={() => setChosen(p.id)}>
            {p.label}
            {p.count ? <span className="ntabs__count">{p.count}</span> : null}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
