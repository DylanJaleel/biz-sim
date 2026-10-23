import type { Metadata } from "next";
import { Suspense } from "react";
import { PlatformPage } from "@/components/mna/PlatformPage";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Plattform · Boardroom" };

export default function PlattformRoute({ params }: PageProps<"/plattform/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PlatformPage params={params} />
    </Suspense>
  );
}
