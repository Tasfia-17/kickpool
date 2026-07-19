import { prisma } from '@/lib/prisma';
import RoomsClient from '@/components/admin/RoomsClient';

export const dynamic = 'force-dynamic';

export default async function AdminRoomsPage() {
  // Pre-fetch all rooms
  const initialRooms = await prisma.room.findMany({
    orderBy: { onlineCount: 'desc' },
    include: {
      host: {
        select: { id: true, username: true }
      },
      _count: {
        select: { messages: true }
      }
    }
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">Room Management</h1>
        <p className="text-gray-500 font-mono text-sm bg-white p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-block">
          Force close rogue rooms, broadcast global messages to all active socket connections, and manage capacities.
        </p>
      </div>

      <RoomsClient initialRooms={initialRooms} />
    </div>
  );
}
