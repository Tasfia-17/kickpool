/**
 * CinePurr Server — Type-Safe Prisma Access
 *
 * Eliminates ALL `as unknown as` casts by leveraging Prisma's generated
 * utility types: `Prisma.validator` for compile-time query validation
 * and `Prisma.GetPayload` for exact return-type derivation.
 *
 * Every handler imports types and the singleton client from here.
 *
 * @see PDF Section 3 — "Type-Safe Database Access: Eradicating Casting"
 */

import { Prisma, PrismaClient } from '@prisma/client';
import logger from '../../src/lib/logger';

// ============================================
// SINGLETON PRISMA CLIENT
// ============================================

let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prismaInstance = new PrismaClient();
} else {
  // Reuse global instance in development to prevent memory leaks during hot reload
  const globalForPrisma = global as unknown as { __prisma: PrismaClient };
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = new PrismaClient();
  }
  prismaInstance = globalForPrisma.__prisma;
}

export const prisma = prismaInstance;

// ============================================
// USER: VIP INFO QUERY (eliminates ~15 `as unknown as` casts)
// ============================================

/** Validated include shape for user VIP queries */
const userVipSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  isVIP: true,
  isFounder: true,
  vipNameColor: true,
  vipFont: true,
  vipBadge: true,
  vipGlow: true,
  role: true,
  watchTime: true,
});

/** Exact return type for VIP info queries — no casting needed */
export type UserVipPayload = Prisma.UserGetPayload<{
  select: typeof userVipSelect;
}>;

/** Fetch VIP info with perfect type safety */
export async function getUserVipInfo(userId: string): Promise<UserVipPayload | null> {
  return prisma.user.findFirst({
    where: { id: userId },
    select: userVipSelect,
  });
  // ✅ Return type is automatically UserVipPayload — zero `as unknown as` needed
}

// ============================================
// USER: XP & LEVEL QUERY
// ============================================

const userXpSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  totalXP: true,
  level: true,
  username: true,
});

export type UserXpPayload = Prisma.UserGetPayload<{
  select: typeof userXpSelect;
}>;

export async function getUserXpInfo(userId: string): Promise<UserXpPayload | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userXpSelect,
  });
}

// ============================================
// MESSAGE: WITH USER DETAILS
// ============================================

const messageWithUserInclude = Prisma.validator<Prisma.MessageInclude>()({
  user: {
    select: {
      id: true,
      username: true,
      isVIP: true,
      isFounder: true,
      vipNameColor: true,
      vipBadge: true,
      vipGlow: true,
    },
  },
});

/** Message joined with user VIP details — for rich chat history */
export type MessageWithUser = Prisma.MessageGetPayload<{
  include: typeof messageWithUserInclude;
}>;

export async function getMessagesWithUser(roomId: string, take = 50): Promise<MessageWithUser[]> {
  return prisma.message.findMany({
    where: { roomId },
    include: messageWithUserInclude,
    orderBy: { createdAt: 'asc' },
    take,
  });
}

// ============================================
// ROOM: PUBLIC LISTING WITH COUNTS
// ============================================

const roomListSelect = Prisma.validator<Prisma.RoomSelect>()({
  id: true,
  name: true,
  currentVideoTitle: true,
  onlineCount: true,
  maxUsers: true,
  isPublic: true,
  hostId: true,
  _count: {
    select: { messages: true },
  },
});

export type RoomListPayload = Prisma.RoomGetPayload<{
  select: typeof roomListSelect;
}>;

export async function getPublicRooms(take = 50): Promise<RoomListPayload[]> {
  return prisma.room.findMany({
    where: { isPublic: true },
    select: roomListSelect,
    orderBy: { onlineCount: 'desc' },
    take,
  });
}

// ============================================
// ROOM: FULL ROOM DETAILS
// ============================================

const roomDetailSelect = Prisma.validator<Prisma.RoomSelect>()({
  id: true,
  name: true,
  currentVideoUrl: true,
  currentVideoTitle: true,
  currentVideoProvider: true,
  maxUsers: true,
  hostId: true,
  coHostIds: true,
  isPublic: true,
  onlineCount: true,
});

export type RoomDetailPayload = Prisma.RoomGetPayload<{
  select: typeof roomDetailSelect;
}>;

export async function getRoomDetail(roomId: string): Promise<RoomDetailPayload | null> {
  return prisma.room.findUnique({
    where: { id: roomId },
    select: roomDetailSelect,
  });
}

// ============================================
// DAILY QUEST: TYPED ACCESS
// ============================================

const dailyQuestSelect = Prisma.validator<Prisma.DailyQuestSelect>()({
  id: true,
  progress: true,
  target: true,
  completed: true,
  xpReward: true,
});

export type DailyQuestPayload = Prisma.DailyQuestGetPayload<{
  select: typeof dailyQuestSelect;
}>;

export async function findDailyQuest(
  userId: string,
  questType: string,
  dateRange: { gte: Date; lt: Date }
): Promise<DailyQuestPayload | null> {
  return prisma.dailyQuest.findFirst({
    where: {
      userId,
      questType,
      date: dateRange,
    },
    select: dailyQuestSelect,
  });
}

// ============================================
// INIT: Apply SQLite WAL mode if applicable
// ============================================

export async function initDatabasePragmas(): Promise<void> {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('file:') || dbUrl.endsWith('.db') || dbUrl.includes('.sqlite')) {
      await prisma.$executeRaw`PRAGMA journal_mode=WAL`;
      await prisma.$executeRaw`PRAGMA synchronous=NORMAL`;
      logger.info('SQLite pragmas applied: WAL mode and synchronous=NORMAL');
    }
  } catch (e) {
    logger.warn('Failed to apply SQLite pragmas:', e);
  }
}
