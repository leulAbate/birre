/** Concatenate class names, dropping falsy values. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Format a number as US currency. */
export function fmtCurrency(n: number, opts?: { decimals?: boolean; sign?: boolean }): string {
  const decimals = opts?.decimals ?? false;
  const abs = Math.abs(n);
  const body = decimals
    ? abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(abs).toLocaleString();
  const sign = opts?.sign ? (n > 0 ? "+" : n < 0 ? "−" : "") : n < 0 ? "−" : "";
  return `${sign}$${body}`;
}

/** Format a date string (YYYY-MM-DD) as "May 23". */
export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** First-of-month ISO date for a given Date. */
export function monthStart(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
