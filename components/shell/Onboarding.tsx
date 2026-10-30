"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { saveOnboardingAction } from "@/app/(app)/actions";
import { START_CASH, START_REPUTATION } from "@/lib/game/config";
import { UNLOCKS, type Unlock } from "@/lib/game/onboarding";
import { placeCard, spotBox, type Box, type Placement } from "./tour-layout";

// Die Einführung: acht kurze Schritte, jeweils mit hervorgehobenem Element. Sie liegt als
// modaler Dialog über der Seite (Fokus-Falle, Esc überspringt). Der Fortschritt bleibt im
// Browser (sessionStorage); geschrieben wird nur einmal, beim Beenden oder Überspringen.

interface Step {
  title: string;
  text: string;
  /** Selektoren des Ziels; das erste sichtbare gilt. Ohne Treffer erscheint eine Karte in der Mitte. */
  target?: string[];
  extra?: "stats" | "lamps" | "ladder";
}

const EUR = START_CASH.toLocaleString("de-DE");

const STEPS: Step[] = [
  {
    title: "Willkommen bei Boardroom",
    text: `Du startest als Privatinvestor mit ${EUR} € und Ruf ${START_REPUTATION}. Dein Ziel: vom Business Angel zum Investment-Mogul. Du steigst bei Firmen ein, sitzt in ihrem Beirat und lernst dabei, wie Firmen wirklich funktionieren. Die Tour dauert etwa zwei Minuten.`,
  },
  {
    title: "Die Kopfleiste",
    text: "Hier siehst du immer, wo du stehst. Auf kleinen Geräten zeigt ein Tipp auf den Pfeil alle Werte.",
    target: [".topbar .tbs"],
    extra: "stats",
  },
  {
    title: "Dein Büro",
    text: "Der Schreibtisch ist dein Startpunkt. Hier laufen Aufgaben, offene Tagesordnungen, Post, Portfolio und bezahlte Aufträge zusammen. Am Anfang bringen kleine Aufträge das erste Geld.",
    target: [".cockpit", ".office .desk"],
  },
  {
    title: "Post",
    text: "Hier kommen die Angebote an. Startups bieten dir eine erste Beteiligung an. Lies das Angebot, prüfe die Firma und entscheide, ob du einsteigst. Auch Anfragen und Nachrichten landen hier.",
    target: [".topbar__nav a[href='/post']"],
  },
  {
    title: "Portfolio",
    text: "Hier liegen deine Beteiligungen als Cockpit. Jede Firma hat eine Ampel, damit du auf einen Blick siehst, wo du hinschauen musst. Offene Vorlagen im Beirat erscheinen als Zahl am Eintrag.",
    target: [".topbar__nav a[href='/portfolio']"],
    extra: "lamps",
  },
  {
    title: "Menü",
    text: "Alles Weitere liegt im Menü: Börse, Netzwerk, Kalender, Notizbuch und mehr. Die Suche findet jeden Bereich, die Taste M öffnet das Menü von überall. Gesperrte Bereiche zeigen, ab welchem Ruf sie aufgehen.",
    target: [".topbar .tb-menu"],
  },
  {
    title: "Monat abschließen",
    text: "Hast du deine Tage genutzt, schließt du den Monat ab. Die Firmen arbeiten weiter, übrige Tage verfallen. Der Monatsüberblick zeigt dir danach, was sich verändert hat und was im nächsten Monat ansteht.",
    target: [".topbar .topbar__close"],
  },
  {
    title: "Was später kommt",
    text: "Dein Ruf schaltet nach und nach Neues frei. Sobald etwas aufgeht, bekommst du einen kurzen Hinweis. Diese Tour findest du jederzeit im Menü unter Wissen, Eintrag Einführung.",
    extra: "ladder",
  },
];

const FACTS: [string, string][] = [
  ["Monat", "Jeder Monat ist eine Runde."],
  ["Tage frei", "Dein Zeitbudget: Prüfungen, Sitzungen und Reisen kosten Tage."],
  ["Privatkapital", "Dein Geld auf dem Konto."],
  ["Vermögen", "Konto plus Wert deiner Beteiligungen."],
  ["Ruf", "Schaltet neue Möglichkeiten frei."],
];

const KEY = "bz-tour-step";

function readStep(): number {
  try {
    const n = Number(window.sessionStorage.getItem(KEY));
    return Number.isInteger(n) && n >= 0 && n < STEPS.length ? n : 0;
  } catch {
    return 0;
  }
}

function keepStep(n: number | null) {
  try {
    if (n === null) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, String(n));
  } catch {
    /* ohne Speicher startet die Tour nach dem Neuladen eben vorn */
  }
}

function findTarget(selectors: string[] | undefined): HTMLElement | null {
  for (const sel of selectors ?? []) {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== "hidden") return el;
    }
  }
  return null;
}

function same(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return Math.abs(a.left - b.left) < 1 && Math.abs(a.top - b.top) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
}

// Ob die Tour offen ist und wo sie steht, liegt außerhalb von React: Menü, Konto-Seite und
// Automatikstart stoßen sie nur an.
interface TourState {
  open: boolean;
  step: number;
}
const CLOSED: TourState = { open: false, step: 0 };
let tourState: TourState = CLOSED;
const listeners = new Set<() => void>();
const tour = {
  get: () => tourState,
  server: () => CLOSED,
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  set(next: TourState) {
    tourState = next;
    listeners.forEach((l) => l());
  },
};

interface Props {
  /** Neues Spiel (Monat 1, nicht beendet): die Tour startet beim ersten Besuch des Büros von selbst. */
  autoStart: boolean;
  reputation: number;
  /** Freischaltungen, die erreicht und noch nicht quittiert sind. */
  pending: string[];
}

export function Onboarding({ autoStart, reputation, pending }: Props) {
  const path = usePathname();
  const router = useRouter();
  const { open, step } = useSyncExternalStore(tour.subscribe, tour.get, tour.server);
  const [, save] = useTransition();
  const started = useRef(false);
  const [hidden, setHidden] = useState<string[]>([]);

  const begin = useCallback((from: number) => tour.set({ open: true, step: from }), []);

  // Neues Spiel: beim ersten Besuch des Büros starten, nach einem Neuladen am letzten Schritt weitermachen.
  useEffect(() => {
    if (!autoStart || started.current || path !== "/") return;
    started.current = true;
    begin(readStep());
  }, [autoStart, path, begin]);

  // „Einführung“ im Menü oder auf der Konto-Seite: Seite /einfuehrung leitet ins Büro und startet vorn.
  useEffect(() => {
    if (path !== "/einfuehrung") return;
    started.current = true;
    keepStep(0);
    begin(0);
    router.replace("/");
  }, [path, router, begin]);

  const finish = useCallback(
    (last: number) => {
      tour.set(CLOSED);
      keepStep(null);
      save(async () => {
        await saveOnboardingAction({ done: true, step: last });
      });
    },
    [save],
  );

  const unlocks = UNLOCKS.filter((u) => pending.includes(u.id) && !hidden.includes(u.id));
  const dismissUnlocks = () => {
    const ids = unlocks.map((u) => u.id);
    setHidden((h) => [...h, ...ids]);
    save(async () => {
      await saveOnboardingAction({ seen: ids });
    });
  };

  return (
    <>
      {open && <Tour step={step} reputation={reputation} onFinish={finish} />}
      {!open && unlocks.length > 0 && <UnlockHint unlocks={unlocks} onClose={dismissUnlocks} />}
    </>
  );
}

function Tour({ step, reputation, onFinish }: { step: number; reputation: number; onFinish: (last: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<Box | null>(null);
  const [place, setPlace] = useState<Placement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const titleId = useId();
  const textId = useId();
  const def = STEPS[step]!;
  const last = step === STEPS.length - 1;

  const go = useCallback((n: number) => {
    const next = Math.min(Math.max(n, 0), STEPS.length - 1);
    keepStep(next);
    tour.set({ open: true, step: next });
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Ziel suchen und mitführen: Layout kann sich ändern (Seite lädt nach, Drehen, Schrift).
  useEffect(() => {
    let alive = true;
    let scrolled = false;
    const measure = () => {
      if (!alive) return;
      setSize((v) => (v.width === window.innerWidth && v.height === window.innerHeight ? v : { width: window.innerWidth, height: window.innerHeight }));
      const el = findTarget(def.target);
      if (!el) {
        setTarget((t) => (t === null ? t : null));
        return;
      }
      let r = el.getBoundingClientRect();
      if (!scrolled && (r.top < 0 || r.bottom > window.innerHeight)) {
        scrolled = true;
        el.scrollIntoView({ block: "nearest" });
        r = el.getBoundingClientRect();
      }
      const box = { left: r.left, top: r.top, width: r.width, height: r.height };
      setTarget((t) => (same(t, box) ? t : box));
    };
    measure();
    const timer = window.setInterval(measure, 200);
    window.addEventListener("resize", measure);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
    };
  }, [def]);

  const spot = target && size.width > 0 ? spotBox(target, size) : null;

  useLayoutEffect(() => {
    const c = card.current;
    if (!c || size.width === 0) return;
    const next = placeCard(spot, { width: c.offsetWidth, height: c.offsetHeight }, size);
    setPlace((p) => (p && p.left === next.left && p.top === next.top && p.side === next.side && p.arrow === next.arrow ? p : next));
    // spot hängt nur an target und size
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, size, step]);

  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, [step]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onFinish(step);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      if (last) onFinish(step);
      else go(step + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(step - 1);
    } else if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON" && (e.target as HTMLElement).tagName !== "A") {
      e.preventDefault();
      if (last) onFinish(step);
      else go(step + 1);
    }
  };

  const style = place ? { left: place.left, top: place.top } : { left: 0, top: 0, visibility: "hidden" as const };
  return (
    <dialog
      ref={dialog}
      className="tour"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={textId}
      onCancel={(e) => {
        e.preventDefault();
        onFinish(step);
      }}
      onKeyDown={onKeyDown}
    >
      {spot ? (
        <div className="tour__spot" style={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }} aria-hidden="true" />
      ) : (
        <div className="tour__dim" aria-hidden="true" />
      )}
      <div ref={card} className={`tour__card${def.extra === "ladder" ? " tour__card--wide" : ""}`} style={style} data-side={place?.side ?? "none"}>
        {place && place.side !== "none" && (
          <span className="tour__arrow" data-side={place.side} style={{ "--tour-arrow": `${place.arrow}px` } as React.CSSProperties} aria-hidden="true" />
        )}
        <div className="tour__scroll">
          <p className="tour__count">
            Schritt {step + 1} von {STEPS.length}
          </p>
          <h2 id={titleId} className="tour__title">
            {def.title}
          </h2>
          <p id={textId} className="tour__text">
            {def.text}
          </p>
          {def.extra === "stats" && (
            <dl className="tour__facts">
              {FACTS.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {def.extra === "lamps" && (
            <ul className="tour__lamps" aria-label="Die Ampel">
              <li>
                <i className="tour__lamp tour__lamp--green" aria-hidden="true" />
                Grün: läuft gut
              </li>
              <li>
                <i className="tour__lamp tour__lamp--yellow" aria-hidden="true" />
                Gelb: genau hinschauen
              </li>
              <li>
                <i className="tour__lamp tour__lamp--red" aria-hidden="true" />
                Rot: jetzt handeln
              </li>
            </ul>
          )}
          {def.extra === "ladder" && (
            <ol className="tour__ladder" aria-label="Freischaltungen nach Ruf">
              <li className="is-now">
                <b>Ruf {reputation}</b>
                <span>Du bist hier</span>
              </li>
              {UNLOCKS.map((u) => (
                <li key={u.id} className={reputation >= u.reputation ? "is-done" : undefined}>
                  <b>Ruf {u.reputation}</b>
                  <span>{u.title}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="tour__foot">
          <div className="tour__dots" aria-hidden="true">
            {STEPS.map((_, i) => (
              <i key={i} className={i === step ? "is-on" : i < step ? "is-past" : undefined} />
            ))}
          </div>
          <div className="tour__buttons">
            {!last && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onFinish(step)}>
                Überspringen
              </button>
            )}
            {step > 0 && (
              <button type="button" className="btn btn--sm" onClick={() => go(step - 1)}>
                Zurück
              </button>
            )}
            <button ref={primary} type="button" className="btn btn--primary btn--sm" onClick={() => (last ? onFinish(step) : go(step + 1))}>
              {last ? "Los geht’s" : step === 0 ? "Tour starten" : "Weiter"}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/** Kleiner, einmaliger Hinweis, wenn der Ruf etwas Neues freischaltet. */
function UnlockHint({ unlocks, onClose }: { unlocks: Unlock[]; onClose: () => void }) {
  const first = unlocks[0]!;
  return (
    <aside className="unlock" role="status" aria-live="polite">
      <p className="unlock__eyebrow">Neu freigeschaltet</p>
      <h2 className="unlock__title">{first.title}</h2>
      <p className="unlock__text">
        Du hast Ruf {first.reputation} erreicht. {first.text}
      </p>
      {unlocks.length > 1 && (
        <p className="unlock__more">
          Dazu:{" "}
          {unlocks
            .slice(1)
            .map((u) => `${u.title} (Ruf ${u.reputation})`)
            .join(", ")}
          .
        </p>
      )}
      <div className="unlock__actions">
        <Link href={first.href} className="btn btn--sm" onClick={onClose}>
          Ansehen
        </Link>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
          Verstanden
        </button>
      </div>
    </aside>
  );
}
