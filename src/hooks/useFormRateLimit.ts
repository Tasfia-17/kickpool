import { useState, useCallback, useRef, useEffect } from 'react';

interface UseFormRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  lockoutMs?: number;
}

interface UseFormRateLimitReturn {
  canSubmit: boolean;
  attempts: number;
  timeUntilReset: number;
  isLockedOut: boolean;
  lockoutTimeRemaining: number;
  recordAttempt: () => boolean; // Returns true if allowed, false if rate limited
  reset: () => void;
}

/**
 * Client-side rate limiting hook for form submissions
 * 
 * Provides protection against:
 * - Rapid-fire form submissions
 * - Brute force attempts
 * - Accidental double-clicks
 * 
 * Note: This is a UX enhancement, not a security measure.
 * Server-side rate limiting is still required for actual protection.
 */
export function useFormRateLimit({
  maxAttempts,
  windowMs,
  lockoutMs = 60000, // 1 minute lockout after too many attempts
}: UseFormRateLimitOptions): UseFormRateLimitReturn {
  const [attempts, setAttempts] = useState<number[]>([]);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [, forceUpdate] = useState({});

  // Calculate current state
  const now = Date.now();
  const recentAttempts = attempts.filter(t => now - t < windowMs);
  const isLockedOut = lockoutUntil !== null && now < lockoutUntil;
  const canSubmit = !isLockedOut && recentAttempts.length < maxAttempts;

  // Calculate time remaining
  const oldestAttempt = recentAttempts[0];
  const timeUntilReset = oldestAttempt ? Math.max(0, windowMs - (now - oldestAttempt)) : 0;
  const lockoutTimeRemaining = isLockedOut && lockoutUntil ? Math.max(0, lockoutUntil - now) : 0;

  // Start interval to update UI countdown while locked out — inside useEffect for proper cleanup
  useEffect(() => {
    if (!isLockedOut) {
      // Clear any stale interval when lockout ends
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      forceUpdate({});
      if (Date.now() >= (lockoutUntil || 0)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setLockoutUntil(null);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLockedOut, lockoutUntil]);

  const recordAttempt = useCallback((): boolean => {
    const currentTime = Date.now();
    
    // Check lockout
    if (lockoutUntil && currentTime < lockoutUntil) {
      return false;
    }

    // Clear expired lockout
    if (lockoutUntil && currentTime >= lockoutUntil) {
      setLockoutUntil(null);
    }

    // Filter recent attempts
    const recent = attempts.filter(t => currentTime - t < windowMs);
    
    // Check if already at limit
    if (recent.length >= maxAttempts) {
      // Trigger lockout
      setLockoutUntil(currentTime + lockoutMs);
      return false;
    }

    // Record this attempt
    setAttempts([...recent, currentTime]);
    return true;
  }, [attempts, lockoutUntil, maxAttempts, windowMs, lockoutMs]);

  const reset = useCallback(() => {
    setAttempts([]);
    setLockoutUntil(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    canSubmit,
    attempts: recentAttempts.length,
    timeUntilReset: Math.ceil(timeUntilReset / 1000),
    isLockedOut,
    lockoutTimeRemaining: Math.ceil(lockoutTimeRemaining / 1000),
    recordAttempt,
    reset,
  };
}

export default useFormRateLimit;
