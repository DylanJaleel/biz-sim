import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shell/PageSkeleton";
import { ExitMeeting } from "@/components/shares/ExitMeeting";
import { currentGame } from "@/lib/current-game";
import { exitView } from "@/lib/game/views";

export const metadata: Metadata = { title: "Verkauf · Boardroom" };

async function Meeting({ params }: { params: PageProps<"/verkauf/[exitId]">["params"] }) {
  const { exitId } = await params;
  const { state, revision } = await currentGame();
  const view = exitView(state, exitId);
  if (!view) notFound();
  return <ExitMeeting key={exitId} view={view} revision={revision} />;
}

export default function ExitPage({ params }: PageProps<"/verkauf/[exitId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Meeting params={params} />
    </Suspense>
  );
}
