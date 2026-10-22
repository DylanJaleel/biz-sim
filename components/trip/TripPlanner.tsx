"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TravelOption } from "@/lib/game/travel";
import type { GigApproach } from "@/lib/game/types";
import { usePlay } from "@/components/game/usePlay";
import { eur } from "@/components/game/format";
import { sceneStyle } from "@/components/glass/Tomb";

type Option = TravelOption & { chance: number };
type Step = "plan" | "travel" | "onsite";

interface Props {
  revision: number;
  gig: { id: string; title: string; client: string; text: string; days: number; fee: number; contact: boolean };
  city: { name: string; km: number; distance: string };
  options: Option[];
  approaches: { id: GigApproach; label: string; text: string }[];
  brief: string;
  client: string;
  daysLeft: number;
  cash: number;
}

const SCENE_MS = 2400;
const DISTANCE = { local: "In der Region", national: "Innerhalb Deutschlands", international: "Ins Ausland" } as const;

function preview(o: Option): string {
  return (o.scenes.find((s) => s.scene === "kabine") ?? o.scenes[0]!).image;
}

function chips(o: Option): { t: string; cls: string }[] {
  const out: { t: string; cls: string }[] = [];
  if (o.prep) out.push({ t: "Arbeiten unterwegs", cls: "tag-g tag-g--good" });
  out.push(o.rest ? { t: "Erholt", cls: "tag-g tag-g--good" } : { t: "Müde", cls: "tag-g tag-g--bad" });
  if (o.impress >= 3) out.push({ t: "Großer Auftritt", cls: "tag-g tag-g--good" });
  else if (o.impress >= 1) out.push({ t: "Guter Eindruck", cls: "tag-g tag-g--good" });
  out.push({ t: o.days === 0 ? "Kein Reisetag" : "+1 Reisetag", cls: o.days === 0 ? "tag-g tag-g--good" : "tag-g" });
  return out;
}

export function TripPlanner({ revision, gig, city, options, approaches, brief, client, daysLeft, cash }: Props) {
  const usable = options.filter((o) => !o.locked);
  const [step, setStep] = useState<Step>("plan");
  const [pick, setPick] = useState(usable[0]!.id);
  const [scene, setScene] = useState(0);
  const { play, pending, error } = usePlay(revision);
  const chosen = options.find((o) => o.id === pick)!;
  const minDays = gig.days + chosen.days - (gig.days >= 3 ? 1 : 0);
  const tooBusy = Math.max(1, minDays) > daysLeft;
  const tooPoor = chosen.cost > cash;

  useEffect(() => {
    if (step !== "travel") return;
    const timer = setTimeout(() => {
      if (scene < chosen.scenes.length - 1) setScene(scene + 1);
      else setStep("onsite");
    }, SCENE_MS);
    return () => clearTimeout(timer);
  }, [step, scene, chosen.scenes.length]);

  if (step === "travel") {
    const s = chosen.scenes[scene]!;
    return (
      <div className="glass-page journey" role="region" aria-label="Unterwegs">
        <div key={scene} className="journey__frame" style={{ ["--img" as string]: `url(/boardroom/${s.image}.webp)` }} />
        <div className="gwin journey__bar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="glbl">
              {chosen.name} · {chosen.duration}
            </div>
            <b style={{ fontSize: 16 }} aria-live="polite">
              {s.caption}
            </b>
          </div>
          <div className="journey__dots" aria-hidden="true">
            {chosen.scenes.map((_, i) => (
              <i key={i} className={i <= scene ? "is-on" : undefined} />
            ))}
          </div>
          <button type="button" className="gbtn" onClick={() => setStep("onsite")}>
            Überspringen
          </button>
        </div>
      </div>
    );
  }

  if (step === "onsite") {
    return (
      <div className="glass-page">
        <div className="glass-scene" style={sceneStyle(client)} aria-hidden="true" />
        <section className="gwin onsite" aria-labelledby="onsite-title">
          <div className="onsite__hero">
            {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-sized WebP */}
            <img src={`/boardroom/${client}.webp`} alt="" />
          </div>
          <div className="glbl">
            Vor Ort · {gig.client}, {city.name}
          </div>
          <h1 id="onsite-title" style={{ margin: 0, fontSize: "clamp(20px, 2.4vw, 26px)", lineHeight: 1.3 }}>
            {brief}
          </h1>
          <div className="tags">
            {chips(chosen)
              .filter((c) => !c.t.includes("Reisetag"))
              .map((c) => (
                <span key={c.t} className={c.cls}>
                  {c.t}
                </span>
              ))}
          </div>
          <p className="glbl" style={{ margin: 0 }}>
            Wie gehst du es an? Die Wahl entscheidet über Honorar, Tage und Ruf.
          </p>
          {approaches.map((a) => (
            <button key={a.id} type="button" className="approach" disabled={pending} onClick={() => play({ type: "gig", gigId: gig.id, travel: chosen.id, approach: a.id })}>
              <span>
                {a.label}
                <small>{a.text}</small>
              </span>
              <span className="tag-g">{a.id === "bold" ? `Chance ${chosen.chance} %` : a.id === "thorough" ? "+1 Tag" : gig.days >= 3 ? "−1 Tag" : "Sicher"}</span>
            </button>
          ))}
          {pending && <p className="glbl">Die Arbeit läuft…</p>}
          {error && (
            <p className="action__error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="glass-page">
      <div className="glass-scene" style={sceneStyle(preview(chosen))} aria-hidden="true" />
      <div className="trip">
        <section className="gwin" aria-labelledby="trip-title" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="glbl">
            {gig.client} · {city.name}
          </div>
          <h1 id="trip-title" style={{ margin: 0, font: "700 clamp(24px, 2.6vw, 30px)/1.15 var(--font-body)", letterSpacing: "-0.02em" }}>
            {gig.title}
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "rgba(245,245,247,.86)" }}>{gig.text}</p>
          <div className="trip__facts">
            <div>
              <span className="glbl">Honorar</span>
              <b className="money">{eur(gig.fee)}</b>
            </div>
            <div>
              <span className="glbl">Arbeit</span>
              <b>{gig.days === 1 ? "1 Tag" : `${gig.days} Tage`}</b>
            </div>
            <div>
              <span className="glbl">Weg</span>
              <b>{city.km} km</b>
            </div>
          </div>
          <div className="gcard trip__hint" style={{ background: "rgba(10,132,255,.14)", borderColor: "rgba(10,132,255,.35)", fontSize: 13, lineHeight: 1.5 }}>
            <b>Vor Ort entscheidest du, wie du den Auftrag angehst.</b> Wer unterwegs arbeiten konnte und ausgeruht ankommt, hat beim mutigen Weg bessere Karten. Ein großer
            Auftritt bringt etwas mehr Honorar.
          </div>
          <Link href="/" className="gbtn" style={{ alignSelf: "flex-start" }}>
            Zurück zum Schreibtisch
          </Link>
        </section>

        <section className="gwin" aria-labelledby="travel-title" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="glbl">Anreise · {DISTANCE[city.distance as keyof typeof DISTANCE] ?? ""}</div>
              <h2 id="travel-title" style={{ margin: "2px 0 0", fontSize: 22 }}>
                Wie kommst du nach {city.name}?
              </h2>
            </div>
            <Link href="/fuhrpark" className="glbl">
              Mehr im Fuhrpark
            </Link>
          </div>
          <div className="trip__options" role="radiogroup" aria-label="Anreise">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={o.id === pick}
                className={o.id === pick ? "topt is-on" : "topt"}
                disabled={!!o.locked}
                onClick={() => setPick(o.id)}
              >
                <span className="topt__img">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-sized WebP */}
                  <img src={`/boardroom/${preview(o)}.webp`} alt="" loading="lazy" decoding="async" />
                </span>
                <b style={{ fontSize: 14 }}>{o.name}</b>
                <span className="glbl">{o.locked ? o.locked : `${o.duration} · ${eur(o.cost)}`}</span>
                {!o.locked && (
                  <span className="tags">
                    {chips(o).map((c) => (
                      <span key={c.t} className={c.cls}>
                        {c.t}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            ))}
          </div>
          {tooBusy && <p className="action__error">Dafür fehlen dir diesen Monat Tage. Wähle eine schnellere Anreise oder lass den Auftrag liegen.</p>}
          {tooPoor && <p className="action__error">Für diese Anreise reicht das Konto nicht.</p>}
          <div className="trip__bar">
            <span className="glbl">
              {chosen.name}: {eur(chosen.cost)} sofort, {chosen.days === 0 ? "kein Reisetag" : "ein Reisetag"}. Mutiger Weg vor Ort: {chosen.chance} % Chance.
            </span>
            <button
              type="button"
              className="gbtn gbtn--go"
              disabled={tooBusy || tooPoor}
              onClick={() => {
                setScene(0);
                setStep("travel");
              }}
            >
              Losfahren
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
