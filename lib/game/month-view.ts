import { cockpitRows, type Light } from "./cockpit";
import { networkTasks } from "./network-views";
import type { GameState } from "./types";

// Was der Monatsüberblick nach dem Abschluss zusätzlich zum Bericht zeigt: Ampel je Firma,
// Handlungsbedarf, Netzwerk, Post und Termine im neuen Monat. Reine Ansicht, kein Zufall.

export interface OutlookLink {
  text: string;
  href: string;
  /** Wie dringend: rot = jetzt, gelb = bald, grün = ruhig. */
  light: Light;
}

export interface OutlookMail {
  from: string;
  subject: string;
  href: string;
}

export interface OutlookDate {
  /** „Tag 3“ im Kalender oder „Monatsende“. */
  when: string;
  text: string;
  note: string;
}

export interface MonthOutlook {
  /** Der Monat, der jetzt beginnt. */
  month: number;
  /** Ampel und Begründung je Beteiligung (Schlüssel = Firmen-Id). */
  firms: Record<string, { light: Light; reason: string; reasons: string[] }>;
  todo: OutlookLink[];
  network: OutlookLink[];
  mails: OutlookMail[];
  unread: number;
  dates: OutlookDate[];
}

const MAX_TODO = 5;
const MAX_NETWORK = 3;
const MAX_MAILS = 4;
const MAX_DATES = 5;

export function monthOutlook(state: GameState): MonthOutlook {
  const rows = cockpitRows(state);
  const firms: MonthOutlook["firms"] = {};
  for (const r of rows) firms[r.id] = { light: r.light, reason: r.reason, reasons: r.reasons };

  const todo: OutlookLink[] = [...rows]
    .filter((r) => r.actions.length > 0 || r.light === "red")
    .sort((a, b) => b.needs - a.needs)
    .slice(0, MAX_TODO)
    .map((r) => ({
      text: `${r.name}: ${r.actions.length > 0 ? r.actions.join(", ") : r.reason}`,
      href: `/firma/${r.id}`,
      light: r.light,
    }));

  const network: OutlookLink[] = networkTasks(state)
    .slice(0, MAX_NETWORK)
    .map((t) => ({ text: t.text, href: t.href, light: t.tone === "urgent" ? "red" : t.tone === "normal" ? "yellow" : "green" }));

  const unreadMails = state.mails.filter((m) => !m.read);
  const mails = unreadMails.slice(0, MAX_MAILS).map((m) => ({ from: m.from, subject: m.subject, href: `/post?mail=${m.id}` }));

  const dates: OutlookDate[] = state.calendar.map((c) => ({ when: `Tag ${c.day + 1}`, text: c.label, note: c.days === 1 ? "1 Tag" : `${c.days} Tage` }));
  for (const r of rows) {
    if (r.next && r.next.inMonths <= 0) dates.push({ when: "Monatsende", text: `${r.name}: ${r.next.text}`, note: "Termin" });
  }

  return { month: state.month, firms, todo, network, mails, unread: unreadMails.length, dates: dates.slice(0, MAX_DATES) };
}
