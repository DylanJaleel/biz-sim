import Link from "next/link";
import { currentGame } from "@/lib/current-game";
import { RESALE, VEHICLES, vehicleBlocker, garageUpkeep, type VehicleDef } from "@/lib/game/travel";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import { sceneStyle } from "@/components/glass/Tomb";
import { Expander } from "@/components/ui/Expander";

// Der Fuhrpark: Was auf dem Schreibtisch als Schlüssel liegt, bestimmt, wie du
// zu deinen Aufträgen kommst. Schnelle Autos sparen Reisetage, der Fahrer
// lässt dich unterwegs arbeiten, der Jet macht Eindruck. Alles kostet Unterhalt.

const SPEED = (v: VehicleDef) => (v.kind === "jet" ? "sehr schnell" : v.fast ? "schnell" : "normal");
const IMPRESS = ["–", "+", "++", "+++"];
const KIND: Record<VehicleDef["kind"], string> = { car: "Autos", chauffeur: "Mit Fahrer", jet: "Fliegen" };

export async function Garage() {
  const { state, revision } = await currentGame();
  const owned = new Set(state.garage);
  const upkeep = garageUpkeep(state);
  const groups = (["car", "chauffeur", "jet"] as const).map((kind) => ({ kind, items: VEHICLES.filter((v) => v.kind === kind) }));
  return (
    <div className="glass-page">
      <div className="glass-scene" style={sceneStyle("tisch-ablage")} aria-hidden="true" />
      <header className="gwin garage__head">
        <div>
          <div className="glbl">Auf deinem Schreibtisch</div>
          <h1 className="garage__title" style={{ margin: "4px 0 6px", font: "700 clamp(26px, 3vw, 34px)/1.1 var(--font-body)", letterSpacing: "-0.02em" }}>
            Fuhrpark
          </h1>
          <p className="glbl garage__lead" style={{ margin: 0, maxWidth: "58ch" }}>
            Wie du zu deinen Aufträgen kommst, ändert, wie gut sie laufen. Im Zug arbeitest du unterwegs, ein schneller Wagen spart den Reisetag, mit Fahrer kommst du vorbereitet
            und ausgeruht an, der Jet macht Eindruck. Die Bahncard hast du immer dabei.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span className="gchip">
              {/* eslint-disable-next-line @next/next/no-img-element -- small static thumbnail */}
              <img src="/boardroom/key-bahn.webp" alt="" width={26} height={26} style={{ borderRadius: 8, objectFit: "cover" }} />
              <span className="glbl">Bahncard</span> <b>immer dabei</b>
            </span>
            <span className="gchip">
              <span className="glbl">Konto</span> <b>{eur(state.cash)}</b>
            </span>
            <span className="gchip">
              <span className="glbl">Unterhalt im Monat</span> <b>{eur(upkeep)}</b>
            </span>
            <Link href="/" className="gbtn">
              Zum Schreibtisch
            </Link>
          </div>
        </div>
        <div className="garage__tray">
          {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-sized WebP */}
          <img src="/boardroom/tisch-ablage.webp" alt="Ablage mit Schlüsseln und Karten auf dem Schreibtisch" />
        </div>
      </header>

      {groups.map((g) => (
        <section key={g.kind} className="gwin" aria-labelledby={`fp-${g.kind}`}>
          <h2 id={`fp-${g.kind}`} style={{ margin: "0 0 14px", fontSize: 18 }}>
            {KIND[g.kind]}
          </h2>
          <Expander count={g.items.filter((v) => !owned.has(v.id) && vehicleBlocker(state, v) !== null).length} noun="noch nicht verfügbar">
            <div className="garage__grid">
              {g.items.map((v) => {
                const has = owned.has(v.id);
                const blocker = has ? null : vehicleBlocker(state, v);
                return (
                  <article key={v.id} className={`gcard ride${has ? " is-owned" : ""}${blocker !== null ? " is-secondary" : ""}`}>
                    <div className="ride__img">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-sized WebP */}
                      <img src={`/boardroom/${v.image}.webp`} alt={v.name} loading="lazy" decoding="async" />
                    </div>
                    <div className="ride__top" style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                      <b style={{ fontSize: 15 }}>{v.name}</b>
                      {has ? <span className="gpill gpill--normal">Deins</span> : <span className="money">{v.price > 0 ? eur(v.price) : "Anstellen"}</span>}
                    </div>
                    <p className="glbl ride__text" style={{ margin: 0, lineHeight: 1.45 }}>
                      {v.text}
                    </p>
                    <div className="ride__stats">
                      <div>
                        <span className="glbl">Tempo</span>
                        <b>{SPEED(v)}</b>
                      </div>
                      <div>
                        <span className="glbl">Eindruck</span>
                        <b>{IMPRESS[v.impress]}</b>
                      </div>
                      <div>
                        <span className="glbl">Unterhalt</span>
                        <b>{v.upkeep > 0 ? eur(v.upkeep) : "–"}</b>
                      </div>
                    </div>
                    <span className="glbl ride__trip">
                      Pro Fahrt {eur(v.trip.national)} innerhalb Deutschlands
                      {v.kind !== "car" ? ", man arbeitet unterwegs" : ""}.
                    </span>
                    <div className="ride__buy">
                      {has ? (
                        <ActionButton action={{ type: "sellVehicle", vehicleId: v.id }} revision={revision} size="sm" variant="ghost">
                          {v.price > 0 ? `Verkaufen für ${eur(Math.round(v.price * RESALE))}` : "Kündigen"}
                        </ActionButton>
                      ) : (
                        <>
                          <ActionButton action={{ type: "buyVehicle", vehicleId: v.id }} revision={revision} size="sm" disabled={blocker !== null}>
                            {v.price > 0 ? "Kaufen" : "Fahrer anstellen"}
                          </ActionButton>
                          {blocker && <span className="glbl">{blocker}</span>}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </Expander>
        </section>
      ))}
    </div>
  );
}
