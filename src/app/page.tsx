import { Header } from "@/components/Header";
import { TopoBackground } from "@/components/TopoBackground";
import { InfoCard } from "@/components/InfoCard";
import { SpeakerCarousel } from "@/components/SpeakerCarousel";
import { TicketCard } from "@/components/TicketCard";
import { getEventInfo } from "@/lib/luma";
import styles from "./page.module.css";

export const revalidate = 300;

export default async function Home() {
  const event = await getEventInfo();

  return (
    <>
      <TopoBackground />
      <div className={styles.main} id="top">
        <Header />

        <section className={styles.hero} id="splash">
          {/* plate + card travel together, so the card is positioned in
              relation to the legend rather than to the viewport corner */}
          <div className={styles.heroGroup}>
            <div className={styles.titleBlock} data-topo-avoid>
              <h1 className={styles.title}>
                The
                <br />
                Overhang
              </h1>
              <p className={styles.subtitle}>
                A two-day convening for forecasters, rationalists, futurists, and optimists.
              </p>
            </div>

            {/* desktop card skips the title the hero already shows, and
                carries the CTA */}
            <div className={`${styles.heroCard} ${styles.cardDesktop}`} data-topo-avoid>
              <InfoCard event={event} showTitle={false} cta={{ href: "#tickets", label: "Get Tickets" }} />
            </div>
          </div>
          <div className={`${styles.heroCard} ${styles.cardMobile}`} data-topo-avoid>
            <InfoCard event={event} />
          </div>
        </section>

        <div className={styles.solid}>
          <div className={styles.inner}>
            <SpeakerCarousel />
            <TicketCard />

            <section id="about" style={{ scrollMarginTop: 80 }}>
              <div className={styles.aboutGrid}>
                <div>
                  <h2 className="section-title">About The Overhang</h2>
                  <div className={styles.aboutBody}>
                    <p>
                      Sparrow Institute is a new nonprofit building a bridge between the San
                      Francisco Bay and Washington, DC. At the outset of great social change —
                      potentially the beginning of infinity — what does Washington need to know,
                      and how can we help communicate it?
                    </p>
                    <p>
                      Join us for a weekend of programmed talks, relaxed breakout sessions, and
                      community-driven unconference space — plus intense discussions, crazy
                      shenanigans, and joy. We hope some moonshots come out of this convergence.
                    </p>
                    <a
                      className={styles.aboutLink}
                      href="https://luma.com/overhang26"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Full event details on Luma →
                    </a>
                  </div>
                </div>
                <aside className={styles.aboutAside}>
                  Come join us at The Overhang — the view’s nice from here.
                  <footer>(Just don't look down)</footer>
                </aside>
              </div>
            </section>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <div className={styles.footerBrand}>
                <span className="logo-badge" style={{ width: 44, height: 44 }}>
                  <span className="sparrow-logo" />
                </span>
                <div>
                  <div className={styles.footerName}>Sparrow Institute</div>
                  <div className={styles.footerTag}>While I breathe, I hope.</div>
                </div>
              </div>
              <nav className={styles.footerNav}>
                <a href="#speakers">Speakers</a>
                <a href="#tickets">Tickets</a>
                <a href="#about">About</a>
                <a href="https://luma.com/overhang26" target="_blank" rel="noopener noreferrer">
                  Luma
                </a>
              </nav>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
