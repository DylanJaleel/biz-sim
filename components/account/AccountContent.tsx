import { OfficeStyleCard } from "@/components/account/OfficeStyleCard";
import { ResetGameCard } from "@/components/account/ResetGameCard";
import { officeStyle } from "@/lib/office-style";
import { SaveGames } from "@/components/account/SaveGames";
import { UsageCard } from "@/components/account/UsageCard";
import { requireUser } from "@/lib/session";
import { signOutAction } from "@/app/(app)/konto/actions";

export async function AccountContent() {
  const user = await requireUser();

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <p className="eyebrow">Konto</p>
        <h1 className="page__title">Anmeldung und Spielstand</h1>
      </header>

      <section className="panel">
        <p className="eyebrow">Angemeldet als</p>
        <p className="panel__title">{user.email}</p>
      </section>

      <SaveGames userId={user.id!} email={user.email ?? ""} />

      <OfficeStyleCard current={await officeStyle()} />

      <UsageCard />

      <ResetGameCard />

      <form action={signOutAction}>
        <button type="submit" className="btn btn--danger">
          Abmelden
        </button>
      </form>
    </div>
  );
}
