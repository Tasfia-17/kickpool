/**
 * KickPool — AI Pundit Feed Component
 *
 * Scrolling feed of AI-generated commentary messages.
 * Styled differently by intensity level.
 */
'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PunditMessage } from '@/hooks/useMatchSocket';

interface AIPunditFeedProps {
  messages:    PunditMessage[];
  className?:  string;
}

const INTENSITY_STYLES: Record<string, string> = {
  extreme: 'border-green-500/50 bg-green-950/30 shadow-green-900/20 shadow-lg',
  high:    'border-orange-500/40 bg-orange-950/20',
  medium:  'border-blue-500/30 bg-blue-950/15',
  low:     'border-gray-700/50 bg-gray-900/30',
};

const INTENSITY_EMOJI_SIZE: Record<string, string> = {
  extreme: 'text-3xl',
  high:    'text-2xl',
  medium:  'text-xl',
  low:     'text-lg',
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function AIPunditFeed({ messages, className = '' }: AIPunditFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest (top — feed is newest-first)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
        <span className="text-4xl">🎙️</span>
        <p className="text-gray-500 text-sm">AI Pundit is warming up…</p>
        <p className="text-gray-700 text-xs">Commentary will appear here as the match unfolds</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-2 overflow-y-auto max-h-full ${className}`}
    >
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
            className={`flex gap-3 items-start rounded-xl border px-3 py-2.5 ${INTENSITY_STYLES[msg.intensity]}`}
          >
            {/* Emoji */}
            <span className={`flex-shrink-0 leading-none ${INTENSITY_EMOJI_SIZE[msg.intensity]}`}>
              {msg.emoji}
            </span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 leading-snug">{msg.text}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-600">{timeAgo(msg.ts)}</span>
                {msg.aiGenerated && (
                  <span className="text-[9px] text-purple-500 uppercase tracking-widest font-medium">AI</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
