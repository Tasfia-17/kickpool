import { prisma } from '@/lib/prisma';
import UsersClient from '@/components/admin/UsersClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  // Pre-fetch initial users (first 50) to make the initial load instant
  const initialUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      role: true,
      isBanned: true,
      isVIP: true,
      isFounder: true,
      totalXP: true,
      level: true,
      roomsCreated: true
    }
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">User Management</h1>
        <p className="text-gray-500 font-mono text-sm bg-white p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-block">
          Search, filter, edit roles, and manage users. High-risk actions require confirmation.
        </p>
      </div>

      <UsersClient initialUsers={initialUsers} />
    </div>
  );
}
