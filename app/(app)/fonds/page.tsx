import type { Metadata } from "next";
import { Suspense } from "react";
import { FundsPage } from "@/components/funds/FundsPage";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Fonds · Boardroom" };

export default function FondsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FundsPage />
    </Suspense>
  );
}
