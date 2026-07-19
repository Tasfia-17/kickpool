import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  getProfileViewByUsername,
  getRawProfileRecordByUsername,
} from "@/lib/profileData";

export const revalidate = 30;

type ActivityPayload = {
  roomId?: string;
  roomName?: string;
  videoTitle?: string;
  duration?: number;
  achievementName?: string;
  level?: number;
  gameName?: string;
  xpEarned?: number;
};

function parseActivityData(data: unknown): ActivityPayload {
  if (!data) {
    return {};
  }

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as ActivityPayload;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  if (typeof data === "object") {
    return data as ActivityPayload;
  }

  return {};
}

function formatActivity(activity: {
  id: string;
  type: string;
  data: unknown;
  createdAt: Date;
}) {
  const data = parseActivityData(activity.data);
  let description = activity.type.replace(/_/g, " ");
  let icon = "📍";

  switch (activity.type) {
    case "room_join":
      description = `Joined room "${data.roomName || "a room"}"`;
      icon = "🚪";
      break;
    case "video_watch":
      description = `Watched "${data.videoTitle || "a screening"}"`;
      icon = "🎬";
      break;
    case "message_sent":
      description = "Sent a message in chat";
      icon = "💬";
      break;
    case "achievement_earned":
      description = `Earned ${data.achievementName || "a new achievement"}`;
      icon = "🏆";
      break;
    case "level_up":
      description = `Reached level ${data.level || "?"}`;
      icon = "⬆️";
      break;
    case "game_played":
      description = `Played ${data.gameName || "a minigame"}`;
      icon = "🎮";
      break;
    default:
      break;
  }

  return {
    id: activity.id,
    type: activity.type,
    description,
    icon,
    xpEarned: data.xpEarned ?? 0,
    createdAt: activity.createdAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const [{ username: rawUsername }, session] = await Promise.all([
      params,
      getServerSession(authOptions),
    ]);
    const username = decodeURIComponent(rawUsername);
    const user = await getRawProfileRecordByUsername(username);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = await getProfileViewByUsername({
      username,
      viewer: session?.user
        ? {
            id: (session.user as { id?: string }).id,
            username: session.user.name,
            role: (session.user as { role?: string }).role,
          }
        : null,
    });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const canViewFullActivity = profile.canViewFullJourney;
    const activityLimit = canViewFullActivity ? 20 : 5;
    const scoreLimit = canViewFullActivity ? 5 : 2;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [activities, recentScores, recentWatchs] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: activityLimit,
        select: {
          id: true,
          type: true,
          data: true,
          createdAt: true,
        },
      }),
      prisma.minigameScore.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: scoreLimit,
        select: {
          gameType: true,
          score: true,
          createdAt: true,
        },
      }),
      prisma.watchHistory.findMany({
        where: {
          userId: user.id,
          watchedAt: { gte: sevenDaysAgo },
        },
        orderBy: { watchedAt: "desc" },
        select: {
          roomId: true,
          duration: true,
        },
      }),
    ]);

    const formattedActivities = activities.map(formatActivity);
    const totalWatchTime = recentWatchs.reduce(
      (sum, item) => sum + (item.duration ?? 0),
      0,
    );
    const roomsJoined = new Set(
      recentWatchs.map((item) => item.roomId).filter(Boolean),
    ).size;
    const xpEarned = formattedActivities.reduce(
      (sum, activity) => sum + (activity.xpEarned ?? 0),
      0,
    );

    return NextResponse.json({
      activities: formattedActivities,
      recentScores: recentScores.map((score) => ({
        gameType: score.gameType,
        score: score.score,
        playedAt: score.createdAt.toISOString(),
      })),
      currentStreak: user.currentStreak ?? 0,
      weekStats: {
        watchTime: totalWatchTime,
        messagesCount: formattedActivities.filter(
          (activity) => activity.type === "message_sent",
        ).length,
        roomsJoined,
        gamesPlayed: recentScores.length,
        xpEarned,
      },
      canViewFullActivity,
    });
  } catch (error) {
    logger.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 },
    );
  }
}
