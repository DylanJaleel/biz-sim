"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BankIcon, HomeIcon, UserIcon } from "@/components/ui/icons";

const TABS = [
  { href: "/", label: "Übersicht", Icon: HomeIcon },
  { href: "/bank", label: "Bank", Icon: BankIcon },
  { href: "/konto", label: "Konto", Icon: UserIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/90"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3 lg:max-w-md">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-zinc-500 active:text-zinc-900 dark:text-zinc-400 dark:active:text-zinc-100"
                }`}
              >
                <Icon width={24} height={24} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
