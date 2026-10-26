import type { Metadata } from "next";
import { Suspense } from "react";
import { Acquisition } from "@/components/mna/Acquisition";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Übernahme · Boardroom" };

export default function UebernahmePage({ params }: PageProps<"/uebernahme/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Acquisition params={params} />
    </Suspense>
  );
}
