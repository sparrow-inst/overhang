"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./SpeakerCarousel.module.css";
import data from "@/data/speakers.json";

interface Speaker {
  id: string;
  name: string;
  subtitle: string;
  photoUrl: string;
}

const speakers: Speaker[] = data.speakers;

export function SpeakerCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const cardStep = () => {
    const track = trackRef.current;
    if (!track || track.children.length < 2) return 223;
    const a = track.children[0] as HTMLElement;
    const b = track.children[1] as HTMLElement;
    return b.offsetLeft - a.offsetLeft;
  };

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setIndex(Math.min(speakers.length - 1, Math.round(track.scrollLeft / cardStep())));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const scrollTo = (i: number) => {
    trackRef.current?.scrollTo({ left: i * cardStep(), behavior: "smooth" });
  };

  return (
    <section id="speakers" style={{ scrollMarginTop: 80 }}>
      <div className={styles.head}>
        <h2 className="section-title">Featured Speakers</h2>
        <div className={styles.arrows}>
          <button
            className={styles.arrow}
            aria-label="Previous speakers"
            disabled={index === 0}
            onClick={() => scrollTo(index - 1)}
          >
            ←
          </button>
          <button
            className={styles.arrow}
            aria-label="Next speakers"
            disabled={index >= speakers.length - 1}
            onClick={() => scrollTo(index + 1)}
          >
            →
          </button>
        </div>
      </div>

      <div className={styles.track} ref={trackRef}>
        {speakers.map((s) => (
          <article key={s.id} className={styles.card}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.photo} src={s.photoUrl} alt={s.name} loading="lazy" />
            <div className={styles.meta}>
              <div className={styles.name}>{s.name}</div>
              <div className={styles.subtitle}>{s.subtitle}</div>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.dots}>
        {speakers.map((s, i) => (
          <button
            key={s.id}
            className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
            aria-label={`Go to speaker ${i + 1}`}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>
    </section>
  );
}
