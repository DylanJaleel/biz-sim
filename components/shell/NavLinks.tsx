"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavItem, primaryItems, type NavState } from "@/lib/navigation";
import { MainMenu } from "./MainMenu";

/** Die wenigen Hauptziele direkt in der Kopfleiste; alles andere liegt im Menü. */
export function NavLinks({ state }: { state: NavState }) {
  const path = usePathname();
  const active = activeNavItem(path);
  const items = primaryItems();
  return (
    <nav className="topbar__nav" aria-label="Hauptnavigation">
      {items.map((item) => {
        const here = active?.href === item.href;
        const badge = item.badge?.(state) ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[here ? "is-active" : "", item.primary! >= 4 ? "topbar__opt" : ""].filter(Boolean).join(" ") || undefined}
            aria-current={here ? "page" : undefined}
          >
            {item.label}
            {badge > 0 && (
              <span className={item.badgeTone === "alert" ? "badge" : "badge badge--accent"}>
                {badge}
                <span className="sr-only"> neu</span>
              </span>
            )}
          </Link>
        );
      })}
      <MainMenu state={state} activeHref={active && active.primary === undefined ? active.href : undefined} />
    </nav>
  );
}
