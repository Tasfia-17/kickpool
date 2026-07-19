import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's groups
    const groupMembers = await (prisma as any).groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                  },
                },
              },
            },
            rooms: {
              where: { isPublic: true },
              select: {
                id: true,
                name: true,
                onlineCount: true,
                currentVideoTitle: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ groups: groupMembers.map((gm: any) => gm.group) });
  } catch (error: any) {
    logger.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, icon } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Group name required' }, { status: 400 });
    }

    const group = await (prisma as any).group.create({
      data: {
        name,
        description,
        icon,
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ group });
  } catch (error: any) {
    logger.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

