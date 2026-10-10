import type { Metadata } from "next";
import { Suspense } from "react";
import { BankContent } from "@/components/bank/BankContent";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export const metadata: Metadata = { title: "Bank · Business Simulator" };

export default function BankPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <BankContent />
    </Suspense>
  );
}
