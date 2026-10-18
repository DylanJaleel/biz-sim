import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MeetingRoom } from "@/components/boardroom/MeetingRoom";
import { PageSkeleton } from "@/components/shell/PageSkeleton";
import { currentGame } from "@/lib/current-game";
import { meetingView } from "@/lib/game/views";

export const metadata: Metadata = { title: "Beiratssitzung · Boardroom" };

async function Meeting({ params }: { params: PageProps<"/sitzung/[itemId]">["params"] }) {
  const { itemId } = await params;
  const { state, revision } = await currentGame();
  if (!state.items.some((i) => i.id === itemId)) notFound();
  return <MeetingRoom key={itemId} view={meetingView(state, itemId)} revision={revision} />;
}

export default function MeetingPage({ params }: PageProps<"/sitzung/[itemId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Meeting params={params} />
    </Suspense>
  );
}
