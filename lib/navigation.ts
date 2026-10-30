import { BUYOUT_REPUTATION, FAMILY_OFFICE_REPUTATION, FUND_REPUTATION } from "./game/config";
import { STUDIO_EXITS, STUDIO_REPUTATION } from "./game/venture-config";
import { MANDATE_REPUTATION } from "./game/mna-config";

// Die Navigation des Spiels an einer Stelle. Kopfleiste und Menü lesen nur diese Datei.
//
// Neue Seite eintragen: eine Zeile in NAV_ITEMS (unten). Pflicht sind href, label,
// group und description. Optional:
//   badge     Zahl am Eintrag (z. B. ungelesene Post); null oder 0 blendet sie aus.
//   visible   false blendet den Eintrag ganz aus (z. B. solange eine Funktion fehlt).
//   locked    Text wie "ab Ruf 75": der Eintrag wird gedimmt und zeigt den Hinweis,
//             bleibt aber anklickbar (die Seite erklärt selbst, was fehlt).
//   match     weitere Pfade, die als dieser Bereich gelten (Unterseiten).
//   primary   Platz in der Kopfleiste (1 = ganz links); ohne Angabe nur im Menü.
//   icon      Name aus ICONS in components/shell/MainMenu.tsx.
// Eine neue Gruppe kommt zusätzlich in NAV_GROUPS (Reihenfolge = Reihenfolge im Menü).
// Nur Seiten eintragen, die es wirklich gibt.

/** Was Kopfleiste und Menü vom Spielstand wissen müssen. Reine Zahlen, damit es zum Client geschickt werden kann. */
export interface NavState {
  reputation: number;
  /** Ungelesene Post. */
  unread: number;
  /** Offene Vorlagen im Portfolio (Beirat wartet auf eine Sitzung). */
  openItems: number;
  /** Offene Bitten, Einladungen und abkühlende Kontakte im Netzwerk. */
  networkTasks: number;
  familyOffice: boolean;
  /** Funds raised so far (Fund I to III). */
  funds?: number;
  /** Successful sales so far. */
  exits?: number;
}

export type NavGroupId = "start" | "invest" | "company" | "network" | "life" | "knowledge" | "account";

export interface NavGroup {
  id: NavGroupId;
  label: string;
}

export interface NavItem {
  href: string;
  label: string;
  group: NavGroupId;
  /** Eine Zeile, was man dort tut. */
  description: string;
  icon?: string;
  match?: string[];
  primary?: number;
  badge?: (s: NavState) => number | null;
  badgeTone?: "alert" | "accent";
  visible?: (s: NavState) => boolean;
  locked?: (s: NavState) => string | null;
}

export const NAV_GROUPS: NavGroup[] = [
  { id: "start", label: "Start" },
  { id: "invest", label: "Investieren" },
  { id: "company", label: "Unternehmen" },
  { id: "network", label: "Netzwerk & Termine" },
  { id: "life", label: "Besitz & Leben" },
  { id: "knowledge", label: "Wissen" },
  { id: "account", label: "Konto" },
];

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Büro", group: "start", icon: "desk", primary: 1, match: ["/auftrag"], description: "Dein Schreibtisch: Aufgaben, Aufträge und der Stand des Monats." },

  {
    href: "/portfolio",
    label: "Portfolio",
    group: "invest",
    icon: "chart",
    primary: 2,
    match: ["/firma", "/sitzung", "/gv", "/verkauf"],
    description: "Deine Beteiligungen, Sitzungen und Verkäufe.",
    badge: (s) => s.openItems,
    badgeTone: "accent",
  },
  { href: "/boerse", label: "Börse", group: "invest", icon: "candles", description: "Aktien kaufen und verkaufen, Sperrfristen im Blick." },
  {
    href: "/fonds",
    label: "Fonds",
    group: "invest",
    icon: "layers",
    description: "Fonds I bis III, Investoren, Wasserfall und LPAC.",
    locked: (s) => (!s.funds && s.reputation < FUND_REPUTATION ? `ab Ruf ${FUND_REPUTATION}` : null),
  },
  {
    href: "/studio",
    label: "Venture Studio",
    group: "invest",
    icon: "spark",
    description: "Eigene Firmen gründen und mit Geld und Tagen aufbauen.",
    locked: (s) => (s.reputation >= STUDIO_REPUTATION && (s.exits ?? 0) >= STUDIO_EXITS ? null : `ab Ruf ${STUDIO_REPUTATION} und ${STUDIO_EXITS} Verkäufen`),
  },

  {
    href: "/holding",
    label: "Holding",
    group: "company",
    icon: "building",
    description: "Family Office, Team, Fonds und Kaufkredite.",
    locked: (s) => (!s.familyOffice && s.reputation < FAMILY_OFFICE_REPUTATION ? `ab Ruf ${FAMILY_OFFICE_REPUTATION}` : null),
  },
  {
    href: "/nachfolge",
    label: "Nachfolge & Übernahmen",
    group: "company",
    icon: "handshake",
    match: ["/mandat", "/uebernahme", "/plattform"],
    description: "M&A-Mandate, Firmen übernehmen, Plattformen mit Zukäufen.",
    locked: (s) => (s.reputation < Math.min(MANDATE_REPUTATION, BUYOUT_REPUTATION) ? `ab Ruf ${Math.min(MANDATE_REPUTATION, BUYOUT_REPUTATION)}` : null),
  },

  {
    href: "/netzwerk",
    label: "Netzwerk",
    group: "network",
    icon: "people",
    primary: 4,
    description: "Kontakte pflegen, Gefallen tauschen, Veranstaltungen.",
    badge: (s) => s.networkTasks,
    badgeTone: "accent",
  },
  { href: "/kalender", label: "Kalender", group: "network", icon: "calendar", description: "Termine und Fristen des Jahres." },
  {
    href: "/post",
    label: "Post",
    group: "network",
    icon: "mail",
    primary: 3,
    description: "Angebote, Anfragen und Nachrichten.",
    badge: (s) => s.unread,
    badgeTone: "alert",
  },

  { href: "/fuhrpark", label: "Fuhrpark", group: "life", icon: "car", description: "Fahrzeuge kaufen, fahren und pflegen." },
  { href: "/vitrine", label: "Vitrine", group: "life", icon: "trophy", description: "Auszeichnungen und Trophäen." },
  // { href: "/immobilien", label: "Immobilien", group: "life", icon: "house", description: "Wohnungen, Häuser und das Penthouse." },
  // { href: "/stiftung", label: "Stiftung & Dynastie", group: "life", icon: "heart", description: "Stiftung gründen, Nachfolge in der Familie." },

  { href: "/notizbuch", label: "Notizbuch", group: "knowledge", icon: "book", description: "Lernkarten zu Fachbegriffen und deine Notizen." },
  // { href: "/rangliste", label: "Rangliste", group: "knowledge", icon: "podium", description: "Du und die anderen Berater im Vergleich." },

  { href: "/konto", label: "Konto", group: "account", icon: "user", description: "Spielstände, Anmeldung und Einstellungen." },
];

function under(path: string, prefix: string): boolean {
  return prefix === "/" ? path === "/" : path === prefix || path.startsWith(`${prefix}/`);
}

/** Der Eintrag, zu dem ein Pfad gehört (längster passender Pfad gewinnt), oder undefined. */
export function activeNavItem(path: string): NavItem | undefined {
  let best: NavItem | undefined;
  let bestLen = -1;
  for (const item of NAV_ITEMS) {
    for (const p of [item.href, ...(item.match ?? [])]) {
      if (under(path, p) && p.length > bestLen) {
        best = item;
        bestLen = p.length;
      }
    }
  }
  return best;
}

/** Einträge der Kopfleiste in ihrer Reihenfolge. */
export function primaryItems(): NavItem[] {
  return NAV_ITEMS.filter((i) => i.primary !== undefined).sort((a, b) => a.primary! - b.primary!);
}

export interface MenuEntry {
  item: NavItem;
  badge: number | null;
  locked: string | null;
}

export interface MenuSection {
  group: NavGroup;
  entries: MenuEntry[];
}

/** Zwei Schreibweisen für die Suche: „Börse“ findet man mit „börse“, „boerse“ und „borse“. */
function forms(text: string): string[] {
  const low = text.toLowerCase();
  const expanded = low.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  const plain = low
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return [expanded, plain];
}

function matches(text: string, query: string): boolean {
  const hay = forms(text);
  return forms(query).some((q) => hay.some((h) => h.includes(q)));
}

/** Menü für einen Spielstand, optional gefiltert (Suche in Name, Beschreibung und Gruppe). Leere Gruppen entfallen. */
export function menuSections(state: NavState, query = ""): MenuSection[] {
  const q = query.trim();
  const sections: MenuSection[] = [];
  for (const group of NAV_GROUPS) {
    const entries: MenuEntry[] = [];
    for (const item of NAV_ITEMS) {
      if (item.group !== group.id || (item.visible && !item.visible(state))) continue;
      if (q && !matches(`${item.label} ${item.description} ${group.label}`, q)) continue;
      const badge = item.badge?.(state) ?? null;
      entries.push({ item, badge: badge && badge > 0 ? badge : null, locked: item.locked?.(state) ?? null });
    }
    if (entries.length > 0) sections.push({ group, entries });
  }
  return sections;
}
