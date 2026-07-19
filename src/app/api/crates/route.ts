import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
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

    const crates = await prisma.crate.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        rewards: true,
      },
    });

    // Check for user's most recent daily crate to calculate tomorrow's timer
    // Use UTC to avoid timezone issues
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const latestDaily = await prisma.crate.findFirst({
      where: {
        userId: user.id,
        crateType: 'daily',
      },
      orderBy: { createdAt: 'desc' }
    });

    let nextDailyAt = null;
    let availableDaily = true;

    if (latestDaily) {
      const lastClaimDate = new Date(latestDaily.createdAt);
      // If the latest daily was claimed today (UTC), next one is tomorrow at midnight UTC
      if (lastClaimDate >= todayUTC) {
        availableDaily = false;
        const tomorrow = new Date(todayUTC);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        nextDailyAt = tomorrow.toISOString();
      }
    }

    return NextResponse.json({
      crates,
      nextDailyAt,
      availableDaily
    });
  } catch (error) {
    logger.error('Error fetching crates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { crateType = 'common' } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && !user.isFounder) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const crate = await prisma.crate.create({
      data: {
        userId: user.id,
        crateType,
      },
    });

    return NextResponse.json({ crate });
  } catch (error) {
    logger.error('Error creating crate:', error);
    return NextResponse.json(
      { error: 'Failed to create crate' },
      { status: 500 }
    );
  }
}

