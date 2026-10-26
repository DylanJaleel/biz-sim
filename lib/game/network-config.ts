// Stellschrauben des Netzwerks: Gegenseitigkeit, Bitten, Karrieren,
// Konkurrenz, Spezialisten und Veranstaltungen. Getrennt von config.ts, damit
// die Balance des Netzwerks für sich justiert werden kann.

/** Warmth lost per month by ring: close friends stay close, decision makers forget quickly. */
export const WARMTH_DECAY_RING = { 1: 2, 2: 3, 3: 4 } as const;

// Gegenseitigkeit (Vertrauenskonto)
/** Bounds of the trust account. */
export const BAL_MIN = -4;
export const BAL_MAX = 6;
/** At this balance a contact says no to every request. */
export const BAL_REFUSE = -4;
/** From this balance a contact helps more generously: stronger help, shorter pause, less warmth used. */
export const BAL_GENEROUS = 2;
export const GENEROUS = { strength: 1.2, cooldown: 2, warmthCost: 15 } as const;
/** Every so many months a negative balance moves one step back towards zero: people forgive slowly. */
export const BAL_FORGIVE_MONTHS = 6;
/** Help grows with the contact's career: per level this much stronger. */
export const LEVEL_STRENGTH = 0.15;

// Bitten der Kontakte
/** Chance per month that someone asks for a favour (more with more people who know you). */
export const FAVOR_CHANCE = 0.3;
export const FAVOR_CHANCE_PER_CONTACT = 0.015;
export const FAVOR_CHANCE_MAX = 0.5;
export const FAVOR_MAX_OPEN = 2;
/** A contact asks again at the earliest after so many months. */
export const FAVOR_PAUSE = 5;
/** Saying no and letting a request run out: warmth lost. */
export const FAVOR_DECLINE_WARMTH = 10;
export const FAVOR_LAPSE_WARMTH = 15;

// Karrieren
/** Chances per contact and month: promotion, change of employer, retirement (after years in the role). */
export const CAREER_CHANCE = { up: 0.007, move: 0.004, retire: 0.003 } as const;
export const RETIRE_AFTER = 48;
/** A successor starts with this share of the old warmth. */
export const SUCCESSOR_WARMTH = 0.35;

// Konkurrenz um Übernahmen
export const RIVAL_CHANCE = { deal: 0.25, addon: 0.2 } as const;
/** The rival pushes the asked price up by this share. */
export const RIVAL_PREMIUM = 0.06;
/** From this warmth the rival steps back. */
export const RIVAL_WARMTH = 50;
/** Chance per month that a rival tries to poach the searcher; the retention raise. */
export const POACH_CHANCE = 0.015;
export const POACH_RAISE = 0.15;

// Spezialisten für M&A und Private Equity
export const SPECIALIST_WARMTH_MIN = 35;
export const SPECIALIST_WARMTH_COST = 15;
export const SPECIALIST_DAYS = 1;
/** Share of the usual due diligence fee a friendly specialist charges. */
export const SPECIALIST_DD_SHARE = 0.5;
/** Leveraged finance: more room under the covenant (turns of EBITDA) and a lower rate. */
export const LEVFIN_HEADROOM = 0.5;
export const LEVFIN_RATE_CUT = 0.005;
/** Interim manager: months on site, fee, handover risks and integration odds while there. */
export const INTERIM = { months: 6, fee: 30_000, handoverRisk: 0.4, synergy: 0.15, churn: -0.15 } as const;
/** Antitrust lawyer: fee and the chance of a block with her filing. */
export const KARTELL = { fee: 8_000, block: 0.04 } as const;
/** A warm M&A boutique: more mandate offers per month. */
export const BOUTIQUE_MANDATE_BONUS = 0.08;

// Hinweis vor der Sitzung
export const HINT_WARMTH_MIN = 25;
export const HINT_WARMTH_COST = 10;

// Veranstaltungen
/** Warmth at an event: per known guest, plus when the event suits their interests. */
export const EVENT_WARMTH = 8;
export const EVENT_TRAIT_WARMTH = 4;
/** Chance to get to know a guest one has not met yet, and the warmth it starts with. */
export const EVENT_MEET_CHANCE = 0.4;
export const EVENT_MEET_WARMTH = 20;
/** A talk on stage: one more day. */
export const EVENT_TALK_DAYS = 1;
