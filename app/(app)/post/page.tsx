import type { Metadata } from "next";
import { Suspense } from "react";
import { Post } from "@/components/post/Post";
import { PageSkeleton } from "@/components/shell/PageSkeleton";

export const metadata: Metadata = { title: "Post · Boardroom" };

export default function PostPage({ searchParams }: PageProps<"/post">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Post searchParams={searchParams} />
    </Suspense>
  );
}
