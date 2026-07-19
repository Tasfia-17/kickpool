import redisClient, { connectRedis } from './redis';

// Fallback memory state if Redis is not connected
let memoryMaintenanceMode = false;

export async function isMaintenanceMode(): Promise<boolean> {
  const connected = await connectRedis();
  if (connected && redisClient) {
    try {
      const val = await redisClient.get('system:maintenance');
      return val === 'true';
    } catch {
      return memoryMaintenanceMode;
    }
  }
  return memoryMaintenanceMode;
}

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  const connected = await connectRedis();
  if (connected && redisClient) {
    try {
      if (enabled) {
        await redisClient.set('system:maintenance', 'true');
      } else {
        await redisClient.del('system:maintenance');
      }
      memoryMaintenanceMode = enabled; // Keep memory in sync just in case
      return;
    } catch (e) {
      console.error('Failed to set maintenance mode in redis:', e);
    }
  }
  memoryMaintenanceMode = enabled;
}
