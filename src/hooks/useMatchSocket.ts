/**
 * KickPool — useMatchSocket hook
 *
 * Subscribes to match Socket.io events for a given pool.
 * Exposes live score, odds, event feed, pundit commentary, and settlement state.
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LiveScore {
  score1:    number;
  score2:    number;
  statusId:  number;
  period:    string;
  action?:   string;
  ts?:       number;
  finalised: boolean;
}

export interface LiveOdds {
  homeOdds:   number | null;
  drawOdds:   number | null;
  awayOdds:   number | null;
  inRunning:  boolean;
  marketType: string;
  ts?:        number;
}

export interface MatchEvent {
  type:   string;
  score1: number;
  score2: number;
  team?:  string | null;
  ts:     number;
}

export interface PunditMessage {
  id:          string;
  text:        string;
  emoji:       string;
  intensity:   'low' | 'medium' | 'high' | 'extreme';
  aiGenerated: boolean;
  ts:          number;
}

export interface SettlementData {
  fixtureId:    number;
  score1:       number;
  score2:       number;
  merkleProof:  Record<string, unknown> | null;
  distribution: Array<{ userId: string; prizeWon: number; rank: number }>;
  ts:           number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useMatchSocket(socket: Socket | null, poolId: string | null) {
  const [liveScore,    setLiveScore]    = useState<LiveScore>({ score1: 0, score2: 0, statusId: 1, period: 'Not Started', finalised: false });
  const [liveOdds,     setLiveOdds]     = useState<LiveOdds | null>(null);
  const [matchEvents,  setMatchEvents]  = useState<MatchEvent[]>([]);
  const [punditFeed,   setPunditFeed]   = useState<PunditMessage[]>([]);
  const [settlement,   setSettlement]   = useState<SettlementData | null>(null);
  const [connected,    setConnected]    = useState(false);
  const [dataStale,    setDataStale]    = useState(false);

  const lastScoreUpdate = useRef(Date.now());
  const stalenessTimer  = useRef<NodeJS.Timeout | null>(null);

  const subscribedRef = useRef(false);

  const addPundit = useCallback((msg: Omit<PunditMessage, 'id'>) => {
    setPunditFeed(prev => [
      { ...msg, id: `${Date.now()}-${Math.random()}` },
      ...prev.slice(0, 99),          // keep max 100 messages
    ]);
  }, []);

  useEffect(() => {
    if (!socket || !poolId) return;

    // Subscribe to pool match events
    if (!subscribedRef.current) {
      socket.emit('pool:subscribe', { poolId });
      subscribedRef.current = true;
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onScoreUpdate = (data: LiveScore) => {
      setLiveScore(prev => ({ ...prev, ...data }));
      lastScoreUpdate.current = Date.now();
      setDataStale(false);
      // Reset staleness timer
      if (stalenessTimer.current) clearTimeout(stalenessTimer.current);
      stalenessTimer.current = setTimeout(() => setDataStale(true), 90_000);
    };

    const onOddsUpdate = (data: LiveOdds) => {
      setLiveOdds(data);
    };

    const onMatchEvent = (data: Omit<MatchEvent, 'ts'> & { ts?: number }) => {
      const event: MatchEvent = { ...data, ts: data.ts ?? Date.now() };
      setMatchEvents(prev => [event, ...prev.slice(0, 49)]);
    };

    const onPunditCommentary = (data: Omit<PunditMessage, 'id'>) => {
      addPundit(data);
    };

    const onFinalised = (data: SettlementData) => {
      setSettlement(data);
      setLiveScore(prev => ({ ...prev, score1: data.score1, score2: data.score2, finalised: true, period: 'Full Time' }));
    };

    socket.on('connect',           onConnect);
    socket.on('disconnect',        onDisconnect);
    socket.on('match:score_update', onScoreUpdate);
    socket.on('match:odds_update',  onOddsUpdate);
    socket.on('match:event',        onMatchEvent);
    socket.on('pundit:commentary',  onPunditCommentary);
    socket.on('match:finalised',    onFinalised);

    setConnected(socket.connected);

    return () => {
      socket.off('connect',           onConnect);
      socket.off('disconnect',        onDisconnect);
      socket.off('match:score_update', onScoreUpdate);
      socket.off('match:odds_update',  onOddsUpdate);
      socket.off('match:event',        onMatchEvent);
      socket.off('pundit:commentary',  onPunditCommentary);
      socket.off('match:finalised',    onFinalised);

      if (subscribedRef.current) {
        socket.emit('pool:unsubscribe', { poolId });
        subscribedRef.current = false;
      }
    };
  }, [socket, poolId, addPundit]);

  const requestSnapshot = useCallback(() => {
    if (socket && poolId) {
      socket.emit('pool:request_snapshot', { poolId });
    }
  }, [socket, poolId]);

  return {
    liveScore,
    liveOdds,
    matchEvents,
    punditFeed,
    settlement,
    connected,
    dataStale,
    requestSnapshot,
  };
}
