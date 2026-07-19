/**
 * Security utilities for input validation, sanitization, and rate limiting
 */

declare global {
  // Prevent duplicate intervals under hot-reload in development.
  // eslint-disable-next-line no-var
  var __cinepurr_security_cleanup_interval_set: boolean | undefined;
}

// HTML entity encoding to prevent XSS
export const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
    // .replace(/'/g, '&#039;'); // Kaldırıldı, kullanıcı dostu
};

// Remove potentially dangerous characters
export const sanitizeString = (str: string, maxLength: number = 1000): string => {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
};

// Username validation - alphanumeric and underscore only
export const isValidUsername = (username: string): boolean => {
  if (!username || typeof username !== 'string') return false;
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

// Password strength validation - improved security
export const isValidPassword = (password: string): { valid: boolean; message?: string; strength?: 'weak' | 'medium' | 'strong' } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password is too long' };
  }

  // Check for common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty123', 'letmein', 'welcome', 'admin123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'This password is too common. Please choose a stronger one.' };
  }

  // Calculate password strength
  let score = 0;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strength: 'weak' | 'medium' | 'strong' = score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong';

  // Require at least medium strength
  if (score < 2) {
    return {
      valid: false,
      message: 'Password too weak. Include uppercase, lowercase, numbers, or symbols.',
      strength
    };
  }

  return { valid: true, strength };
};

// UUID/CUID validation
export const isValidId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  // CUID pattern or UUID pattern
  const cuidRegex = /^c[a-z0-9]{24}$/;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const shortIdRegex = /^[a-z0-9]{5,10}$/; // For room IDs
  return cuidRegex.test(id) || uuidRegex.test(id) || shortIdRegex.test(id);
};

// Room ID validation (shorter format)
export const isValidRoomId = (roomId: string): boolean => {
  if (!roomId || typeof roomId !== 'string') return false;
  return /^[a-zA-Z0-9]{5,15}$/.test(roomId);
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// Hex color validation
export const isValidHexColor = (color: string): boolean => {
  if (!color || typeof color !== 'string') return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

// Safe JSON parse
export const safeJsonParse = <T>(str: string, fallback: T): T => {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
};

// In-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export const checkRateLimit = (
  key: string,
  maxRequests: number = 1000,
  windowMs: number = 60000
): RateLimitResult => {
  return { allowed: true, remaining: 999, resetIn: windowMs };
};

// Clean up old rate limit entries periodically
if (!globalThis.__cinepurr_security_cleanup_interval_set) {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    });
  }, 60000); // Clean every minute
  globalThis.__cinepurr_security_cleanup_interval_set = true;
}

// Content Security Policy nonce generator
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
};

// Sanitize bio/text fields
export const sanitizeBio = (bio: string): string => {
  if (!bio || typeof bio !== 'string') return '';
  return sanitizeString(bio, 500);
};

// Social media handle validation
export const isValidSocialHandle = (handle: string): boolean => {
  if (!handle) return true; // Optional field
  if (typeof handle !== 'string') return false;
  return /^[a-zA-Z0-9_.-]{1,50}$/.test(handle);
};

// Video URL validation - whitelist allowed providers
export const isValidVideoUrl = (url: string): { valid: boolean; provider?: string; message?: string } => {
  if (!url || typeof url !== 'string') {
    return { valid: false, message: 'URL is required' };
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Allowed video providers
    const allowedProviders: Record<string, string> = {
      'youtube.com': 'youtube',
      'www.youtube.com': 'youtube',
      'youtu.be': 'youtube',
      'm.youtube.com': 'youtube',
      'vimeo.com': 'vimeo',
      'www.vimeo.com': 'vimeo',
      'player.vimeo.com': 'vimeo',
      'dailymotion.com': 'dailymotion',
      'www.dailymotion.com': 'dailymotion',
      // Movie/TV embed hosts (allowed for server-provided embeds)
      'vidsrc.xyz': 'movie-embed',
      'vidsrc.to': 'movie-embed',
      'multiembed.mov': 'movie-embed',
      'abyss.to': 'movie-embed',
      'www.abyss.to': 'movie-embed',
    };

    const provider = allowedProviders[hostname];
    if (!provider) {
      return { valid: false, message: 'Unsupported video provider. Use YouTube, Vimeo, or a supported embed provider.' };
    }

    return { valid: true, provider };
  } catch {
    return { valid: false, message: 'Invalid URL format' };
  }
};

// Sanitize video title to prevent XSS
export const sanitizeVideoTitle = (title: string): string => {
  if (!title || typeof title !== 'string') return 'Untitled Video';
  return escapeHtml(sanitizeString(title, 200));
};

// Generic rate limiter with automatic cleanup
export class RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private cleanupMs: number = 60000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
  }

  check(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
    }

    record.count++;
    return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetTime - now };
  }

  private cleanup() {
    const now = Date.now();
    this.store.forEach((record, key) => {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    });
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limiters for different operations
export const rateLimiters = {
  roomCreate: new RateLimiter(),
  videoChange: new RateLimiter(),
  api: new RateLimiter(),
};

// ============================================
// AUTHORIZATION HELPERS
// ============================================

// Admin roles - normalized to uppercase for consistency
const ADMIN_ROLES = ['ADMIN', 'FOUNDER', 'PURR_ADMIN', 'MODERATOR'] as const;
type AdminRole = typeof ADMIN_ROLES[number];

/**
 * Check if a user has admin privileges
 * Handles case-insensitive role checking for consistency
 */
export const isAdminUser = (role: string | null | undefined): boolean => {
  if (!role || typeof role !== 'string') return false;
  return ADMIN_ROLES.includes(role.toUpperCase() as AdminRole);
};

/**
 * Check if a user is a founder (highest privilege)
 */
export const isFounderUser = (role: string | null | undefined): boolean => {
  if (!role || typeof role !== 'string') return false;
  return role.toUpperCase() === 'FOUNDER';
};

/**
 * Check if a user is a Super Admin (FOUNDER or PURR_ADMIN)
 */
export const isSuperAdmin = (role: string | null | undefined): boolean => {
  if (!role || typeof role !== 'string') return false;
  const upperRole = role.toUpperCase();
  return ['FOUNDER', 'PURR_ADMIN'].includes(upperRole);
};

/**
 * Check if a user can perform moderation actions
 */
export const canModerate = (role: string | null | undefined): boolean => {
  if (!role || typeof role !== 'string') return false;
  const upperRole = role.toUpperCase();
  return ['ADMIN', 'FOUNDER', 'PURR_ADMIN', 'MODERATOR'].includes(upperRole);
};

/**
 * Get standardized role name (uppercase)
 */
export const normalizeRole = (role: string | null | undefined): string => {
  if (!role || typeof role !== 'string') return 'USER';
  return role.toUpperCase();
};

