'use client';

import React, { useState } from 'react';
import { Copy, Check, Link, Share2 } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface InviteLinkProps {
  roomId: string;
}

export const InviteLink: React.FC<InviteLinkProps> = ({ roomId }) => {
  const { currentTheme, isDarkMode } = usePokemonTheme();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const generateCode = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });
      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.inviteCode);
      }
    } catch (err) {
      console.error('Failed to generate invite code:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    const link = `${window.location.origin}/join?code=${inviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (!inviteCode) {
      await generateCode();
    }
    setShowPopup(true);
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={loading}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] sm:hover:translate-x-[-1px] sm:hover:translate-y-[-1px] sm:hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-bold text-xs sm:text-sm min-h-[36px] sm:min-h-auto"
        style={{ backgroundColor: currentTheme.colors.secondary, color: 'white' }}
        aria-label={loading ? 'Generating invite code' : 'Invite code'}
      >
        <Share2 size={14} className="sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">{loading ? 'Generating...' : 'Invite code'}</span>
      </button>

      {showPopup && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 sm:bg-transparent"
            onClick={() => setShowPopup(false)}
          />

          {/* Popup - Bottom sheet on mobile, dropdown on desktop */}
          <div
            className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-auto sm:right-0 sm:top-full sm:mt-2 p-4 border-t-4 sm:border-4 border-black sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 sm:w-72 rounded-t-2xl sm:rounded-none safe-area-bottom"
            style={{ backgroundColor: isDarkMode ? 'black' : 'white' }}
          >
            {/* Mobile drag indicator */}
            <div className="sm:hidden flex justify-center mb-3">
              <div className={`w-12 h-1.5 rounded-full ${isDarkMode ? 'bg-white/30' : 'bg-gray-300'}`} />
            </div>

            <h3
              className="font-bold text-lg mb-3 flex items-center gap-2"
              style={{ color: isDarkMode ? 'white' : 'black' }}
            >
              <Share2 size={20} /> Invite Friends
            </h3>

            <div className="space-y-3">
              {/* Invite Code */}
              <div>
                <label className="text-xs font-bold text-gray-500">INVITE CODE</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={inviteCode || ''}
                    readOnly
                    className={`flex-1 p-2.5 sm:p-2 border-2 border-black font-mono text-lg text-center tracking-widest ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}
                  />
                  <button
                    onClick={copyCode}
                    className="p-2.5 sm:p-2 border-2 border-black active:bg-gray-200 sm:hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    style={{ backgroundColor: isDarkMode ? '#333' : 'white' }}
                  >
                    {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>

              {/* Full Link */}
              <div>
                <label className="text-xs font-bold text-gray-500">SHARE LINK</label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 p-3 sm:p-2 border-2 border-black font-bold flex items-center justify-center gap-2 active:translate-x-[1px] active:translate-y-[1px] sm:hover:translate-x-[-1px] sm:hover:translate-y-[-1px] sm:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all min-h-[48px]"
                    style={{ backgroundColor: currentTheme.colors.primary, color: 'white' }}
                  >
                    {copied ? <Check size={18} /> : <Link size={18} />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={async () => {
                        try {
                          await navigator.share({
                            title: 'Join my CinePurr room!',
                            text: `Join me on CinePurr! Use code: ${inviteCode}`,
                            url: `${window.location.origin}/join?code=${inviteCode}`,
                          });
                        } catch (err) {
                          // User cancelled or share failed
                        }
                      }}
                      className="p-3 sm:p-2 border-2 border-black font-bold flex items-center justify-center active:translate-x-[1px] active:translate-y-[1px] transition-all min-w-[48px] min-h-[48px]"
                      style={{ backgroundColor: isDarkMode ? '#333' : 'white' }}
                      aria-label="Share via system share"
                    >
                      <Share2 size={18} className={isDarkMode ? 'text-white' : 'text-black'} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Share this code or link with friends to let them join your room!
            </p>
          </div>
        </>
      )}
    </div>
  );
};
