import redisClient, { connectRedis } from './redis';
import logger from './logger';

const isProd = process.env.NODE_ENV === 'production';

// ============================================
// IN-MEMORY CACHE WITH PERIODIC TTL SWEEP
// ============================================
// Instead of creating a setTimeout per cache entry (which leaks timers under load),
// we store expiry timestamps and sweep periodically.
interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

function createTTLMap() {
  const map = new Map<string, CacheEntry>();
  return {
    get(key: string) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        map.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: any, ttlSeconds: number) {
      map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    delete(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
    /** Remove all expired entries */
    sweep() {
      const now = Date.now();
      map.forEach((entry, key) => {
        if (now > entry.expiresAt) map.delete(key);
      });
    },
  };
}

// Single periodic sweep for all in-memory caches (every 60s)
const friendsTTLMap = createTTLMap();
const searchTTLMap = createTTLMap();
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    friendsTTLMap.sweep();
    searchTTLMap.sweep();
  }, 60_000);
}

// Redis-backed cache for friends and search
export const friendsCache = {
  async get(userId: string) {
    if (isProd) {
      const connected = await connectRedis();
      if (connected && redisClient) {
        try {
          const data = await redisClient.get(`friends:${userId}`);
          return data ? JSON.parse(String(data)) : undefined;
        } catch (err) {
          logger.warn('Redis get failed, using in-memory cache:', err);
          return friendsTTLMap.get(userId);
        }
      }
      return friendsTTLMap.get(userId);
    }
    return friendsTTLMap.get(userId);
  },
  async set(userId: string, value: any, ttl = 300) {
    // Always set in-memory cache (with TTL tracked, no setTimeout)
    friendsTTLMap.set(userId, value, ttl);

    if (isProd) {
      const connected = await connectRedis();
      if (connected && redisClient) {
        try {
          await redisClient.set(`friends:${userId}`, JSON.stringify(value), { EX: ttl });
        } catch (err) {
          logger.warn('Redis set failed, using in-memory cache only:', err);
        }
      }
    }
  },
  async delete(userId: string) {
    friendsTTLMap.delete(userId);
    if (isProd) {
      const connected = await connectRedis();
      if (connected && redisClient) {
        try {
          await redisClient.del(`friends:${userId}`);
        } catch (err) {
          logger.warn('Redis delete failed:', err);
        }
      }
    }
  },
  async clear() {
    friendsTTLMap.clear();
    if (isProd) {
      const connected = await connectRedis();
      if (connected && redisClient) {
        try {
          // Use SCAN instead of KEYS to avoid blocking Redis
          let cursor = 0;
          do {
            const result = await (redisClient as any).scan(cursor, { MATCH: 'friends:*', COUNT: 100 });
            cursor = typeof result.cursor === 'string' ? parseInt(result.cursor) : result.cursor;
            if (result.keys.length) await redisClient.del(result.keys);
          } while (cursor !== 0);
        } catch (err) {
          logger.warn('Redis clear failed:', err);
        }
      }
    }
  },
  // Kept for backward compat — now backed by TTL map
  _map: friendsTTLMap,
};

export const SEARCH_CACHE = {
  async get(key: string) {
    if (isProd) {
      const connected = await connectRedis();
      if (connected && redisClient) {
        try {
          const data = await redisClient.get(`search:${key}`);
          return data ? JSON.parse(String(data)) : undefined;
        } catch (err) {
          logger.warn('Redis get failed, using in-memory cache:', err);
          return searchTTLMap.get(key);
        }
      }
      // Fallback to in-memory cache if Redis unavailable
      return searchTTLMap.get(key);
    }
    return searchTTLMap.get(key);
  },
  async set(key: string, value: any, ttl = 120) {
    // Always set in-memory cache (with TTL tracked, no setTimeout)
    searchTTLMap.set(key, value, ttl);

    if (isProd) {
      const connected = await connectRedis();
      if (connected && redisClient) {
        try {
          await redisClient.set(`search:${key}`, JSON.stringify(value), { EX: ttl });
        } catch (err) {
          logger.warn('Redis set failed, using in-memory cache only:', err);
        }
      }
    }
  },
  async delete(key: string) {
    searchTTLMap.delete(key);
    if (isProd) {
      const connected = await connectRedis();
      if (connected && redisClient) {
        try {
          await redisClient.del(`search:${key}`);
        } catch (err) {
          logger.warn('Redis delete failed:', err);
        }
      }
    }
  },
  async clear() {
    searchTTLMap.clear();
    if (isProd) {
      const connected = await connectRedis();
      if (connected && redisClient) {
        try {
          // Use SCAN instead of KEYS to avoid blocking Redis
          let cursor = 0;
          do {
            const result = await (redisClient as any).scan(cursor, { MATCH: 'search:*', COUNT: 100 });
            cursor = typeof result.cursor === 'string' ? parseInt(result.cursor) : result.cursor;
            if (result.keys.length) await redisClient.del(result.keys);
          } while (cursor !== 0);
        } catch (err) {
          logger.warn('Redis clear failed:', err);
        }
      }
    }
  },
  // Kept for backward compat — now backed by TTL map
  _map: searchTTLMap,
};

// Invalidate helpers
export async function invalidateFriendsCacheFor(userId: string) {
  await friendsCache.delete(userId);
}
export async function invalidateFriendsCacheForBoth(a: string, b: string) {
  await invalidateFriendsCacheFor(a);
  await invalidateFriendsCacheFor(b);
}
export async function invalidateAllFriendCaches() {
  await friendsCache.clear();
}
