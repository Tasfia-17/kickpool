import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { escapeHtml, sanitizeString, isValidUsername } from '@/lib/security';
import logger from '@/lib/logger';
import { invalidateFriendsCacheFor } from '@/lib/cache';
import redisClient, { isRedisAvailable } from '@/lib/redis';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await (prisma.user as any).findUnique({
      where: { username: session.user.name! },
      select: {
        id: true,
        username: true,
        image: true,
        bio: true,
        discord: true,
        instagram: true,
        twitter: true,
        role: true,
        isFounder: true,
        activeTitle: true,
        unlockedTitles: true,
        unlockedBadges: true,
        unlockedThemes: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Founders and PURR_ADMINs automatically have all exclusive themes unlocked
    const EXCLUSIVE_THEME_IDS = ['umbreon', 'flareon', 'gengar', 'sylveon'];
    const isPrivileged = user.isFounder || user.role === 'PURR_ADMIN';
    const effectiveUnlockedThemes = isPrivileged
      ? Array.from(new Set([...(user.unlockedThemes || []), ...EXCLUSIVE_THEME_IDS]))
      : (user.unlockedThemes || []);

    return NextResponse.json({ ...user, unlockedThemes: effectiveUnlockedThemes });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { username, image, bio, discord, instagram, twitter } = body;

    // Validate required fields
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Validate username format
    if (!isValidUsername(username)) {
      return NextResponse.json({ error: 'Invalid username. Use 3-20 alphanumeric characters.' }, { status: 400 });
    }

    // Sanitize all text inputs to prevent XSS
    const sanitizedBio = bio ? escapeHtml(sanitizeString(bio, 500)) : null;
    const sanitizedDiscord = discord ? escapeHtml(sanitizeString(discord, 50)) : null;
    const sanitizedInstagram = instagram ? escapeHtml(sanitizeString(instagram, 50)) : null;
    const sanitizedTwitter = twitter ? escapeHtml(sanitizeString(twitter, 50)) : null;

    // Check if username is taken (if changed)
    if (username !== session.user.name) {
      const existing = await prisma.user.findUnique({
        where: { username: username.trim() }
      });
      if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
    }

    const user = await (prisma.user as any).update({
      where: { username: session.user.name! },
      data: {
        username: username.trim(),
        image: image || null,
        bio: sanitizedBio,
        discord: sanitizedDiscord,
        instagram: sanitizedInstagram,
        twitter: sanitizedTwitter
      },
      select: {
        id: true,
        username: true,
        image: true,
        bio: true,
        discord: true,
        instagram: true,
        twitter: true,
        unlockedBadges: true,
        unlockedThemes: true
      }
    });

    // Invalidate friends cache for the user since profile fields may have changed (avatar/names)
    if (user?.id) invalidateFriendsCacheFor(user.id);

    // Invalidate public profile cache
    if (redisClient && isRedisAvailable()) {
      // Invalidate the old username (in case they changed it)
      await redisClient.del(`profile:${session.user.name}`);
      // Invalidate the new username
      await redisClient.del(`profile:${username.trim()}`);
    }

    return NextResponse.json(user);
  } catch (error: any) {
    logger.error('Failed to update profile', error);

    // Provide more specific error messages
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
