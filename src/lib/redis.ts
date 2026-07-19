import { createClient } from 'redis';
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: ReturnType<typeof createClient> | null = null;
let redisAvailable = false;

// Only create Redis client if REDIS_URL is explicitly set (not default localhost in production)
// Fixed operator precedence: parentheses ensure correct evaluation
if ((REDIS_URL && REDIS_URL !== 'redis://localhost:6379') || process.env.NODE_ENV === 'development') {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', err);
      redisAvailable = false;
    });
    redisClient.on('connect', () => {
      logger.info('Redis connected');
      redisAvailable = true;
    });
    redisClient.on('ready', () => {
      logger.info('Redis ready');
      redisAvailable = true;
    });
  } catch (err) {
    logger.warn('Failed to create Redis client:', err);
    redisAvailable = false;
  }
}

export async function connectRedis(): Promise<boolean> {
  if (!redisClient) {
    redisAvailable = false;
    return false;
  }
  
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      redisAvailable = true;
      return true;
    }
    return redisAvailable;
  } catch (err) {
    logger.warn('Redis connection failed, falling back to in-memory cache:', err);
    redisAvailable = false;
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable && redisClient?.isOpen === true;
}

export default redisClient;
