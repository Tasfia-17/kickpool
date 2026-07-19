/**
 * KickPool — Pool Room Page
 *
 * The main match experience:
 *   - Live scoreboard (TxLINE SSE)
 *   - AI Pundit commentary feed
 *   - Pool leaderboard
 *   - Group chat (reused from CinePurr)
 *   - Floating match reactions
 *   - Settlement screen on match end
 */
'use client';

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useMatchSocket } from '@/hooks/useMatchSocket';
import { MatchScoreboard } from '@/components/match/MatchScoreboard';
import { AIPunditFeed } from '@/components/match/AIPunditFeed';
import { MatchReactions } from '@/components/match/MatchReactions';
import { SettlementScreen } from '@/components/match/SettlementScreen';
import { ReplayButton } from '@/components/match/ReplayButton';
import { PoolLeaderboard } from '@/components/pool/PoolLeaderboard';
import { WalletConnect } from '@/components/pool/WalletConnect';
import { motion, AnimatePresence } from 'motion/react';
import { Users, MessageCircle, BarChart2, Mic2, Share2, Copy, CheckCheck, LogOut } from 'lucide-react';
import Link from 'next/link';

const Chat = lazy(() => import('@/components/room/Chat').then(m => ({ default: m.Chat })));

// ─── Types ───────────────────────────────────────────────────────────────────

interface PoolData {
  id:              string;
  fixtureId:       number;
  name:            string;
  participant1:    string;
  participant2:    string;
  startTime:       string;
  status:          string;
  entryFee:        number;
  maxParticipants: number;
  inviteCode:      string;
  prizePool:       number;
  creatorId:       string;
  finalScore1:     number | null;
  finalScore2:     number | null;
  merkleProof:     string | null;
  entries: Array<{
    id:              string;
    userId:          string;
    walletAddress:   string;
    predictedScore1: number | null;
    predictedScore2: number | null;
    predictedWinner: string | null;
    prizeWon:        number;
    rank:            number | null;
    finalScore:      number | null;
    user:            { id: string; username: string; image: string | null };
  }>;
  commentary: Array<{
    id:         string;
    eventType:  string;
    commentary: string;
    createdAt:  string;
  }>;
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'pundit' | 'chat' | 'leaderboard';

// ─── Page component ───────────────────────────────────────────────────────────

interface PoolRoomPageProps {
  params: Promise<{ poolId: string }>;
}

export default function PoolRoomPage({ params: _params }: PoolRoomPageProps) {
  const params = React.use(_params) as { poolId: string };
  const { poolId } = params;

  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [pool,         setPool]         = useState<PoolData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState<Tab>('pundit');
  const [walletAddr,   setWalletAddr]   = useState<string>('');
  const [copied,       setCopied]       = useState(false);
  const [hasJoined,    setHasJoined]    = useState(false);

  // Fetch pool data
  useEffect(() => {
    if (!poolId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/pools/${poolId}`);
        if (!res.ok) throw new Error('Pool not found');
        const data = await res.json() as PoolData;
        setPool(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Refresh every 30s to pick up new entries
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [poolId]);

  // Socket setup — reuses CinePurr's useSocket
  // Pass a dummy roomId for presence; match events use pool:subscribe
  const socket = useSocket(`pool-presence:${poolId}`, session?.user ? {
    id:   session.user.id,
    name: session.user.name ?? 'Anonymous',
  } : undefined);

  // Subscribe to match events
  const {
    liveScore,
    liveOdds,
    matchEvents,
    punditFeed,
    settlement,
    connected,
    dataStale,
    requestSnapshot,
  } = useMatchSocket(socket, poolId);

  // Join socket room on mount
  useEffect(() => {
    if (!socket || !pool) return;
    socket.emit('pool:subscribe', { poolId });
    return () => { socket.emit('pool:unsubscribe', { poolId }); };
  }, [socket, pool, poolId]);

  // Determine if current user is in pool
  const myEntry = useMemo(() => {
    if (!pool || !session?.user?.id) return null;
    return pool.entries.find(e => e.userId === session.user.id) ?? null;
  }, [pool, session?.user?.id]);

  useEffect(() => { setHasJoined(!!myEntry); }, [myEntry]);

  // Build leaderboard entries from pool
  const leaderboardEntries = useMemo(() => {
    if (!pool) return [];
    return pool.entries.map(e => ({
      userId:          e.userId,
      username:        e.user.username,
      image:           e.user.image,
      predictedScore1: e.predictedScore1,
      predictedScore2: e.predictedScore2,
      predictedWinner: e.predictedWinner,
      finalScore:      e.finalScore,
      prizeWon:        e.prizeWon,
      rank:            e.rank ?? undefined,
    }));
  }, [pool]);

  // Settlement entries for SettlementScreen
  const settlementEntries = useMemo(() => {
    if (!pool) return [];
    return pool.entries.map(e => ({
      userId:          e.userId,
      prizeWon:        e.prizeWon,
      rank:            e.rank ?? 99,
      user:            e.user,
      predictedScore1: e.predictedScore1,
      predictedScore2: e.predictedScore2,
      predictedWinner: e.predictedWinner,
    }));
  }, [pool]);

  // Copy invite link
  const copyInvite = () => {
    if (!pool) return;
    const url = `${window.location.origin}/pool/join?invite=${pool.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading pool…</p>
      </div>
    </div>
  );

  if (error || !pool) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 mb-4">{error ?? 'Pool not found'}</p>
        <Link href="/" className="text-purple-400 underline text-sm">← Back to lobby</Link>
      </div>
    </div>
  );

  const isSettled = settlement !== null || pool.status === 'SETTLED';

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors shrink-0">
          <LogOut size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm text-white truncate">{pool.name}</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`flex items-center gap-1 ${connected ? 'text-green-500' : 'text-yellow-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              {connected ? 'Live' : 'Reconnecting'}
            </span>
            <span>·</span>
            <span>{pool.entries.length}/{pool.maxParticipants} players</span>
            <span>·</span>
            <span className="text-yellow-500 font-semibold">${pool.prizePool.toFixed(2)} pool</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!hasJoined && authStatus === 'authenticated' && (
            <Link
              href={`/pool/${poolId}/join`}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Join Pool
            </Link>
          )}
          <button
            onClick={copyInvite}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5"
          >
            {copied ? <CheckCheck size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden max-w-6xl mx-auto w-full px-0 lg:px-4 lg:py-4 lg:gap-4">

        {/* Left column: scoreboard + reactions */}
        <div className="lg:w-[420px] shrink-0 flex flex-col gap-3 p-4 lg:p-0">
          {/* Scoreboard */}
          <MatchScoreboard
            participant1={pool.participant1}
            participant2={pool.participant2}
            liveScore={liveScore}
            liveOdds={liveOdds}
            startTime={pool.startTime}
            connected={connected}
            dataStale={dataStale}
          />

          {/* Settlement overlay */}
          <AnimatePresence>
            {isSettled && settlement && (
              <SettlementScreen
                settlement={settlement}
                entries={settlementEntries}
                participant1={pool.participant1}
                participant2={pool.participant2}
                currentUserId={session?.user?.id}
              />
            )}
          </AnimatePresence>

          {/* Replay button — shown when match not live and not settled */}
          {!isSettled && pool.status !== 'LIVE' && (
            <ReplayButton
              poolId={pool.id}
              fixtureId={pool.fixtureId}
              matchLabel={`${pool.participant1} vs ${pool.participant2}`}
            />
          )}

          {/* Wallet status (desktop) */}
          {session?.user && (
            <div className="hidden lg:block">
              <WalletConnect
                address={walletAddr || myEntry?.walletAddress}
                onConnect={setWalletAddr}
                onDisconnect={() => setWalletAddr('')}
              />
            </div>
          )}
        </div>

        {/* Right column: tabs */}
        <div className="flex-1 flex flex-col min-h-0 border-t lg:border-t-0 border-gray-800 lg:border lg:border-gray-800 lg:rounded-2xl overflow-hidden bg-gray-950 lg:bg-gray-900/30">
          {/* Tab bar */}
          <div className="flex border-b border-gray-800 shrink-0">
            {([
              { id: 'pundit',      label: 'Pundit',      icon: Mic2 },
              { id: 'chat',        label: 'Group Chat',  icon: MessageCircle },
              { id: 'leaderboard', label: 'Standings',   icon: BarChart2 },
            ] as { id: Tab; label: string; icon: React.FC<{ size?: number; className?: string }> }[]).map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold flex-1 justify-center transition-colors ${
                    isActive
                      ? 'text-white border-b-2 border-purple-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden relative">
            {/* Pundit feed */}
            {activeTab === 'pundit' && (
              <div className="absolute inset-0 overflow-y-auto p-3">
                <AIPunditFeed messages={punditFeed} />
              </div>
            )}

            {/* Chat (reused CinePurr Chat component) */}
            {activeTab === 'chat' && (
              <div className="absolute inset-0">
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-gray-600 text-sm">Loading chat…</div></div>}>
                  <Chat
                    socket={socket}
                    roomId={`pool-chat:${poolId}`}
                    username={session?.user?.name ?? 'Anonymous'}
                  />
                </Suspense>
              </div>
            )}

            {/* Leaderboard */}
            {activeTab === 'leaderboard' && (
              <div className="absolute inset-0 overflow-y-auto p-3">
                <PoolLeaderboard
                  entries={leaderboardEntries}
                  currentUserId={session?.user?.id}
                  participant1={pool.participant1}
                  participant2={pool.participant2}
                  isSettled={isSettled}
                  prizePool={pool.prizePool}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating reactions overlay */}
      <MatchReactions
        socket={socket}
        poolId={poolId}
        matchEvents={matchEvents}
        className="fixed inset-0 pointer-events-none z-30"
      />
    </div>
  );
}
