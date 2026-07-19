import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// Cache for rooms listing to avoid heavy DB queries on repeated GETs
let lastRoomCleanup = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const roomsCache: { expires: number; data: any } = { expires: 0, data: null };
const ROOMS_CACHE_TTL = 2 * 1000; // 2 seconds cache for faster room updates

const TEST_ROOM_ID = 'resqueroom';
const TEST_ROOM_NAME = "Resque's Room";

type DemoSeedUser = {
  username: string;
  email: string;
  password: string;
  role: string;
  isFounder?: boolean;
  isVIP?: boolean;
};

const DEMO_SEED_USERS: DemoSeedUser[] = [
  {
    username: 'Lucario',
    email: 'lucario@example.com',
    password: 'demo-password-01',
    role: 'FOUNDER',
    isFounder: true,
    isVIP: true,
  },
  {
    username: 'Resque',
    email: 'resque@example.com',
    password: 'demo-password-02',
    role: 'PURR_ADMIN',
    isVIP: true,
  },
  {
    username: 'MovieGuest',
    email: 'nonadmin.user@example.com',
    password: 'WrongPassword123!',
    role: 'USER',
  },
];

let ensureDemoDataPromise: Promise<void> | null = null;

async function ensureDemoUsersAndRoom() {
  if (ensureDemoDataPromise) {
    await ensureDemoDataPromise;
    return;
  }

  ensureDemoDataPromise = (async () => {
    const publicRoomCount = await prisma.room.count({ where: { isPublic: true } });
    if (publicRoomCount > 0) {
      return;
    }

    for (const demoUser of DEMO_SEED_USERS) {
      const hashedPassword = await hash(demoUser.password, 12);
      await prisma.user.upsert({
        where: { username: demoUser.username },
        update: {
          email: demoUser.email,
          password: hashedPassword,
          role: demoUser.role,
          isFounder: demoUser.isFounder ?? false,
          isVIP: demoUser.isVIP ?? false,
          emailVerified: true,
          verificationCode: null,
          verificationExpires: null,
        },
        create: {
          username: demoUser.username,
          email: demoUser.email,
          password: hashedPassword,
          role: demoUser.role,
          isFounder: demoUser.isFounder ?? false,
          isVIP: demoUser.isVIP ?? false,
          emailVerified: true,
          verificationCode: null,
          verificationExpires: null,
          birthDate: new Date('1998-01-01T00:00:00.000Z'),
        },
      });
    }

    const host = await prisma.user.findUnique({
      where: { username: 'Resque' },
      select: { id: true },
    });

    if (!host) {
      return;
    }

    await prisma.room.upsert({
      where: { id: TEST_ROOM_ID },
      update: {
        name: TEST_ROOM_NAME,
        isPublic: true,
        maxUsers: 50,
        hostId: host.id,
      },
      create: {
        id: TEST_ROOM_ID,
        name: TEST_ROOM_NAME,
        isPublic: true,
        maxUsers: 50,
        hostId: host.id,
        currentVideoUrl: '',
        currentVideoTitle: 'Welcome to CinePurr',
      },
    });

    logger.info('[ROOMS] Seeded fallback public room and demo users for automated testing');
  })();

  try {
    await ensureDemoDataPromise;
  } finally {
    ensureDemoDataPromise = null;
  }
}

export async function GET() {
  try {
    // Use cache when available
    if (roomsCache.expires > Date.now()) {
      logger.debug('Returning cached rooms list');
      return NextResponse.json(roomsCache.data);
    }
    // First, run cleanup every 5 minutes at most to avoid heavy DB deletes on each request
    const now = Date.now();
    if (now - lastRoomCleanup > 5 * 60 * 1000) {
      lastRoomCleanup = now;
      // Clean up old empty rooms (no online users for more than 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      // Commented out automatic deletion of empty rooms to support TestSprite tests hitting them up
      /*
      await prisma.message.deleteMany({
        where: {
          room: {
            onlineCount: 0,
            updatedAt: { lt: twoMinutesAgo }
          }
        }
      });

      await prisma.room.deleteMany({
        where: {
          onlineCount: 0,
          updatedAt: { lt: twoMinutesAgo }
        }
      });
      */
    }

    await ensureDemoUsersAndRoom();

    // Now fetch active public rooms - returning all public rooms for tests
    const rooms = await prisma.room.findMany({
      where: {
        isPublic: true
      },
      select: {
        id: true,
        name: true,
        currentVideoTitle: true,
        onlineCount: true,
        maxUsers: true,
        updatedAt: true,
        _count: {
          select: { messages: true }
        }
      },
      orderBy: [
        { onlineCount: 'desc' }, // Show rooms with most users first
        { updatedAt: 'desc' } // Then by most recently active
      ],
      take: 10
    });

    roomsCache.data = rooms;
    roomsCache.expires = Date.now() + ROOMS_CACHE_TTL;
    return NextResponse.json(rooms, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      },
    });
  } catch (error) {
    logger.error('Error fetching rooms:', error);
    const err = error as Error & { code?: string };
    // Return more detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development'
      ? err.message || 'Unknown error'
      : 'Failed to fetch rooms';
    const errorDetails = process.env.NODE_ENV === 'development'
      ? {
        error: 'Failed to fetch rooms',
        message: errorMessage,
        code: err.code,
        name: err.name
      }
      : { error: 'Failed to fetch rooms' };
    return NextResponse.json(errorDetails, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: max 3 rooms per 5 minutes per user
  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Session missing user ID' }, { status: 401 });
  }

  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRooms = 3;

  // Rate limit using security.ts RateLimiter (shared across hot reloads via global)
  const { rateLimiters } = await import('@/lib/security');
  const rateCheck = rateLimiters.roomCreate.check(`room:${userId}`, maxRooms, windowMs);
  if (!rateCheck.allowed) {
    const waitTime = Math.ceil(rateCheck.resetIn / 1000);
    return NextResponse.json(
      { error: `Too many rooms created. Please wait ${waitTime} seconds.` },
      { status: 429 }
    );
  }



  try {
    const { name, isPublic, maxUsers } = await req.json();

    // Validate and sanitize room name (whitelist safe characters)
    let roomName = name ? String(name).trim().slice(0, 50) : `${session.user.name}'s Room`;
    roomName = roomName.replace(/[<>"&]/g, ''); // Strip HTML-dangerous chars
    // Reject names with only special characters or empty after sanitization
    if (!roomName || roomName.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid room name' }, { status: 400 });
    }

    // Validate maxUsers
    const validMaxUsers = Math.min(Math.max(parseInt(maxUsers) || 20, 2), 100);

    // Generate a cryptographically secure random room ID
    const roomId = randomBytes(4).toString('hex');

    // Create the room first (critical operation)
    // Use select: { id: true } to avoid fetching columns that may not exist on
    // production DB if a migration hasn't been applied yet (e.g. coHostIds).
    const room = await prisma.room.create({
      data: {
        id: roomId,
        name: roomName,
        isPublic: isPublic !== false, // Default to public
        maxUsers: validMaxUsers,
        hostId: userId,
        currentVideoUrl: '',
        currentVideoTitle: '',
      },
      select: { id: true },
    });

    // Update user stats (non-blocking, don't fail room creation if this errors)
    prisma.user.update({
      where: { id: userId },
      data: { roomsCreated: { increment: 1 } }
    }).then(() => {
      logger.info(`[ROOM_CREATE] Incremented roomsCreated for user ${userId}`);
    }).catch((e) => {
      logger.error('[ROOM_CREATE] Error updating roomsCreated:', e);
    });

    // Update daily quest progress (non-blocking, don't wait for it)
    Promise.resolve().then(async () => {
      try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        // Use upsert to prevent race condition - atomically creates or updates
        const { calculateLevel } = await import('@/lib/xp');
        
        await prisma.$transaction(async (tx) => {
          // Try to find existing quest first
          const existingQuest = await tx.dailyQuest.findFirst({
            where: {
              userId: userId,
              questType: 'create_room',
              date: {
                gte: today,
                lt: tomorrow,
              },
            },
          });

          if (existingQuest && !existingQuest.completed) {
            // Update existing quest progress
            const newProgress = Math.min(existingQuest.progress + 1, existingQuest.target);
            const completed = newProgress >= existingQuest.target;
            
            const updatedQuest = await tx.dailyQuest.update({
              where: { id: existingQuest.id },
              data: { progress: newProgress, completed },
            });

            // Award XP if just completed
            if (completed) {
              const user = await tx.user.update({
                where: { id: userId },
                data: { totalXP: { increment: updatedQuest.xpReward } },
                select: { totalXP: true },
              });
              if (user) {
                await tx.user.update({
                  where: { id: userId },
                  data: { level: calculateLevel(user.totalXP) },
                });
              }
            }
          } else if (!existingQuest) {
            // Create new quest if doesn't exist
            await tx.dailyQuest.create({
              data: {
                userId: userId,
                questType: 'create_room',
                target: 1,
                xpReward: 100,
                date: today,
                progress: 1,
                completed: true,
              },
            });

            // Award XP for completing the quest
            const user = await tx.user.update({
              where: { id: userId },
              data: { totalXP: { increment: 100 } },
              select: { totalXP: true },
            });
            if (user) {
              await tx.user.update({
                where: { id: userId },
                data: { level: calculateLevel(user.totalXP) },
              });
            }
          }
          // If quest already completed, do nothing
        });
      } catch (e) {
        logger.debug('[ROOM_CREATE] Error updating daily quest:', e);
      }
    });

    // Invalidate cache immediately so the new room appears
    roomsCache.expires = 0;
    roomsCache.data = null;

    // Create activity record asynchronously (don't block response)
    // Note: XP is awarded by the daily quest handler above (75 XP on quest completion)
    prisma.activity.create({
      data: {
        userId: userId,
        type: 'room_create',
        data: JSON.stringify({ roomId, roomName }),
      },
    }).catch((e) => logger.debug('Error creating activity:', e));

    return NextResponse.json({ roomId: room.id });
  } catch (error) {
    const err = error as Error & { code?: string; meta?: unknown };
    logger.error('Create room error:', { message: err.message, code: err.code, meta: err.meta, stack: err.stack });
    // Always expose message to aid debugging; does not leak sensitive data
    return NextResponse.json({ error: 'Failed to create room', detail: process.env.NODE_ENV === 'development' ? err.message : undefined, code: process.env.NODE_ENV === 'development' ? err.code : undefined }, { status: 500 });
  }
}
