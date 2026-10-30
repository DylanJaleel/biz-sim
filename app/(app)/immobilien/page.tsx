import type { Metadata } from "next";
import { Suspense } from "react";
import { Estate } from "@/components/wealth/Estate";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Immobilien · Boardroom" };

export default function ImmobilienPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Estate />
    </Suspense>
  );
}
