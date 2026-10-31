import type { ReactNode } from "react";
import { eur } from "@/components/game/format";
import { MOOD_LABEL, moodKey, moodValue, type MoodKey } from "@/lib/game/negotiation";

// Der Verhandlungstisch: Blick über den eigenen Schreibtisch, ohne Monitor. Gegenüber sitzt die
// Gegenseite als gezeichnete Figur, deren Miene der Stimmung folgt. Auf dem Tisch liegen die
// Papiere (Angebot, Gegenangebot), daneben die Schmerzgrenze, solange sie bekannt ist.
// Die Komponente zeigt nur an und kennt keine Spielregeln.

export interface DeskPaper {
  title: string;
  lines: { label: string; value: string }[];
  note?: string;
}

export interface NegotiationDeskProps {
  /** Wer gegenüber sitzt. */
  name: string;
  role?: string;
  /** Aussehen der Figur: Inhaber im Ruhestandsalter oder Manager einer Gruppe. */
  look?: "senior" | "exec";
  /** Stimmung von 0 bis 100. */
  mood: number;
  /** Einigung erzielt: die Gegenseite ist erleichtert. */
  relieved?: boolean;
  /** Die Gegenseite ist gegangen. */
  gone?: boolean;
  /** Bereits gespielte Runden, Gesamtzahl der Runden und ob eine davon Bonus für gute Laune ist. */
  played: number;
  rounds: number;
  bonusRound?: boolean;
  /** Was die Gegenseite zuletzt gesagt hat. */
  bubble?: string;
  /** Papiere auf dem Tisch. */
  offer?: DeskPaper;
  counter?: DeskPaper;
  /** Schmerzgrenze der Gegenseite; null oder fehlend: verdeckt. */
  painThreshold?: number | null;
  painLabel?: string;
  /** Hinweis, wie man die Schmerzgrenze erfährt, solange sie verdeckt ist. */
  painHint?: string;
  formatPain?: (value: number) => string;
  /** Platz unter dem Tisch für eigene Inhalte. */
  children?: ReactNode;
}

/** Ein Satz der Gegenseite je Stimmung, wenn die Seite keinen eigenen kennt. */
export const MOOD_LINE: Record<MoodKey, string> = {
  pleased: "„Das gefällt mir. Wir sind noch nicht am Ende, aber ich nehme mir gern die Zeit.“",
  relieved: "„Gut, dass wir uns einig sind. Das hat mir Sorgen genommen.“",
  neutral: "„Ich höre zu. Überzeugen Sie mich mit Zahlen.“",
  skeptical: "„So weit sind wir noch nicht. Da müssen Sie nachlegen.“",
  angry: "„Das ist nicht ernst gemeint. Noch so ein Angebot, und ich stehe auf.“",
};

const FACE: Record<MoodKey, { browL: string; browR: string; mouth: string; blush: boolean; closed: boolean }> = {
  pleased: { browL: "M45 46.5 Q50.5 43.5 56 45.5", browR: "M64 45.5 Q69.5 43.5 75 46.5", mouth: "M51 70 Q60 79 69 70", blush: true, closed: false },
  relieved: { browL: "M45 47.5 L56 44.5", browR: "M64 44.5 L75 47.5", mouth: "M52 71 Q60 76 68 71", blush: true, closed: true },
  neutral: { browL: "M45 46 L56 46.5", browR: "M64 46.5 L75 46", mouth: "M53 71.5 L67 71.5", blush: false, closed: false },
  skeptical: { browL: "M45 43.5 Q50 41.5 56 44", browR: "M64 47 L75 49", mouth: "M53 72.5 Q58 70 67 73.5", blush: false, closed: false },
  angry: { browL: "M45 44 L56 49", browR: "M64 49 L75 44", mouth: "M52 74 Q60 67.5 68 74", blush: false, closed: false },
};

function Face({ name, look, mood }: { name: string; look: "senior" | "exec"; mood: MoodKey }) {
  const f = FACE[mood];
  const senior = look === "senior";
  const hair = senior ? "#c9ccd2" : "#2b2420";
  const brow = senior ? "#8d939c" : "#1d1815";
  return (
    <svg className="nd__face" viewBox="0 0 120 120" role="img" aria-label={`${name}, ${MOOD_LABEL[mood]}`}>
      <rect width="120" height="120" fill={senior ? "#3b4049" : "#2c3a52"} />
      <path d="M10 124 C 14 94, 36 86, 60 86 C 84 86, 106 94, 110 124 Z" fill={senior ? "#2a2e36" : "#1a2231"} />
      <path d="M49 86 L60 101 L71 86 Z" fill="#e8ebf0" />
      <path d="M57.5 90 L60 106 L62.5 90 Z" fill={senior ? "#7a2b2b" : "#27406b"} />
      <rect x="52" y="72" width="16" height="15" rx="5" fill="#d6a17c" />
      <ellipse cx="38.5" cy="56" rx="3.6" ry="6.2" fill="#d6a17c" />
      <ellipse cx="81.5" cy="56" rx="3.6" ry="6.2" fill="#d6a17c" />
      <ellipse cx="60" cy="54" rx="21" ry="25" fill="#e5b48f" />
      {senior ? (
        <path d="M39 51 C 37 31, 50 26, 60 27 C 72 26, 84 32, 81 51 C 79 43, 76 39, 72 37 C 64 40, 52 40, 45 38 C 42 42, 40 46, 39 51 Z" fill={hair} />
      ) : (
        <path d="M39 50 C 37 30, 50 25, 60 26 C 72 25, 84 30, 81 50 C 79 42, 75 37, 70 35 C 62 38, 52 38, 47 35 C 43 40, 40 45, 39 50 Z" fill={hair} />
      )}
      <g key={mood} className="nd__mimic">
        {f.blush && (
          <g fill="#e58f86" opacity="0.45">
            <circle cx="46" cy="64" r="3.6" />
            <circle cx="74" cy="64" r="3.6" />
          </g>
        )}
        <path d={f.browL} stroke={brow} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d={f.browR} stroke={brow} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {f.closed ? (
          <g fill="none" stroke="#1f2228" strokeWidth="1.6" strokeLinecap="round">
            <path d="M47 55.5 Q50.5 58.5 54 55.5" />
            <path d="M66 55.5 Q69.5 58.5 73 55.5" />
          </g>
        ) : (
          <g fill="#1f2228">
            <circle cx="50.5" cy="54.5" r="1.7" />
            <circle cx="69.5" cy="54.5" r="1.7" />
          </g>
        )}
        {senior && (
          <g fill="none" stroke="#2a2d33" strokeWidth="1.6">
            <rect x="44" y="50" width="13" height="9.5" rx="3" />
            <rect x="63" y="50" width="13" height="9.5" rx="3" />
            <path d="M57 54 H63" />
          </g>
        )}
        <path d="M60 57 L58 65 L61.5 65" fill="none" stroke="#c48f6c" strokeWidth="1.4" strokeLinecap="round" />
        <path d={f.mouth} fill="none" stroke="#7d4a3a" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Paper({ paper, side }: { paper: DeskPaper; side: "his" | "mine" }) {
  return (
    <div className={`nd__paper nd__paper--${side}`}>
      <h4>{paper.title}</h4>
      {paper.lines.map((l) => (
        <p key={l.label}>
          <span>{l.label}</span>
          <b>{l.value}</b>
        </p>
      ))}
      {paper.note && <small>{paper.note}</small>}
    </div>
  );
}

export function NegotiationDesk(props: NegotiationDeskProps) {
  const { name, role, look = "senior", relieved = false, gone = false, played, rounds, bonusRound = false, bubble, offer, counter, painThreshold, formatPain = eur } = props;
  const mood = moodValue(props.mood);
  const key = moodKey(mood, relieved);
  const known = typeof painThreshold === "number" && Number.isFinite(painThreshold);
  const current = Math.min(played + 1, rounds);
  return (
    <section className={`nd${gone ? " is-gone" : ""}`} data-mood={key} aria-label={`Verhandlungstisch mit ${name}`}>
      <div className="nd__bg" aria-hidden="true" />
      <div className="nd__top">
        <div className="nd__who">
          <Face name={name} look={look} mood={key} />
          <div className="nd__id">
            <b>{name}</b>
            {role && <span>{role}</span>}
            <span className="nd__mood" aria-live="polite">
              <i className="nd__bar" aria-hidden="true">
                <i style={{ width: `${mood}%` }} />
              </i>
              <em>
                {gone ? "ist gegangen" : MOOD_LABEL[key]} · {mood}
              </em>
            </span>
          </div>
        </div>
        {bubble && <p className="nd__bubble">{bubble}</p>}
        <p className="nd__rounds" aria-label={`Runde ${current} von ${rounds}`}>
          <span className="nd__roundlabel">
            Runde {current} von {rounds}
          </span>
          {Array.from({ length: rounds }, (_, i) => (
            <i key={i} className={i < played ? "is-done" : i === played ? "is-now" : undefined} data-bonus={bonusRound && i === rounds - 1 ? "" : undefined}>
              {i + 1}
            </i>
          ))}
          {bonusRound && <small>Gute Laune: eine Runde mehr</small>}
        </p>
      </div>
      <div className="nd__desk">
        {offer && <Paper paper={offer} side="his" />}
        {counter && <Paper paper={counter} side="mine" />}
        <div className={`nd__pain${known ? " is-known" : ""}`}>
          <small>{props.painLabel ?? "Schmerzgrenze"}</small>
          {known ? (
            <b>{formatPain(painThreshold as number)}</b>
          ) : (
            <>
              <b className="nd__veil" aria-label="verdeckt">
                ▒▒▒▒▒ €
              </b>
              <span>{props.painHint ?? "verdeckt: Due Diligence oder ein Kontakt verrät sie"}</span>
            </>
          )}
        </div>
        <span className="nd__pen" aria-hidden="true" />
        {props.children}
      </div>
    </section>
  );
}
