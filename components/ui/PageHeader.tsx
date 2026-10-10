import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {trailing}
    </header>
  );
}
