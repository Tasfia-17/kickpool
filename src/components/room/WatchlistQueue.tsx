'use client';

import React, { useState } from 'react';
import {
  ListVideo, ChevronUp, Trash2, Play, Plus, Link,
  ArrowUp, User, X
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { QueueItem } from '@/types';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface WatchlistQueueProps {
  roomId: string;
  socket: Socket | null;
  queue: QueueItem[];
  isHost: boolean;
  username: string;
}

export const WatchlistQueue: React.FC<WatchlistQueueProps> = ({
  roomId,
  socket,
  queue,
  isHost,
  username,
}) => {
  const { isDarkMode } = usePokemonTheme();
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const handleVote = (queueItemId: string) => {
    socket?.emit('room:queue_vote', { roomId, queueItemId });
  };

  const handleRemove = (queueItemId: string) => {
    socket?.emit('room:queue_remove', { roomId, queueItemId });
  };

  const handlePlayNext = (queueItemId: string) => {
    socket?.emit('room:queue_play_next', { roomId, queueItemId });
  };

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;

    // Extract title from URL or use generic
    let title = 'Untitled Video';
    let provider = 'youtube';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      provider = 'youtube';
      title = 'YouTube Video';
    } else if (url.includes('vimeo.com')) {
      provider = 'vimeo';
      title = 'Vimeo Video';
    } else {
      provider = 'mp4';
      title = url.split('/').pop()?.split('?')[0] || 'Video';
    }

    socket?.emit('room:queue_add', {
      roomId,
      video: { url, title, provider },
    });

    setUrlInput('');
    setShowAddUrl(false);
  };

  const hasVoted = (item: QueueItem) => item.voters.includes(username);

  return (
    <div
      className="pixel-box flex flex-col transition-colors overflow-hidden"
      style={{
        backgroundColor: isDarkMode ? 'black' : '#fff0f5',
        maxHeight: collapsed ? '40px' : '280px',
      }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-2 py-1.5 border-b-2 cursor-pointer select-none shrink-0 ${
          isDarkMode ? 'border-white' : 'border-black'
        }`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3
          className={`font-bold flex items-center gap-1.5 text-xs sm:text-sm ${
            isDarkMode ? 'text-white' : 'text-black'
          }`}
        >
          <ListVideo size={14} className="sm:w-4 sm:h-4 text-pink-500" />
          Queue
          {queue.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-pink-500 text-white font-bold rounded-sm">
              {queue.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddUrl(!showAddUrl);
            }}
            className={`p-1 rounded transition-colors ${
              isDarkMode
                ? 'hover:bg-white/10 text-gray-400 hover:text-pink-400'
                : 'hover:bg-pink-100 text-gray-500 hover:text-pink-500'
            }`}
            title="Add URL to queue"
          >
            <Plus size={14} />
          </button>
          <ChevronUp
            size={14}
            className={`transition-transform ${collapsed ? 'rotate-180' : ''} ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          />
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Add URL Input */}
          {showAddUrl && (
            <div className={`p-2 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Link size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                    placeholder="Paste YouTube URL..."
                    className={`w-full pl-7 pr-2 py-1.5 text-xs border-2 font-mono ${
                      isDarkMode
                        ? 'bg-gray-900 border-white/20 text-white placeholder-gray-500'
                        : 'bg-white border-black placeholder-gray-400 text-black'
                    }`}
                  />
                </div>
                <button
                  onClick={handleAddUrl}
                  disabled={!urlInput.trim()}
                  className="px-2 py-1 bg-pink-500 text-white text-xs font-bold disabled:opacity-40 hover:bg-pink-600 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddUrl(false); setUrlInput(''); }}
                  className={`p-1 ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Queue Items */}
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-pink-500/30">
            {queue.length === 0 ? (
              <div className={`text-center py-6 px-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                <ListVideo size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-mono">Queue is empty</p>
                <p className="text-[10px] mt-1 opacity-70">
                  Search a video and click &quot;+ Queue&quot; to add
                </p>
              </div>
            ) : (
              queue.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 px-2 py-1.5 border-b transition-colors group ${
                    isDarkMode
                      ? 'border-white/5 hover:bg-white/5'
                      : 'border-gray-100 hover:bg-pink-50'
                  } ${index === 0 ? (isDarkMode ? 'bg-pink-500/10' : 'bg-pink-50') : ''}`}
                >
                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(item.id)}
                    className={`flex flex-col items-center gap-0 shrink-0 px-1 py-0.5 rounded transition-colors ${
                      hasVoted(item)
                        ? 'text-pink-500 bg-pink-500/10'
                        : isDarkMode
                          ? 'text-gray-500 hover:text-pink-400 hover:bg-white/5'
                          : 'text-gray-400 hover:text-pink-500 hover:bg-pink-50'
                    }`}
                    title={hasVoted(item) ? 'Remove vote' : 'Upvote'}
                  >
                    <ArrowUp size={12} className={hasVoted(item) ? 'fill-current' : ''} />
                    <span className="text-[10px] font-bold leading-none">{item.votes}</span>
                  </button>

                  {/* Thumbnail */}
                  {item.thumbnail ? (
                    <div className="w-10 h-7 shrink-0 bg-black rounded-sm overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className={`w-10 h-7 shrink-0 rounded-sm flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      <ListVideo size={12} className="opacity-40" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate leading-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {index === 0 && (
                        <span className="text-pink-500 mr-1">▶</span>
                      )}
                      {item.title}
                    </p>
                    <p className={`text-[10px] flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <User size={8} />
                      {item.addedBy}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isHost && (
                      <button
                        onClick={() => handlePlayNext(item.id)}
                        className="p-1 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                        title="Play now"
                      >
                        <Play size={12} />
                      </button>
                    )}
                    {(isHost || item.addedBy === username) && (
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
