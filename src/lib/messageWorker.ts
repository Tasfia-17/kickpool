import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DISABLE_REDIS = process.env.DISABLE_REDIS === '1' || process.env.DISABLE_REDIS === 'true';

// Only create worker if Redis is enabled and available
let workerInstance: Worker | null = null;

function initializeWorker() {
  // Don't create worker if Redis is disabled
  if (DISABLE_REDIS) {
    return;
  }
  
  // In production, don't use default localhost Redis
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    return;
  }
  
  // Only create worker if not already created
  if (workerInstance) {
    return;
  }
  
  try {
    const prisma = new PrismaClient();
    
    workerInstance = new Worker('messages', async job => {
      const { roomId, userId, text, username, tempId } = job.data;
      const savedMessage = await prisma.message.create({
        data: { roomId, userId, text, username }
      });
      // Emit event to notify clients to replace tempId with real id
      logger.debug(`[BullMQ] Message persisted: tempId=${tempId}, id=${savedMessage.id}`);
    }, {
      connection: { 
        url: REDIS_URL,
        maxRetriesPerRequest: null, // Disable retries
        enableReadyCheck: false, // Don't check connection on creation
      }
    });
    
    workerInstance.on('completed', job => {
      logger.debug(`Message job ${job.id} completed`);
    });
    
    workerInstance.on('failed', (job, err) => {
      logger.error(`Message job ${job?.id} failed:`, err);
    });
    
    // Handle connection errors - don't spam logs
    workerInstance.on('error', (error: any) => {
      // Silently ignore connection refused errors
      if ((error as NodeJS.ErrnoException).code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        // Redis not available - this is fine, we'll use direct DB writes
        return;
      }
      logger.error('[BullMQ] Worker error:', error);
    });
    
    logger.info('[BullMQ] Worker initialized');
  } catch (error) {
    // If worker creation fails, just log and continue without worker
    logger.warn('[BullMQ] Worker initialization failed (continuing without worker):', error);
  }
}

// Only initialize worker if not in a test environment and Redis is available
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // Delay initialization slightly to avoid immediate connection attempts
  setTimeout(() => {
    initializeWorker();
  }, 1000);
}
