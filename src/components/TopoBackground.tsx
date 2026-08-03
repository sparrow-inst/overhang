"use client";

import { useEffect, useRef } from "react";
import { createTopo, type TopoHandle } from "@/lib/topo";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Animated topo map behind the splash, scrolling away with it.
 * If WebGL2 is unavailable the div just shows the flat theme background.
 */
export function TopoBackground() {
  const { theme } = useTheme();
  const glRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<TopoHandle | null>(null);

  useEffect(() => {
    if (!glRef.current || !overlayRef.current) return;
    const night = document.documentElement.dataset.theme === "night";
    handleRef.current = createTopo(glRef.current, overlayRef.current, { night });
    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    handleRef.current?.setNight(theme === "night");
  }, [theme]);

  const canvasStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  };

  return (
    <div
      aria-hidden
      style={{
        /* absolute, not fixed: the map belongs to the splash and scrolls away
           with it, rather than sitting pinned behind the whole page */
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "100dvh",
        zIndex: 0,
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      <canvas ref={glRef} style={canvasStyle} />
      <canvas ref={overlayRef} style={{ ...canvasStyle, pointerEvents: "none" }} />
    </div>
  );
}
