function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900 ${className}`}
    >
      <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <div className="h-12 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <SkeletonCard className="h-40" />
      <SkeletonCard className="h-64" />
      <SkeletonCard className="h-40" />
    </>
  );
}
