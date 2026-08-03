import type { LumaEventInfo } from "@/lib/luma";

/** "Sat, Sep 19 – Sun, Sep 20, 2026" */
export function formatDateRange(ev: LumaEventInfo): string {
  if (!ev.startAt) return "Dates to come";
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: ev.timezone,
  });
  const start = new Date(ev.startAt);
  if (!ev.endAt) return `${day.format(start)}, ${start.getUTCFullYear()}`;
  const end = new Date(ev.endAt);
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: ev.timezone }).format(end);
  return `${day.format(start)} – ${day.format(end)}, ${year}`;
}

/** "10:00 AM – 6:00 PM ET" */
export function formatTimeRange(ev: LumaEventInfo): string {
  if (!ev.startAt || !ev.endAt) return "Times to come";
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: ev.timezone,
  });
  const tzAbbr =
    new Intl.DateTimeFormat("en-US", { timeZoneName: "short", timeZone: ev.timezone })
      .formatToParts(new Date(ev.startAt))
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  // "EDT"/"EST" reads awkwardly on a poster; collapse to "ET" style
  const tz = tzAbbr.replace(/^([A-Z])[DS]T$/, "$1T");
  return `${time.format(new Date(ev.startAt))} – ${time.format(new Date(ev.endAt))} ${tz}`.trim();
}

export function formatPrice(cents: number | null, free: boolean): string {
  if (free) return "Free";
  if (cents == null) return "—";
  return (cents / 100) % 1 === 0
    ? `$${(cents / 100).toFixed(0)}`
    : `$${(cents / 100).toFixed(2)}`;
}
