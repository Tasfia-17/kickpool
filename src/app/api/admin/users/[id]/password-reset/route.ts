import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { authOptions } from '@/lib/auth';
import { isValidId } from '@/lib/security';
import { sendPasswordResetEmail } from '@/lib/email';
import * as crypto from 'crypto';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

export async function POST(
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
    // Verify user exists before sending reset email
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, role: true, isFounder: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent forcing password reset on other admins/founders
    if (adminRoles.includes((targetUser as any).role?.toUpperCase()) || (targetUser as any).isFounder) {
      return NextResponse.json({ error: 'Cannot force password reset on admin users' }, { status: 403 });
    }

    if (!targetUser.email) {
      return NextResponse.json({ error: 'User has no email address' }, { status: 400 });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: id },
    });

    // Create new reset token in the passwordReset table
    await prisma.passwordReset.create({
      data: {
        userId: id,
        token,
        expiresAt,
      },
    });

    // Generate reset URL
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password/${token}`;

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(targetUser.email, targetUser.username, resetUrl);

    if (!emailSent) {
      logger.error('Failed to send password reset email for admin force reset', {
        userId: id,
        username: targetUser.username,
        email: targetUser.email
      });
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please check email configuration.' },
        { status: 500 }
      );
    }

    logger.info('Admin forced password reset', {
      adminUser: session.user.name,
      targetUserId: id,
      targetUsername: targetUser.username
    });

    return NextResponse.json({ 
      message: `Password reset email sent to ${targetUser.email}` 
    });
  } catch (error) {
    logger.error('Admin force password reset error:', error);
    return NextResponse.json({ error: 'Failed to send password reset email' }, { status: 500 });
  }
}
