"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { EVENT_URL } from "@/lib/event";
import styles from "./Header.module.css";

const LINKS = [
  { href: "#speakers", label: "Speakers" },
  { href: "#tickets", label: "Tickets" },
  { href: "#about", label: "About" },
];

export function Header() {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [pastSplash, setPastSplash] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      // wordmark comes in once ~70% of the splash is behind us, rather than
      // waiting for the whole thing to clear
      const splash = document.getElementById("splash");
      if (splash) {
        const { top, height } = splash.getBoundingClientRect();
        setPastSplash(-top >= height * 0.7);
      } else {
        setPastSplash(window.scrollY > window.innerHeight * 0.7);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        styles.header,
        scrolled || menuOpen ? styles.scrolled : "",
        // mobile keeps the bar fully clear until the wordmark arrives, so the
        // splash graphic reads uninterrupted; desktop veils it from the start
        pastSplash || menuOpen ? styles.veiled : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-topo-avoid
    >
      {/* mobile: menu on the left */}
      <button
        className={`${styles.iconBtn} ${styles.menuToggle}`}
        aria-label="Menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      <a className={styles.brand} href="#top">
        <span className="logo-badge" style={{ width: 38, height: 38 }}>
          <span className="sparrow-logo" />
        </span>
        <span className={styles.brandName}>Sparrow<br />Institute</span>
      </a>

      <span className={`${styles.mobileTitle} ${pastSplash ? styles.mobileTitleVisible : ""}`}>
        The Overhang
      </span>

      <nav className={styles.nav}>
        {LINKS.map((l) => (
          <a key={l.href} className={styles.navLink} href={l.href}>
            {l.label}
          </a>
        ))}
        <button className={styles.iconBtn} aria-label="Toggle day/night theme" onClick={toggle}>
          {theme === "night" ? "☀" : "☾"}
        </button>
        <a className={styles.cta} href={EVENT_URL} target="_blank" rel="noopener noreferrer">
          Get Tickets
        </a>
      </nav>

      {/* mobile: light/dark toggle on the right */}
      <button
        className={`${styles.iconBtn} ${styles.menuToggle}`}
        aria-label="Toggle day/night theme"
        onClick={toggle}
      >
        {theme === "night" ? "☀" : "☾"}
      </button>

      {menuOpen && (
        <nav className={`panel ${styles.menu}`}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              className={styles.menuLink}
              href={l.href}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            className={styles.menuLink}
            href={EVENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            Get Tickets →
          </a>
        </nav>
      )}
    </header>
  );
}
