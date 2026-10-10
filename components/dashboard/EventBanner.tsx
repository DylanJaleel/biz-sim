import type { WeekEvent } from "@/lib/economy";

/** This week's incident, announced when the week starts so the player can plan around it. */
export function EventBanner({ event }: { event: WeekEvent | null }) {
  if (!event) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <div className="font-semibold">Diese Woche</div>
      {event.description}
    </div>
  );
}
