import type { LumaEventInfo } from "@/lib/luma";

/** The start and end stamps as separate lines, so each time stays visibly
    attached to its own day:
      ["10:00 AM Sep 19 –", "6:00 PM Sep 20"]
    Year and timezone are left off — the poster context carries both. */
export function formatDateTimeLines(ev: LumaEventInfo): string[] {
  if (!ev.startAt) return ["Dates to come"];
  const start = new Date(ev.startAt);
  const stamp = (d: Date) =>
    `${new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", timeZone: ev.timezone,
    }).format(d)} ${new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", timeZone: ev.timezone,
    }).format(d)}`;
  if (!ev.endAt) return [stamp(start)];
  return [`${stamp(start)} –`, stamp(new Date(ev.endAt))];
}

export function formatPrice(cents: number | null, free: boolean): string {
  if (free) return "Free";
  if (cents == null) return "—";
  return (cents / 100) % 1 === 0
    ? `$${(cents / 100).toFixed(0)}`
    : `$${(cents / 100).toFixed(2)}`;
}
