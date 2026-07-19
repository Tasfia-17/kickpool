'use client';
/**
 * TxLineSubscribe — on-chain subscribe + API token activation
 *
 * Flow:
 *  1. Connect Phantom wallet
 *  2. Build unsigned subscribe tx (server-side, free tier SL12/SL1)
 *  3. Sign with Phantom
 *  4. Broadcast tx → get txSig
 *  5. Get guest JWT from TxLINE (via our proxy)
 *  6. Sign activation message with Phantom
 *  7. Activate API token server-side
 *
 * Satisfies: "sign up through Solana" requirement
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Loader, AlertCircle, ExternalLink } from 'lucide-react';

const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet') as 'devnet' | 'mainnet-beta';
const EXPLORER_BASE = 'https://explorer.solana.com/tx/';

type Step = 'idle' | 'connecting' | 'subscribing' | 'activating' | 'done' | 'error';

interface State {
  step:          Step;
  walletAddress: string | null;
  txSig:         string | null;
  error:         string | null;
}

interface Props {
  onActivated: (apiToken: string, walletAddress: string) => void;
  className?: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function getPhantom() {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)?.phantom?.solana ?? null;
}

export function TxLineSubscribe({ onActivated, className = '' }: Props) {
  const [state, setState] = useState<State>({
    step: 'idle', walletAddress: null, txSig: null, error: null,
  });

  const patch = useCallback((p: Partial<State>) => setState(prev => ({ ...prev, ...p })), []);

  const run = useCallback(async () => {
    patch({ step: 'connecting', error: null });

    try {
      // ── 1. Connect Phantom ─────────────────────────────────────
      const phantom = getPhantom();
      if (!phantom?.isPhantom) {
        window.open('https://phantom.app/', '_blank');
        throw new Error('Phantom wallet not found. Install it, then refresh.');
      }
      const resp          = await phantom.connect() as { publicKey: { toString(): string } };
      const walletAddress = resp.publicKey.toString();
      patch({ walletAddress });

      // ── 2. Build unsigned subscribe tx ─────────────────────────
      patch({ step: 'subscribing' });
      const buildRes = await fetch('/api/txline/subscribe/build', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ walletAddress, network: NETWORK }),
      });
      if (!buildRes.ok) {
        const e = await buildRes.json() as { error?: string };
        throw new Error(e.error ?? `Build failed: ${buildRes.status}`);
      }
      const { transactionBase64 } = await buildRes.json() as { transactionBase64: string };

      // ── 3. Deserialize & sign in browser ───────────────────────
      const { Transaction } = await import('@solana/web3.js');
      const txBytes  = Uint8Array.from(atob(transactionBase64), c => c.charCodeAt(0));
      const tx       = Transaction.from(txBytes);
      const signedTx = await phantom.signTransaction(tx) as { serialize(): Uint8Array };
      const signedB64 = toBase64(signedTx.serialize());

      // ── 4. Broadcast ────────────────────────────────────────────
      const broadcastRes = await fetch('/api/txline/subscribe/broadcast', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ signedTransactionBase64: signedB64, network: NETWORK }),
      });
      if (!broadcastRes.ok) {
        const e = await broadcastRes.json() as { error?: string };
        throw new Error(e.error ?? `Broadcast failed: ${broadcastRes.status}`);
      }
      const { txSig } = await broadcastRes.json() as { txSig: string };
      patch({ txSig });

      // ── 5. Get guest JWT ────────────────────────────────────────
      patch({ step: 'activating' });
      const jwtRes = await fetch('/api/txline/auth/jwt', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ network: NETWORK }),
      });
      if (!jwtRes.ok) throw new Error('Failed to get TxLINE guest JWT');
      const { jwt } = await jwtRes.json() as { jwt: string };

      // ── 6. Sign activation message with Phantom ─────────────────
      // Exact message per TxLINE docs: `${txSig}::${jwt}` (empty leagues)
      const messageStr   = `${txSig}::${jwt}`;
      const messageBytes = new TextEncoder().encode(messageStr);
      const sigResult    = await phantom.signMessage(messageBytes, 'utf8') as { signature: Uint8Array };
      const walletSignature = toBase64(sigResult.signature);

      // ── 7. Activate server-side ─────────────────────────────────
      const activateRes = await fetch('/api/txline/subscribe/activate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ txSig, walletSignature, jwt, network: NETWORK }),
      });
      if (!activateRes.ok) {
        const e = await activateRes.json() as { error?: string };
        throw new Error(e.error ?? `Activation failed: ${activateRes.status}`);
      }
      const { apiToken } = await activateRes.json() as { apiToken: string };

      patch({ step: 'done' });
      onActivated(apiToken, walletAddress);

    } catch (err) {
      patch({ step: 'error', error: (err as Error).message });
    }
  }, [patch, onActivated]);

  const reset = () => patch({ step: 'idle', error: null, txSig: null });

  const isLoading = ['connecting', 'subscribing', 'activating'].includes(state.step);

  const stepDefs = [
    { id: 'connecting',  label: '1. Wallet'   },
    { id: 'subscribing', label: '2. On-chain' },
    { id: 'activating',  label: '3. Activate' },
  ] as const;

  const stepOrder: Step[] = ['connecting', 'subscribing', 'activating', 'done'];

  return (
    <div className={`rounded-2xl border border-gray-800 bg-gray-950 p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-950/60 flex items-center justify-center text-xl">⚡</div>
        <div>
          <p className="text-sm font-semibold text-white">Connect TxLINE Live Data</p>
          <p className="text-xs text-gray-500">{NETWORK} · World Cup real-time feed · Free</p>
        </div>
        {state.step === 'done' && (
          <span className="ml-auto text-xs text-green-400 flex items-center gap-1.5">
            <CheckCircle size={12} /> Connected
          </span>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mb-4">
        {stepDefs.map(s => {
          const cur  = stepOrder.indexOf(state.step);
          const mine = stepOrder.indexOf(s.id);
          const done   = cur > mine || state.step === 'done';
          const active = state.step === s.id;
          return (
            <div key={s.id} className={`flex-1 rounded-lg px-2 py-1.5 text-center text-[10px] font-semibold border transition-colors ${
              done   ? 'border-green-700 bg-green-950/30 text-green-400' :
              active ? 'border-purple-600 bg-purple-950/30 text-purple-300 animate-pulse' :
                       'border-gray-800 bg-gray-900 text-gray-600'
            }`}>
              {done ? '✓ ' : ''}{s.label}
            </div>
          );
        })}
      </div>

      {/* Wallet address */}
      <AnimatePresence>
        {state.walletAddress && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-3 px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-400 font-mono">
            {state.walletAddress.slice(0, 6)}…{state.walletAddress.slice(-4)}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Tx explorer link */}
      <AnimatePresence>
        {state.txSig && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3">
            <a
              href={`${EXPLORER_BASE}${state.txSig}?cluster=${NETWORK}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={10} /> View subscribe tx on Solana Explorer
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {state.error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-400">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            {state.error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {state.step === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-3 px-3 py-2 rounded-lg bg-green-950/30 border border-green-800 text-xs text-green-400">
            ✓ Subscribed on-chain. Real-time World Cup data streaming.
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      {state.step !== 'done' && (
        <button
          onClick={state.step === 'error' ? reset : run}
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading && <Loader size={14} className="animate-spin" />}
          {state.step === 'idle'        && 'Connect Phantom & Subscribe'}
          {state.step === 'connecting'  && 'Connecting wallet…'}
          {state.step === 'subscribing' && 'Subscribing on Solana…'}
          {state.step === 'activating'  && 'Activating API access…'}
          {state.step === 'error'       && 'Retry'}
        </button>
      )}

      <p className="mt-3 text-[10px] text-gray-600 text-center">
        Free · No TxL tokens needed · Only SOL for gas fees
      </p>
    </div>
  );
}
