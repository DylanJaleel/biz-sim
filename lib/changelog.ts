import { BUYOUT_REPUTATION, CORPORATE_REPUTATION, FAMILY_OFFICE_REPUTATION, FUND_REPUTATION, REPUTATION_GAIN_STEPS } from "./game/config";
import { ESTATE_WORTH, KINDS } from "./game/estate";
import { netWorth } from "./game/engine";
import { FOUNDATION } from "./game/legacy";
import { BIG_MANDATE_REPUTATION } from "./game/mandate-big";
import { shouldAutoStartTour, UNLOCKS } from "./game/onboarding";
import { RIVAL_REPUTATION } from "./game/rivals";
import type { GameState, WhatsNewState } from "./game/types";
import { FUND_NEXT_INVESTED, STUDIO_EXITS, STUDIO_REPUTATION } from "./game/venture-config";

// „Das ist neu“: Was bei jedem Update dazugekommen ist. Neues Release IMMER OBEN eintragen
// (neueste zuerst, die id ist das Datum und muss sich als Text sortieren lassen: JJJJ-MM-TT, optional mit Zusatz wie 2026-10-31-fonds).
// Das Popup zeigt bestehenden Spielern beim ersten Öffnen alles, was sie noch nicht gesehen
// haben (höchstens die letzten drei Releases); neue Spiele sehen es nicht. Die Seite /neu zeigt
// die ganze Geschichte. Gespeichert wird nur die zuletzt gesehene id (state.whatsNew.seen).

export interface ReleaseItem {
  title: string;
  /** Ein bis zwei kurze Sätze. */
  text: string;
  /** Wohin „Ansehen“ führt; ohne Angabe gibt es keinen Knopf. */
  href?: string;
  /** Der Weg dorthin, z. B. „Menü › Investieren › Portfolio“. */
  where: string;
  /** Hinweis, ab wann es offen ist: Text wie „ab Ruf 75“, solange es gesperrt ist, sonst null. Ohne Funktion gibt es keinen Hinweis. */
  unlock?: (state: GameState) => string | null;
  /** Ganz neue Funktion (true) oder Verbesserung (false). */
  isNew: boolean;
}

export interface Release {
  id: string;
  /** Datum als JJJJ-MM-TT. */
  date: string;
  title: string;
  items: ReleaseItem[];
}

const mio = (n: number) => `${(n / 1_000_000).toLocaleString("de-DE")} Mio. €`;
const reputationLock = (needed: number) => (state: GameState) => (state.reputation >= needed ? null : `ab Ruf ${needed}`);
const unlockOf = (id: string) => {
  const u = UNLOCKS.find((x) => x.id === id);
  if (!u) throw new Error(`Unbekannte Freischaltung: ${id}`);
  return u.reputation;
};
const steps = REPUTATION_GAIN_STEPS;
const percent = (factor: number) => `${Math.round(factor * 100)} %`;

/** Neueste zuerst. */
export const RELEASES: Release[] = [
  {
    id: "2026-11-01-tisch",
    date: "2026-11-01",
    title: "Der Verhandlungstisch",
    items: [
      {
        title: "Verhandlungen am Schreibtisch",
        text: "Bei Großmandaten und im Bietgefecht sitzt du an deinem Schreibtisch, ohne Monitor. Gegenüber sitzt die Gegenseite als gezeichnete Figur, auf dem Tisch liegen Angebot und Gegenangebot.",
        href: "/nachfolge",
        where: "Menü › Unternehmen › Nachfolge & Übernahmen",
                isNew: true,
      },
      {
        title: "Mimik zeigt die Stimmung",
        text: "Die Gegenseite ist erfreut, sachlich, skeptisch, verärgert oder erleichtert. Wer gute Laune hat, gibt dir bei großen Mandaten eine Verhandlungsrunde mehr.",
        href: "/nachfolge",
        where: "Menü › Unternehmen › Nachfolge & Übernahmen",
        unlock: reputationLock(BIG_MANDATE_REPUTATION),
        isNew: false,
      },
      {
        title: "Schmerzgrenze nur, wenn sie bekannt ist",
        text: "Wie weit die Gegenseite höchstens geht, steht auf einem Schild am Tisch. Solange du es nicht weißt, bleibt es verdeckt.",
        where: "Menü › Unternehmen › Nachfolge & Übernahmen",
        isNew: false,
      },
    ],
  },
  {
    id: "2026-10-31-sitzung",
    date: "2026-10-31",
    title: "Bessere Beiratssitzungen",
    items: [
      {
        title: "Deine Prüfung in der Sitzung",
        text: "Hast du eine Vorlage vom CFO durchrechnen lassen, zeigt die Sitzung, welche Option am meisten bringt und mit welchem Wert. Ohne Prüfung verrät sie nichts.",
        where: "Menü › Investieren › Portfolio › Firma › Beiratssitzung",
        isNew: true,
      },
      {
        title: "Auflagen passend zum Thema",
        text: "Jede Vorlage gehört zu einem Themenfeld wie Finanzierung, Team oder Ausschüttung, mit drei eigenen Auflagen: etwa „Kreditrahmen mit Deckel“ oder „Mindestkasse halten“. Welche passt, folgt aus dem Risiko der Lage.",
        where: "Menü › Investieren › Portfolio › Firma › Auflagen",
        isNew: false,
      },
      {
        title: "Faire Note bei knappen Entscheidungen",
        text: "Liegen alle Optionen nah beieinander, gibt es die Note „Knapp“ statt „Schwach begründet“. Ruf und Vertrauen bewegen sich dann kaum. Der erwartete Wert zeigt nicht mehr bei allen Optionen 0 €.",
        where: "Menü › Investieren › Portfolio › Firma › Beiratssitzung",
        isNew: false,
      },
      {
        title: "Wachstum im Mittelstand als Jahreswert",
        text: "Nachfolge-Angebote und Familienbetriebe zeigen das Wachstum im Jahr. Die meisten wachsen leicht, einige stagnieren, wenige schrumpfen, mit dem Grund im Angebot.",
        href: "/post",
        where: "Menü › Unternehmen › Nachfolge & Übernahmen",
        isNew: false,
      },
    ],
  },
  {
    id: "2026-10-31-fonds",
    date: "2026-10-31",
    title: "Fonds II und III, Venture Studio, Unicorn",
    items: [
      {
        title: "Fonds II und III mit Investoren",
        text: `Ist dein Fonds zu ${Math.round(FUND_NEXT_INVESTED * 100)} % investiert, gehst du auf Roadshow: Investoren prüfen DPI und TVPI. Carry fließt über den Wasserfall des ganzen Fonds, der Investorenbeirat (LPAC) entscheidet Konflikte, Fristen und Gebühren.`,
        href: "/fonds",
        where: "Menü › Investieren › Fonds",
        unlock: (state) => (state.fund ? null : `ab Ruf ${FUND_REPUTATION} mit eigenem Fonds`),
        isNew: true,
      },
      {
        title: "Venture Studio",
        text: "Gründe eigene Firmen: Idee wählen, CEO holen, Geld in Tranchen an Meilensteinen freigeben. Bis zu zwei gleichzeitig, jede kostet Tage im Monat.",
        href: "/studio",
        where: "Menü › Investieren › Venture Studio",
        unlock: (state) =>
          state.reputation >= STUDIO_REPUTATION && state.exits.filter((e) => e.status === "accepted").length >= STUDIO_EXITS
            ? null
            : `ab Ruf ${STUDIO_REPUTATION} und ${STUDIO_EXITS} Verkäufen`,
        isNew: true,
      },
      {
        title: "Wachstum bis zum Unicorn",
        text: "Schnelle Firmen können Wachstumsrunden bis zur Milliarde holen. Der Papierwert zählt bis zum Verkauf nur zum Teil ins Vermögen; die Firmenseite zeigt beides unter „Wachstum“.",
        href: "/portfolio",
        where: "Menü › Investieren › Portfolio",
        isNew: true,
      },
    ],
  },
  {
    id: "2026-10-30",
    date: "2026-10-30",
    title: "Neues Menü, Rangliste, Immobilien und Stiftung",
    items: [
      {
        title: "Neues Menü, Kopfleiste und Einführung",
        text: "Die Kopfleiste zeigt das Wichtigste auf einen Blick, alles andere liegt im Menü (Taste M, mit Suche). Neue Spieler bekommen eine kurze Tour, die du jederzeit wiederholen kannst.",
        href: "/einfuehrung",
        where: "Kopfleiste › Menü › Wissen › Einführung",
        isNew: true,
      },
      {
        title: "Portfolio als Cockpit",
        text: "Jede Beteiligung hat eine Ampel, die Firmen sind nach Typ gruppiert (neu: Fonds), und deine Sortierung wird gemerkt.",
        href: "/portfolio",
        where: "Menü › Investieren › Portfolio",
        isNew: false,
      },
      {
        title: "Mittelstand: Wert aus zwölf Monaten EBITDA",
        text: "Die Bewertung stützt sich auf das EBITDA der letzten zwölf Monate; eine Erklärzeile zeigt, woraus der Wert besteht. Auf der Firmenseite gibt es fünf Hebel zum Eingreifen.",
        href: "/portfolio",
        where: "Menü › Investieren › Portfolio › Firma › Was den Wert treibt",
        unlock: reputationLock(BUYOUT_REPUTATION),
        isNew: false,
      },
      {
        title: "Neuer Monatsüberblick",
        text: "Nach „Monat abschließen“ steht die Summe oben, die Firmen sind nach Wirkung sortiert und zugeklappt, und kurze Bereiche zeigen, was jetzt ansteht.",
        href: "/",
        where: "Kopfleiste › Monat abschließen",
        isNew: true,
      },
      {
        title: "Konzern-Mandat stabiler",
        text: "Konzerne wachsen reifer, ihre Marge bleibt im Branchenband und die Kosten folgen dem Umsatz. Ältere Spielstände wurden dabei korrigiert.",
        href: "/post",
        where: "Post › Anfrage eines Konzerns",
        unlock: (state) => (state.reputation >= CORPORATE_REPUTATION ? null : `ab Ruf ${CORPORATE_REPUTATION}`),
        isNew: false,
      },
      {
        title: "Großmandate",
        text: `Sehr große Verkäufe (${mio(40_000_000)} bis ${mio(200_000_000)} Unternehmenswert) laufen über ein Teaser-Verfahren und drei Verhandlungsrunden.`,
        href: "/nachfolge",
        where: "Menü › Unternehmen › Nachfolge & Übernahmen",
        unlock: reputationLock(BIG_MANDATE_REPUTATION),
        isNew: true,
      },
      {
        title: "Rangliste und Rivalen",
        text: `Der League Table zeigt dich neben den anderen M&A-Beratern. Ab Ruf ${RIVAL_REPUTATION} tauchen Rivalen auf, die bei Übernahmen gegen dich mitbieten (Bietgefecht).`,
        href: "/rangliste",
        where: "Menü › Wissen › Rangliste",
        unlock: reputationLock(unlockOf("league")),
        isNew: true,
      },
      {
        title: "Ruf steigt langsamer",
        text: `Je höher der Ruf, desto zäher der Zuwachs: ab Ruf ${steps[1].from} zählen nur ${percent(steps[1].factor)} jedes Gewinns, ab ${steps[steps.length - 1]!.from} nur ${percent(steps[steps.length - 1]!.factor)}. Verluste zählen voll.`,
        where: "Kopfleiste › Ruf",
        isNew: false,
      },
      {
        title: "Operating Partner",
        text: "Das Team besteht jetzt aus Operating Partnern, die du Firmen zuweist. Sie bekommen Vergütung und Carry, ihre Passung zur Firma zählt.",
        href: "/holding/team",
        where: "Menü › Unternehmen › Operating Partner",
        unlock: (state) => (state.familyOffice ? null : `ab Family Office (Ruf ${FAMILY_OFFICE_REPUTATION})`),
        isNew: true,
      },
      {
        title: "Holding-Struktur mit Zwischenholding",
        text: "Du siehst, wem was gehört, kannst eine Zwischenholding einziehen und siehst Mitgesellschafter und Banken.",
        href: "/holding/struktur",
        where: "Menü › Unternehmen › Gesellschaftsstruktur",
        unlock: (state) => (state.familyOffice ? null : `ab Family Office (Ruf ${FAMILY_OFFICE_REPUTATION})`),
        isNew: true,
      },
      {
        title: "Immobilien mit Zinszyklus und Penthouse",
        text: `Kaufe Wohnungen, Häuser und Gewerbe mit Hypothek; der Zinszyklus entscheidet, ob sich das lohnt. Ein Penthouse (ab Ruf ${KINDS.penthouse.reputation}) ersetzt die Büromiete.`,
        href: "/immobilien",
        where: "Menü › Besitz & Leben › Immobilien",
        unlock: (state) => (netWorth(state) >= ESTATE_WORTH ? null : `ab ${mio(ESTATE_WORTH)} Vermögen`),
        isNew: true,
      },
      {
        title: "Stiftung und Dynastie",
        text: "Gründe eine Stiftung, gib dein Lebenswerk weiter und bereite die Nachfolge in der Familie vor.",
        href: "/stiftung",
        where: "Menü › Besitz & Leben › Stiftung & Dynastie",
        unlock: (state) =>
          state.familyOffice && state.reputation >= FOUNDATION.reputation && netWorth(state) >= FOUNDATION.worth
            ? null
            : `ab Family Office, Ruf ${FOUNDATION.reputation}, ${mio(FOUNDATION.worth)} Vermögen`,
        isNew: true,
      },
    ],
  },
];

export const LATEST_RELEASE_ID = RELEASES[0]!.id;

/** So viele Releases zeigt das Popup höchstens auf einmal. */
export const MAX_POPUP_RELEASES = 3;

export interface PendingNews {
  /** Ungesehene Releases, neueste zuerst. */
  releases: Release[];
  /** Die id, die beim Schließen gespeichert wird (das neueste Release). */
  latest: string;
}

/**
 * Welche Neuigkeiten dem Spieler beim Öffnen gezeigt werden, oder null.
 * - Neue Spiele (die Einführung steht noch an) sehen nichts; das Beenden der Einführung markiert das neueste Release als gesehen.
 * - Ohne Eintrag im Spielstand (bestehendes Spiel): nur das neueste Release, nicht die ganze Geschichte.
 * - Sonst alles, was neuer ist als `seen`, höchstens die letzten drei.
 */
export function pendingRelease(state: Pick<GameState, "month" | "onboarding" | "whatsNew">, releases: Release[] = RELEASES): PendingNews | null {
  const newest = releases[0];
  if (!newest) return null;
  if (shouldAutoStartTour(state)) return null;
  const seen = state.whatsNew?.seen;
  if (seen === undefined) return { releases: [newest], latest: newest.id };
  const unseen = releases.filter((r) => r.id > seen);
  if (unseen.length === 0) return null;
  return { releases: unseen.slice(0, MAX_POPUP_RELEASES), latest: newest.id };
}

/** Prüft die Eingabe aus dem Browser: nur eine bekannte Release-id geht durch. */
export function parseNewsSeen(input: unknown): string | null {
  if (typeof input !== "string") return null;
  return RELEASES.some((r) => r.id === input) ? input : null;
}

/** Merkt sich die gesehene id und geht nie zurück auf ein älteres Release. */
export function applyNewsSeen(current: WhatsNewState | undefined, id: string): WhatsNewState {
  const seen = current?.seen;
  return { ...current, seen: seen !== undefined && seen >= id ? seen : id };
}

// ---------------------------------------------------------------------------
// Ansicht für die Oberfläche: reine Daten ohne Funktionen
// ---------------------------------------------------------------------------

export interface ReleaseItemView {
  title: string;
  text: string;
  href?: string;
  where: string;
  isNew: boolean;
  /** null: keine Freischaltung nötig; sonst gesperrt (Text) oder offen. */
  unlock: { locked: boolean; label: string } | null;
}

export interface ReleaseView {
  id: string;
  dateLabel: string;
  title: string;
  items: ReleaseItemView[];
}

export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00Z`));
}

export function releaseViews(releases: Release[], state: GameState): ReleaseView[] {
  return releases.map((r) => ({
    id: r.id,
    dateLabel: dateLabel(r.date),
    title: r.title,
    items: r.items.map((i) => {
      const lock = i.unlock ? i.unlock(state) : undefined;
      return {
        title: i.title,
        text: i.text,
        href: i.href,
        where: i.where,
        isNew: i.isNew,
        unlock: lock === undefined ? null : lock === null ? { locked: false, label: "freigeschaltet" } : { locked: true, label: lock },
      };
    }),
  }));
}
