import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Film News — Trending & Now Playing Movies',
  description:
    'Browse trending movies, now playing in cinemas, and upcoming releases. Discover what to watch together on CinePurr.',
  alternates: {
    canonical: `${process.env.NEXTAUTH_URL || 'https://cinepurr.me'}/news`,
  },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
