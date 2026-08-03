"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "day" | "night";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "day",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // the inline script in layout.tsx sets data-theme before hydration
  const [theme, setTheme] = useState<Theme>("day");

  useEffect(() => {
    const current = document.documentElement.dataset.theme as Theme | undefined;
    if (current === "night" || current === "day") setTheme(current);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("overhang-theme")) apply(e.matches ? "night" : "day");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const apply = (t: Theme) => {
    document.documentElement.dataset.theme = t;
    setTheme(t);
  };

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "day" ? "night" : "day";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("overhang-theme", next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
