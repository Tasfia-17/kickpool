import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/admin/rooms/[id]/route';
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
  isSuperAdmin: vi.fn((role) => role === 'admin' || role === 'SUPER_ADMIN'),
}));

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as any)
);

describe('Admin Room Update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(prisma);
  });

  it('should call prisma.room.update to persist maxUsers changes to the DB', async () => {
    // Arrange
    const mockAdminId = 'admin-user-id';
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockAdminId, name: 'Admin', role: 'admin' },
    } as any);

    (prisma.room.update as any).mockResolvedValue({ id: 'test-room', maxUsers: 50 });

    const req = new Request('http://localhost:3000/api/admin/rooms/test-room', {
      method: 'PATCH',
      body: JSON.stringify({ maxUsers: 50 }),
    });

    // Act
    // Fake the Next.js App Router params object which needs to be a Promise in Next 15+
    const paramsPromise = Promise.resolve({ id: 'test-room' });
    const res = await PATCH(req, { params: paramsPromise });

    // Assert
    expect(res.status).toBe(200);

    const updateCalls = (prisma.room.update as any).mock.calls;
    expect(updateCalls.length).toBe(1);
    
    // Verify it updates the database and doesn't just rely on local state/socket event
    expect(updateCalls[0][0].where).toEqual({ id: 'test-room' });
    expect(updateCalls[0][0].data).toEqual({ maxUsers: 50 });

    // Verify socket notification was also attempted
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should block non-admins from updating maxUsers', async () => {
    // Arrange
    const mockUserId = 'normal-user-id';
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: 'Normal User', role: 'user' },
    } as any);

    const req = new Request('http://localhost:3000/api/admin/rooms/test-room', {
      method: 'PATCH',
      body: JSON.stringify({ maxUsers: 50 }),
    });

    // Act
    const paramsPromise = Promise.resolve({ id: 'test-room' });
    const res = await PATCH(req, { params: paramsPromise });

    // Assert
    expect(res.status).toBe(403);
    expect((prisma.room.update as any).mock.calls.length).toBe(0);
  });
});
