import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { monthlyCashFlow, runwayMonths, valuation } from "@/lib/game/sim";
import { definitionOf } from "@/lib/game/startups";
import { Inbox, type DealView, type MailView } from "./Inbox";

export async function Post({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { state, revision } = await currentGame();
  const firma = typeof params.firma === "string" ? params.firma : undefined;

  const mails: MailView[] = state.mails.map((m) => ({ ...m, when: monthLabel(m.month) }));
  const deals: Record<string, DealView> = {};
  for (const s of state.startups) {
    if (!s.offer) continue;
    const def = definitionOf(s.id);
    deals[s.id] = {
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      sector: s.sector,
      status: s.status,
      ticket: s.offer.ticket,
      stake: s.offer.stake,
      valuation: valuation(s.metrics),
      expires: monthLabel(s.offer.expires),
      ddDone: s.offer.ddDone,
      diligence: s.offer.ddDone ? def.diligence : [],
      revenue: s.metrics.revenue,
      growth: s.metrics.growth,
      cashFlow: monthlyCashFlow(s.metrics),
      runway: runwayMonths(s.metrics),
      board: s.board.map((b) => `${b.name} (${b.title})`),
    };
  }
  const initial = (firma && mails.find((m) => m.startupId === firma && m.kind === "deal")?.id) ?? mails[0]?.id ?? null;

  return (
    <div className="page post">
      <header className="page__head">
        <p className="eyebrow">Post</p>
        <h1 className="page__title">Posteingang</h1>
      </header>
      <Inbox key={initial ?? "empty"} mails={mails} deals={deals} initial={initial} revision={revision} cash={state.cash} />
    </div>
  );
}
