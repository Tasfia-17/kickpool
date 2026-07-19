'use client';

import { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, ExternalLink, Phone } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface ShareRoomModalProps {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

export function ShareRoomModal({ roomId, roomName, onClose }: ShareRoomModalProps) {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [copied, setCopied] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cinepurr.me';
  // Use invite page URL for sharing so recipients see clickable invite card
  const roomUrl = `${baseUrl}/invite/${roomId}`;
  const inviteImageUrl = `${baseUrl}/api/rooms/${roomId}/invite-image`;

  const shareText = `🐱 Join my watch party on CinePurr!\n"${roomName}"\n🎬 Watch together in real-time →`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const el = document.createElement('input');
      el.value = roomUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${roomName} on CinePurr`, text: shareText, url: roomUrl });
      } catch { /* user cancelled */ }
    }
  };

  const bg = isDarkMode ? '#1a1a2e' : 'white';
  const pc = currentTheme.colors.primary;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md border-4 border-black dark:border-white shadow-[12px_12px_0_rgba(0,0,0,1)] dark:shadow-[12px_12px_0_rgba(255,255,255,0.3)] animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: bg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-4 border-black dark:border-white" style={{ background: `linear-gradient(135deg, #111 0%, ${pc}44 100%)` }}>
          <span className="font-mono font-bold text-white flex items-center gap-2">
            <Share2 size={15} style={{ color: pc }} />
            SHARE ROOM
          </span>
          <button onClick={onClose} className="w-7 h-7 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Invite card preview */}
          <div className="border-4 border-black dark:border-white overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,1)] bg-gray-900 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inviteImageUrl}
              alt="Invite card preview"
              className="w-full block"
              style={{ aspectRatio: '1200/630', objectFit: 'cover' }}
              onError={(e) => {
                // If image fails to load, show fallback
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-card')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'fallback-card flex flex-col items-center justify-center py-8 px-4 text-center';
                  fallback.innerHTML = `<span style="font-size:48px">🐱</span><span style="color:#ff69b4;font-weight:800;font-size:18px;margin-top:8px">${roomName}</span><span style="color:#888;font-size:12px;margin-top:4px">Room Code: ${roomId.toUpperCase()}</span>`;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>

          {/* Room name + code */}
          <div className="text-center">
            <h2 className="font-black text-xl">{roomName}</h2>
            <p className="font-mono text-sm opacity-50">Room Code: <span className="font-black" style={{ color: pc }}>{roomId.toUpperCase()}</span></p>
          </div>

          {/* URL bar */}
          <div className="flex border-2 border-black dark:border-white shadow-[3px_3px_0_rgba(0,0,0,1)]">
            <input
              readOnly
              value={roomUrl}
              className="flex-1 px-3 py-2 font-mono text-xs bg-transparent outline-none min-w-0 dark:text-white"
            />
            <button
              onClick={copyLink}
              className="shrink-0 px-3 py-2 border-l-2 border-black dark:border-white font-bold text-xs transition-all hover:opacity-80 flex items-center gap-1.5"
              style={{ backgroundColor: pc, color: 'white' }}
            >
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-3 gap-2">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + roomUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-3 px-2 border-2 border-black dark:border-white font-bold text-xs text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-[2px_2px_0_rgba(0,0,0,1)]"
            >
              <Phone size={18} className="text-green-500" />
              WhatsApp
            </a>

            {/* Discord (copy) */}
            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-1.5 py-3 px-2 border-2 border-black dark:border-white font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-[2px_2px_0_rgba(0,0,0,1)]"
            >
              <MessageCircle size={18} className="text-indigo-400" />
              Discord
            </button>

            {/* Native share / open */}
            {typeof window !== 'undefined' && 'share' in navigator ? (
              <button
                onClick={shareNative}
                className="flex flex-col items-center gap-1.5 py-3 px-2 border-2 border-black dark:border-white font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-[2px_2px_0_rgba(0,0,0,1)]"
              >
                <Share2 size={18} style={{ color: pc }} />
                Share
              </button>
            ) : (
              <a
                href={roomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 px-2 border-2 border-black dark:border-white font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-[2px_2px_0_rgba(0,0,0,1)]"
              >
                <ExternalLink size={18} style={{ color: pc }} />
                Open Room
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
