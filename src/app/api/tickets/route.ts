import { NextResponse } from "next/server";
import { getEventInfo, getTicketTypes } from "@/lib/luma";

/**
 * GET /api/tickets — trimmed ticket + event shape for the ticket card.
 * Edge-cached: changes in Luma appear within ~5 minutes, stale copies
 * keep serving while it refreshes. The card has a baked-in fallback, so
 * on failure we fail loudly in the log and quietly in the response.
 */
export async function GET() {
  try {
    const [event, ticketTypes] = await Promise.all([getEventInfo(), getTicketTypes()]);
    return NextResponse.json(
      {
        eventUrl: event?.url ?? "https://luma.com/overhang26",
        timezone: event?.timezone ?? "America/New_York",
        ticketTypes,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (err) {
    console.error("[api/tickets]", err);
    return NextResponse.json({ error: "Could not reach Luma" }, { status: 502 });
  }
}
