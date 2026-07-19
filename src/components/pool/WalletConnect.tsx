/**
 * KickPool — Wallet Connect Button
 *
 * Connects to Phantom wallet (or shows demo mode).
 * Stores wallet address in session/local state.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { connectPhantomWallet, disconnectPhantomWallet, isPhantomInstalled, DEMO_MODE } from '@/lib/solana';

interface WalletConnectProps {
  onConnect:    (address: string) => void;
  onDisconnect: () => void;
  address?:     string;
  className?:   string;
}

export function WalletConnect({ onConnect, onDisconnect, address, className = '' }: WalletConnectProps) {
  const [loading, setLoading] = useState(false);
  const [hasPhantom, setHasPhantom] = useState(false);

  useEffect(() => {
    setHasPhantom(isPhantomInstalled());
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      if (DEMO_MODE || !hasPhantom) {
        // Demo mode: generate a fake address
        const fake = `Demo${Math.random().toString(36).slice(2, 8).toUpperCase()}...${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        onConnect(fake);
        return;
      }
      const addr = await connectPhantomWallet();
      if (addr) onConnect(addr);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!DEMO_MODE && hasPhantom) {
      await disconnectPhantomWallet();
    }
    onDisconnect();
  };

  if (address) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs font-mono text-gray-300">
            {address.length > 16 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address}
          </span>
          {DEMO_MODE && <span className="text-[9px] text-yellow-500 font-bold">DEMO</span>}
        </div>
        <button
          onClick={handleDisconnect}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className={`flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl px-4 py-2 transition-colors ${className}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <span>👻</span>
      )}
      {DEMO_MODE
        ? 'Connect (Demo)'
        : hasPhantom
          ? 'Connect Phantom'
          : 'Install Phantom'
      }
    </button>
  );
}
