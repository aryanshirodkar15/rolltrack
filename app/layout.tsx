import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import RevealObserver from "@/components/RevealObserver";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rolltrack",
  description:
    "Log every D&D session, watch the hours at the table add up, and see where your campaigns really went.",
};

// Rigid app-like screen on phones: no pinch-zoom drift, no accidental
// input-focus zoom (paired with 16px input text on mobile in globals.css).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">
        <div aria-hidden className="bg-grid" />
        <div aria-hidden className="bg-glow" />
        <RevealObserver />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
