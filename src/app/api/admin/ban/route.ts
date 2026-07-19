import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/security';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// Ban user (admin only)
export async function POST(request: Request) {
  try {
    // Rate limit: 10 admin actions per minute per IP
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(`admin:ban:${clientIP}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin (case-insensitive check for all admin roles)
    const admin = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: { role: true, isFounder: true }
    });

    const adminRoles = ['ADMIN', 'FOUNDER', 'PURR_ADMIN'];
    const isAdmin = admin && (adminRoles.includes(admin.role?.toUpperCase()) || admin.isFounder);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, reason } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Can't ban yourself or other admins
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, username: true, isFounder: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (adminRoles.includes(targetUser.role?.toUpperCase()) || targetUser.isFounder) {
      return NextResponse.json({ error: 'Cannot ban an admin' }, { status: 400 });
    }

    await (prisma.user.update as any)({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason || 'Violated community guidelines'
      }
    });

    return NextResponse.json({ success: true, message: `User ${targetUser.username} has been banned` });
  } catch (error) {
    logger.error('Error banning user:', error);
    return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
  }
}
