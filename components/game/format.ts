// Zahlen so, wie man sie im Beirat sagt: kurz, gerundet, deutsch.

export function eur(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Mio. €`;
  return `${sign}${Math.round(abs).toLocaleString("de-DE")} €`;
}

export function eurShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio.`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1000).toLocaleString("de-DE")} Tsd.`;
  return `${sign}${Math.round(abs).toLocaleString("de-DE")}`;
}

export function pct(value: number, digits = 1): string {
  return `${(value * 100).toLocaleString("de-DE", { maximumFractionDigits: digits })} %`;
}

/** Monthly growth as growth over a year (compounded): family businesses are judged by the year. */
export function annualGrowth(monthly: number): number {
  return (1 + monthly) ** 12 - 1;
}

export function signed(value: number, unit = ""): string {
  const text = `${Math.abs(value).toLocaleString("de-DE", { maximumFractionDigits: 1 })}${unit}`;
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : `±${text}`;
}

export function runwayText(months: number | null): string {
  if (months === null || !Number.isFinite(months) || months >= 24) return "über 24 Monate";
  if (months < 1) return "unter 1 Monat";
  return `${months.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Monate`;
}
