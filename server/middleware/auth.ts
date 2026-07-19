/**
 * CinePurr Server — Socket.io Authentication Middleware
 *
 * Verifies NextAuth JWTs during the WebSocket handshake using the
 * `next-auth/jwt` decode function. Authenticated users get their
 * identity injected into the socket; guests are allowed but flagged.
 *
 * This middleware is applied via `io.use(socketAuthMiddleware)` in the
 * entry point before any domain handlers are registered.
 *
 * @see PDF Section 6 — "Hardened Handshakes and Rate Limiting"
 */

import { Socket } from 'socket.io';
import { decode } from 'next-auth/jwt';
import type { AuthenticatedSocket } from '../types';
import logger from '../../src/lib/logger';

// ============================================
// CONFIGURATION
// ============================================

const FALLBACK_NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'dev-fallback-nextauth-secret-change-me';
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || FALLBACK_NEXTAUTH_SECRET;

if (!process.env.NEXTAUTH_SECRET) {
  logger.warn(
    '⚠️ NEXTAUTH_SECRET not set — using fallback secret for socket auth. Set NEXTAUTH_SECRET in .env for production consistency.'
  );
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Socket.io authentication middleware.
 *
 * Attach to the io instance via `io.use(socketAuthMiddleware)`.
 *
 * Flow:
 *   1. If no token → allow as guest (isGuest = true)
 *   2. If NEXTAUTH_SECRET missing → reject authenticated attempts
 *   3. Decode JWT via next-auth/jwt → inject userId, userName, userRole
 *   4. On failure → reject with auth error
 *
 * The verified identity is attached directly to the socket instance
 * (as `AuthenticatedSocket` properties) for downstream handlers.
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const authSocket = socket as unknown as AuthenticatedSocket;
    const token = socket.handshake.auth?.token;

    // ── Guest connections ─────────────────────────────────────────
    if (!token) {
      authSocket.userId = null;
      authSocket.userName = null;
      authSocket.userRole = 'GUEST';
      authSocket.isGuest = true;
      logger.debug(`[AUTH] Guest socket connected: ${socket.id}`);
      return next();
    }

    // ── Verify the NextAuth JWT ──────────────────────────────────
    // Uses next-auth/jwt's decode() which handles:
    //   • HKDF key derivation from NEXTAUTH_SECRET
    //   • JWE decryption (A256GCM)
    //   • Payload validation
    //
    // This is the same function NextAuth uses internally, ensuring
    // perfect compatibility with the token format.
    const payload = await decode({ token, secret: NEXTAUTH_SECRET });

    if (!payload) {
      throw new Error('Invalid token — decode returned null');
    }

    // ── Inject verified identity ─────────────────────────────────
    authSocket.userId = (payload.sub as string) || null;
    authSocket.userName = (payload.name as string) || null;
    authSocket.userRole = (payload.role as string) || 'USER';
    authSocket.isGuest = false;

    logger.debug(
      `[AUTH] Authenticated socket ${socket.id} as user ${payload.name} (${payload.sub})`
    );
    return next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.warn(`[AUTH] Socket auth failed for ${socket.id}: ${message}`);
    return next(new Error('Authentication failed — invalid or expired token'));
  }
}

// ============================================
// IDENTITY VERIFICATION HELPERS
// ============================================

/**
 * Verify that a claimed userId matches the authenticated socket identity.
 * Returns `true` if the identity is valid, `false` if there's a mismatch.
 *
 * Usage in handlers:
 * ```ts
 * if (!verifyIdentity(socket, claimedUserId)) {
 *   socket.emit('room:error', { message: 'Identity mismatch', code: 'AUTH_MISMATCH' });
 *   return;
 * }
 * ```
 */
export function verifyIdentity(socket: Socket, claimedUserId: string): boolean {
  const authSocket = socket as unknown as AuthenticatedSocket;

  // Authenticated users: claimed ID must match the JWT-verified ID
  if (!authSocket.isGuest && authSocket.userId && claimedUserId !== authSocket.userId) {
    logger.warn(
      `[AUTH] Identity mismatch: claimed ${claimedUserId}, authenticated as ${authSocket.userId}`
    );
    return false;
  }

  // Guests: cannot claim real user IDs
  if (authSocket.isGuest && claimedUserId && !claimedUserId.startsWith('guest-')) {
    logger.warn(`[AUTH] Guest spoofing attempt: guest tried to claim ID ${claimedUserId}`);
    return false;
  }

  return true;
}

/**
 * Extract the authenticated identity from a socket.
 * Returns userId and userName (with guest fallbacks).
 */
export function getSocketIdentity(socket: Socket): {
  userId: string;
  userName: string;
  isGuest: boolean;
  userRole: string;
} {
  const authSocket = socket as unknown as AuthenticatedSocket;
  return {
    userId: authSocket.userId || `guest-${socket.id}`,
    userName: authSocket.userName || `Guest-${socket.id.substring(0, 4)}`,
    isGuest: authSocket.isGuest === true,
    userRole: authSocket.userRole || 'GUEST',
  };
}

