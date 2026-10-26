import type { Metadata } from "next";
import { Suspense } from "react";
import { Succession } from "@/components/mna/Succession";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Nachfolge-Programm · Boardroom" };

export default function NachfolgePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Succession />
    </Suspense>
  );
}
