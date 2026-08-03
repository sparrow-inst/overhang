"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "day" | "night";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "night",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // the inline script in layout.tsx sets data-theme before hydration
  const [theme, setTheme] = useState<Theme>("night");

  useEffect(() => {
    const current = document.documentElement.dataset.theme as Theme | undefined;
    if (current === "night" || current === "day") setTheme(current);
    // no prefers-color-scheme listener: the site defaults to night regardless
    // of the OS, and only the toggle changes it
  }, []);

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
