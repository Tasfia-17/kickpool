import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/security';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // Rate limit: 3 password reset requests per 15 minutes per IP
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(`forgot-password:${clientIP}`, 3, 900000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { message: 'Too many password reset requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password/${token}`;
    const emailSent = await sendPasswordResetEmail(email, user.username, resetUrl);

    if (!emailSent) {
      logger.error('Failed to send password reset email');
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
