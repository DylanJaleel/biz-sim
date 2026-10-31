import type { Metadata } from "next";
import { Suspense } from "react";
import { Diligence } from "@/components/dd/Diligence";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Due Diligence · Boardroom" };

export default function PruefungPage({ params }: PageProps<"/pruefung/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Diligence params={params} />
    </Suspense>
  );
}
