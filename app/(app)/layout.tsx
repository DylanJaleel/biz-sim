import { Suspense } from "react";
import { RotateHint } from "@/components/shell/RotateHint";
import { TopBar, TopBarSkeleton } from "@/components/shell/TopBar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app">
      <Suspense fallback={<TopBarSkeleton />}>
        <TopBar />
      </Suspense>
      <main className="app__main">{children}</main>
      <RotateHint />
    </div>
  );
}
