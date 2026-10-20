import { Suspense } from "react";
import { GlassOffice } from "@/components/office/GlassOffice";
import { Office } from "@/components/office/Office";
import { PageSkeleton } from "@/components/shell/PageSkeleton";
import { officeStyle } from "@/lib/office-style";

async function ChosenOffice() {
  return (await officeStyle()) === "klassisch" ? <Office /> : <GlassOffice />;
}

export default function OfficePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ChosenOffice />
    </Suspense>
  );
}
