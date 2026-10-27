import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentGame } from "@/lib/current-game";
import { monthLabel } from "@/lib/game/config";
import { acquisitionRedirect, acquisitionView } from "@/lib/game/mna-views";
import { ActionButton } from "@/components/game/ActionButton";
import { eur, pct } from "@/components/game/format";
import { DealDesk } from "./DealDesk";
import { HelpersPanel } from "@/components/network/HelpersPanel";
import { rivalFor, specialistsFor } from "@/lib/game/network-views";

// Übernahme strukturieren: ein Familienbetrieb aus der Post, von der
// Suchenden, oder ein Zukauf für die Plattform.

const SOURCE = { search: "Von deiner Suchenden", market: "Über einen M&A-Berater", referral: "Empfehlung" } as const;
const x = (n: number) => `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×`;

export async function Acquisition({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state, revision } = await currentGame();
  const v = acquisitionView(state, id);
  if (!v) {
    // Signed, expired or merged: the page re-renders after the purchase, old links live on in mails.
    const next = acquisitionRedirect(state, id);
    if (next) redirect(next);
    notFound();
  }
  const addon = v.kind === "addon";
  return (
    <div className="page mna mna--acq">
      <header className="page__head">
        <nav className="crumbs" aria-label="Pfad">
          {addon ? <Link href={`/plattform/${v.platform!.id}`}>{v.platform!.name}</Link> : <Link href="/nachfolge">Nachfolge-Programm</Link>}
          <span aria-hidden="true">/</span>
          <span>{v.name}</span>
        </nav>
        <p className="eyebrow">
          {addon ? `Zukauf für ${v.platform!.name}` : `Übernahme · ${v.source ? SOURCE[v.source] : "Nachfolge"}`} · {v.sector}
        </p>
        <h1 className="page__title">{v.name}</h1>
        <p className="page__lead">
          {v.text} {v.owner && `Inhaber: ${v.owner}.`} Das Angebot gilt bis Ende {monthLabel(v.expires)}.
        </p>
      </header>

      <section className="kpis" aria-label="Eckdaten">
        <div>
          <small>Umsatz im Monat</small>
          <b>{eur(v.revenue)}</b>
          <span>EBITDA-Marge {pct(v.margin)}</span>
        </div>
        <div>
          <small>EBITDA im Jahr</small>
          <b>{eur(v.ebitdaAdjusted)}</b>
          <span>{Math.abs(v.ebitdaAdjusted - v.ebitdaReported) > 1000 ? `laut Büchern ${eur(v.ebitdaReported)}` : "laut Büchern, ungeprüft"}</span>
        </div>
        <div>
          <small>Gefordert</small>
          <b>{eur(v.ask)}</b>
          <span>
            {x(v.multiple)} EBITDA · Faustregel {x(v.rule)}
          </span>
        </div>
        <div>
          <small>Preis nach Prüfung</small>
          <b>{eur(v.priceNow)}</b>
          <span>{addon ? "100 % der Firma" : `für ${v.stake} % der Firma`}</span>
        </div>
      </section>

      {addon && v.platform && (
        <p className="notice">
          {v.platform.name} wird heute mit etwa {x(v.platform.multiple)} EBITDA bewertet, dieser Zukauf kostet {x(v.multiple)}. Den Unterschied nennt man Multiple-Arbitrage, aber
          nur, wenn die Integration gelingt. Laufende Integrationen: {v.platform.integrations}, dein Team schafft {v.platform.capacity} gleichzeitig.
        </p>
      )}
      {v.searcher && (
        <p className="notice">
          {v.searcher.name} wird nach dem Kauf Geschäftsführerin und bekommt 8 % der Firma, mit guten Zahlen bis zu 25 %. Ihre Führungserfahrung ({v.searcher.operator} von 100)
          senkt das Risiko der Übergabe.
        </p>
      )}

      <HelpersPanel
        helpers={specialistsFor(state, id)}
        rival={rivalFor(state, id)}
        revision={revision}
        targetId={id}
        title="Spezialisten aus deinem Netzwerk"
        lead="Kennst du die richtigen Leute, wird die Prüfung billiger, die Finanzierung lockerer und das Kartellamt harmloser."
      />

      {v.found.length > 0 && (
        <section className="panel" aria-labelledby="found">
          <h2 id="found" className="panel__title">
            Gefunden
          </h2>
          <ul className="dd">
            {v.found.map((f) => (
              <li key={f.title} className="dd__fact dd__fact--bad">
                <b>{f.title}</b> {f.text} Preis −{Math.round(f.priceCut * 100)} %.
              </li>
            ))}
          </ul>
        </section>
      )}

      <DealDesk
        id={v.id}
        kind={v.kind}
        revision={revision}
        dd={v.dd}
        preview={v.preview}
        limits={v.limits}
        lowBid={v.lowBid}
        found={v.found.length}
        cash={v.cash}
        daysLeft={v.daysLeft}
        acquireDays={v.acquireDays}
        blocker={v.blocker}
        integration={addon ? v.integration : undefined}
        group={addon ? { bank: v.platform!.bank, ebitda: v.platform!.ebitda } : undefined}
      />

      {!addon && (
        <div className="panel__actions">
          <ActionButton action={{ type: "decline", startupId: v.id }} revision={revision} variant="ghost" size="sm">
            Absagen
          </ActionButton>
        </div>
      )}
      <p className="muted small">
        Lernkarten im <Link href="/notizbuch">Notizbuch</Link>: Due Diligence, Kauf mit Kredit, Covenant, Verkäuferdarlehen, Earn-out.
      </p>
    </div>
  );
}
