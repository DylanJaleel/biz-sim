import Link from "next/link";
import { monthLabel, monthName } from "@/lib/game/config";
import { careerOf } from "@/lib/game/career";
import { daysLeft, netWorth, portfolioValue } from "@/lib/game/engine";
import { holdingsValue } from "@/lib/game/market";
import { monthDays, OFFICES, officeOf } from "@/lib/game/office";
import { LESSONS } from "@/lib/game/lessons";
import { deskView } from "@/lib/game/views";
import { cityOf, garageOf } from "@/lib/game/travel";
import { TROPHIES } from "@/lib/game/trophies";
import type { PaceKind } from "@/lib/game/types";
import { currentGame } from "@/lib/current-game";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { sceneStyle } from "@/components/glass/Tomb";

// Das Glas-Cockpit: Man sitzt am Schreibtisch und sieht durch die Brille auf
// schwebende Fenster; dahinter das eigene Büro, unscharf. Welches Büro, hängt
// von der Stufe ab.

const SCENE = ["buero-stufe1", "buero-stufe1", "buero-stufe2", "buero-stufe3", "buero-stufe3"];
const PACE: Record<PaceKind, { label: string; cls: string }> = {
  calm: { label: "Ruhig", cls: "gpill gpill--calm" },
  normal: { label: "Normal", cls: "gpill gpill--normal" },
  busy: { label: "Viel los", cls: "gpill gpill--busy" },
};
const SENDER_COLORS = ["#0a84ff, #5ac8fa", "#bf5af2, #5e5ce6", "#ff9f0a, #ff6b3d", "#30d158, #0fa47a", "#ff375f, #ff9f0a", "#8e8e93, #48484a"];

function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\s-]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function colorOf(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return `linear-gradient(135deg, ${SENDER_COLORS[h % SENDER_COLORS.length]})`;
}

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "numeric", hour12: false }).format(new Date()));
  return hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
}

export async function GlassOffice() {
  const { state, revision } = await currentGame();
  const desk = deskView(state, LESSONS.length);
  const office = officeOf(state);
  const upgrade = OFFICES[office.level + 1];
  const worth = netWorth(state);
  const total = monthDays(state);
  const free = daysLeft(state);
  const career = careerOf(state);
  const next = career.steps.find((s) => !s.done);
  const yearChange = state.yearWorth > 0 ? (worth - state.yearWorth) / state.yearWorth : 0;
  const history = state.reports.slice(-11).map((r) => ({ month: r.month, value: r.playerCash + r.portfolioValue }));
  history.push({ month: state.month, value: state.cash + portfolioValue(state) });
  const max = Math.max(1, ...history.map((h) => h.value));
  const min = Math.min(...history.map((h) => h.value));
  // Bars start a little below the lowest month, so changes stay visible.
  const floor = Math.max(0, min - (max - min) * 0.6 - max * 0.05);
  const agenda = state.startups
    .filter((s) => s.status === "active" && state.items.some((i) => i.startupId === s.id && i.status === "open"))
    .map((s) => ({ s, count: state.items.filter((i) => i.startupId === s.id && i.status === "open").length }));
  const mails = [...state.mails].sort((a, b) => b.month - a.month).slice(0, 5);
  const gigs = state.gigs.filter((g) => g.month === state.month && g.status !== "expired");
  const assistant = office.level >= 2;
  const garage = garageOf(state);
  const ride = [...garage].sort((a, b) => b.price - a.price)[0];
  const earned = state.trophies.length;

  return (
    <div className="glass-page">
      <div className="glass-scene" style={sceneStyle(SCENE[office.level] ?? "buero-stufe1")} aria-hidden="true" />

      <div className="cockpit">
        <section className="gwin" aria-labelledby="cockpit-title">
          <header className="cockpit__head">
            <div>
              <div className="glbl">{monthLabel(state.month)}</div>
              <h1 id="cockpit-title">{greeting()}</h1>
            </div>
            <div className="cockpit__chips">
              <Link href="/kalender" className="gchip" aria-label={`${free} von ${total} Tagen frei`}>
                <span className="glbl">Tage im {monthName(state.month)}</span>
                <span className="daydots" aria-hidden="true">
                  {Array.from({ length: total }, (_, i) => (
                    <i key={i} className={i < total - free ? "is-used" : undefined} />
                  ))}
                </span>
                <b>{free} frei</b>
              </Link>
              <span className="gchip">
                <span className="glbl">Ruf</span> <b>{state.reputation}</b>
              </span>
              <Link href="/holding" className="gchip">
                <span className="glbl">Karriere</span> <b>{career.title}</b>
              </Link>
            </div>
          </header>

          <div className="cockpit__grid">
            <div className="cockpit__col">
              <div className="gcard worth">
                <div className="glbl">Vermögen</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                  <b>{eur(worth)}</b>
                  <span style={{ fontSize: 12, fontWeight: 600, color: yearChange >= 0 ? "var(--g-money)" : "var(--g-bad)" }}>
                    {yearChange >= 0 ? "+" : "−"}
                    {Math.abs(yearChange * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % im Jahr
                  </span>
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 12, flexWrap: "wrap" }}>
                  <span>
                    <span className="glbl">Konto</span> {eur(state.cash)}
                  </span>
                  <span>
                    <span className="glbl">Beteiligungen</span> {eur(portfolioValue(state))}
                  </span>
                  {holdingsValue(state.market) > 0 && (
                    <span>
                      <span className="glbl">Depot</span> {eur(holdingsValue(state.market))}
                    </span>
                  )}
                </div>
                {history.length >= 3 ? (
                  <div className="bars" role="img" aria-label="Konto und Beteiligungen der letzten Monate">
                    {history.map((h) => (
                      <div key={h.month}>
                        <i style={{ height: `${Math.max(4, ((h.value - floor) / Math.max(1, max - floor)) * 100)}%` }} />
                        <span>{monthName(h.month).slice(0, 1)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="glbl" style={{ margin: "14px 0 0" }}>
                    Der Verlauf füllt sich mit jedem Monatsabschluss.
                  </p>
                )}
              </div>

              <div className="gcard">
                <div className="gcard__head">
                  <h2>Tagesordnungen</h2>
                  <span className="glbl">{desk.openItems.length === 1 ? "1 Punkt offen" : `${desk.openItems.length} Punkte offen`}</span>
                </div>
                {agenda.length === 0 && <p className="glbl">Gerade liegt in keinem Beirat etwas an.</p>}
                {agenda.map(({ s, count }) => {
                  const pace = PACE[s.pace?.kind ?? "normal"];
                  return (
                    <Link key={s.id} href={`/firma/${s.id}`} className="grow">
                      <span className="grow__main">
                        <b>{s.name}</b>
                        <span className="glbl">
                          {s.corporate ? "Aufsichtsrat" : "Beirat"} · {count === 1 ? "1 Punkt" : `${count} Punkte`}
                        </span>
                      </span>
                      <span className={pace.cls}>{pace.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="cockpit__col">
              <div className="gcard" style={{ flex: 1 }}>
                <div className="gcard__head">
                  <h2>Posteingang</h2>
                  <Link href="/post" className="glbl">
                    {desk.unread > 0 ? `${desk.unread} neu` : "Alle"}
                  </Link>
                </div>
                {mails.length === 0 && <p className="glbl">Noch keine Post.</p>}
                {mails.map((m) => (
                  <Link key={m.id} href={`/post?mail=${m.id}`} className="grow" style={{ alignItems: "flex-start" }}>
                    <span className="gav" style={{ background: colorOf(m.from) }}>
                      {initials(m.from)}
                    </span>
                    <span className="grow__main">
                      <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <b>{m.from}</b>
                        {!m.read && <span className="gpill gpill--normal">Neu</span>}
                      </span>
                      <span style={{ display: "block", fontSize: 13, lineHeight: 1.35, marginTop: 2 }}>{m.subject}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="cockpit__col">
              <div className="gcard">
                <div className="gcard__head">
                  <h2>Portfolio</h2>
                  <Link href="/portfolio" className="glbl">
                    {desk.mandates.length === 1 ? "1 Firma" : `${desk.mandates.length} Firmen`}
                  </Link>
                </div>
                {desk.mandates.length === 0 && <p className="glbl">Noch keine Beteiligung. Angebote liegen in der Post.</p>}
                {desk.mandates.slice(0, 6).map((m) => (
                  <Link key={m.id} href={`/firma/${m.id}`} className="grow" style={{ padding: "8px 0" }}>
                    <span className="grow__main">
                      <b>{m.name}</b>
                    </span>
                    <span className={PACE[m.pace].cls}>{PACE[m.pace].label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{eur(m.value)}</span>
                  </Link>
                ))}
              </div>

              <div className="gcard" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="gcard__head">
                  <h2>Aufträge</h2>
                  <span className="glbl">
                    {(() => {
                      const n = gigs.filter((g) => g.status === "offered").length;
                      return n === 1 ? "1 Anfrage" : `${n} Anfragen`;
                    })()}
                  </span>
                </div>
                {gigs.length === 0 && <p className="glbl">Diesen Monat liegen keine Aufträge vor.</p>}
                {gigs.map((g) => (
                  <div key={g.id} className="gig-mini">
                    <span className="glbl">
                      {g.client} · {cityOf(g).name}
                    </span>
                    <b style={{ fontSize: 14 }}>{g.title}</b>
                    <div className="gig-mini__foot">
                      <span className="money">{eur(g.fee)}</span>
                      {g.status === "booked" ? (
                        <Link className="gbtn" href={`/auftrag/${g.id}`} style={{ height: 30, fontSize: 12 }}>
                          {g.trip ? g.trip.head : "Gebucht"}
                        </Link>
                      ) : (
                        <Link className="gbtn gbtn--go" href={`/auftrag/${g.id}`} style={{ height: 30, fontSize: 12 }}>
                          Reise planen
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="gwin assist" aria-labelledby="assist-title">
          <div className="assist__who">
            <span className="gav assist__face">{assistant ? "LH" : "Du"}</span>
            <div>
              <b id="assist-title">{assistant ? "Lena Hoffmann" : "Dein Notizzettel"}</b>
              <div className="glbl">{assistant ? "Assistenz · ruft an" : "Was heute ansteht"}</div>
            </div>
          </div>
          <div className="assist__bubble">{assistant ? "Ich habe sortiert, was heute ansteht. Das Wichtigste zuerst:" : "Noch ohne Assistenz. Was du dir notiert hast:"}</div>
          <ul className="assist__tasks">
            {desk.tasks.slice(0, 6).map((t, i) => (
              <li key={i}>
                <Link href={t.href} className={`is-${t.tone}`}>
                  <i aria-hidden="true" />
                  <span>{t.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <nav className="gwin ornament" aria-label="Auf dem Schreibtisch">
        <Link href="/vitrine" className="gbtn">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20h16M6 20V9h4v11M14 20V4h4v16" />
          </svg>
          Vitrine · {earned} / {TROPHIES.length}
        </Link>
        <Link href="/fuhrpark" className="gbtn">
          {ride ? (
            // eslint-disable-next-line @next/next/no-img-element -- small static thumbnail
            <img src={`/boardroom/${ride.key}.webp`} alt="" />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="8" cy="15" r="4" />
              <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
            </svg>
          )}
          {ride ? `Schlüssel · ${ride.name}` : "Fuhrpark"}
        </Link>
        <Link href="/notizbuch" className="gbtn">
          Notizbuch · {desk.lessons} / {desk.lessonsTotal}
        </Link>
        <Link href="/netzwerk" className="gbtn">
          Netzwerk
        </Link>
        <Link href="/boerse" className="gbtn">
          {state.news.find((n) => n.month >= state.month - 1)?.title ?? state.market.headline}
        </Link>
      </nav>

      <section className="gwin" aria-labelledby="buero-title" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div>
          <div className="glbl">Büro</div>
          <h2 id="buero-title" style={{ margin: "2px 0 6px", fontSize: 18 }}>
            {office.name}
          </h2>
          <p className="glbl" style={{ margin: 0 }}>
            {office.rent > 0 ? `${eur(office.rent)} Miete im Monat. ` : "Keine Miete. "}
            {office.perks.join(". ")}.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {upgrade && (
              <ActionButton
                action={{ type: "moveOffice", level: upgrade.level }}
                revision={revision}
                size="sm"
                disabled={state.reputation < upgrade.reputation || worth < upgrade.worth || state.cash < upgrade.rent}
              >
                {`Umziehen: ${upgrade.name}`}
              </ActionButton>
            )}
            {office.level > 0 && (
              <ActionButton action={{ type: "moveOffice", level: office.level - 1 }} revision={revision} size="sm" variant="ghost">
                {`Kleiner ziehen: ${OFFICES[office.level - 1]!.name}`}
              </ActionButton>
            )}
          </div>
          {upgrade && (
            <p className="glbl" style={{ marginTop: 8 }}>
              Nächste Stufe braucht {upgrade.reputation} Ruf{upgrade.worth > 0 && ` und ${eur(upgrade.worth)} Vermögen`}. Umzug kostet eine Monatsmiete.
            </p>
          )}
        </div>
        <div>
          <div className="glbl">Karriere</div>
          <h2 style={{ margin: "2px 0 6px", fontSize: 18 }}>{career.title}</h2>
          {next && (
            <p className="glbl" style={{ margin: 0 }}>
              Nächster Schritt: {next.requirement}
            </p>
          )}
          <div className="career-line">
            {career.steps.map((s) => (
              <span key={s.title} className={s.done ? "is-done" : s === next ? "is-next" : undefined}>
                {s.title}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
