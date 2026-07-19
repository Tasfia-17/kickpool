/**
 * KickPool — Create Pool Page
 *
 * Users select a World Cup fixture, set entry fee,
 * max participants, and connect wallet to create a pool.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { WalletConnect } from '@/components/pool/WalletConnect';
import { ChevronLeft, Trophy, Users, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';

interface TxLineFixture {
  FixtureId:    number;
  Participant1: string;
  Participant2: string;
  StartTime:    number;
  Competition:  string;
}

export default function CreatePoolPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [fixtures,  setFixtures]  = useState<TxLineFixture[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [walletAddr, setWalletAddr] = useState('');

  const [form, setForm] = useState({
    fixtureId:       0,
    entryFee:        1,
    maxParticipants: 10,
  });

  useEffect(() => {
    fetch('/api/txline/fixtures')
      .then(r => r.json())
      .then((data: TxLineFixture[]) => {
        // Only show upcoming/today matches
        const now = Date.now() / 1000;
        const upcoming = (Array.isArray(data) ? data : [])
          .filter(f => f.StartTime > now - 7200) // within last 2 hours or future
          .slice(0, 20);
        setFixtures(upcoming);
        if (upcoming[0]) setForm(f => ({ ...f, fixtureId: upcoming[0].FixtureId }));
      })
      .catch(() => setError('Failed to load fixtures from TxLINE'))
      .finally(() => setLoading(false));
  }, []);

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">You need to be logged in to create a pool.</p>
          <Link href="/login" className="text-purple-400 underline">Sign in</Link>
        </div>
      </div>
    );
  }

  const selectedFixture = fixtures.find(f => f.FixtureId === form.fixtureId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddr) {
      setError('Please connect your wallet first');
      return;
    }
    if (!form.fixtureId) {
      setError('Please select a match');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/pools', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create pool');
      router.push(`/pool/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black">Create Pool</h1>
          <p className="text-gray-500 text-sm">Set up a sweepstakes for a World Cup match</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Wallet connect */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <span>👻</span> Your Wallet
          </div>
          <WalletConnect
            address={walletAddr}
            onConnect={setWalletAddr}
            onDisconnect={() => setWalletAddr('')}
          />
          <p className="text-xs text-gray-600">Required to create a pool and receive platform rake share.</p>
        </div>

        {/* Match selection */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Trophy size={14} /> Select Match
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
              <div className="w-4 h-4 border-2 border-gray-700 border-t-purple-500 rounded-full animate-spin" />
              Loading fixtures from TxLINE…
            </div>
          ) : fixtures.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming matches available.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {fixtures.map(f => {
                const isSelected = form.fixtureId === f.FixtureId;
                const dt = new Date(f.StartTime * 1000);
                return (
                  <button
                    key={f.FixtureId}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, fixtureId: f.FixtureId }))}
                    className={`flex flex-col gap-0.5 text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-950/40'
                        : 'border-gray-800 bg-gray-950/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        {f.Participant1} vs {f.Participant2}
                      </span>
                      {isSelected && <span className="text-purple-400 text-xs">✓</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={10} />
                      {dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Entry fee */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <DollarSign size={14} /> Entry Fee (USDC)
          </div>
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 5, 10].map(fee => (
              <button
                key={fee}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, entryFee: fee }))}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  form.entryFee === fee
                    ? 'border-purple-500 bg-purple-950/40 text-purple-300'
                    : 'border-gray-700 bg-gray-950 text-gray-400 hover:border-gray-500'
                }`}
              >
                {fee === 0 ? 'Free' : `$${fee}`}
              </button>
            ))}
          </div>
          {form.entryFee > 0 && (
            <p className="text-xs text-gray-600">
              Prize pool = entry fee × participants. Platform takes 10% on payout.
            </p>
          )}
        </div>

        {/* Max participants */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Users size={14} /> Max Participants: {form.maxParticipants}
          </div>
          <input
            type="range"
            min={2}
            max={50}
            value={form.maxParticipants}
            onChange={e => setForm(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>2</span><span>50</span>
          </div>
        </div>

        {/* Summary */}
        {selectedFixture && (
          <div className="rounded-2xl bg-purple-950/30 border border-purple-900/40 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Summary</p>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Match</span>
                <span className="font-semibold">{selectedFixture.Participant1} vs {selectedFixture.Participant2}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Entry fee</span>
                <span className="font-semibold">{form.entryFee === 0 ? 'Free' : `$${form.entryFee} USDC`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max prize pool</span>
                <span className="font-semibold text-yellow-400">
                  ${(form.entryFee * form.maxParticipants * 0.9).toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Settlement</span>
                <span className="font-semibold text-purple-400">On-chain via TxLINE ✓</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <motion.button
          type="submit"
          disabled={submitting || !walletAddr || !form.fixtureId}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base rounded-2xl py-4 transition-colors"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Pool…
            </span>
          ) : '🏆 Create Pool'}
        </motion.button>
      </form>
    </div>
  );
}
