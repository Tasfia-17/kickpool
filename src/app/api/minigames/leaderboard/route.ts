import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gameType = searchParams.get('gameType');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    if (!gameType) {
      return NextResponse.json({ error: 'Game type required' }, { status: 400 });
    }

    // Validate gameType to prevent abuse
    const allowedGames = ['snake', 'clicker', '2048', 'minesweeper', 'reaction', 'solitaire', 'tictactoe', 'memory', 'typing'];
    if (!allowedGames.includes(gameType)) {
      return NextResponse.json({ error: 'Unknown game type' }, { status: 400 });
    }

    // For reaction and minesweeper games, lower is better
    const lowerIsBetter = ['reaction', 'minesweeper'].includes(gameType);

    // Optimized: Get best score per user using aggregation
    const bestScores = await prisma.minigameScore.groupBy({
      by: ['userId'],
      where: { gameType },
      _max: { score: true },
      _min: { score: true },
    });

    // Extract userIds and fetch users in a single query
    const userIds = bestScores.map(s => s.userId);
    const userMap = new Map();
    
    if (userIds.length > 0) {
      const usersData = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true }
      });
      usersData.forEach(u => userMap.set(u.id, u.username));
    }

    // Build sorted scores array
    const sortedScores = bestScores
      .map(s => ({
        userId: s.userId,
        username: userMap.get(s.userId) || 'Unknown',
        score: lowerIsBetter ? (s._min.score ?? 0) : (s._max.score ?? 0)
      }))
      .sort((a, b) => lowerIsBetter ? a.score - b.score : b.score - a.score);

    // Get top N for leaderboard
    const topScores = sortedScores.slice(0, limit);
    const leaders = topScores.map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      score: entry.score,
    }));

    // Get current user's rank
    let userRank: number | null = null;
    const userIndex = sortedScores.findIndex(s => s.userId === session.user.id);
    if (userIndex !== -1) {
      userRank = userIndex + 1;
    }

    return NextResponse.json({
      leaders,
      userRank,
      totalPlayers: sortedScores.length,
    });
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
