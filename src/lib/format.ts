import type { LumaEventInfo } from "@/lib/luma";

/** "10:00 AM Sep 19 – 6:00 PM Sep 20, 2026 ET" — one line, no ambiguity about
    which time belongs to which day */
export function formatDateTimeRange(ev: LumaEventInfo): string {
  if (!ev.startAt) return "Dates to come";
  const start = new Date(ev.startAt);
  const stamp = (d: Date) =>
    `${new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", timeZone: ev.timezone,
    }).format(d)} ${new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", timeZone: ev.timezone,
    }).format(d)}`;
  if (!ev.endAt) return `${stamp(start)}, ${formatYear(ev, start)}`;
  const end = new Date(ev.endAt);
  return `${stamp(start)} – ${stamp(end)}, ${formatYear(ev, end)} ${timezoneAbbr(ev)}`.trim();
}

function formatYear(ev: LumaEventInfo, d: Date): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: ev.timezone }).format(d);
}

function timezoneAbbr(ev: LumaEventInfo): string {
  const abbr =
    new Intl.DateTimeFormat("en-US", { timeZoneName: "short", timeZone: ev.timezone })
      .formatToParts(new Date(ev.startAt!))
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  // "EDT"/"EST" reads awkwardly on a poster; collapse to "ET" style
  return abbr.replace(/^([A-Z])[DS]T$/, "$1T");
}

export function formatPrice(cents: number | null, free: boolean): string {
  if (free) return "Free";
  if (cents == null) return "—";
  return (cents / 100) % 1 === 0
    ? `$${(cents / 100).toFixed(0)}`
    : `$${(cents / 100).toFixed(2)}`;
}
