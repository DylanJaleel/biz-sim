const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** "+1.234 €" / "−1.234 €" — the sign is always shown (profit, deltas). */
export function formatSignedCurrency(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return formatCurrency(0);
  return `${rounded > 0 ? "+" : "−"}${formatCurrency(Math.abs(rounded))}`;
}

const hoursFormatter = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export function formatHours(hours: number): string {
  return `${hoursFormatter.format(hours)} Std.`;
}

export function formatPercent(share: number): string {
  return `${Math.round(share * 100)} %`;
}
