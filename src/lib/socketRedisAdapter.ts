import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server } from 'socket.io';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function setupSocketRedisAdapter(io: Server): Promise<boolean> {
  // Check if Redis is disabled via environment variable
  if (process.env.DISABLE_REDIS === '1' || process.env.DISABLE_REDIS === 'true') {
    return false;
  }

  try {
    const pubClient = createClient({ 
      url: REDIS_URL,
      socket: {
        connectTimeout: 3000, // 3 second timeout
        reconnectStrategy: false // Don't auto-reconnect if initial connection fails
      }
    });
    const subClient = pubClient.duplicate();
    
    // Try to connect with a timeout
    await Promise.race([
      Promise.all([pubClient.connect(), subClient.connect()]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
      )
    ]);
    
    io.adapter(createAdapter(pubClient, subClient));
    return true;
  } catch (error) {
    // Redis is not available - this is fine for single-instance deployments
    return false;
  }
}
