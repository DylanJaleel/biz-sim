"use client";

import { useId, useState, type ReactNode } from "react";

// Auf Telefon und Tablet blendet das CSS alles mit der Klasse .is-secondary aus,
// solange die Gruppe zugeklappt ist (.xp[data-open="false"]). Auf dem Desktop
// ist alles sichtbar und der Schalter fehlt, wie bisher.

export function Expander({ count, noun, children }: { count: number; noun: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="xp" id={id} data-open={open}>
      {children}
      {count > 0 && (
        <button type="button" className="btn btn--sm xp__btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? "Weniger zeigen" : `${count} ${noun}`}
        </button>
      )}
    </div>
  );
}
