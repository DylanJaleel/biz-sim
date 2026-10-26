"use client";

import Link from "next/link";
import { useState } from "react";
import { ACTION_DAYS, BUYOUT_REPUTATION } from "@/lib/game/config";
import type { GameState, Mail, StartupStatus } from "@/lib/game/types";
import { ActionButton } from "@/components/game/ActionButton";
import { eur, pct, runwayText } from "@/components/game/format";
import { usePlay } from "@/components/game/usePlay";
import type { EventCard, FavorCard } from "@/lib/game/network-views";
import { EventButtons, EventFacts, GuestStack } from "@/components/network/EventParts";
import { FavorButtons, FavorDue, FavorFacts } from "@/components/network/FavorParts";
import { NetAvatar } from "@/components/network/NetAvatar";

export type MailView = Mail & { when: string };

export interface DealView {
  id: string;
  name: string;
  tagline: string;
  stage?: string;
  buyout: boolean;
  /** Valued by EBITDA: bought through the structuring page (bank, seller loan, earn-out). */
  structured?: boolean;
  loan: number;
  canBuyout: boolean;
  fundMatch: number;
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
  exit: "Verkauf",
};

export function Inbox({
  mails,
  deals,
  initial,
  revision,
  cash,
  ddDays,
  corporateSeat,
  network,
}: {
  mails: MailView[];
  deals: Record<string, DealView>;
  initial: string | null;
  revision: number;
  cash: number;
  ddDays: number;
  corporateSeat: GameState["corporateSeat"];
  network?: { favors: Record<string, FavorCard>; events: Record<string, EventCard> };
}) {
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
            <button
              type="button"
              className={`inbox__item${m.id === selected ? " is-active" : ""}${m.read ? "" : " is-unread"}`}
              onClick={() => open(m)}
              aria-current={m.id === selected}
            >
              <span className="inbox__from">{m.from}</span>
              <span className="inbox__subject">{m.subject}</span>
              <span className="inbox__meta">
                <span className={`tag tag--kind-${m.kind}`}>{KIND_LABEL[m.kind]}</span> <span className="inbox__when">{m.when}</span>
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
          {deal && <Deal deal={deal} revision={revision} cash={cash} ddDays={ddDays} />}
          {mail.exitId && (
            <Link className="btn btn--primary" href={`/verkauf/${mail.exitId}`}>
              Zum Verkauf
            </Link>
          )}
          {mail.action === "corporate" &&
            (corporateSeat === "offered" ? (
              <div className="deal__actions">
                <ActionButton action={{ type: "joinCorporate", accept: true }} revision={revision} days={ACTION_DAYS.joinCorporate} variant="primary">
                  Mandat annehmen
                </ActionButton>
                <ActionButton action={{ type: "joinCorporate", accept: false }} revision={revision} variant="ghost">
                  Absagen
                </ActionButton>
              </div>
            ) : (
              <p className="notice">
                {corporateSeat === "joined" ? (
                  <>
                    Du sitzt im Aufsichtsrat. <Link href="/firma/nordhafen">Zur Nordhafen AG</Link>
                  </>
                ) : (
                  "Du hast abgesagt."
                )}
              </p>
            ))}
          {mail.action === "favor" && mail.favorId && <FavorAnswer favor={network?.favors[mail.favorId]} revision={revision} />}
          {mail.action === "event" && mail.eventId && <EventAnswer event={network?.events[mail.eventId]} revision={revision} />}
          {mail.roundId && (
            <Link className="btn btn--primary" href={`/gv/${mail.roundId}`}>
              Zur Gesellschafterversammlung
            </Link>
          )}
          {!mail.roundId &&
            mail.startupId &&
            (mail.kind === "shares" || mail.kind === "network") &&
            deals[mail.startupId]?.status === "offered" &&
            deals[mail.startupId]?.structured && (
              <Link className="btn" href={`/uebernahme/${mail.startupId}`}>
                Zur Übernahme
              </Link>
            )}
          {!mail.roundId && mail.startupId && (mail.kind === "shares" || mail.kind === "network") && deals[mail.startupId]?.status !== "offered" && (
            <Link className="btn" href={`/firma/${mail.startupId}#anteile`}>
              Zur Firma
            </Link>
          )}
        </article>
      )}
    </div>
  );
}

function Deal({ deal, revision, cash, ddDays }: { deal: DealView; revision: number; cash: number; ddDays: number }) {
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
      {deal.stage && (
        <p className="deal__stage">
          <span className="pill">{deal.stage}</span> <span className="muted small">{deal.sector}</span>
        </p>
      )}
      <div className="deal__terms">
        <span>
          <small>{deal.buyout ? "Kaufpreis" : "Ticket"}</small>
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
        <p className="muted">Eine Prüfung (Due Diligence) zeigt, was hinter den Zahlen steckt: Kosten, Team, Wettbewerb. Wer blind investiert, erfährt es später im Beirat.</p>
      )}
      {deal.structured && (
        <p className="notice">
          Nachfolge: Bewertet nach EBITDA. Vor dem Kauf prüfst du Zahlen, Verträge, Steuern und Markt; finanziert wird mit Bankkredit in der Firma, Verkäuferdarlehen und Earn-out.
          {!deal.canBuyout && ` Firmen übernehmen kannst du ab ${BUYOUT_REPUTATION} Ruf.`}
        </p>
      )}
      {deal.buyout && !deal.structured && (
        <p className="notice">
          Nachfolge: Du kaufst die Mehrheit von der Inhaberfamilie. Mit der Mehrheit schüttet die Firma jedes Quartal aus, was sie nicht braucht. Ein Kaufkredit über 40 % läuft
          acht Jahre über dein Konto.
          {!deal.canBuyout && ` Firmen übernehmen kannst du ab ${BUYOUT_REPUTATION} Ruf.`}
        </p>
      )}
      {deal.fundMatch > 0 && <p className="notice">Dein Fonds investiert bis zu {eur(deal.fundMatch)} mit, zum selben Preis wie du.</p>}

      <div className="deal__actions">
        {!deal.ddDone && !deal.structured && (
          <ActionButton action={{ type: "dd", startupId: deal.id }} revision={revision} days={ddDays}>
            Prüfen
          </ActionButton>
        )}
        {deal.structured ? (
          <Link href={`/uebernahme/${deal.id}`} className="btn btn--primary">
            Prüfen und Übernahme strukturieren
          </Link>
        ) : deal.buyout ? (
          <>
            <ActionButton
              action={{ type: "buyout", startupId: deal.id, leverage: true }}
              revision={revision}
              days={ACTION_DAYS.buyout}
              variant="primary"
              disabled={!deal.canBuyout || cash < deal.ticket - deal.loan}
            >
              {`Mit Kaufkredit: ${eur(deal.ticket - deal.loan)} selbst, ${eur(deal.loan)} Bank`}
            </ActionButton>
            <ActionButton
              action={{ type: "buyout", startupId: deal.id, leverage: false }}
              revision={revision}
              days={ACTION_DAYS.buyout}
              disabled={!deal.canBuyout || cash < deal.ticket}
            >
              {`Ganz aus eigenem Geld: ${eur(deal.ticket)}`}
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton action={{ type: "invest", startupId: deal.id }} revision={revision} days={ACTION_DAYS.invest} variant="primary" disabled={cash < deal.ticket}>
              {cash < deal.ticket ? "Kapital reicht nicht" : `Für ${eur(deal.ticket)} einsteigen`}
            </ActionButton>
            {cash >= Math.round(deal.ticket / 2 / 1000) * 1000 && (
              <ActionButton action={{ type: "invest", startupId: deal.id, size: "half" }} revision={revision} days={ACTION_DAYS.invest}>
                {`Halbes Ticket: ${eur(Math.round(deal.ticket / 2 / 1000) * 1000)} für ${(deal.stake / 2).toLocaleString("de-DE")} %`}
              </ActionButton>
            )}
          </>
        )}
        <ActionButton action={{ type: "decline", startupId: deal.id }} revision={revision} variant="ghost">
          Absagen
        </ActionButton>
      </div>
    </div>
  );
}

/** A contact asks for a favour: yes costs days, money or a little risk; no cools the relationship. */
function FavorAnswer({ favor, revision }: { favor?: FavorCard; revision: number }) {
  if (!favor) return <p className="notice">Diese Bitte ist erledigt oder verstrichen.</p>;
  return (
    <div className="net-answer">
      <div className="net-answer__head">
        <NetAvatar name={favor.contactName} ring={favor.ring} size="sm" />
        <b>{favor.contactName}</b>
        <FavorDue favor={favor} />
      </div>
      <FavorFacts favor={favor} />
      <FavorButtons favor={favor} revision={revision} />
    </div>
  );
}

/** An invitation: go (with or without a talk) or decline. */
function EventAnswer({ event, revision }: { event?: EventCard; revision: number }) {
  if (!event) return <p className="notice">Diese Veranstaltung ist vorbei.</p>;
  return (
    <div className="net-answer">
      {event.status === "invited" && (
        <>
          <div className="net-answer__head">
            <span className="nt-due">{event.month}</span>
          </div>
          <EventFacts event={event} />
          <GuestStack event={event} />
        </>
      )}
      <EventButtons event={event} revision={revision} />
    </div>
  );
}
