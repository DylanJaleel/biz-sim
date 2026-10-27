import { LAST, SECTORS } from "./dealgen";
import { annualEbitda, enterpriseValue, sizeMultiple } from "./ebitda";
import { acquireDeal, addonEv, annuityOf, bankRate, dealPrice, injectEquity, lowBidAccepted, mnaRandom, scheduleSurprises, structureDeal, syncDebt, type Terms } from "./lbo";
import {
  ACQUIRE_DAYS,
  ADDON_CHANCE,
  ADDON_MAX_LEVERAGE,
  ADDON_MAX_OPEN,
  ADDON_MIN_EBITDA,
  ADDON_SIZE,
  ANTITRUST_BLOCK,
  ANTITRUST_MONTHS,
  ANTITRUST_REVENUE,
  BANK_YEARS,
  CHURN_LOSS,
  EARNOUT_MONTHS,
  INTEGRATION,
  PLATFORM_COST,
  PLATFORM_DAYS,
  PLATFORM_MIN_EBITDA,
  PLATFORM_REPUTATION,
  PLATFORM_SALE,
  PLATFORM_SALE_DAYS,
  SYNERGY_SHARE,
  TRANSACTION_COST,
  VENDOR_MONTHS,
  WORKING_CASH_MONTHS,
} from "./mna-config";
import { between, eur, generateFindings, mio, mnaOf, pickOf, roundTo, times, type Ctx } from "./mna-core";
import { INTERIM, KARTELL } from "./network-config";
import { applyDelta } from "./sim";
import type { AddonTarget, ExitOffer, Finding, GameState, IntegrationKind, Integration, ProcessKind, Startup } from "./types";

// Buy-and-Build: Eine Firma wird Plattform, kleinere Firmen derselben Branche
// kommen dazu. Klein kaufen ist billig (niedriges Multiple), die größere
// Gruppe ist mehr wert (höheres Multiple). Dazwischen liegen Integration,
// Kündigungen, Schulden und die Bank, die jedes Quartal nachrechnet.

export function platformOf(state: GameState): Startup | undefined {
  return state.startups.find((s) => s.status === "active" && s.platform);
}

/** Why this company cannot become a platform yet, or null. */
export function platformBlocker(state: GameState, s: Startup): string | null {
  if (s.platform) return "Diese Firma ist schon deine Plattform.";
  if (platformOf(state)) return "Du baust schon eine Plattform auf. Eine reicht, die Integration braucht dein Team.";
  if (state.familyOffice === undefined) return "Buy-and-Build braucht ein Team: Gründe zuerst dein Family Office.";
  if (state.reputation < PLATFORM_REPUTATION) return `Banken und Verkäufer nehmen dich als Plattform-Investor ab ${PLATFORM_REPUTATION} Ruf ernst.`;
  if (s.status !== "active" || s.metrics.valuedOn !== "ebitda") return "Plattform kann nur eine Firma aus dem Nachfolge-Programm werden (bewertet nach EBITDA).";
  if (s.stake <= 50) return "Für eine Plattform brauchst du die Mehrheit.";
  if (annualEbitda(s.metrics) < PLATFORM_MIN_EBITDA) return `Die Plattform muss mindestens ${eur(PLATFORM_MIN_EBITDA)} EBITDA im Jahr verdienen.`;
  if (s.lbo && s.lbo.status !== "ok") return "Solange die Bank die Firma beobachtet, gibt es keine Zukäufe.";
  return null;
}

export function makePlatform(ctx: Ctx, s: Startup): void {
  const why = platformBlocker(ctx.state, s);
  if (why) ctx.fail(why);
  if (ctx.state.cash < PLATFORM_COST) ctx.fail(`Die Strategie-Berater kosten ${eur(PLATFORM_COST)}.`);
  ctx.spend("platform", `Plattform-Strategie ${s.name}`, PLATFORM_DAYS);
  ctx.state.cash -= PLATFORM_COST;
  ctx.replace({ ...s, platform: { since: ctx.state.month, addons: [], integrations: [] }, playerCost: (s.playerCost ?? 0) + PLATFORM_COST });
  ctx.lesson("multiple_arbitrage");
  ctx.mail({
    kind: "system",
    from: "Boardroom",
    subject: `${s.name} wird Plattform`,
    body: `Ab jetzt suchst du kleinere Firmen aus der Branche ${s.sector}. Sie kosten ein niedrigeres Vielfaches ihres EBITDA als die größere Gruppe wert ist. Aber: Jeder Zukauf muss integriert werden, und die Bank finanziert nur bis ${times(ADDON_MAX_LEVERAGE)} EBITDA.`,
    startupId: s.id,
  });
}

// ---------------------------------------------------------------------------
// Zukaufziele
// ---------------------------------------------------------------------------

/** Month start: the platform hears of smaller companies for sale. */
export function planAddons(ctx: Ctx): void {
  const state = ctx.state;
  const m = mnaOf(state);
  for (const a of m.addons.filter((x) => x.status === "open" && x.expires < state.month)) a.status = "expired";
  // Old targets are dropped so the save stays small.
  m.addons = m.addons.filter((a) => a.status === "open" || a.status === "review" || a.month > state.month - 12);
  const s = platformOf(state);
  if (!s || s.platform!.sale || (s.lbo && s.lbo.status !== "ok")) return;
  if (m.addons.filter((a) => a.platformId === s.id && a.status === "open").length >= ADDON_MAX_OPEN) return;
  const r = mnaRandom(state, `addon|${s.id}|${state.month}`);
  const warm = state.contacts.some((c) => c.id === "dealflow" && c.met && c.warmth >= 40);
  const chance = ADDON_CHANCE + (state.team.some((t) => t.role === "partner") ? 0.1 : 0) + (warm ? 0.1 : 0);
  if (r() > chance) return;
  const ep = Math.max(PLATFORM_MIN_EBITDA, annualEbitda(s.metrics));
  const ea = roundTo(Math.max(ADDON_MIN_EBITDA, ep * between(r, ADDON_SIZE[0], ADDON_SIZE[1])), 10_000);
  const marginP = Math.max(0.05, annualEbitda(s.metrics) / Math.max(1, s.metrics.revenue * 12));
  const margin = Math.max(0.04, marginP * between(r, 0.7, 1.05));
  const gm = Math.min(0.9, Math.max(0.12, s.metrics.grossMargin + between(r, -0.04, 0.03)));
  const revenue = roundTo(ea / 12 / margin, 100);
  const opex = roundTo(revenue * gm - ea / 12, 100);
  // Owners know that platforms are buying: add-ons are not cheap.
  const multiple = Math.round(sizeMultiple(ea) * between(r, 1.0, 1.2) * 10) / 10;
  const sec = SECTORS.find((x) => x.sector === s.sector) ?? pickOf(r, SECTORS);
  const idea = pickOf(r, sec.mittelstand);
  const owner = `${pickOf(r, ["Werner", "Heike", "Rainer", "Sabine", "Uwe", "Petra", "Bernd", "Monika"])} ${pickOf(r, LAST)}`;
  const name = `${idea.name[0]}${pickOf(r, LAST)}`;
  const city = pickOf(r, ["Leipzig", "Hamburg", "Köln", "Freiburg", "Nürnberg", "Bremen", "Dresden", "Münster", "Kassel", "Ulm", "Trier", "Rostock"]);
  const topCustomer = Math.round(between(r, 0.1, 0.45) * 100) / 100;
  const ev = roundTo(ea * multiple, 10_000);
  const target: AddonTarget = {
    id: ctx.id("z"),
    platformId: s.id,
    month: state.month,
    expires: state.month + 1,
    name,
    city,
    owner,
    text: `${idea.tagline} in ${city}. ${owner} will verkaufen, am liebsten an jemanden aus der Branche.`,
    revenue,
    grossMargin: Math.round(gm * 100) / 100,
    opex,
    team: Math.round(between(r, 8, 45)),
    growth: Math.round(between(r, -0.004, 0.008) * 1000) / 1000,
    topCustomer,
    multiple,
    findings: generateFindings(r, { ev, ebitda: ea / 12, topCustomer, revenue, grossMargin: gm }),
    dd: [],
    status: "open",
  };
  m.addons.push(target);
  ctx.mail({
    kind: "deal",
    from: `${owner}, ${name}`,
    subject: `Zukauf für ${s.name}: ${name}`,
    body: `${target.text} EBITDA ${eur(ea)} im Jahr, Kaufpreis ${mio(ev)} (${times(multiple)}). Deine Plattform wird gerade mit etwa ${times(enterpriseValue(s.metrics) / Math.max(1, annualEbitda(s.metrics)))} bewertet. Das Angebot gilt zwei Monate.`,
    startupId: s.id,
  });
}

/** The add-on's numbers after the problems the buyer already knows. */
function adjusted(a: AddonTarget): { revenue: number; opex: number; growth: number; ebitda: number } {
  let revenue = a.revenue;
  let opex = a.opex;
  let growth = a.growth;
  for (const f of a.findings.filter((x) => x.found)) {
    opex += f.opex ?? 0;
    revenue *= 1 + (f.revenuePct ?? 0);
    growth += f.growth ?? 0;
  }
  return { revenue, opex, growth, ebitda: (revenue * a.grossMargin - opex) * 12 };
}

export interface AddonPlan {
  price: number;
  ebitda: number;
  bank: number;
  bankMax: number;
  vendor: number;
  earnout: number;
  fromPlatform: number;
  fromPlayer: number;
  fees: number;
  /** Net bank debt / EBITDA of the group after the deal. */
  leverage: number;
  review: boolean;
}

/** How an add-on would be paid: bank up to the group's limit, seller money, the platform's cash, then the player. */
export function planAddon(state: GameState, s: Startup, a: AddonTarget, terms: Pick<Terms, "bid" | "bank" | "vendor" | "earnout">): AddonPlan {
  const price = dealPrice(addonEv(a), a.findings, terms.bid);
  const adj = adjusted(a);
  const ep = annualEbitda(s.metrics);
  const bankNow = s.lbo?.bank ?? 0;
  // A leveraged-finance contact may have negotiated more room (see network-life.ts).
  const room = Math.max(0, (ADDON_MAX_LEVERAGE + (s.lbo?.headroom ?? 0)) * (ep + adj.ebitda) - bankNow);
  const st = structureDeal(price, adj.ebitda, terms, state.market.regime, 100, room);
  const fromPlatform = roundTo(Math.min(st.equity, Math.max(0, s.metrics.cash - 2 * s.metrics.opex)), 1000);
  const fromPlayer = st.equity - fromPlatform + st.fees;
  const cashAfter = s.metrics.cash - fromPlatform + WORKING_CASH_MONTHS * adj.opex;
  const net = bankNow + st.bank - Math.max(0, cashAfter - 2 * (s.metrics.opex + adj.opex));
  return {
    price,
    ebitda: adj.ebitda,
    bank: st.bank,
    bankMax: roundTo(Math.min(room, st.bankMax), 1000),
    vendor: st.vendor,
    earnout: st.earnout,
    fromPlatform,
    fromPlayer,
    fees: st.fees,
    leverage: ep + adj.ebitda > 0 ? Math.max(0, net) / (ep + adj.ebitda) : Infinity,
    review: (s.metrics.revenue + adj.revenue) * 12 > ANTITRUST_REVENUE,
  };
}

/** Buy a target: a family business offered in the post, or an add-on of the platform. */
export function acquire(ctx: Ctx, targetId: string, terms: Terms, integration: IntegrationKind = "careful"): void {
  const state = ctx.state;
  const deal = state.startups.find((s) => s.id === targetId);
  if (deal) {
    if (!deal.offer?.ev) ctx.fail("Diese Firma kaufst du über das klassische Angebot in der Post.");
    acquireDeal(ctx, deal, terms);
    return;
  }
  const a = mnaOf(state).addons.find((x) => x.id === targetId);
  if (!a || a.status !== "open") ctx.fail("Dieser Zukauf steht nicht mehr zur Verfügung.");
  const s = state.startups.find((x) => x.id === a!.platformId);
  if (!s || s.status !== "active" || !s.platform) ctx.fail("Die Plattform gibt es nicht mehr.");
  if (s!.platform!.sale) ctx.fail("Während des Verkaufs der Plattform kaufst du nichts dazu.");
  if (s!.lbo && s!.lbo.status !== "ok") ctx.fail("Zukaufstopp: Die Bank erlaubt keine Zukäufe, solange der Covenant gebrochen ist.");
  if (terms.bid === "low" && !lowBidAccepted(state, a!.id, a!.findings)) {
    ctx.spend("acquire", `Verhandlung ${a!.name}`, 1);
    a!.status = "lost";
    ctx.mail({
      kind: "deal",
      from: a!.owner,
      subject: `${a!.name}: kein Verkauf an dich`,
      body: "Zu wenig geboten. Ich verkaufe an einen Wettbewerber, der meinen Preis zahlt.",
      startupId: s!.id,
    });
    return;
  }
  const plan = planAddon(state, s!, a!, terms);
  if (state.cash < plan.fromPlayer) ctx.fail(`Dafür fehlen dir ${eur(plan.fromPlayer - state.cash)} Eigenkapital.`);
  ctx.spend("acquire", `Zukauf ${a!.name}`, ACQUIRE_DAYS);
  state.cash -= plan.fromPlayer;
  const pending = { ev: plan.price, bank: plan.bank, vendor: plan.vendor, earnout: plan.earnout, fromPlatform: plan.fromPlatform, fromPlayer: plan.fromPlayer, integration };
  if (plan.review) {
    a!.status = "review";
    a!.reviewDue = state.month + ANTITRUST_MONTHS;
    a!.pending = pending;
    ctx.mail({
      kind: "system",
      from: "Bundeskartellamt",
      subject: `Fusionskontrolle: ${s!.name} und ${a!.name}`,
      body: `Die Gruppe macht mehr als ${mio(ANTITRUST_REVENUE)} Umsatz im Jahr. Wir prüfen den Zusammenschluss; das dauert etwa ${ANTITRUST_MONTHS} Monate. Ihr Eigenkapital liegt bis dahin auf einem Treuhandkonto.`,
      startupId: s!.id,
    });
    return;
  }
  closeAddon(ctx, s!, a!, pending);
}

function closeAddon(ctx: Ctx, platform: Startup, a: AddonTarget, p: NonNullable<AddonTarget["pending"]>): void {
  const state = ctx.state;
  const adj = adjusted(a);
  const fees = Math.max(0, p.fromPlayer - Math.max(0, p.ev - p.bank - p.vendor - p.earnout - p.fromPlatform));
  let s = injectEquity(platform, p.fromPlayer - fees);
  const m = s.metrics;
  const revenue = m.revenue + adj.revenue;
  s = {
    ...s,
    metrics: {
      ...m,
      revenue,
      grossMargin: (m.revenue * m.grossMargin + adj.revenue * a.grossMargin) / revenue,
      opex: m.opex + adj.opex,
      team: m.team + a.team,
      growth: (m.growth * m.revenue + adj.growth * adj.revenue) / revenue,
      topCustomer: (m.topCustomer * m.revenue + a.topCustomer * adj.revenue) / revenue,
      cash: m.cash - p.fromPlatform + WORKING_CASH_MONTHS * adj.opex,
    },
  };
  s = applyDelta(s, { morale: -4, axes: { management: -2 } });
  const lbo = s.lbo
    ? { ...s.lbo, vendors: [...s.lbo.vendors], earnouts: [...s.lbo.earnouts] }
    : {
        acquired: s.joined,
        entryEv: enterpriseValue(platform.metrics),
        entryEbitda: annualEbitda(platform.metrics),
        equity: platform.playerCost ?? 0,
        bank: 0,
        rate: 0,
        payment: 0,
        vendors: [],
        earnouts: [],
        breach: 0,
        status: "ok" as const,
        handover: [],
        model: 2,
      };
  const ebitda = annualEbitda(s.metrics);
  lbo.bank += p.bank;
  lbo.rate = bankRate(ebitda > 0 ? lbo.bank / ebitda : 3, state.market.regime);
  lbo.payment = annuityOf(lbo.bank, lbo.rate, BANK_YEARS * 12);
  if (p.vendor > 0) lbo.vendors.push({ amount: p.vendor, due: state.month + VENDOR_MONTHS, label: `Verkäuferdarlehen ${a.name}` });
  if (p.earnout > 0) lbo.earnouts.push({ amount: p.earnout, due: state.month + EARNOUT_MONTHS, target: Math.round(ebitda), label: `Earn-out ${a.name}` });
  lbo.equity += p.fromPlayer;
  lbo.refRevenue = s.metrics.revenue;
  // The sustainable margin of the group: the platform's and the add-on's, weighted by revenue.
  const baseMargin = lbo.margin ?? annualEbitda(platform.metrics) / Math.max(1, platform.metrics.revenue * 12);
  const addonMargin = adj.ebitda / Math.max(1, adj.revenue * 12);
  lbo.margin = Math.max(0.03, (baseMargin * platform.metrics.revenue + addonMargin * adj.revenue) / Math.max(1, platform.metrics.revenue + adj.revenue));
  lbo.grossMargin = s.metrics.grossMargin;
  const def = INTEGRATION[p.integration];
  const integration: Integration = {
    name: a.name,
    start: state.month,
    due: state.month + def.months,
    kind: p.integration,
    ebitda: Math.round(adj.ebitda),
    revenue: Math.round(adj.revenue),
    cost: roundTo((def.cost * Math.max(0, adj.ebitda)) / def.months, 100),
  };
  const platformState = {
    ...s.platform!,
    addons: [
      ...s.platform!.addons,
      { name: a.name, month: state.month, ev: p.ev, ebitda: Math.round(adj.ebitda), multiple: Math.round((p.ev / Math.max(1, adj.ebitda)) * 10) / 10 },
    ],
    integrations: [...s.platform!.integrations, integration],
  };
  s = syncDebt({ ...s, lbo, platform: platformState, playerCost: (s.playerCost ?? 0) + p.fromPlayer });
  ctx.replace(s);
  // Problems nobody found surface in the group, in proportion to its size.
  const scale = adj.revenue / Math.max(1, s.metrics.revenue);
  const missed: Finding[] = a.findings.filter((f) => !f.found).map((f) => ({ ...f, revenuePct: (f.revenuePct ?? 0) * scale }));
  scheduleSurprises(ctx, s, missed, a.id);
  a.status = "bought";
  delete a.pending;
  mnaOf(state).record.addons += 1;
  ctx.lesson("multiple_arbitrage");
  ctx.lesson("pmi");
  if (p.vendor > 0) ctx.lesson("verkaeuferdarlehen");
  if (p.earnout > 0) ctx.lesson("earn_out");
  ctx.mail({
    kind: "founder",
    from: s.board.find((b) => b.seat === "ceo")?.name ?? s.name,
    subject: `${a.name} gehört jetzt zu ${s.name}`,
    body: `Kaufpreis ${mio(p.ev)} (${times(p.ev / Math.max(1, adj.ebitda))} EBITDA), davon ${eur(p.bank)} Bank, ${eur(p.fromPlatform)} aus unserer Kasse und ${eur(p.fromPlayer)} von dir${p.vendor > 0 ? `, ${eur(p.vendor)} Verkäuferdarlehen` : ""}${p.earnout > 0 ? `, ${eur(p.earnout)} Earn-out` : ""}. Die Integration läuft ${def.months} Monate (${p.integration === "fast" ? "schnell und hart" : "behutsam"}) und kostet rund ${eur(integration.cost)} im Monat. Ob die Einsparungen kommen, wissen wir erst am Ende.`,
    startupId: s.id,
  });
}

// ---------------------------------------------------------------------------
// Monatslauf der Plattform: Integration, Kartellamt, Verkaufsprozess
// ---------------------------------------------------------------------------

export function platformMonth(ctx: Ctx, month: number, notes: string[], lines: Map<string, string[]>): void {
  const state = ctx.state;
  const m = mnaOf(state);
  for (const a of m.addons.filter((x) => x.status === "review" && (x.reviewDue ?? 0) <= month)) {
    const s = state.startups.find((x) => x.id === a.platformId);
    const r = mnaRandom(state, `antitrust|${a.id}`);
    // An antitrust lawyer from the network prepared the filing: blocks become rare.
    const block = (a.spec ?? []).includes("kartell") ? KARTELL.block : ANTITRUST_BLOCK;
    if (!s || s.status !== "active" || !s.platform || r() < block) {
      a.status = "blocked";
      const refund = a.pending ? a.pending.fromPlayer - Math.round(a.pending.ev * TRANSACTION_COST) : 0;
      state.cash += Math.max(0, refund);
      m.record.antitrustBlocks += 1;
      ctx.reputation(-1);
      notes.push(`Das Kartellamt untersagt den Zukauf von ${a.name}. Dein Geld kommt zurück, die Kosten der Beratung nicht.`);
      ctx.mail({
        kind: "system",
        from: "Bundeskartellamt",
        subject: `Zusammenschluss untersagt: ${a.name}`,
        body: "Die Gruppe hätte in der Region zu viel Marktmacht. Der Zusammenschluss ist untersagt.",
        startupId: a.platformId,
      });
      delete a.pending;
    } else if (a.pending) {
      closeAddon(ctx, s, a, a.pending);
      notes.push(`Das Kartellamt gibt den Zukauf von ${a.name} frei.`);
    }
  }
  const s0 = platformOf(state);
  if (!s0) return;
  let s = s0;
  const texts = lines.get(s.id) ?? [];
  const p = s.platform!;
  const integrations: Integration[] = [];
  const partners = state.team.filter((t) => t.role === "partner").length;
  const associate = state.team.some((t) => t.role === "associate" && t.mandate === s.id);
  const capacity = 1 + partners + (associate ? 1 : 0);
  const overload = p.integrations.length > capacity;
  for (const i of p.integrations) {
    s = { ...s, metrics: { ...s.metrics, cash: s.metrics.cash - i.cost } };
    if (i.due > month) {
      integrations.push(i);
      continue;
    }
    const r = mnaRandom(state, `integration|${s.id}|${i.name}|${i.start}`);
    const def = INTEGRATION[i.kind];
    const strong = s.metrics.axes.management >= 60;
    // An interim manager from the network on site: integrations go better.
    const interim = (s.lbo?.interim ?? 0) >= month;
    const synergy = r() < def.synergy + (strong ? 0.1 : 0) - (overload ? 0.25 : 0) + (interim ? INTERIM.synergy : 0);
    const churn = r() < def.churn + (overload ? 0.2 : 0) - (strong ? 0.05 : 0) + (interim ? INTERIM.churn : 0);
    const rec = m.record;
    const parts: string[] = [];
    if (synergy) {
      const saving = roundTo((SYNERGY_SHARE * Math.max(0, i.ebitda)) / 12, 100);
      s = applyDelta(s, { opex: -saving, trust: 3 });
      if (s.lbo) s = { ...s, lbo: { ...s.lbo, margin: (s.lbo.margin ?? 0.1) + saving / Math.max(1, s.metrics.revenue) } };
      rec.synergies += 1;
      parts.push(`Die Einsparungen sind da: ${eur(saving * 12)} im Jahr (Einkauf, Verwaltung, Standorte).`);
    } else parts.push("Die erhofften Einsparungen bleiben aus: zwei Systeme, zwei Kulturen, doppelte Verwaltung.");
    if (churn) {
      const loss = i.revenue * between(r, CHURN_LOSS[0], CHURN_LOSS[1]);
      s = applyDelta(s, { revenuePct: -loss / Math.max(1, s.metrics.revenue), morale: -5 });
      parts.push(`Kunden und Mitarbeiter von ${i.name} sind gegangen: ${eur(loss * 12)} Umsatz im Jahr weniger.`);
    }
    if (churn && !synergy) rec.integrationFailures += 1;
    const text = `Integration von ${i.name} abgeschlossen. ${parts.join(" ")}`;
    texts.push(text);
    notes.push(`${s.name}: ${text}`);
    ctx.lesson("pmi");
  }
  if (overload && integrations.length > 0)
    texts.push(`Zu viele Integrationen auf einmal (${p.integrations.length}, dein Team schafft ${capacity}). Das kostet Einsparungen und Kunden.`);
  s = { ...s, platform: { ...p, integrations } };
  if (p.sale && p.sale.due <= month) s = saleOffer(ctx, s, p.sale.process, p.sale.buyers);
  ctx.replace(s);
  lines.set(s.id, texts);
}

// ---------------------------------------------------------------------------
// Verkauf der Plattform (Exit)
// ---------------------------------------------------------------------------

const FINANCIAL_BUYERS = ["Alpenblick Private Equity", "Hanse Capital Partners", "Nordkap Buyout Fonds", "Rheintal Capital"];
const CREDIT = { boom: 1.05, normal: 1, weak: 0.92, crash: 0.8 } as const;

export function startSale(ctx: Ctx, s: Startup, process: ProcessKind, buyers: "strategic" | "financial"): void {
  if (!s.platform) ctx.fail("Das ist keine Plattform.");
  if (s.platform!.sale) ctx.fail("Der Verkauf läuft schon.");
  if (ctx.state.exits.some((e) => e.startupId === s.id && e.status === "open")) ctx.fail("Es liegt schon ein Kaufangebot vor.");
  ctx.spend("platform", `Verkaufsprozess ${s.name}`, PLATFORM_SALE_DAYS[process]);
  const months = PLATFORM_SALE[process].months;
  ctx.replace({ ...s, platform: { ...s.platform!, sale: { process, buyers, started: ctx.state.month, due: ctx.state.month + months - 1 } } });
  ctx.lesson("bieterverfahren");
  ctx.mail({
    kind: "system",
    from: "Boardroom",
    subject: `${s.name}: Verkaufsprozess gestartet`,
    body:
      process === "auction"
        ? `Bieterverfahren: Mehrere ${buyers === "strategic" ? "Konzerne" : "Finanzinvestoren"} bekommen das Info-Memorandum. In etwa ${months} Monaten liegen die Angebote vor. Wettbewerb treibt den Preis, dauert aber länger.`
        : `Exklusiver Verkauf: Du sprichst mit ${buyers === "strategic" ? "einem Konzern" : "einem Finanzinvestor"}. Schnell und diskret, aber ohne Wettbewerb.`,
    startupId: s.id,
  });
}

export function stopSale(ctx: Ctx, s: Startup): void {
  if (!s.platform?.sale) ctx.fail("Es läuft kein Verkauf.");
  ctx.replace({ ...s, platform: { ...s.platform!, sale: undefined } });
}

function saleOffer(ctx: Ctx, s: Startup, process: ProcessKind, buyers: "strategic" | "financial"): Startup {
  const state = ctx.state;
  const r = mnaRandom(state, `platformsale|${s.id}|${state.month}`);
  const f = PLATFORM_SALE[process].factor;
  const buyerFactor = buyers === "strategic" ? between(r, 0.98, 1.1) : between(r, 0.93, 1.03) * CREDIT[state.market.regime];
  const penalty = (s.lbo && s.lbo.status !== "ok" ? 0.85 : 1) * (s.platform!.integrations.length > 0 ? 0.95 : 1);
  const ev = roundTo(enterpriseValue(s.metrics) * between(r, f[0], f[1]) * buyerFactor * penalty, 10_000);
  // Working capital stays with the business; excess cash goes to the sellers.
  const price = roundTo(ev + Math.max(0, s.metrics.cash - 2 * s.metrics.opex) - s.metrics.debt - (s.metrics.acqDebt ?? 0), 10_000);
  const next = { ...s, platform: { ...s.platform!, sale: undefined } };
  if (price <= 0) {
    ctx.mail({
      kind: "exit",
      from: "Boardroom",
      subject: `${s.name}: Kein Angebot über den Schulden`,
      body: `Die Käufer bieten ${mio(ev)} für das Unternehmen. Das reicht nicht einmal für die Schulden. Der Verkauf ist abgebrochen.`,
      startupId: s.id,
    });
    return next;
  }
  const buyer = buyers === "strategic" ? s.names.acquirer.charAt(0).toUpperCase() + s.names.acquirer.slice(1) : pickOf(r, FINANCIAL_BUYERS);
  const offer: ExitOffer = { id: ctx.id("x"), startupId: s.id, month: state.month, buyer, price, status: "open", platform: true, ev };
  state.exits.push(offer);
  const e = annualEbitda(s.metrics);
  ctx.mail({
    kind: "exit",
    from: buyer,
    subject: `Angebot für ${s.name}: ${mio(ev)} Unternehmenswert`,
    body: `${buyer} bietet ${mio(ev)} für das Unternehmen, das sind ${times(ev / Math.max(1, e))} EBITDA. Nach Abzug der Schulden bleiben ${mio(price)} für die Gesellschafter. Die Gesellschafterversammlung entscheidet bis Ende nächsten Monats.`,
    startupId: s.id,
    exitId: offer.id,
  });
  return next;
}

/** Called by the engine when a sale of a platform (or any bought company) went through. */
export function recordSale(state: GameState, offer: ExitOffer, s: Startup, mine: number): void {
  if (!s.platform || !s.lbo) return;
  const e = annualEbitda(s.metrics);
  const ev = offer.ev ?? Math.max(0, offer.price - Math.max(0, s.metrics.cash - 2 * s.metrics.opex) + s.metrics.debt + (s.metrics.acqDebt ?? 0));
  mnaOf(state).record.platformExits.push({
    name: s.name,
    month: state.month,
    ev: Math.round(ev),
    ebitda: Math.round(e),
    multiple: e > 10_000 ? Math.round((ev / e) * 10) / 10 : 0,
    entryMultiple: Math.round((s.lbo.entryEv / Math.max(1, s.lbo.entryEbitda)) * 10) / 10,
    moic: Math.round((mine / Math.max(1, s.lbo.equity)) * 100) / 100,
    addons: s.platform.addons.length,
  });
}
