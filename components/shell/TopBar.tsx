import { DAYS_PER_MONTH, monthLabel, monthName } from "@/lib/game/config";
import { daysLeft, openItems, portfolioValue } from "@/lib/game/engine";
import { currentGame } from "@/lib/current-game";
import { eur } from "@/components/game/format";
import { CloseMonth } from "./CloseMonth";
import { NavLinks } from "./NavLinks";

export async function TopBar() {
  const { state, revision } = await currentGame();
  const free = daysLeft(state);
  const unread = state.mails.filter((m) => !m.read).length;
  const open = openItems(state).map((i) => {
    const s = state.startups.find((x) => x.id === i.startupId);
    return s?.name ?? "";
  });
  return (
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
              <i style={{ width: `${(free / DAYS_PER_MONTH) * 100}%` }} />
            </span>
            {free} / {DAYS_PER_MONTH}
          </dd>
        </div>
        <div>
          <dt>Privatkapital</dt>
          <dd>{eur(state.cash)}</dd>
        </div>
        <div className="topbar__hide-sm">
          <dt>Beteiligungen</dt>
          <dd>{eur(portfolioValue(state))}</dd>
        </div>
        <div>
          <dt>Ruf</dt>
          <dd>{state.reputation}</dd>
        </div>
      </dl>
      <CloseMonth revision={revision} month={state.month} openItems={open} daysLeft={free} />
    </header>
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
