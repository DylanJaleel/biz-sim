import type { Metadata } from "next";
import { Suspense } from "react";
import { Calendar } from "@/components/calendar/Calendar";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Kalender · Boardroom" };

export default function CalendarPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Calendar />
    </Suspense>
  );
}
