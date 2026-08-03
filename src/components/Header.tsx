"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
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
      // wordmark waits until the whole splash screen is behind us
      const splash = document.getElementById("splash");
      setPastSplash(
        splash ? splash.getBoundingClientRect().bottom <= 64 : window.scrollY > window.innerHeight,
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled || menuOpen ? styles.scrolled : ""}`} data-topo-avoid>
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
        <a className={styles.cta} href="#tickets">
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
          <a className={styles.menuLink} href="#tickets" onClick={() => setMenuOpen(false)}>
            Get Tickets →
          </a>
        </nav>
      )}
    </header>
  );
}
