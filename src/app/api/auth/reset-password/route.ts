import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { isValidPassword, checkRateLimit } from '@/lib/security';

export async function POST(request: Request) {
  try {
    // Rate limiting - 5 attempts per 15 minutes
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(`reset-password:${clientIP}`, 5, 900000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Validate password
    const passwordCheck = isValidPassword(newPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message || 'Password does not meet requirements' },
        { status: 400 }
      );
    }

    // Find valid reset token
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > resetRecord.expiresAt) {
      // Delete expired token
      await prisma.passwordReset.delete({
        where: { id: resetRecord.id },
      });
      return NextResponse.json(
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash the new password (10 rounds is sufficient and prevents event loop starvation)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and delete the reset token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.delete({
        where: { id: resetRecord.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully! You can now log in.'
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
