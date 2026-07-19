import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/security';

// Verify email with 4-digit code
export async function POST(request: Request) {
  try {
    // Rate limit: 5 verification attempts per 15 minutes per IP
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(`verify-email:${clientIP}`, 5, 900000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { message: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { userId, code, resend } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 400 }
      );
    }

    // If resend is requested, generate new code
    if (resend) {
      const newCode = generateVerificationCode();
      const newExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationCode: newCode,
          verificationExpires: newExpires,
        },
      });

      if (user.email) {
        const emailSent = await sendVerificationEmail(user.email, user.username, newCode);
        if (emailSent) {
          return NextResponse.json({ message: 'Verification code resent!' });
        }
      }

      // Return 200 so the frontend can parse the JSON and display a friendly message.
      // A failed email send is not a server error — the code was updated successfully.
      return NextResponse.json({
        message: "We couldn't send your verification email. Please try again in a moment.",
        emailFailed: true,
      });
    }

    // Verify the code
    if (!code) {
      return NextResponse.json(
        { message: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Check if code matches
    if (user.verificationCode !== code) {
      return NextResponse.json(
        { message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if code expired
    if (user.verificationExpires && new Date() > user.verificationExpires) {
      return NextResponse.json(
        { message: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExpires: null,
      },
    });

    return NextResponse.json({
      message: 'Email verified successfully! You can now log in.',
      verified: true,
    });

  } catch (error) {
    logger.error('Verify email error:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
