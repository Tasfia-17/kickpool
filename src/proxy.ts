import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4000',
  'https://cinepurr.me',
  'https://www.cinepurr.me',
  'https://cinepurr.netlify.app',
  // Add production socket server domain if different
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXTAUTH_URL,
].filter(Boolean) as string[];

// Regex patterns for dynamic origins (tunnels, preview deployments)
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/.*\.devtunnels\.ms$/,
  /^https?:\/\/.*\.ngrok(-free)?\.(dev|io|app)$/,
  /^https?:\/\/.*\.loca\.lt$/,
  /^https?:\/\/.*\.netlify\.app$/,
  /^https?:\/\/.*\.vercel\.app$/,
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Check pattern matches for tunnels/previews
  return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
}

// Simple in-memory rate limiting for middleware (edge runtime compatible)
// NOTE: This Map only works for single-instance deployments.
// For serverless/edge deployments with multiple instances:
// - Consider using KV store (Vercel KV, Cloudflare KV)
// - Or implement client-side rate limiting with tokens
// - Or use a reverse proxy (nginx, Cloudflare) for rate limiting
// The current implementation is a best-effort defense that still provides
// protection within each instance.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 60 seconds to prevent memory leaks
// This is safe in edge runtime as the Map resets on cold starts anyway
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60000;

function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}

function getIP(request: NextRequest): string {
  // Check Cloudflare header first (most reliable when using CF)
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;

  // Then x-forwarded-for (standard proxy header)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  // Fallback to x-real-ip
  return request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  // Run cleanup occasionally
  cleanupRateLimitMap();

  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getIP(request);

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for session checks (these are called frequently and are read-only)
    const isSessionCheck = pathname === '/api/auth/session' ||
      pathname === '/api/auth/csrf' ||
      pathname === '/api/auth/providers';

    // Stricter limits only for login/register attempts (not session checks)
    if (!isSessionCheck && (pathname === '/api/auth/callback/credentials' ||
      pathname === '/api/auth/signin' ||
      pathname.startsWith('/api/register'))) {
      if (isRateLimited(`${ip}:auth-login`, 10, 60000)) { // 10 login attempts per minute
        return NextResponse.rewrite(new URL('/api/rate-limit?type=auth', request.url));
      }
    }

    // General API rate limit (skip session checks and routes with their own limiters)
    const hasOwnRateLimit = pathname === '/api/rooms' || pathname.startsWith('/api/rooms/');
    if (!isSessionCheck && !hasOwnRateLimit && isRateLimited(`${ip}:api`, 500, 60000)) { // 500 requests per minute
      return NextResponse.rewrite(new URL('/api/rate-limit?type=api', request.url));
    }
  }

  // Security headers for all responses
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // In development, allow 'unsafe-eval' for Next.js hot reload (react-refresh)
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.youtube.com https://s.ytimg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://pagead2.googlesyndication.com"
    : "script-src 'self' 'unsafe-inline' blob: https://www.youtube.com https://s.ytimg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://pagead2.googlesyndication.com";
  const connectSrc = isDev
    ? "connect-src 'self' https: wss: ws: http://localhost:* ws://localhost:*"
    : "connect-src 'self' https: wss:";
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data: blob:; font-src 'self' https://fonts.gstatic.com data:; ${connectSrc}; frame-src 'self' https://www.youtube.com https://player.vimeo.com https://vidsrc.xyz https://vidsrc.to https://vidsrc.me https://vidsrc.net https://vidsrc.cc https://vidsrc.in https://2embed.org https://multiembed.mov https://*.vidsrc.xyz https://*.vidsrc.to https://vsembed.ru https://*.vsembed.ru https://abyss.to https://*.abyss.to https://vidbinge.dev https://*.vidbinge.dev; media-src 'self' https: blob:; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
  );

  // CORS for API routes - only allow known origins
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');

    if (isAllowedOrigin(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin!);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    // For requests without origin (same-origin), allow but don't set CORS headers

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  return response;
}

// Define which routes this middleware runs on
export const config = {
  matcher: [
    // Match API routes
    '/api/:path*',
    // Match all pages except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|manifest.json|sw.js).*)',
  ],
};
