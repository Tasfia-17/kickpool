/**
 * KickPool — Live Scoreboard Component
 *
 * Shows real-time score, match phase, team names, and a goal animation.
 * Driven by useMatchSocket data.
 */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { LiveScore, LiveOdds } from '@/hooks/useMatchSocket';

interface MatchScoreboardProps {
  participant1: string;
  participant2: string;
  liveScore:   LiveScore;
  liveOdds:    LiveOdds | null;
  startTime:   string;
  connected:   boolean;
  dataStale?:  boolean;
}

const PHASE_COLOR: Record<string, string> = {
  'Not Started': 'text-gray-400',
  '1st Half':    'text-green-400',
  'Half Time':   'text-yellow-400',
  '2nd Half':    'text-green-400',
  'Full Time':   'text-blue-400',
  'Final':       'text-purple-400',
  'ET 1st Half': 'text-orange-400',
  'ET 2nd Half': 'text-orange-400',
  'Pen. Shootout': 'text-red-400',
  'After Penalties': 'text-purple-400',
};

function OddsBar({ odds, label, color }: { odds: number | null; label: string; color: string }) {
  if (!odds) return null;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{odds.toFixed(2)}</span>
    </div>
  );
}

export function MatchScoreboard({
  participant1,
  participant2,
  liveScore,
  liveOdds,
  startTime,
  connected,
  dataStale = false,
}: MatchScoreboardProps) {
  const prevScore1 = useRef(liveScore.score1);
  const prevScore2 = useRef(liveScore.score2);
  const [goalFlash, setGoalFlash] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (liveScore.score1 > prevScore1.current) {
      setGoalFlash('left');
      setTimeout(() => setGoalFlash(null), 2500);
    }
    if (liveScore.score2 > prevScore2.current) {
      setGoalFlash('right');
      setTimeout(() => setGoalFlash(null), 2500);
    }
    prevScore1.current = liveScore.score1;
    prevScore2.current = liveScore.score2;
  }, [liveScore.score1, liveScore.score2]);

  const phaseColor = PHASE_COLOR[liveScore.period] ?? 'text-gray-300';
  const isLive     = ['1st Half', '2nd Half', 'ET 1st Half', 'ET 2nd Half', 'Pen. Shootout'].includes(liveScore.period);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border border-gray-800 shadow-2xl">
      {/* Goal flash overlay */}
      <AnimatePresence>
        {goalFlash && (
          <motion.div
            key="goal-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-0 pointer-events-none z-10 ${
              goalFlash === 'left'
                ? 'bg-gradient-to-r from-green-500/20 to-transparent'
                : 'bg-gradient-to-l from-green-500/20 to-transparent'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              Live
            </span>
          ) : (
            <span className={`text-xs font-medium uppercase tracking-widest ${phaseColor}`}>
              {liveScore.period}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!connected && (
            <span className="text-xs text-yellow-500 animate-pulse">Reconnecting…</span>
          )}
          {connected && dataStale && (
            <span className="text-xs text-orange-400">Data may be delayed</span>
          )}
          <span className="text-xs text-gray-600">
            {new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
          </span>
        </div>
      </div>

      {/* Score row */}
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Team 1 */}
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-gray-300 truncate">{participant1}</div>
          {goalFlash === 'left' && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-green-400 font-bold mt-0.5"
            >
              ⚽ GOAL!
            </motion.div>
          )}
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          <motion.span
            key={`s1-${liveScore.score1}`}
            initial={{ scale: 1.5, color: '#4ade80' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.4, type: 'spring' }}
            className="text-5xl font-black tabular-nums leading-none"
          >
            {liveScore.score1}
          </motion.span>
          <span className="text-2xl font-bold text-gray-600">–</span>
          <motion.span
            key={`s2-${liveScore.score2}`}
            initial={{ scale: 1.5, color: '#4ade80' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.4, type: 'spring' }}
            className="text-5xl font-black tabular-nums leading-none"
          >
            {liveScore.score2}
          </motion.span>
        </div>

        {/* Team 2 */}
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-gray-300 truncate">{participant2}</div>
          {goalFlash === 'right' && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-green-400 font-bold mt-0.5"
            >
              ⚽ GOAL!
            </motion.div>
          )}
        </div>
      </div>

      {/* Odds bar */}
      {liveOdds && (liveOdds.homeOdds || liveOdds.drawOdds || liveOdds.awayOdds) && (
        <div className="border-t border-gray-800 px-6 py-2 flex items-center justify-center gap-8">
          <OddsBar odds={liveOdds.homeOdds} label={participant1.split(' ')[0]} color="text-blue-400" />
          {liveOdds.drawOdds && (
            <OddsBar odds={liveOdds.drawOdds} label="Draw" color="text-gray-400" />
          )}
          <OddsBar odds={liveOdds.awayOdds} label={participant2.split(' ')[0]} color="text-red-400" />
          <span className="text-[9px] text-gray-700 ml-2">TxLINE StablePrice™</span>
        </div>
      )}

      {/* Settlement badge */}
      {liveScore.finalised && (
        <div className="border-t border-gray-800 px-4 py-2 bg-purple-950/40 flex items-center justify-center gap-2">
          <span className="text-purple-400 text-xs font-bold">🏆 FINAL — Settled on Solana</span>
        </div>
      )}
    </div>
  );
}
