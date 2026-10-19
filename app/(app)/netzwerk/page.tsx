import type { Metadata } from "next";
import { Suspense } from "react";
import { Network } from "@/components/network/Network";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Netzwerk · Boardroom" };

export default function NetworkPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Network />
    </Suspense>
  );
}
