'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { History, Trash2, ExternalLink, RefreshCw, Clock, Film } from 'lucide-react';

interface HistoryEntry {
  id: string;
  roomId: string;
  videoUrl: string;
  videoTitle: string;
  watchedAt: string;
  duration: number;
}

function formatDuration(seconds: number) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getVideoThumbnail(url: string) {
  const ytMatch = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  return null;
}

export function HistoryWindow() {
  const { data: session, status } = useSession();
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchHistory();
  }, [status, fetchHistory]);

  const clearHistory = async () => {
    if (!confirm('Clear all watch history?')) return;
    setClearing(true);
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } finally {
      setClearing(false);
    }
  };

  if (status !== 'authenticated') {
    return (
      <div className="flex flex-col items-center justify-center p-10 gap-3 text-center">
        <History size={40} style={{ color: currentTheme.colors.primary }} className="opacity-60" />
        <p className={`text-sm font-bold ${isDarkMode ? 'text-white/60' : 'text-black/50'}`}>
          Sign in to see your watch history
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="w-8 h-8 border-4 border-t-pink-500 border-pink-500/20 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b-2 shrink-0"
        style={{
          borderColor: isDarkMode ? '#374151' : '#d1d5db',
          backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
        }}
      >
        <span className={`text-xs font-bold ${isDarkMode ? 'text-white/60' : 'text-black/50'}`}>
          {history.length} {history.length === 1 ? 'entry' : 'entries'}
        </span>
        <div className="flex gap-2">
          <button
            onClick={fetchHistory}
            className="p-1 rounded hover:bg-black/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} style={{ color: currentTheme.colors.primary }} />
          </button>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              disabled={clearing}
              className="p-1 rounded hover:bg-red-500/10 transition-colors"
              title="Clear history"
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 gap-3 text-center h-full">
            <Film size={44} style={{ color: currentTheme.colors.primary }} className="opacity-40" />
            <p className={`text-sm font-bold ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
              No watch history yet
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>
              Join a room and start watching to build your history
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}>
            {history.map((entry) => {
              const thumb = getVideoThumbnail(entry.videoUrl);
              const dur = formatDuration(entry.duration);
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  {/* Thumbnail */}
                  <div
                    className="w-16 h-10 shrink-0 rounded overflow-hidden border-2 flex items-center justify-center"
                    style={{
                      borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                      backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                    }}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Film size={18} style={{ color: currentTheme.colors.primary }} className="opacity-60" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {entry.videoTitle || 'Untitled Video'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] flex items-center gap-0.5 ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
                        <Clock size={10} />
                        {formatDate(entry.watchedAt)}
                      </span>
                      {dur && (
                        <span className={`text-[10px] ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>
                          · {dur}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <a
                    href={`/room/${entry.roomId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10"
                    title="Rejoin room"
                  >
                    <ExternalLink size={13} style={{ color: currentTheme.colors.primary }} />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
