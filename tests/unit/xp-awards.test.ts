import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/rooms/route';
import { getServerSession } from 'next-auth';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

vi.mock('@/lib/prisma', () => ({
  get prisma() { return prismaMock; }
}));

import { prisma } from '@/lib/prisma';



vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/security', () => ({
  rateLimiters: {
    roomCreate: {
      check: vi.fn(() => ({ allowed: true, resetIn: 0 })),
    },
  },
}));

describe('Room Creation XP Awards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(prisma);
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('should award exactly 100 XP when creating a room', async () => {
    // Arrange
    const mockUserId = 'test-user-id';
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: 'Test User' },
    } as any);

    (prisma.room.create as any).mockResolvedValue({ id: 'test-room-id' });
    (prisma.user.update as any).mockResolvedValue({ totalXP: 100 });
    (prisma.dailyQuest.findFirst as any).mockResolvedValue(null);
    (prisma.dailyQuest.create as any).mockResolvedValue({});
    (prisma.activity.create as any).mockResolvedValue({});
    
    // Implement transaction mock to immediately execute the callback with the prisma mock
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });

    // Act
    const req = new Request('http://localhost:3000/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Room', isPublic: true, maxUsers: 20 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Wait for all async non-blocking background operations to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    const userUpdateCalls = (prisma.user.update as any).mock.calls;
    
    let totalXPAwarded = 0;
    userUpdateCalls.forEach((call: any[]) => {
      const data = call[0].data as any;
      if (data && data.totalXP && data.totalXP.increment) {
        totalXPAwarded += data.totalXP.increment;
      }
    });

    expect(totalXPAwarded).toBe(100);
  });
});

