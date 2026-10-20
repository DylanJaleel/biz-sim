import Link from "next/link";
import { monthLabel, monthName } from "@/lib/game/config";
import { monthDays } from "@/lib/game/office";
import { daysLeft, netWorth, openItems } from "@/lib/game/engine";
import { currentGame } from "@/lib/current-game";
import { eur } from "@/components/game/format";
import { CloseMonth } from "./CloseMonth";
import { NavLinks } from "./NavLinks";
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
  const fresh = state.trophies.filter((t) => !t.seen);
  return (
    <>
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__logo" aria-hidden="true" />
          <span className="topbar__name">Boardroom</span>
        </div>
        <NavLinks unread={unread} />
        <dl className="topbar__stats">
          <div>
            <dt>Monat</dt>
            <dd>
              <span className="topbar__long">{monthLabel(state.month)}</span>
              <span className="topbar__short">
                {monthName(state.month).slice(0, 3)} · J{Math.floor((state.month + 8) / 12) + 1}
              </span>
            </dd>
          </div>
          <div>
            <dt>Tage frei</dt>
            <dd>
              <span className="days" aria-hidden="true">
                <i style={{ width: `${(free / total) * 100}%` }} />
              </span>
              {free} / {total}
            </dd>
          </div>
          <div>
            <dt>Privatkapital</dt>
            <dd>{eur(state.cash)}</dd>
          </div>
          <div className="topbar__hide-sm">
            <dt>Vermögen</dt>
            <dd>{eur(netWorth(state))}</dd>
          </div>
          <div>
            <dt>Ruf</dt>
            <dd>{state.reputation}</dd>
          </div>
        </dl>
        <Link href="/konto#spielstand" className="topbar__saved" title={`Gespeichert am ${saved}`} aria-label={`Spielstand gespeichert am ${saved}`}>
          <span className="saves__dot" aria-hidden="true" />
        </Link>
        <CloseMonth revision={revision} month={state.month} openItems={open} daysLeft={free} />
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
