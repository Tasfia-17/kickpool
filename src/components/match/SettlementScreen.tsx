/**
 * KickPool — Settlement Screen Component
 *
 * Shown when match:finalised event arrives.
 * Displays final score, winner, prize distribution,
 * and the TxLINE Merkle proof for on-chain verification.
 */
'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { SettlementData } from '@/hooks/useMatchSocket';

interface PoolEntry {
  userId:       string;
  prizeWon:     number;
  rank:         number;
  user: { username: string; image: string | null };
  predictedScore1: number | null;
  predictedScore2: number | null;
  predictedWinner: string | null;
}

interface SettlementScreenProps {
  settlement:   SettlementData;
  entries:      PoolEntry[];
  participant1: string;
  participant2: string;
  currentUserId?: string;
}

export function SettlementScreen({
  settlement,
  entries,
  participant1,
  participant2,
  currentUserId,
}: SettlementScreenProps) {
  const [showProof, setShowProof] = useState(false);

  const myEntry    = entries.find(e => e.userId === currentUserId);
  const myDist     = settlement.distribution.find(d => d.userId === currentUserId);
  const sortedDist = [...settlement.distribution].sort((a, b) => a.rank - b.rank);

  const winner =
    settlement.score1 > settlement.score2 ? participant1
    : settlement.score2 > settlement.score1 ? participant2
    : 'Draw';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: 'spring' }}
      className="rounded-2xl overflow-hidden bg-gradient-to-b from-purple-950 via-gray-950 to-gray-950 border border-purple-800/40 shadow-2xl"
    >
      {/* Header */}
      <div className="text-center px-6 pt-6 pb-4 border-b border-purple-900/40">
        <div className="text-4xl mb-2">🏆</div>
        <h2 className="text-xl font-black text-white">Final Result</h2>
        <div className="text-4xl font-black text-white mt-2 tabular-nums">
          {settlement.score1} – {settlement.score2}
        </div>
        <div className="text-sm text-gray-400 mt-1">{participant1} vs {participant2}</div>
        {winner !== 'Draw' && (
          <div className="text-purple-300 text-sm font-semibold mt-1">{winner} wins!</div>
        )}
        {winner === 'Draw' && (
          <div className="text-gray-300 text-sm font-semibold mt-1">It's a Draw!</div>
        )}
      </div>

      {/* My result banner */}
      {myDist && (
        <div className={`px-6 py-3 text-center ${myDist.prizeWon > 0 ? 'bg-green-950/40' : 'bg-gray-900/40'}`}>
          {myDist.prizeWon > 0 ? (
            <div>
              <div className="text-green-400 font-black text-2xl">🎉 You won ${myDist.prizeWon.toFixed(2)} USDC!</div>
              <div className="text-gray-400 text-xs mt-0.5">Rank #{myDist.rank} · Payout pending on Solana</div>
            </div>
          ) : (
            <div>
              <div className="text-gray-400 font-semibold">Better luck next time</div>
              {myEntry && (
                <div className="text-gray-600 text-xs mt-0.5">
                  Your prediction: {myEntry.predictedScore1}–{myEntry.predictedScore2}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="px-4 py-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-semibold">Pool Results</h3>
        <div className="flex flex-col gap-1.5">
          {sortedDist.map((dist, idx) => {
            const entry = entries.find(e => e.userId === dist.userId);
            const isMe  = dist.userId === currentUserId;
            return (
              <div
                key={dist.userId}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                  isMe ? 'bg-purple-950/50 border border-purple-800/40' : 'bg-gray-900/40'
                }`}
              >
                <span className="text-sm font-bold text-gray-500 w-5 text-center">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${dist.rank}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-200 truncate">
                    {entry?.user.username ?? 'Unknown'}
                    {isMe && <span className="text-purple-400 text-xs ml-1">(you)</span>}
                  </div>
                  {entry && (
                    <div className="text-xs text-gray-600">
                      Predicted: {entry.predictedScore1 ?? '?'}–{entry.predictedScore2 ?? '?'}
                    </div>
                  )}
                </div>
                <div className={`text-sm font-bold tabular-nums ${dist.prizeWon > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                  {dist.prizeWon > 0 ? `+$${dist.prizeWon.toFixed(2)}` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Merkle Proof section */}
      <div className="border-t border-gray-800 px-4 py-3">
        <button
          onClick={() => setShowProof(p => !p)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
        >
          <span className="text-blue-400">🔐</span>
          <span>Provably fair — verified on Solana via TxLINE Merkle proof</span>
          <span className="ml-auto">{showProof ? '▲' : '▼'}</span>
        </button>

        {showProof && settlement.merkleProof && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-2 overflow-hidden"
          >
            <pre className="text-[9px] text-gray-600 bg-gray-950 rounded-lg p-3 overflow-x-auto max-h-48 leading-relaxed">
              {JSON.stringify(settlement.merkleProof as object, null, 2)}
            </pre>
            <p className="text-[10px] text-gray-700 mt-1">
              This cryptographic proof anchors the final score to a Solana Merkle root.
              No admin can alter the result.
            </p>
          </motion.div>
        )}
        {showProof && !settlement.merkleProof && (
          <p className="text-[10px] text-gray-600 mt-1">
            Proof unavailable (demo mode or proof fetch failed).
          </p>
        )}
      </div>
    </motion.div>
  );
}
