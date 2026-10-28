"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import {
  COCKPIT_RULES,
  DEFAULT_SORT,
  GROUP_HINT,
  GROUP_LABEL,
  SORT_KEYS,
  SORT_LABEL,
  groupRows,
  isSortKey,
  summarize,
  whenText,
  type CockpitRow,
  type Light,
  type SortKey,
} from "@/lib/game/cockpit-view";
import { eur, pct, runwayText, signed } from "@/components/game/format";
import { PACE_LABEL } from "./labels";

const STORAGE_KEY = "boardroom:portfolio-sort";
const CHANGE_EVENT = "boardroom:portfolio-sort-change";

const LIGHT_LABEL: Record<Light, string> = { green: "Grün", yellow: "Gelb", red: "Rot" };
const LIGHT_MARK: Record<Light, string> = { green: "✓", yellow: "!", red: "✕" };

function readSort(): SortKey {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isSortKey(v) ? v : DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Die zuletzt gewählte Sortierung bleibt im Browser; auf dem Server gilt „Handlungsbedarf“. */
function useSort(): [SortKey, (key: SortKey) => void] {
  const sort = useSyncExternalStore(subscribe, readSort, () => DEFAULT_SORT);
  const set = useCallback((key: SortKey) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* Speicher gesperrt: die Wahl gilt nur für diese Ansicht. */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [sort, set];
}

function Lamp({ light, reasons }: { light: Light; reasons: string[] }) {
  return (
    <span className={`cockpit-lamp cockpit-lamp--${light}`} role="img" aria-label={`Ampel ${LIGHT_LABEL[light]}: ${reasons.join(", ")}`} title={reasons.join("\n")}>
      <span aria-hidden="true">{LIGHT_MARK[light]}</span>
    </span>
  );
}

function Trend({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return null;
  const W = 56;
  const H = 22;
  const min = Math.min(...values);
  const span = Math.max(1, Math.max(...values) - min);
  const pts = values.map((v, i) => [2 + (i / (values.length - 1)) * (W - 8), H - 4 - ((v - min) / span) * (H - 8)] as const);
  const last = pts[pts.length - 1]!;
  return (
    <svg className="cockpit-spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      <path
        d={pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")}
        fill="none"
        stroke="var(--muted)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill={up ? "var(--agree)" : "var(--disagree)"} />
    </svg>
  );
}

interface Fact {
  label: string;
  value: string;
  sub?: string;
  tone?: Light;
}

function factsOf(r: CockpitRow): Fact[] {
  const f = r.facts;
  const t = r.tones;
  if (r.kind === "startup") {
    return [
      { label: "Runway", value: f.runway === null ? "verdient Geld" : runwayText(f.runway), sub: `Kasse ${eur(f.cash)}`, tone: t.runway },
      { label: "Umsatz/Monat", value: eur(f.revenue), sub: `Wachstum ${pct(f.growth)}`, tone: t.growth },
    ];
  }
  if (r.kind === "corporate") {
    return [
      { label: "Umsatz/Monat", value: eur(f.revenue), sub: `Wachstum ${pct(f.growth)}`, tone: t.growth },
      {
        label: "EBITDA-Marge",
        value: pct(f.margin),
        sub:
          f.leverage === null
            ? "keine Schulden"
            : Number.isFinite(f.leverage)
              ? `Schulden ${f.leverage.toLocaleString("de-DE", { maximumFractionDigits: 1 })}× EBITDA`
              : "Schulden ohne EBITDA",
        tone: t.margin,
      },
      { label: "Vergütung", value: `${eur(r.fee ?? 0)} / Monat` },
    ];
  }
  const x = (v: number) => `${v.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×`;
  const out: Fact[] = [{ label: "EBITDA/Jahr", value: eur(f.ebitda), sub: `Marge ${pct(f.margin)}`, tone: t.margin }];
  out.push({
    label: "Verschuldung",
    value: f.leverage === null || f.leverage < 0.05 ? "keine" : Number.isFinite(f.leverage) ? `${x(f.leverage)} EBITDA` : "ohne EBITDA",
    sub: f.limit === null ? undefined : `Grenze ${x(f.limit)}`,
    tone: t.leverage,
  });
  if (f.cover !== null) out.push({ label: "Zinsdeckung", value: f.cover > 99 ? "über 99×" : x(f.cover), tone: t.cover });
  return out;
}

function Row({ r }: { r: CockpitRow }) {
  const facts = factsOf(r);
  const [first, ...rest] = r.actions;
  const valueSub =
    r.kind === "corporate"
      ? "kein Anteil"
      : `${r.stake.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %${r.fundPct > 0 ? ` · Fonds ${r.fundPct.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %` : ""}`;
  return (
    <li>
      <Link href={`/firma/${r.id}`} className={`cockpit-row cockpit-row--${r.light}`}>
        <Lamp light={r.light} reasons={r.reasons} />
        <span className="cockpit-main">
          <span className="cockpit-name">
            <b>{r.name}</b>
            <span className="pill">{r.tag}</span>
            {r.pace && <span className={`pill pill--pace-${r.pace}`}>{PACE_LABEL[r.pace]}</span>}
          </span>
          <span className={`cockpit-reason cockpit-reason--${r.light}`}>
            {r.reason}
            {r.reasons.length > 1 && <span className="muted"> · +{r.reasons.length - 1}</span>}
          </span>
          <span className="cockpit-tag">{r.tagline}</span>
        </span>
        <span className="cockpit-cell cockpit-val">
          <small>{r.kind === "corporate" ? "Firmenwert" : "Dein Anteil"}</small>
          <b>{eur(r.kind === "corporate" ? r.companyValue : r.value)}</b>
          <span className="cockpit-sub">{valueSub}</span>
        </span>
        <span className="cockpit-cell cockpit-chg">
          <small>Zum Vormonat</small>
          <span className="cockpit-chg__row">
            <Trend values={r.trend} up={(r.change ?? 0) >= 0} />
            <b className={r.change === null ? "" : r.change >= 0 ? "is-up" : "is-down"}>{r.change === null ? "–" : signed(Math.round(r.change * 1000) / 10, " %")}</b>
          </span>
        </span>
        <span className="cockpit-facts">
          {facts.map((f) => (
            <span key={f.label} className={`cockpit-cell cockpit-fact${f.tone && f.tone !== "green" ? ` is-${f.tone}` : ""}`}>
              <small>{f.label}</small>
              <b>{f.value}</b>
              {f.sub && <span className="cockpit-sub">{f.sub}</span>}
            </span>
          ))}
        </span>
        <span className="cockpit-cell cockpit-next">
          <small>Nächster Termin</small>
          {r.next ? (
            <>
              <b>{r.next.text}</b>
              <span className="cockpit-sub">{whenText(r.next)}</span>
            </>
          ) : (
            <b className="muted">–</b>
          )}
        </span>
        <span className={`cockpit-cell cockpit-todo${first ? "" : " cockpit-todo--empty"}`}>
          <small>Handlungsbedarf</small>
          {first ? (
            <span className="cockpit-todo__list">
              <span className="company-card__alert" title={r.actions.join(", ")}>
                {first}
              </span>
              {rest.length > 0 && <span className="cockpit-sub">+{rest.length} weitere</span>}
            </span>
          ) : (
            <b className="muted">–</b>
          )}
        </span>
      </Link>
    </li>
  );
}

export function PortfolioCockpit({ rows }: { rows: CockpitRow[] }) {
  const [sort, setSort] = useSort();
  const sum = summarize(rows);
  const groups = groupRows(rows, sort);
  const R = COCKPIT_RULES;
  const m = (v: number) => `${Math.round(v * 100)} %`;
  return (
    <div className="cockpit">
      <div className="cockpit-sum" role="group" aria-label="Summe über alle Beteiligungen">
        <div className="cockpit-sum__item">
          <small>Gesamtwert deiner Anteile</small>
          <b>{eur(sum.value)}</b>
          {sum.change !== null && <span className={sum.change >= 0 ? "is-up" : "is-down"}>{signed(Math.round(sum.change * 1000) / 10, " %")} zum Vormonat</span>}
        </div>
        <div className="cockpit-sum__item">
          <small>{sum.count === 1 ? "1 Beteiligung" : `${sum.count} Beteiligungen`}</small>
          <span className="cockpit-sum__lights">
            <span className="cockpit-count cockpit-count--green">
              <i aria-hidden="true">✓</i>
              <b>{sum.green}</b> grün
            </span>
            <span className="cockpit-count cockpit-count--yellow">
              <i aria-hidden="true">!</i>
              <b>{sum.yellow}</b> gelb
            </span>
            <span className="cockpit-count cockpit-count--red">
              <i aria-hidden="true">✕</i>
              <b>{sum.red}</b> rot
            </span>
          </span>
        </div>
        <div className="cockpit-sum__item">
          <small>Wartet auf dich</small>
          <b>{sum.needing === 0 ? "nichts" : sum.needing === 1 ? "1 Firma" : `${sum.needing} Firmen`}</b>
        </div>
      </div>

      <div className="cockpit-tools">
        <span className="cockpit-tools__label" id="cockpit-sort-label">
          Sortieren nach
        </span>
        <div className="cockpit-seg" role="group" aria-labelledby="cockpit-sort-label">
          {SORT_KEYS.map((k) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}>
              {SORT_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {groups.map((g) => {
        const value = g.rows.reduce((s, r) => s + r.value, 0);
        return (
          <section key={g.group} className="cockpit-group" aria-label={GROUP_LABEL[g.group]}>
            <h2 className="section-title cockpit-group__title">
              {GROUP_LABEL[g.group]}
              <span className="muted">
                {" "}
                · {g.rows.length} {g.rows.length === 1 ? "Firma" : "Firmen"}
                {value > 0 ? ` · ${eur(value)}` : ""}
              </span>
            </h2>
            <p className="cockpit-group__hint">{GROUP_HINT[g.group]}</p>
            <ul className="cockpit-list">
              {g.rows.map((r) => (
                <Row key={r.id} r={r} />
              ))}
            </ul>
          </section>
        );
      })}

      <details className="cockpit-legend">
        <summary>So liest du die Ampel</summary>
        <p>Jede Firmenart hat eigene Schwellen. Die schlechteste Prüfung bestimmt die Farbe.</p>
        <dl>
          <dt>Startups</dt>
          <dd>
            Rot bei Runway unter {R.startup.runwayRed} Monaten (so lange reicht die Kasse bei heutigem Verlust) oder Kasse im Minus, gelb unter {R.startup.runwayYellow} Monaten.
            Gelb auch bei schrumpfendem Umsatz, einem Kunden mit über {m(R.startup.topCustomerYellow)} Umsatzanteil oder schlechter Stimmung im Team.
          </dd>
          <dt>Familienbetriebe und Plattformen</dt>
          <dd>
            EBITDA-Marge (Gewinn vor Zinsen und Steuern im Verhältnis zum Umsatz): rot unter {m(R.buyout.marginRed)}, gelb unter {m(R.buyout.marginYellow)}. Verschuldung: rot über
            der Covenant-Grenze der Bank, gelb im letzten Zehntel davor oder nach einem Bruch. Zinsdeckung (EBITDA geteilt durch die Jahreszinsen): rot unter{" "}
            {R.buyout.coverRed.toLocaleString("de-DE")}×, gelb unter {R.buyout.coverYellow.toLocaleString("de-DE")}×. Rot auch, wenn die Bank frisches Eigenkapital verlangt.
          </dd>
          <dt>Aufsichtsrat im Konzern</dt>
          <dd>
            Die Kasse ist groß, entscheidend sind Marge (rot unter {m(R.corporate.marginRed)}, gelb unter {m(R.corporate.marginYellow)}), Schulden (rot ab {R.corporate.leverageRed}
            × EBITDA, gelb ab {R.corporate.leverageYellow}×), Umsatzentwicklung und die Stimmung der Belegschaft.
          </dd>
        </dl>
      </details>
    </div>
  );
}
