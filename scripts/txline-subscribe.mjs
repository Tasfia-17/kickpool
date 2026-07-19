/**
 * TxLINE Server-Side Free Tier Subscribe
 *
 * Generates a fresh keypair, airdrops devnet SOL, subscribes on-chain
 * to service level 1 (free World Cup tier), and activates an API token.
 *
 * Run: node scripts/txline-subscribe.mjs
 * Outputs: TXLINE_API_TOKEN=xxx  TXLINE_KEYPAIR=xxx
 *
 * The keypair secret is stored so the token can be re-activated after expiry.
 */

import * as anchor from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Network config ──────────────────────────────────────────────────────────
// Use mainnet for free tier service level 12 (real-time World Cup data, no TxL needed)
// Use devnet for testing
const NETWORK = process.env.TXLINE_NETWORK || 'devnet';

const CONFIG = {
  'mainnet-beta': {
    rpcUrl:       'https://api.mainnet-beta.solana.com',
    apiOrigin:    'https://txline.txodds.com',
    programId:    new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA'),
    txlMint:      new PublicKey('Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL'),
    serviceLevel: 12,   // real-time free tier
    idlPath:      join(__dirname, 'idl/txoracle-mainnet.json'),
  },
  devnet: {
    rpcUrl:       'https://api.devnet.solana.com',
    apiOrigin:    'https://txline-dev.txodds.com',
    programId:    new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J'),
    txlMint:      new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG'),
    serviceLevel: 1,    // devnet free tier
    idlPath:      join(__dirname, 'idl/txoracle-devnet.json'),
  },
};

const cfg = CONFIG[NETWORK] ?? CONFIG.devnet;
console.log(`\n🌐 Network: ${NETWORK}`);
console.log(`📡 API:     ${cfg.apiOrigin}`);

// ── HTTP helper ─────────────────────────────────────────────────────────────
function httpPost(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0,300)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // ── 1. Keypair ─────────────────────────────────────────────────────────
  let keypair;
  const keypairEnv = process.env.TXLINE_SERVER_KEYPAIR;
  if (keypairEnv) {
    const secret = Uint8Array.from(JSON.parse(keypairEnv));
    keypair = Keypair.fromSecretKey(secret);
    console.log(`🔑 Using existing keypair: ${keypair.publicKey.toBase58()}`);
  } else {
    keypair = Keypair.generate();
    console.log(`🔑 Generated new keypair: ${keypair.publicKey.toBase58()}`);
    console.log(`\n💾 Save this for reuse:\nTXLINE_SERVER_KEYPAIR='${JSON.stringify(Array.from(keypair.secretKey))}'\n`);
  }

  // ── 2. Connection & airdrop (devnet only) ──────────────────────────────
  const connection = new Connection(cfg.rpcUrl, 'confirmed');

  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (NETWORK === 'devnet' && balance < 0.05 * LAMPORTS_PER_SOL) {
    console.log('💧 Requesting devnet airdrop...');
    try {
      const sig = await connection.requestAirdrop(keypair.publicKey, 0.5 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      console.log('✅ Airdrop confirmed');
    } catch (e) {
      console.error('⚠️  Airdrop failed (try again or fund manually):', e.message);
      process.exit(1);
    }
  } else if (NETWORK === 'mainnet-beta' && balance < 0.01 * LAMPORTS_PER_SOL) {
    console.error(`❌ Insufficient mainnet SOL. Fund ${keypair.publicKey.toBase58()} with at least 0.01 SOL`);
    process.exit(1);
  }

  // ── 3. Set up Anchor ───────────────────────────────────────────────────
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx) => { tx.partialSign(keypair); return tx; },
    signAllTransactions: async (txs) => { txs.forEach(tx => tx.partialSign(keypair)); return txs; },
    payer: keypair,
  };

  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const idl = JSON.parse(readFileSync(cfg.idlPath, 'utf8'));
  const program = new anchor.Program(idl, provider);

  // ── 4. Derive accounts ─────────────────────────────────────────────────
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_treasury_v2')], cfg.programId
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    cfg.txlMint, tokenTreasuryPda, true,
    TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')], cfg.programId
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    cfg.txlMint, keypair.publicKey, false,
    TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // ── 5. Subscribe on-chain ──────────────────────────────────────────────
  console.log(`\n📝 Subscribing on-chain (service level ${cfg.serviceLevel}, 4 weeks)...`);
  let txSig;
  try {
    txSig = await program.methods
      .subscribe(cfg.serviceLevel, 4)
      .accounts({
        user:                    keypair.publicKey,
        pricingMatrix:           pricingMatrixPda,
        tokenMint:               cfg.txlMint,
        userTokenAccount,
        tokenTreasuryVault,
        tokenTreasuryPda,
        tokenProgram:            TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram:  ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:           SystemProgram.programId,
      })
      .rpc();
    console.log(`✅ Subscribe tx: ${txSig}`);
  } catch (e) {
    console.error('❌ Subscribe failed:', e.message);
    process.exit(1);
  }

  // ── 6. Get guest JWT ───────────────────────────────────────────────────
  console.log('\n🎫 Getting guest JWT...');
  const authResp = await httpPost(`${cfg.apiOrigin}/auth/guest/start`, {});
  const jwt = authResp.token ?? authResp;
  console.log(`✅ JWT: ${jwt.slice(0,30)}...`);

  // ── 7. Sign activation message ─────────────────────────────────────────
  const SELECTED_LEAGUES = [];
  const messageString = `${txSig}:${SELECTED_LEAGUES.join(',')}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = nacl.sign.detached(message, keypair.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString('base64');

  // ── 8. Activate API token ──────────────────────────────────────────────
  console.log('\n🔑 Activating API token...');
  let apiToken;
  try {
    const activationResp = await httpPost(
      `${cfg.apiOrigin}/api/token/activate`,
      { txSig, walletSignature, leagues: SELECTED_LEAGUES },
      { Authorization: `Bearer ${jwt}` }
    );
    apiToken = typeof activationResp === 'string' ? activationResp.trim()
             : (activationResp.token ?? activationResp).toString().trim();
    console.log(`✅ API Token: ${apiToken.slice(0,30)}...`);
  } catch (e) {
    console.error('❌ Activation failed:', e.message);
    process.exit(1);
  }

  // ── 9. Verify token works ──────────────────────────────────────────────
  console.log('\n🧪 Testing fixtures endpoint...');
  // Note: free tier needs both headers
  const testResp = await new Promise((resolve, reject) => {
    const u = new URL(`${cfg.apiOrigin}/api/fixtures/snapshot?competitionId=15`);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'X-Api-Token': apiToken,
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw.slice(0,200) }));
    });
    req.on('error', reject);
    req.end();
  });
  console.log(`Fixtures status: ${testResp.status}`);
  if (testResp.status === 200) {
    console.log('✅ Fixtures OK!');
  } else {
    console.log('Body:', testResp.body);
  }

  // ── 10. Output env vars ────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Set these environment variables:\n');
  console.log(`TXLINE_API_TOKEN=${apiToken}`);
  console.log(`TXLINE_SERVER_KEYPAIR='${JSON.stringify(Array.from(keypair.secretKey))}'`);
  console.log(`TXLINE_BASE_URL=${cfg.apiOrigin}`);
  console.log(`SOLANA_NETWORK=${NETWORK}`);
  console.log('='.repeat(60) + '\n');

  return { apiToken, keypair, jwt };
}

main().catch(e => { console.error(e); process.exit(1); });
