/**
 * KickPool — Join Pool via Invite Link
 * /pool/join?invite=CODE
 *
 * Resolves invite code → pool, shows pool details, lets user join.
 */
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { WalletConnect } from '@/components/pool/WalletConnect';
import { ChevronLeft, Trophy, Users, DollarSign, Shield } from 'lucide-react';
import Link from 'next/link';

interface PoolPreview {
  id:              string;
  name:            string;
  participant1:    string;
  participant2:    string;
  startTime:       string;
  entryFee:        number;
  maxParticipants: number;
  prizePool:       number;
  status:          string;
  inviteCode:      string;
  _count?:         { entries: number };
  entries?:        Array<{ user: { username: string; image: string | null } }>;
}

function JoinPageInner() {
  const searchParams   = useSearchParams();
  const inviteCode     = searchParams.get('invite') ?? '';
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [pool,       setPool]       = useState<PoolPreview | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [walletAddr, setWalletAddr] = useState('');
  const [prediction, setPrediction] = useState({
    predictedWinner: 'participant1' as 'participant1' | 'participant2' | 'draw',
    predictedScore1: 1,
    predictedScore2: 0,
  });

  useEffect(() => {
    if (!inviteCode) { setLoading(false); return; }
    fetch(`/api/pools?invite=${inviteCode}`)
      .then(r => r.json())
      .then((data: PoolPreview) => {
        if (data && data.id) setPool(data);
        else setError('Pool not found');
      })
      .catch(() => setError('Failed to load pool'))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pool) return;
    if (!walletAddr) { setError('Connect your wallet first'); return; }
    if (authStatus !== 'authenticated') { router.push('/login'); return; }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/pools/${pool.id}/entries`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ walletAddress: walletAddr, ...prediction }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to join pool');
      router.push(`/pool/${pool.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!inviteCode || error || !pool) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-center px-6">
      <span className="text-5xl">🔗</span>
      <h2 className="text-xl font-bold text-white">{error ?? 'Invalid invite link'}</h2>
      <p className="text-gray-500 text-sm">Check the link and try again, or ask the pool creator to reshare.</p>
      <Link href="/" className="text-purple-400 underline text-sm">← Back to lobby</Link>
    </div>
  );

  const startDate = new Date(pool.startTime);
  const entryCount = pool._count?.entries ?? pool.entries?.length ?? 0;
  const isFull = entryCount >= pool.maxParticipants;

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-black">Join Pool</h1>
      </div>

      {/* Pool card */}
      <div className="rounded-2xl bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 p-5 mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-black text-lg text-white">{pool.participant1} vs {pool.participant2}</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              {startDate.toLocaleDateString()} · {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
            </p>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
            pool.status === 'LIVE' ? 'bg-green-950/60 text-green-400 border border-green-800/40' :
            pool.status === 'SETTLED' ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40' :
            'bg-gray-900 text-gray-400 border border-gray-700'
          }`}>{pool.status}</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-950/60 rounded-xl p-2.5">
            <DollarSign size={14} className="text-yellow-500 mx-auto mb-1" />
            <div className="text-sm font-bold text-white">{pool.entryFee === 0 ? 'Free' : `$${pool.entryFee}`}</div>
            <div className="text-[10px] text-gray-600">Entry Fee</div>
          </div>
          <div className="bg-gray-950/60 rounded-xl p-2.5">
            <Trophy size={14} className="text-yellow-500 mx-auto mb-1" />
            <div className="text-sm font-bold text-yellow-400">${pool.prizePool.toFixed(2)}</div>
            <div className="text-[10px] text-gray-600">Prize Pool</div>
          </div>
          <div className="bg-gray-950/60 rounded-xl p-2.5">
            <Users size={14} className="text-blue-400 mx-auto mb-1" />
            <div className="text-sm font-bold text-white">{entryCount}/{pool.maxParticipants}</div>
            <div className="text-[10px] text-gray-600">Players</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
          <Shield size={10} className="text-purple-400" />
          <span>Settlement powered by TxLINE Merkle proofs on Solana — provably fair</span>
        </div>
      </div>

      {pool.status === 'SETTLED' ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-3">This pool has already been settled.</p>
          <Link href={`/pool/${pool.id}`} className="text-purple-400 underline text-sm">View results →</Link>
        </div>
      ) : isFull ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-3">This pool is full.</p>
          <Link href="/" className="text-purple-400 underline text-sm">Find another pool</Link>
        </div>
      ) : (
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          {/* Wallet */}
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-300">👻 Connect Wallet</p>
            <WalletConnect
              address={walletAddr}
              onConnect={setWalletAddr}
              onDisconnect={() => setWalletAddr('')}
            />
          </div>

          {/* Prediction */}
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-300">🔮 Your Prediction</p>

            {/* Winner pick */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500">Who wins?</p>
              <div className="grid grid-cols-3 gap-2">
                {(['participant1', 'draw', 'participant2'] as const).map(pick => {
                  const label = pick === 'participant1' ? pool.participant1
                    : pick === 'participant2' ? pool.participant2
                    : 'Draw';
                  const isSelected = prediction.predictedWinner === pick;
                  return (
                    <button
                      key={pick}
                      type="button"
                      onClick={() => setPrediction(p => ({ ...p, predictedWinner: pick }))}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-colors ${
                        isSelected
                          ? 'border-purple-500 bg-purple-950/40 text-purple-300'
                          : 'border-gray-700 bg-gray-950 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Score prediction */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500">Predict the scoreline (bonus points for exact score)</p>
              <div className="flex items-center gap-3 justify-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500 truncate max-w-[80px] text-center">{pool.participant1}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPrediction(p => ({ ...p, predictedScore1: Math.max(0, p.predictedScore1 - 1) }))}
                      className="w-7 h-7 rounded-lg bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors text-sm">−</button>
                    <span className="text-2xl font-black w-8 text-center tabular-nums">{prediction.predictedScore1}</span>
                    <button type="button" onClick={() => setPrediction(p => ({ ...p, predictedScore1: Math.min(15, p.predictedScore1 + 1) }))}
                      className="w-7 h-7 rounded-lg bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors text-sm">+</button>
                  </div>
                </div>

                <span className="text-gray-600 text-xl font-bold">–</span>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500 truncate max-w-[80px] text-center">{pool.participant2}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPrediction(p => ({ ...p, predictedScore2: Math.max(0, p.predictedScore2 - 1) }))}
                      className="w-7 h-7 rounded-lg bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors text-sm">−</button>
                    <span className="text-2xl font-black w-8 text-center tabular-nums">{prediction.predictedScore2}</span>
                    <button type="button" onClick={() => setPrediction(p => ({ ...p, predictedScore2: Math.min(15, p.predictedScore2 + 1) }))}
                      className="w-7 h-7 rounded-lg bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors text-sm">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Points guide */}
            <div className="bg-gray-950/50 rounded-xl p-3 text-xs text-gray-500 grid grid-cols-2 gap-1">
              <span>✅ Correct winner</span><span className="text-right font-semibold text-gray-400">+3 pts</span>
              <span>🔢 Correct score (each)</span><span className="text-right font-semibold text-gray-400">+2 pts</span>
              <span>🎯 Exact scoreline</span><span className="text-right font-semibold text-gray-400">+5 bonus</span>
            </div>
          </div>

          {/* Entry fee confirmation */}
          {pool.entryFee > 0 && (
            <div className="bg-yellow-950/20 border border-yellow-900/30 rounded-xl px-4 py-3 text-xs text-yellow-600">
              Joining costs <strong className="text-yellow-400">${pool.entryFee} USDC</strong>. Your wallet will be charged.
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          <motion.button
            type="submit"
            disabled={submitting || !walletAddr}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base rounded-2xl py-4 transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining…
              </span>
            ) : pool.entryFee === 0 ? '🏆 Join Pool (Free)' : `🏆 Join for $${pool.entryFee} USDC`}
          </motion.button>
        </form>
      )}
    </div>
  );
}

export default function JoinPoolPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}
