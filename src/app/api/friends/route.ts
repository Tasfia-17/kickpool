import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from '@/lib/logger';
import { friendsCache } from '@/lib/cache';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

const FRIENDS_CACHE_TTL = 30 * 1000; // 30 seconds

// Get friends list or pending requests
export async function GET(request: Request) {
  const start = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      const elapsed = Date.now() - start;
      logger.warn(`[API][friends] Unauthorized request. Elapsed: ${elapsed}ms`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pending = searchParams.get('pending');

    // Prefer session user ID when available; fallback to username
    const sessionUserId = (session.user as any).id || null;
    const sessionUsername = session.user.name;
    const user = await prisma.user.findUnique({
      where: sessionUserId ? { id: sessionUserId } : { username: sessionUsername },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return pending friend requests
    if (pending === 'true') {
      const pendingRequests = await (prisma as any).friendRequest.findMany({
        where: { 
          receiverId: user.id,
          status: 'PENDING'
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Map to expected format
      const formatted = pendingRequests.map((req: any) => ({
        id: req.id,
        fromUser: req.sender,
        createdAt: req.createdAt
      }));

      return NextResponse.json(formatted);
    }

    // Return friends list
    // Check cache first (skip cache for pending requests)
    const cacheKey = `friends:${user.id}`;
      const cached = await friendsCache.get(cacheKey);
      if (cached) {
        logger.debug(`[API][friends] Returning cached friends for user ${user.id}`);
        const elapsedCached = Date.now() - start;
        logger.debug(`[API][friends] Elapsed: ${elapsedCached}ms (from cache)`);
        return NextResponse.json(cached);
    }

    // Fetch friendships where user is either side (in case of asymmetric inserts)
    logger.debug('[API] Fetching friends for user ID:', user.id);
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId: user.id }, { friendId: user.id }]
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            image: true,
            role: true,
            isVIP: true,
            isFounder: true,
            createdAt: true
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            role: true,
            isVIP: true,
            isFounder: true,
            createdAt: true
          }
        }
      }
    });

    // Correctly identify the friend (the OTHER user in the relationship)
    // Use a Map to deduplicate by friend ID
    const friendsMap = new Map();
    friendships.forEach((f: any) => {
      // If userId is current user, friend is in f.friend. Otherwise friend is in f.user
      const friendData = f.userId === user.id ? f.friend : f.user;
      // Only add if not already in map (deduplicate)
      if (!friendsMap.has(friendData.id)) {
        friendsMap.set(friendData.id, {
          id: friendData.id,
          username: friendData.username,
          image: friendData.image,
          role: friendData.role,
          isVIP: friendData.isVIP,
          isFounder: friendData.isFounder,
          since: f.createdAt.toISOString(),
        });
      }
    });
    const friends = Array.from(friendsMap.values());

    // Get online status from socket server
    const friendIds = friends.map((f: any) => f.id);
    let onlineStatus: Record<string, boolean> = {};
    try {
      const socketUrl = process.env.SOCKET_SERVER_INTERNAL_URL || 'http://socket_server:4000';
      const onlineRes = await fetch(`${socketUrl}/api/online/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: friendIds }),
      });
      if (onlineRes.ok) {
        onlineStatus = await onlineRes.json();
      }
    } catch (error) {
      logger.warn('[API][friends] Could not fetch online status from socket server:', error);
    }

    // Update friends with actual online status
    friends.forEach((f: any) => {
      f.isOnline = onlineStatus[f.id] || false;
    });

    const elapsed = Date.now() - start;
    logger.debug(`[API][friends] Success. Elapsed: ${elapsed}ms, count: ${friends.length}`);

    // Cache the result (TTL in seconds — FRIENDS_CACHE_TTL is ms)
    friendsCache.set(cacheKey, friends, FRIENDS_CACHE_TTL / 1000);
    return NextResponse.json(friends);
  } catch (error) {
    logger.error('Error fetching friends:', error);
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}
