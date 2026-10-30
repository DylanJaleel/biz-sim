import Link from "next/link";
import { monthLabel, monthName } from "@/lib/game/config";
import { monthDays } from "@/lib/game/office";
import { daysLeft, netWorth, openItems } from "@/lib/game/engine";
import { currentGame } from "@/lib/current-game";
import { eur } from "@/components/game/format";
import { CloseMonth } from "./CloseMonth";
import { NavLinks } from "./NavLinks";
import { TopBarStats } from "./TopBarStats";
import { monthOutlook } from "@/lib/game/month-view";
import { networkTasks } from "@/lib/game/network-views";
import type { NavState } from "@/lib/navigation";
import { AwardPopup } from "@/components/vitrine/AwardPopup";

export async function TopBar() {
  const { state, revision, updatedAt } = await currentGame();
  const saved = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" }).format(updatedAt);
  const free = daysLeft(state);
  const total = monthDays(state);
  const unread = state.mails.filter((m) => !m.read).length;
  const open = openItems(state).map((i) => {
    const s = state.startups.find((x) => x.id === i.startupId);
    return s?.name ?? "";
  });
  const nav: NavState = {
    reputation: state.reputation,
    unread,
    openItems: open.length,
    networkTasks: networkTasks(state).filter((t) => t.hurry).length,
    familyOffice: state.familyOffice !== undefined,
    funds: (state.fund ? 1 : 0) + (state.funds?.later.length ?? 0),
    exits: state.exits.filter((e) => e.status === "accepted").length,
  };
  const fresh = state.trophies.filter((t) => !t.seen);
  return (
    <>
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__logo" aria-hidden="true" />
          <span className="topbar__name">Boardroom</span>
        </div>
        <NavLinks state={nav} />
        <TopBarStats
          data={{
            monthLong: monthLabel(state.month),
            monthShort: `${monthName(state.month).slice(0, 3)} · J${Math.floor((state.month + 8) / 12) + 1}`,
            free,
            total,
            cash: eur(state.cash),
            worth: eur(netWorth(state)),
            reputation: state.reputation,
          }}
        />
        <Link href="/konto#spielstand" className="topbar__saved" title={`Gespeichert am ${saved}`} aria-label={`Spielstand gespeichert am ${saved}`}>
          <span className="saves__dot" aria-hidden="true" />
        </Link>
        <CloseMonth revision={revision} month={state.month} openItems={open} daysLeft={free} outlook={monthOutlook(state)} />
      </header>
      {fresh.length > 0 && <AwardPopup ids={fresh.map((t) => t.id)} details={Object.fromEntries(fresh.map((t) => [t.id, t.detail]))} revision={revision} />}
    </>
  );
}

export function TopBarSkeleton() {
  return (
    <header className="topbar" aria-busy="true">
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden="true" />
        <span className="topbar__name">Boardroom</span>
      </div>
    </header>
  );
}
