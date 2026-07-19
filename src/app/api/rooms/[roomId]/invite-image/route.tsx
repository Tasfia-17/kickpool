import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  let roomName = 'Watch Party';
  let videoTitle = '';
  let onlineCount = 0;
  let hostName = 'Anonymous';
  let hostImage: string | null = null;
  let maxUsers = 50;

  try {
    const room = await Promise.race([
      prisma.room.findUnique({
        where: { id: roomId },
        select: {
          name: true,
          currentVideoTitle: true,
          onlineCount: true,
          maxUsers: true,
          host: {
            select: { username: true, image: true }
          }
        },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (room) {
      roomName = room.name || 'Watch Party';
      videoTitle = room.currentVideoTitle || '';
      onlineCount = room.onlineCount;
      maxUsers = room.maxUsers;
      hostName = room.host?.username || 'Anonymous';
      hostImage = room.host?.image || null;
    }
  } catch {
    // fallback to defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#f5f0e8',
          fontFamily: '"VT323", monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Pixel grid background pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(200, 180, 160, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(200, 180, 160, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Retro window chrome - title bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
            padding: '12px 16px',
            borderBottom: '3px solid #1a1a1a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Window control buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '14px', height: '14px', background: '#ff5f57', borderRadius: '50%', border: '2px solid #1a1a1a' }} />
              <div style={{ width: '14px', height: '14px', background: '#febc2e', borderRadius: '50%', border: '2px solid #1a1a1a' }} />
              <div style={{ width: '14px', height: '14px', background: '#28c840', borderRadius: '50%', border: '2px solid #1a1a1a' }} />
            </div>
            <span style={{ fontSize: '18px', color: '#f5f0e8', marginLeft: '12px', letterSpacing: '1px' }}>
              🎬 CinePurr - Watch Party Invite
            </span>
          </div>
        </div>

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            padding: '24px',
            gap: '24px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left panel — retro window style host card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '280px',
              background: 'linear-gradient(180deg, #ffffff 0%, #f5f0e8 100%)',
              border: '3px solid #2a2a2a',
              borderRadius: '8px',
              padding: '24px',
              gap: '16px',
              boxShadow: '6px 6px 0px #2a2a2a',
            }}
          >
            {/* Title bar for left panel */}
            <div
              style={{
                position: 'absolute',
                top: '-3px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#f5c542',
                padding: '4px 20px',
                borderRadius: '4px 4px 0 0',
                border: '3px solid #2a2a2a',
                borderBottom: 'none',
                fontSize: '14px',
                color: '#2a2a2a',
                fontWeight: 'bold',
                letterSpacing: '1px',
              }}
            >
              HOST
            </div>

            {/* Host avatar - using external image */}
            <img
              src={`https://cinepurr.me/api/avatar/${hostName}`}
              alt={hostName}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '4px',
                border: '3px solid #2a2a2a',
                boxShadow: '4px 4px 0px #2a2a2a',
                objectFit: 'cover',
              }}
            />

            {/* Host name */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6a6a6a', letterSpacing: '2px', textTransform: 'uppercase' }}>Hosted by</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2a2a2a', textAlign: 'center' }}>
                {hostName.length > 14 ? hostName.slice(0, 14) + '…' : hostName}
              </span>
            </div>

            {/* Room code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6a6a6a', letterSpacing: '2px', textTransform: 'uppercase' }}>Room Code</span>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: '#f5c542',
                  letterSpacing: '3px',
                  fontFamily: 'monospace',
                  background: '#2a2a2a',
                  padding: '4px 12px',
                  borderRadius: '4px',
                }}
              >
                {roomId.toUpperCase()}
              </span>
            </div>

            {/* Online count */}
            {onlineCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#2a2a2a',
                  border: '2px solid #f5c542',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  marginTop: '4px',
                }}
              >
                <div style={{ width: '8px', height: '8px', background: '#28c840', borderRadius: '2px' }} />
                <span style={{ fontSize: '14px', color: '#f5f0e8', fontWeight: 'bold' }}>
                  {onlineCount}/{maxUsers} watching
                </span>
              </div>
            )}
          </div>

          {/* Main content - right side */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '32px',
              gap: '20px',
              background: 'linear-gradient(180deg, #ffffff 0%, #f5f0e8 100%)',
              border: '3px solid #2a2a2a',
              borderRadius: '8px',
              boxShadow: '6px 6px 0px #2a2a2a',
            }}
          >
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🐱</span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#f5c542',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  background: '#2a2a2a',
                  padding: '4px 12px',
                  borderRadius: '4px',
                }}
              >
                CinePurr
              </span>
            </div>

            {/* You're Invited badge */}
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                background: '#f5c542',
                color: '#2a2a2a',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '6px 16px',
                borderRadius: '4px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                border: '2px solid #2a2a2a',
                boxShadow: '3px 3px 0px #2a2a2a',
              }}
            >
              ★ You're Invited! ★
            </div>

            {/* Room Name */}
            <div
              style={{
                fontSize: videoTitle ? '44px' : '56px',
                fontWeight: 'bold',
                color: '#2a2a2a',
                lineHeight: 1.1,
                letterSpacing: '-1px',
              }}
            >
              {roomName.length > 30 ? roomName.slice(0, 30) + '…' : roomName}
            </div>

            {/* Video playing */}
            {videoTitle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '6px',
                    height: '32px',
                    background: '#f5c542',
                    borderRadius: '2px',
                    border: '2px solid #2a2a2a',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', color: '#6a6a6a', letterSpacing: '2px', textTransform: 'uppercase' }}>Now Playing</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2a2a2a', maxWidth: '500px', overflow: 'hidden' }}>
                    {videoTitle.length > 45 ? videoTitle.slice(0, 45) + '…' : videoTitle}
                  </span>
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: '#f5c542',
                  color: '#2a2a2a',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  padding: '10px 24px',
                  borderRadius: '4px',
                  letterSpacing: '1px',
                  border: '2px solid #2a2a2a',
                  boxShadow: '3px 3px 0px #2a2a2a',
                }}
              >
                ▶ JOIN NOW
              </div>
              <span style={{ fontSize: '14px', color: '#6a6a6a', letterSpacing: '1px' }}>
                cinepurr.me
              </span>
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            background: '#2a2a2a',
            borderTop: '3px solid #f5c542',
          }}
        >
          <span style={{ fontSize: '12px', color: '#f5f0e8', letterSpacing: '2px' }}>
            ★★★ PURR-FECT WATCHING EXPERIENCE ★★★
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
