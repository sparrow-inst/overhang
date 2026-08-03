import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "The Overhang 2026 — Washington, DC",
  description:
    "A two-day convening for forecasters, rationalists, futurists, and optimists. September 19–20, 2026, near Dupont Circle, Washington, DC. Hosted by Sparrow Institute.",
  openGraph: {
    title: "The Overhang 2026",
    description:
      "A two-day convening for forecasters, rationalists, futurists, and optimists. Sep 19–20, Washington, DC.",
    url: "https://luma.com/overhang26",
    siteName: "The Overhang",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe0" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0910" },
  ],
};

// runs before paint: pick stored theme, else follow the OS
const themeInit = `(function(){try{var s=localStorage.getItem("overhang-theme");var t=s||(matchMedia("(prefers-color-scheme: dark)").matches?"night":"day");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="day";}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="day" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
