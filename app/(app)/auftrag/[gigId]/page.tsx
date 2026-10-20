import type { Metadata } from "next";
import { Suspense } from "react";
import { TripPage } from "@/components/trip/TripPage";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Auftrag · Boardroom" };

export default function AuftragPage({ params }: PageProps<"/auftrag/[gigId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TripPage params={params} />
    </Suspense>
  );
}
