import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { invalidateAllFriendCaches } from '@/lib/cache';
import { authOptions } from '@/lib/auth';
import { isValidId } from '@/lib/security';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.name) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { role: true, isFounder: true }
  });

  const adminRoles = ['ADMIN', 'FOUNDER', 'PURR_ADMIN'];
  if (!user || (!adminRoles.includes((user as any).role?.toUpperCase()) && !(user as any).isFounder)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  // Validate user ID format
  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  try {
    // Verify user exists before deletion
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isFounder: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting other admins/founders
    if (adminRoles.includes((targetUser as any).role?.toUpperCase()) || (targetUser as any).isFounder) {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id },
    });

    // Invalidate all friend caches to keep system consistent after admin user delete
    invalidateAllFriendCaches();

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
