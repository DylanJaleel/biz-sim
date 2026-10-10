import { ResetGameCard } from "@/components/account/ResetGameCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/session";
import { signOutAction } from "@/app/(app)/konto/actions";

export async function AccountContent() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Konto" subtitle="Anmeldung und Spielstand" />

      <Card title="Angemeldet als">
        <p className="break-all text-base font-medium text-zinc-900 dark:text-zinc-50">{user.email}</p>
      </Card>

      <ResetGameCard />

      <form action={signOutAction}>
        <button
          type="submit"
          className="h-12 w-full rounded-xl border border-red-200 text-base font-semibold text-red-600 active:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:active:bg-red-500/10"
        >
          Abmelden
        </button>
      </form>
    </>
  );
}
