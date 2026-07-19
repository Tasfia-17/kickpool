import type { Metadata, Viewport } from "next";
import React from "react";
import { VT323 } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import MaintenancePage from "@/app/maintenance/page";
import { SkipToContent } from "@/components/Accessibility";
import ClientRoot from "@/components/ClientRoot";
import { FullStructuredData } from "@/components/StructuredData";
import { ThemeProvider } from "@/components/ThemeProvider";
import { authOptions } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { isMaintenanceMode } from "@/lib/maintenance";
import { isSuperAdmin } from "@/lib/security";

const pixelFont = VT323({
  weight: "400",
  subsets: ["latin"],
  display: "swap", // Prevent FOIT (Flash of Invisible Text)
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#7c3aed",
};

const baseUrl =
  process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://kickpool.app";
const siteTitle = "KickPool - World Cup Sweepstakes with Live AI Commentary";
const siteDescription =
  "Create group sweepstakes for any World Cup match. Predict the score, watch live with friends, and get paid out automatically on Solana. Powered by TxLINE real-time data.";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: siteTitle,
    template: "%s | KickPool",
  },
  description: siteDescription,
  keywords: [
    "world cup 2026",
    "sweepstakes",
    "football pool",
    "soccer prediction",
    "live commentary",
    "solana",
    "txline",
    "group pool",
    "crypto sports",
    "usdc payout",
  ],
  authors: [{ name: "KickPool" }],
  creator: "KickPool",
  publisher: "KickPool",
  robots: "index, follow",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "KickPool",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    creator: "@kickpoolapp",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KickPool",
  },
  applicationName: "KickPool",
  category: "sports",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let showMaintenance = false;

  try {
    const maintenanceActive = await isMaintenanceMode();
    if (maintenanceActive) {
      const session = await getServerSession(authOptions);
      if (!session?.user || !isSuperAdmin((session.user as any).role)) {
        showMaintenance = true;
      }
    }
  } catch {
    // Ignore maintenance checks on layout render failure to keep the app resilient.
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem('kickpool_intro_played')) {
                  document.documentElement.classList.add('skip-intro');
                }
              } catch (e) {}
            `,
          }}
        />
        <link rel="dns-prefetch" href="https://api.themoviedb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://www.omdbapi.com" />

        {/* Preload the sprite most likely to appear in the home-page hero. */}
        <link rel="preload" href="/sprites/animated/25.gif" as="image" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={pixelFont.className} suppressHydrationWarning>
        <SkipToContent />
        <FullStructuredData />
        <ThemeProvider>
          <I18nProvider>
            <ClientRoot>
              <div id="main-content" tabIndex={-1}>
                {showMaintenance ? <MaintenancePage /> : children}
              </div>
            </ClientRoot>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
