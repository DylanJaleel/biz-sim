import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { leagueView } from "@/lib/game/rivals-views";

// Die League Table: wer im Mittelstand die meisten und größten Deals berät.
// Darunter die drei Rivalen dieses Spiels, sobald sie dich bemerkt haben.

const deals = (n: number) => (n === 1 ? "1 Deal" : `${n} Deals`);
const mio = (v: number) => `${v.toLocaleString("de-DE", { maximumFractionDigits: v >= 100 ? 0 : 1 })} Mio. €`;

export async function League({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { state } = await currentGame();
  const by = params.nach === "anzahl" ? "count" : "volume";
  const year = typeof params.jahr === "string" ? Number(params.jahr) : undefined;
  const v = leagueView(state, Number.isFinite(year) ? year : undefined, by);
  const href = (y: number, b: "volume" | "count") => `/rangliste?jahr=${y}${b === "count" ? "&nach=anzahl" : ""}`;
  const running = v.year === v.current && v.played < 12;
  return (
    <div className="page league">
      <header className="page__head">
        <p className="eyebrow">Wirtschaftsblatt · League Table</p>
        <h1 className="page__title">Rangliste der M&A-Berater</h1>
        <p className="page__lead">
          Wer hat im Mittelstand die meisten Verkäufe begleitet? Gezählt wird das Volumen, also die Summe der Unternehmenswerte, oder die Anzahl der Deals. Deine abgeschlossenen
          Mandate zählen mit.
        </p>
      </header>

      <section className="kpis" aria-label="Dein Stand">
        <div>
          <small>Dein Platz</small>
          <b>
            {v.me.rank} von {v.rows.length}
          </b>
          <span>{by === "volume" ? "nach Volumen" : "nach Anzahl"}</span>
        </div>
        <div>
          <small>Dein Volumen</small>
          <b>{mio(v.me.volume)}</b>
          <span>{deals(v.me.count)}</span>
        </div>
        <div>
          <small>Bis zum nächsten Platz</small>
          <b>{v.above ? (by === "volume" ? mio(v.above.gap) : deals(v.above.gap)) : "–"}</b>
          <span>{v.above ? `hinter ${v.above.name}` : "Du führst die Liste an."}</span>
        </div>
        <div>
          <small>Unter den ersten {v.top}</small>
          <b>mehr Anfragen</b>
          <span>gilt im Jahr darauf</span>
        </div>
      </section>

      <section className="panel" aria-labelledby="league-title">
        <div className="panel__row">
          <h2 id="league-title" className="panel__title">
            Jahr {v.year}
            {running ? ` · nach ${v.played} von 12 Monaten` : ""}
          </h2>
          <div className="league__tools">
            <nav className="segmented" aria-label="Jahr">
              {v.years.map((y) => (
                <Link key={y} href={href(y, by)} aria-current={y === v.year ? "page" : undefined} className={y === v.year ? "is-on" : undefined}>
                  {y === v.current ? "Dieses Jahr" : `Jahr ${y}`}
                </Link>
              ))}
            </nav>
            <nav className="segmented" aria-label="Sortierung">
              <Link href={href(v.year, "volume")} aria-current={by === "volume" ? "page" : undefined} className={by === "volume" ? "is-on" : undefined}>
                Volumen
              </Link>
              <Link href={href(v.year, "count")} aria-current={by === "count" ? "page" : undefined} className={by === "count" ? "is-on" : undefined}>
                Anzahl
              </Link>
            </nav>
          </div>
        </div>
        <ol className="league__table" aria-label={`Rangliste Jahr ${v.year}`}>
          {v.rows.map((r) => (
            <li key={r.id} className={`league__row${r.me ? " is-me" : ""}${r.rival ? " is-rival" : ""}`}>
              <span className="league__rank">{r.rank}</span>
              <span className="league__name">
                <b>{r.me ? "Du" : r.name}</b>
                {r.rival && <span className="chip chip--bad">Rivale</span>}
                <small>{r.city}</small>
              </span>
              <span className="league__value">
                {by === "volume" ? mio(r.volume) : deals(r.count)}
                <small>{by === "volume" ? deals(r.count) : mio(r.volume)}</small>
              </span>
              <span className={`league__move ${r.move === null || r.move === 0 ? "" : r.move > 0 ? "is-up" : "is-down"}`}>
                {r.move === null || r.move === 0 ? "–" : r.move > 0 ? `▲ ${r.move}` : `▼ ${-r.move}`}
                <span className="sr-only">{r.move === null ? "kein Vorjahr" : r.move > 0 ? "Plätze gestiegen" : r.move < 0 ? "Plätze gefallen" : "unverändert"}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="muted small">Pfeile: Plätze gegenüber dem Vorjahr. Große Mandate (Carve-outs ab Ruf 80 mit Family Office) bewegen das Volumen, viele kleine die Anzahl.</p>
      </section>

      {v.history.length > 0 && (
        <section className="panel" aria-labelledby="league-history">
          <h2 id="league-history" className="panel__title">
            Dein Weg
          </h2>
          <ul className="league__history">
            {v.history.map((h) => (
              <li key={h.year}>
                <small>Jahr {h.year}</small>
                <b>{h.rank === null ? "–" : `Platz ${h.rank}`}</b>
                <span>
                  {mio(h.volume / 1_000_000)} · {h.count} {h.count === 1 ? "Deal" : "Deals"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel" aria-labelledby="league-rivals">
        <h2 id="league-rivals" className="panel__title">
          Deine Rivalen
        </h2>
        {!v.rivalsIn ? (
          <p className="muted">
            Noch nimmt dich keiner der großen Häuser ernst. Ab {v.rivalReputation} Ruf bemerken dich drei Rivalen: Sie bieten auf dieselben Familienbetriebe und stehen mit dir in
            dieser Liste.
          </p>
        ) : (
          <ul className="league__rivals">
            {v.rivals.map((r) => (
              <li key={r.id} className="league__rival">
                <div className="league__rival-head">
                  <span className="league__avatar" aria-hidden="true">
                    {r.name
                      .split(/\s+/)
                      .filter((w) => /^[A-ZÄÖÜ]/.test(w))
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")}
                  </span>
                  <div>
                    <b>{r.name}</b>
                    <small>
                      {r.head} · {r.kind}, {r.city}
                    </small>
                  </div>
                </div>
                <p>{r.style}</p>
                <div className="league__chips">
                  {r.strengths.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                  <span className="chip">Platz {r.place ?? "–"}</span>
                </div>
                <p className="muted small">
                  Bietet mit: {r.terms}. Deine Bietgefechte gegen dieses Haus: {r.won} gewonnen, {r.lost} verloren.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="muted small">
        Lernkarten im <Link href="/notizbuch">Notizbuch</Link>: League Table, Bietgefecht, Teaser.
      </p>
    </div>
  );
}
