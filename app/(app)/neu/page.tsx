import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shell/PageSkeleton";
import { NewsPage } from "@/components/news/NewsPage";

export const metadata: Metadata = { title: "Neuigkeiten · Boardroom" };

export default function NeuPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewsPage />
    </Suspense>
  );
}
