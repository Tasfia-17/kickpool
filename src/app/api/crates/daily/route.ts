import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import rateLimiter from '@/lib/rateLimiterRedis';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already got a daily crate today (using UTC to avoid timezone issues)
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    // Rate limiting to prevent double-claiming race condition using Redis
    const rateLimitKey = `crate:daily:${user.id}:${todayUTC.getTime()}`;
    const isAllowed = await rateLimiter.checkLimit(rateLimitKey, 86400000, 1); // 1 claim per 24 hours
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Daily crate already claimed' },
        { status: 429 }
      );
    }
    
    const existingCrate = await prisma.crate.findFirst({
      where: {
        userId: user.id,
        crateType: 'daily',
        createdAt: {
          gte: todayUTC,
        },
      },
    });

    if (existingCrate) {
      return NextResponse.json(
        { error: 'Daily crate already claimed' },
        { status: 400 }
      );
    }

    // Create daily crate
    const crate = await prisma.crate.create({
      data: {
        userId: user.id,
        crateType: 'daily',
      },
    });

    return NextResponse.json({ crate });
  } catch (error) {
    logger.error('Error claiming daily crate:', error);
    return NextResponse.json(
      { error: 'Failed to claim daily crate' },
      { status: 500 }
    );
  }
}

