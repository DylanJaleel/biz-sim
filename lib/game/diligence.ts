import type { DdModule } from "./mna-config";
import { eur, roundTo, type Ctx } from "./mna-core";
import { applyDelta } from "./sim";
import type { DiligenceRun, GameState, Startup } from "./types";

// Die Due Diligence als Spiel: Mit Marie Lenz, deiner CFO, gehst du die neun
// Schritte einer Prüfung durch und holst für jeden die richtigen Leute an den
// Tisch. Wer fehlt, übersieht etwas, das später teuer wird; wer zu viele holt,
// zahlt umsonst. Am Ende stehen Befunde, die den Preis senken, und vielleicht
// die Schmerzgrenze der Gegenseite.

export type ExpertId = "kanzlei" | "wp" | "stb" | "markt" | "tech" | "notar" | "wi" | "analyst" | "team";

/** Who can sit at the table; cost per step at a deal of 8 Mio. € (scaled with size). */
export const EXPERTS: Record<ExpertId, { name: string; cost: number }> = {
  kanzlei: { name: "Anwaltskanzlei", cost: 12_000 },
  wp: { name: "Wirtschaftsprüfer", cost: 18_000 },
  stb: { name: "Steuerberater", cost: 6_000 },
  markt: { name: "Marktberater", cost: 9_000 },
  tech: { name: "Tech-Gutachter", cost: 7_000 },
  notar: { name: "Notar", cost: 3_000 },
  wi: { name: "Versicherungsmakler", cost: 2_000 },
  analyst: { name: "Dein Analyst", cost: 0 },
  team: { name: "Gründerteam", cost: 0 },
};
export const EXPERT_IDS = Object.keys(EXPERTS) as ExpertId[];

export const CFO_NAME = "Marie Lenz";
/** Deal size the expert fees refer to, and the range of the scale. */
const FEE_BASE = 8_000_000;
const FEE_SCALE: [number, number] = [0.25, 4];
/** Days of your own: kick-off and the closing meeting (start), and the report (step 8). */
export const DILIGENCE_DAYS = { start: 1, report: 1 } as const;
/** A startup: a clean report lowers the valuation by this share (more stake for the same ticket). */
export const STARTUP_PRICE_CUT = 0.08;
/** Months until a missed problem of a startup comes out after you joined. */
export const STARTUP_SURFACE = 3;

export type StepKey = "nda" | "dataroom" | "finance" | "tax" | "legal" | "market" | "tech" | "report" | "signing";

export interface DiligenceStep {
  key: StepKey;
  name: string;
  short: string;
  need: ExpertId[];
  say: string;
  why: Partial<Record<ExpertId, string>>;
  missed: string;
  /** Review module of an acquisition the step stands for. */
  module?: DdModule;
}

/** The nine steps; `startup` decides a few words (founders or owner, round or purchase). */
export function stepsFor(kind: "startup" | "deal"): DiligenceStep[] {
  const deal = kind === "startup" ? "die Runde" : "den Kauf";
  return [
    {
      key: "nda",
      name: "Vertraulichkeit und Start",
      short: "NDA, Umfang, Zeitplan",
      need: ["kanzlei", "analyst"],
      say: "Bevor wir irgendetwas sehen, unterschreiben beide Seiten eine Vertraulichkeitsvereinbarung (NDA). Dann legen wir fest, was wir prüfen und bis wann. Wer setzt die Vereinbarung auf, und wer hält den Zeitplan?",
      why: { kanzlei: "setzt die Vertraulichkeitsvereinbarung auf.", analyst: "führt die Liste mit allen offenen Punkten." },
      missed: "Ohne Vertraulichkeitsvereinbarung gibt die Firma keine Unterlagen heraus. Eine Woche verloren.",
    },
    {
      key: "dataroom",
      name: "Datenraum und Fragen",
      short: "Unterlagen, Fragenliste",
      need: ["team", "analyst"],
      say: `Die Firma lädt Verträge, Zahlen und die Gesellschafterliste in einen digitalen Datenraum. Wir schicken eine Liste mit Fragen. Wer muss liefern, wer liest zuerst?`,
      why: { team: "lädt die Unterlagen hoch und beantwortet Fragen.", analyst: "sichtet alles und schreibt die Fragenliste." },
      missed: "Ohne Fragenliste bleiben Lücken im Datenraum unbemerkt.",
    },
    {
      key: "finance",
      name: "Finanzen prüfen",
      short: "Umsatz, Kosten, Kasse",
      need: ["wp"],
      say: "Jetzt die Zahlen. Wie viel vom Umsatz kommt jeden Monat wieder, was war ein Einmaleffekt? Wie viel Geld ist wirklich in der Kasse? Wer kann das unabhängig bestätigen?",
      why: { wp: "bereinigt die Zahlen und prüft, was wiederkehrt." },
      missed: `Ein Einmaleffekt fällt erst nach dem Einstieg auf. Du hast für ${deal} zu viel bezahlt.`,
      module: "financial",
    },
    {
      key: "tax",
      name: "Steuern prüfen",
      short: "Altlasten, Mitarbeiteranteile",
      need: ["stb"],
      say: "Steuerrisiken aus der Vergangenheit gehen mit in die Firma. Gerade Mitarbeiterbeteiligungen und Lohnsteuer sind oft falsch behandelt.",
      why: { stb: "prüft Lohnsteuer, Umsatzsteuer und Mitarbeiteranteile." },
      missed: "Zwei Jahre später fordert das Finanzamt nach.",
      module: "tax",
    },
    {
      key: "legal",
      name: "Recht prüfen",
      short: "Verträge, Marken, Personal",
      need: ["kanzlei"],
      say: "Verträge mit Kunden und Lieferanten, Marken, Arbeitsverträge. Achte auf Klauseln, die bei einem neuen Eigentümer greifen (Change of Control).",
      why: { kanzlei: "liest alle wichtigen Verträge." },
      missed: "Ein großer Kunde darf kündigen, wenn sich die Eigentümer ändern, und tut es.",
      module: "legal",
    },
    {
      key: "market",
      name: "Markt prüfen",
      short: "Kunden, Wettbewerb",
      need: ["markt", "analyst"],
      say: "Stimmt die Geschichte vom Markt? Wir reden mit Kunden und schauen uns die Konkurrenz genau an.",
      why: { markt: "führt Kundeninterviews.", analyst: "vergleicht die Konkurrenz." },
      missed: "Den schnellen Wettbewerber siehst du erst, als er die Preise senkt.",
      module: "commercial",
    },
    {
      key: "tech",
      name: kind === "startup" ? "Technik prüfen" : "Betrieb und IT prüfen",
      short: kind === "startup" ? "Code, Rechte, Sicherheit" : "Anlagen, IT, Sicherheit",
      need: ["tech"],
      say:
        kind === "startup"
          ? "Ist die Software sauber gebaut? Und gehört der Code wirklich der Firma, auch der von Freiberuflern?"
          : "Laufen Maschinen und IT stabil, sind die Lizenzen bezahlt, ist die Firma gegen Ausfälle geschützt?",
      why: { tech: kind === "startup" ? "liest Code und prüft die Rechte daran." : "prüft Anlagen, IT und Lizenzen." },
      missed: kind === "startup" ? "Ein Freiberufler meldet sich nach der Runde und will Geld für seinen Code." : "Ein Server fällt aus, die Lizenzen waren nicht bezahlt.",
    },
    {
      key: "report",
      name: "Bericht und Preis",
      short: "Warnliste, Angebot anpassen",
      need: ["analyst", "kanzlei"],
      say: "Wir fassen alle Befunde in einem Bericht zusammen. Für jeden roten Punkt gibt es drei Wege: Preis senken, eine Garantie verlangen oder eine Bedingung vor dem Abschluss.",
      why: { analyst: "schreibt den Bericht.", kanzlei: "formuliert Garantien und Bedingungen." },
      missed: "Ohne Bericht gehst du mit dem alten Preis in die Verhandlung.",
    },
    {
      key: "signing",
      name: "Vertrag und Abschluss",
      short: "Unterschrift, Notar, Geld",
      need: ["kanzlei", "notar"],
      say:
        kind === "startup"
          ? "Zum Schluss der Beteiligungsvertrag mit Garantien. Bei einer GmbH muss die Kapitalerhöhung notariell beurkundet werden. Danach fließt das Geld."
          : "Zum Schluss der Kaufvertrag mit Garantien (SPA). GmbH-Anteile gehen nur beim Notar über. Danach fließt das Geld.",
      why: {
        kanzlei: "verhandelt den Vertrag.",
        notar: "beurkundet. Ohne Notar keine GmbH-Anteile.",
        wi: "kann eine Versicherung für die Garantien besorgen. Nützlich, aber hier nicht nötig.",
      },
      missed: "Ohne Notar ist der Vertrag unwirksam. Alles zurück auf Anfang.",
    },
  ];
}

/** Name of the "team" chip: founders of a startup, the owner of a family business. */
export function expertName(id: ExpertId, kind: "startup" | "deal"): string {
  return id === "team" && kind === "deal" ? "Inhaber" : EXPERTS[id].name;
}

export function kindOf(s: Startup): "startup" | "deal" {
  return s.offer?.ev ? "deal" : "startup";
}

/** Price the fees refer to: the asked enterprise value, or the startup's valuation behind the offer. */
function sizeOf(s: Startup): number {
  if (s.offer?.ev) return s.offer.ev;
  return s.offer && s.offer.stake > 0 ? (s.offer.ticket * 100) / s.offer.stake : FEE_BASE;
}

export function feeScale(s: Startup): number {
  return Math.min(FEE_SCALE[1], Math.max(FEE_SCALE[0], sizeOf(s) / FEE_BASE));
}

export function expertCost(s: Startup, id: ExpertId): number {
  return roundTo(EXPERTS[id].cost * feeScale(s), 500);
}

/** 0 new, 1 guided once, 2 joins in, 3 leads alone. */
export function masteryOf(state: GameState): number {
  return Math.min(3, state.diligenceRuns ?? 0);
}
export const MASTERY_LABEL = ["Neu", "Begleitet", "Mitreden", "Kann es allein"] as const;

function target(ctx: Ctx, id: string): Startup {
  const s = ctx.state.startups.find((x) => x.id === id && x.status === "offered" && x.offer);
  if (!s) ctx.fail("Dieses Angebot liegt nicht mehr vor.");
  return s!;
}

/** One step of the review: the people at the table. Starting costs days; each step costs the fees of those called. */
export function playDiligence(ctx: Ctx, id: string, picks: string[]): void {
  const state = ctx.state;
  const s = target(ctx, id);
  const kind = kindOf(s);
  const steps = stepsFor(kind);
  const valid = Array.from(new Set(picks)).filter((p): p is ExpertId => (EXPERT_IDS as string[]).includes(p));
  if (valid.length === 0) ctx.fail("Hol mindestens eine Person an den Tisch.");
  let run = s.diligence && !s.diligence.done ? s.diligence : undefined;
  if (!run) {
    ctx.spend("dd", `Due Diligence ${s.name}: Auftakt`, DILIGENCE_DAYS.start);
    run = { step: 0, log: [], started: state.month, days: DILIGENCE_DAYS.start, cost: 0, priceBefore: kind === "deal" ? s.offer!.ev! : sizeOf(s) };
    s.diligence = run;
  }
  const step = steps[run.step]!;
  if (step.key === "report") {
    ctx.spend("dd", `Due Diligence ${s.name}: Bericht`, DILIGENCE_DAYS.report);
    run.days += DILIGENCE_DAYS.report;
  }
  const cost = valid.reduce((sum, p) => sum + expertCost(s, p), 0);
  // A startup: the round bears the advisers' fees, the company pays them from its cash. A purchase: you pay.
  if (kind === "deal") {
    if (state.cash < cost) ctx.fail(`Die Berater kosten ${eur(cost)}. Dafür reicht dein Konto nicht.`);
    state.cash -= cost;
  } else {
    s.metrics = { ...s.metrics, cash: s.metrics.cash - cost };
  }
  const missed = step.need.some((n) => !valid.includes(n));
  run.log.push({ step: run.step, picks: valid, missed, cost });
  run.cost += cost;
  if (step.module && !missed && kind === "deal") {
    const findings = s.findings ?? [];
    for (const f of findings) if (f.module === step.module) f.found = true;
    s.offer = { ...s.offer!, dd: Array.from(new Set([...(s.offer!.dd ?? []), step.module])) };
  }
  run.step += 1;
  if (run.step >= steps.length) finish(ctx, s, run, steps);
  ctx.lesson("dd_ablauf");
}

/** Start over after a finished review (e.g. to close what was missed): costs the kick-off again. */
export function restartDiligence(ctx: Ctx, id: string): void {
  const s = target(ctx, id);
  if (!s.diligence?.done) ctx.fail("Die Prüfung läuft noch.");
  delete s.diligence;
}

function finish(ctx: Ctx, s: Startup, run: DiligenceRun, steps: DiligenceStep[]): void {
  const state = ctx.state;
  run.done = true;
  state.diligenceRuns = (state.diligenceRuns ?? 0) + 1;
  const ok = (k: StepKey) => run.log.some((l) => steps[l.step]!.key === k && !l.missed);
  const misses = run.log.filter((l) => l.missed).length;
  // How deep the review went decides what you learn about the other side's limit.
  run.pain = misses === 0 ? "exact" : ok("finance") && ok("report") ? "range" : undefined;
  const kind = kindOf(s);
  if (kind === "startup") {
    s.offer = { ...s.offer!, ddDone: true };
    if (ok("finance") && ok("report")) s.offer = { ...s.offer, stake: Math.round((s.offer.stake / (1 - STARTUP_PRICE_CUT)) * 100) / 100 };
    // What was missed comes back after you joined (see diligenceMonth).
    const gaps = run.log.filter((l) => l.missed && ["finance", "tax", "legal", "tech"].includes(steps[l.step]!.key)).map((l) => steps[l.step]!.key);
    s.flags = [...s.flags.filter((f) => !f.startsWith("ddgap:")), ...gaps.map((g) => `ddgap:${g}`)];
    run.priceAfter = s.offer.stake > 0 ? (s.offer.ticket * 100) / s.offer.stake : run.priceBefore;
  } else {
    const found = (s.findings ?? []).filter((f) => f.found);
    run.priceAfter = roundTo(
      found.reduce((p, f) => p * (1 - f.priceCut), s.offer!.ev!),
      10_000,
    );
  }
  ctx.lesson("due_diligence");
}

/** What the review found at a step, for the table and the list of findings. */
export function stepFinding(
  s: Startup,
  step: DiligenceStep,
  missed: boolean,
  facts: { label: string; text: string; tone: string }[] = [],
): { sev: "high" | "mid" | "low" | "miss"; text: string } {
  if (missed) return { sev: "miss", text: step.missed };
  const kind = kindOf(s);
  if (kind === "deal" && step.module) {
    const fs = (s.findings ?? []).filter((f) => f.module === step.module);
    if (fs.length === 0) return { sev: "low", text: "Nichts Auffälliges. Die Zahlen und Unterlagen halten." };
    const worst = fs.reduce((a, b) => (b.priceCut > a.priceCut ? b : a));
    return { sev: worst.priceCut >= 0.06 ? "high" : "mid", text: fs.map((f) => `${f.title}: ${f.text} Preis −${Math.round(f.priceCut * 100)} %.`).join(" ") };
  }
  const fact = kind === "startup" ? facts[STARTUP_FACT[step.key] ?? -1] : undefined;
  if (fact) return { sev: fact.tone === "bad" ? "high" : fact.tone === "warn" ? "mid" : "low", text: `${fact.label}: ${fact.text}` };
  return { sev: "low", text: GENERIC[step.key] };
}

const STARTUP_FACT: Partial<Record<StepKey, number>> = { finance: 1, market: 0, legal: 2, tech: 3 };
const GENERIC: Record<StepKey, string> = {
  nda: "Zeitplan steht: vier Wochen bis zur Unterschrift.",
  dataroom: "Der Datenraum ist vollständig, die Fragenliste beantwortet.",
  finance: "Die Zahlen halten, was sie versprechen.",
  tax: "Keine Altlasten beim Finanzamt.",
  legal: "Die Verträge sind sauber.",
  market: "Kunden sind zufrieden, der Wettbewerb ist bekannt.",
  tech: "Technik und Rechte sind in Ordnung.",
  report: "Alle Befunde stehen im Bericht, das Angebot ist angepasst.",
  signing: "Notartermin steht. Das Geld fließt nach der Unterschrift.",
};

/** Month end: problems a startup review missed come out a few months after you joined. */
export function diligenceMonth(ctx: Ctx, notes: string[]): void {
  const state = ctx.state;
  for (const s of state.startups.filter((x) => x.status === "active" && x.flags.some((f) => f.startsWith("ddgap:")) && state.month - x.joined >= STARTUP_SURFACE)) {
    let next = s;
    const texts: string[] = [];
    for (const flag of s.flags.filter((f) => f.startsWith("ddgap:"))) {
      const key = flag.slice(6) as StepKey;
      const gap = GAPS[key];
      if (!gap) continue;
      next = applyDelta(next, gap.delta(next));
      texts.push(gap.text);
    }
    next = { ...next, flags: next.flags.filter((f) => !f.startsWith("ddgap:")) };
    ctx.replace(next);
    if (texts.length === 0) continue;
    notes.push(`${s.name}: Was die Prüfung übersehen hat, kommt ans Licht. ${texts.join(" ")}`);
    ctx.mail({
      kind: "founder",
      from: s.board.find((b) => b.seat === "ceo")?.name ?? s.name,
      subject: `${s.name}: Ein Problem aus der Zeit vor deinem Einstieg`,
      body: `${texts.join(" ")} Der Beirat ist verstimmt: Das hätte die Due Diligence finden müssen.`,
      startupId: s.id,
    });
  }
}

const GAPS: Partial<Record<StepKey, { text: string; delta: (s: Startup) => Parameters<typeof applyDelta>[1] }>> = {
  finance: { text: "Ein Teil des Umsatzes war ein Einmalprojekt und fehlt jetzt.", delta: () => ({ revenuePct: -0.12, trust: -5 }) },
  tax: { text: "Das Finanzamt fordert Lohnsteuer auf Mitarbeiteranteile nach.", delta: (s) => ({ cash: -Math.max(10_000, roundTo(s.metrics.revenue * 0.6, 1000)), trust: -3 }) },
  legal: { text: "Ein großer Kunde kündigt wegen des Eigentümerwechsels.", delta: (s) => ({ revenuePct: -Math.min(0.3, s.metrics.topCustomer), trust: -5 }) },
  tech: {
    text: "Ein Freiberufler verlangt Geld für Code, dessen Rechte nie übertragen wurden.",
    delta: (s) => ({ cash: -Math.max(15_000, roundTo(s.metrics.revenue * 0.5, 1000)), trust: -3 }),
  },
};

export interface DiligenceView {
  id: string;
  name: string;
  kind: "startup" | "deal";
  lead: string;
  mastery: number;
  masteryLabel: string;
  rail: { name: string; short: string; state: "done" | "missed" | "now" | "open"; hidden: boolean }[];
  current?: { index: number; name: string; say: string; ask: string };
  chips: { id: ExpertId; name: string; cost: number }[];
  last?: {
    name: string;
    picks: ExpertId[];
    need: ExpertId[];
    feedback: { who: string; text: string; tone: "ok" | "miss" | "extra" }[];
    finding: { sev: "high" | "mid" | "low" | "miss"; text: string };
  };
  findings: { sev: "high" | "mid" | "low" | "miss"; text: string; step: string }[];
  cost: number;
  days: number;
  started: boolean;
  done: boolean;
  summary?: { priceBefore: number; priceAfter: number; missed: number; pain?: "range" | "exact"; startup: boolean };
  startDays: number;
  reportDays: number;
  cash: number;
}

/** The review as the page shows it. `facts` are the startup's diligence facts (from its definition). */
export function diligenceView(state: GameState, s: Startup, facts: { label: string; text: string; tone: string }[] = []): DiligenceView {
  const kind = kindOf(s);
  const steps = stepsFor(kind);
  const run = s.diligence;
  const mastery = masteryOf(state);
  const lead = mastery >= 3;
  const log = run?.log ?? [];
  const at = run && !run.done ? run.step : run?.done ? steps.length : 0;
  const rail = steps.map((st, i) => {
    const entry = log.find((l) => l.step === i);
    const state: "done" | "missed" | "now" | "open" = entry ? (entry.missed ? "missed" : "done") : i === at ? "now" : "open";
    return { name: st.name, short: st.short, state, hidden: lead && state === "open" };
  });
  const cur = at < steps.length ? steps[at]! : undefined;
  const lastEntry = log[log.length - 1];
  const lastStep = lastEntry ? steps[lastEntry.step]! : undefined;
  const last =
    lastEntry && lastStep
      ? {
          name: lastStep.name,
          picks: lastEntry.picks as ExpertId[],
          need: lastStep.need,
          feedback: [
            ...lastStep.need.map((id) =>
              lastEntry.picks.includes(id)
                ? { who: expertName(id, kind), text: lastStep.why[id] ?? "", tone: "ok" as const }
                : { who: `Gefehlt: ${expertName(id, kind)}`, text: lastStep.missed, tone: "miss" as const },
            ),
            ...(lastEntry.picks as ExpertId[])
              .filter((id) => !lastStep.need.includes(id))
              .map((id) => ({ who: expertName(id, kind), text: lastStep.why[id] ?? "war hier nicht nötig und kostet trotzdem.", tone: "extra" as const })),
          ],
          finding: stepFinding(s, lastStep, lastEntry.missed, facts),
        }
      : undefined;
  const findings = log.map((l) => ({ ...stepFinding(s, steps[l.step]!, l.missed, facts), step: steps[l.step]!.name })).reverse();
  const ask = cur?.key === "report" ? "Wer schreibt den Bericht, wer formuliert die Bedingungen?" : "Wen holst du für diesen Schritt dazu?";
  return {
    id: s.id,
    name: s.name,
    kind,
    lead:
      kind === "deal" ? `Übernahme · ${s.sector} · gefordert ${eur(s.offer?.ev ?? 0)}` : `${s.stage ?? "Beteiligung"} · ${eur(s.offer?.ticket ?? 0)} für ${s.offer?.stake ?? 0} %`,
    mastery,
    masteryLabel: MASTERY_LABEL[mastery]!,
    rail,
    current: cur
      ? { index: at, name: cur.name, say: lead ? "Diesmal sage ich nichts vor. Du führst, ich höre zu." : mastery === 2 ? `${cur.short}. Was brauchst du?` : cur.say, ask }
      : undefined,
    chips: EXPERT_IDS.map((id) => ({ id, name: expertName(id, kind), cost: expertCost(s, id) })),
    last,
    findings,
    cost: run?.cost ?? 0,
    days: run?.days ?? 0,
    started: Boolean(run),
    done: Boolean(run?.done),
    summary: run?.done
      ? { priceBefore: run.priceBefore, priceAfter: run.priceAfter ?? run.priceBefore, missed: log.filter((l) => l.missed).length, pain: run.pain, startup: kind === "startup" }
      : undefined,
    startDays: DILIGENCE_DAYS.start,
    reportDays: DILIGENCE_DAYS.report,
    cash: state.cash,
  };
}
