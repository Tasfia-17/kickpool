import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/security';

export async function POST(request: Request) {
  try {
    // Rate limit: 5 verification attempts per 15 minutes per IP
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(`verify-user:${clientIP}`, 5, 900000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { username, email } = await request.json();

    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    // Find user by username and email
    await prisma.user.findFirst({
      where: {
        username: username,
        email: email,
      },
    });

    // Always return a uniform response to avoid leaking whether the account exists.
    // The forgot-password flow already provides the next safe step to the user.
    return NextResponse.json({
      success: true,
      message: 'If the provided details are valid, you can continue.'
    });

  } catch (error) {
    logger.error('Verify user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
