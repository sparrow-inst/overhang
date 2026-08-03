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

// night's --bg: the site defaults dark whatever the OS says
export const viewport: Viewport = {
  themeColor: "#0a0910",
};

// runs before paint: honour a stored choice, else default to night — the site
// is designed dark first, so we don't follow the OS preference
const themeInit = `(function(){try{var s=localStorage.getItem("overhang-theme");document.documentElement.dataset.theme=s==="day"?"day":"night";}catch(e){document.documentElement.dataset.theme="night";}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="night" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
