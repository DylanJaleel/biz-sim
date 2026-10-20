import type { Metadata } from "next";
import { Suspense } from "react";
import { Garage } from "@/components/garage/Garage";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Fuhrpark · Boardroom" };

export default function FuhrparkPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Garage />
    </Suspense>
  );
}
