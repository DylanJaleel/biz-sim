import type { Metadata } from "next";
import { Suspense } from "react";
import { BusinessContent } from "@/components/business/BusinessContent";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export const metadata: Metadata = { title: "Betrieb · Business Simulator" };

export default function BusinessPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <BusinessContent />
    </Suspense>
  );
}
