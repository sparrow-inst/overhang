import { Fragment } from "react";
import type { LumaEventInfo } from "@/lib/luma";
import { formatDateTimeLines } from "@/lib/format";
import styles from "./InfoCard.module.css";

const icon = {
  calendar: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 2.5V7M16 2.5V7" />
    </svg>
  ),
  pin: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  ),
  compass: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2v20M2 12h20M12 6.5 13.8 12 12 17.5 10.2 12 12 6.5Z" />
    </svg>
  ),
};

export function InfoCard({
  event,
  showTitle = true,
  cta,
}: {
  event: LumaEventInfo | null;
  /** false on desktop, where the hero title already says all this */
  showTitle?: boolean;
  /** primary action rendered at the foot of the card */
  cta?: { href: string; label: string };
}) {
  const rows = [
    {
      key: "when",
      icon: icon.calendar,
      lines: event
        ? formatDateTimeLines(event)
        : ["10:00 AM Sep 19 –", "6:00 PM Sep 20"],
    },
    {
      key: "where",
      icon: icon.pin,
      // trailing comma so the two parts read correctly whether they stack
      // (desktop) or join onto one line (mobile)
      lines: event
        ? [`${event.locationLine1},`, event.locationLine2]
        : ["Near Dupont Circle,", "Washington, DC"],
    },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.marker} aria-hidden>
        <span className={styles.markerPulse} />
        <span className={styles.markerRing} />
        <span className={styles.markerCross}>+</span>
      </div>
      <svg className={`${styles.tail} ${styles.tailUp}`} width="34" height="24" viewBox="0 0 34 24">
        <path d="M1 0 L17 22 L33 0" fill="currentColor" stroke="var(--border)" strokeWidth="1.5" />
      </svg>
      <div className={styles.card}>
        {showTitle && (
          <>
            <div className={styles.title}>The Overhang</div>
            <div className={styles.tagline}>
              A two-day convening for forecasters,
              <br />
              rationalists, futurists, and optimists.
            </div>
            <div className={styles.rule}>{icon.compass}</div>
          </>
        )}
        <div className={styles.rows}>
          {rows.map((r) => (
            <div key={r.key} className={styles.row}>
              {r.icon}
              <span className={styles.rowValue}>
                {r.lines.map((line, i) => (
                  <Fragment key={i}>
                    {/* real space between the parts: on mobile they run
                        inline and this is where the line may break */}
                    {i > 0 && " "}
                    <span className={styles.rowLine}>{line}</span>
                  </Fragment>
                ))}
              </span>
            </div>
          ))}
        </div>
        {showTitle && <div className={styles.schedule}>Schedule to come</div>}
        {cta && (
          <a className={styles.cta} href={cta.href}>
            {cta.label}
          </a>
        )}
      </div>
    </div>
  );
}
