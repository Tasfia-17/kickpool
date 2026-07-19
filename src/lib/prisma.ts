import { PrismaClient } from '@prisma/client';
import logger from './logger';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ log: process.env.LOG_LEVEL === 'debug' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Try to proactively connect to the database with retries on startup to avoid
// many 500s on the first requests if the DB momentarily refuses connections
// (e.g. Windows Postgres startup or intermittent network). This runs in the
// background and is non-blocking for the server startup.
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function connectWithRetry(attempts = 8, delay = 500) {
  for (let i = 0; i < attempts; i++) {
    try {
      await prisma.$connect();
      logger.info('Prisma connected to database');
      return;
    } catch (err: any) {
      logger.warn(`Prisma connection attempt ${i + 1} failed:`, err);
      if (i < attempts - 1) await sleep(delay * (i + 1));
    }
  }
  logger.error('Prisma failed to connect after retries; database operations may fail until a connection is available.');
}

connectWithRetry(8, 500).catch(err => {
  logger.error('Unexpected error while trying to connect Prisma', err);
});

// Export a function to check if Prisma is connected
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection check failed:', error);
    return false;
  }
}
