import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/friends/accept/route';
import { getServerSession } from 'next-auth';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

vi.mock('@/lib/prisma', () => ({
  get prisma() { return prismaMock; }
}));

import { prisma } from '@/lib/prisma';
import * as cacheModule from '@/lib/cache';

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

vi.mock('@/lib/cache', () => ({
  invalidateFriendsCacheForBoth: vi.fn(),
  invalidateFriendsCacheFor: vi.fn(),
}));

describe('Friend Accept Transaction Atomicity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(prisma);
  });

  it('should execute 3 DB operations atomically via $transaction', async () => {
    // Arrange
    const mockReceiverId = 'receiver-id';
    const mockReceiverUsername = 'ReceiverUser';
    const mockSenderId = 'sender-id';
    const mockRequestId = 'request-id';

    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: mockReceiverUsername },
    } as any);

    (prisma.user.findUnique as any).mockResolvedValue({
      id: mockReceiverId, username: mockReceiverUsername
    });

    (prisma.friendRequest.findFirst as any).mockResolvedValue({
      id: mockRequestId,
      senderId: mockSenderId,
      receiverId: mockReceiverId,
      status: 'PENDING'
    });

    // We only care about verifying the transaction array, so we return an empty array for the transaction result
    (prisma.$transaction as any).mockResolvedValue([]);
    
    // Mock the other random queries so they don't break
    (prisma.notification.deleteMany as any).mockResolvedValue({ count: 1 });
    (prisma.notification.create as any).mockResolvedValue({});

    const req = new Request('http://localhost:3000/api/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ senderId: mockSenderId }),
    });

    // Act
    const res = await POST(req);

    // Assert
    expect(res.status).toBe(200);

    // The entire point of the test: ensuring it uses the ARRAY format of prisma.$transaction 
    // to guarantee all 3 happen sequentially in one ACID transaction.
    const transactionCalls = (prisma.$transaction as any).mock.calls;
    expect(transactionCalls.length).toBe(1);
    
    const transactionOperations = transactionCalls[0][0]; // First call, first argument (the array of operations)
    
    // Ensure it's an array of length 3 (1 update, 2 creates)
    expect(Array.isArray(transactionOperations)).toBe(true);
    expect(transactionOperations.length).toBe(3);

    // Verify cache invalidation happened
    expect(cacheModule.invalidateFriendsCacheForBoth).toHaveBeenCalledWith(mockReceiverId, mockSenderId);
  });
});
