import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    const admin = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: { role: true, isFounder: true }
    });

    const adminRoles = ['ADMIN', 'FOUNDER', 'PURR_ADMIN'];
    const isAdmin = admin && (adminRoles.includes(admin.role?.toUpperCase()) || admin.isFounder);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isBanned: true,
        isVIP: true,
        isFounder: true,
        totalXP: true,
        level: true,
        createdAt: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    logger.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
