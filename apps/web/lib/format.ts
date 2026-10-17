/** "1h 35m", or "35m" under an hour. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/** Today's date in the browser as YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date();
  return toIso(now);
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Parses YYYY-MM-DD as a local date, not UTC midnight. */
function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

/** "Today", "Tomorrow", "Yesterday", or "Mon, Oct 20". */
export function formatDueDate(iso: string): string {
  const days = Math.round((parseIso(iso).getTime() - parseIso(todayIso()).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";

  return parseIso(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Oct 17, 9:30 AM" */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Today (Y-m-d) in a timezone, e.g. the user's rather than the server's. */
export function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}
