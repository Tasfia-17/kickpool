/**
 * POST /api/txline/auth/jwt
 * Returns a fresh TxLINE guest JWT proxied server-side.
 */
import { NextRequest, NextResponse } from 'next/server';

const AUTH_HOSTS: Record<string, string> = {
  'mainnet-beta': 'https://txline.txodds.com',
  devnet:         'https://txline-dev.txodds.com',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { network?: string };
    const network = (body.network ?? process.env.SOLANA_NETWORK ?? 'devnet') as string;
    const host    = AUTH_HOSTS[network] ?? AUTH_HOSTS.devnet;

    const res = await fetch(`${host}/auth/guest/start`, { method: 'POST' });
    if (!res.ok) {
      return NextResponse.json({ error: `TxLINE guest/start failed: ${res.status}` }, { status: 502 });
    }
    const data = await res.json() as { token: string };
    return NextResponse.json({ jwt: data.token });
  } catch (err) {
    console.error('[/api/txline/auth/jwt]', err);
    return NextResponse.json({ error: 'Failed to get JWT' }, { status: 500 });
  }
}
