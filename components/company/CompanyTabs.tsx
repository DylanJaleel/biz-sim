"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

// Auf schmalen Bildschirmen zeigt die Firmenseite immer nur einen Bereich.
// Jeder Block im Inhalt trägt data-pane="…"; das CSS blendet die anderen aus.
// Auf dem Desktop bleibt die Leiste unsichtbar und alles steht wie bisher da.

export type CompanyPane = { id: string; label: string };

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function CompanyTabs({ panes, children }: { panes: CompanyPane[]; children: ReactNode }) {
  const [chosen, setChosen] = useState<string | null>(null);
  // Links wie /firma/x#anteile sollen den passenden Bereich öffnen.
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  const fromHash = hash === "#anteile" ? "anteile" : hash.startsWith("#top-") ? "agenda" : null;
  const known = (id: string | null) => (id && panes.some((p) => p.id === id) ? id : null);
  const active = known(chosen) ?? known(fromHash) ?? panes[0]?.id ?? "";

  return (
    <div className="ctabs" data-active={active}>
      <div className="ctabs__bar segmented" role="group" aria-label="Bereich der Firmenseite">
        {panes.map((p) => (
          <button key={p.id} type="button" aria-pressed={active === p.id} onClick={() => setChosen(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
