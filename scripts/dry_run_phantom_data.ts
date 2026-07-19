import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function main() {
  const isConfirmMode = process.argv.includes('--confirm');
  console.log(`--- STARTING ${isConfirmMode ? 'EXECUTION' : 'DRY RUN'}: PHANTOM DATA CLEANUP ---`);

  console.log('Scanning database for phantom rooms and related data...');

  // 1. Find Phantom Rooms
  const phantomRooms = await prisma.room.findMany({
    where: {
      id: {
        startsWith: 'notifications-'
      }
    },
    select: { id: true, name: true, hostId: true }
  });

  const phantomRoomIds = phantomRooms.map(r => r.id);

  // 2. Find Phantom Messages
  // Messages can either be tied directly to a phantom room, OR just have the string pattern directly matching
  const phantomMessages = await prisma.message.findMany({
    where: {
      OR: [
        { roomId: { in: phantomRoomIds.length > 0 ? phantomRoomIds : ['__dummy__'] } },
        { roomId: { startsWith: 'notifications-' } }
      ]
    },
    select: { id: true, text: true, roomId: true, userId: true }
  });

  // 3. Find other phantom relationships using roomId
  const phantomFavoriteRooms = await prisma.favoriteRoom.findMany({
    where: { roomId: { startsWith: 'notifications-' } },
    select: { id: true, roomId: true }
  });

  const phantomWatchHistory = await prisma.watchHistory.findMany({
    where: { roomId: { startsWith: 'notifications-' } },
    select: { id: true, roomId: true, videoTitle: true }
  });

  const phantomScheduledRooms = await prisma.scheduledRoom.findMany({
    where: { roomId: { startsWith: 'notifications-' } },
    select: { id: true, roomId: true }
  });

  const phantomRoomVotes = await prisma.roomVote.findMany({
    where: { roomId: { startsWith: 'notifications-' } },
    select: { id: true, roomId: true }
  });

  // Collect all unique room IDs we found across any of the tables
  const allPhantomRoomIdsFound = new Set([
    ...phantomRooms.map(r => r.id),
    ...phantomMessages.map(m => m.roomId),
    ...phantomFavoriteRooms.map(f => f.roomId),
    ...phantomWatchHistory.map(w => w.roomId),
    ...phantomScheduledRooms.map(s => s.roomId),
    ...phantomRoomVotes.map(v => v.roomId)
  ]);

  const totalPhantomRecords =
    phantomRooms.length +
    phantomMessages.length +
    phantomFavoriteRooms.length +
    phantomWatchHistory.length +
    phantomScheduledRooms.length +
    phantomRoomVotes.length;

  console.log('\n--- ANALYSIS RESULTS ---');
  console.log(`Phantom Rooms Found: ${phantomRooms.length}`);
  console.log(`Phantom Messages Found: ${phantomMessages.length}`);
  console.log(`Phantom Favorite Rooms Found: ${phantomFavoriteRooms.length}`);
  console.log(`Phantom Watch History Found: ${phantomWatchHistory.length}`);
  console.log(`Phantom Scheduled Rooms Found: ${phantomScheduledRooms.length}`);
  console.log(`Phantom Room Votes Found: ${phantomRoomVotes.length}`);
  console.log(`\nUnique Phantom Room IDs identified across all tables: ${allPhantomRoomIdsFound.size}`);
  
  // Show a preview of the rooms:
  if (phantomRooms.length > 0) {
    console.log('\nSample Phantom Rooms:');
    phantomRooms.slice(0, 5).forEach(r => console.log(`  - Room ID: ${r.id} | Host: ${r.hostId || 'None'}`));
    if (phantomRooms.length > 5) console.log(`  ...and ${phantomRooms.length - 5} more.`);
  }

  // Show a preview of the messages:
  if (phantomMessages.length > 0) {
    console.log('\nSample Phantom Messages:');
    phantomMessages.slice(0, 5).forEach(m => console.log(`  - [In ${m.roomId}] User ${m.userId || 'Unknown'}: "${m.text.substring(0, 30)}${m.text.length > 30 ? '...' : ''}"`));
    if (phantomMessages.length > 5) console.log(`  ...and ${phantomMessages.length - 5} more.`);
  }

  console.log('\n--- SUMMARY ---');
  console.log(`Total Corrupted/Phantom Records Found: ${totalPhantomRecords}`);

  if (totalPhantomRecords === 0) {
    console.log('\n✅ No phantom records found. Your database is completely clean!');
    process.exit(0);
  }

  if (!isConfirmMode) {
    console.log('\nNOTE: This was a DRY RUN. No changes were made to the database. Run with --confirm to execute.');
    process.exit(0);
  }

  // Confirm Mode execution
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

  console.log('\n⚠️  WARNING: You are about to permanently delete these phantom records from the database.');
  const answer = await question('Type CONFIRM to proceed: ');
  rl.close();

  if (answer !== 'CONFIRM') {
    console.log('\nExecution aborted by user. No changes were made.');
    process.exit(0);
  }

  // Execute Transaction
  console.log('\nExecuting Prisma Transaction...');
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete Messages (Cascade might catch these if Room is deleted, but doing it explicitly guarantees it)
      if (phantomMessages.length > 0) {
        console.log(`Deleting ${phantomMessages.length} phantom messages...`);
        await tx.message.deleteMany({
          where: {
            OR: [
              { roomId: { in: phantomRoomIds.length > 0 ? phantomRoomIds : ['__dummy__'] } },
              { roomId: { startsWith: 'notifications-' } }
            ]
          }
        });
      }

      // 2. Delete FavoriteRooms
      if (phantomFavoriteRooms.length > 0) {
        console.log(`Deleting ${phantomFavoriteRooms.length} phantom favorite rooms...`);
        await tx.favoriteRoom.deleteMany({
          where: { roomId: { startsWith: 'notifications-' } }
        });
      }

      // 3. Delete Watch History
      if (phantomWatchHistory.length > 0) {
        console.log(`Deleting ${phantomWatchHistory.length} phantom watch history records...`);
        await tx.watchHistory.deleteMany({
          where: { roomId: { startsWith: 'notifications-' } }
        });
      }

      // 4. Delete Scheduled Rooms
      if (phantomScheduledRooms.length > 0) {
        console.log(`Deleting ${phantomScheduledRooms.length} phantom scheduled rooms...`);
        await tx.scheduledRoom.deleteMany({
          where: { roomId: { startsWith: 'notifications-' } }
        });
      }

      // 5. Delete Room Votes
      if (phantomRoomVotes.length > 0) {
        console.log(`Deleting ${phantomRoomVotes.length} phantom room votes...`);
        await tx.roomVote.deleteMany({
          where: { roomId: { startsWith: 'notifications-' } }
        });
      }

      // 6. Delete the core Rooms themselves (this must be last if schema cascades aren't fully set up for manually querying)
      if (phantomRooms.length > 0) {
        console.log(`Deleting ${phantomRooms.length} phantom rooms...`);
        await tx.room.deleteMany({
          where: { id: { startsWith: 'notifications-' } }
        });
      }
    });

    console.log('\n✅ SUCCESS: Database successfully cleaned of phantom relational data.');
    console.log(`-> Permanently deleted ${totalPhantomRecords} corrupted records.`);
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
