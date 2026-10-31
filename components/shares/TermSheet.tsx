"use client";

import { ActionButton } from "@/components/game/ActionButton";
import type { TermSheetView } from "@/lib/game/round-prep";
import { NEGOTIATE_DAYS } from "@/lib/game/venture-config";

// Das Term Sheet einer Wachstumsrunde: Bedingungen und die drei Hebel der
// Verhandlung. Reine Darstellung von termSheetView, damit sie später in eine
// Verhandlungsszene eingesetzt werden kann.

export function TermSheet({ view, startupId, revision, lead }: { view: TermSheetView; startupId: string; revision: number; lead: string }) {
  const { terms } = view;
  return (
    <section className="panel tsheet" aria-labelledby="tsheet-title">
      <p className="eyebrow">Term Sheet · {view.investorKind}</p>
      <h2 id="tsheet-title" className="panel__title">
        Bedingungen von {lead}
      </h2>
      <ul className="tsheet__terms">
        <li>
          <small>Liquidationspräferenz</small>
          <b className={terms.pref > 1 ? "warn" : ""}>{terms.pref.toLocaleString("de-DE")}×</b>
        </li>
        <li>
          <small>Sitz im Beirat</small>
          <b>{terms.seat ? "Ja" : "Nein"}</b>
        </li>
        <li>
          <small>Weitere Term Sheets</small>
          <b>{terms.rivals}</b>
        </li>
      </ul>
      {view.canNegotiate ? (
        <ul className="list tsheet__levers">
          {view.levers
            .filter((l) => l.open || terms.asked.includes(l.lever))
            .map((l) => (
              <li key={l.lever} className="list__row">
                <span>
                  <b>{l.label}</b>
                  <small className="muted"> {l.text}</small>
                </span>
                {terms.asked.includes(l.lever) ? (
                  <span className="tag">Verhandelt</span>
                ) : (
                  <ActionButton action={{ type: "ventureRound", startupId, move: "negotiate", lever: l.lever }} revision={revision} size="sm" days={NEGOTIATE_DAYS}>
                    Fordern · {Math.round(l.chance * 100)} %
                  </ActionButton>
                )}
              </li>
            ))}
        </ul>
      ) : (
        view.reason && <p className="small muted">{view.reason}</p>
      )}
      {terms.log && terms.log.length > 0 && (
        <ol className="tsheet__log">
          {terms.log.map((t, i) => (
            <li key={i} className="small">
              {t}
            </li>
          ))}
        </ol>
      )}
      <p className="choice__hint">
        Eine Präferenz von 1× heißt: Bei einem Verkauf bekommt der neue Investor zuerst sein Geld zurück, danach wird nach Anteilen geteilt. Bei 1,5× bekommt er zuerst das
        Anderthalbfache. Bei Börsengängen spielt sie keine Rolle.
      </p>
    </section>
  );
}
