import type { Metadata } from 'next';

const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://cinepurr.me';

export const metadata: Metadata = {
  title: 'About CinePurr — Free Watch Party App for YouTube & Videos',
  description:
    'CinePurr lets you watch YouTube videos with friends for free — no login required. Sync video playback in real-time, chat, play games, and enjoy watch parties from anywhere. The best free watch-together site.',
  keywords: [
    'watch YouTube with friends free',
    'sync video call for movies',
    'no login watch together site',
    'free watch party app',
    'watch videos together online',
    'synchronized video playback',
    'watch YouTube together',
    'online movie night',
    'watch party no account needed',
    'real-time video sync',
    'CinePurr',
    'watch together app',
  ],
  alternates: {
    canonical: `${baseUrl}/about`,
  },
  openGraph: {
    type: 'website',
    url: `${baseUrl}/about`,
    title: 'About CinePurr — Free Watch Party App for YouTube & Videos',
    description:
      'CinePurr is the free, no-login watch party platform. Sync YouTube and videos with friends in real-time — chat, play minigames, earn achievements, and stay cozy together. 🐱🎬',
    siteName: 'CinePurr',
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'CinePurr — Watch Movies & Videos Together',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About CinePurr — Free Watch Party App',
    description:
      'Watch YouTube with friends for free. Sync playback, chat, and play games together — no account required. 🐱🎬',
    images: [`${baseUrl}/og-image.png`],
    creator: '@cinepurr',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
