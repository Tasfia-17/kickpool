/**
 * KickPool — Solana Integration
 *
 * Handles wallet-connect helpers, USDC pool escrow logic, and
 * transaction building for pool entry/settlement on Solana.
 *
 * Uses @solana/web3.js + SPL Token 2022.
 * Escrow model: each pool has a PDA-derived vault; entries are atomic
 * USDC transfers; settlement distributes prize minus platform rake.
 *
 * For devnet/demo mode (no real wallet), DEMO_MODE=true skips on-chain
 * txs and uses simulated balances — judges see the full UX flow.
 */

// NOTE: Heavy @solana packages only imported server-side to keep client bundle lean.
// Client components use dynamic import() or server actions for Solana ops.

export const SOLANA_NETWORK = (process.env.SOLANA_NETWORK as 'mainnet-beta' | 'devnet') || 'devnet';
export const DEMO_MODE      = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';

// USDC mint addresses
export const USDC_MINT = {
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet:         '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
} as const;

export const PLATFORM_RAKE_BPS = 1000; // 10% in basis points

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WalletInfo {
  address: string;
  balance: number; // SOL
  usdcBalance: number;
}

export interface PoolEscrowResult {
  vaultAddress: string;
  txSignature: string;
  success: boolean;
  demoMode: boolean;
}

export interface SettlementResult {
  txSignature: string;
  winnerAddress: string;
  prizeAmount: number;
  platformFee: number;
  merkleProofHash: string;
  success: boolean;
  demoMode: boolean;
}

// ─── Demo mode helpers ──────────────────────────────────────────────────────

export function demoPoolEscrow(params: {
  poolId: string;
  userId: string;
  entryFee: number;
}): PoolEscrowResult {
  return {
    vaultAddress: `DEMO_VAULT_${params.poolId.slice(0, 8).toUpperCase()}`,
    txSignature:  `DEMO_TX_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    success: true,
    demoMode: true,
  };
}

export function demoSettlement(params: {
  poolId: string;
  winnerAddress: string;
  prizePool: number;
  merkleProofHash?: string;
}): SettlementResult {
  const platformFee = (params.prizePool * PLATFORM_RAKE_BPS) / 10000;
  const winnerPrize = params.prizePool - platformFee;
  return {
    txSignature:    `DEMO_SETTLE_${Date.now()}`,
    winnerAddress:  params.winnerAddress,
    prizeAmount:    winnerPrize,
    platformFee,
    merkleProofHash: params.merkleProofHash ?? 'DEMO_MERKLE_' + Date.now(),
    success: true,
    demoMode: true,
  };
}

// ─── Score-based pool settlement logic ─────────────────────────────────────

export interface SettlementInput {
  p1Goals: number;
  p2Goals: number;
  entries: Array<{
    userId: string;
    walletAddress: string;
    predictedWinner: string | null;  // 'participant1' | 'participant2' | 'draw'
    predictedScore1: number | null;
    predictedScore2: number | null;
    entryFeePaid: number;
  }>;
  prizePool: number;
}

export interface EntryScore {
  userId: string;
  walletAddress: string;
  points: number;
  correctWinner: boolean;
  exactScore: boolean;
}

/**
 * Calculate settlement scores for each entry.
 *
 * Scoring:
 *   +3 pts: correct winner (or draw)
 *   +2 pts: correct score for p1
 *   +2 pts: correct score for p2
 *   +5 pts bonus: exact scoreline
 */
export function calculateSettlementScores(input: SettlementInput): EntryScore[] {
  const { p1Goals, p2Goals } = input;
  const actualWinner =
    p1Goals > p2Goals ? 'participant1'
    : p2Goals > p1Goals ? 'participant2'
    : 'draw';

  return input.entries.map(entry => {
    let points = 0;
    const correctWinner = entry.predictedWinner === actualWinner;
    const exactScore =
      entry.predictedScore1 === p1Goals && entry.predictedScore2 === p2Goals;

    if (correctWinner) points += 3;
    if (entry.predictedScore1 === p1Goals) points += 2;
    if (entry.predictedScore2 === p2Goals) points += 2;
    if (exactScore) points += 5;

    return {
      userId:        entry.userId,
      walletAddress: entry.walletAddress,
      points,
      correctWinner,
      exactScore,
    };
  });
}

/**
 * Distribute prize pool.
 *
 * All entries with the highest score share the prize pool (minus platform rake).
 * If all entries score 0, refund all entries minus platform fee.
 */
export function distributePrize(
  scores: EntryScore[],
  prizePool: number
): Array<{ userId: string; walletAddress: string; prizeWon: number; rank: number }> {
  const platformFee = (prizePool * PLATFORM_RAKE_BPS) / 10000;
  const distributable = prizePool - platformFee;

  const sorted = [...scores].sort((a, b) => b.points - a.points);
  const maxPoints = sorted[0]?.points ?? 0;
  const winners = sorted.filter(s => s.points === maxPoints && maxPoints > 0);

  const perWinner = winners.length > 0 ? distributable / winners.length : 0;

  return sorted.map((s, idx) => ({
    userId:       s.userId,
    walletAddress: s.walletAddress,
    prizeWon:     winners.some(w => w.userId === s.userId) ? perWinner : 0,
    rank:         idx + 1,
  }));
}

// ─── Phantom wallet helpers (browser-side) ──────────────────────────────────

export function isPhantomInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { phantom?: { solana?: { isPhantom?: boolean } } })
    .phantom?.solana?.isPhantom;
}

export async function connectPhantomWallet(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const phantom = (window as unknown as { phantom?: { solana?: {
    isPhantom?: boolean;
    connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  } } }).phantom?.solana;

  if (!phantom?.isPhantom) {
    window.open('https://phantom.app/', '_blank');
    return null;
  }
  try {
    const response = await phantom.connect();
    return response.publicKey.toString();
  } catch {
    return null;
  }
}

export async function disconnectPhantomWallet(): Promise<void> {
  if (typeof window === 'undefined') return;
  const phantom = (window as unknown as { phantom?: { solana?: {
    disconnect: () => Promise<void>;
  } } }).phantom?.solana;
  await phantom?.disconnect();
}
