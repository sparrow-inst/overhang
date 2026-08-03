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

        <section className={styles.hero}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>
              The
              <br />
              Overhang
            </h1>
            <p className={styles.subtitle}>
              A two-day convening for forecasters, rationalists, futurists, and optimists.
            </p>
          </div>

          {/* desktop: tail down at 33% width; mobile: 2/3 down screen, tail up */}
          <div className={`${styles.heroCard} ${styles.cardDesktop}`}>
            <InfoCard event={event} tailDirection="down" />
          </div>
          <div className={`${styles.heroCard} ${styles.cardMobile}`}>
            <InfoCard event={event} tailDirection="up" />
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
                  “Come join us at The Overhang — the view’s nice from here.”
                  <footer>Sparrow Institute</footer>
                </aside>
              </div>
            </section>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <div className={styles.footerBrand}>
                <span className="sparrow-logo" style={{ width: 40, height: 40 }} />
                <div>
                  <div className={styles.footerName}>Sparrow Institute</div>
                  <div className={styles.footerTag}>The view’s nice from here.</div>
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
