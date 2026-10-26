import type { Metadata } from "next";
import { Suspense } from "react";
import { MandatePage } from "@/components/mna/MandatePage";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "M&A-Mandat · Boardroom" };

export default function MandatRoute({ params }: PageProps<"/mandat/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MandatePage params={params} />
    </Suspense>
  );
}
