'use client';
/**
 * ReplayButton — replays a finished match from TxLINE historical data.
 * Critical for demo video: lets judges see the full live match flow
 * using the World Cup Final historical events at 30x speed.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Loader } from 'lucide-react';

interface Props {
  poolId:     string;
  fixtureId:  number;
  matchLabel: string;
  className?: string;
}

const SPEEDS = [
  { label: '5×',  value: 5  },
  { label: '30×', value: 30 },
  { label: '60×', value: 60 },
];

export function ReplayButton({ poolId, fixtureId, matchLabel, className = '' }: Props) {
  const [loading,  setLoading]  = useState(false);
  const [started,  setStarted]  = useState(false);
  const [speed,    setSpeed]    = useState(30);
  const [error,    setError]    = useState<string | null>(null);

  const startReplay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/txline/replay', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ poolId, fixtureId, speedMultiplier: speed }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Replay failed');
      setStarted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (started) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`rounded-xl border border-purple-800/40 bg-purple-950/20 px-4 py-3 text-center ${className}`}>
        <p className="text-sm text-purple-300 font-semibold">🎬 Replay running at {speed}×</p>
        <p className="text-xs text-gray-500 mt-1">
          Streaming {matchLabel} historical events from TxLINE
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className={`rounded-xl border border-gray-800 bg-gray-950 p-4 ${className}`}>
      <p className="text-sm font-semibold text-white mb-1">⏪ Replay Match</p>
      <p className="text-xs text-gray-500 mb-3">
        {matchLabel} — watch full match events from TxLINE historical data
      </p>

      <div className="flex gap-2 mb-3">
        {SPEEDS.map(s => (
          <button key={s.value} onClick={() => setSpeed(s.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              speed === s.value
                ? 'border-purple-600 bg-purple-950/50 text-purple-300'
                : 'border-gray-700 bg-gray-900 text-gray-500 hover:border-gray-600'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      <button onClick={startReplay} disabled={loading}
        className="w-full py-2 rounded-xl text-sm font-bold bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors">
        {loading ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
        {loading ? 'Starting…' : 'Start Replay'}
      </button>
    </motion.div>
  );
}
