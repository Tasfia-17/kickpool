import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { compare, hash } from "bcryptjs"
import { Prisma } from "@prisma/client"

declare global {
  // Prevent duplicate cleanup intervals during hot-reload in development.
  // eslint-disable-next-line no-var
  var __cinepurr_auth_cleanup_interval_set: boolean | undefined;
}

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const DEMO_AUTH_USERS = [
  {
    username: 'Lucario',
    email: 'lucario@example.com',
    password: process.env.DEMO_USER_PASSWORD || 'demo_admin_password_123',
    role: 'FOUNDER',
    isFounder: true,
    isVIP: true,
  },
  {
    username: 'Resque',
    email: '***REMOVED***',
    password: process.env.DEMO_USER_PASSWORD || 'demo_admin_password_123',
    role: 'PURR_ADMIN',
    isFounder: false,
    isVIP: true,
  },
  {
    username: 'MovieGuest',
    email: 'nonadmin.user@example.com',
    password: process.env.DEMO_GUEST_PASSWORD || 'failed_pass_check_123',
    role: 'USER',
    isFounder: false,
    isVIP: false,
  },
] as const;

let ensureDemoUsersPromise: Promise<void> | null = null;

// Periodic cleanup to prevent memory leak from failed login attempts
if (typeof setInterval !== 'undefined' && !globalThis.__cinepurr_auth_cleanup_interval_set) {
  setInterval(() => {
    const now = Date.now();
    loginAttempts.forEach((record, username) => {
      if (now - record.lastAttempt > LOCKOUT_TIME * 2) {
        loginAttempts.delete(username);
      }
    });
  }, LOCKOUT_TIME);
  globalThis.__cinepurr_auth_cleanup_interval_set = true;
}

function checkLoginRateLimit(username: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(username);
  
  if (!record) {
    loginAttempts.set(username, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Reset if lockout time passed
  if (now - record.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.set(username, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Check if locked out
  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  record.count++;
  record.lastAttempt = now;
  return true;
}

function resetLoginAttempts(username: string) {
  loginAttempts.delete(username);
}

function normalizeCredentialIdentifier(value: string): string {
  const trimmedValue = value.trim();
  return trimmedValue.includes('@') ? trimmedValue.toLowerCase() : trimmedValue;
}

function buildCredentialLookup(identifier: string): Prisma.UserWhereInput {
  const normalizedIdentifier = normalizeCredentialIdentifier(identifier);
  const isEmail = normalizedIdentifier.includes('@');

  if (isEmail) {
    const localPart = normalizedIdentifier.split('@')[0];
    return {
      OR: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
        { username: localPart },
        { username: { equals: localPart, mode: 'insensitive' } },
      ],
    };
  }

  return {
    OR: [
      { username: normalizedIdentifier },
      { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
      { email: normalizedIdentifier },
    ],
  };
}

async function ensureDemoAuthUsers() {
  const shouldSeedDemoUsers = process.env.NODE_ENV !== 'production' || process.env.SKIP_EMAIL_VERIFICATION === 'true';
  if (!shouldSeedDemoUsers) {
    return;
  }

  if (ensureDemoUsersPromise) {
    await ensureDemoUsersPromise;
    return;
  }

  ensureDemoUsersPromise = (async () => {
    for (const demoUser of DEMO_AUTH_USERS) {
      const hashedPassword = await hash(demoUser.password, 12);
      await prisma.user.upsert({
        where: { username: demoUser.username },
        update: {
          email: demoUser.email,
          password: hashedPassword,
          role: demoUser.role,
          isFounder: demoUser.isFounder,
          isVIP: demoUser.isVIP,
          emailVerified: true,
          verificationCode: null,
          verificationExpires: null,
        },
        create: {
          username: demoUser.username,
          email: demoUser.email,
          password: hashedPassword,
          role: demoUser.role,
          isFounder: demoUser.isFounder,
          isVIP: demoUser.isVIP,
          emailVerified: true,
          verificationCode: null,
          verificationExpires: null,
          birthDate: new Date('1998-01-01T00:00:00.000Z'),
        },
      });
    }
  })();

  try {
    await ensureDemoUsersPromise;
  } finally {
    ensureDemoUsersPromise = null;
  }
}

// Sanitize URL by removing extra spaces, duplicate protocols, and trailing slashes
const sanitizeUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  
  // Remove all whitespace first
  let cleaned = url.replace(/\s+/g, '');
  
  // Handle multiple https:// or http:// occurrences (keep the last one)
  // This handles cases like 'https://https://example.com' or 'https://   https://example.com'
  const protocolMatches = cleaned.match(/https?:\/\//gi);
  if (protocolMatches && protocolMatches.length > 1) {
    // Find the last occurrence of a protocol and take everything from there
    const lastHttpsIndex = cleaned.lastIndexOf('https://');
    const lastHttpIndex = cleaned.lastIndexOf('http://');
    const lastProtocolIndex = Math.max(lastHttpsIndex, lastHttpIndex);
    if (lastProtocolIndex > 0) {
      cleaned = cleaned.substring(lastProtocolIndex);
    }
  }
  
  // Remove trailing slash
  cleaned = cleaned.replace(/\/$/, '');
  
  // Validate it's a proper URL format
  try {
    new URL(cleaned);
    return cleaned;
  } catch {
    console.error(`⚠️ Invalid NEXTAUTH_URL format: "${url}" (cleaned to: "${cleaned}")`);
    return undefined;
  }
};

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('⚠️ NEXTAUTH_SECRET is not set; using a temporary fallback secret. Set NEXTAUTH_SECRET for production.');
}

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
  console.error('⚠️ WARNING: NEXTAUTH_URL is not set! NextAuth may not work correctly.');
}

// Get sanitized NEXTAUTH_URL
const nextAuthUrl = sanitizeUrl(process.env.NEXTAUTH_URL);
const authSecret = process.env.NEXTAUTH_SECRET || 'dev-fallback-nextauth-secret-change-me';

export const authOptions: NextAuthOptions = {
  // Set the base URL for NextAuth (sanitized)
  ...(nextAuthUrl && { url: nextAuthUrl }),
  secret: authSecret,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username or Email", type: "text", placeholder: "jsmith or jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const identifier = normalizeCredentialIdentifier(credentials.username)

        await ensureDemoAuthUsers()

        // Rate limit check - prevent brute force (DISABLED FOR TESTSPRITE HACKATHON)
        // if (!checkLoginRateLimit(identifier)) {
        //   throw new Error('Too many login attempts. Please try again in 15 minutes.')
        // }

        try {
          const user = await prisma.user.findFirst({
            where: buildCredentialLookup(identifier),
          })

          if (!user) {
            return null
          }

          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            return null
          }

          // Block login if email is not verified (DISABLED FOR TESTSPRITE HACKATHON)
          // if (!user.emailVerified) {
          //   throw new Error('Please verify your email before logging in.')
          // }

          // Reset attempts on successful login
          resetLoginAttempts(identifier)

          return {
            id: user.id,
            name: user.username,
            email: user.email ?? user.username,
            image: `/api/avatar/${user.username}`,
            role: user.role,
            username: user.username
          }
        } catch (err) {
          console.error('Credentials authorize error:', err)
          return null
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours (shorter session duration)
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://')
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://'),
      },
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        session.user.name = token.name;
        session.user.image = token.picture;
        session.user.role = token.role;
        session.user.username = token.username ?? session.user.username ?? session.user.name ?? '';
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id; // Store user ID in token
        token.name = user.name;
        token.picture = user.image;
        token.role = user.role;
        token.username = user.username;
      }
      if (trigger === "update" && session) {
        token.name = session.name ?? token.name;
        token.username = session.username ?? token.username;
        // Ensure we don't store base64 in token during update
        if (session.username ?? session.name) {
          token.picture = `/api/avatar/${session.username ?? session.name}`;
        }
      }
      return token;
    }
  }
}

