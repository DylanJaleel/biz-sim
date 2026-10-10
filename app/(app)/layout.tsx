import { BottomNav } from "@/components/nav/BottomNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] lg:max-w-3xl">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
