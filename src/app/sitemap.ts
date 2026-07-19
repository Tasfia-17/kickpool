import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // re-generate at most once per hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://cinepurr.me';

  // Static pages
  const staticPages = [
    { route: '', priority: 1.0, changeFrequency: 'daily' as const },
    { route: '/about', priority: 0.9, changeFrequency: 'weekly' as const },
    { route: '/news', priority: 0.9, changeFrequency: 'daily' as const },
    { route: '/leaderboard', priority: 0.8, changeFrequency: 'daily' as const },

    { route: '/login', priority: 0.6, changeFrequency: 'monthly' as const },
    { route: '/register', priority: 0.7, changeFrequency: 'monthly' as const },
    { route: '/privacy', priority: 0.4, changeFrequency: 'monthly' as const },
    { route: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.map(({ route, priority, changeFrequency }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  // Dynamic profile pages — fetch public, non-banned usernames
  let profileEntries: MetadataRoute.Sitemap = [];
  try {
    const users = await prisma.user.findMany({
      where: { isBanned: false },
      select: { username: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50000, // split into index sitemaps if this grows beyond 50k
    });

    profileEntries = users.map((user) => ({
      url: `${baseUrl}/profile/${encodeURIComponent(user.username)}`,
      lastModified: user.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // DB unavailable at build time — skip dynamic entries gracefully
  }

  return [...staticEntries, ...profileEntries];
}
