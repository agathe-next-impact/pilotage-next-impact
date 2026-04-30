/**
 * Helpers de formatage — locale fr-FR.
 */

const numberFmt = new Intl.NumberFormat("fr-FR");
const compactFmt = new Intl.NumberFormat("fr-FR", { notation: "compact" });

export function fmtNumber(n: number): string {
  return numberFmt.format(Math.round(n));
}

export function fmtCompact(n: number): string {
  return compactFmt.format(n);
}

export function fmtPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtSignedDelta(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "" : "±";
  return `${sign}${fmtNumber(n)}`;
}

export function fmtPeriodLong(period: string): string {
  // "2026-04" → "Avr. 2026"
  const [year, monthStr] = period.split("-");
  const month = monthStr ? Number.parseInt(monthStr, 10) : NaN;
  if (!year || Number.isNaN(month)) return period;
  const months = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  return `${months[month - 1] ?? ""} ${year}`;
}

export function fmtPeriodShort(period: string): string {
  const [, monthStr] = period.split("-");
  const month = monthStr ? Number.parseInt(monthStr, 10) : NaN;
  if (Number.isNaN(month)) return period;
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
  return months[month - 1] ?? period;
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
