import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Matching calculation logic from src/lib/xp.ts
function calculateLevel(totalXP: number): number {
  if (totalXP < 0) return 1;
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

async function main() {
  const isConfirmMode = process.argv.includes('--confirm');
  console.log(`--- STARTING ${isConfirmMode ? 'EXECUTION' : 'DRY RUN'}: PHANTOM XP REMOVAL ---`);

  // Step 1: Find all phantom 'room_join' activities related to notifications
  const phantomActivities = await prisma.activity.findMany({
    where: {
      type: 'room_join',
      data: {
        contains: 'notifications-'
      }
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          totalXP: true,
          level: true,
        }
      }
    }
  });

  if (phantomActivities.length === 0) {
    console.log('No phantom XP activities found! Everything is clean.');
    process.exit(0);
  }

  console.log(`Found ${phantomActivities.length} phantom activities.`);

  // Step 2: Calculate how much XP to deduct per user
  const xpDeductions = new Map<string, { username: string, deductions: number, activitiesToRemove: string[], currentXp: number, currentLevel: number }>();

  for (const activity of phantomActivities) {
    const userId = activity.userId;
    if (!xpDeductions.has(userId)) {
      xpDeductions.set(userId, {
        username: activity.user.username,
        deductions: 0,
        activitiesToRemove: [],
        currentXp: activity.user.totalXP,
        currentLevel: activity.user.level,
      });
    }

    const userData = xpDeductions.get(userId)!;
    // Server index.ts awards 10 XP per room_join
    userData.deductions += 10;
    userData.activitiesToRemove.push(activity.id);
  }

  // Step 3: Print Dry-Run results
  console.log('\n--- ANALYSIS RESULTS ---');
  let totalXpToDeduct = 0;
  let totalUsersAffected = 0;
  const allActivityIdsToRemove: string[] = [];

  for (const [userId, data] of Array.from(xpDeductions.entries())) {
    const newXp = Math.max(0, data.currentXp - data.deductions);
    const newLevel = calculateLevel(newXp);

    console.log(`\nUser: ${data.username} (ID: ${userId})`);
    console.log(`  Current XP: ${data.currentXp} (Level ${data.currentLevel})`);
    console.log(`  Target XP after fix: ${newXp} (Level ${newLevel})`);
    console.log(`  Phantom XP to remove: ${data.deductions}`);
    console.log(`  Activities to delete: ${data.activitiesToRemove.length}`);

    totalXpToDeduct += data.deductions;
    totalUsersAffected++;
    allActivityIdsToRemove.push(...data.activitiesToRemove);
  }

  console.log('\n--- SUMMARY ---');
  console.log(`Total Users Affected: ${totalUsersAffected}`);
  console.log(`Total Phantom Activities to Delete: ${phantomActivities.length}`);
  console.log(`Total XP That WILL Be Deducted: ${totalXpToDeduct}`);

  if (!isConfirmMode) {
    console.log('\nNOTE: This was a DRY RUN. No changes were made to the database. Run with --confirm to execute.');
    process.exit(0);
  }

  // Step 4: Prompt for confirmation before transaction
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

  console.log('\n⚠️  WARNING: You are about to modify the database.');
  const answer = await question('Type CONFIRM to proceed: ');
  rl.close();

  if (answer !== 'CONFIRM') {
    console.log('\nExecution aborted by user. No changes were made.');
    process.exit(0);
  }

  // Step 5: Execute Transaction
  console.log('\nExecuting Prisma Transaction...');
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all phantom activities
      console.log(`Deleting ${allActivityIdsToRemove.length} phantom activities...`);
      await tx.activity.deleteMany({
        where: {
          id: {
            in: allActivityIdsToRemove
          }
        }
      });

      // 2. Update all affected users
      console.log(`Updating XP and Level for ${xpDeductions.size} users...`);
      for (const [userId, data] of Array.from(xpDeductions.entries())) {
        const newXp = Math.max(0, data.currentXp - data.deductions);
        const newLevel = calculateLevel(newXp);

        await tx.user.update({
          where: { id: userId },
          data: {
            totalXP: newXp,
            level: newLevel
          }
        });
      }
    });

    console.log('\n✅ SUCCESS: Database successfully cleaned.');
    console.log(`-> Corrected XP for ${totalUsersAffected} users.`);
    console.log(`-> Deleted ${allActivityIdsToRemove.length} ghost activities.`);
  } catch (error) {
    console.error('\n❌ ERROR: Transaction failed! Changes automatically rolled back.');
    console.error(error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
