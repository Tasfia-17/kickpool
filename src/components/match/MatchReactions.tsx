/**
 * KickPool — Match Goal Reactions (floating emojis)
 *
 * Reused from CinePurr's VideoReactions — adapted for match events.
 * Shows floating emojis on goals, cards, and other notable events.
 */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Socket } from 'socket.io-client';
import type { MatchEvent } from '@/hooks/useMatchSocket';

const EVENT_REACTIONS: Record<string, string[]> = {
  goal:              ['⚽', '🎉', '🔥', '😱', '🙌'],
  own_goal:          ['😱', '💀', '🤦', '😬'],
  yellow_card:       ['🟨', '😬', '👀'],
  red_card:          ['🟥', '😱', '💀', '👋'],
  var_review:        ['🖥️', '🤔', '⏳'],
  var_overturned:    ['😮', '🔄', '❗'],
  penalty_awarded:   ['⚡', '😤', '🫣'],
  penalty_scored:    ['✅', '🎯', '🔥'],
  penalty_missed:    ['❌', '😮‍💨', '🤯'],
  kick_off:          ['🏟️', '⚽', '🔥'],
  half_time:         ['☕', '📊', '🧤'],
  full_time:         ['🏆', '🎉', '🥳', '😭'],
  match_finalised:   ['🏆', '🎊', '🥇'],
  default:           ['👀', '😯'],
};

const MANUAL_REACTIONS = ['⚽', '❤️', '😂', '😮', '🔥', '👏', '🤔', '😭'];

interface FloatingEmoji {
  id:      string;
  emoji:   string;
  x:       number;
  startY:  number;
}

interface MatchReactionsProps {
  socket:      Socket | null;
  poolId:      string;
  matchEvents: MatchEvent[];
  className?:  string;
}

export function MatchReactions({ socket, poolId, matchEvents, className = '' }: MatchReactionsProps) {
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const cooldown = useRef(false);
  const processedEvents = useRef(new Set<string>());

  const spawnEmoji = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x  = Math.random() * 80 + 10;
    setFloaters(prev => [...prev, { id, emoji, x, startY: 85 }]);
    setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== id)), 2200);
  }, []);

  // Spawn emojis for match events
  useEffect(() => {
    for (const event of matchEvents) {
      const key = `${event.type}-${event.ts}`;
      if (processedEvents.current.has(key)) continue;
      processedEvents.current.add(key);

      const emojis = EVENT_REACTIONS[event.type] ?? EVENT_REACTIONS.default;
      const count  = ['goal', 'full_time', 'match_finalised'].includes(event.type) ? 5 : 2;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          spawnEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
        }, i * 150);
      }
    }
  }, [matchEvents, spawnEmoji]);

  // Listen for reactions from other pool members
  useEffect(() => {
    if (!socket) return;
    const handler = ({ emoji }: { emoji: string }) => spawnEmoji(emoji);
    socket.on('pool:reaction', handler);
    return () => { socket.off('pool:reaction', handler); };
  }, [socket, spawnEmoji]);

  const sendReaction = useCallback((emoji: string) => {
    if (cooldown.current) return;
    cooldown.current = true;
    setTimeout(() => { cooldown.current = false; }, 800);

    spawnEmoji(emoji);
    socket?.emit('pool:reaction', { poolId, emoji });
    setShowPicker(false);
  }, [socket, poolId, spawnEmoji]);

  return (
    <div className={`relative ${className}`} style={{ pointerEvents: 'none' }}>
      {/* Floating emojis */}
      <AnimatePresence>
        {floaters.map(f => (
          <motion.span
            key={f.id}
            initial={{ x: `${f.x}%`, y: `${f.startY}%`, opacity: 1, scale: 1 }}
            animate={{ y: '-20%', opacity: 0, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.0, ease: 'easeOut' }}
            style={{ position: 'absolute', fontSize: '1.75rem', pointerEvents: 'none', userSelect: 'none' }}
          >
            {f.emoji}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Reaction picker button */}
      <div style={{ pointerEvents: 'auto' }} className="absolute bottom-3 right-3">
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-10 right-0 flex gap-1 bg-gray-900 border border-gray-700 rounded-xl p-2 shadow-xl"
            >
              {MANUAL_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-gray-800"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setShowPicker(p => !p)}
          className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg hover:bg-gray-700 transition-colors shadow-lg"
        >
          {showPicker ? '✕' : '😊'}
        </button>
      </div>
    </div>
  );
}
