import type { Metadata } from "next";
import { Suspense } from "react";
import { Holding } from "@/components/holding/Holding";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Holding · Boardroom" };

export default function HoldingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Holding />
    </Suspense>
  );
}
