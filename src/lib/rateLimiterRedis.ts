import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Redis-backed Rate Limiter with in-memory fallback
 * 
 * Provides persistent rate limiting that survives server restarts
 * and works across multiple server instances.
 * 
 * Falls back to in-memory Map when Redis is unavailable.
 */
class RateLimiter {
  private redis: RedisClientType | null = null;
  private isRedisConnected = false;
  private memoryFallback = new Map<string, number[]>();
  private connectPromise: Promise<boolean> | null = null;

  constructor() {
    this.initRedis();
  }

  private async initRedis(): Promise<boolean> {
    // Check if Redis is disabled
    if (process.env.DISABLE_REDIS === '1' || process.env.DISABLE_REDIS === 'true') {
      console.log('[RateLimiter] Redis disabled, using in-memory fallback');
      return false;
    }

    // Prevent multiple connection attempts
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      try {
        this.redis = createClient({
          url: REDIS_URL,
          socket: {
            connectTimeout: 3000,
            reconnectStrategy: (retries) => {
              // Retry up to 3 times with exponential backoff
              if (retries > 3) {
                console.log('[RateLimiter] Redis reconnect failed, using in-memory fallback');
                return false;
              }
              return Math.min(retries * 500, 2000);
            }
          }
        });

        this.redis.on('error', (err) => {
          console.warn('[RateLimiter] Redis error:', err.message);
          this.isRedisConnected = false;
        });

        this.redis.on('connect', () => {
          console.log('[RateLimiter] Redis connected');
          this.isRedisConnected = true;
        });

        this.redis.on('end', () => {
          this.isRedisConnected = false;
        });

        await this.redis.connect();
        this.isRedisConnected = true;
        return true;
      } catch (error) {
        console.log('[RateLimiter] Redis not available, using in-memory fallback');
        this.isRedisConnected = false;
        return false;
      }
    })();

    return this.connectPromise;
  }

  /**
   * Check if a key is rate limited using sliding window algorithm
   * @param key Unique identifier (e.g., socketId, userId, IP)
   * @param windowMs Time window in milliseconds
   * @param maxRequests Maximum requests allowed in window
   * @returns true if allowed, false if rate limited
   */
  async checkLimit(key: string, windowMs: number, maxRequests: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Try Redis first
    if (this.isRedisConnected && this.redis) {
      try {
        const redisKey = `ratelimit:${key}`;
        
        // Use multi/exec for atomic operations
        const multi = this.redis.multi();
        
        // Remove old entries
        multi.zRemRangeByScore(redisKey, 0, windowStart);
        
        // Count current entries in window
        multi.zCard(redisKey);
        
        // Execute
        const results = await multi.exec();
        // Results array: [zRemRangeByScore result, zCard result]
        // zCard returns a number, but TypeScript needs explicit casting
        const count = Number(results[1]) || 0;
        
        if (count >= maxRequests) {
          return false; // Rate limited
        }
        
        // Add current timestamp
        await this.redis.zAdd(redisKey, { score: now, value: `${now}-${Math.random()}` });
        
        // Set expiry to cleanup old keys
        await this.redis.expire(redisKey, Math.ceil(windowMs / 1000) + 60);
        
        return true;
      } catch (error) {
        // Fall through to memory fallback
        console.warn('[RateLimiter] Redis operation failed, falling back to memory');
      }
    }

    // Memory fallback
    const timestamps = this.memoryFallback.get(key) || [];
    const recentTimestamps = timestamps.filter(t => t > windowStart);
    
    if (recentTimestamps.length >= maxRequests) {
      return false; // Rate limited
    }
    
    recentTimestamps.push(now);
    this.memoryFallback.set(key, recentTimestamps);
    
    return true;
  }

  /**
   * Clean up old entries from memory fallback
   * Should be called periodically
   */
  cleanupMemory(windowMs: number): void {
    const cutoff = Date.now() - windowMs;
    this.memoryFallback.forEach((timestamps, key) => {
      const recent = timestamps.filter(t => t > cutoff);
      if (recent.length === 0) {
        this.memoryFallback.delete(key);
      } else {
        this.memoryFallback.set(key, recent);
      }
    });
  }

  /**
   * Get current status
   */
  getStatus(): { redis: boolean; memoryKeys: number } {
    return {
      redis: this.isRedisConnected,
      memoryKeys: this.memoryFallback.size
    };
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (this.redis && this.isRedisConnected) {
      await this.redis.quit();
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
export default rateLimiter;
