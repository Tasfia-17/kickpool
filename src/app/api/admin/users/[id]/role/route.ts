import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/security';
import logger from '@/lib/logger';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name || !isSuperAdmin((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { role } = await req.json();
    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const { id: userId } = await params;
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect founders from being forcibly downgraded by another admin or founder via GUI
    if (targetUser.isFounder) {
      return NextResponse.json({ error: 'Cannot modify founder roles from dashboard' }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    logger.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
