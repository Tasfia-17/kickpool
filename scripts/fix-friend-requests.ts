import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFriendRequests() {
  const updated = await prisma.friendRequest.updateMany({
    data: { status: 'PENDING' },
    where: { status: { not: 'PENDING' } }
  });
  console.log(`Updated ${updated.count} friend requests to PENDING.`);
  await prisma.$disconnect();
}

fixFriendRequests();
