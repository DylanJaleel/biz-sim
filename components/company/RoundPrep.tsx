"use client";

import { useState } from "react";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { monthLabel } from "@/lib/game/config";
import type { RoundPrepView } from "@/lib/game/round-prep";
import type { RoundAmbition } from "@/lib/game/types";
import type { VentureCheck } from "@/lib/game/venture";
import { PITCH_DAYS, PREP_DAYS } from "@/lib/game/venture-config";

// Die nächste Finanzierungsrunde aktiv angehen: Ziele der Runde mit Fortschritt,
// Zeitplan und Bewertungsvorstellung setzen, Investoren ansprechen. Schlanke
// Ansicht über roundPrepView; die Regeln stehen in lib/game/round-prep.ts.

const percent = (v: number) => `${Math.round(v * 100)} %`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)} %`;

export function GoalProgress({ checks, title }: { checks: VentureCheck[]; title: string }) {
  const done = checks.filter((c) => c.score >= 0.999).length;
  return (
    <div className="rprep__goals">
      <h3 className="venture__sub">
        {title}{" "}
        <small className="muted">
          · {done} von {checks.length} erreicht
        </small>
      </h3>
      <ul className="venture__checks">
        {checks.map((c) => (
          <li key={c.id} className={c.score >= 0.999 ? "is-done" : ""}>
            <span>
              <b>
                {c.score >= 0.999 ? "✓ " : ""}
                {c.label}
              </b>{" "}
              <small className="muted">
                {c.value} · Ziel {c.target}
              </small>
            </span>
            <span className="meter" aria-label={`${Math.round(c.score * 100)} % des Ziels`}>
              <i style={{ width: `${Math.round(c.score * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoundPrep({ view, startupId, revision, month }: { view: RoundPrepView; startupId: string; revision: number; month: number }) {
  const [months, setMonths] = useState(6);
  const [ambition, setAmbition] = useState<RoundAmbition>("market");
  const roundPossible = typeof view.target === "number" && !view.prep;
  const [ipo, setIpo] = useState(view.target === "ipo");
  const wantsIpo = view.prep ? view.prep.target === "ipo" : ipo || !roundPossible;
  const checks = !view.prep && wantsIpo ? view.ipo.checks : view.checks;
  const blocker = wantsIpo && !view.prep ? view.ipo.blocker : view.blocker;
  const title = wantsIpo ? "Börsengang" : view.label;
  const theme = wantsIpo ? view.ipo.theme : view.theme;
  const text = wantsIpo ? view.ipo.text : view.text;
  const prep = view.prep;
  const tooBusy = view.daysLeft < PREP_DAYS;

  return (
    <section className="rprep" aria-labelledby="rprep-title">
      <p className="eyebrow">{prep ? "Runde in Vorbereitung" : "Runde vorbereiten"}</p>
      <h3 id="rprep-title" className="rprep__title">
        {title}: {theme}
      </h3>
      <p className="small muted">{text}</p>

      {!prep && roundPossible && view.ipo.possible && (
        <div className="segmented" role="group" aria-label="Ziel">
          <button type="button" aria-pressed={!ipo} onClick={() => setIpo(false)}>
            {view.label}
          </button>
          <button type="button" aria-pressed={ipo} onClick={() => setIpo(true)}>
            Börsengang
          </button>
        </div>
      )}

      <GoalProgress checks={checks} title="Fortschritt zu den Zielen" />

      {prep ? (
        <PrepRunning view={view} startupId={startupId} revision={revision} month={month} />
      ) : blocker ? (
        <p className="small rprep__blocker">{blocker}</p>
      ) : (
        <div className="rprep__form">
          <div className="rprep__field">
            <span className="small muted">Zeitplan: Wann gehst du zu den Investoren?</span>
            <div className="segmented" role="group" aria-label="Zeitplan">
              {view.months.map((o) => (
                <button key={o.value} type="button" aria-pressed={months === o.value} onClick={() => setMonths(o.value)} title={o.text}>
                  {o.label}
                </button>
              ))}
            </div>
            <small className="muted">{view.months.find((o) => o.value === months)?.text}</small>
          </div>
          <div className="rprep__field">
            <span className="small muted">Bewertungsvorstellung</span>
            <div className="segmented" role="group" aria-label="Bewertungsvorstellung">
              {view.ambitions.map((o) => (
                <button key={o.value} type="button" aria-pressed={ambition === o.value} onClick={() => setAmbition(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
            <small className="muted">{view.ambitions.find((o) => o.value === ambition)?.text}</small>
          </div>
          {!wantsIpo && view.price && (
            <p className="small">
              Marktpreis heute: {eur(view.price.low)} bis {eur(view.price.high)} nach dem Geld, etwa {eur(view.price.amount)} neues Geld für {percent(view.price.dilution)} der
              Firma.
            </p>
          )}
          <p className="small">
            Chance heute: <b>{percent(wantsIpo ? view.ipo.chance : view.chance.base)}</b>. Jeder Pitch bringt etwas dazu, ein warmes Intro mehr.
          </p>
          <ActionButton
            action={{ type: "ventureRound", startupId, move: "prepare", months, ambition, ...(wantsIpo ? { ipo: true } : {}) }}
            revision={revision}
            variant="primary"
            size="sm"
            days={PREP_DAYS}
            disabled={tooBusy}
          >
            {wantsIpo ? "Börsengang vorbereiten" : `${view.label} vorbereiten`}
          </ActionButton>
        </div>
      )}
    </section>
  );
}

function PrepRunning({ view, startupId, revision, month }: { view: RoundPrepView; startupId: string; revision: number; month: number }) {
  const prep = view.prep!;
  const left = Math.max(0, prep.due - month);
  const full = prep.pitched.length >= view.investors.max;
  return (
    <div className="rprep__running">
      <div className="rprep__kpis">
        <span>
          <small>Geht an Investoren</small>
          <b>{monthLabel(prep.due)}</b>
          <small className="muted">{left === 0 ? "diesen Monat" : left === 1 ? "in 1 Monat" : `in ${left} Monaten`}</small>
        </span>
        <span>
          <small>Bewertung</small>
          <b>{prep.ambitionLabel}</b>
        </span>
        <span>
          <small>Chance</small>
          <b>{percent(view.chance.total)}</b>
          <small className="muted">
            Basis {percent(view.chance.base)}
            {view.chance.bonus.total !== 0 ? `, Vorbereitung ${signed(view.chance.bonus.total)}` : ""}
          </small>
        </span>
      </div>
      <h3 className="venture__sub">
        {view.investors.group} ansprechen{" "}
        <small className="muted">
          · {prep.pitched.length} von {view.investors.max}
        </small>
      </h3>
      <ul className="rprep__investors">
        {view.investors.names.map((inv) => (
          <li key={inv.name} className={inv.pitched ? "is-pitched" : ""}>
            <b>{inv.name}</b>
            {inv.pitched ? (
              <span className="tag tag--go">Gepitcht</span>
            ) : (
              <ActionButton
                action={{ type: "ventureRound", startupId, move: "pitch", investor: inv.index }}
                revision={revision}
                size="sm"
                variant="ghost"
                days={PITCH_DAYS}
                disabled={full || view.daysLeft < PITCH_DAYS}
              >
                Pitchen
              </ActionButton>
            )}
          </li>
        ))}
      </ul>
      <p className="small muted">Wer gepitcht wurde und die Zahlen mag, schickt ein eigenes Term Sheet. Das stärkt dich in der Verhandlung.</p>
      <div className="rprep__row">
        {view.intro.done ? (
          <span className="small">Warmes Intro über {view.intro.name}: erledigt.</span>
        ) : (
          <>
            <ActionButton action={{ type: "ventureRound", startupId, move: "intro" }} revision={revision} size="sm" disabled={!view.intro.possible}>
              Intro über {view.intro.name}
            </ActionButton>
            {view.intro.reason && <small className="muted">{view.intro.reason}</small>}
          </>
        )}
        <ActionButton action={{ type: "ventureRound", startupId, move: "cancel" }} revision={revision} size="sm" variant="ghost">
          Vorbereitung abbrechen
        </ActionButton>
      </div>
    </div>
  );
}
