"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { activeNavItem, menuSections, type NavState } from "@/lib/navigation";

const P = {
  desk: "M3 9h18M5 9v10M19 9v10M3 9l2-4h14l2 4M9 14h6",
  chart: "M4 19V5M4 19h16M8 15l3-4 3 2 5-6",
  candles: "M7 5v14M7 8h0M5 8h4v6H5zM17 4v15M15 7h4v8h-4z",
  building: "M5 20V6l7-3 7 3v14M3 20h18M9 9h2M13 9h2M9 13h2M13 13h2M10 20v-3h4v3",
  handshake: "M3 12l4-4 4 1 3-2 5 4v4l-4 3-3-1-2 1-4-2zM7 8l5 5",
  people: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M16 11a2.5 2.5 0 100-5M18 15c2 .4 3 1.8 3 4",
  calendar: "M4 7h16v13H4zM4 11h16M8 4v4M16 4v4",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  car: "M5 16V12l2-5h10l2 5v4M3 16h18M7 19v-3M17 19v-3M7 12h10",
  trophy: "M8 4h8v6a4 4 0 01-8 0zM8 6H4c0 3 1 4 4 4M16 6h4c0 3-1 4-4 4M12 14v4M8 20h8",
  book: "M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  spark: "M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3",
  house: "M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5",
  heart: "M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 115 0c0 1.6-2.5 2-2.5 3.5M12 16.6v.01",
  podium: "M4 20V14h5v6M9 20V8h6v12M15 20v-8h5v8M3 20h18",
} as const;

function Icon({ name }: { name?: string }) {
  const d = P[(name ?? "") as keyof typeof P] ?? P.desk;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/** Menü mit allen Bereichen: ein modaler Dialog (Fokus-Falle, Esc, Klick daneben), auf kleinen Geräten als Vollbild-Sheet. */
export function MainMenu({ state, activeHref }: { state: NavState; activeHref?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const path = usePathname();
  const router = useRouter();
  const id = useId();
  // Das Menü hängt am body: Die Kopfleiste hat eigene Linkstile und einen Filter, der fixierte Kinder einfängt.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const sections = useMemo(() => menuSections(state, query), [state, query]);
  const count = sections.reduce((n, s) => n + s.entries.length, 0);

  const show = useCallback(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    setQuery("");
    dialog.showModal();
    setOpen(true);
    // Auf Touch-Geräten nicht gleich die Tastatur öffnen.
    if (!window.matchMedia("(pointer: fine)").matches) dialog.focus();
  }, []);
  const hide = useCallback(() => ref.current?.close(), []);

  useEffect(() => {
    if (open && window.matchMedia("(pointer: fine)").matches) search.current?.focus();
  }, [open]);

  // Nach einem Seitenwechsel ist das Menü zu.
  useEffect(() => {
    ref.current?.close();
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const combo = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && k === "k";
      const plain = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && k === "m";
      if (!combo && !(plain && !typing(e.target))) return;
      const dialog = ref.current;
      if (!dialog) return;
      if (dialog.open) {
        if (combo) {
          e.preventDefault();
          dialog.close();
        }
        return;
      }
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      show();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Im Suchfeld würde Esc sonst nur den Text löschen.
    if (e.key === "Escape") {
      e.preventDefault();
      hide();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-menu-link]") ?? []);
    if (links.length === 0) return;
    e.preventDefault();
    const at = links.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (at + 1) % links.length : at <= 0 ? (at < 0 ? 0 : -1) : at - 1;
    if (next === -1) search.current?.focus();
    else links[next]?.focus();
  };

  return (
    <>
      <button
        type="button"
        className={activeHref ? "tb-menu is-active" : "tb-menu"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        aria-keyshortcuts="M Control+K Meta+K"
        onClick={show}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="6" r="2" />
          <circle cx="12" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="12" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
        <span>Menü</span>
      </button>
      {mounted &&
        createPortal(
          <dialog
            id={id}
            ref={ref}
            className="menu"
            aria-label="Menü"
            tabIndex={-1}
            onClose={() => setOpen(false)}
            onClick={(e) => {
              if (e.target === ref.current) hide();
            }}
            onKeyDown={onKeyDown}
          >
            {open && (
              <div className="menu__panel">
                <div className="menu__top">
                  <label className="menu__search">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="M16 16l4.5 4.5" />
                    </svg>
                    <input
                      ref={search}
                      type="search"
                      value={query}
                      placeholder="Bereich suchen"
                      aria-label="Menü durchsuchen"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && sections[0]) {
                          e.preventDefault();
                          router.push(sections[0].entries[0]!.item.href);
                          hide();
                        }
                      }}
                    />
                  </label>
                  <button type="button" className="menu__close" onClick={hide} aria-label="Menü schließen">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <p className="sr-only" role="status">
                  {query ? `${count} ${count === 1 ? "Eintrag" : "Einträge"} gefunden` : ""}
                </p>
                <div className="menu__body">
                  {sections.length === 0 && <p className="menu__empty">Nichts gefunden. Versuch es mit „Post“ oder „Börse“.</p>}
                  {sections.map(({ group, entries }) => (
                    <section key={group.id} className="menu__group" aria-labelledby={`${id}-${group.id}`}>
                      <h2 id={`${id}-${group.id}`} className="menu__heading">
                        {group.label}
                      </h2>
                      <ul>
                        {entries.map(({ item, badge, locked }) => {
                          const here = activeNavItem(path)?.href === item.href;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                data-menu-link=""
                                className={["menu__item", here ? "is-active" : "", locked ? "is-locked" : ""].filter(Boolean).join(" ")}
                                aria-current={here ? "page" : undefined}
                                onClick={hide}
                              >
                                <span className="menu__icon">
                                  <Icon name={item.icon} />
                                </span>
                                <span className="menu__text">
                                  <b>{item.label}</b>
                                  <small>{item.description}</small>
                                </span>
                                {locked && <span className="menu__lock">{locked}</span>}
                                {badge !== null && (
                                  <span className={item.badgeTone === "alert" ? "badge" : "badge badge--accent"}>
                                    {badge}
                                    <span className="sr-only"> offen</span>
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
                <p className="menu__hint">
                  Tipp: <kbd>M</kbd> oder <kbd>Strg</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> öffnet das Menü, <kbd>Esc</kbd> schließt es.
                </p>
              </div>
            )}
          </dialog>,
          document.body,
        )}
    </>
  );
}
