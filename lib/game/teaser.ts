import type { TeaserFact } from "./types";

// Was ein Teaser am Markt bewirkt. Reine Rechnung ohne Spielzustand, damit
// das Formular im Browser die Wirkung sofort zeigen kann.

/** Teaser meters start here (0..100). */
const TEASER_BASE = { interest: 40, price: 40, conf: 90, cred: 40 };

/** What a teaser with these facts does at the market (0..100 each). */
export function teaserEffect(facts: TeaserFact[], ids: string[]): { interest: number; price: number; conf: number; cred: number } {
  const e = { ...TEASER_BASE };
  for (const f of facts.filter((x) => ids.includes(x.id))) {
    e.interest += f.interest;
    e.price += f.price;
    e.conf += f.conf;
    e.cred += f.cred;
  }
  const c = (v: number) => Math.max(0, Math.min(100, v));
  return { interest: c(e.interest), price: c(e.price), conf: c(e.conf), cred: c(e.cred) };
}

/** Bidders the teaser attracts (before the price filter). */
export function teaserBidders(interest: number): number {
  return Math.max(2, Math.min(5, Math.round(2 + interest / 25)));
}

/** Leak risk of a teaser. */
export function teaserLeak(conf: number): number {
  return Math.round((100 - conf) * 0.6) / 100;
}
