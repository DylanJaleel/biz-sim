import Link from "next/link";

// Reiter der Holding: Übersicht, Team (Operating Partner) und Gesellschaftsstruktur.

const TABS = [
  { href: "/holding", label: "Übersicht" },
  { href: "/holding/team", label: "Operating Partner" },
  { href: "/holding/struktur", label: "Struktur" },
] as const;

export function HoldingTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav className="holding-tabs" aria-label="Bereiche der Holding">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.href === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
