import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioPage } from "@/components/studio/StudioPage";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Venture Studio · Boardroom" };

export default function VentureStudioPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudioPage />
    </Suspense>
  );
}
