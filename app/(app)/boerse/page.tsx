import type { Metadata } from "next";
import { Suspense } from "react";
import { Market } from "@/components/market/Market";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Börse · Boardroom" };

export default function MarketPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Market />
    </Suspense>
  );
}
