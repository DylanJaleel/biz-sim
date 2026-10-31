import type { WaterfallSplit } from "@/lib/game/funds";
import { eur } from "@/components/game/format";

// Der Wasserfall des ganzen Fonds (europäisch) als Balken: Wohin fließt jeder
// Euro, der aus den Beteiligungen zurückkommt? Zwei Marken zeigen, was schon
// ausgeschüttet ist und was mit dem heutigen Wert der Beteiligungen dazukäme.

export function Waterfall({ split, returned, total, carryPaid }: { split: WaterfallSplit; returned: number; total: number; carryPaid: number }) {
  const { marks } = split;
  const max = Math.max(total * 1.1, marks.catchUp * 1.25, marks.capital * 1.6, 1);
  const at = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const width = (a: number, b: number) => `${Math.max(0, Math.min(100, ((Math.min(b, max) - Math.min(a, max)) / max) * 100))}%`;
  const steps = [
    { id: "capital", label: "1. Kapital zurück", text: "Alles, was die Investoren eingezahlt haben (Investitionen und Gebühren).", lp: split.capital, gp: 0, end: marks.capital },
    { id: "hurdle", label: "2. Hurdle", text: "8 % im Jahr auf das Kapital, das noch im Fonds steckt.", lp: split.hurdle, gp: 0, end: marks.hurdle },
    { id: "catchup", label: "3. Catch-up", text: "Alles an dich, bis du 20 % des Gewinns hast.", lp: 0, gp: split.catchUp, end: marks.catchUp },
    { id: "split", label: "4. Danach 80 zu 20", text: "Jeder weitere Euro: 80 % Investoren, 20 % du.", lp: split.restLp, gp: split.restGp, end: max },
  ];
  return (
    <figure className="wf">
      <figcaption className="wf__cap">Wasserfall für den ganzen Fonds: Was fließt an wen?</figcaption>
      <div className="wf__bar" role="img" aria-label={`Ausgeschüttet ${eur(returned)}, mit heutigem Wert ${eur(total)}. Dein Carry darauf: ${eur(split.gp)}.`}>
        <span className="wf__seg wf__seg--capital" style={{ left: 0, width: width(0, marks.capital) }} />
        <span className="wf__seg wf__seg--hurdle" style={{ left: at(marks.capital), width: width(marks.capital, marks.hurdle) }} />
        <span className="wf__seg wf__seg--catchup" style={{ left: at(marks.hurdle), width: width(marks.hurdle, marks.catchUp) }} />
        <span className="wf__seg wf__seg--split" style={{ left: at(marks.catchUp), width: width(marks.catchUp, max) }} />
        <span className="wf__mark wf__mark--paid" style={{ left: at(returned) }}>
          <small>ausgeschüttet</small>
        </span>
        <span className="wf__mark wf__mark--value" style={{ left: at(total) }}>
          <small>mit heutigem Wert</small>
        </span>
      </div>
      <ol className="wf__steps">
        {steps.map((s) => (
          <li key={s.id} className={`wf__step wf__step--${s.id}`}>
            <i aria-hidden="true" />
            <span>
              <b>{s.label}</b>
              <small className="muted">
                {s.text} {s.id !== "split" ? `Bis ${eur(s.end)}.` : ""}
              </small>
            </span>
            <span className="wf__amt">
              {s.lp > 0 && <small>Investoren {eur(s.lp)}</small>}
              {s.gp > 0 && <small className="wf__gp">du {eur(s.gp)}</small>}
            </span>
          </li>
        ))}
      </ol>
      <p className="muted small">
        Mit dem heutigen Wert stünden dir {eur(split.gp)} Carry zu, gezahlt sind {eur(carryPaid)}. Carry fließt erst, wenn wirklich verkauft wird.
      </p>
    </figure>
  );
}
