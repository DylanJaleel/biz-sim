"use client";

import { useState } from "react";
import Link from "next/link";
import type { DiligenceView, ExpertId } from "@/lib/game/diligence";
import { usePlay } from "@/components/game/usePlay";
import { eur } from "@/components/game/format";

// Die Prüfung am Tisch mit der CFO: links der Ablauf, in der Mitte der aktuelle
// Schritt mit Marie Lenz und den Leuten, die du holst, rechts die Befunde.
// Die Regeln stehen in lib/game/diligence.ts; hier wird nur angezeigt und gewählt.

const SEV = { high: "Hoch", mid: "Mittel", low: "Info", miss: "Übersehen" } as const;
const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)} T€` : n > 0 ? eur(n) : "intern");

export function DiligenceTable({ v, revision, back }: { v: DiligenceView; revision: number; back: { href: string; label: string } }) {
  const [picked, setPicked] = useState<ExpertId[]>([]);
  // Feedback of the step just played stays until "Nächster Schritt".
  const [seen, setSeen] = useState(v.done ? v.findings.length : v.findings.length - 1);
  const { play, pending, error } = usePlay(revision);
  const showLast = v.last && seen < v.findings.length;
  const toggle = (id: ExpertId) => setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const check = () =>
    play({ type: "diligence", startupId: v.id, picks: picked }, () => {
      setPicked([]);
      setSeen(v.findings.length);
    });
  const cost = picked.reduce((s, id) => s + (v.chips.find((c) => c.id === id)?.cost ?? 0), 0);
  const step = showLast ? v.findings.length : (v.current?.index ?? 0) + 1;
  return (
    <div className="ddc" data-mastery={v.mastery}>
      <div className="ddc__bg" aria-hidden="true" />
      <header className="ddc__head ddc-glass">
        <div>
          <span className="ddc-lbl">{v.lead}</span>
          <b>Due Diligence · {v.name}</b>
        </div>
        <div className="ddc__mastery" aria-label={`Erfahrung: ${v.masteryLabel}`}>
          <span className="ddc-lbl">Erfahrung</span>
          <span className="ddc__dots" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <i key={i} className={i < v.mastery ? "is-on" : undefined} />
            ))}
          </span>
          <b>{v.masteryLabel}</b>
        </div>
      </header>

      <aside className="ddc__rail ddc-glass" aria-label="Ablauf">
        <span className="ddc-lbl">Ablauf</span>
        <ol>
          {v.rail.map((r, i) => (
            <li key={r.name} className={`ddc-step ddc-step--${r.state}`}>
              <span className="ddc-num">{r.state === "done" ? "✓" : r.state === "missed" ? "!" : i + 1}</span>
              <span>
                <b>{r.hidden ? "· · ·" : r.name}</b>
                <small>{r.hidden ? "noch offen" : r.short}</small>
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <main className="ddc__main ddc-glass" aria-label="Aktueller Schritt">
        {showLast && v.last ? (
          <>
            <span className="ddc-lbl">Schritt {step} von 9</span>
            <h1>{v.last.name}</h1>
            <Chips v={v} picked={v.last.picks} need={v.last.need} />
            <div className="ddc__feedback ddc-pop">
              {v.last.feedback.map((f) => (
                <p key={f.who} className={`ddc-fb ddc-fb--${f.tone}`}>
                  <b>{f.who}</b>
                  <span>{f.text}</span>
                </p>
              ))}
              <p className="ddc-finding">
                <span className={`ddc-sev ddc-sev--${v.last.finding.sev}`}>{SEV[v.last.finding.sev]}</span>
                <span>
                  <b>Befund:</b> {v.last.finding.text}
                </span>
              </p>
            </div>
            <div className="ddc__grow" />
            <div className="ddc__bar">
              <span className="ddc-lbl">{v.last.feedback.some((f) => f.tone === "miss") ? "Das kostet dich später. Merk es dir für das nächste Mal." : "Gut besetzt."}</span>
              <button type="button" className="ddc-btn ddc-btn--go" onClick={() => setSeen(v.findings.length)}>
                {v.done ? "Zum Ergebnis" : "Nächster Schritt"}
              </button>
            </div>
          </>
        ) : v.done && v.summary ? (
          <Summary v={v} revision={revision} back={back} />
        ) : v.current ? (
          <>
            <span className="ddc-lbl">Schritt {v.current.index + 1} von 9</span>
            <h1>{v.current.name}</h1>
            <div className="ddc__cfo">
              <span className="ddc__avatar" aria-hidden="true">
                ML
              </span>
              <p className="ddc__say ddc-pop" key={v.current.index}>
                <b>Marie Lenz, CFO</b>
                {v.current.say}
              </p>
            </div>
            <div>
              <p className="ddc__ask">{v.current.ask}</p>
              <div className="ddc__chips">
                {v.chips.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`ddc-who${picked.includes(c.id) ? " ddc-who--on" : ""}`}
                    aria-pressed={picked.includes(c.id)}
                    onClick={() => toggle(c.id)}
                  >
                    {c.name}
                    <small>{k(c.cost)}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="ddc__grow" />
            {error && <p className="ddc-error">{error}</p>}
            <div className="ddc__bar">
              <span className="ddc-lbl">
                {!v.started
                  ? `Der Auftakt kostet ${v.startDays} Tag, der Bericht einen weiteren. ${v.kind === "startup" ? "Die Berater zahlt die Runde aus der Kasse der Firma." : "Die Berater zahlst du."}`
                  : v.kind === "startup"
                    ? "Alle Kosten trägt die Runde. Unnötige Berater kosten trotzdem."
                    : "Unnötige Berater kosten trotzdem."}
                {picked.length > 0 ? ` Diese Runde: ${eur(cost)}.` : ""}
              </span>
              <button type="button" className="ddc-btn ddc-btn--go" onClick={check} disabled={picked.length === 0 || pending}>
                An den Tisch holen
              </button>
            </div>
          </>
        ) : null}
      </main>

      <aside className="ddc__found ddc-glass" aria-label="Befunde">
        <div className="ddc__foundhead">
          <b>Befunde</b>
          <span className="ddc-lbl">
            {v.findings.length} {v.findings.length === 1 ? "Befund" : "Befunde"}
          </span>
        </div>
        <div className="ddc__tiles">
          <div>
            <span className="ddc-lbl">Berater-Kosten</span>
            <b>{eur(v.cost)}</b>
          </div>
          <div>
            <span className="ddc-lbl">Deine Tage</span>
            <b>
              {v.days} {v.days === 1 ? "Tag" : "Tage"}
            </b>
          </div>
        </div>
        <ul>
          {v.findings.map((f, i) => (
            <li key={`${f.step}-${i}`} className="ddc-finding ddc-pop">
              <span className={`ddc-sev ddc-sev--${f.sev}`}>{SEV[f.sev]}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
        {v.findings.length === 0 && <p className="ddc-lbl">Noch nichts gefunden. Jeder Schritt kann etwas aufdecken, das den Preis oder die Bedingungen ändert.</p>}
        <Link className="ddc-btn ddc__back" href={back.href}>
          ← {back.label}
        </Link>
      </aside>
    </div>
  );
}

function Chips({ v, picked, need }: { v: DiligenceView; picked: ExpertId[]; need: ExpertId[] }) {
  return (
    <div className="ddc__chips" aria-label="Wer am Tisch saß">
      {v.chips.map((c) => {
        const got = picked.includes(c.id);
        const want = need.includes(c.id);
        const cls = want && got ? "ok" : got ? "extra" : want ? "miss" : "idle";
        return (
          <span key={c.id} className={`ddc-who ddc-who--${cls}`}>
            {c.name}
            <small>{k(c.cost)}</small>
          </span>
        );
      })}
    </div>
  );
}

function Summary({ v, revision, back }: { v: DiligenceView; revision: number; back: { href: string; label: string } }) {
  const s = v.summary!;
  const { play, pending } = usePlay(revision);
  return (
    <>
      <span className="ddc-lbl">Prüfung abgeschlossen</span>
      <h1>{s.missed === 0 ? "Nichts übersehen" : `${s.missed} ${s.missed === 1 ? "Punkt" : "Punkte"} übersehen`}</h1>
      <p className="ddc__text">
        {s.missed === 0
          ? "Du gehst mit einem niedrigeren Preis und klaren Bedingungen in den Vertrag. Genau dafür ist die Prüfung da."
          : s.startup
            ? "Was übersehen wurde, taucht nach dem Einstieg wieder auf, als Krise auf der Tagesordnung des Beirats."
            : "Was übersehen wurde, trifft dich nach dem Kauf: als Nachzahlung, verlorener Kunde oder niedrigeres EBITDA."}
      </p>
      <div className="ddc__tiles ddc__tiles--3">
        <div>
          <span className="ddc-lbl">{s.startup ? "Bewertung vorher" : "Gefordert"}</span>
          <b>{eur(s.priceBefore)}</b>
        </div>
        <div>
          <span className="ddc-lbl">{s.startup ? "Bewertung nachher" : "Preis nach Prüfung"}</span>
          <b className={s.priceAfter < s.priceBefore ? "ddc-pos" : undefined}>{eur(s.priceAfter)}</b>
        </div>
        <div>
          <span className="ddc-lbl">Übersehen</span>
          <b className={s.missed ? "ddc-neg" : "ddc-pos"}>{s.missed}</b>
        </div>
      </div>
      <div className="ddc__note">
        <b>{s.pain === "exact" ? "Schmerzgrenze aufgedeckt" : s.pain === "range" ? "Schmerzgrenze eingegrenzt" : "Schmerzgrenze bleibt verdeckt"}</b>
        {s.pain === "exact"
          ? " Die Prüfung war lückenlos: Du kennst den niedrigsten Preis, zu dem die Gegenseite verkauft. Er liegt am Verhandlungstisch offen."
          : s.pain === "range"
            ? " Finanzen und Bericht waren sauber: Am Verhandlungstisch siehst du eine Spanne für den niedrigsten Preis der Gegenseite."
            : " Ohne saubere Finanzprüfung und Bericht weißt du nicht, wie weit die Gegenseite gehen würde. Ein M&A-Berater aus deinem Netzwerk kann helfen."}
      </div>
      <div className="ddc__note ddc__note--lesson">
        <b>Lernkarte im Notizbuch: Ablauf einer Due Diligence.</b> Beim nächsten Mal fragt Marie dich nur noch nach dem Nötigsten, beim dritten Mal führst du allein.
      </div>
      <div className="ddc__grow" />
      <div className="ddc__bar">
        <Link className="ddc-btn ddc-btn--go" href={back.href}>
          {back.label}
        </Link>
        <button type="button" className="ddc-btn" disabled={pending} onClick={() => play({ type: "diligence", startupId: v.id, restart: true })}>
          Noch einmal prüfen
        </button>
      </div>
    </>
  );
}
