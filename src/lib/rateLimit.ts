import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limit store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Different rate limits for different endpoints
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints - stricter limits
  '/api/auth': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  '/api/register': { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  '/api/login': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute

  // Search/API endpoints
  '/api/youtube': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  '/api/movies': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  '/api/search': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute

  // Room operations
  '/api/rooms': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute

  // General API
  '/api': { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute default
};

function getClientIP(request: NextRequest): string {
  // Check various headers for real IP (behind proxy/CDN)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Find matching rate limit config
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }
  return RATE_LIMITS['/api']; // Default
}

export function rateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  const config = getRateLimitConfig(pathname);

  const key = `${ip}:${pathname}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return null; // Allow request
  }

  if (record.count >= config.maxRequests) {
    // Rate limited
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please slow down and try again later',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(record.resetTime),
        },
      }
    );
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);

  return null; // Allow request
}

// Cleanup old entries periodically (run every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const entries = Array.from(rateLimitStore.entries());
    for (const [key, record] of entries) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export default rateLimit;
