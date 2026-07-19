import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateLevel } from '@/lib/xp';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gameType = searchParams.get('gameType');
    const global = searchParams.get('global') === 'true'; // Optional: get global leader

    if (!gameType) {
      return NextResponse.json({ error: 'Game type required' }, { status: 400 });
    }

    // Get user's own high score
    const userHighScore = await prisma.minigameScore.findFirst({
      where: {
        userId: session.user.id,
        gameType,
      },
      orderBy: {
        score: 'desc',
      },
      select: {
        score: true,
        time: true,
      },
    });

    // Get global leader if requested
    let globalLeader = null;
    if (global) {
      const globalScore = await prisma.minigameScore.findFirst({
        where: {
          gameType,
        },
        orderBy: {
          score: 'desc',
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      });

      if (globalScore) {
        globalLeader = {
          score: globalScore.score,
          username: globalScore.user.username,
          time: globalScore.time,
        };
      }
    }

    return NextResponse.json({
      highScore: userHighScore?.score || 0,
      bestTime: userHighScore?.time || null,
      globalLeader: globalLeader,
    });
  } catch (error) {
    logger.error('Error fetching minigame score:', error);
    return NextResponse.json(
      { error: 'Failed to fetch score' },
      { status: 500 }
    );
  }
}

// Allowed game types for validation
const ALLOWED_GAME_TYPES = ['snake', 'clicker', '2048', 'minesweeper', 'reaction', 'solitaire', 'tictactoe', 'memory', 'typing'];
const MAX_SCORE = 999999999; // Prevent integer overflow

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameType, score, level, time } = await req.json();

    // Validate gameType
    if (!gameType || typeof gameType !== 'string' || gameType.length > 50) {
      return NextResponse.json(
        { error: 'Invalid game type' },
        { status: 400 }
      );
    }

    if (!ALLOWED_GAME_TYPES.includes(gameType)) {
      return NextResponse.json(
        { error: 'Unknown game type' },
        { status: 400 }
      );
    }

    // Validate score
    if (score === undefined || typeof score !== 'number' || score < 0 || score > MAX_SCORE || !Number.isFinite(score)) {
      return NextResponse.json(
        { error: 'Invalid score value' },
        { status: 400 }
      );
    }

    // Use upsert to update existing high score or create new
    // First check if user already has a score for this game type
    const existingScore = await prisma.minigameScore.findFirst({
      where: {
        userId: session.user.id,
        gameType,
      },
      orderBy: {
        score: 'desc',
      },
    });

    let minigameScore;
    
    // Only save if it's a new high score or first score
    if (!existingScore || score > existingScore.score) {
      if (existingScore) {
        // Update existing record with new high score
        minigameScore = await prisma.minigameScore.update({
          where: { id: existingScore.id },
          data: {
            score: Math.floor(score),
            level: level ? parseInt(String(level)) : null,
            time: time ? parseInt(String(time)) : null,
          },
        });
      } else {
        // Create new record
        minigameScore = await prisma.minigameScore.create({
          data: {
            userId: session.user.id,
            gameType,
            score: Math.floor(score),
            level: level ? parseInt(String(level)) : null,
            time: time ? parseInt(String(time)) : null,
          },
        });
      }
    } else {
      // Return existing score if not a new high
      minigameScore = existingScore;
    }

    // Award XP based on score - use transaction to prevent race conditions
    const xpReward = Math.floor(score / 10);
    if (xpReward > 0) {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: session.user.id },
          data: { totalXP: { increment: xpReward } },
          select: { totalXP: true },
        });

        if (user) {
          const newLevel = calculateLevel(user.totalXP);

          await tx.user.update({
            where: { id: session.user.id },
            data: {
              level: newLevel,
            },
          });
        }
      });
    }

    return NextResponse.json({ score: minigameScore });
  } catch (error) {
    logger.error('Error saving minigame score:', error);
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 }
    );
  }
}

