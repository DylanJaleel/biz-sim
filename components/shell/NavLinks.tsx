"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Büro" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/post", label: "Post" },
  { href: "/netzwerk", label: "Netzwerk", wide: true },
  { href: "/kalender", label: "Kalender", wide: true },
  { href: "/notizbuch", label: "Notizbuch", wide: true },
];

export function NavLinks({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className="topbar__nav" aria-label="Hauptnavigation">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href) || (l.href === "/portfolio" && /^\/(firma|sitzung|gv)/.test(path));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={[active ? "is-active" : "", l.wide ? "topbar__wide" : ""].join(" ").trim() || undefined}
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
