import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountContent } from "@/components/account/AccountContent";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export const metadata: Metadata = { title: "Konto · Business Simulator" };

export default function AccountPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AccountContent />
    </Suspense>
  );
}
