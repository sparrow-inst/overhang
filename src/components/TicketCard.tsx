"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import styles from "./TicketCard.module.css";

interface Tier {
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

/* Baked snapshot of the live tiers — served if the API call fails so the
 * card never renders empty. Not the source of truth.
 * The id is the ttype- api_id Luma returns; the checkout embed matches on it,
 * so a typo here silently drops the pre-selected tier. */
const FALLBACK: { eventUrl: string; eventApiId: string; ticketTypes: Tier[] } = {
  eventUrl: "https://luma.com/overhang26",
  eventApiId: "evt-nwu5co94KFZux5y",
  ticketTypes: [
    { id: "ttype-yFA9UKocxvGSCUJ", name: "Standard Ticket", priceCents: 20000, free: false, description: "", requireApproval: true, validStartAt: "2026-08-14T21:00:00.000Z", validEndAt: "2026-08-29T03:59:59.000Z", spotsRemaining: null },
  ],
};

declare global {
  interface Window {
    luma?: { initCheckout?: () => void };
  }
}

type TierStatus = "open" | "upcoming" | "ended" | "soldout";

function tierStatus(t: Tier, now: number): TierStatus {
  if (t.spotsRemaining === 0) return "soldout";
  if (t.validStartAt && Date.parse(t.validStartAt) > now) return "upcoming";
  if (t.validEndAt && Date.parse(t.validEndAt) < now) return "ended";
  return "open";
}

function statusLine(t: Tier, status: TierStatus): string | null {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "America/New_York" };
  if (status === "soldout") return "Sold out";
  if (status === "upcoming" && t.validStartAt)
    return `Opens ${new Intl.DateTimeFormat("en-US", opts).format(new Date(t.validStartAt))}`;
  if (status === "ended") return "Sales ended";
  if (status === "open" && t.validEndAt)
    return `Until ${new Intl.DateTimeFormat("en-US", opts).format(new Date(t.validEndAt))}`;
  return null;
}

export function TicketCard() {
  const [eventUrl, setEventUrl] = useState(FALLBACK.eventUrl);
  const [eventApiId, setEventApiId] = useState(FALLBACK.eventApiId);
  const [tiers, setTiers] = useState<Tier[]>(FALLBACK.ticketTypes);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(0); // 0 until mount → all tiers render neutral on the server pass

  useEffect(() => {
    setNow(Date.now());
    fetch("/api/tickets")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (Array.isArray(data.ticketTypes) && data.ticketTypes.length) {
          setTiers(data.ticketTypes);
          if (data.eventUrl) setEventUrl(data.eventUrl);
          if (data.eventApiId) setEventApiId(data.eventApiId);
        }
      })
      .catch((err) => console.error("[tickets] falling back to snapshot:", err));
  }, []);

  const statuses = useMemo(
    () => new Map(tiers.map((t) => [t.id, now ? tierStatus(t, now) : "open"] as const)),
    [tiers, now],
  );

  // default selection: first tier that is actually purchasable
  useEffect(() => {
    if (selected && statuses.get(selected) === "open") return;
    const first = tiers.find((t) => statuses.get(t.id) === "open");
    if (first) setSelected(first.id);
  }, [tiers, statuses, selected]);

  /* The embed script binds its click handler when it scans the DOM, which
     happens before this client component has rendered — and it reads the
     ticket type off the element at bind time, so a changed selection needs a
     re-bind too. initCheckout is the script's own re-scan hook. */
  useEffect(() => {
    window.luma?.initCheckout?.();
  }, [selected, eventApiId]);

  /* Plain link target for no-JS and as the href the embed overrides: the
     event page itself, since ?tt= only means something on the embed URL. */
  const href = eventUrl;

  return (
    <section id="tickets" style={{ scrollMarginTop: 80 }}>
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>Get your ticket</h2>
          <span className={styles.secure}>
            Secure checkout by <span className={styles.lumaMark}>luma*</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="10" width="16" height="11" rx="2.5" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
        </div>
        <p className={styles.blurb}>Includes all meals, beverages, and the afterparty.</p>

        <div className={styles.tiers}>
          {tiers.map((t) => {
            const status = statuses.get(t.id) ?? "open";
            const line = now ? statusLine(t, status) : null;
            const selectable = status === "open";
            return (
              <button
                key={t.id}
                className={`${styles.tier} ${selected === t.id ? styles.tierSelected : ""}`}
                disabled={!selectable}
                onClick={() => setSelected(t.id)}
              >
                <span className={styles.tierName}>
                  {t.name}
                  <span className={styles.check}>✓</span>
                </span>
                <span className={styles.price}>{formatPrice(t.priceCents, t.free)}</span>
                {t.description && <span className={styles.tierNote}>{t.description}</span>}
                {t.requireApproval && <span className={styles.tierNote}>Requires approval</span>}
                {line && <span className={styles.status}>{line}</span>}
              </button>
            );
          })}
        </div>

        <a
          className={`${styles.cta}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-luma-action="checkout"
          data-luma-event-id={eventApiId}
          {...(selected ? { "data-luma-ticket-type": selected } : {})}
        >
          Get Tickets <span aria-hidden>→</span>
        </a>
        <div className={styles.footer}>
          Registration, login, and payment happen on{" "}
          <a href={eventUrl} target="_blank" rel="noopener noreferrer">
            luma.com
          </a>
          .
        </div>
      </div>
    </section>
  );
}
