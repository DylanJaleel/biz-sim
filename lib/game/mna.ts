import { BUYOUT_REPUTATION } from "./config";
import { LAST, SECTORS } from "./dealgen";
import { sizeMultiple } from "./ebitda";
import { mnaRandom, solveEbitda, targetDeal } from "./lbo";
import {
  AUCTION_LEAK_CHANCE,
  DD_MODULES,
  MANDATE_BIG_EV,
  MANDATE_CHANCE,
  MANDATE_DAYS,
  MANDATE_FROM_MONTH,
  MANDATE_MAX_ACTIVE,
  MANDATE_MIN_SUCCESS_FEE,
  MANDATE_REPUTATION,
  MANDATE_REPUTATION_GAIN,
  MANDATE_RETAINER,
  MANDATE_SIZE,
  MANDATE_SUCCESS_FEE,
  MANDATE_WARM_BONUS,
  REFERRAL_CHANCE,
  type DdModule,
} from "./mna-config";
import { between, eur, generateFindings, mio, mnaOf, pickOf, roundTo, times, type Ctx } from "./mna-core";
import { BOUTIQUE_MANDATE_BONUS } from "./network-config";
import type { BuyerFocus, GameAction, GameState, IncomeLines, Mandate, MandateBid, ProcessKind } from "./types";

// M&A-Mandate: Du berätst einen Familienunternehmer beim Verkauf oder einen
// Käufer beim Kauf. Wenige Entscheidungen über ein bis drei Monate: Preis,
// Käuferkreis, Prozess, Prüfung. Bezahlt wird ein fester Betrag zu Beginn und
// ein Erfolgshonorar beim Abschluss. Wer zu viel verlangt, verliert den Deal;
// wer zu wenig verlangt, verliert den Mandanten.

const STRATEGIC_NAMES = ["Brenner Gruppe", "Hofmann Industrie", "Nordwerk Holding", "Albrecht & Söhne", "Vogel Konzern", "Weser Gruppe"];
const FINANCIAL_NAMES = ["Hanse Capital Partners", "Alpenblick Private Equity", "Rheintal Capital", "Nordkap Buyout Fonds", "Elbtal Beteiligungen", "Isarwerk Partners"];
const CREDIT = { boom: 1.05, normal: 1, weak: 0.92, crash: 0.8 } as const;

export function activeMandates(state: GameState): Mandate[] {
  return (state.mna?.mandates ?? []).filter((m) => ["prep", "marketing", "bids", "signing"].includes(m.status));
}

export function mandateCapacity(state: GameState): number {
  const associate = state.team.some((t) => t.role === "associate");
  return MANDATE_MAX_ACTIVE + (state.familyOffice !== undefined && associate ? 1 : 0);
}

export function mandateFee(ev: number): number {
  return roundTo(Math.max(MANDATE_MIN_SUCCESS_FEE, ev * MANDATE_SUCCESS_FEE), 1000);
}

function sizeRange(state: GameState): [number, number] {
  const tier = [...MANDATE_SIZE].reverse().find((t) => state.reputation >= t.from) ?? MANDATE_SIZE[0];
  return [tier.ev[0], tier.ev[1]];
}

/** Month start: now and then a family business or a buyer asks for advice. */
export function planMandates(ctx: Ctx): void {
  const state = ctx.state;
  const m = mnaOf(state);
  for (const x of m.mandates.filter((y) => y.status === "offered" && y.expires < state.month)) x.status = "expired";
  m.mandates = m.mandates.filter((x) => !["expired", "declined"].includes(x.status) || x.month > state.month - 3);
  if (m.mandates.length > 24)
    m.mandates = m.mandates
      .filter((x) => x.status !== "closed" && x.status !== "failed")
      .concat(m.mandates.filter((x) => x.status === "closed" || x.status === "failed").slice(-12));
  if (state.month < MANDATE_FROM_MONTH || state.reputation < MANDATE_REPUTATION) return;
  if (m.mandates.some((x) => x.status === "offered")) return;
  const r = mnaRandom(state, `mandate|${state.month}`);
  const warm = state.contacts.some((c) => c.id === "bank" && c.met && c.warmth >= 40);
  const boutique = state.contacts.some((c) => c.id === "boutique" && c.met && c.warmth >= 40);
  if (r() > MANDATE_CHANCE + (warm ? MANDATE_WARM_BONUS : 0) + (boutique ? BOUTIQUE_MANDATE_BONUS : 0)) return;
  m.mandates.push(drawMandate(ctx, r));
}

/** A mandate offered through the network (M&A boutique, a conference): at once, if none is waiting. */
export function offerMandate(ctx: Ctx): void {
  const state = ctx.state;
  const m = mnaOf(state);
  if (state.reputation < MANDATE_REPUTATION || m.mandates.some((x) => x.status === "offered")) return;
  m.mandates.push(drawMandate(ctx, mnaRandom(state, `mandate-net|${state.month}|${state.counter}`)));
  ctx.mail({
    kind: "system",
    from: "Netzwerk",
    subject: "Neue Mandatsanfrage",
    body: "Über dein Netzwerk fragt jemand nach einem M&A-Berater. Die Anfrage findest du bei deinen Aufträgen.",
  });
}

function drawMandate(ctx: Ctx, r: () => number): Mandate {
  const state = ctx.state;
  const big = state.familyOffice !== undefined && state.reputation >= 70 && r() < 0.3;
  const [lo, hi] = big ? MANDATE_BIG_EV : sizeRange(state);
  const target = between(r, lo, hi);
  const ebitda = roundTo(solveEbitda(target), 10_000);
  const fair = Math.round(sizeMultiple(ebitda) * between(r, 0.88, 1.15) * 10) / 10;
  const sec = pickOf(r, SECTORS);
  const idea = pickOf(r, sec.mittelstand);
  const company = `${idea.name[0]}${pickOf(r, LAST)}`;
  const city = pickOf(r, ["Bielefeld", "Würzburg", "Osnabrück", "Heilbronn", "Paderborn", "Siegen", "Ingolstadt", "Göttingen", "Lübeck", "Koblenz"]);
  const side = r() < 0.65 ? "sell" : "buy";
  const owner = `${pickOf(r, ["Familie", "Inhaber", "Inhaberin"])} ${pickOf(r, LAST)}`;
  const buyerKind = r() < 0.5 ? "strategic" : "financial";
  const client = side === "sell" ? owner : pickOf(r, buyerKind === "strategic" ? STRATEGIC_NAMES : FINANCIAL_NAMES);
  const ev = ebitda * fair;
  const wish = roundTo(side === "sell" ? ev * between(r, 1.0, 1.15) : ev * between(r, 0.98, 1.06), 10_000);
  const revenue = ebitda / 12 / between(r, 0.08, 0.16);
  const text =
    side === "sell"
      ? `${owner} will ${company} in ${city} verkaufen (${idea.tagline}). EBITDA ${eur(ebitda)} im Jahr. Die Familie hofft auf ${mio(wish)}. Du führst den Verkauf: Preis, Käufer, Prozess.`
      : `${client} will ${company} in ${city} kaufen (${idea.tagline}). EBITDA ${eur(ebitda)} im Jahr. Mehr als ${mio(wish)} will ${client} nicht zahlen. Du führst die Verhandlung für den Käufer.`;
  return {
    id: ctx.id("n"),
    month: state.month,
    side,
    client,
    company,
    sector: sec.sector,
    city,
    text,
    ebitda,
    fair,
    wish,
    retainer: roundTo(MANDATE_RETAINER.base + ev * MANDATE_RETAINER.share, 1000),
    status: "offered",
    expires: state.month + 1,
    findings: generateFindings(r, { ev, ebitda: ebitda / 12, topCustomer: between(r, 0.1, 0.45), revenue, grossMargin: 0.35 }),
  };
}

// ---------------------------------------------------------------------------
// Schritte des Mandats
// ---------------------------------------------------------------------------

type MandateAction = Extract<GameAction, { type: "mandate" }>;

export function playMandate(ctx: Ctx, a: MandateAction): void {
  const state = ctx.state;
  const m = mnaOf(state).mandates.find((x) => x.id === a.mandateId);
  if (!m) ctx.fail("Dieses Mandat gibt es nicht.");
  const md = m!;
  switch (a.move) {
    case "accept": {
      if (md.status !== "offered") ctx.fail("Dieses Mandat liegt nicht mehr vor.");
      if (state.reputation < MANDATE_REPUTATION) ctx.fail(`M&A-Mandate bekommst du ab ${MANDATE_REPUTATION} Ruf.`);
      if (activeMandates(state).length >= mandateCapacity(state)) ctx.fail("Du betreust schon so viele Mandate, wie du schaffst. Mit Family Office und Associate werden es zwei.");
      if (md.ebitda * md.fair > MANDATE_BIG_EV[0] && state.familyOffice === undefined) ctx.fail("Ein Mandat dieser Größe braucht ein Team. Gründe zuerst dein Family Office.");
      ctx.spend("mandate", `Mandat ${md.company}: Auftakt`, MANDATE_DAYS.accept);
      md.status = "prep";
      md.accepted = state.month;
      ctx.lesson("ebitda_multiple");
      return;
    }
    case "decline": {
      if (md.status !== "offered") ctx.fail("Dieses Mandat liegt nicht mehr vor.");
      md.status = "declined";
      return;
    }
    case "comps": {
      if (md.status !== "prep") ctx.fail("Die Vergleichsanalyse gehört in die Vorbereitung.");
      if (md.comps) ctx.fail("Die Vergleichsanalyse liegt schon vor.");
      ctx.spend("mandate", `Mandat ${md.company}: Vergleichsanalyse`, MANDATE_DAYS.comps);
      const r = mnaRandom(state, `comps|${md.id}`);
      md.comps = [Math.round(md.fair * between(r, 0.84, 0.95) * 10) / 10, Math.round(md.fair * between(r, 1.05, 1.16) * 10) / 10];
      ctx.lesson("ebitda_multiple");
      return;
    }
    case "launch": {
      if (md.status !== "prep") ctx.fail("Der Prozess läuft schon.");
      const multiple = a.multiple;
      if (multiple === undefined || !Number.isFinite(multiple) || multiple < 2 || multiple > 15) ctx.fail("Wähle ein Vielfaches des EBITDA zwischen 2 und 15.");
      const process: ProcessKind = a.process ?? "exclusive";
      const buyers: BuyerFocus = md.side === "sell" ? (a.buyers ?? "mixed") : "mixed";
      const dd = DD_MODULES.filter((x) => (a.dd ?? []).includes(x));
      const days =
        MANDATE_DAYS.value +
        (md.side === "sell" ? MANDATE_DAYS.buyers : 0) +
        dd.length * MANDATE_DAYS.ddEach +
        (process === "auction" ? MANDATE_DAYS.auction : MANDATE_DAYS.exclusive);
      ctx.spend("mandate", `Mandat ${md.company}: ${md.side === "sell" ? "Verkaufsprozess" : "Angebot"} vorbereiten`, days);
      md.multiple = Math.round(multiple! * 10) / 10;
      md.process = process;
      md.buyers = buyers;
      md.dd = dd;
      for (const f of md.findings) if (dd.includes(f.module)) f.found = true;
      md.status = "marketing";
      md.due = state.month;
      if (dd.length > 0) ctx.lesson("dd_bausteine");
      if (process === "auction") ctx.lesson("bieterverfahren");
      return;
    }
    case "accept_bid": {
      if (md.status !== "bids" || !md.bids?.length) ctx.fail("Es liegt kein Angebot vor.");
      if (md.side === "buy" && md.process === "auction") ctx.fail("Ein anderer Bieter liegt vorn: nachbessern oder aussteigen.");
      ctx.spend("mandate", `Mandat ${md.company}: Zuschlag`, MANDATE_DAYS.close);
      md.signed = md.side === "buy" ? { buyer: md.client, kind: "financial", ev: best(md.bids!).ev } : best(md.bids!);
      md.status = "signing";
      md.due = state.month;
      return;
    }
    case "final": {
      if (md.status !== "bids" || !md.bids?.length) ctx.fail("Es liegt kein Angebot vor.");
      if (md.side === "sell" && (md.process !== "auction" || md.bids!.length < 2)) ctx.fail("Eine zweite Bieterrunde braucht ein Bieterverfahren mit mindestens zwei Bietern.");
      ctx.spend("mandate", `Mandat ${md.company}: ${md.side === "sell" ? "Finale Runde" : "Nachbessern"}`, MANDATE_DAYS.final);
      const r = mnaRandom(state, `final|${md.id}`);
      const sorted = [...md.bids!].sort((x, y) => y.ev - x.ev);
      if (md.side === "sell") {
        if (r() < 0.15) md.signed = { ...sorted[1]!, ev: roundTo(sorted[1]!.ev * between(r, 1.0, 1.04), 10_000) };
        else md.signed = { ...sorted[0]!, ev: roundTo(sorted[0]!.ev * between(r, 1.03, 1.08), 10_000) };
      } else {
        // Buy side: raise the bid to beat the rival; the client pays more.
        md.signed = { buyer: md.client, kind: "financial", ev: roundTo(sorted[0]!.ev * 1.03, 10_000) };
      }
      md.status = "signing";
      md.due = state.month;
      return;
    }
    case "negotiate": {
      if (md.status !== "bids" || !md.bids?.length) ctx.fail("Es liegt kein Angebot vor.");
      if (md.process === "auction")
        ctx.fail(md.side === "sell" ? "Im Bieterverfahren gibt es die finale Runde statt Nachverhandlung." : "Im Bieterverfahren kannst du nur nachbessern.");
      ctx.spend("mandate", `Mandat ${md.company}: Nachverhandlung`, MANDATE_DAYS.negotiate);
      const r = mnaRandom(state, `negotiate|${md.id}`);
      const top = best(md.bids!);
      const roll = r();
      if (roll < 0.25) {
        fail(ctx, md, md.side === "sell" ? `${top.buyer} hat genug und zieht sich zurück.` : "Der Verkäufer bricht die Gespräche ab.");
        return;
      }
      const better = roll < 0.75;
      const ev = roundTo(top.ev * (better ? (md.side === "sell" ? 1.05 : 0.96) : 1), 10_000);
      md.signed = md.side === "buy" ? { buyer: md.client, kind: "financial", ev } : { ...top, ev };
      md.status = "signing";
      md.due = state.month;
      return;
    }
  }
}

function best(bids: MandateBid[]): MandateBid {
  return [...bids].sort((a, b) => b.ev - a.ev)[0]!;
}

// ---------------------------------------------------------------------------
// Monatsende: Angebote, Prüfung des Käufers, Abschluss
// ---------------------------------------------------------------------------

export function mandatesMonth(ctx: Ctx, month: number, notes: string[], income: IncomeLines): void {
  const state = ctx.state;
  for (const md of mnaOf(state).mandates) {
    if (md.accepted === month && md.status !== "offered") {
      state.cash += md.retainer;
      income.mandates = (income.mandates ?? 0) + md.retainer;
      mnaOf(state).record.mandateFees += md.retainer;
    }
    if (md.status === "prep" && md.accepted !== undefined && month - md.accepted >= 1) {
      fail(ctx, md, `${md.client} wartet seit zwei Monaten auf den Start und beendet das Mandat.`);
      continue;
    }
    if (md.status === "bids" && (md.due ?? month) < month) {
      // The client does not wait for ever.
      if (md.side === "buy" && md.process === "auction") {
        fail(ctx, md, "Ein anderer Bieter hat den Zuschlag bekommen.");
        continue;
      }
      if (md.side === "buy" && best(md.bids!).ev > md.wish * 1.05) {
        fail(ctx, md, `Der Verkäufer will mehr, als ${md.client} zahlen mag. Die Gespräche sind beendet.`);
        continue;
      }
      md.signed = md.side === "buy" ? { buyer: md.client, kind: "financial", ev: best(md.bids!).ev } : best(md.bids!);
      md.status = "signing";
      md.due = month;
      notes.push(`Mandat ${md.company}: ${md.client} hat ohne dich entschieden.`);
    }
    if (md.status === "marketing" && (md.due ?? 0) <= month) {
      if (md.side === "sell") sellBids(ctx, md);
      else buyResponse(ctx, md);
      continue;
    }
    if (md.status === "signing" && (md.due ?? 0) <= month) close(ctx, md, notes, income);
  }
}

function sellBids(ctx: Ctx, md: Mandate): void {
  const state = ctx.state;
  const r = mnaRandom(state, `bids|${md.id}`);
  const credit = CREDIT[state.market.regime];
  const disclosed = md.findings.filter((f) => f.found).reduce((p, f) => p * (1 - f.priceCut * 0.4), 1);
  const strategics = md.buyers === "financial" ? 0 : md.buyers === "strategic" ? 3 : 2;
  const financials = md.buyers === "strategic" ? 0 : md.buyers === "financial" ? 4 : 3;
  md.leak = md.process === "auction" && strategics > 0 && r() < AUCTION_LEAK_CHANCE;
  const leak = md.leak ? 0.95 : 1;
  const asking = md.multiple! * md.ebitda;
  const pool: (MandateBid & { max: number })[] = [];
  const names = { strategic: [...STRATEGIC_NAMES], financial: [...FINANCIAL_NAMES] };
  const add = (kind: "strategic" | "financial") => {
    const list = names[kind];
    const buyer = list.splice(Math.floor(r() * list.length) % list.length, 1)[0]!;
    const factor = kind === "strategic" ? between(r, 0.95, 1.25) : between(r, 0.85, 1.07) * credit;
    pool.push({ buyer, kind, ev: 0, max: md.ebitda * md.fair * factor * disclosed * leak });
  };
  for (let i = 0; i < strategics; i++) add("strategic");
  for (let i = 0; i < financials; i++) add("financial");
  const keen = pool.filter((b) => b.max >= asking * 0.85).sort((a, b) => b.max - a.max);
  let bids: MandateBid[];
  if (md.process === "auction") bids = keen.map((b) => ({ buyer: b.buyer, kind: b.kind, ev: roundTo(b.max * between(r, 0.88, 0.97), 10_000) }));
  else bids = keen.slice(0, 1).map((b) => ({ buyer: b.buyer, kind: b.kind, ev: roundTo(Math.min(b.max * 0.95, Math.max(asking, b.max * 0.8)), 10_000) }));
  if (bids.length === 0) {
    fail(ctx, md, `Bei ${times(md.multiple!)} EBITDA hat niemand geboten. Die Preisvorstellung war zu hoch für diesen Markt.`);
    offerCompany(ctx, md);
    return;
  }
  md.bids = bids;
  md.status = "bids";
  md.due = state.month + 1;
  ctx.mail({
    kind: "system",
    from: `Mandat ${md.company}`,
    subject: `${md.company}: ${bids.length === 1 ? "ein Angebot" : `${bids.length} Angebote`}`,
    body: `${md.leak ? "Im Bieterverfahren ist etwas durchgesickert: Kunden und Mitarbeiter haben vom Verkauf erfahren, die Angebote fallen etwas niedriger aus. " : ""}Bestes Angebot: ${mio(best(bids).ev)} von ${best(bids).buyer} (${times(best(bids).ev / md.ebitda)} EBITDA). Entscheide im Mandat, wie es weitergeht: Zuschlag, Nachverhandlung oder finale Runde.`,
  });
}

function buyResponse(ctx: Ctx, md: Mandate): void {
  const state = ctx.state;
  const r = mnaRandom(state, `response|${md.id}`);
  const found = md.findings.filter((f) => f.found).reduce((p, f) => p * (1 - f.priceCut), 1);
  const bid = md.multiple! * md.ebitda;
  const reservation = md.ebitda * md.fair * between(r, 0.9, 1.05) * found;
  if (md.process === "auction") {
    const rival = md.ebitda * md.fair * between(r, 0.95, 1.2) * found;
    const ours = bid * (1 - (1 - found) * 0.5);
    md.bids = [{ buyer: ours >= rival ? md.client : pickOf(r, FINANCIAL_NAMES), kind: "financial", ev: roundTo(Math.max(ours, rival), 10_000) }];
    if (ours >= rival) {
      md.signed = { buyer: md.client, kind: "financial", ev: roundTo(ours, 10_000) };
      md.status = "signing";
      md.due = state.month + 1;
      ctx.mail({
        kind: "system",
        from: `Mandat ${md.company}`,
        subject: `${md.company}: Zuschlag für ${md.client}`,
        body: `Euer Gebot über ${mio(ours)} ist das beste. Jetzt folgt der Vertrag.`,
      });
    } else {
      md.status = "bids";
      md.due = state.month + 1;
      ctx.mail({
        kind: "system",
        from: `Mandat ${md.company}`,
        subject: `${md.company}: Ein anderer Bieter liegt vorn`,
        body: `Ein Konkurrent bietet ${mio(rival)}. Ihr könnt nachbessern (dann zahlt ${md.client} mehr) oder aussteigen.`,
      });
    }
    return;
  }
  const price = Math.max(reservation, bid * found);
  md.bids = [{ buyer: "Verkäufer", kind: "strategic", ev: roundTo(bid >= reservation ? price : reservation * between(r, 1.0, 1.05), 10_000) }];
  md.status = "bids";
  md.due = state.month + 1;
  ctx.mail({
    kind: "system",
    from: `Mandat ${md.company}`,
    subject: `${md.company}: Antwort des Verkäufers`,
    body:
      bid >= reservation
        ? `Der Verkäufer nimmt an: ${mio(md.bids[0]!.ev)}. ${found < 1 ? "Die gefundenen Mängel haben den Preis gedrückt." : ""}`
        : `Der Verkäufer will mehr: ${mio(md.bids[0]!.ev)}. Annehmen oder nachverhandeln?`,
  });
}

function close(ctx: Ctx, md: Mandate, notes: string[], income: IncomeLines): void {
  const state = ctx.state;
  const r = mnaRandom(state, `close|${md.id}`);
  let ev = md.signed!.ev;
  const texts: string[] = [];
  if (md.side === "sell") {
    // The buyer's own review: what the vendor review did not show comes up now.
    for (const f of md.findings.filter((x) => !x.found)) {
      const roll = r();
      if (roll < 0.5) {
        ev = roundTo(ev * (1 - f.priceCut), 10_000);
        texts.push(`Der Käufer findet: ${f.title}. Der Preis sinkt um ${Math.round(f.priceCut * 100)} %.`);
      } else if (roll < 0.75) {
        const rest = (md.bids ?? []).filter((b) => b.buyer !== md.signed!.buyer).sort((a, b) => b.ev - a.ev)[0];
        if (!rest) {
          fail(ctx, md, `Der Käufer findet: ${f.title}. Er steigt aus, ein zweiter Bieter ist nicht da.`);
          return;
        }
        ev = roundTo(rest.ev * 0.97, 10_000);
        texts.push(`${md.signed!.buyer} steigt nach der Prüfung aus (${f.title}). ${rest.buyer} übernimmt zu ${mio(ev)}.`);
        md.signed = { ...rest, ev };
      } else texts.push(`Der Käufer findet: ${f.title}. Eine Garantie im Vertrag fängt es auf.`);
    }
  }
  const fee = mandateFee(ev);
  state.cash += fee;
  income.mandates = (income.mandates ?? 0) + fee;
  const rec = mnaOf(state).record;
  rec.mandatesDone += 1;
  rec.mandateFees += fee;
  let mood: "happy" | "ok" | "unhappy";
  if (md.side === "sell") {
    const ratio = ev / md.wish;
    mood = ratio >= 0.95 ? "happy" : ratio >= 0.85 ? "ok" : "unhappy";
  } else {
    // Buy side: compare with what the company is really worth, hidden problems included.
    const truth = md.findings.reduce((p, f) => p * (1 - f.priceCut), md.ebitda * md.fair);
    const ratio = ev / truth;
    mood = ratio <= 1.0 && ev <= md.wish * 1.02 ? "happy" : ratio <= 1.12 && ev <= md.wish * 1.08 ? "ok" : "unhappy";
    const missed = md.findings.filter((f) => !f.found);
    if (missed.length > 0) texts.push(`Nach dem Kauf zeigt sich: ${missed.map((f) => f.title).join(", ")}. Das hätte die Prüfung finden können.`);
  }
  const rep = MANDATE_REPUTATION_GAIN[mood];
  ctx.reputation(rep);
  if (mood === "happy") rec.happyClients += 1;
  if (md.process === "auction" && md.side === "sell" && ev >= md.wish) rec.auctionWins = (rec.auctionWins ?? 0) + 1;
  const bank = state.contacts.find((c) => c.id === "bank");
  if (bank && mood !== "unhappy") {
    bank.met = true;
    bank.warmth = Math.min(100, bank.warmth + 10);
  }
  const moodText = {
    happy: md.side === "sell" ? "Die Familie ist begeistert und empfiehlt dich weiter." : `${md.client} ist sehr zufrieden mit dem Preis.`,
    ok: "Der Mandant ist zufrieden.",
    unhappy: md.side === "sell" ? `Die Familie hatte auf ${mio(md.wish)} gehofft und ist enttäuscht.` : `${md.client} hat zu viel bezahlt und weiß es.`,
  }[mood];
  const text = `Mandat ${md.company} abgeschlossen: ${mio(ev)} (${times(ev / md.ebitda)} EBITDA). Erfolgshonorar ${eur(fee)}. ${moodText}`;
  md.outcome = { ev, fee, reputation: rep, mood, text: [...texts, text].join(" ") };
  md.status = "closed";
  notes.push(text);
  ctx.mail({ kind: "system", from: md.client, subject: `${md.company}: Abschluss`, body: md.outcome.text });
  if (mood === "happy" && r() < REFERRAL_CHANCE) referral(ctx, md);
}

function fail(ctx: Ctx, md: Mandate, why: string): void {
  md.status = "failed";
  const rep = MANDATE_REPUTATION_GAIN.failed;
  ctx.reputation(rep);
  mnaOf(ctx.state).record.mandatesFailed += 1;
  md.outcome = { ev: 0, fee: 0, reputation: rep, mood: "failed", text: `${why} Kein Erfolgshonorar.` };
  ctx.mail({ kind: "system", from: md.client, subject: `${md.company}: Mandat gescheitert`, body: md.outcome.text });
}

/** A happy client knows another owner who wants to sell: offered to you first. */
function referral(ctx: Ctx, md: Mandate): void {
  const state = ctx.state;
  if (state.reputation < BUYOUT_REPUTATION) return;
  const r = mnaRandom(state, `referral|${md.id}`);
  const ev = roundTo(Math.min(Math.max(1_500_000, ctx.worth() * between(r, 0.4, 0.9)), 30_000_000), 100_000);
  targetDeal(ctx, r, { ev, source: "referral", from: md.client });
}

/** After a failed sale, the owner sometimes offers the company to the adviser. */
function offerCompany(ctx: Ctx, md: Mandate): void {
  const state = ctx.state;
  if (state.reputation < BUYOUT_REPUTATION || md.side !== "sell") return;
  const r = mnaRandom(state, `vorkauf|${md.id}`);
  if (r() > 0.35) return;
  targetDeal(ctx, r, { ev: roundTo(md.ebitda * md.fair * 0.95, 100_000), source: "referral", from: md.client, name: md.company });
}

/** Multiples the player can choose in the UI. */
export const MULTIPLE_CHOICES = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10];
export type { DdModule };
