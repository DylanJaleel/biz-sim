import { Suspense } from "react";
import { Office } from "@/components/office/Office";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export default function OfficePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Office />
    </Suspense>
  );
}
