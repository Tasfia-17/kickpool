import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/quests/daily/route';
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

describe('Daily Quest Progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(prisma);
  });

  it('should increment progress by adding incoming progress to existing progress', async () => {
    // Arrange
    const mockUserId = 'test-user-id';
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const existingQuest = {
      id: 'quest-123',
      userId: mockUserId,
      questType: 'watch_video',
      target: 100,
      progress: 40,
      xpReward: 50,
      completed: false,
    };

    (prisma.dailyQuest.findFirst as any).mockResolvedValue(existingQuest);
    (prisma.dailyQuest.update as any).mockResolvedValue({ ...existingQuest, progress: 60 });

    const req = new Request('http://localhost:3000/api/quests/daily', {
      method: 'POST',
      body: JSON.stringify({ questType: 'watch_video', progress: 20 }),
    }) as any;

    // Act
    const res = await POST(req);
    
    // Assert
    expect(res.status).toBe(200);

    const updateCalls = (prisma.dailyQuest.update as any).mock.calls;
    expect(updateCalls.length).toBe(1);
    
    // The new progress should be existing (40) + incoming (20) = 60
    expect(updateCalls[0][0].data.progress).toBe(60);
    // Not completed since 60 < 100
    expect(updateCalls[0][0].data.completed).toBe(false);
  });

  it('should cap progress at target and mark as completed', async () => {
    // Arrange
    const mockUserId = 'test-user-id';
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    const existingQuest = {
      id: 'quest-123',
      userId: mockUserId,
      questType: 'watch_video',
      target: 100,
      progress: 90,
      xpReward: 50,
      completed: false,
    };

    (prisma.dailyQuest.findFirst as any).mockResolvedValue(existingQuest);
    (prisma.dailyQuest.update as any).mockResolvedValue({ ...existingQuest, progress: 100, completed: true });
    
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
    
    (prisma.user.update as any).mockResolvedValue({ totalXP: 1000 });

    const req = new Request('http://localhost:3000/api/quests/daily', {
      method: 'POST',
      body: JSON.stringify({ questType: 'watch_video', progress: 50 }),
    }) as any;

    // Act
    const res = await POST(req);
    
    // Assert
    expect(res.status).toBe(200);

    const updateCalls = (prisma.dailyQuest.update as any).mock.calls;
    expect(updateCalls.length).toBe(1);
    
    // The new progress should be capped at target (100) instead of 90 + 50 = 140
    expect(updateCalls[0][0].data.progress).toBe(100);
    expect(updateCalls[0][0].data.completed).toBe(true);
  });
});
