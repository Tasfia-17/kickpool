import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { sanitizeString, isValidUsername, isValidPassword, checkRateLimit } from '@/lib/security';
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email';
import { Prisma } from '@prisma/client';

// Minimum age (13 years)
const MIN_AGE = 13;

// Allowed email domains
const ALLOWED_DOMAINS = [
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.com.tr',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.com.tr',
  'outlook.com', 'outlook.com.tr',
  'live.com', 'live.co.uk',
  'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com',
  'protonmail.com', 'proton.me',
  'yandex.com', 'yandex.ru', 'yandex.com.tr',
  'mail.com', 'email.com',
  'zoho.com',
  'gmx.com', 'gmx.de',
  'tutanota.com', 'tutamail.com',
  'fastmail.com',
  'hey.com',
  'mynet.com', 'mynet.com.tr',
  'ttmail.com', 'turkmail.com.tr',
  // Testing domains (for TestSprite automated testing)
  'example.com', 'testsprite.com', 'test.com',
];

function isValidEmail(email: string): { valid: boolean; message?: string } {
  const trimmedEmail = email.trim().toLowerCase();
  
  // Basic format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, message: 'Invalid email format' };
  }

  // Check for valid TLD (at least 2 chars, no numbers)
  const tld = trimmedEmail.split('.').pop();
  if (!tld || tld.length < 2 || /\d/.test(tld)) {
    return { valid: false, message: 'Invalid email domain' };
  }

  const domain = trimmedEmail.split('@')[1];
  
  // Allow educational, government and organization domains
  if (domain.endsWith('.edu') || domain.endsWith('.edu.tr') || 
      domain.endsWith('.gov') || domain.endsWith('.gov.tr') ||
      domain.endsWith('.org') || domain.endsWith('.org.tr') ||
      domain.endsWith('.ac.uk') || domain.endsWith('.ac.tr')) {
    return { valid: true };
  }

  // Check if domain is in allowed list
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return { valid: false, message: 'Please use a valid email provider (Gmail, Outlook, Yahoo, etc.)' };
  }

  return { valid: true };
}

function isValidBirthDate(birthDate: string): { valid: boolean; message?: string } {
  const date = new Date(birthDate);
  if (isNaN(date.getTime())) {
    return { valid: false, message: 'Invalid date format' };
  }
  
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate()) ? age - 1 : age;
  
  if (actualAge < MIN_AGE) {
    return { valid: false, message: `You must be at least ${MIN_AGE} years old to register` };
  }
  
  if (actualAge > 120) {
    return { valid: false, message: 'Invalid birth date' };
  }
  
  return { valid: true };
}

export async function POST(req: Request) {
  try {
    // Rate limiting - 5 registrations per hour per IP
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(`register:${clientIP}`, 5, 3600000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { message: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { username, email, password, birthDate } = await req.json();

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Sanitize and validate username
    const cleanUsername = sanitizeString(username);
    if (!isValidUsername(cleanUsername)) {
      return NextResponse.json(
        { message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Validate email
    const cleanEmail = email.toLowerCase().trim();
    const emailValidation = isValidEmail(cleanEmail);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { message: emailValidation.message || 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate password with new strength requirements
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { message: passwordValidation.message },
        { status: 400 }
      );
    }

    let parsedBirthDate: Date | null = null;
    if (birthDate) {
      const birthDateValidation = isValidBirthDate(birthDate);
      if (!birthDateValidation.valid) {
        return NextResponse.json(
          { message: birthDateValidation.message },
          { status: 400 }
        );
      }
      parsedBirthDate = new Date(birthDate);
    }

    // Check if username exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUsername) {
      return NextResponse.json(
        { message: 'An account with these details already exists' },
        { status: 409 }
      );
    }

    // Check if email exists
    const existingEmail = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    if (existingEmail) {
      return NextResponse.json(
        { message: 'An account with these details already exists' },
        { status: 409 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash password with secure cost factor
    const hashedPassword = await hash(password, 12);

    // Check if email verification is enabled
    const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';

    // Create user with verification code
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        birthDate: parsedBirthDate,
        emailVerified: skipEmailVerification, // Only skip in development or if explicitly configured
        verificationCode: skipEmailVerification ? null : verificationCode,
        verificationExpires: skipEmailVerification ? null : verificationExpires,
      },
    });

    // Send verification email if verification is enabled
    if (!skipEmailVerification) {
      const emailSent = await sendVerificationEmail(cleanEmail, cleanUsername, verificationCode);
      
      if (!emailSent) {
        // Account stays created — user can request a resend from the login page
        logger.error(`Failed to send verification email to ${cleanEmail}`);
        return NextResponse.json(
          { 
            message: 'Account created! We had trouble sending your verification email — please use the "Resend verification" option on the login page.',
            userId: user.id,
            requiresVerification: true,
            emailFailed: true,
          },
          { status: 201 }
        );
      }

      return NextResponse.json(
        { 
          message: 'Account created! Please check your email for the verification code.',
          userId: user.id,
          requiresVerification: true,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Account created successfully! You can now log in.',
        userId: user.id,
        skipVerification: true,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { message: 'An account with these details already exists' },
        { status: 409 }
      );
    }
    logger.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
