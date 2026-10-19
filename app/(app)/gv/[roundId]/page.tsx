import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shell/PageSkeleton";
import { ShareholderMeeting } from "@/components/shares/ShareholderMeeting";
import { currentGame } from "@/lib/current-game";
import { roundView } from "@/lib/game/views";

export const metadata: Metadata = { title: "Gesellschafterversammlung · Boardroom" };

async function Meeting({ params }: { params: PageProps<"/gv/[roundId]">["params"] }) {
  const { roundId } = await params;
  const { state, revision } = await currentGame();
  const view = roundView(state, roundId);
  if (!view) notFound();
  return <ShareholderMeeting key={roundId} view={view} revision={revision} />;
}

export default function ShareholderMeetingPage({ params }: PageProps<"/gv/[roundId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Meeting params={params} />
    </Suspense>
  );
}
