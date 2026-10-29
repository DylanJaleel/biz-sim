import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamPage } from "@/components/holding/TeamPage";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Operating Partner · Boardroom" };

export default function HoldingTeamPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeamPage />
    </Suspense>
  );
}
