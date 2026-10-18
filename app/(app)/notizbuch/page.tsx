import type { Metadata } from "next";
import { Suspense } from "react";
import { Notebook } from "@/components/notebook/Notebook";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Notizbuch · Boardroom" };

export default function NotebookPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Notebook />
    </Suspense>
  );
}
