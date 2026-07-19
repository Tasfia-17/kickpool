/**
 * KickPool — Homepage
 *
 * Landing page showing:
 *   - Hero with World Cup branding
 *   - Live/upcoming pools list
 *   - Create pool CTA
 *   - How it works
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Trophy, Users, Zap, Shield, Plus, ChevronRight, Clock } from 'lucide-react';

interface PoolCard {
  id:              string;
  name:            string;
  participant1:    string;
  participant2:    string;
  startTime:       string;
  status:          string;
  entryFee:        number;
  maxParticipants: number;
  prizePool:       number;
  inviteCode:      string;
  _count:          { entries: number };
  creator:         { username: string; image: string | null };
}

function PoolCard({ pool }: { pool: PoolCard }) {
  const dt = new Date(pool.startTime);
  const isLive = pool.status === 'LIVE';
  const isFull = pool._count.entries >= pool.maxParticipants;

  return (
    <Link href={`/pool/${pool.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-600 p-4 flex flex-col gap-3 transition-colors cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm truncate">
              {pool.participant1} vs {pool.participant2}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Clock size={10} />
              {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${
            isLive ? 'bg-green-950/60 text-green-400 border border-green-800/40'
            : pool.status === 'SETTLED' ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
            : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}>
            {isLive ? '🔴 Live' : pool.status === 'SETTLED' ? 'Settled' : 'Open'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-yellow-400 font-semibold">
            <Trophy size={11} />
            ${pool.prizePool.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Users size={11} />
            {pool._count.entries}/{pool.maxParticipants}
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <span>{pool.entryFee === 0 ? 'Free' : `$${pool.entryFee} entry`}</span>
          </div>
          {isFull && <span className="text-red-400 font-semibold ml-auto">Full</span>}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600">by {pool.creator.username}</span>
          <span className="text-xs text-purple-400 flex items-center gap-0.5">
            View <ChevronRight size={12} />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

export default function KickPoolHomepage() {
  const { data: session } = useSession();
  const [pools, setPools] = useState<PoolCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pools?status=PENDING,LIVE')
      .then(r => r.json())
      .then((data: PoolCard[]) => setPools(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-black text-white text-lg">KickPool</span>
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest bg-purple-950/40 border border-purple-900/40 rounded-md px-1.5 py-0.5">Beta</span>
        </Link>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link href="/pool/create" className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                <Plus size={12} /> New Pool
              </Link>
              <Link href={`/profile/${session.user.name}`} className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-xs font-bold">
                {session.user.image
                  ? <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  : (session.user.name?.[0] ?? 'U').toUpperCase()
                }
              </Link>
            </>
          ) : (
            <Link href="/login" className="text-gray-400 hover:text-white text-sm font-semibold transition-colors">Sign in</Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-6 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-green-950/40 border border-green-800/40 rounded-full px-3 py-1 text-xs text-green-400 font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              World Cup 2026 — Live data powered by TxLINE
            </div>
            <h1 className="text-4xl font-black text-white leading-tight mb-3">
              Watch Together.<br />
              <span className="text-purple-400">Win Together.</span>
            </h1>
            <p className="text-gray-400 text-base mb-6 max-w-md mx-auto">
              Create a group sweepstakes for any World Cup match. Predict the score, watch live with friends, get paid out automatically — settled on Solana.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/pool/create">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-black px-6 py-3 rounded-2xl text-base transition-colors"
                >
                  🏆 Create a Pool
                </motion.button>
              </Link>
              <Link href="/pool/join">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-2xl text-base border border-gray-700 transition-colors"
                >
                  Join with Code
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* How it works */}
      <div className="border-b border-gray-800 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest font-semibold text-center mb-5">How it works</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '🏟️', title: 'Pick a match', desc: 'Any World Cup game from TxLINE' },
              { icon: '🔮', title: 'Predict & stake', desc: 'Score prediction + USDC entry' },
              { icon: '📡', title: 'Watch live', desc: 'Real-time scores, AI commentary' },
              { icon: '⚡', title: 'Auto-payout', desc: 'Solana settlement on final whistle' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2 bg-gray-900 rounded-2xl p-3 border border-gray-800">
                <span className="text-2xl">{step.icon}</span>
                <p className="text-xs font-bold text-white">{step.title}</p>
                <p className="text-[11px] text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div className="border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-6 flex-wrap">
          {[
            { icon: <Zap size={12} />,    label: 'Real-time via TxLINE SSE' },
            { icon: <Shield size={12} />, label: 'Merkle proof settlement' },
            { icon: <Trophy size={12} />, label: '10% platform rake only' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="text-purple-400">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Pool listings */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-white">Open Pools</h2>
          {session?.user && (
            <Link href="/pool/create" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              <Plus size={12} /> Create
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-gray-900 border border-gray-800 h-28 animate-pulse" />
            ))}
          </div>
        ) : pools.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-4">
            <span className="text-5xl">⚽</span>
            <p className="text-gray-400 font-semibold">No open pools yet</p>
            <p className="text-gray-600 text-sm">Be the first to create one for the World Cup Final!</p>
            <Link href="/pool/create">
              <button className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Create a Pool
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pools.map(pool => <PoolCard key={pool.id} pool={pool} />)}
          </div>
        )}
      </div>
    </div>
  );
}
