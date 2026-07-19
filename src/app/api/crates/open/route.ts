import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateLevel } from '@/lib/xp';
import { isValidId, checkRateLimit } from '@/lib/security';
import logger from '@/lib/logger';

import { REWARD_POOLS } from '@/lib/constants/crates';

function selectReward(crateType: string) {
  // Validate crate type
  const validTypes = Object.keys(REWARD_POOLS);
  if (!validTypes.includes(crateType)) {
    logger.warn(`Invalid crate type: ${crateType}, defaulting to common`);
    crateType = 'common';
  }

  const pool = REWARD_POOLS[crateType as keyof typeof REWARD_POOLS] || REWARD_POOLS.common;
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) {
    logger.error(`Invalid reward pool weights for crate type: ${crateType}`);
    return pool[0] || { type: 'xp', amount: 50 };
  }

  let random = Math.random() * totalWeight;

  for (const item of pool) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }

  // Fallback to first item if somehow we didn't select one
  return pool[0] || { type: 'xp', amount: 50 };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting - max 10 crate opens per minute per user
    const rateLimitKey = `crate:open:${session.user.id}`;
    const rateLimit = checkRateLimit(rateLimitKey, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many crate opens. Please wait a moment.' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { crateId } = body;

    // Validate crateId
    if (!crateId || typeof crateId !== 'string') {
      return NextResponse.json({ error: 'Crate ID is required' }, { status: 400 });
    }

    if (!isValidId(crateId)) {
      return NextResponse.json({ error: 'Invalid crate ID format' }, { status: 400 });
    }

    // Use transaction to prevent race conditions (double-opening, etc.)
    const result = await prisma.$transaction(async (tx) => {
      // Lock the crate row for update
      const crate = await tx.crate.findUnique({
        where: { id: crateId },
        include: { rewards: true },
      });

      if (!crate) {
        throw new Error('Crate not found');
      }

      if (crate.userId !== session.user.id) {
        throw new Error('Unauthorized');
      }

      // Try atomically updating the crate to ensure it can only be opened once
      const updateResult = await tx.crate.updateMany({
        where: { id: crateId, opened: false },
        data: {
          opened: true,
          openedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new Error('Crate already opened');
      }

      // Select reward
      const reward = selectReward(crate.crateType);

      // Create reward and mark crate as opened atomically
      const crateReward = await tx.crateReward.create({
        data: {
          crateId: crate.id,
          rewardType: reward.type,
          rewardValue: reward.value || reward.amount?.toString() || '',
          amount: reward.amount,
        },
      });

      // Award XP if reward is XP
      if (reward.type === 'xp' && reward.amount) {
        const user = await tx.user.update({
          where: { id: session.user.id },
          data: {
            totalXP: { increment: reward.amount }
          },
          select: { totalXP: true },
        });

        if (user) {
          const newLevel = calculateLevel(user.totalXP);

          if (user.totalXP >= 0) { // Just to re-trigger the update if level changes
            await tx.user.update({
              where: { id: session.user.id },
              data: {
                level: newLevel,
              },
            });
          }
        }
      }

      // Add title to user's unlocked titles if reward is a title
      if (reward.type === 'title' && reward.value) {
        const user = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { unlockedTitles: true },
        });

        if (user) {
          const currentTitles = user.unlockedTitles || [];
          if (!currentTitles.includes(reward.value)) {
            await tx.user.update({
              where: { id: session.user.id },
              data: {
                unlockedTitles: { push: reward.value },
              },
            });
          }
        }
      }

      // Add badge to user's unlocked badges if reward is a badge
      if (reward.type === 'badge' && reward.value) {
        const user = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { unlockedBadges: true },
        });

        if (user) {
          const currentBadges = user.unlockedBadges || [];
          if (!currentBadges.includes(reward.value)) {
            await tx.user.update({
              where: { id: session.user.id },
              data: {
                unlockedBadges: { push: reward.value },
              } as any,
            });
          }
        }
      }

      // Add theme to user's unlocked themes if reward is a theme
      if (reward.type === 'theme' && reward.value) {
        const user = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { unlockedThemes: true },
        });

        if (user) {
          const currentThemes = user.unlockedThemes || [];
          if (!currentThemes.includes(reward.value)) {
            await tx.user.update({
              where: { id: session.user.id },
              data: {
                unlockedThemes: { push: reward.value },
              } as any,
            });
          }
        }
      }

      return {
        reward: {
          rewardType: reward.type,
          rewardValue: reward.value || reward.amount?.toString() || '',
          amount: reward.amount,
        },
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Error opening crate:', error);

    // Return specific error messages for known errors
    if (error.message === 'Crate not found') {
      return NextResponse.json({ error: 'Crate not found' }, { status: 404 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (error.message === 'Crate already opened') {
      return NextResponse.json({ error: 'Crate already opened' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to open crate' },
      { status: 500 }
    );
  }
}

