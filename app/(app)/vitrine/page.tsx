import type { Metadata } from "next";
import { Suspense } from "react";
import { Vitrine } from "@/components/vitrine/Vitrine";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Vitrine · Boardroom" };

export default function VitrinePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Vitrine />
    </Suspense>
  );
}
