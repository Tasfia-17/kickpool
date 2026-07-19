import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DISABLE_REDIS = process.env.DISABLE_REDIS === '1' || process.env.DISABLE_REDIS === 'true';

// Lazy-load queue - only create if Redis is enabled and URL is not localhost in production
let messageQueueInstance: Queue | null = null;

function getMessageQueue(): Queue | null {
  // Don't create queue if Redis is disabled
  if (DISABLE_REDIS) {
    return null;
  }
  
  // In production, don't use default localhost Redis
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    return null;
  }
  
  // Create queue instance lazily
  if (!messageQueueInstance) {
    try {
      messageQueueInstance = new Queue('messages', {
        connection: { 
          url: REDIS_URL,
          maxRetriesPerRequest: null, // Disable retries to prevent connection spam
          enableReadyCheck: false, // Don't check connection on creation
        }
      });
      
      // Handle connection errors silently
      messageQueueInstance.on('error', (error: any) => {
        // Silently ignore connection errors - fallback to direct DB writes
        if ((error as NodeJS.ErrnoException).code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
          // Redis not available - this is fine, we'll use direct DB writes
          return;
        }
        console.error('[BullMQ] Queue error:', error);
      });
    } catch (error) {
      // If queue creation fails, return null (fallback to direct DB writes)
      return null;
    }
  }
  
  return messageQueueInstance;
}

// Export a function that returns the queue or null
export const messageQueue = {
  add: async (jobName: string, data: any) => {
    const queue = getMessageQueue();
    if (!queue) {
      // Return a rejected promise so caller can fallback
      throw new Error('Redis queue not available');
    }
    return queue.add(jobName, data);
  }
};
