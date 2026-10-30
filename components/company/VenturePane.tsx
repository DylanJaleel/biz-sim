import type { GameState, Startup } from "@/lib/game/types";
import { monthLabel } from "@/lib/game/config";
import { ventureView } from "@/lib/game/venture";
import { PAPER_CAP, PAPER_CREDIT } from "@/lib/game/venture-config";
import { eur, pct } from "@/components/game/format";

// Der Wachstumspfad einer jungen Firma: sechs Stufen bis zum Unicorn, was die
// Investoren sehen wollen, die Chance auf die nächste Runde und der Unterschied
// zwischen Papierwert und dem, was davon heute zu deinem Vermögen zählt.

const big = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Mrd. €` : `${Math.round(v / 1_000_000).toLocaleString("de-DE")} Mio. €`;

export function VenturePane({ state, s }: { state: GameState; s: Startup }) {
  const v = ventureView(state, s);
  if (!v.eligible) return null;
  const onPath = s.venture !== undefined;
  const unicorn = v.unicorn !== undefined;
  return (
    <section className={`panel venture${unicorn ? " venture--unicorn" : ""}`} aria-labelledby="venture-title" data-pane="wachstum">
      <p className="eyebrow">Wachstumspfad</p>
      <h2 id="venture-title" className="panel__title">
        {unicorn
          ? `${s.name} ist ein Unicorn`
          : onPath
            ? v.ended !== undefined
              ? "Der Weg nach oben ist vorerst zu Ende"
              : `Nächste Stufe: ${v.stages[v.stage + 1]?.label ?? "–"}`
            : "Noch nicht auf dem Radar"}
      </h2>
      {unicorn && (
        <p className="venture__banner" role="status">
          <span aria-hidden="true">✦</span> Seit {monthLabel(v.unicorn!)} über eine Milliarde wert. Ein seltener Moment: Titelseite, goldener Tombstone, Ruf. Das Geld kommt erst
          mit Verkauf oder Börsengang.
        </p>
      )}
      <ol className="ladder" aria-label="Stufen bis zum Unicorn">
        {v.stages.map((st, i) => (
          <li key={st.label} className={`ladder__step${st.reached ? " is-reached" : ""}${st.current ? " is-current" : ""}${i === v.stages.length - 1 ? " ladder__step--top" : ""}`}>
            <b>{st.label}</b>
            <small>{big(st.post)}</small>
            {st.month !== undefined && st.reached && <small className="muted">{monthLabel(st.month)}</small>}
          </li>
        ))}
      </ol>
      {!onPath && (
        <p className="muted">
          Wachstumsinvestoren schauen ab {big(v.entry.value)} Bewertung und {pct(v.entry.growth)} Wachstum im Monat hin. Heute: {eur(v.fundamental)} und {pct(s.metrics.growth)}.
        </p>
      )}
      {onPath && (
        <div className="kpis kpis--compact venture__values">
          <span>
            <small>Papierwert der Firma</small>
            <b>{eur(v.paper)}</b>
          </span>
          <span>
            <small>Wert nach Zahlen</small>
            <b>{eur(v.fundamental)}</b>
          </span>
          <span>
            <small>Dein Anteil auf dem Papier</small>
            <b>{eur(v.stakePaper)}</b>
          </span>
          <span>
            <small>Zählt zu deinem Vermögen</small>
            <b>{eur(v.credited)}</b>
          </span>
        </div>
      )}
      {onPath && (
        <p className="muted small">
          Bis zum Verkauf oder Börsengang zählt vom Papiergewinn nur {Math.round(PAPER_CREDIT * 100)} %, höchstens {big(PAPER_CAP)}. Erst der Erlös zählt voll.
        </p>
      )}
      {!unicorn && v.ended === undefined && (
        <>
          <h3 className="venture__sub">Was die Investoren sehen wollen</h3>
          <ul className="venture__checks">
            {v.checks.map((c) => (
              <li key={c.id}>
                <span>
                  <b>{c.label}</b>{" "}
                  <small className="muted">
                    {c.value} · Ziel {c.target}
                  </small>
                </span>
                <span className="meter" aria-hidden="true">
                  <i style={{ width: `${Math.round(c.score * 100)}%` }} />
                </span>
              </li>
            ))}
          </ul>
          {onPath && (
            <p className="small">
              Chance auf die nächste Runde: <b>{Math.round(v.chance * 100)} %</b>
              {v.next !== undefined ? `, nächster Versuch ab ${monthLabel(v.next)}` : ""}. Bis zum Unicorn mit diesen Werten:{" "}
              <b>{(v.odds * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</b>.
            </p>
          )}
        </>
      )}
      {v.log.length > 0 && (
        <ul className="list venture__log">
          {v.log.map((l) => (
            <li key={`${l.month}-${l.stage}-${l.down ? "d" : "u"}`} className="list__row">
              <b>
                {monthLabel(l.month)} · {l.down ? "Down Round" : v.stages[l.stage]?.label}
              </b>
              <span className="muted">
                {l.down
                  ? `neue Bewertung ${big(l.post)}`
                  : l.amount === 0
                    ? `Seed-Niveau erreicht, bewertet mit ${eur(l.post)}`
                    : `${big(l.amount)} von ${l.lead}, bewertet mit ${big(l.post)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
