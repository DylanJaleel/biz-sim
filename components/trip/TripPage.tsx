import Link from "next/link";
import { daysLeft } from "@/lib/game/engine";
import { approachesFor, boldChance, BRIEF, cityOf, clientImage, travelOptions } from "@/lib/game/travel";
import { currentGame } from "@/lib/current-game";
import { eur } from "@/components/game/format";
import { sceneStyle } from "@/components/glass/Tomb";
import { TripPlanner } from "./TripPlanner";

// Ein Auftrag mit Anreise: wählen, wie du hinkommst, kurz unterwegs sein,
// beim Kunden ankommen und entscheiden, wie du die Aufgabe angehst.

export async function TripPage({ params }: { params: Promise<{ gigId: string }> }) {
  const { gigId } = await params;
  const { state, revision } = await currentGame();
  const gig = state.gigs.find((g) => g.id === gigId);
  const city = gig ? cityOf(gig) : null;

  if (!gig || !city || gig.status === "expired") {
    return (
      <div className="glass-page">
        <div className="glass-scene" style={sceneStyle("reise-lounge")} aria-hidden="true" />
        <section className="gwin onsite">
          <h1 style={{ margin: 0 }}>Dieser Auftrag ist nicht mehr zu haben</h1>
          <p className="glbl">Aufträge gelten nur im Monat, in dem sie angefragt werden.</p>
          <Link href="/" className="gbtn">
            Zum Schreibtisch
          </Link>
        </section>
      </div>
    );
  }

  if (gig.status === "booked") {
    const t = gig.trip;
    return (
      <div className="glass-page">
        <div className="glass-scene" style={sceneStyle(clientImage(gig))} aria-hidden="true" />
        <section className="gwin onsite" aria-labelledby="trip-result">
          <div className="glbl">
            {gig.title} bei {gig.client} · {city.name}
          </div>
          <h1 id="trip-result" style={{ margin: 0, fontSize: 28 }}>
            {t ? t.head : "Gebucht"}
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "rgba(245,245,247,.86)" }}>{t ? t.text : "Der Auftrag ist gebucht. Bezahlt wird am Monatsende."}</p>
          <div className="result-stats">
            <div>
              <span className="glbl">Honorar am Monatsende</span>
              <b className="money">{eur(gig.fee)}</b>
            </div>
            <div>
              <span className="glbl">Anreise</span>
              <b>{t ? `−${eur(t.travelCost)}` : "–"}</b>
            </div>
            <div>
              <span className="glbl">Tage</span>
              <b>{gig.days}</b>
            </div>
            <div>
              <span className="glbl">Ruf</span>
              <b style={{ color: (t?.reputation ?? 0) < 0 ? "var(--g-bad)" : "var(--g-money)" }}>
                {(() => {
                  const r = (gig.reputation ?? 0) + (t?.reputation ?? 0);
                  return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : "±0";
                })()}
              </b>
            </div>
          </div>
          {t && (
            <p className="glbl" style={{ margin: 0 }}>
              Angereist mit: {t.travelName}. Angebotenes Honorar: {eur(t.offeredFee)}.
            </p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/" className="gbtn gbtn--go">
              Zum Schreibtisch
            </Link>
            <Link href="/fuhrpark" className="gbtn">
              Fuhrpark
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const options = travelOptions(state, gig).map((o) => ({ ...o, chance: Math.round(boldChance(o) * 100) }));
  return (
    <TripPlanner
      revision={revision}
      gig={{ id: gig.id, title: gig.title, client: gig.client, text: gig.text, days: gig.days, fee: gig.fee, contact: !!gig.contactId }}
      city={{ name: city.name, km: city.km, distance: city.distance }}
      options={options}
      approaches={approachesFor(gig)}
      brief={BRIEF[gig.kind] ?? gig.text}
      client={clientImage(gig)}
      daysLeft={daysLeft(state)}
      cash={state.cash}
    />
  );
}
