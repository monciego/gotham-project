const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const USD_ROUND = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** $1,234.50. */
export function formatMoney(amount: number): string {
  return USD.format(amount);
}

/** $1,235, for charts and tight spaces. */
export function formatMoneyRound(amount: number): string {
  return USD_ROUND.format(amount);
}

/** "1,234.5" or "$1,234.50" typed by a person, as a number. NaN when it isn't one. */
export function parseMoney(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, "");
  return /^\d+(\.\d{0,2})?$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/** "2026-10" → "October 2026" (or "Oct" with `short`). */
export function formatMonth(month: string, short = false): string {
  const [year, number] = month.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat("en-US", short ? { month: "short", timeZone: "UTC" } : { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, number - 1, 1)),
  );
}

/** "2026-10" plus or minus months. */
export function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, number - 1 + by, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-10-17" → "Oct 17, 2026". */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
