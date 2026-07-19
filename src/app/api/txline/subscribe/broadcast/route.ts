/**
 * POST /api/txline/subscribe/broadcast
 * Broadcasts a client-signed Solana transaction and waits for confirmation.
 *
 * Body:  { signedTransactionBase64: string, network?: string }
 * Returns: { txSig: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';

const RPC: Record<string, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet:         'https://api.devnet.solana.com',
};

export async function POST(req: NextRequest) {
  try {
    const { signedTransactionBase64, network = 'devnet' } = await req.json() as {
      signedTransactionBase64: string;
      network?: string;
    };

    if (!signedTransactionBase64) {
      return NextResponse.json({ error: 'signedTransactionBase64 required' }, { status: 400 });
    }

    const rpcUrl     = RPC[network] ?? RPC.devnet;
    const connection = new Connection(rpcUrl, 'confirmed');

    const txBytes = Uint8Array.from(atob(signedTransactionBase64), c => c.charCodeAt(0));
    const tx      = Transaction.from(txBytes);

    const txSig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight:       false,
      preflightCommitment: 'confirmed',
    });

    await connection.confirmTransaction(txSig, 'confirmed');
    console.log(`[TxLINE subscribe/broadcast] Confirmed on ${network}: ${txSig}`);

    return NextResponse.json({ txSig });
  } catch (err) {
    console.error('[/api/txline/subscribe/broadcast]', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to broadcast transaction' },
      { status: 500 }
    );
  }
}
