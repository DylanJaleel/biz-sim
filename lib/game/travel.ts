import type { GameState, Gig, GigApproach } from "./types";

// Fuhrpark und Anreise. Wer zu einem Auftrag fährt, entscheidet, wie: Der Zug
// lässt dich unterwegs arbeiten, das eigene Auto ist schnell, der Fahrer bringt
// dich ausgeruht hin, der Jet macht Eindruck. Vor Ort entscheidest du, wie du
// den Auftrag angehst, und die Anreise verschiebt deine Chancen.

export const HOME_CITY = "Köln";

export type Distance = "local" | "national" | "international";

export interface City {
  id: string;
  name: string;
  distance: Distance;
  km: number;
  /** Arrival picture, if there is one. */
  image?: string;
}

export const CITIES: Record<string, City> = {
  koeln: { id: "koeln", name: "Köln", distance: "local", km: 15 },
  wuppertal: { id: "wuppertal", name: "Wuppertal", distance: "local", km: 50 },
  hamburg: { id: "hamburg", name: "Hamburg", distance: "national", km: 425, image: "stadt-hamburg" },
  berlin: { id: "berlin", name: "Berlin", distance: "national", km: 575, image: "stadt-berlin" },
  frankfurt: { id: "frankfurt", name: "Frankfurt", distance: "national", km: 190, image: "stadt-frankfurt" },
  muenchen: { id: "muenchen", name: "München", distance: "national", km: 575, image: "stadt-muenchen" },
  luzern: { id: "luzern", name: "Luzern", distance: "international", km: 520, image: "stadt-luzern" },
  wien: { id: "wien", name: "Wien", distance: "international", km: 910, image: "stadt-wien" },
};

/** Where each kind of job takes place. */
export const GIG_CITY: Record<string, string> = {
  workshop: "wuppertal",
  pitch: "hamburg",
  expert: "berlin",
  mentor: "hamburg",
  dd: "muenchen",
  bank: "koeln",
  lecture: "koeln",
  talk: "frankfurt",
  interim: "hamburg",
  turnaround: "frankfurt",
  corporate: "muenchen",
  board: "wien",
  podcast: "berlin",
  esg: "koeln",
  mna: "luzern",
  keynote: "luzern",
};

export function cityOf(gig: Gig): City {
  return CITIES[gig.city ?? GIG_CITY[gig.kind] ?? "koeln"] ?? CITIES.koeln!;
}

// ---------------------------------------------------------------------------
// Fuhrpark: was man kaufen kann.
// ---------------------------------------------------------------------------

export type VehicleKind = "car" | "chauffeur" | "jet";

export interface VehicleDef {
  id: string;
  kind: VehicleKind;
  name: string;
  text: string;
  price: number;
  upkeep: number;
  /** Saves the travel day on national and international trips. */
  fast: boolean;
  /** 0..3: how much the arrival impresses. */
  impress: number;
  /** Cost of one trip by distance (fuel, crew, landing fees). */
  trip: Record<Distance, number>;
  reputation: number;
  needs?: "familyOffice" | "fund";
  image: string;
  key: string;
}

export const VEHICLES: VehicleDef[] = [
  {
    id: "kompakt",
    kind: "car",
    name: "Kompakter Sportler",
    text: "Flink, sparsam, unauffällig. Für den Anfang genau richtig.",
    price: 38_000,
    upkeep: 450,
    fast: false,
    impress: 0,
    trip: { local: 25, national: 95, international: 130 },
    reputation: 0,
    image: "car-kompakt",
    key: "key-kompakt",
  },
  {
    id: "kombi",
    kind: "car",
    name: "Business-Kombi",
    text: "Viel Platz für Akten und Muster. Wirkt solide beim Mittelstand.",
    price: 62_000,
    upkeep: 700,
    fast: false,
    impress: 1,
    trip: { local: 30, national: 110, international: 150 },
    reputation: 20,
    image: "car-kombi",
    key: "key-kompakt",
  },
  {
    id: "elektro",
    kind: "car",
    name: "Elektro-Sportlimousine",
    text: "Leise, schnell und günstig im Verbrauch. Lädt, während du beim Kunden bist.",
    price: 112_000,
    upkeep: 900,
    fast: true,
    impress: 1,
    trip: { local: 10, national: 40, international: 60 },
    reputation: 40,
    image: "car-elektro",
    key: "key-sport",
  },
  {
    id: "suv",
    kind: "car",
    name: "Luxus-SUV",
    text: "Groß, ruhig, sicher. Kommt auch im Winter auf jede Werkseinfahrt.",
    price: 135_000,
    upkeep: 1_300,
    fast: false,
    impress: 1,
    trip: { local: 40, national: 140, international: 190 },
    reputation: 45,
    image: "car-suv",
    key: "key-suv",
  },
  {
    id: "coupe",
    kind: "car",
    name: "Sportwagen-Coupé",
    text: "Ein Klassiker. Vor dem Kongresshaus drehen sich die Leute um.",
    price: 160_000,
    upkeep: 1_500,
    fast: true,
    impress: 2,
    trip: { local: 35, national: 120, international: 170 },
    reputation: 55,
    image: "car-coupe",
    key: "key-sport",
  },
  {
    id: "cabrio",
    kind: "car",
    name: "Gran-Turismo-Cabrio",
    text: "Lange Strecken mit offenem Dach. Kommst du an, ist der Termin schon halb gewonnen.",
    price: 210_000,
    upkeep: 1_900,
    fast: true,
    impress: 2,
    trip: { local: 40, national: 140, international: 190 },
    reputation: 60,
    image: "car-cabrio",
    key: "key-sport",
  },
  {
    id: "super",
    kind: "car",
    name: "Supersportwagen",
    text: "Mehr Auftritt geht auf der Straße nicht. Unterwegs arbeiten geht dafür gar nicht.",
    price: 320_000,
    upkeep: 3_000,
    fast: true,
    impress: 3,
    trip: { local: 60, national: 220, international: 300 },
    reputation: 75,
    image: "car-super",
    key: "key-sport",
  },
  {
    id: "fahrer",
    kind: "chauffeur",
    name: "Fahrer mit Limousine",
    text: "Du sitzt hinten und arbeitest, vorn fährt jemand, der jede Abkürzung kennt.",
    price: 0,
    upkeep: 6_500,
    fast: false,
    impress: 2,
    trip: { local: 60, national: 250, international: 350 },
    reputation: 0,
    needs: "familyOffice",
    image: "car-limousine",
    key: "key-fahrer",
  },
  {
    id: "jetkarte",
    kind: "jet",
    name: "Jet-Karte",
    text: "Flugstunden im Voraus gekauft. Ein Anruf, und vier Stunden später steht ein Jet bereit.",
    price: 90_000,
    upkeep: 0,
    fast: true,
    impress: 3,
    trip: { local: 3_000, national: 8_400, international: 9_800 },
    reputation: 85,
    image: "jet-light",
    key: "key-jet",
  },
  {
    id: "jet",
    kind: "jet",
    name: "Eigener Jet",
    text: "Langstrecke, eigene Crew, eigener Hangar. Fliegt, wann du willst.",
    price: 4_500_000,
    upkeep: 45_000,
    fast: true,
    impress: 3,
    trip: { local: 1_000, national: 2_000, international: 2_800 },
    reputation: 85,
    needs: "fund",
    image: "jet-long",
    key: "key-jet",
  },
];

export const RESALE = 0.6;

export function vehicleOf(id: string): VehicleDef | undefined {
  return VEHICLES.find((v) => v.id === id);
}

export function garageOf(state: GameState): VehicleDef[] {
  return (state.garage ?? []).map((id) => vehicleOf(id)).filter((v): v is VehicleDef => v !== undefined);
}

export function garageValue(state: GameState): number {
  return garageOf(state).reduce((sum, v) => sum + Math.round(v.price * RESALE), 0);
}

export function garageUpkeep(state: GameState): number {
  return garageOf(state).reduce((sum, v) => sum + v.upkeep, 0);
}

/** Why a vehicle can't be bought right now, or null. */
export function vehicleBlocker(state: GameState, v: VehicleDef): string | null {
  if ((state.garage ?? []).includes(v.id)) return "Hast du schon.";
  if (state.reputation < v.reputation) return `Braucht ${v.reputation} Ruf.`;
  if (v.needs === "familyOffice" && state.familyOffice === undefined) return "Braucht ein Family Office.";
  if (v.needs === "fund" && state.fund === undefined) return "Braucht einen eigenen Fonds.";
  if (state.cash < v.price) return "Dafür reicht das Konto nicht.";
  return null;
}

// ---------------------------------------------------------------------------
// Anreise: welche Wege es zu einem Auftrag gibt.
// ---------------------------------------------------------------------------

export type TravelScene = "schluessel" | "garage" | "autobahn" | "zug" | "lounge" | "jet-ankunft" | "einsteigen" | "start" | "kabine" | "stadt" | "empfang" | "kunde";

export interface TravelOption {
  id: string;
  name: string;
  /** What kind of trip, for the pictures. */
  mode: "train" | "car" | "chauffeur" | "flight" | "jet";
  days: number;
  cost: number;
  /** Time to work on the way: better prepared. */
  prep: boolean;
  /** Arrive rested. */
  rest: boolean;
  impress: number;
  duration: string;
  /** Pictures shown on the way, in order. */
  scenes: { scene: TravelScene; image: string; caption: string }[];
  locked?: string;
}

function hours(km: number, speed: number, extra = 0): string {
  const h = km / speed + extra;
  const whole = Math.floor(h);
  const min = Math.round(((h - whole) * 60) / 5) * 5;
  return `${whole}:${String(min === 60 ? 0 : min).padStart(2, "0")} h`;
}

const CLIENT_IMAGE: Record<string, string> = {
  workshop: "kunde-workshop",
  pitch: "kunde-buehne",
  expert: "kunde-lobby",
  mentor: "kunde-workshop",
  dd: "kunde-boardroom-saal",
  bank: "kunde-lobby",
  lecture: "kunde-buehne",
  talk: "kunde-buehne",
  interim: "kunde-halle",
  turnaround: "kunde-mittelstand",
  corporate: "kunde-boardroom-redner",
  board: "kunde-boardroom-saal",
  podcast: "kunde-podcast",
  esg: "kunde-mittelstand",
  mna: "kunde-boardroom-redner",
  keynote: "kunde-buehne",
};

export function clientImage(gig: Gig): string {
  return CLIENT_IMAGE[gig.kind] ?? "kunde-lobby";
}

/** Every way to get to this job, cheapest first; locked ones say why. */
export function travelOptions(state: GameState, gig: Gig): TravelOption[] {
  const city = cityOf(gig);
  const d = city.distance;
  const far = d !== "local";
  const meeting = FAMILY[gig.kind] === "beratung";
  const arrive = (): TravelOption["scenes"] => [
    ...(city.image ? [{ scene: "stadt" as const, image: city.image, caption: `Ankunft in ${city.name}` }] : []),
    ...(meeting ? [{ scene: "empfang" as const, image: "kunde-begruessung", caption: `Empfang bei ${gig.client}` }] : []),
    { scene: "kunde", image: clientImage(gig), caption: `Bei ${gig.client}` },
  ];
  const options: TravelOption[] = [];
  const trainCost = { local: 30, national: 120, international: 160 }[d];
  const trainDays = far ? 1 : 0;
  const trainScenes = (cabin: string): TravelOption["scenes"] => [
    { scene: "zug", image: "zug-ice", caption: `${HOME_CITY} Hbf, Zug nach ${city.name}` },
    { scene: "kabine", image: cabin, caption: "Unterwegs gehst du die Unterlagen durch" },
    ...arrive(),
  ];
  options.push({
    id: "bahn2",
    name: "Zug, 2. Klasse",
    mode: "train",
    days: trainDays,
    cost: trainCost,
    prep: true,
    rest: false,
    impress: 0,
    duration: hours(city.km, 110, 0.3),
    scenes: trainScenes("kabine-zug2"),
  });
  options.push({
    id: "bahn1",
    name: "Zug, 1. Klasse",
    mode: "train",
    days: trainDays,
    cost: Math.round(trainCost * 1.8),
    prep: true,
    rest: true,
    impress: 0,
    duration: hours(city.km, 110, 0.3),
    scenes: trainScenes("kabine-zug1"),
  });

  const owned = garageOf(state);
  for (const v of owned.filter((x) => x.kind === "car")) {
    options.push({
      id: v.id,
      name: v.name,
      mode: "car",
      days: far && !v.fast ? 1 : 0,
      cost: v.trip[d],
      prep: false,
      rest: !far,
      impress: v.impress,
      duration: hours(city.km, v.fast ? 120 : 105),
      scenes: [
        { scene: "schluessel", image: "reise-schluessel", caption: `Schlüssel vom Tisch: ${v.name}` },
        { scene: "garage", image: "reise-garage", caption: "Tiefgarage" },
        ...(far ? [{ scene: "autobahn" as const, image: "reise-autobahn", caption: `Auf der Autobahn nach ${city.name}` }] : []),
        ...arrive(),
      ],
    });
  }
  const fahrer = owned.find((x) => x.kind === "chauffeur");
  if (fahrer) {
    options.push({
      id: fahrer.id,
      name: fahrer.name,
      mode: "chauffeur",
      days: far ? 1 : 0,
      cost: fahrer.trip[d],
      prep: true,
      rest: true,
      impress: fahrer.impress,
      duration: hours(city.km, 105),
      scenes: [
        { scene: "kabine", image: "kabine-limousine", caption: "Dein Fahrer fährt, du arbeitest hinten" },
        ...(far ? [{ scene: "autobahn" as const, image: "reise-autobahn", caption: `Auf der Autobahn nach ${city.name}` }] : []),
        ...arrive(),
      ],
    });
  }
  if (far) {
    const flight = (id: string, name: string, cost: number, rest: boolean, prep: boolean, impress: number, cabin: string, locked?: string): TravelOption => ({
      id,
      name,
      mode: "flight",
      days: 0,
      cost,
      prep,
      rest,
      impress,
      duration: `${hours(city.km, 700, 2.4)} Tür zu Tür`,
      scenes: [{ scene: "lounge", image: "reise-lounge", caption: "Am Gate in Köln/Bonn" }, { scene: "kabine", image: cabin, caption: "Über den Wolken" }, ...arrive()],
      locked,
    });
    const intl = d === "international";
    options.push(flight("eco", "Flug, Economy", intl ? 260 : 180, false, false, 0, "kabine-economy"));
    options.push(flight("business", "Flug, Business", intl ? 620 : 480, true, false, 0, "kabine-business"));
    options.push(flight("first", "Flug, First", intl ? 1_600 : 1_200, true, true, 1, "kabine-first", state.reputation < 70 ? "Ab 70 Ruf" : undefined));
    const jet = owned.find((x) => x.kind === "jet" && x.id === "jet") ?? owned.find((x) => x.kind === "jet");
    options.push({
      id: jet?.id ?? "jetkarte",
      name: jet?.name ?? "Privatjet",
      mode: "jet",
      days: 0,
      cost: (jet ?? vehicleOf("jetkarte")!).trip[d],
      prep: true,
      rest: true,
      impress: 3,
      duration: `${hours(city.km, 750, 0.8)} Tür zu Tür`,
      scenes: [
        { scene: "jet-ankunft", image: "reise-jet-ankunft", caption: "Der Wagen fährt bis an den Jet" },
        { scene: "einsteigen", image: "reise-einsteigen", caption: "Einsteigen" },
        { scene: "start", image: "reise-start", caption: "Abheben" },
        { scene: "kabine", image: "kabine-jet", caption: "Nur du und deine Unterlagen" },
        ...arrive(),
      ],
      locked: jet ? undefined : "Braucht eine Jet-Karte (Fuhrpark)",
    });
  }
  return options;
}

// ---------------------------------------------------------------------------
// Vor Ort: wie du den Auftrag angehst.
// ---------------------------------------------------------------------------

type Family = "beratung" | "buehne" | "netzwerk";

const FAMILY: Record<string, Family> = {
  workshop: "beratung",
  dd: "beratung",
  bank: "beratung",
  interim: "beratung",
  turnaround: "beratung",
  corporate: "beratung",
  board: "beratung",
  esg: "beratung",
  mna: "beratung",
  pitch: "buehne",
  talk: "buehne",
  keynote: "buehne",
  lecture: "buehne",
  podcast: "buehne",
  expert: "netzwerk",
  mentor: "netzwerk",
};

export const BRIEF: Record<string, string> = {
  workshop: "Die Geschäftsführung sitzt bereit, das Whiteboard ist leer. Sie wollen wissen, wohin der Betrieb in fünf Jahren soll.",
  pitch: "Zehn Teams, je fünf Minuten. Die meisten reden zu lange über die Technik und zu wenig über Kunden.",
  expert: "Sechs Investoren, je eine Stunde. Alle wollen wissen, ob ein bestimmtes Startup hält, was es verspricht.",
  mentor: "Junge Teams mit großen Plänen und wenig Zeit. Sophie Brandt vom Angel-Netzwerk sitzt in der letzten Reihe.",
  dd: "Der Datenraum ist offen, das Family Office will in drei Tagen eine Einschätzung. Die Zahlen sehen fast zu gut aus.",
  bank: "Ralf Becker legt dir die Akte eines Firmenkunden hin. Die Bank überlegt, die Kreditlinie zu kürzen.",
  lecture: "Ein voller Hörsaal mit Studierenden, die selbst gründen wollen. Die Folien vom letzten Jahr liegen bereit.",
  talk: "Fünfhundert Unternehmer, dreißig Minuten. Vor dir hat ein Minister gesprochen, und alle schauen auf ihr Telefon.",
  interim: "Montag, 8:30 Uhr. Die Hausbank will bis Freitag eine Liquiditätsplanung, das Controlling ist ein Stapel Excel-Dateien.",
  turnaround: "Die Halle steht still, der Insolvenzverwalter will wissen, ob sich die Rettung lohnt. Die Belegschaft wartet vor der Tür.",
  corporate: "Der Konzern sucht Startups für ein Pilotprojekt. Im Raum sitzen Einkauf, Rechtsabteilung und ein skeptischer Vorstand.",
  board: "Die Familie streitet über die Nachfolge. Der Senior will nicht loslassen, die Tochter hat eigene Pläne.",
  podcast: "Zwei Mikrofone, eine Stunde. Der Moderator ist gut vorbereitet und fragt gern nach Fehlern.",
  esg: "Der Bericht muss in drei Wochen fertig sein. Niemand im Betrieb weiß, wie viel Strom die Spritzgießmaschinen verbrauchen.",
  mna: "Der Unternehmer will verkaufen, der Käufer drückt den Preis. Die Kanzlei hat dich als Bewerter an den Tisch geholt.",
  keynote: "Zweitausend Gäste, in der ersten Reihe sitzt die Wirtschaftspresse. Zwanzig Minuten gehören dir.",
};

const OPTIONS: Record<Family, Record<GigApproach, { label: string; text: string }>> = {
  beratung: {
    safe: { label: "Pragmatisch: das Nötige sauber erledigen", text: "Sicher. Bei längeren Aufträgen bist du einen Tag früher fertig." },
    thorough: { label: "Gründlich: tiefer einsteigen als verlangt", text: "Ein Tag mehr, dafür mehr Honorar und vielleicht ein Kontakt, der bleibt." },
    bold: { label: "Mutig: mit einer klaren Empfehlung herausfordern", text: "Wenn es sitzt, spricht die Branche über dich. Wenn nicht, ist der Kunde verstimmt." },
  },
  buehne: {
    safe: { label: "Sicher: Bewährtes gut erzählt", text: "Freundlicher Applaus, keine Überraschungen." },
    thorough: { label: "Vorbereitet: neue Zahlen und eigene Beispiele", text: "Ein Tag Vorbereitung mehr, dafür bleibt etwas hängen." },
    bold: { label: "Zugespitzt: eine These, die polarisiert", text: "Die Presse greift es auf, so oder so." },
  },
  netzwerk: {
    safe: { label: "Zuhören und gezielt helfen", text: "Sicher und angenehm für alle." },
    thorough: { label: "Danach jeden einzeln nachfassen", text: "Ein Tag mehr, dafür wärmere Kontakte." },
    bold: { label: "Offen sagen, was nicht funktioniert", text: "Ehrlichkeit macht Eindruck, aber nicht bei allen." },
  },
};

export function approachesFor(gig: Gig): { id: GigApproach; label: string; text: string }[] {
  const family = OPTIONS[FAMILY[gig.kind] ?? "beratung"];
  return (["safe", "thorough", "bold"] as const).map((id) => ({ id, ...family[id] }));
}

/** Chance that the bold way works, given how you arrive. */
export function boldChance(option: Pick<TravelOption, "prep" | "rest" | "impress">): number {
  return Math.min(0.9, 0.4 + (option.prep ? 0.15 : 0) + (option.rest ? 0.1 : 0) + option.impress * 0.05);
}

export interface TripResult {
  fee: number;
  reputation: number;
  days: number;
  warmth: number;
  success: boolean;
  head: string;
  text: string;
}

/** What happens at the client. `roll` is a number in [0, 1). */
export function resolveTrip(gig: Gig, option: TravelOption, approach: GigApproach, roll: number): TripResult {
  const stage = FAMILY[gig.kind] === "buehne";
  let feeMul = 1;
  let reputation = 0;
  let dayDelta = 0;
  let warmth = 0;
  let success = true;
  let head = "";
  let text = "";
  if (approach === "safe") {
    if (gig.days >= 3) dayDelta = -1;
    head = stage ? "Freundlicher Applaus" : "Sauber erledigt";
    text =
      gig.days >= 3
        ? "Der Kunde ist zufrieden, und du bist einen Tag früher zurück."
        : "Der Kunde ist zufrieden. Niemand wird sich besonders an dich erinnern, aber das Honorar stimmt.";
  } else if (approach === "thorough") {
    feeMul = 1.2;
    dayDelta = 1;
    warmth = 10;
    success = roll < 0.5 + (option.prep ? 0.15 : 0);
    reputation = success ? 1 : 0;
    head = success ? "Das bleibt hängen" : "Gute Arbeit, wenig Echo";
    text = success
      ? "Du lieferst mehr als verlangt. Der Kunde zahlt einen Aufschlag und erzählt es weiter."
      : "Du lieferst mehr als verlangt und bekommst einen Aufschlag. Weitererzählt hat es leider niemand.";
  } else {
    success = roll < boldChance(option);
    feeMul = success ? 1.3 : 1;
    reputation = success ? 2 : -1;
    head = success ? (stage ? "Das Zitat des Tages" : "Volltreffer") : stage ? "Das kam nicht gut an" : "Der Kunde ist verstimmt";
    text = success
      ? stage
        ? "Deine These steht am nächsten Tag in der Zeitung. Danach klingelt das Telefon."
        : "Deine Empfehlung sitzt. Der Kunde zahlt einen Bonus, und die Branche spricht über dich."
      : stage
        ? "Ein Verbandschef widerspricht scharf, die Presse schreibt von einem Eklat."
        : "Der Kunde fühlt sich überrumpelt. Er zahlt, aber ein zweites Mal ruft er nicht an.";
  }
  if (option.impress >= 2) feeMul += 0.05;
  if (option.impress >= 3 && success) reputation += 1;
  return {
    fee: Math.round((gig.fee * feeMul) / 50) * 50,
    reputation,
    days: Math.max(1, gig.days + option.days + dayDelta),
    warmth,
    success,
    head,
    text,
  };
}
