import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/security';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// Unban user (admin only)
export async function POST(request: Request) {
  try {
    // Rate limit: 10 admin actions per minute per IP
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(`admin:unban:${clientIP}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin (case-insensitive)
    const admin = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: { role: true, isFounder: true }
    });

    const adminRoles = ['ADMIN', 'FOUNDER', 'PURR_ADMIN'];
    const isAdmin = admin && (adminRoles.includes(admin.role?.toUpperCase()) || admin.isFounder);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await (prisma.user.update as any)({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: null
      }
    });

    return NextResponse.json({ success: true, message: `User ${targetUser.username} has been unbanned` });
  } catch (error) {
    logger.error('Error unbanning user:', error);
    return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 });
  }
}
