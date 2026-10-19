"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Büro" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/post", label: "Post" },
  { href: "/netzwerk", label: "Netzwerk", wide: true },
  { href: "/boerse", label: "Börse", wide: true },
  { href: "/holding", label: "Holding", wide: true, extra: true },
  { href: "/kalender", label: "Kalender", wide: true, extra: true },
  { href: "/notizbuch", label: "Notizbuch", wide: true, extra: true },
];

export function NavLinks({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className="topbar__nav" aria-label="Hauptnavigation">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href) || (l.href === "/portfolio" && /^\/(firma|sitzung|gv|verkauf)/.test(path));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={[active ? "is-active" : "", l.wide ? "topbar__wide" : "", "extra" in l ? "topbar__extra" : ""].join(" ").trim() || undefined}
            aria-current={active ? "page" : undefined}
          >
            {l.label}
            {l.href === "/post" && unread > 0 && <span className="badge">{unread}</span>}
          </Link>
        );
      })}
      <Link href="/konto" className={path === "/konto" ? "is-active" : undefined} aria-current={path === "/konto" ? "page" : undefined}>
        Konto
      </Link>
    </nav>
  );
}
