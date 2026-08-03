/**
 * Server-side Luma public API helpers. The API key grants full access to
 * the calendar it's scoped to, so it is only ever read here — never
 * shipped to the client.
 */

import { EVENT_URL } from "@/lib/event";

const LUMA = "https://public-api.luma.com/v1";
const EVENT_ID = process.env.LUMA_EVENT_ID ?? "evt-nwu5co94KFZux5y";
const EVENT_URL_FALLBACK = EVENT_URL;

export interface LumaEventInfo {
  name: string;
  /** evt-… api id; the Luma checkout embed needs it alongside the ticket type */
  apiId: string;
  url: string;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  locationLine1: string;
  locationLine2: string;
}

export interface LumaTicketType {
  id: string;
  name: string;
  priceCents: number | null;
  free: boolean;
  description: string;
  requireApproval: boolean;
  validStartAt: string | null;
  validEndAt: string | null;
  spotsRemaining: number | null;
}

async function luma(path: string): Promise<Record<string, unknown>> {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error("LUMA_API_KEY not set");
  const res = await fetch(`${LUMA}${path}`, {
    headers: { "x-luma-api-key": key, accept: "application/json" },
    // event details change rarely; revalidate on Vercel every 5 minutes
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Luma ${path} → ${res.status}`);
  return res.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getEventInfo(): Promise<LumaEventInfo | null> {
  try {
    const data: any = await luma(`/event/get?api_id=${encodeURIComponent(EVENT_ID)}`);
    const ev = data.event ?? data ?? {};
    const geo = ev.geo_address_json ?? {};
    return {
      name: ev.name ?? "The Overhang",
      apiId: ev.api_id ?? EVENT_ID,
      url: ev.url ?? EVENT_URL_FALLBACK,
      startAt: ev.start_at ?? null,
      endAt: ev.end_at ?? null,
      timezone: ev.timezone ?? "America/New_York",
      locationLine1: geo.address ?? "Near Dupont Circle",
      locationLine2: geo.city_state ?? "Washington, DC",
    };
  } catch (err) {
    console.error("[luma:event]", err);
    return null;
  }
}

export async function getTicketTypes(): Promise<LumaTicketType[]> {
  const data: any = await luma(`/event/ticket-types/list?event_id=${encodeURIComponent(EVENT_ID)}`);
  const types: any[] = data.ticket_types ?? [];
  return types
    .filter((t) => !t.is_hidden)
    .map((t) => ({
      id: t.id,
      name: t.name,
      priceCents: t.cents ?? null,
      free: t.type === "free",
      description: t.description || "",
      requireApproval: !!t.require_approval,
      validStartAt: t.valid_start_at ?? null,
      validEndAt: t.valid_end_at ?? null,
      spotsRemaining: t.spots_remaining ?? null,
    }));
}
