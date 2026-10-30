import type { Metadata } from "next";
import { Suspense } from "react";
import { Legacy } from "@/components/wealth/Legacy";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Stiftung & Dynastie · Boardroom" };

export default function StiftungPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Legacy />
    </Suspense>
  );
}
