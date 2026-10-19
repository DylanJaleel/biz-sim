"use client";

import Link from "next/link";
import { useState } from "react";
import { ACTION_DAYS } from "@/lib/game/config";
import type { Mail, StartupStatus } from "@/lib/game/types";
import { ActionButton } from "@/components/game/ActionButton";
import { eur, pct, runwayText } from "@/components/game/format";
import { usePlay } from "@/components/game/usePlay";

export type MailView = Mail & { when: string };

export interface DealView {
  id: string;
  name: string;
  tagline: string;
  sector: string;
  status: StartupStatus;
  ticket: number;
  stake: number;
  valuation: number;
  expires: string;
  ddDone: boolean;
  diligence: { label: string; text: string; tone: "good" | "warn" | "bad" }[];
  revenue: number;
  growth: number;
  cashFlow: number;
  runway: number;
  board: string[];
}

const KIND_LABEL: Record<Mail["kind"], string> = {
  deal: "Angebot",
  news: "Neuigkeit",
  founder: "Gründung",
  system: "Assistenz",
  round: "Runde",
  shares: "Anteile",
  network: "Netzwerk",
};

export function Inbox({ mails, deals, initial, revision, cash }: { mails: MailView[]; deals: Record<string, DealView>; initial: string | null; revision: number; cash: number }) {
  const [selected, setSelected] = useState(initial);
  const { play } = usePlay(revision);
  const mail = mails.find((m) => m.id === selected);
  const deal = mail?.kind === "deal" && mail.startupId ? deals[mail.startupId] : undefined;

  const open = (m: MailView) => {
    setSelected(m.id);
    if (!m.read) play({ type: "readMail", mailId: m.id });
  };

  if (mails.length === 0) return <p className="muted">Keine Post.</p>;

  return (
    <div className="inbox">
      <ul className="inbox__list" aria-label="Nachrichten">
        {mails.map((m) => (
          <li key={m.id}>
            <button type="button" className={`inbox__item${m.id === selected ? " is-active" : ""}${m.read ? "" : " is-unread"}`} onClick={() => open(m)} aria-current={m.id === selected}>
              <span className="inbox__from">{m.from}</span>
              <span className="inbox__subject">{m.subject}</span>
              <span className="inbox__meta">
                <span className={`tag tag--kind-${m.kind}`}>{KIND_LABEL[m.kind]}</span> {m.when}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {mail && (
        <article className="inbox__read panel" aria-labelledby="mail-subject">
          <p className="eyebrow">
            {mail.from} · {mail.when}
          </p>
          <h2 id="mail-subject" className="panel__title panel__title--serif">
            {mail.subject}
          </h2>
          <p className="inbox__body">{mail.body}</p>
          {deal && <Deal deal={deal} revision={revision} cash={cash} />}
          {mail.roundId && (
            <Link className="btn btn--primary" href={`/gv/${mail.roundId}`}>
              Zur Gesellschafterversammlung
            </Link>
          )}
          {!mail.roundId && mail.startupId && (mail.kind === "shares" || mail.kind === "network") && (
            <Link className="btn" href={`/firma/${mail.startupId}#anteile`}>
              Zur Firma
            </Link>
          )}
        </article>
      )}
    </div>
  );
}

function Deal({ deal, revision, cash }: { deal: DealView; revision: number; cash: number }) {
  if (deal.status !== "offered") {
    const text: Record<StartupStatus, string> = {
      offered: "",
      active: "Du bist eingestiegen. Die Firma findest du im Portfolio.",
      declined: "Abgelehnt oder ausgelaufen.",
      dead: "Die Firma ist inzwischen insolvent.",
      exited: "Die Firma wurde verkauft.",
      sold: "Du hast deinen Anteil verkauft.",
    };
    return <p className="notice">{text[deal.status]}</p>;
  }
  return (
    <div className="deal">
      <div className="deal__terms">
        <span>
          <small>Ticket</small>
          <b>{eur(deal.ticket)}</b>
        </span>
        <span>
          <small>Anteil</small>
          <b>{deal.stake} %</b>
        </span>
        <span>
          <small>Bewertung (pre)</small>
          <b>{eur(deal.valuation)}</b>
        </span>
        <span>
          <small>Gültig bis</small>
          <b>{deal.expires}</b>
        </span>
      </div>
      <div className="deal__terms deal__terms--muted">
        <span>
          <small>Umsatz/Monat</small>
          <b>{eur(deal.revenue)}</b>
        </span>
        <span>
          <small>Wachstum</small>
          <b>{pct(deal.growth)}</b>
        </span>
        <span>
          <small>Cashflow/Monat</small>
          <b>{eur(deal.cashFlow)}</b>
        </span>
        <span>
          <small>Runway</small>
          <b>{runwayText(deal.runway)}</b>
        </span>
      </div>

      {deal.ddDone ? (
        <div className="dd">
          <p className="eyebrow">Ergebnis der Prüfung</p>
          <ul>
            {deal.diligence.map((d) => (
              <li key={d.label} className={`dd__fact dd__fact--${d.tone}`}>
                <b>{d.label}</b> {d.text}
              </li>
            ))}
          </ul>
          <p className="muted small">Im Beirat sitzen: {deal.board.join(", ")}.</p>
        </div>
      ) : (
        <p className="muted">
          Eine Prüfung (Due Diligence) zeigt, was hinter den Zahlen steckt: Kosten, Team, Wettbewerb. Wer blind investiert, erfährt es später im Beirat.
        </p>
      )}

      <div className="deal__actions">
        {!deal.ddDone && (
          <ActionButton action={{ type: "dd", startupId: deal.id }} revision={revision} days={ACTION_DAYS.dd}>
            Prüfen
          </ActionButton>
        )}
        <ActionButton action={{ type: "invest", startupId: deal.id }} revision={revision} days={ACTION_DAYS.invest} variant="primary" disabled={cash < deal.ticket}>
          {cash < deal.ticket ? "Kapital reicht nicht" : `Für ${eur(deal.ticket)} einsteigen`}
        </ActionButton>
        {cash >= Math.round(deal.ticket / 2 / 1000) * 1000 && (
          <ActionButton action={{ type: "invest", startupId: deal.id, size: "half" }} revision={revision} days={ACTION_DAYS.invest}>
            {`Halbes Ticket: ${eur(Math.round(deal.ticket / 2 / 1000) * 1000)} für ${(deal.stake / 2).toLocaleString("de-DE")} %`}
          </ActionButton>
        )}
        <ActionButton action={{ type: "decline", startupId: deal.id }} revision={revision} variant="ghost">
          Absagen
        </ActionButton>
      </div>
    </div>
  );
}
