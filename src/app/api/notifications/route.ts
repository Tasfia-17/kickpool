import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { escapeHtml } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200);

    const where: any = { userId: session.user.id };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    logger.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, type, title, message, data } = await request.json();

    // Security: Only admins can create notifications for other users
    const targetUserId = userId || session.user.id;
    if (targetUserId !== session.user.id) {
      // Check if current user is admin
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, isFounder: true }
      });
      const adminRoles = ['ADMIN', 'FOUNDER', 'PURR_ADMIN'];
      if (!adminRoles.includes(currentUser?.role?.toUpperCase() || '') && !currentUser?.isFounder) {
        return NextResponse.json({ error: 'Cannot create notifications for other users' }, { status: 403 });
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        type,
        title: title ? escapeHtml(title) : title,
        message: message ? escapeHtml(message) : message,
        data: data ? JSON.stringify(data) : null,
      },
    });

    return NextResponse.json({ notification });
  } catch (error: any) {
    logger.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Support both 'id' and 'notificationId' for backwards compatibility
    const notificationId = body.notificationId || body.id;
    const read = body.read;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Verify the notification belongs to the user
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: read !== undefined ? read : true },
    });

    return NextResponse.json({ notification });
  } catch (error: any) {
    logger.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Support both 'id' and 'notificationId' for backwards compatibility
    const notificationId = body.notificationId || body.id;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Verify the notification belongs to the user
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
