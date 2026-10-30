import type { Metadata } from "next";
import { Suspense } from "react";
import { League } from "@/components/mna/League";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Rangliste · Boardroom" };

export default function RanglistePage({ searchParams }: PageProps<"/rangliste">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <League searchParams={searchParams} />
    </Suspense>
  );
}
