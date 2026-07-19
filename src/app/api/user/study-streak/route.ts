import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { studyStreak: true },
    });

    return NextResponse.json({ 
      streak: (user?.studyStreak as number) || 0 
    });
  } catch (error: any) {
    logger.error('Error fetching study streak:', error);
    return NextResponse.json({ error: 'Failed to fetch study streak' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update study streak (increment by 1 hour)
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        studyStreak: {
          increment: 1,
        },
      },
      select: { studyStreak: true },
    });

    return NextResponse.json({ 
      streak: (user.studyStreak as number) || 0,
      message: 'Study streak updated!'
    });
  } catch (error: any) {
    logger.error('Error updating study streak:', error);
    return NextResponse.json({ error: 'Failed to update study streak' }, { status: 500 });
  }
}

