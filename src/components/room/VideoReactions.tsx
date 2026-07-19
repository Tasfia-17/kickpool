'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';

// Available reactions with emojis
const REACTIONS = [
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😡', label: 'Angry' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'think', emoji: '🤔', label: 'Think' },
];

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
  createdAt: number;
}

interface VideoReactionsProps {
  socket: Socket | null;
  roomId: string;
  className?: string;
}

export const VideoReactions: React.FC<VideoReactionsProps> = ({ socket, roomId, className = '' }) => {
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cooldownRef = useRef<boolean>(false);

  // Listen for reactions from other users
  useEffect(() => {
    if (!socket) return;

    const handleReaction = ({ emoji, senderId: _senderId }: { emoji: string; senderId: string }) => {
      // Add floating reaction
      const id = `${Date.now()}-${Math.random()}`;
      const x = Math.random() * 80 + 10; // 10-90% from left
      const y = Math.random() * 30 + 60; // 60-90% from top (lower part of video)

      setFloatingReactions(prev => [...prev, { id, emoji, x, y, createdAt: Date.now() }]);
    };

    socket.on('reaction:new', handleReaction);

    return () => {
      socket.off('reaction:new', handleReaction);
    };
  }, [socket]);

  // Clean up old reactions
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setFloatingReactions(prev => prev.filter(r => now - r.createdAt < 3000));
    }, 500);

    return () => clearInterval(cleanup);
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    if (!socket || cooldownRef.current) return;

    // Rate limit: 1 reaction per 500ms
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 500);

    socket.emit('reaction:send', { roomId, emoji });

    // Also show locally immediately
    const id = `${Date.now()}-${Math.random()}`;
    const x = Math.random() * 80 + 10;
    const y = Math.random() * 30 + 60;
    setFloatingReactions(prev => [...prev, { id, emoji, x, y, createdAt: Date.now() }]);

    setShowPicker(false);
  }, [socket, roomId]);

  return (
    <>
      {/* Floating Reactions Container (positioned over video) */}
      <div
        ref={containerRef}
        className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      >
        <AnimatePresence>
          {floatingReactions.map(reaction => (
            <motion.div
              key={reaction.id}
              initial={{
                opacity: 1,
                scale: 0.5,
                x: `${reaction.x}%`,
                y: `${reaction.y}%`
              }}
              animate={{
                opacity: 0,
                scale: 1.5,
                y: `${reaction.y - 40}%` // Float upward
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              className="absolute text-4xl select-none"
              style={{
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))'
              }}
            >
              {reaction.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction Button & Picker */}
      <div className="relative pointer-events-auto">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20 text-white transition-all"
          title="Send Reaction"
        >
          <span className="text-xl">😊</span>
        </button>

        {/* Reaction Picker */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 bg-black/80 backdrop-blur-md rounded-xl border border-white/20 shadow-xl"
            >
              {REACTIONS.map(reaction => (
                <button
                  key={reaction.id}
                  onClick={() => sendReaction(reaction.emoji)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                  title={reaction.label}
                >
                  <span className="text-2xl">{reaction.emoji}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default VideoReactions;
