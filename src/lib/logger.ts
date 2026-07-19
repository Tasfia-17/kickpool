const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const;
const currentLevel = (levels as any)[level] ?? 1;

export const logger = {
  debug: (...args: any[]) => {
    if (currentLevel <= 0) console.debug('[DEBUG]', ...args);
  },
  info: (...args: any[]) => {
    if (currentLevel <= 1) console.info('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    if (currentLevel <= 2) console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    if (currentLevel <= 3) console.error('[ERROR]', ...args);
  }
};

export default logger;
