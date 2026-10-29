import { LAST, SECTORS } from "./dealgen";
import { sizeMultiple } from "./ebitda";
import { mnaRandom, solveEbitda } from "./lbo";
import { between, eur, generateFindings, mio, pickOf, roundTo, type Ctx } from "./mna-core";
import { teaserBidders, teaserEffect, teaserLeak } from "./teaser";
import type { BigMandate, Mandate, MandateBid, MandateLever, TeaserFact } from "./types";

export { teaserBidders, teaserEffect, teaserLeak };

// Große Mandate: Ein Konzern verkauft eine Sparte (Carve-out). Anders als bei
// den kleinen Mandaten gibt es einen Teaser, ein anonymes Kurzprofil für die
// Käufer, und danach drei Verhandlungsrunden mit den Bietern. Das Honorar
// steigt mit dem Preis.

/** From this reputation, with a family office, groups ask you to sell a division. */
export const BIG_MANDATE_REPUTATION = 80;
/** Share of mandate requests that are large ones, once you qualify (more from the top five of the league table). */
export const BIG_MANDATE_SHARE = 0.2;
export const BIG_MANDATE_TOP_SHARE = 0.3;
export const BIG_MANDATE_EV: [number, number] = [40_000_000, 200_000_000];
/** Retainer and success fee: bigger deal, smaller rate, much larger cheque. */
export const BIG_RETAINER = { base: 25_000, share: 0.0002 } as const;
export const BIG_SUCCESS_FEE = 0.0035;
/** An earn-out counts half for the fee and the client: it may never be paid. */
export const EARNOUT_WEIGHT = 0.5;
export const BIG_DAYS = { accept: 2, teaser: 2, round: 1 } as const;
export const BIG_ROUNDS = 3;

const GROUPS = ["Weidmann AG", "Kühlmann Group", "Hartwig Industrie AG", "Lindner Technologie SE", "Rauscher Holding AG", "Bergmann Werke AG", "Stellmacher Gruppe"];
const BIG_STRATEGICS = ["Kühnert Industries", "Valtra Group", "Seeberg Technologie", "Arnhold Konzern", "Ostwind Industrie", "Bauer & Lindqvist"];
const BIG_FINANCIALS = ["Cornerstone Partners", "Bluefield Capital", "Hohenstein Private Equity", "Northbridge Equity", "Atlas Mittelstand Fonds", "Silberbach Capital"];

export function bigFee(ev: number): number {
  return roundTo(ev * BIG_SUCCESS_FEE, 1000);
}

/** Value of a bid for fee and client: cash plus half the earn-out. */
export function bidValue(b: MandateBid): number {
  return b.ev + (b.earnout ?? 0) * EARNOUT_WEIGHT;
}

export function drawBigMandate(ctx: Ctx, r: () => number): Mandate {
  const state = ctx.state;
  const target = between(r, BIG_MANDATE_EV[0], BIG_MANDATE_EV[1]);
  const ebitda = roundTo(solveEbitda(target), 50_000);
  const fair = Math.round(sizeMultiple(ebitda) * between(r, 0.9, 1.12) * 10) / 10;
  const sec = pickOf(r, SECTORS);
  const idea = pickOf(r, sec.mittelstand);
  const company = `${idea.name[0]}${pickOf(r, LAST)}`;
  const city = pickOf(r, ["Mannheim", "Bremen", "Augsburg", "Kassel", "Chemnitz", "Ulm", "Wuppertal", "Regensburg"]);
  const client = pickOf(r, GROUPS);
  const ev = ebitda * fair;
  const wish = roundTo(ev * between(r, 1.02, 1.12), 100_000);
  const revenue = ebitda / 12 / between(r, 0.09, 0.15);
  const findings = generateFindings(r, { ev, ebitda: ebitda / 12, topCustomer: between(r, 0.1, 0.35), revenue, grossMargin: 0.35 });
  const unit = `${company} (${idea.tagline})`;
  const big: BigMandate = { unit, facts: teaserFacts(client, revenue * 12, ebitda / (revenue * 12), wish, findings), rounds: 0, log: [] };
  return {
    id: ctx.id("n"),
    month: state.month,
    side: "sell",
    client,
    company,
    sector: sec.sector,
    city,
    text: `Großmandat: ${client} verkauft die Tochter ${company} in ${city} (${idea.tagline}), einen Carve-out aus dem Konzern. EBITDA ${eur(ebitda)} im Jahr. Der Vorstand hofft auf ${mio(wish)}. Du schreibst den Teaser, führst das Bieterverfahren und verhandelst in drei Runden.`,
    ebitda,
    fair,
    wish,
    retainer: roundTo(BIG_RETAINER.base + ev * BIG_RETAINER.share, 1000),
    status: "offered",
    expires: state.month + 1,
    findings,
    big,
  };
}

function teaserFacts(group: string, revenue: number, margin: number, wish: number, findings: Mandate["findings"]): TeaserFact[] {
  const lo = Math.floor(revenue / 10_000_000) * 10;
  const facts: TeaserFact[] = [
    {
      id: "revenue",
      title: `Umsatz ${lo} bis ${lo + 10} Mio. € (als Spanne)`,
      text: "Zeigt die Größe, ohne die genaue Zahl zu nennen.",
      interest: 12,
      price: 6,
      conf: -2,
      cred: 8,
    },
    {
      id: "ebitda",
      title: `EBITDA-Marge ${Math.round(margin * 100)} %, Einmaleffekte erklärt`,
      text: "Bereinigte Zahl mit Brücke zur berichteten.",
      interest: 10,
      price: 12,
      conf: 0,
      cred: 8,
    },
    { id: "name", title: `Name des Verkäufers: ${group}`, text: "Zieht Käufer an, aber der Teaser ist nicht mehr anonym.", interest: 15, price: 8, conf: -35, cred: 0 },
    { id: "site", title: "Ein Standort wird zusammengelegt", text: "Der Betriebsrat erfährt es sonst aus zweiter Hand.", interest: -2, price: 4, conf: -20, cred: 4 },
    {
      id: "ask",
      title: `Preisvorstellung: ${mio(wish * 0.95)} bis ${mio(wish * 1.05)}`,
      text: "Setzt einen Anker, schreckt aber manche ab.",
      interest: -8,
      price: 14,
      conf: 0,
      cred: 0,
    },
    { id: "plan", title: "Auftragsbestand und Wachstumsplan", text: "Zeigt die Zukunft, nicht nur die Vergangenheit.", interest: 9, price: 9, conf: -3, cred: 4 },
  ];
  for (const f of findings)
    facts.push({
      id: `f-${f.kind}`,
      title: f.title,
      text: `Wesentlich: ${f.text} Wer es verschweigt, dem fällt es in der Prüfung der Käufer auf die Füße.`,
      interest: -5,
      price: -4,
      conf: 0,
      cred: 16,
      finding: f.kind,
    });
  return facts;
}

/** The teaser goes out: the client's known problems are in it or not. */
export function sendTeaser(ctx: Ctx, md: Mandate, ids: string[]): void {
  const big = md.big!;
  if (md.status !== "prep") ctx.fail("Der Teaser gehört in die Vorbereitung.");
  if (big.teaser) ctx.fail("Der Teaser ist schon raus.");
  const valid = ids.filter((id) => big.facts.some((f) => f.id === id));
  if (valid.length < 2) ctx.fail("Ein Teaser braucht mindestens zwei Angaben.");
  ctx.spend("mandate", `Mandat ${md.company}: Teaser`, BIG_DAYS.teaser);
  big.teaser = valid;
  big.effect = teaserEffect(big.facts, valid);
  big.concealed = big.facts.filter((f) => f.finding && !valid.includes(f.id)).map((f) => f.finding!);
  for (const f of md.findings) f.found = !big.concealed.includes(f.kind);
  ctx.lesson("teaser");
}

/** Month end after the launch: the bidders the teaser attracted make their first offers. */
export function bigBids(ctx: Ctx, md: Mandate, credit: number): MandateBid[] {
  const state = ctx.state;
  const r = mnaRandom(state, `bigbids|${md.id}`);
  const e = md.big!.effect ?? teaserEffect(md.big!.facts, []);
  const disclosed = md.findings.filter((f) => f.found).reduce((p, f) => p * (1 - f.priceCut * 0.4), 1);
  md.leak = r() < teaserLeak(e.conf) * (md.process === "auction" ? 1 : 0.5);
  const leak = md.leak ? 0.95 : 1;
  const priceFactor = 1 + (e.price - 50) / 400;
  const asking = md.multiple! * md.ebitda;
  const pool: { buyer: string; kind: "strategic" | "financial" }[] = [];
  const strategic = [...BIG_STRATEGICS];
  const financial = [...BIG_FINANCIALS];
  const n = teaserBidders(e.interest);
  for (let i = 0; i < n; i++) {
    const kind = md.buyers === "strategic" ? "strategic" : md.buyers === "financial" ? "financial" : i % 2 === 0 ? "strategic" : "financial";
    const list = kind === "strategic" ? strategic : financial;
    pool.push({ buyer: list.splice(Math.floor(r() * list.length) % list.length, 1)[0]!, kind });
  }
  const bids: MandateBid[] = [];
  for (const p of pool) {
    const factor = p.kind === "strategic" ? between(r, 0.95, 1.22) : between(r, 0.88, 1.08) * credit;
    const max = roundTo(md.ebitda * md.fair * factor * disclosed * leak * priceFactor, 100_000);
    if (max < asking * 0.85) continue;
    const mood = Math.round(Math.max(35, Math.min(90, 45 + e.cred / 2 + between(r, -10, 10))));
    bids.push({ buyer: p.buyer, kind: p.kind, ev: roundTo(max * between(r, 0.84, 0.92), 100_000), max, mood });
  }
  return bids.sort((a, b) => b.ev - a.ev).slice(0, md.process === "auction" ? 4 : 1);
}

export const LEVER_TEXT: Record<MandateLever, { title: string; text: string }> = {
  bnf: { title: "Best and final fordern", text: "Der Bieter nennt sein letztes Gebot. Hebt den Preis deutlich, aber die Stimmung leidet; wer verärgert ist, steigt aus." },
  exclusive: { title: "Exklusivität gegen Preis", text: "Zwei Wochen Alleinverhandlung für einen kleinen Aufschlag. Die anderen Bieter ziehen sich zurück." },
  earnout: { title: "Earn-out statt Festpreis", text: "Ein Teil des Preises hängt an künftigen Zahlen. Die Schlagzeile steigt um 10 %, der sichere Barteil nicht." },
  batna: { title: "Zweitbieter ausspielen", text: "Du nennst die Konkurrenzgebote. Wirkt umso stärker, je mehr Bieter noch dabei sind." },
};

/** Negotiating power: more bidders still at the table, more power. */
export function bigPower(md: Mandate): number {
  const active = (md.bids ?? []).filter((b) => !b.out).length;
  return Math.max(0, Math.min(100, 30 + active * 18 - (md.big?.exclusive ? 15 : 0)));
}

/** One negotiation round: a lever on one bidder. */
export function playRound(ctx: Ctx, md: Mandate, bidder: string | undefined, lever: MandateLever | undefined): void {
  const big = md.big!;
  if (md.status !== "bids" || !md.bids?.length) ctx.fail("Es liegt kein Angebot vor.");
  if (big.rounds >= BIG_ROUNDS) ctx.fail("Drei Runden sind gespielt. Erteile jetzt den Zuschlag.");
  const b = md.bids!.find((x) => x.buyer === bidder && !x.out);
  if (!b || !lever) ctx.fail("Wähle einen Bieter, der noch dabei ist, und einen Hebel.");
  if (big.exclusive && big.exclusive !== b!.buyer) ctx.fail(`Du verhandelst exklusiv mit ${big.exclusive}.`);
  ctx.spend("mandate", `Mandat ${md.company}: Verhandlungsrunde ${big.rounds + 1}`, BIG_DAYS.round);
  const bid = b!;
  const max = bid.max ?? bid.ev;
  const power = bigPower(md);
  let text = "";
  if (lever === "bnf") {
    bid.ev = roundTo(bid.ev + Math.max(0, max - bid.ev) * 0.6, 100_000);
    bid.mood = (bid.mood ?? 60) - 14;
    text = `${bid.buyer} nennt ein letztes Gebot: ${mio(bid.ev + (bid.earnout ?? 0))}.`;
    if (bid.mood < 30) {
      bid.out = true;
      text += " Die Stimmung kippt, der Bieter steigt aus.";
    }
  } else if (lever === "exclusive") {
    bid.ev = roundTo(Math.min(max, bid.ev * 1.03), 100_000);
    bid.mood = Math.min(100, (bid.mood ?? 60) + 10);
    big.exclusive = bid.buyer;
    for (const o of md.bids!) if (o !== bid) o.out = true;
    text = `${bid.buyer} zahlt für zwei Wochen Exklusivität einen Aufschlag: ${mio(bid.ev + (bid.earnout ?? 0))}. Die anderen Bieter ziehen sich zurück.`;
  } else if (lever === "earnout") {
    bid.earnout = roundTo((bid.earnout ?? 0) + bid.ev * 0.1, 100_000);
    bid.mood = Math.min(100, (bid.mood ?? 60) + 3);
    text = `${bid.buyer} bietet einen Earn-out: Schlagzeile ${mio(bid.ev + bid.earnout)}, bar bleiben ${mio(bid.ev)}. Ob der Rest kommt, hängt an den Zahlen der nächsten Jahre.`;
  } else {
    const others = md.bids!.filter((x) => !x.out && x !== bid).length;
    const gain = others > 0 ? Math.max(0, max - bid.ev) * 0.35 * (power / 100) * 1.4 : Math.max(0, max - bid.ev) * 0.05;
    bid.ev = roundTo(Math.min(max, bid.ev + gain), 100_000);
    bid.mood = (bid.mood ?? 60) - 5;
    text =
      others > 0
        ? `Du nennst die Konkurrenzgebote. ${bid.buyer} legt nach: ${mio(bid.ev + (bid.earnout ?? 0))}.`
        : `Ohne zweiten Bieter wirkt der Hinweis kaum. ${bid.buyer} bleibt bei ${mio(bid.ev)}.`;
  }
  big.rounds += 1;
  big.log.push(`Runde ${big.rounds}: ${text}`);
  ctx.lesson("batna");
  if (md.bids!.every((x) => x.out)) {
    // Everyone left: the best of them comes back at its first price, but the client notices.
    const back = [...md.bids!].sort((x, y) => y.ev - x.ev)[0]!;
    back.out = false;
    back.mood = 30;
    big.log.push(`${back.buyer} kommt zurück an den Tisch, aber verärgert.`);
  }
}

/** The best bid still on the table (by value for the client). */
export function bestBig(md: Mandate): MandateBid {
  return [...(md.bids ?? [])].filter((b) => !b.out).sort((a, b) => bidValue(b) - bidValue(a))[0] ?? md.bids![0]!;
}
