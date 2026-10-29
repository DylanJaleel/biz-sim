// Stellschrauben für M&A-Mandate, das Nachfolge-Programm (Search Fund) und
// Buy-and-Build. Bewusst getrennt von config.ts, damit die Balance der übrigen
// Vermögenskurve unabhängig davon justiert werden kann.

import { BUYOUT_REPUTATION, BUYOUT_WORTH } from "./config";

// ---------------------------------------------------------------------------
// Bewertung nach EBITDA (Familienbetriebe aus dem Nachfolge-Programm)
// ---------------------------------------------------------------------------

/** Size curve: a company with this annual EBITDA is worth MULTIPLE_AT_BASE times its EBITDA. */
export const EBITDA_BASE = 200_000;
export const MULTIPLE_AT_BASE = 4;
/** Each doubling of EBITDA adds this much to the multiple (bigger firms are safer, more buyers can afford them). */
export const MULTIPLE_PER_DOUBLING = 0.55;
export const EBITDA_MULTIPLE_MIN = 2.5;
export const EBITDA_MULTIPLE_MAX = 10;
/** Monthly growth of 1 % adds this much to the multiple; capped both ways. */
export const MULTIPLE_PER_GROWTH_POINT = 1;
export const MULTIPLE_GROWTH_CAP: [number, number] = [-1.5, 0.6];
/** A company without operating profit is worth this share of its annual revenue (substance only). */
export const LOSS_MAKER_REVENUE_MULTIPLE = 0.2;

/** Share of running costs that moves with revenue (staff, rent, energy follow the business). */
export const COST_FLEX = 0.7;
/** Family businesses do not grow like startups: monthly growth is capped. */
export const EBITDA_GROWTH_CAP = 0.005;
/** Margins revert: above this multiple of the margin at purchase, competition and wages eat a share of the excess each month. */
export const MARGIN_CEILING = 1.25;
export const MARGIN_REVERSION = 0.15;
/** Share of the gap to the gross margin at purchase that closes each month. */
export const GROSS_MARGIN_REVERSION = 0.1;
/** Equity is never valued at exactly zero (keeps share maths sane): a sliver of annual revenue. */
export const EQUITY_FLOOR = 0.02;

/** Business cycle: monthly revenue change of family businesses by market regime. */
export const CYCLE_REVENUE = { boom: 0.003, normal: 0, weak: -0.005, crash: -0.015 } as const;

// ---------------------------------------------------------------------------
// Due Diligence
// ---------------------------------------------------------------------------

export type DdModule = "financial" | "legal" | "tax" | "commercial";
export const DD_MODULES: DdModule[] = ["financial", "legal", "tax", "commercial"];
/** Cost of an external review as a share of the price, with a floor; each costs one working day. */
export const DD_COST: Record<DdModule, { share: number; min: number }> = {
  financial: { share: 0.008, min: 12_000 },
  legal: { share: 0.005, min: 9_000 },
  tax: { share: 0.004, min: 7_000 },
  commercial: { share: 0.006, min: 9_000 },
};
/** Chance that a family business hides 0, 1 or 2 problems. */
export const FINDING_COUNT_CHANCE = [0.35, 0.45, 0.2] as const;

// ---------------------------------------------------------------------------
// M&A-Mandate (Investment Banking)
// ---------------------------------------------------------------------------

export const MANDATE_REPUTATION = 35;
/** Chance of a new mandate offer per month, more with a warm bank contact (and from the top five of the league table). */
export const MANDATE_CHANCE = 0.12;
export const MANDATE_WARM_BONUS = 0.1;
export const MANDATE_FROM_MONTH = 4;
/** Mandates running at the same time: alone one, with family office and an associate two. */
export const MANDATE_MAX_ACTIVE = 1;
/** Enterprise value of the client company by reputation; big ones need the family office. */
export const MANDATE_SIZE = [
  { from: 0, ev: [1_500_000, 4_000_000] },
  { from: 50, ev: [4_000_000, 12_000_000] },
  { from: 65, ev: [6_000_000, 15_000_000] },
] as const;
export const MANDATE_BIG_EV: [number, number] = [12_000_000, 30_000_000];
/** Fixed fee at signing plus a share of the enterprise value at closing (your share as senior adviser). */
export const MANDATE_RETAINER = { base: 4_000, share: 0.0003 } as const;
export const MANDATE_SUCCESS_FEE = 0.003;
export const MANDATE_MIN_SUCCESS_FEE = 10_000;
/** A happy client recommends you: a family business is offered to you directly. */
export const REFERRAL_CHANCE = 0.3;
/** Working days per step. */
export const MANDATE_DAYS = { accept: 1, comps: 1, value: 1, buyers: 1, ddEach: 1, exclusive: 1, auction: 2, final: 2, negotiate: 1, close: 1 } as const;
export const MANDATE_REPUTATION_GAIN = { happy: 3, ok: 2, unhappy: -1, failed: -2 } as const;
/** Confidentiality: in an auction with competitors at the table the news may leak. */
export const AUCTION_LEAK_CHANCE = 0.15;

// ---------------------------------------------------------------------------
// Nachfolge-Programm (Search Fund) und Übernahme
// ---------------------------------------------------------------------------

/** Same gate as succession offers in the deal flow (config.ts): buying needs it anyway. */
export const SEARCH_REPUTATION = BUYOUT_REPUTATION;
export const SEARCH_WORTH = BUYOUT_WORTH;
/** Months a search may run before the money is gone; no targets in the first months. */
export const SEARCH_MAX_MONTHS = 24;
export const SEARCH_QUIET_MONTHS = 3;
export const SEARCH_TARGET_CHANCE = 0.12;
export const SEARCH_START_DAYS = 2;
/** Share of the company the searcher gets at closing, per half year of good results, and at most. */
export const SEARCHER_EARN_IN = { closing: 8, step: 2, max: 25 } as const;
/** Size of a search target relative to the investor's net worth, with bounds. */
export const SEARCH_TARGET_EV: [number, number] = [0.5, 1.2];
export const SEARCH_TARGET_EV_BOUNDS: [number, number] = [1_500_000, 30_000_000];

/** The bank lends at most this multiple of EBITDA and this share of the price. */
export const BANK_MAX_LEVERAGE = 3;
export const BANK_MAX_SHARE = 0.6;
/** Interest: base plus a spread per turn of leverage above two; market regime on top. */
export const BANK_RATE = 0.06;
export const BANK_SPREAD_PER_TURN = 0.005;
export const BANK_RATE_REGIME = { boom: -0.0025, normal: 0, weak: 0.005, crash: 0.01 } as const;
export const BANK_YEARS = 7;
/** Maximum net bank debt / EBITDA, tested every quarter. */
export const COVENANT = 3.5;
/** In breach: higher rate, no dividends, no add-ons; after two quarters the bank wants money. */
export const COVENANT_PENALTY_RATE = 0.02;
export const COVENANT_WAIVER_FEE = 0.005;
/** Dividends only while net bank debt / EBITDA stays below this. */
export const DIVIDEND_MAX_LEVERAGE = 2.5;
/** A forced sale brings this share of the enterprise value. */
export const FORCED_SALE = 0.7;
/** Minimum own money as a share of the price. */
export const MIN_EQUITY = 0.3;
export const VENDOR_MAX = 0.2;
export const VENDOR_RATE = 0.04;
export const VENDOR_MONTHS = 48;
export const EARNOUT_MAX = 0.15;
export const EARNOUT_MONTHS = 24;
/** Notary, lawyers, bank fees: share of the price paid by the buyer. */
export const TRANSACTION_COST = 0.015;
/** Bidding lower than asked: the seller agrees this often and gives this much. */
export const LOW_BID = { discount: 0.1, chance: 0.55 } as const;
/** Cash the company keeps at closing (cash-free, debt-free deal): months of costs. */
export const WORKING_CASH_MONTHS = 2;
export const ACQUIRE_DAYS = 3;
/** First twelve months: things that go wrong in the handover, per month. */
export const HANDOVER_MONTHS = 12;
export const HANDOVER_RISK = { patriarch: 0.035, customer: 0.04, keyPerson: 0.025 } as const;

// ---------------------------------------------------------------------------
// Buy-and-Build (Private Equity)
// ---------------------------------------------------------------------------

/** Above the family office (which the platform needs), so it is a step of its own. */
export const PLATFORM_REPUTATION = 78;
export const PLATFORM_MIN_EBITDA = 400_000;
export const PLATFORM_COST = 30_000;
export const PLATFORM_DAYS = 2;
export const ADDON_CHANCE = 0.3;
export const ADDON_MAX_OPEN = 2;
/** Add-on EBITDA as a share of the platform's, with a floor. */
export const ADDON_SIZE: [number, number] = [0.12, 0.4];
export const ADDON_MIN_EBITDA = 80_000;
/** The bank finances add-ons up to this pro-forma leverage. */
export const ADDON_MAX_LEVERAGE = 3.25;
export const INTEGRATION = {
  fast: { months: 4, synergy: 0.45, churn: 0.4, cost: 0.4 },
  careful: { months: 8, synergy: 0.65, churn: 0.2, cost: 0.6 },
} as const;
/** Cost savings when an integration works, as a share of the add-on's EBITDA. */
export const SYNERGY_SHARE = 0.2;
/** Revenue lost when customers leave during the integration, as a share of the add-on's revenue. */
export const CHURN_LOSS: [number, number] = [0.15, 0.35];
/** Above this annual revenue the competition authority looks at every add-on. */
export const ANTITRUST_REVENUE = 60_000_000;
export const ANTITRUST_BLOCK = 0.12;
export const ANTITRUST_MONTHS = 2;
/** Selling the platform: months until bids arrive, and the price factor of the process. */
export const PLATFORM_SALE = {
  exclusive: { months: 1, factor: [0.9, 1.0] },
  auction: { months: 2, factor: [0.98, 1.08] },
} as const;
export const PLATFORM_SALE_DAYS = { exclusive: 2, auction: 3 } as const;
