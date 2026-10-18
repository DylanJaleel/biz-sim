import type { Metadata } from "next";
import { Suspense } from "react";
import { Portfolio } from "@/components/company/Portfolio";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Portfolio · Boardroom" };

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Portfolio />
    </Suspense>
  );
}
