import type { Metadata } from "next";
import { Suspense } from "react";
import { Company } from "@/components/company/Company";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Firma · Boardroom" };

export default function CompanyPage({ params }: PageProps<"/firma/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Company params={params} />
    </Suspense>
  );
}
