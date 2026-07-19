import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CineRank Leaderboard — Top Watch-Party Fans | KickPool',
  description: 'See who watches the most on KickPool! Global rankings by watch hours, rooms created, messages, and more. Earn your CineRank — from Newcomer to Cinema Legend.',
  keywords: ['watch party leaderboard', 'kickpool rankings', 'movie watchers leaderboard', 'watch hours ranking', 'cinerank'],
  openGraph: {
    title: 'CineRank Leaderboard | KickPool',
    description: 'Who are the top KickPool fans? See global rankings by watch time, rooms created, and more.',
    type: 'website',
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
