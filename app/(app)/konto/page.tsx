import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountContent } from "@/components/account/AccountContent";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Konto · Boardroom" };

export default function AccountPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountContent />
    </Suspense>
  );
}
