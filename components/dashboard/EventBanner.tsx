export function EventBanner({ description }: { description: string | null }) {
  if (!description) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      ⚠ {description}
    </div>
  );
}
