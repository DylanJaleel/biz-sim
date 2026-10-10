import type { ReactNode } from "react";

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
      {children}
    </span>
  );
}
