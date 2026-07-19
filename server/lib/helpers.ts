/**
 * CinePurr Server — Shared Helper Functions
 *
 * Utilities extracted from the monolithic index.ts that are shared
 * across multiple domain handlers. Includes:
 *   • XSS prevention (escapeHtml)
 *   • Chat moderation (filterMessage, bad word patterns)
 *   • System message broadcasting (emitSystemMessage)
 *   • XP awarding + daily quest tracking
 *   • Rate limiting wrappers
 */

import type { Server } from 'socket.io';
import { prisma } from './prismaTypes';
import { calculateLevel } from '../../src/lib/xp';
import { rateLimiter } from '../../src/lib/rateLimiterRedis';
import logger from '../../src/lib/logger';
import {
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  VIDEO_CHANGE_WINDOW,
  VIDEO_CHANGE_MAX,
} from '../state';
import type { PrismaError } from '../types';

// ============================================
// XSS PREVENTION
// ============================================

/** Escape dangerous characters for XSS prevention (keeps apostrophes readable) */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  // Note: Apostrophes ' are safe in text content, only dangerous in attributes
}

// ============================================
// CHAT MODERATION
// ============================================

const BAD_WORDS = [
  // General profanity
  'fuck', 'shit', 'bitch', 'dick', 'cock', 'pussy',
  'bastard', 'slut', 'whore', 'fag', 'faggot', 'cunt', 'nigger', 'nigga', 'retard',
  'spic', 'chink', 'kike', 'wop', 'wetback', 'beaner',
  // Spam/harassment (multi-word phrases)
  'kill yourself', 'kys', 'neck yourself', 'hang yourself',
  // Common toxic abbreviations
  'stfu', 'gtfo',
];

/** Pre-compiled regex patterns for word boundary matching */
const badWordPatterns = BAD_WORDS.map(word => {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (word.includes(' ')) {
    return new RegExp(escaped.split(' ').join('[\\s_\\-.*]+'), 'gi');
  }
  return new RegExp(`\\b${escaped}\\b`, 'gi');
});

/** Filter bad words in a message, replacing with asterisks */
export function filterMessage(text: string): string {
  let filtered = text;

  // Pattern matching
  badWordPatterns.forEach((pattern, index) => {
    filtered = filtered.replace(pattern, '*'.repeat(BAD_WORDS[index].length));
  });

  // Exact word matching as fallback
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });

  return filtered;
}

// ============================================
// SYSTEM MESSAGES
// ============================================

/** Broadcast a system message to all users in a room */
export function emitSystemMessage(io: Server, roomId: string, text: string): void {
  io.to(roomId).emit('chat:broadcast', {
    id: Math.random().toString(36).substring(7),
    user: 'System',
    text,
    timestamp: Date.now(),
    isSystem: true,
  });
}

// ============================================
// RATE LIMITING WRAPPERS
// ============================================

/** Check chat message rate limit (Redis-backed with memory fallback) */
export async function checkRateLimitAsync(socketId: string): Promise<boolean> {
  return rateLimiter.checkLimit(`msg:${socketId}`, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX);
}

/** Check video change rate limit */
export async function checkVideoChangeRateLimitAsync(socketId: string): Promise<boolean> {
  return rateLimiter.checkLimit(`video:${socketId}`, VIDEO_CHANGE_WINDOW, VIDEO_CHANGE_MAX);
}

// ============================================
// XP & ACTIVITY TRACKING
// ============================================

/**
 * Award XP to a user and create an activity record.
 * Uses a transaction to prevent race conditions on concurrent XP updates.
 */
export async function awardXPAndActivity(
  userId: string,
  xpAmount: number,
  activityType: string,
  activityData?: Record<string, unknown>
): Promise<void> {
  try {
    if (!userId || userId.startsWith('guest-')) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXP: true },
    });

    if (user) {
      // Use transaction to prevent race conditions
      await prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: { totalXP: true },
        });

        if (currentUser) {
          const newTotalXP = currentUser.totalXP + xpAmount;
          const newLevel = calculateLevel(newTotalXP);

          await tx.user.update({
            where: { id: userId },
            data: {
              totalXP: newTotalXP,
              level: newLevel,
            },
          });
        }
      });

      // Create activity
      await prisma.activity.create({
        data: {
          userId,
          type: activityType,
          data: activityData ? JSON.stringify(activityData) : null,
        },
      });

      // Update daily quest progress based on activity
      if (activityType === 'room_join') {
        await updateDailyQuest(userId, 'join_room', 1);
      } else if (activityType === 'message') {
        await updateDailyQuest(userId, 'send_messages', 1);
      } else if (activityType === 'room_create') {
        await updateDailyQuest(userId, 'create_room', 1);
      }
    }
  } catch (error: unknown) {
    logger.debug('Error awarding XP/activity:', (error as Error).message);
  }
}

// ============================================
// DAILY QUEST TRACKING
// ============================================

/** Quest definitions with targets and rewards */
const QUEST_DEFS: Record<string, { target: number; xpReward: number }> = {
  join_room: { target: 1, xpReward: 50 },
  watch_time: { target: 1800, xpReward: 100 },
  send_messages: { target: 5, xpReward: 25 },
  create_room: { target: 1, xpReward: 75 },
};

/** Update daily quest progress for a user */
export async function updateDailyQuest(
  userId: string,
  questType: string,
  progress: number
): Promise<void> {
  try {
    logger.info(`[QUEST] Updating ${questType} for user ${userId} with progress +${progress}`);

    // Get date range for today (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const questDef = QUEST_DEFS[questType];
    if (!questDef) {
      logger.warn(`[QUEST] Unknown quest type: ${questType}`);
      return;
    }

    // Find quest for today
    let quest = await prisma.dailyQuest.findFirst({
      where: {
        userId,
        questType,
        date: { gte: today, lt: tomorrow },
      },
      select: {
        id: true,
        progress: true,
        target: true,
        completed: true,
        xpReward: true,
      },
    });

    // Create quest if it doesn't exist for today
    if (!quest) {
      quest = await prisma.dailyQuest.create({
        data: {
          userId,
          questType,
          target: questDef.target,
          xpReward: questDef.xpReward,
          date: today,
          progress: 0,
          completed: false,
        },
        select: {
          id: true,
          progress: true,
          target: true,
          completed: true,
          xpReward: true,
        },
      });
      logger.debug(`[QUEST] Created new quest ${questType} for user ${userId}`);
    }

    if (quest && !quest.completed) {
      const newProgress = Math.min(quest.progress + progress, quest.target);
      const completed = newProgress >= quest.target;

      await prisma.dailyQuest.update({
        where: { id: quest.id },
        data: { progress: newProgress, completed },
      });

      logger.debug(
        `[QUEST] Updated ${questType} progress: ${quest.progress} -> ${newProgress}/${quest.target} for user ${userId}`
      );

      // Award XP if just completed
      if (completed && !quest.completed) {
        await awardXPAndActivity(userId, quest.xpReward, 'quest_complete', { questType });
        logger.debug(`[QUEST] Completed ${questType}! Awarding ${quest.xpReward} XP to user ${userId}`);
      }
    }
  } catch (error: unknown) {
    logger.error('Error updating daily quest:', (error as Error).message);
  }
}
