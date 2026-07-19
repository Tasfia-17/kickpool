import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

type DemoUserSeed = {
  username: string;
  email: string;
  password: string;
  role: string;
  isFounder?: boolean;
  isVIP?: boolean;
};

const demoUsers: DemoUserSeed[] = [
  {
    username: 'Lucario',
    email: 'lucario@cinepurr.dev',
    password: '***REMOVED***',
    role: 'FOUNDER',
    isFounder: true,
    isVIP: true,
  },
  {
    username: 'Resque',
    email: '***REMOVED***',
    password: '***REMOVED***',
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

async function upsertDemoUser(user: DemoUserSeed) {
  const password = await hash(user.password, 12);
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: user.username },
        { email: user.email },
      ],
    },
    select: { id: true },
  });

  const data = {
    username: user.username,
    email: user.email,
    password,
    role: user.role,
    isFounder: user.isFounder ?? false,
    isVIP: user.isVIP ?? false,
    emailVerified: true,
    verificationCode: null,
    verificationExpires: null,
    birthDate: new Date('1998-01-01T00:00:00.000Z'),
    isBanned: false,
    banReason: null,
  };

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data,
    });
    console.log(`[seed] Updated demo account: ${user.username}`);
    return;
  }

  await prisma.user.create({ data });
  console.log(`[seed] Created demo account: ${user.username}`);
}

async function main() {
  console.log('[seed] Seeding TestSprite hackathon demo accounts...');

  for (const user of demoUsers) {
    await upsertDemoUser(user);
  }

  console.log('[seed] Demo accounts are ready.');
}

main()
  .catch((error) => {
    console.error('[seed] Failed to seed demo accounts:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
