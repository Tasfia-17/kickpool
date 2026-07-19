/**
 * POST /api/txline/subscribe/activate
 * Calls TxLINE /api/token/activate with the signed wallet message.
 * Stores the returned API token in process.env for this server process.
 */
import { NextRequest, NextResponse } from 'next/server';

const API_ORIGINS: Record<string, string> = {
  'mainnet-beta': 'https://txline.txodds.com',
  devnet:         'https://txline-dev.txodds.com',
};

export async function POST(req: NextRequest) {
  try {
    const { txSig, walletSignature, jwt, network = 'devnet' } = await req.json() as {
      txSig: string;
      walletSignature: string;
      jwt: string;
      network?: string;
    };

    if (!txSig || !walletSignature || !jwt) {
      return NextResponse.json({ error: 'txSig, walletSignature and jwt are required' }, { status: 400 });
    }

    const apiOrigin = API_ORIGINS[network] ?? API_ORIGINS.devnet;

    const res = await fetch(`${apiOrigin}/api/token/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ txSig, walletSignature, leagues: [] }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[activate] TxLINE rejected:', res.status, body);
      return NextResponse.json({ error: `TxLINE activation failed (${res.status}): ${body}` }, { status: 502 });
    }

    const apiToken = (await res.text()).trim();
    // Store in process.env so all server-side TxLINE calls use this token immediately
    process.env.TXLINE_API_TOKEN = apiToken;

    console.log(`[TxLINE] Token activated on ${network}`);
    return NextResponse.json({ apiToken });
  } catch (err) {
    console.error('[/api/txline/subscribe/activate]', err);
    return NextResponse.json({ error: (err as Error).message || 'Activation failed' }, { status: 500 });
  }
}
