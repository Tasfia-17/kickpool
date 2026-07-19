/**
 * KickPool — Pool Leaderboard
 *
 * Live standings showing each entry's predicted score,
 * points earned so far, and prize share.
 */
'use client';

import React from 'react';
import { motion } from 'motion/react';

export interface LeaderboardEntry {
  userId:          string;
  username:        string;
  image:           string | null;
  predictedScore1: number | null;
  predictedScore2: number | null;
  predictedWinner: string | null;
  finalScore?:     number | null;
  prizeWon?:       number;
  rank?:           number;
}

interface PoolLeaderboardProps {
  entries:      LeaderboardEntry[];
  currentUserId?: string;
  participant1: string;
  participant2: string;
  isSettled?:   boolean;
  prizePool:    number;
}

export function PoolLeaderboard({
  entries,
  currentUserId,
  participant1,
  participant2,
  isSettled,
  prizePool,
}: PoolLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-10">
        <span className="text-3xl">👥</span>
        <p className="text-gray-500 text-sm mt-2">Waiting for players to join…</p>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => {
    if (isSettled) return (a.rank ?? 99) - (b.rank ?? 99);
    return 0;
  });

  const winnerLabel = (pick: string | null) => {
    if (pick === 'participant1') return participant1.split(' ').pop() ?? participant1;
    if (pick === 'participant2') return participant2.split(' ').pop() ?? participant2;
    return 'Draw';
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Prize pool header */}
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Participants</span>
        <span className="text-xs text-yellow-500 font-bold">
          💰 ${prizePool.toFixed(2)} pool
        </span>
      </div>

      {sorted.map((entry, idx) => {
        const isMe = entry.userId === currentUserId;
        return (
          <motion.div
            key={entry.userId}
            layout
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              isMe ? 'bg-purple-950/50 border border-purple-800/40' : 'bg-gray-900/40'
            }`}
          >
            {/* Rank / number */}
            <span className="text-sm font-bold text-gray-600 w-5 text-center shrink-0">
              {isSettled
                ? idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`
                : `${idx + 1}`
              }
            </span>

            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-gray-700 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-300">
              {entry.image
                ? <img src={entry.image} alt={entry.username} className="w-full h-full object-cover" />
                : entry.username[0]?.toUpperCase()
              }
            </div>

            {/* Name + prediction */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-200 truncate">
                {entry.username}
                {isMe && <span className="text-purple-400 text-xs ml-1">(you)</span>}
              </div>
              <div className="text-xs text-gray-600">
                {entry.predictedScore1 ?? '?'}–{entry.predictedScore2 ?? '?'} · {winnerLabel(entry.predictedWinner)}
              </div>
            </div>

            {/* Prize / points */}
            {isSettled && entry.prizeWon !== undefined && (
              <div className={`text-sm font-bold tabular-nums shrink-0 ${
                entry.prizeWon > 0 ? 'text-green-400' : 'text-gray-600'
              }`}>
                {entry.prizeWon > 0 ? `+$${entry.prizeWon.toFixed(2)}` : '—'}
              </div>
            )}
            {!isSettled && entry.finalScore != null && (
              <div className="text-xs text-yellow-400 font-bold shrink-0">
                {entry.finalScore} pts
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
