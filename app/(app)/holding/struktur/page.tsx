import type { Metadata } from "next";
import { Suspense } from "react";
import { StructurePage } from "@/components/holding/StructurePage";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Gesellschaftsstruktur · Boardroom" };

export default function HoldingStructurePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StructurePage />
    </Suspense>
  );
}
