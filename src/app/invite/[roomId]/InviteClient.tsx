'use client';

import { useRouter } from 'next/navigation';

interface RoomData {
  name: string | null;
  currentVideoTitle: string | null;
  onlineCount: number;
  maxUsers: number;
  host: {
    username: string;
    image: string | null;
  } | null;
}

interface InviteClientProps {
  roomId: string;
  room: RoomData;
}

export function InviteClient({ roomId, room }: InviteClientProps) {
  const router = useRouter();

  const roomName = room.name || 'Watch Party';
  const videoTitle = room.currentVideoTitle || '';
  const hostName = room.host?.username || 'Anonymous';
  const onlineCount = room.onlineCount;
  const maxUsers = room.maxUsers;

  const handleJoin = () => {
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-md w-full">
        {/* Clickable Invite Card */}
        <button
          onClick={handleJoin}
          className="w-full group relative bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 rounded-2xl overflow-hidden shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 hover:scale-[1.02]"
        >
          {/* Pixel grid background pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐱</span>
                <span className="font-bold text-amber-900 dark:text-amber-100">CinePurr</span>
              </div>
              <div className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                INVITE
              </div>
            </div>

            {/* Host Section */}
            <div className="flex items-center gap-4 mb-4">
              {/* Host Avatar */}
              <img
                src={`/api/avatar/${hostName}`}
                alt={hostName}
                className="w-16 h-16 rounded-lg border-2 border-amber-900 dark:border-amber-100 object-cover"
              />
              <div className="text-left">
                <p className="text-xs text-amber-700 dark:text-amber-300 uppercase tracking-wide">Hosted by</p>
                <p className="font-bold text-amber-900 dark:text-amber-100 text-lg">{hostName}</p>
              </div>
            </div>

            {/* Room Info */}
            <div className="mb-4">
              <h1 className="font-black text-2xl text-amber-900 dark:text-amber-100 mb-1">
                {roomName}
              </h1>
              {videoTitle && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  🎬 Now Playing: {videoTitle}
                </p>
              )}
            </div>

            {/* Room Code */}
            <div className="flex items-center justify-between">
              <div className="px-3 py-2 bg-amber-900 dark:bg-amber-100 rounded-lg">
                <span className="font-mono text-amber-100 dark:text-amber-900 font-bold tracking-wider">
                  {roomId.toUpperCase()}
                </span>
              </div>
              
              {/* Online Count */}
              {onlineCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    {onlineCount}/{maxUsers} watching
                  </span>
                </div>
              )}
            </div>

            {/* CTA - Join Button */}
            <div className="mt-6 flex items-center justify-center gap-2 py-3 bg-amber-500 rounded-lg group-hover:bg-amber-400 transition-colors">
              <span className="font-bold text-white">▶ JOIN NOW</span>
            </div>
          </div>
        </button>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-4">
          Click to join the watch party
        </p>
      </div>
    </div>
  );
}
