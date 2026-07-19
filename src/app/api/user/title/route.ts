import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await (prisma.user as any).findUnique({
      where: { id: session.user.id },
      select: {
        unlockedTitles: true,
        activeTitle: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      unlockedTitles: user.unlockedTitles || [],
      activeTitle: user.activeTitle,
    });
  } catch (error: any) {
    logger.error('Error fetching user titles:', error);
    return NextResponse.json({ error: 'Failed to fetch titles' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activeTitle } = await request.json();

    // Verify user owns this title (if not null)
    if (activeTitle) {
      const user = await (prisma.user as any).findUnique({
        where: { id: session.user.id },
        select: { unlockedTitles: true },
      });

      if (!user || !user.unlockedTitles?.includes(activeTitle)) {
        return NextResponse.json({ error: 'Title not owned' }, { status: 403 });
      }
    }

    await (prisma.user as any).update({
      where: { id: session.user.id },
      data: { activeTitle: activeTitle || null },
    });

    return NextResponse.json({ success: true, activeTitle });
  } catch (error: any) {
    logger.error('Error updating user title:', error);
    return NextResponse.json({ error: 'Failed to update title' }, { status: 500 });
  }
}
